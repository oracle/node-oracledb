// Copyright (c) 2022, 2026, Oracle and/or its affiliates.

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
const zlib = require('zlib');
const Packet = require("./packet.js");
const NTTCP = require("./ntTcp.js");
const SessionAtts = require("./sessionAtts.js");
const constants = require("./constants.js");
const { createNode } = require('./connStrategy.js');
const errors = require("../../errors.js");
const { findNVPairRecurse, createNVPair, findValue } = require("./nvStrToNvPair.js");
const { Buffer } = require('buffer');
const downHostInstance = require("./connStrategy.js").SOLE_INST_DHCACHE;
const {ANO} = require("./ANO.js");
const { resolveConnectStr } = require('../../impl/parserHelpers.js');

const MAX_REDIRECTS = 2;
const EZTLS_NOT_ACTIVATED = 'EZTLS was requested but was not activated by the server';

const REDIRECT_SECURITY_KEYS = new Set([
  'sslServerDNMatch',
  'sslAllowWeakDNMatch',
  'sslServerCertDN',
  'walletLocation',
  'walletPassword',
  'walletContent',
  'useEzTLS'
]);

function getRedirectParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !REDIRECT_SECURITY_KEYS.has(key))
  );
}

/**
 *
 * @param {string} userConfig
 * @returns serverinfo
 */

async function getConnectionInfo(userConfig) {
  const connStr = await resolveConnectStr(userConfig.connectString, userConfig.configDir);
  const addressNode = await createNode(connStr, userConfig);
  let nvpair;
  if (typeof connStr === 'string')
    nvpair = createNVPair(connStr);
  else
    nvpair = connStr;//Already a NVPair

  const serverVal = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SERVER"]);
  const connClass = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "POOL_CONNECTION_CLASS"]);
  const svcname =   findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SERVICE_NAME"]);
  const sid =   findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "SID"]);
  const poolPurity = findValue(nvpair, ["DESCRIPTION", "CONNECT_DATA", "POOL_PURITY"]);

  return [serverVal, connClass, svcname, poolPurity, sid, addressNode];
}

/**
 * Resolve the connect string to a NV format address
 * @param {String} connStr Connect string
 * @returns AddressNode
 */
async function resolveAddress(connStr, userConfig) {
  const connstr = await resolveConnectStr(connStr, userConfig.configDir);
  return createNode(connstr, userConfig);
}

/**
   * Timeout function
   * @param {Promise} asyncPromise input promise
   * @param {int} timeVal timeout value
   * @returns resolved value of input promise
   */
function timeout(asyncPromise, timeVal, oper, address, connID) {
  let timer;

  const timeoutPromise = new Promise((resolve, reject) => {
    // max possible value for 32-bit integer
    if (timeVal > 2147483647)
      timeVal = 2147483647;

    timer = setTimeout(() => reject(errors.getErr(errors.ERR_CONNECTION_TIMEDOUT, address.host, address.port, oper, timeVal / 1000, connID)), timeVal);
  });
  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timer);
    return result;
  }).catch((err) => {
    clearTimeout(timer);
    throw err;
  });
}

/**
 * Network Session. This will be used for communication with the server.
 * @param {object} userConfig Connection options
 */
class NetworkSession {

  constructor() {
    this.connected = false;
    this.isBreak = false;
    this.isReset = false;
    this.breakPosted = false;
    this.compressionEnabled = false;
    // Plaintext request/marker work and TLS records emitted asynchronously
    // during a receive must keep their own ordering lanes.
    this.pendingSend = Promise.resolve();
    this.pendingTLSOutput = Promise.resolve();
    this.closing = false;
    this.anoReceiveBuffer = null;
    this.ezTlsPendingPacket = null;
  }

  async getAddress(addressNode, userConfig) {
    /* Get the next address */
    const address = await addressNode.execute(userConfig);

    /* Prepare connection attributes */
    const uuid = this.sAtts ? this.sAtts.uuid : null;
    this.sAtts = new SessionAtts(uuid);
    this.sAtts.setFrom(userConfig);
    this.sAtts.setFrom(address.desc.params);  /* Resolve attributes from Connect String */
    await this.sAtts.prepare(address.protocol, userConfig);

    /* Insert Connection ID */
    const rootNVPair = createNVPair(address.CNdata.join(""));
    const cdataNVPair = findNVPairRecurse(rootNVPair, "CONNECT_DATA");
    const connidStr = `(CONNECTION_ID=${this.sAtts.connectionId})`;
    const childNVPair = createNVPair(connidStr);
    cdataNVPair.addListElement(childNVPair);

    this.cData = Buffer.from(rootNVPair.toString(), 'ascii');
    this.cDataNVPair = rootNVPair;
    this.sAtts.nt.cDataNVPair = rootNVPair;

    return address;
  }

