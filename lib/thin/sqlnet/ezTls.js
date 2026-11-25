// Copyright (c) 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const net = require('net');
const { Duplex } = require('stream');
const tls = require('tls');
const { BaseBuffer } = require('../../impl/datahandlers/buffer.js');

const VERIFIER_HEADER = 0x5AA5;
const VERIFIER_FOOTER = 0xA55A;
const HMAC_SHA512 = 0x0002;
const SHA256_RSA = 0x0021;
const SHA512_RSA = 0x0022;
const SHA256_ECDSA = 0x0023;
const SHA512_ECDSA = 0x0024;
const SIGNATURE_ALGORITHMS = new Map([
  [SHA256_RSA, 'RSA-SHA256'],
  [SHA512_RSA, 'RSA-SHA512'],
  [SHA256_ECDSA, 'sha256'],
  [SHA512_ECDSA, 'sha512']
]);
const AES256_GCM = 0x0041;
const AES256_CBC = 0x0042;
const MIN_PBKDF2_ITERATIONS = 128;
const KEY_VERIFY_PBKDF2_ITERATIONS = 256;
const TLS_RECORD_HEADER_SIZE = 5;
const TLS_HANDSHAKE_HEADER_SIZE = 4;
const TLS_CLIENT_HELLO = 1;
const TLS_MAX_PLAINTEXT = 16384;
// TLS 1.2 permits up to 2048 bytes of ciphertext expansion (RFC 5246, 6.2.3).
// This also accommodates TLS 1.3 records; the initial ClientHello is plaintext.
const TLS_MAX_CIPHERTEXT = TLS_MAX_PLAINTEXT + 2048;
const ANO_MAX_LENGTH = 0xffff;

function normalizeSessionKey(sessionKey) {
  if (!Buffer.isBuffer(sessionKey))
    throw new Error('EZTLS authentication session key is unavailable');
  const key = Buffer.from(sessionKey);
  if (key.length >= 32)
    return key;
  const padded = Buffer.alloc(32);
  key.copy(padded);
  return padded;
}

/* AES requires a key and IV to encrypt the first TTC payload and decrypt the
 * server's encrypted verifier response. EZTLS derives that AES material from
 * the OAUTH/O5Logon authentication session key:
 *
 *   PBKDF2-HMAC-SHA512(base64(session key), zero-filled 32-byte salt,
 *                      iterations, 64 bytes)
 *     -> first 32 bytes: AES-256 key
 *     -> next 16 bytes: IV
 */
function deriveKeyAndIV(sessionKey, iterations) {
  assert(Number.isInteger(iterations) &&
    iterations >= MIN_PBKDF2_ITERATIONS && iterations <= 0xffff,
  'Invalid EZTLS PBKDF2 iteration count');
  const password = Buffer.from(sessionKey).toString('base64');
  const passwordBytes = Buffer.from(password, 'ascii');
  let derived;
  try {
    derived = crypto.pbkdf2Sync(
      passwordBytes,
      Buffer.alloc(32),
      iterations,
      64,
      'sha512'
    );
  } finally {
    passwordBytes.fill(0);
  }
  return {
    derived,
    key: derived.subarray(0, 32),
    iv: derived.subarray(32, 48)
  };
}

/**
 * EZTLS first-packet verifier and payload protector.
 *
 * The certificate is deliberately used only after the TLS handshake. TLS
 * trust is permissive for EZTLS, while this class authenticates the peer
 * certificate with the Oracle authentication session key.
 */
class EZTLSKeyVerifier {

  constructor(sessionKey, certificate) {
    this.sessionKey = normalizeSessionKey(sessionKey);
    if (!Buffer.isBuffer(certificate?.raw) || !certificate.publicKey)
      throw new Error('EZTLS peer certificate is unavailable');
    this.certificateDer = certificate.raw;
    this.publicKey = certificate.publicKey;
    this.hmacData = null;
    this.serverVerified = false;
  }
  /* Build the verifier request sent with the first protected TTC payload.
   * It binds the current authentication session to the certificate presented
   * by the server, allowing the server to recompute and validate the HMAC
   * before it returns its signed verifier response:
   *
   *   0x5AA5 | HMAC-SHA512 type | HMAC length |
   *   HMAC-SHA512(session key, server certificate DER) | 0xA55A
   */
  createVerifyPacket() {
    this.hmacData = crypto.createHmac('sha512', this.sessionKey)
      .update(this.certificateDer)
      .digest();
    const packet = Buffer.alloc(8 + this.hmacData.length);
    packet.writeUInt16BE(VERIFIER_HEADER, 0);
    packet.writeUInt16BE(HMAC_SHA512, 2);
    packet.writeUInt16BE(this.hmacData.length, 4);
    this.hmacData.copy(packet, 6);
    packet.writeUInt16BE(VERIFIER_FOOTER, packet.length - 2);
    return packet;
  }

