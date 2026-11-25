// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

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

const errors = require("../../errors.js");
const constants = require("./constants.js");
const { EZTLSKeyVerifier, EZTLSEngine } = require("./ezTls.js");

const AUTHENTICATION = 1;
const ENCRYPTION = 2;
const DATAINTEGRITY = 3;
const SUPERVISOR = 4;

const MAGIC = 0xdeadbeef;

const NO_ERROR = 0;
const SUPERVISOR_OK = 0x1f;
const AUTHENTICATION_OK = 0xfaff;
const AUTHENTICATION_DONT_USE_AUTH = 0xfbff;

const HEADER_SIZE = 4 + 2 + 4 + 2 + 1; /* magic + length + version + services + flag */
const SERVICE_HEADER_SIZE = 2 + 2 + 4; /* service type + no of subpackets + error */
const ARRAY_PACKET_SIZE = 4 + 2 + 4;  /* magic + ub2 + ub4 */
const SUBPACKET_SIZE = 4;

const VERSION_LENGTH = 4;
const VERSION = 0x17700000 ; /* Version 23.7.0.0.0 */

const STRING_TYPE = 0;
const RAW_TYPE = 1;
const UB1_TYPE = 2;
const UB2_TYPE = 3;
const VERSION_TYPE = 5;
const STATUS_TYPE  = 6;

const CID_SIZE = 8;

const CLIENT_SERVER = 0xe0e1; /* cli/svr connection */
const AUTH_NOT_REQUIRED = 0xfcff; /* Auth. not required */
const AUTH_TCPS_ID = 2;
const AUTH_TCPS_NAME = "tcps";
const TNS_NETWORK_ENCRYPTION_ALG_TLS = 0x15;

const serviceMap = [-1, 0, 1, 2, 3];

class NetworkService {

  constructor(sAtts) {
    this.flags = constants.NSINAWANTED;
    this.sAtts = sAtts;
  }

  getDataSize() {
    return SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH + SUBPACKET_SIZE;
  }

  sendHeader(buf, pos) {
    pos = buf.writeUInt16BE(this.service, pos);
    pos = buf.writeUInt16BE(this.numSubPackets, pos);
    pos = buf.writeUInt32BE(0, pos);
    return pos;
  }

  sendVersion(buf, pos) {
    pos = buf.writeUInt16BE(4, pos);
    pos = buf.writeUInt16BE(VERSION_TYPE, pos);
    pos = buf.writeUInt32BE(VERSION, pos);
    return pos;
  }

  sendRaw(buf, rawData, length, pos) {
    pos = buf.writeUInt16BE(length, pos);
    pos = buf.writeUInt16BE(RAW_TYPE, pos);
    pos += rawData.copy(buf, pos, 0, length);
    return pos;
  }

  sendArray(buf, array, pos) {
    pos = buf.writeUInt16BE(ARRAY_PACKET_SIZE + array.length * 2, pos);
    pos = buf.writeUInt16BE(RAW_TYPE, pos);
    pos = buf.writeUInt32BE(MAGIC, pos);
    pos = buf.writeUInt16BE(UB2_TYPE, pos);
    pos = buf.writeUInt32BE(array.length, pos);
    for (let i = 0; i < array.length; i++) {
      pos = buf.writeUInt16BE(array[i], pos);
    }
    return pos;
  }

  sendStatus(buf, status, pos) {
    pos = buf.writeUInt16BE(2, pos);
    pos = buf.writeUInt16BE(STATUS_TYPE, pos);
    pos = buf.writeUInt16BE(status, pos);
    return pos;
  }

  sendString(buf, string, pos) {
    pos = buf.writeUInt16BE(string.length, pos);
    pos = buf.writeUInt16BE(STRING_TYPE, pos);
    pos += buf.write(string, pos);
    return pos;
  }

  sendUB1(buf, data, pos) {
    pos = buf.writeUInt16BE(1, pos);
    pos = buf.writeUInt16BE(UB1_TYPE, pos);
    pos = buf.writeUInt8(data, pos);
    return pos;
  }