  /**
   * Make the transport level connection
   */
  async transportConnect(address) {
    const protocol = address?.protocol ? address.protocol.toUpperCase() : undefined;
    const effectiveHttpsProxy = address?.httpsProxy || this.sAtts?.nt?.httpsProxy;

    // Enforce TCPS whenever an HTTPS proxy would be used (either at the address
    // level or via the session-global proxy fallback in NTTCP).
    if (protocol === 'TCP' && effectiveHttpsProxy) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
        'https proxy requires protocol as', 'tcps ');
    }

    if (protocol === 'TCP' || protocol === 'TCPS') {
      this.ntAdapter = new NTTCP(this.sAtts.nt);
      this.sAtts.nt.protocol = protocol;
    } else {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
        address.protocol + " protocol not supported");
    }

    await this.ntAdapter.connect(address);
    this.ntAdapter.startRead();
    this.sAtts.ntCha = this.ntAdapter.cha;
    this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
    this.rcvDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
  }

  validateTCPSEZTLSCapability(address) {
    if (this.sAtts.nt.protocol === "TCPS" && this.sAtts.nt.ezTls &&
        !this.sAtts.isTCPSEZTLSNegotiated) {
      this._throwEZTLSNotActivated(address);
    }
  }

  validateTCPEZTLSActivation(address) {
    if (this.sAtts.nt.protocol === "TCP" && this.sAtts.nt.useEzTLS &&
        !this.sAtts.isNNEEZTLSUsed) {
      this._throwEZTLSNotActivated(address);
    }
  }

  _throwEZTLSNotActivated(address) {
    errors.throwErr(errors.ERR_TLS_AUTH_FAILURE, address.host, address.port,
      this.sAtts.connectionId, EZTLS_NOT_ACTIVATED);
  }

  /**
   * Send the NSPTCN(connect) packet
   * @param {object} connectPkt Connect Packet
   */
  _sendConnect(connectPkt) {
    this.sendPacket(connectPkt.buf);
    if (connectPkt.overflow) {
      this._send(connectPkt.connectData, 0, connectPkt.connectDataLen);
      this.flush();
    }
  }

  /**
   * Establish network session. Make transport level connection, send
   * NSPTCN(connect packet) and read the response. @returns NetError.
   * (connection successfully established(NetError.CONNECTED)
   * or reason for failure)
   */
  async connect2(address, userConfig) {
    /* Sanitise SDU */
    if (this.sAtts.sdu) {
      if (this.sAtts.sdu > constants.NSPABSSDULN) {
        this.sAtts.sdu = constants.NSPABSSDULN;
      } else if (this.sAtts.sdu < constants.NSPMNSDULN) {
        this.sAtts.sdu = constants.NSPMNSDULN;
      }
    } else {
      this.sAtts.sdu = constants.NSPDFSDULN;
    }

    /* Transport connect */
    if (this.sAtts.transportConnectTimeout) {
      const asyncPromise = this.transportConnect(address);
      await timeout(asyncPromise, this.sAtts.transportConnectTimeout, "transportConnectTimeout", address, this.sAtts.connectionId);
    } else {
      await this.transportConnect(address);
    }

    /* Send the connect packet */
    let connectPkt = new Packet.ConnectPacket(this.cData, this.sAtts);
    this._sendConnect(connectPkt);

    let redirectCount = 0;

    /* Read the response */
      while (true) {  // eslint-disable-line
      const packet = await this._recvPacket();
      if (packet.type === constants.NSPTAC) /* ACCEPT */
        break;
      if (packet.type === constants.NSPTRF) { /* REFUSE */
        if (this.refusePkt.overflow) {
          await this._recvPacket();
          this.refusePkt.dataBuf = this.rcvDatapkt.buf.subarray(this.rcvDatapkt.offset, this.rcvDatapkt.len).toString();
        }
        const nvpair = createNVPair(this.refusePkt.dataBuf);
        this.refusePkt = null;
        const err = findValue(nvpair, ["DESCRIPTION", "ERR"]);
        if (err == "12514") {
          errors.throwErr(errors.ERR_INVALID_SERVICE_NAME, this.getOption(constants.SVCNAME), address.host, address.port, this.sAtts.connectionId);
        } else if (err == "12505") {
          errors.throwErr(errors.ERR_INVALID_SID, this.getOption(constants.SID), address.host, address.port, this.sAtts.connectionId);
        } else if (err) {
          errors.throwErr(errors.ERR_CONNECTION_REFUSED, address.host, address.port, this.sAtts.connectionId, "ORA-" + err);
        } else {
          errors.throwErr(errors.ERR_CONNECTION_REFUSED, address.host, address.port, this.sAtts.connectionId, "refused");
        }
      } else if (packet.type === constants.NSPTRS) { /* RESEND */
        if ((packet.flags & constants.NSPFSRN) == constants.NSPFSRN) {
          await this.ntAdapter.renegTLS();
          this.ntAdapter.startRead();
        }
        this._sendConnect(connectPkt);
      } else if (packet.type === constants.NSPTRD) { /* REDIRECT */
        if (redirectCount >= MAX_REDIRECTS) {
          errors.throwErr(errors.ERR_TOO_MANY_REDIRECTS, MAX_REDIRECTS);
        }
        redirectCount++;

        let adrLen, adrStr, redirConnData;

        /* Read and connect to Redirect address */
        if (this.redirectPkt.overflow) {
          await this._recvPacket();
          this.redirectPkt.dataBuf = this.rcvDatapkt.buf.subarray(this.rcvDatapkt.offset, this.rcvDatapkt.len);
        }

        if (this.redirectPkt.flags & constants.NSPFRDS) {
          adrLen = this.redirectPkt.dataBuf.indexOf('\0', 0, 'ascii');
          adrStr = this.redirectPkt.dataBuf.toString('ascii', 0, adrLen);
          redirConnData = this.redirectPkt.dataBuf.subarray(adrLen + 1, this.redirectPkt.dataLen);
        } else {
          adrStr = this.redirectPkt.dataBuf.toString('ascii');
          redirConnData = this.cData;
        }

        const redirAddressNode = await resolveAddress(adrStr, userConfig);
        const host = address.hostname;
        address = await redirAddressNode.execute();
        /* Add on attributes from redirect connect String */
        if (address.desc?.params) {
          this.sAtts.setFrom(getRedirectParams(address.desc.params));
        }
        address.originHost = host;
        this.redirectPkt = null;
        this.ntAdapter.disconnect(constants.NSFIMM);

        if (this.sAtts.transportConnectTimeout) {
          const asyncPromise = this.transportConnect(address);
          await timeout(asyncPromise, this.sAtts.transportConnectTimeout, "transportConnectTimeout", address, this.sAtts.connectionId);
        } else {
          await this.transportConnect(address);
        }

        connectPkt = new Packet.ConnectPacket(redirConnData, this.sAtts, constants.NSPFRDR);
        this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
        this._sendConnect(connectPkt);
      }
    }

    /* Accepted  */
    this.validateTCPSEZTLSCapability(address);

    this.cData = null;
    this.sndDatapkt = new Packet.DataPacket(this.sAtts.largeSDU);
    this.markerPkt = new Packet.MarkerPacket(this.sAtts.largeSDU);
    this.controlPkt = new Packet.ControlPacket();
    this.ntAdapter.largeSDU = this.sAtts.largeSDU;
    this.sAtts.clearWallet();
    this.sAtts.nt.walletPassword = null;

    if (!this.sAtts.noNA) {
      this.ano = new ANO(this.sAtts);
      this.anoReceiveBuffer = null;
      // The first locally generated TLS flight is carried by the initial ANO
      // request; later TLS flights are driven by _exchangeAnoPackets().
      await this._initializeAnoHandshake(address);
      const timeLimit = this.sAtts.connectTimeout ||
        this.sAtts.transportConnectTimeout ||
        constants.DEFAULT_TRANSPORT_CONNECT_TIMEOUT;
      try {
        if (this.ano.serviceList[1].engine) {
          await timeout(this._exchangeAnoPackets(), timeLimit, 'connectTimeout',
            address, this.sAtts.connectionId);
        } else {
          await this._exchangeAnoPackets();
        }
      } catch (err) {
        this.ano.destroy();
        throw err;
      }
      this.sAtts.isNNEEZTLSUsed = this.ano.isEZTLSActive();
      this.ntAdapter.ezTlsNetworkEncryption = this.sAtts.isNNEEZTLSUsed;
      if (this.sAtts.isNNEEZTLSUsed)
        this._setEZTLSHandlers();
    }

    this.validateTCPEZTLSActivation(address);

    this.sAtts.isTCPSEZTLSUsed = this.ntAdapter.isEZTLSUsed();

    this.sndDatapkt.createPacket(constants.NSPDADAT); //Currently only used for disconnect
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
    this.sndDatapkt.len = this.sndDatapkt.bufLen;
    this.connected = true;
    return true;
  }

  /* TLS can produce output while processing input, or later on a stream
   * callback. Wake the same receive loop for both cases; no event-loop delay
   * is used as an indication that a handshake flight has been produced. */
  async _exchangeAnoPackets() {
    const encryption = this.ano.serviceList[1];
    const engine = encryption.engine;
    const adapter = this.ntAdapter;
    if (engine) {
      engine.setHandshakeHandler(() => adapter.wakeReceive());
    }
    try {
      this.sendAnoPacket(this.ano.sendPacket(), adapter);
      encryption.takeHandshakeData();
      let received = false;
      while (true) {
        if (engine) {
          engine.checkError();
          if (engine.socket.destroyed) {
            errors.throwErr(errors.ERR_INVALID_CONNECTION);
          }
          encryption.collectHandshakeData();
          if (encryption.needsHandshakePacket()) {
            // These are ANO RAW bytes, never TTC to be encrypted again.
            this.sendAnoPacket(this.ano.sendPacket(), adapter);
          }
        }
        if (received && (!engine || encryption.complete)) {
          return;
        }
        let packet = await adapter.receive();
        if (!packet) {
          continue;
        }
        packet = this._reassembleAnoPacket(packet);
        if (!packet) {
          continue;
        }
        packet = this._processPacket(packet);
        if (packet && packet.type !== constants.NSPTCNL) {
          await this.ano.processPacket(packet.buf);
          received = true;
        }
      }
    } finally {
      if (engine) {
        engine.setHandshakeHandler(null);
      }
    }
  }

  /* Only initial ClientHello output is awaited here, not secureConnect: the
   * server cannot complete TLS until ANO has sent this first flight. ANO then
   * transports the remaining TLS handshake records in its RAW payloads. */
  async _initializeAnoHandshake(address) {
    const ano = this.ano;
    if (!ano.serviceList[1].ezTls) {
      return;
    }
    const stream = this.ntAdapter.stream;
    const closed = () => ano.destroy();
    stream.once('close', closed);
    try {
      if (stream.destroyed) {
        errors.throwErr(errors.ERR_INVALID_CONNECTION);
      }
      const timeLimit = this.sAtts.connectTimeout ||
        this.sAtts.transportConnectTimeout ||
        constants.DEFAULT_TRANSPORT_CONNECT_TIMEOUT;
      await timeout(ano.initializeHandshake(), timeLimit, 'connectTimeout',
        address, this.sAtts.connectionId);
    } catch (err) {
      ano.destroy();
      throw err;
    } finally {
      stream.removeListener('close', closed);
    }
  }

  /**
   * Try all available addresses for connection establishment
   */
  async connect1(address, addressNode, userConfig) {
    let connected, savedErr;
    do {
      try {
        if (this.sAtts.connectTimeout) {
          const asyncPromise = this.connect2(address, userConfig);
          connected = await timeout(asyncPromise, this.sAtts.connectTimeout, "connectTimeout", address, this.sAtts.connectionId);
        } else {
          connected = await this.connect2(address, userConfig);
        }
      } catch (err) {
        if (this.ano) {
          this.ano.destroy();
          this.ano = null;
        }
        if (err.message.startsWith('NJS-510') && !this.ntAdapter.connected) {
          downHostInstance.markDownHost(address.host, Date.now()); // mark the host as down
          this.ntAdapter.connected = true; // Pretend as connected
        }
        if (this.ntAdapter) {
          this.ntAdapter.disconnect(constants.NSFIMM);
          this.ntAdapter = null;
        }
        this.sAtts.clearWallet();
        connected = false;
        savedErr = err;
        try {
          address = await this.getAddress(addressNode, userConfig);
        } catch {
          break;
        }
      }
    } while (!connected);
    if (connected) {
      return;
    } else {
      throw (savedErr);
    }
  }

  _setPacketLength(buf, length = buf.length) {
    if (this.sAtts.largeSDU) {
      buf.writeUInt32BE(length, constants.NSPHDLEN);
    } else {
      buf.writeUInt16BE(length, constants.NSPHDLEN);
    }
  }

  _processEZTLSPacket(packet) {
    if (!this.ano?.isEZTLSActive()) {
      return null;
    }
    try {
      if (packet && (packet.buf.readUInt16BE(constants.NSPDAFLG) & constants.NSPDAFEOF)) {
        throw new Error('EZTLS peer closed the NS data channel');
      }
      let clearPayload;
      if (packet) {
        // Node can delay plaintext for packet A; packet B must not replace
        // A's saved header and be paired with A's later plaintext.
        if (this.ezTlsPendingPacket) {
          throw new Error(
            'EZTLS received another NS packet while decryption is pending'
          );
        }
        // TLS may emit the decrypted data later, so retain the original NS
        // header and restore it when that plaintext becomes available.
        this.ezTlsPendingPacket = {
          ...packet,
          buf: Buffer.from(packet.buf.subarray(0, constants.NSPDADAT))
        };
        clearPayload = this.ano.decryptData(packet.buf.subarray(constants.NSPDADAT));
      } else if (this.ezTlsPendingPacket) {
        clearPayload = this.ano.takeDecryptedData();
      } else {
        return null;
      }
      if (clearPayload === null) {
        return null;
      }
      packet = this.ezTlsPendingPacket;
      this.ezTlsPendingPacket = null;
      packet.buf = Buffer.concat([packet.buf, clearPayload]);
      this._setPacketLength(packet.buf);
      if (process.env.NODE_ORACLEDB_DEBUG_PACKETS) {
        this.ntAdapter.printPacket(
          `Receiving EZTLS plaintext packet ${packet.num} on stream ${this.ntAdapter.streamNum}`,
          packet.buf
        );
      }
      this.rcvDatapkt.fromPacket(packet);
      return packet;
    } catch (err) {
      this.ezTlsPendingPacket = null;
      this.disconnect(constants.NSFIMM);
      errors.throwErr(errors.ERR_INVALID_PACKET, err.message);
    }
  }

  /**
   * Process packet (Internal)
   */
  _processPacket(packet) {
    switch (packet.type) {
      case constants.NSPTDA: { /* DATA packet */
        const size = packet.buf.length;
        const dataFlags = packet.buf.readUInt16BE(constants.NSPDAFLG);
        if ((dataFlags & constants.NSPDAFCMP) != 0) { // compression enabled
          if (!this.sAtts.networkCompressionEnabled) {
            errors.throwErr(errors.ERR_INVALID_PACKET, "Compressed packet received without negotiation");
          }
          const packetHeader = packet.buf.subarray(0, constants.NSPDADAT);
          const buffertoDeCompress = packet.buf.subarray(constants.NSPDADAT, size);
          let deCompressedDataBuffer;

          const maxPayload = this.sAtts.largeSDU
            ? Math.min(this.sAtts.sdu, constants.NSPABSSDULN)
            : Math.min(this.sAtts.sdu, constants.NSPMXSDULN);

          const inflateOptions = {
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
            maxOutputLength: maxPayload
          };
          try {
            if (this.sAtts.firstRecvCompressedPacket) {
              deCompressedDataBuffer = zlib.inflateSync(buffertoDeCompress, inflateOptions);
              this.sAtts.firstRecvCompressedPacket = 0;
            } else {
              deCompressedDataBuffer = zlib.inflateRawSync(buffertoDeCompress, inflateOptions);
            }
          } catch (err) {
            if (err.code == 'ERR_BUFFER_TOO_LARGE') {
              errors.throwErr(errors.ERR_INVALID_PACKET,
                `Decompressed packet exceeds SDU ${maxPayload}`);
            }
            errors.throwErr(errors.ERR_DATA_COMPRESSION, err.message);
          }
          const resultLength = deCompressedDataBuffer.length;
          if (resultLength > maxPayload) {
            errors.throwErr(errors.ERR_INVALID_PACKET, `Decompressed size ${resultLength} exceeds SDU ${maxPayload}`);
          }
          //concatenate packet header with decompressed data
          packet.buf = Buffer.concat([packetHeader, deCompressedDataBuffer]);
          const length = resultLength + constants.NSPDADAT;
          this._setPacketLength(packet.buf, length);
        }
        if (this.ano?.isEZTLSActive()) {
          return this._processEZTLSPacket(packet);
        }
        this.rcvDatapkt.fromPacket(packet);
        break;
      }
      case constants.NSPTMK: /* MARKER packet */
        this.markerPkt.fromPacket(packet, this);
        break;
      case constants.NSPTCNL: /* CONTROL packet */
        this.controlPkt.fromPacket(packet);
        break;
      case constants.NSPTAC: /* ACCEPT */
        Packet.AcceptPacket(packet, this.sAtts);
        if (this.sAtts.version >= constants.TNS_VERSION_MIN_END_OF_RESPONSE
          && (packet.flags & constants.TNS_ACCEPT_FLAG_HAS_END_OF_REQUEST)) {
          this.endOfRequestSupport = true;
          this.pipeliningSupport = true;
        }
        if (packet.flags & constants.TNS_ACCEPT_FLAG_FAST_AUTH) {
          this.supportsFastAuth = true;
        }
        break;
      case constants.NSPTRF: /* REFUSE */
        this.refusePkt = new Packet.RefusePacket(packet);
        break;
      case constants.NSPTRS: /* RESEND */
        break;
      case constants.NSPTRD: /* REDIRECT */
        this.redirectPkt = new Packet.RedirectPacket(packet);
        break;
      default:
        errors.throwErr(errors.ERR_CONNECTION_INVALID_PACKET);
    }
    return packet;
  }

  /**
   * Receive packet (Internal)
   * Control packets are consumed internally and discarded
   */
  async _recvPacket() {
    if (this.ano?.isEZTLSActive()) {
      // Wait for this request's plaintext processing and published ciphertext;
      // control records generated during receive still use the wire queue.
      await this.pendingSend;
      await this.pendingTLSOutput;
    }
    while (true) {
      const clearPacket = this._processEZTLSPacket();
      if (clearPacket) {
        return clearPacket;
      }
      let packet = await this.ntAdapter.receive();
      if (!packet) {
        continue;
      }

      packet = this._reassembleAnoPacket(packet);
      if (!packet) {
        continue;
      }
      const processedPacket = this._processPacket(packet);
      if (processedPacket && processedPacket.type !== constants.NSPTCNL) {
        return processedPacket;
      }
    }
  }

  /**
   * Reassemble fragmented ANO data packets before ANO parses them. The MORE
   * flag belongs to the NS data packet, so ANO must see the original complete
   * negotiation buffer rather than individual NS fragments. This is only used
   * during ANO setup: TLS handshake records can exceed the negotiated SDU and
   * arrive in multiple NS data packets, while ANO parses one complete message.
   */
  _reassembleAnoPacket(packet) {
    if (!this.ano || this.connected || packet.type !== constants.NSPTDA)
      return packet;

    const flags = packet.buf.readUInt16BE(constants.NSPDAFLG);
    const hasMore = (flags & constants.NSPDAFMOR) !== 0;
    if (!this.anoReceiveBuffer && !hasMore)
      return packet;

    const payload = packet.buf.subarray(constants.NSPDADAT);
    this.anoReceiveBuffer = this.anoReceiveBuffer
      ? Buffer.concat([this.anoReceiveBuffer, payload])
      : Buffer.from(payload);

    if (hasMore)
      return null;

    const buf = Buffer.alloc(constants.NSPDADAT + this.anoReceiveBuffer.length);
    this._setPacketLength(buf);
    buf.writeUInt8(constants.NSPTDA, constants.NSPHDTYP);
    buf.writeUInt8(packet.buf[constants.NSPHDFLGS], constants.NSPHDFLGS);
    buf.writeUInt16BE(0, constants.NSPDAFLG);
    this.anoReceiveBuffer.copy(buf, constants.NSPDADAT);
    this.anoReceiveBuffer = null;
    return { ...packet, buf, flags: buf[constants.NSPHDFLGS] };
  }

  /**
   * Send data (Internal)
   * @param {Buffer} buf Buffer to send
   * @param {boolean} copyForEZTLSQueue Whether buf can be reused before an
   *   asynchronous EZTLS send processes it
   */
  sendPacket(buf, copyForEZTLSQueue = false) {
    if (!this.ano?.isEZTLSActive()) {
      this._sendPacket(buf);
      return;
    }
    // Drop late writes after EZTLS teardown; disconnect has retired the
    // TLS engine and transport, and packet writers do not await sendPacket().
    if (this.closing)
      return;
    if (!this.ntAdapter)
      errors.throwErr(errors.ERR_INVALID_CONNECTION);
    return this._queueEZTLSPacket(buf, copyForEZTLSQueue);
  }

  _queueEZTLSPacket(buf, copyForEZTLSQueue = false) {
    // TTC already owns/copies its queued buffers. SQLNET markers and other
    // reusable control buffers request a snapshot before deferred encryption.
    if (copyForEZTLSQueue) {
      buf = Buffer.from(buf);
    }
    const packetType = buf.readUInt8(constants.NSPHDTYP);
    const encryption = this.ano?.serviceList?.[1];
    const addVerifier = packetType === constants.NSPTDA &&
      encryption?.keyVerifier && !encryption.keyVerifyRequestQueued;
    if (addVerifier)
      encryption.keyVerifyRequestQueued = true;
    return this._queueEZTLSSend(() => this._sendEZTLSPacket(buf, addVerifier));
  }

  _queueEZTLSSend(send) {
    return this._queueEZTLSWork('pendingSend', send);
  }

  _setEZTLSHandlers() {
    // Decryption can make plaintext available without another NS packet, and
    // TLS control output can be generated while processing that plaintext.
    // Keep those notifications on their respective receive and wire lanes.
    this.ano.setHandlers(
      () => this.ntAdapter?.wakeReceive(),
      (buf, header) => this._queueEZTLSOutbound(buf, header)
    );
  }

  _queueEZTLSWork(queueName, send, allowClosing = false) {
    const adapter = this.ntAdapter;
    // Each queue is a promise tail: pendingSend preserves application order,
    // while pendingTLSOutput preserves the order emitted by the TLS engine.
    // They must remain independent because receive-generated control records
    // may need the wire before a later plaintext request finishes.
    this[queueName] = this[queueName].then(send);
    void this[queueName].catch(() => {
      if ((allowClosing || !this.closing) && adapter &&
          this.ntAdapter === adapter) {
        this.disconnect(constants.NSFIMM);
      }
    });
    return this[queueName];
  }

  _queueEZTLSOutbound(buf, header) {
    if (!this.ntAdapter)
      return;
    const adapter = this.ntAdapter;
    // Called in TLS generation order, for both write-associated batches and
    // independent control output. This queue never waits on pendingSend.
    return this._queueEZTLSWork('pendingTLSOutput', () => {
      if (this.ntAdapter !== adapter) {
        return;
      }
      if (!header) {
        // TLS can generate control traffic without a TTC write. It uses the
        // same ordered packetizer, with no request-boundary flags.
        header = Buffer.alloc(constants.NSPDADAT);
        header.writeUInt8(constants.NSPTDA, constants.NSPHDTYP);
      }
      // Each TTC write reserves space for TLS expansion before encryption.
      // Like python-oracledb, preserve the NS header and replace its payload
      // with the complete encrypted output; do not fragment TLS records here.
      // Independently generated control output uses a neutral DATA header.
      if (buf.length === 0) {
        return;
      }
      const packet = Buffer.concat([header, buf]);
      this._setPacketLength(packet);
      this._sendEZTLSWirePacket(packet, adapter);
    }, true);
  }

  _preparePacket(buf) {
    const packetType = buf.readUInt8(constants.NSPHDTYP);
    if (packetType == constants.NSPTDA) {
      const size = buf.length;
      let dataFlags = buf.readUInt16BE(constants.NSPDAFLG);
      if (this.sAtts.networkCompressionEnabled && size > this.sAtts.networkCompressionThreshold) {
        this.compressionEnabled = true;
        const buffertoCompress = buf.subarray(constants.NSPDADAT, size);
        const bufferHeader = buf.subarray(0, constants.NSPDADAT);
        let compressedDataBuffer;
        try {
          if (this.sAtts.firstSendCompressedPacket) {
            compressedDataBuffer = zlib.deflateSync(buffertoCompress, {finishFlush: zlib.
              constants.Z_SYNC_FLUSH});
            this.sAtts.firstSendCompressedPacket = 0;
          } else {
            compressedDataBuffer = zlib.deflateRawSync(buffertoCompress, {finishFlush: zlib.constants.Z_SYNC_FLUSH});
          }
        } catch (err) {
          errors.throwErr(errors.ERR_DATA_COMPRESSION, err.message);
        }
        const resultLength = compressedDataBuffer.length;
        if (resultLength < size - constants.NSPDADAT) {
          dataFlags |= constants.NSPDAFCMP;
          // concatenate buffer header with the compressed data
          buf = Buffer.concat([bufferHeader, compressedDataBuffer]);
          buf.writeUInt16BE(dataFlags, constants.NSPDAFLG);
          const pktOffset = resultLength + constants.NSPDADAT;
          this._setPacketLength(buf, pktOffset);
        }
      }
    }
    return buf;
  }

  _sendPacket(buf) {
    this.ntAdapter.send(this._preparePacket(buf));
  }

  async _sendEZTLSPacket(buf, addVerifier = false) {
    // Retain the transport that owned this send across asynchronous encryption.
    const adapter = this.ntAdapter;
    if (!adapter)
      return;
    const packetType = buf.readUInt8(constants.NSPHDTYP);
    // only data packets need to be compressed
    if (packetType == constants.NSPTDA) {
      // TTC reserves normal TLS room before filling its buffer. Encrypt each
      // payload once; the output handler preserves its NS packet boundary.
      // Independently generated control output uses the same ordered queue.
      /* Encrypt the TTC payload before optional network compression. The
       * receive path does the inverse: decompress first, then decrypt. */
      if (this.ano?.isEZTLSActive()) {
        try {
          if (process.env.NODE_ORACLEDB_DEBUG_PACKETS) {
            adapter.printPacket(
              `Sending EZTLS plaintext packet on stream ${adapter.streamNum}`,
              buf
            );
          }
          await this.ano.encryptData(buf.subarray(constants.NSPDADAT),
            addVerifier, Buffer.from(buf.subarray(0, constants.NSPDADAT)));
          await this.pendingTLSOutput;
          return;
        } catch (err) {
          errors.throwErr(errors.ERR_INVALID_PACKET, err.message);
        }
      }
    }
    await this._queueEZTLSWork('pendingTLSOutput', () =>
      this._sendEZTLSWirePacket(buf, adapter), true);
  }

  _sendEZTLSWirePacket(buf, adapter) {
    if (this.ntAdapter !== adapter) {
      return;
    }
    const packetType = buf.readUInt8(constants.NSPHDTYP);
    buf = this._preparePacket(buf);
    // Disconnect or redirect can replace the transport while encryption awaits.
    if (this.ntAdapter !== adapter)
      return;

    if (packetType === constants.NSPTDA && Number.isInteger(this.sAtts.sdu) &&
        buf.length > this.sAtts.sdu) {
      // The normal TLS reserve should keep each encrypted NS DATA packet
      // within the SDU. Reject unexpected expansion instead of splitting a
      // TLS record across multiple NS packets.
      errors.throwErr(errors.ERR_INVALID_PACKET,
        `Encrypted packet exceeds negotiated SDU ${this.sAtts.sdu}`);
    }
    if (this.ntAdapter === adapter)
      adapter.send(buf);
  }

  /**
   * Send an ANO negotiation packet without applying TTC/EZTLS data
   * encryption. ANO handshake bytes are carried inside an NS data packet,
   * but are not TTC application data.
   */
  sendAnoPacket(buf, adapter = this.ntAdapter, allowClosing = false) {
    if ((this.closing && !allowClosing) || !adapter)
      return;
    const maxPacketSize = this.sAtts.sdu;
    const maxPayloadSize = maxPacketSize - constants.NSPDADAT;
    if (!Number.isInteger(maxPayloadSize) || maxPayloadSize <= 0)
      errors.throwErr(errors.ERR_INVALID_PACKET, "Invalid negotiated SDU");

    for (let offset = 0; offset < buf.length; offset += maxPayloadSize) {
      const length = Math.min(maxPayloadSize, buf.length - offset);
      const packet = Buffer.alloc(constants.NSPDADAT + length);
      this._setPacketLength(packet);
      packet.writeUInt8(constants.NSPTDA, constants.NSPHDTYP);
      packet.writeUInt8(0, constants.NSPHDFLGS);
      packet.writeUInt16BE(
        offset + length < buf.length ? constants.NSPDAFMOR : 0,
        constants.NSPDAFLG
      );
      buf.copy(packet, constants.NSPDADAT, offset, offset + length);
      if ((!this.closing || allowClosing) && this.ntAdapter === adapter)
        adapter.send(packet);
    }
  }

  /**
   * Break ongoing operation
   */
  sendBreak() {
    if (this.isBreak)
      return; /* Already in a break */

    if (!this.connected) {
      this.isBreak = true; /* Not yet connected. Post the break */
      this.breakPosted = true;
      return;
    }

    this.isBreak = true;
    this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQIMARK);
    this.sendPacket(this.markerPkt.buf, true);
    if (this.pipelineEnabled) {
      this.isBreak = false;
    }
  }

  /**
   * Reset the connection
   */
  async reset() {
    /* If posted send Break */
    if (this.breakPosted) {
      this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQBMARK);
      this.sendPacket(this.markerPkt.buf, true);
      this.breakPosted = false;
    }
    if (this.pipelineEnabled) {
      this.isBreak = this.isReset = false;
      return;
    }
    /* Send Reset */
    this.markerPkt.prepare(constants.NSPMKTD1, constants.NIQRMARK);
    this.sendPacket(this.markerPkt.buf, true);

    /* Await Reset */
    while (!this.isReset) {
      await this._recvPacket();
    }

    /* reset packet buffers */
    this.sndDatapkt.dataPtr = this.sndDatapkt.dataLen = constants.NSPDADAT;
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
    this.sndDatapkt.len = this.sndDatapkt.bufLen;

    this.isBreak = this.isReset = false;
  }

  /**
  * Receive packet
  */
  async recvPacket() {
    return await this._recvPacket();
  }

  syncRecvPacket() {
    const clearPacket = this._processEZTLSPacket();
    if (clearPacket) {
      return clearPacket;
    }
    while (this.ntAdapter.packets.length > 0) {
      const packet = this.ntAdapter.syncReceive();
      if (!packet)
        break;
      const processedPacket = this._processPacket(packet);
      if (processedPacket && processedPacket.type !== constants.NSPTCNL) {
        return processedPacket;
      }
    }
  }

  isEZTLSUsed() {
    return this.sAtts.isTCPSEZTLSUsed || this.sAtts.isNNEEZTLSUsed;
  }

  isEZTLSKeyVerifyPending() {
    // TCPS and ANO own distinct verifiers. Connection setup waits for either
    // one to be consumed by the bounded KeyVerify ping response.
    return Boolean(this.ntAdapter?.isEZTLSKeyVerifyPending() ||
      this.ano?.serviceList[1].keyVerifier);
  }

  setAuthSessionKey(sessionKey) {
    if (this.ntAdapter)
      this.ntAdapter.setAuthSessionKey(sessionKey);
    if (this.ano)
      this.ano.setAuthSessionKey(sessionKey);
  }

  /**
   * Send data
   * @param {Buffer} userBuf User provided buffer
   * @param {*} offset from which to send data
   * @param {*} len number of bytes to send
   */
  _send(userBuf, offset, len) {
    if (this.isBreak) {
      return;
    }
    let bytesCopied;

    this.sndDatapkt.dataLen = this.sndDatapkt.offset;
    if (this.sndDatapkt.dataLen < this.sndDatapkt.bufLen || !this.sndDatapkt.bufLen) {
      bytesCopied = this.sndDatapkt.fillBuf(userBuf, offset, len);
      len -= bytesCopied;
      offset += bytesCopied;
      this.sndDatapkt.offset = this.sndDatapkt.dataLen;
    }

    while (len) {
      this.sendPacket(this.sndDatapkt.dataBuf, true);

      /* If break throw error now */
      if (this.isBreak) {
        return;
      }

      this.sndDatapkt.dataLen = this.sndDatapkt.dataPtr;
      this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
      bytesCopied = this.sndDatapkt.fillBuf(userBuf, offset, len);
      len -= bytesCopied;
      offset += bytesCopied;
      this.sndDatapkt.offset = this.sndDatapkt.dataLen;
    }
  }

  /**
   * Flush send buffers
   */
  flush() {
    if (this.isBreak) {
      return;
    }
    this.sndDatapkt.dataLen = this.sndDatapkt.offset;
    this.sndDatapkt.prepare2Send();
    this.sendPacket(Buffer.from(this.sndDatapkt.dataBuf));
    this.sndDatapkt.dataLen = this.sndDatapkt.dataPtr;
    this.sndDatapkt.offset = this.sndDatapkt.dataPtr;
  }

  /**
   * Establish network connection
  */
  async connect(userConfig) {
    const connStr = userConfig.connectString ? userConfig.connectString : userConfig.connectionString;
    let addressNode;
    if (userConfig._connInfo) {
      addressNode = userConfig._connInfo[5];
      addressNode.reset();
    } else {
      addressNode = await resolveAddress(connStr, userConfig);
    }
    let address;
    try {
      address = await this.getAddress(addressNode, userConfig);
    } catch (err) {
      if (err.message == "All options tried") /* Not even one valid address */
        errors.throwErr(errors.ERR_HOST_NOT_FOUND);
      else
        errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS, err.message);
    }
    await this.connect1(address, addressNode, userConfig);
  }

  /**
   * Force Disconnect the stream, primarily used
   * to disconnect dead/hung connections.
   */
  forceDisconnect(err) {
    if (!this.connected) {
      return;
    }
    this.ntAdapter.stream.destroy(err);
    this.connected = false;
  }

  /**
   * Disconnect
   * @param {int} type of disconnect
   */
  disconnect(type) {
    this.ezTlsPendingPacket = null;
    if (!this.ano?.isEZTLSActive()) {
      if (!this.connected)
        return;
      if (type != constants.NSFIMM && !this.ntAdapter.err) {
        /* Send EOF packet */
        this.sndDatapkt.dataLen = this.sndDatapkt.offset;
        this.sndDatapkt.prepare2Send(constants.NSPDAFEOF);
        this.sendPacket(this.sndDatapkt.dataBuf);
      }
      this.ntAdapter.disconnect(type);
      this.ntAdapter = null;
      this.connected = false;
      return;
    }

    if (this.closing) {
      return;
    }
    const adapter = this.ntAdapter;
    this.closing = true;
    this.connected = false;
    // Promise tails cannot be emptied. Retire their TLS engine and transport
    // so late callbacks fail or discard their captured adapter instead.
    this.ano.destroy();
    if (adapter) {
      adapter.disconnect(constants.NSFIMM);
    }
    this.ntAdapter = null;
  }

  /**
   * Get connection attributes
   * @param {int} opcode type of attribute
   * @returns attribute value
   */
  getOption(opcode) {
    switch (opcode) {

      case constants.NS_MOREDATA: /* Is there more data in read buffers */
        return (this.ntAdapter.packets.length > 0);

      case constants.SVCNAME: /* Service name */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SERVICE_NAME"]);

      case constants.SID: /* Service name */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SID"]);

      case constants.SERVERTYPE: /* Server type */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "SERVER"]);

      case constants.REMOTEADDR: /* Peer address */
        if (this.ntAdapter) {
          return this.ntAdapter.getOption(opcode); // Pass through to NT
        } else {
          return null;
        }

      case constants.CONNCLASS: /* Connection Class */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "POOL_CONNECTION_CLASS"]);

      case constants.PURITY: /* Purity */
        return findValue(this.cDataNVPair, ["DESCRIPTION", "CONNECT_DATA", "POOL_PURITY"]);

      case constants.HEALTHCHECK: /* Is connection healthy */
        return (this.connected && this.ntAdapter.connected && !this.ntAdapter.err);

      default:
        errors.throwErr(errors.ERR_INTERNAL, "getOption not supported for opcode " + opcode);
    }
  }

  /**
   * receive inband notification
   * @param {Object} obj Return the notification into user provided object
   * @returns Error number sent from server, or error on the connection.
   * returns 0 if healthy connection
   */
  recvInbandNotif() {
    if (this.controlPkt.errno) {     /* Control pkt already read */
      return this.controlPkt.errno;
    } else if (!this.getOption(constants.HEALTHCHECK)) {
      return errors.ERR_CONNECTION_CLOSED;
    } else {
      if (this.getOption(constants.NS_MOREDATA)) { //More data available
        const packet = this.ntAdapter.syncReceive();

        if (packet.type == constants.NSPTCNL) {
          this.controlPkt.fromPacket(packet);
          return this.controlPkt.errno;
        } else {
          this.ntAdapter.packets.unshift(packet); /* Push packet back */
          return 0;
        }
      } else
        return 0;
    }
  }
}

module.exports = {
  NetworkSession,
  resolveAddress,
  getConnectionInfo
};