  clear() {
    if (this.sessionKey)
      this.sessionKey.fill(0);
    if (this.hmacData)
      this.hmacData.fill(0);
    this.sessionKey = null;
    this.hmacData = null;
    this.certificateDer = null;
    this.publicKey = null;
  }

  /* The plaintext passed to the TLS engine has this layout:
   *
   *   verifier packet = 0x5AA5 | HMAC-SHA512 type | HMAC length |
   *                     HMAC(session key, server certificate) | 0xA55A
   *   encrypted payload = AES-256-GCM type | PBKDF2 iterations | tag length |
   *                       GCM tag | ciphertext length | ciphertext(TTC payload)
   *   TLS plaintext = verifier packet | encrypted payload
   */
  encryptAndAddVerifyPacket(payload) {
    const verifyPacket = this.createVerifyPacket();
    const { derived, key, iv } = deriveKeyAndIV(
      this.sessionKey, KEY_VERIFY_PBKDF2_ITERATIONS);
    let encrypted, tag;
    try {
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
      tag = cipher.getAuthTag();
    } finally {
      derived.fill(0);
    }

    // The protocol transmits the GCM tag before the ciphertext. The payload
    // contains 2 bytes each for the algorithm, PBKDF2 iterations, GCM tag
    // length, and ciphertext length, followed by the GCM tag and ciphertext.
    const encryptedPayload = Buffer.alloc(2 + 2 + 2 + tag.length + 2 + encrypted.length);
    let pos = 0;
    encryptedPayload.writeUInt16BE(AES256_GCM, pos); pos += 2;
    encryptedPayload.writeUInt16BE(KEY_VERIFY_PBKDF2_ITERATIONS, pos); pos += 2;
    encryptedPayload.writeUInt16BE(tag.length, pos); pos += 2;
    tag.copy(encryptedPayload, pos); pos += tag.length;
    encryptedPayload.writeUInt16BE(encrypted.length, pos); pos += 2;
    encrypted.copy(encryptedPayload, pos);

    return Buffer.concat([verifyPacket, encryptedPayload]);
  }

  /**
   * Verifies the server signature and decrypts a parsed EZTLS response.
   * Direct callers can also supply one complete response Buffer.
   */
  decryptServerResponse(response) {
    try {
      let parsedResponse = response;
      // Only direct callers pass raw bytes. TCP/TCPS passes a parsed response,
      // so this branch is skipped and the verifier envelope is not parsed again.
      if (Buffer.isBuffer(response)) {
        parsedResponse = EZTLSKeyVerifier.parseResponse(response, false);
        assert(parsedResponse.length === response.length,
          'Unexpected data after EZTLS verifier response');
      }
      return this._decryptServerResponse(parsedResponse);
    } finally {
      this.clear();
    }
  }

  _decryptServerResponse(response) {
    const { signatureType, signature, encryptionType, iterations, tag,
      encrypted } = response;

    if (!this.serverVerified) {
      const algorithm = SIGNATURE_ALGORITHMS.get(signatureType);
      assert(algorithm !== undefined, 'Invalid EZTLS verifier signature type');
      assert(this.hmacData !== null, 'EZTLS verifier request is missing');
      assert(crypto.verify(algorithm, this.hmacData,
        this.publicKey, signature),
      'Invalid EZTLS verifier signature');
      this.serverVerified = true;
    }

    const { derived, key, iv } = deriveKeyAndIV(this.sessionKey, iterations);
    try {
      const decipher = crypto.createDecipheriv(
        encryptionType === AES256_GCM ? 'aes-256-gcm' : 'aes-256-cbc',
        key, iv
      );
      if (tag)
        decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } finally {
      derived.fill(0);
    }
  }