  sendUB2(buf, data, pos) {
    pos = buf.writeUInt16BE(2, pos);
    pos = buf.writeUInt16BE(UB2_TYPE, pos);
    pos = buf.writeUInt16BE(data, pos);
    return pos;
  }

  static receiveHeader(pkt, ret, pos) {
    ret[0] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[1] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[2] = pkt.readUInt32BE(pos);
    pos += 4;

    return pos;
  }

  receiveType(pkt, type, ret, pos) {
    const len = pkt.readUInt16BE(pos);
    pos += 2;
    const receivedType = pkt.readUInt16BE(pos);
    pos += 2;

    if (receivedType != type) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }

    let version, status;
    switch (type) {
      case VERSION_TYPE:
        version = pkt.readUInt32BE(pos);
        pos += 4;
        ret[0] = version;
        return pos;
      case STATUS_TYPE:
        status = pkt.readUInt16BE(pos);
        pos += 2;
        ret[0] = status;
        return pos;
      case RAW_TYPE:
        ret[0] = len;
        return pos;
      case UB1_TYPE:
        ret[0] = pkt.readUInt8(pos);
        return pos + 1;
      case STRING_TYPE:
        ret[0] = len;
        return pos;
    }
  }

  receiveUB2Array(pkt, ret, pos) {
    const ret1 = [];
    pos = this.receiveType(pkt, RAW_TYPE, ret1, pos);

    if (pkt.readUInt32BE(pos) != MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 4;

    const type = pkt.readUInt16BE(pos);
    pos += 2;

    if (type != UB2_TYPE) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }

    const arrayLen = pkt.readUInt32BE(pos);
    pos += 4;

    for (let i = 0; i < arrayLen; i++) {
      ret[i] = pkt.readUInt16BE(pos);
      pos += 2;
    }

    return pos;
  }

  receiveString(pkt, ret, pos) {
    const ret1 = [];
    pos = this.receiveType(pkt, STRING_TYPE, ret1, pos);
    const string = pkt.toString('utf8', pos, pos + ret1[0]);
    pos += ret1[0];
    ret[0] = string;
    return pos;
  }

  receiveServiceData(pkt, numSubPakcets, pos) {
    const ret = [];
    ret[0] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[1] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[2] = pkt.readUInt32BE(pos);
    pos += 4;
    ret[3] = pkt.readUInt16BE(pos);
    pos += 2;
    ret[4] = pkt.readUInt16BE(pos);
    pos += 2;
    ret [5] = pkt.readUInt8(pos);
    pos += 1;

    return pos;
  }
}

class SupervisorService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = SUPERVISOR;
    this.serviceList = [AUTHENTICATION, ENCRYPTION, DATAINTEGRITY, SUPERVISOR];
    this.numSubPackets = 3; /* version, raw, services array */
  }

  getDataSize() {
    return SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + CID_SIZE + SUBPACKET_SIZE +
            ARRAY_PACKET_SIZE + this.serviceList.length * 2;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    pos = this.sendRaw(buf, Buffer.from(this.sAtts.uuid, "base64"), 8, pos);
    pos = this.sendArray(buf, this.serviceList, pos);
    return pos;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    const serverServices = [], version = [], status = [];
    pos = this.receiveType(pkt, VERSION_TYPE, version, pos);
    pos = this.receiveType(pkt, STATUS_TYPE, status, pos);
    if (status[0] != SUPERVISOR_OK) {
      errors.throwErr(errors.ERR_ANO_STATUS, "Supervisor");
    }
    pos = this.receiveUB2Array(pkt, serverServices, pos);
    return pos;
  }
}