  /**
   * Parse the first complete server response, or return null when more data is
   * needed. The remainder contains subsequent NS data from the same TLS event.
   * 0               2               4               6
  +---------------+---------------+---------------+------------------+
  | 0x5AA5        | signatureType | signatureLen  | signature bytes  |
  +---------------+---------------+---------------+------------------+
                                    ... signatureLen bytes ...
  +---------------+---------------+---------------+------------------+
  | 0xA55A        | encryptionType| PBKDF2 rounds | [GCM tag length] |
  +---------------+---------------+---------------+------------------+
  | [GCM tag]                     | encryptedLen  | encrypted bytes  |
  +-------------------------------+---------------+------------------+
   */
  static parseResponse(buffer, allowIncomplete = true) {
    const response = new BaseBuffer(buffer);
    try {
      assert(response.readUInt16BE() === VERIFIER_HEADER,
        'Invalid EZTLS verifier header');
      const signatureType = response.readUInt16BE();
      const signature = response.readBytes(response.readUInt16BE());
      assert(response.readUInt16BE() === VERIFIER_FOOTER,
        'Invalid EZTLS verifier footer');

      const encryptionType = response.readUInt16BE();
      const iterations = response.readUInt16BE();
      let tag;
      if (encryptionType === AES256_GCM) {
        tag = response.readBytes(response.readUInt16BE());
      } else {
        assert(encryptionType === AES256_CBC,
          'Invalid EZTLS encrypted payload type');
      }
      const encrypted = response.readBytes(response.readUInt16BE());

      return {
        length: response.pos,
        remainder: buffer.subarray(response.pos),
        signatureType,
        signature,
        encryptionType,
        iterations,
        tag,
        encrypted
      };
    } catch (err) {
      if (allowIncomplete && err.code === 'NJS-102')
        return null;
      throw err;
    }
  }
}

/*
 * Connects Node's TLSSocket to the ANO transport without using a network
 * socket. Incoming TLS records are pushed into this stream from ANO, while
 * _write() captures TLS records generated by Node for ANO to send in RAW
 * subpackets.
 */
class MemoryDuplex extends Duplex {
  constructor(owner) {
    super();
    this.owner = owner;
  }

  _read() {}

  _write(chunk, encoding, callback) {
    try {
      this.owner._queueOutbound(chunk);
    } catch (err) {
      callback(err);
      return;
    }
    callback();
  }
}

/**
 * A TLS socket backed by an in-memory duplex stream. It gives ANO EZTLS the
 * TLS engine used by ANO: TLS records are exchanged as ANO
 * raw subpackets, while application data is wrapped and unwrapped after ANO
 * negotiation completes.
 */
class EZTLSEngine {

  // Create a TLS client whose encrypted records are carried by ANO through
  // the in-memory carrier instead of a separate network socket.
  constructor(servername) {
    this.outbound = [];
    this._pendingRecord = Buffer.alloc(0);
    this.plaintext = [];
    this.plaintextHandler = null;
    this.outboundHandler = null;
    this._writePending = false;
    this._writeReject = null;
    this._outputReady = null;
    this.handshakeComplete = false;
    this.handshakeHandler = null;
    this.error = null;
    this.carrier = new MemoryDuplex(this);
    this.carrier.on('error', err => {
      this.error = err;
      this._notifyHandshake();
    });
    const tlsOptions = {
      socket: this.carrier,
      rejectUnauthorized: false
    };
    if (servername && net.isIP(servername) === 0)
      tlsOptions.servername = servername;
    this.socket = tls.connect(tlsOptions);
    this.socket.once('secureConnect', () => this._completeHandshake());
    this.socket.on('data', chunk => {
      this.plaintext.push(Buffer.from(chunk));
      if (this.plaintextHandler) {
        this.plaintextHandler();
      }
    });
    this.socket.on('error', err => {
      this.error = err;
      this._notifyHandshake();
      if (this.plaintextHandler) {
        this.plaintextHandler();
      }
    });
    this.socket.on('end', () => {
      // Control-only close_notify can end TLS without emitting application
      // data. Wake the NS reader so it does not wait for another wire packet.
      this.inputEnded = true;
      if (this.plaintextHandler) {
        this.plaintextHandler();
      }
    });
    this.socket.on('close', () => {
      this._notifyHandshake();
      if (this.plaintextHandler) {
        this.plaintextHandler();
      }
    });
  }

  // TLS events are asynchronous, so rethrow any error at the next API call.
  checkError() {
    if (this.error)
      throw this.error;
  }