class AuthenticationService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = AUTHENTICATION;
    this.status = AUTH_NOT_REQUIRED;
    this.numSubPackets = 3 + 1 * 2; /* We support only tcps */
    this.serviceList = [AUTH_TCPS_NAME];
    this.authActivated = false;
  }

  getDataSize() {
    let len =  SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + 2 + SUBPACKET_SIZE + 2;

    for (let i = 0; i < this.serviceList.length; i++) {
      len += SUBPACKET_SIZE + 1;
      len += SUBPACKET_SIZE + this.serviceList[i].length;
    }
    return len;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    pos = this.sendUB2(buf, CLIENT_SERVER, pos);
    pos = this.sendStatus(buf, this.status, pos);

    /* send Auth drivers - we support only tcps */
    pos = this.sendUB1(buf, AUTH_TCPS_ID, pos);
    pos = this.sendString(buf, AUTH_TCPS_NAME, pos);
    return pos;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    const version = [], status = [], service = [];

    pos = this.receiveType(pkt, VERSION_TYPE, version, pos);
    pos = this.receiveType(pkt, STATUS_TYPE, status, pos);

    if (status[0] == AUTHENTICATION_OK && numSubPackets > 2) {
      pos += 5;
      pos = this.receiveString(pkt, service, pos);
      this.authActivated = true;
    } else if (status[0] == AUTHENTICATION_DONT_USE_AUTH) {
      this.authActivated = false;
    } else {
      errors.throwErr(errors.ERR_ANO_STATUS, "Authentication");
    }
    return pos;
  }
}

class EncryptionService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = ENCRYPTION;
    this.ezTlsConfigured = sAtts.nt.protocol === "TCP" &&
      sAtts.nt.useEzTLS;
    this.selectedAlgoIDs = [0];
    if (this.ezTlsConfigured && sAtts.isNNEEZTLSNegotiated)
      this.selectedAlgoIDs.push(TNS_NETWORK_ENCRYPTION_ALG_TLS);
    this.ezTls = this.selectedAlgoIDs.includes(TNS_NETWORK_ENCRYPTION_ALG_TLS);
    this.numSubPackets = this.ezTls ? 3 : 2;
    // Algorithm actually selected by the server.
    this.negotiatedAlgoID = 0;
    // Whether a non-NUL encryption algorithm has been selected.
    this.active = false;
    // Whether ANO/TLS negotiation is complete.
    this.complete = false;
    // TLS handshake bytes waiting to be sent through ANO.
    this.pendingHandshake = Buffer.alloc(0);
    // Whether the initial ClientHello has been collected.
    this.initialHandshakeReady = false;
    // In-memory Node TLS engine.
    this.engine = null;
    // Buffered first server KeyVerify response.
    this.ezTlsResponseBuffer = null;
    if (this.ezTls)
      this.engine = new EZTLSEngine(sAtts.nt.hostName);
  }

  getDataSize() {
    let size = SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
      SUBPACKET_SIZE + this.selectedAlgoIDs.length;
    if (this.ezTls)
      size += SUBPACKET_SIZE + this.pendingHandshake.length;
    return size;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    const drivers = Buffer.from(this.selectedAlgoIDs);
    pos = this.sendRaw(buf, drivers, drivers.length, pos);
    if (this.ezTls)
      pos = this.sendRaw(buf, this.pendingHandshake, this.pendingHandshake.length, pos);
    return pos;
  }

  // Serializes subsequent TLS handshake flights into an ANO packet.
  sendHandshakeServiceData(buf, pos) {
    const handshake = this.takeHandshakeData();
    pos = buf.writeUInt16BE(this.service, pos);
    pos = buf.writeUInt16BE(1, pos);
    pos = buf.writeUInt32BE(0, pos);
    pos = this.sendRaw(buf, handshake, handshake.length, pos);
    return pos;
  }

  receiveRawData(pkt, pos) {
    const data = [];
    pos = this.receiveType(pkt, RAW_TYPE, data, pos);
    const end = pos + data[0];
    if (end > pkt.length)
      errors.throwErr(errors.ERR_ANO_PACKET);
    return { data: pkt.subarray(pos, end), pos: end };
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    if (this.complete)
      return pos;

    if (this.active) {
      if (numSubPackets != 1)
        errors.throwErr(errors.ERR_ANO_PACKET);
      const result = this.receiveRawData(pkt, pos);
      this.engine.feed(result.data);
      return result.pos;
    }

    if (numSubPackets != 2 && numSubPackets != 3)
      errors.throwErr(errors.ERR_ANO_PACKET);
    const version = [];
    pos = this.receiveType(pkt, VERSION_TYPE, version, pos);
    const algorithm = [];
    const algorithmType = pkt.readUInt16BE(pos + 2);
    if (algorithmType === UB1_TYPE) {
      pos = this.receiveType(pkt, UB1_TYPE, algorithm, pos);
    } else if (algorithmType === RAW_TYPE) {
      const raw = this.receiveRawData(pkt, pos);
      if (raw.data.length !== 1)
        errors.throwErr(errors.ERR_ANO_PACKET);
      algorithm[0] = raw.data[0];
      pos = raw.pos;
    } else {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    this.negotiatedAlgoID = algorithm[0];
    if (!this.selectedAlgoIDs.includes(this.negotiatedAlgoID))
      errors.throwErr(errors.ERR_ANO_NEGOTIATION, this.negotiatedAlgoID);
    this.active = this.negotiatedAlgoID > 0;
    if (this.negotiatedAlgoID == TNS_NETWORK_ENCRYPTION_ALG_TLS) {
      if (!this.ezTls || numSubPackets != 3)
        errors.throwErr(errors.ERR_ANO_PACKET);
      const result = this.receiveRawData(pkt, pos);
      this.engine.feed(result.data);
      return result.pos;
    }
    if (this.ezTlsConfigured) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
        `EZTLS negotiation failed: server selected algorithm ${this.negotiatedAlgoID}`);
    }
    this.complete = true;
    return pos;
  }

  takeHandshakeData() {
    const result = this.pendingHandshake;
    this.pendingHandshake = Buffer.alloc(0);
    return result;
  }

  collectHandshakeData() {
    // Only the negotiation loop drains handshake records. After negotiation,
    // the shared output handler owns all application/control TLS records.
    if (this.active && this.engine) {
      this.pendingHandshake = this.engine.takeOutbound();
      this.complete = this.engine.handshakeComplete &&
        this.engine._pendingRecord.length === 0;
    }
  }

  needsHandshakePacket() {
    /* The final client TLS flight can be produced at the same time that
     * secureConnect marks the handshake complete. It still must be sent. */
    return this.active && this.pendingHandshake.length > 0;
  }

  isEZTLSActive() {
    return this.negotiatedAlgoID == TNS_NETWORK_ENCRYPTION_ALG_TLS && this.complete;
  }

  setAuthSessionKey(sessionKey) {
    if (!this.isEZTLSActive())
      return;
    this.keyVerifier = new EZTLSKeyVerifier(sessionKey,
      this.engine.getPeerX509Certificate());
    this.ezTlsResponseBuffer = null;
    this.ezTlsVerificationFailed = false;
    this.keyVerifyRequestSent = false;
    this.keyVerifyRequestQueued = false;
  }

  clearAuthSessionKey() {
    if (this.keyVerifier) {
      this.keyVerifier.clear();
      this.keyVerifier = null;
    }
    this.ezTlsResponseBuffer = null;
  }

  failAuthSessionKey() {
    this.clearAuthSessionKey();
    this.ezTlsVerificationFailed = true;
  }

  destroy() {
    this.clearAuthSessionKey();
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    this.pendingHandshake = Buffer.alloc(0);
  }

  encryptData(payload, addVerifier = false, context) {
    if (!this.isEZTLSActive())
      return payload;
    if (this.keyVerifier) {
      if (addVerifier) {
        payload = this.keyVerifier.encryptAndAddVerifyPacket(payload);
        this.keyVerifyRequestSent = true;
      } else if (!this.keyVerifyRequestSent) {
        errors.throwErr(errors.ERR_INVALID_PACKET,
          "EZTLS verifier packet was not sent first");
      }
    }
    return this.engine.encrypt(payload, context);
  }

  _processDecryptedData(result) {
    if (result === null)
      return null;
    if (this.ezTlsVerificationFailed) {
      errors.throwErr(errors.ERR_INVALID_PACKET,
        "EZTLS server verification previously failed");
    }
    if (this.keyVerifier) {
      this.ezTlsResponseBuffer = this.ezTlsResponseBuffer
        ? Buffer.concat([this.ezTlsResponseBuffer, result])
        : Buffer.from(result);
      /* Require the verifier envelope before releasing application bytes.
       * Signature/decryption checks implement the current wire protocol;
       * they do not resolve the reflection/GCM limitations in ezTLS.md. */
      let parsedResponse;
      let clear;
      try {
        if (this.ezTlsResponseBuffer.length >= 2 &&
            this.ezTlsResponseBuffer.readUInt16BE(0) !== 0x5AA5) {
          errors.throwErr(errors.ERR_INVALID_PACKET,
            "EZTLS server verification response is missing");
        }
        parsedResponse = EZTLSKeyVerifier.parseResponse(
          this.ezTlsResponseBuffer);
        if (parsedResponse === null)
          return null;
        clear = this.keyVerifier.decryptServerResponse(parsedResponse);
      } catch (err) {
        this.failAuthSessionKey();
        throw err;
      }
      // One TLS data event may contain the verifier and later ordinary data.
      // Strip exactly the envelope and retain the following bytes in order.
      this.ezTlsResponseBuffer = null;
      this.keyVerifier = null;
      result = parsedResponse.remainder.length ?
        Buffer.concat([clear, parsedResponse.remainder]) : clear;
    }
    return result;
  }

  decryptData(payload) {
    if (!this.isEZTLSActive())
      return payload;
    return this._processDecryptedData(this.engine.decrypt(payload));
  }

  takeDecryptedData() {
    if (!this.isEZTLSActive())
      return null;
    return this._processDecryptedData(this.engine.decrypt());
  }

  setHandlers(plaintextHandler, outboundHandler) {
    if (this.engine)
      this.engine.setHandlers(plaintextHandler, outboundHandler);
  }
}