  /* secureConnect can precede delivery of the final client handshake flight
   * to the in-memory carrier. An empty write waits for preceding TLS writes
   * without generating application data, so ANO can collect that flight. */
  _completeHandshake() {
    const written = err => {
      // A timeout or disconnect can retire the engine before this callback.
      if (this.socket.destroyed || this.carrier.destroyed) {
        return;
      }
      try {
        if (err)
          throw err;
        this.checkError();
        assert(this._pendingRecord.length === 0,
          'EZTLS handshake completed with incomplete TLS output');
        this.handshakeComplete = true;
      } catch (err) {
        this.error = err;
        this.destroy();
      }
      // Completion can generate no incoming packet, so wake ANO explicitly.
      this._notifyHandshake();
    };
    try {
      this.socket.write(Buffer.alloc(0), written);
    } catch (err) {
      written(err);
    }
  }

  // Consume complete records only. A prefix length is used for ClientHello so
  // subsequent records remain queued even when they arrived in the same write.
  takeOutbound(length) {
    this.checkError();
    if (this.outbound.length === 0)
      return Buffer.alloc(0);
    if (length === undefined) {
      const result = Buffer.concat(this.outbound);
      this.outbound = [];
      return result;
    }
    let size = 0;
    let count = 0;
    while (size < length && count < this.outbound.length) {
      size += this.outbound[count++].length;
    }
    assert(size === length, 'Invalid EZTLS record boundary');
    return Buffer.concat(this.outbound.splice(0, count), size);
  }

  /* ClientHello can span stream writes and TLS records. Read record framing
   * and the handshake's uint24 length before allowing ANO to send it. Return
   * complete TLS-record bytes only, leaving later coalesced TLS output queued
   * for the ANO exchange. No server input is required for this first flight. */
  _getClientHelloLength() {
    let consumed = 0;
    let handshake = Buffer.alloc(0);
    for (const record of this.outbound) {
      consumed += record.length;
      handshake = Buffer.concat([
        handshake, record.subarray(TLS_RECORD_HEADER_SIZE)
      ]);
      if (handshake.length >= TLS_HANDSHAKE_HEADER_SIZE) {
        assert(handshake[0] === TLS_CLIENT_HELLO,
          'Expected EZTLS ClientHello handshake message');
        const messageLength = TLS_HANDSHAKE_HEADER_SIZE +
          handshake.readUIntBE(1, 3);
        assert(messageLength <= ANO_MAX_LENGTH,
          'EZTLS ClientHello exceeds ANO framing capacity');
        if (handshake.length >= messageLength) {
          return consumed;
        }
      }
    }
    return null;
  }

  // Subscribe before checking buffered output so synchronous and delayed
  // ClientHello generation use the same path. ANO owns the connection timeout.
  waitForClientHello() {
    return this._waitForOutput(() => this._getClientHelloLength(),
      'EZTLS engine closed before ClientHello was available');
  }