class DataIntegrityService extends NetworkService {

  constructor(sAtts) {
    super(sAtts);
    this.service = DATAINTEGRITY;
    this.numSubPackets = 2;
  }

  getDataSize() {
    return   SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
            SUBPACKET_SIZE + 1;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    /* EZTLS replaces normal DataIntegrity negotiation. The server sends only
     * the version subpacket in this service response. */
    if (numSubPackets === 1) {
      const version = [];
      return this.receiveType(pkt, VERSION_TYPE, version, pos);
    }
    return super.receiveServiceData(pkt, numSubPackets, pos);
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    const drivers = Buffer.from([0x00]); /* No data integrity drivers supported */
    pos = this.sendRaw(buf, drivers, 1, pos);
    return pos;
  }
}

/* Advanced Networking Options */
class ANO {

  constructor(sAtts) {
    this.sAtts = sAtts;
    this.serviceList = [new AuthenticationService(sAtts), new EncryptionService(sAtts),
      new DataIntegrityService(sAtts), new SupervisorService(sAtts)];
  }

  async initializeHandshake() {
    // tls.connect() may return before emitting ClientHello. Subscribe to the
    // engine's complete-flight readiness before serializing the initial ANO.
    // Waiting for the completed TLS handshake here would deadlock: the server
    // cannot respond until that ANO packet carries the ClientHello first.
    const encryption = this.serviceList[1];
    if (encryption.ezTls && !encryption.initialHandshakeReady) {
      try {
        encryption.pendingHandshake = await encryption.engine.waitForClientHello();
        encryption.initialHandshakeReady = true;
      } catch (err) {
        this.destroy();
        throw err;
      }
    }
  }