  // The caller returns a complete-record byte count, or null to keep waiting.
  // ANO/NetworkSession serialize operations and own their timeout/cancellation.
  _waitForOutput(getLength, closeMessage, consume) {
    // Install listeners before inspecting buffered output to avoid a lost
    // readiness event. Every exit removes listeners, including cancellation.
    assert(!this._outputReady, 'Concurrent EZTLS output operations');
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this._outputReady = null;
        this.socket.removeListener('error', fail);
        this.socket.removeListener('close', closed);
        this.carrier.removeListener('error', fail);
        this.carrier.removeListener('close', closed);
      };
      const fail = err => {
        cleanup();
        reject(err);
      };
      const closed = () => fail(new Error(closeMessage));
      const ready = () => {
        try {
          this.checkError();
          if (this.socket.destroyed || this.carrier.destroyed) {
            closed();
          } else {
            const length = getLength();
            if (length !== null) {
              const output = this.takeOutbound(length);
              cleanup();
              resolve(consume ? consume(output) : output);
            }
          }
        } catch (err) {
          fail(err);
        }
      };
      this._outputReady = ready;
      this.socket.once('error', fail);
      this.socket.once('close', closed);
      this.carrier.once('error', fail);
      this.carrier.once('close', closed);
      ready();
    });
  }

  // A carrier write is a byte-stream chunk, not a TLS record. Assemble all
  // complete records and retain a bounded incomplete tail for the next write.
  _queueOutbound(chunk) {
    const data = this._pendingRecord?.length
      ? Buffer.concat([this._pendingRecord, chunk]) : chunk;
    let pos = 0;
    while (data.length - pos >= TLS_RECORD_HEADER_SIZE) {
      const length = data.readUInt16BE(pos + 3);
      assert(length <= TLS_MAX_CIPHERTEXT,
        'Invalid EZTLS outgoing TLS record length');
      const end = pos + TLS_RECORD_HEADER_SIZE + length;
      if (end > data.length) {
        break;
      }
      this.outbound.push(Buffer.from(data.subarray(pos, end)));
      pos = end;
    }
    this._pendingRecord = Buffer.from(data.subarray(pos));
    // Send independent TLS control records immediately; TTC-associated
    // output is held until the write completes to preserve NS metadata.
    if (!this._writePending && this.outboundHandler) {
      this._flushOutbound();
    }
    // During initial handshake setup, notify the ClientHello output waiter.
    if (this._outputReady) {
      this._outputReady();
    }
    // During ANO negotiation, notify the handshake loop of new TLS output.
    // The handler is cleared once negotiation finishes.
    this._notifyHandshake();
  }

  _notifyHandshake() {
    if (this.handshakeHandler) {
      this.handshakeHandler();
    }
  }

  setHandshakeHandler(handler) {
    this.handshakeHandler = handler;
  }

  _flushOutbound() {
    const outbound = this.takeOutbound();
    if (outbound.length > 0) {
      this.outboundHandler(outbound);
    }
  }

  /* After the handshake all TLS output uses this handler. A pending write
   * holds its output until completion validates it, then publishes it before
   * resolving the write Promise. Later records cannot overtake that batch. */
  setHandlers(plaintextHandler, outboundHandler) {
    this.plaintextHandler = plaintextHandler;
    this.outboundHandler = outboundHandler;
    if (outboundHandler && !this._writePending) {
      this._flushOutbound();
    }
  }

  // Supply received TLS records to Node. Receive-generated TLS control records
  // are delivered through the outbound handler after the handshake.
  feed(data) {
    this.checkError();
    this.carrier.push(data);
    this.checkError();
  }

  // Capture application output until the TLS write completes, then validate
  // framing. A completed write with missing/incomplete output is unsupported:
  // fail closed instead of waiting indefinitely for another carrier write.
  encrypt(data, context) {
    this.checkError();
    assert(this.outboundHandler, 'EZTLS output handler is unavailable');
    // Publish older control output before starting the next plaintext write.
    this._flushOutbound();
    this._writePending = true;
    return new Promise((resolve, reject) => {
      const written = err => {
        if (this._writeReject !== reject) {
          return;
        }
        this._writeReject = null;
        this._writePending = false;
        if (err) {
          reject(err);
          return;
        }
        try {
          this.checkError();
          assert(!this._pendingRecord?.length,
            'EZTLS write completed with incomplete TLS output');
          const output = this.takeOutbound();
          assert(data.length === 0 || output.length > 0,
            'EZTLS write completed with missing TLS output');
          // The handler queues generated TLS bytes with their original NS
          // header before this write resolves.
          this.outboundHandler(output, context);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      this._writeReject = reject;
      try {
        this.socket.write(data, written);
      } catch (err) {
        written(err);
      }
    }).catch(err => {
      // Do not forward a complete prefix after a framing failure. Retire the
      // engine before NS rejects this send and disconnects the transport.
      this.error = err;
      this.destroy();
      throw err;
    });
  }

  /* Decrypt received TLS records and return plaintext already emitted by Node.
   * A null result means TLSSocket has not emitted plaintext yet; the caller
   * must wait for the plaintext handler instead of treating it as an empty
  * NS data payload. Calling without data drains plaintext emitted earlier. */
  decrypt(data) {
    this.checkError();
    if (data !== undefined)
      this.feed(data);
    if (this.plaintext.length === 0) {
      assert(!this.inputEnded && !this.socket.destroyed,
        'EZTLS peer ended the TLS stream');
      return null;
    }
    const result = Buffer.concat(this.plaintext);
    this.plaintext = [];
    return result;
  }

  // Return the leaf peer certificate for EZTLS certificate-key verification.
  getPeerX509Certificate() {
    return this.socket.getPeerX509Certificate() || null;
  }

  // Close both the TLS state machine and its in-memory carrier.
  destroy() {
    const writeReject = this._writeReject;
    this._writeReject = null;
    this._writePending = false;
    this.plaintextHandler = null;
    this.outboundHandler = null;
    this.socket.destroy();
    this.carrier.destroy();
    this.outbound = [];
    this._pendingRecord = Buffer.alloc(0);
    if (writeReject) {
      writeReject(new Error('EZTLS engine closed during application output'));
    }
  }
}

module.exports = {
  AES256_GCM,
  EZTLSKeyVerifier,
  EZTLSEngine
};