  _createPacketBuffer(bufSize, numServices) {
    // ANO uses a uint16 message length independently of outer NS/SDU framing.
    if (bufSize > 0xffff)
      errors.throwErr(errors.ERR_ANO_PACKET);
    const buf = Buffer.allocUnsafe(bufSize).fill(0);
    let pos = buf.writeUInt32BE(MAGIC);
    pos = buf.writeUInt16BE(bufSize, pos);
    pos = buf.writeUInt32BE(VERSION, pos);
    pos = buf.writeUInt16BE(numServices, pos);
    pos = buf.writeUInt8(0, pos);
    return { buf, pos };
  }

  sendPacket() {
    const encryption = this.serviceList[1];
    if (encryption.ezTls && !encryption.initialHandshakeReady)
      errors.throwErr(errors.ERR_ANO_PACKET);
    if (encryption.needsHandshakePacket()) {
      const handshake = encryption.pendingHandshake;
      const bufSize = HEADER_SIZE + SERVICE_HEADER_SIZE +
        SUBPACKET_SIZE + handshake.length;
      const { buf, pos } = this._createPacketBuffer(bufSize, 1);
      encryption.sendHandshakeServiceData(buf, pos);
      return buf;
    }
    let bufSize = HEADER_SIZE;
    for (let i = 0; i < this.serviceList.length; i++) {
      bufSize += this.serviceList[i].getDataSize();
    }
    const { buf, pos: initialPos } = this._createPacketBuffer(bufSize,
      this.serviceList.length);
    let pos = initialPos;

    /* Send in order of Supervisor, Auth, Encryption, Data Integrity */
    pos = this.serviceList[3].sendServiceData(buf, pos);
    pos = this.serviceList[0].sendServiceData(buf, pos);
    pos = this.serviceList[1].sendServiceData(buf, pos);
    this.serviceList[2].sendServiceData(buf, pos);

    return buf;
  }

  async processPacket(pkt) {
    let pos = 10;
    if (pkt.readUInt32BE(pos) != MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 4;
    //const pktLen = pkt.readUInt16BE(pos);
    pos += 2;
    //const version = pkt.readUInt32BE(pos);
    pos += 4;
    const services = pkt.readUInt16BE(pos);
    pos += 2;
    //const error = pkt.readUInt8(pos);
    pos += 1;

    /* Receive service headers */
    const ret = [];
    for (let i = 0; i < services; i++) {
      pos = NetworkService.receiveHeader(pkt, ret, pos);

      if (ret[2] != NO_ERROR) {
        errors.throwErrWithORAError(errors.ERR_ANO_NEGOTIATION, ret[2]);
      }
      const serviceId = serviceMap[ret[0]];

      pos = await this.serviceList[serviceId].receiveServiceData(pkt, ret[1], pos);

    }
    return this.serviceList[1].needsHandshakePacket();
  }

  isEZTLSActive() {
    return this.serviceList[1].isEZTLSActive();
  }

  setAuthSessionKey(sessionKey) {
    this.serviceList[1].setAuthSessionKey(sessionKey);
  }

  clearAuthSessionKey() {
    this.serviceList[1].clearAuthSessionKey();
  }

  destroy() {
    this.serviceList[1].destroy();
  }

  encryptData(payload, addVerifier, context) {
    return this.serviceList[1].encryptData(payload, addVerifier, context);
  }

  decryptData(payload) {
    return this.serviceList[1].decryptData(payload);
  }

  takeDecryptedData() {
    return this.serviceList[1].takeDecryptedData();
  }

  setHandlers(plaintextHandler, outboundHandler) {
    this.serviceList[1].setHandlers(plaintextHandler, outboundHandler);
  }
}

function getFlags(protocol, userConfig) {

  /* TCPS authentication uses ANO as before. For TCP, EZTLS requires the
     explicit useEzTLS opt-in before ANO is requested. */
  if ((protocol.toUpperCase() == 'TCPS' && userConfig.externalAuth && !userConfig.token) ||
      (protocol.toUpperCase() == 'TCP' && userConfig.useEzTLS))
    return constants.NSINAWANTED;
  else
    return constants.NSINANOSERVICES;
}

module.exports = { ANO, getFlags};
