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

const {createDiffieHellman} = require("crypto");
const errors = require("../../errors.js");
const constants = require("./constants.js");

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

// ANO wire algorithm identifiers.
const AES256 = 17;
const SHA256 = 5;
const MAX_ANO_PACKET_SIZE = 8192;
const MAX_DH_BITS = 4096;
const MIN_DH_BITS = 512;

const CID_SIZE = 8;

const CLIENT_SERVER = 0xe0e1; /* cli/svr connection */
const AUTH_NOT_REQUIRED = 0xfcff; /* Auth. not required */
const AUTH_TCPS_ID = 2;
const AUTH_TCPS_NAME = "tcps";

const serviceMap = [-1, 0, 1, 2, 3];

function padDhValue(value, groupLength) {
  if (value.length === 0 || value.length > groupLength) {
    errors.throwErr(errors.ERR_ANO_PACKET);
  }
  if (value.length === groupLength) {
    return value;
  }

  const padded = Buffer.alloc(groupLength);
  value.copy(padded, groupLength - value.length);
  return padded;
}

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

class AlgorithmService extends NetworkService {

  constructor(sAtts, service, required, algorithm) {
    super(sAtts);
    this.service = service;
    this.required = required;
    this.algorithm = algorithm;
    this.drivers = Buffer.from([required ? algorithm : 0]);
    this.numSubPackets = 2;
    this.selected = undefined;
  }

  getDataSize() {
    return SERVICE_HEADER_SIZE + SUBPACKET_SIZE + VERSION_LENGTH +
      SUBPACKET_SIZE + this.drivers.length;
  }

  sendServiceData(buf, pos) {
    pos = this.sendHeader(buf, pos);
    pos = this.sendVersion(buf, pos);
    return this.sendRaw(buf, this.drivers, this.drivers.length, pos);
  }

  readSubpacket(pkt, pos, type, size) {
    if (pkt.length - pos < SUBPACKET_SIZE) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    const length = pkt.readUInt16BE(pos);
    const start = pos + SUBPACKET_SIZE;
    if (pkt.readUInt16BE(pos + 2) !== type || (size !== undefined && length !== size) ||
        length > pkt.length - start) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    return pkt.subarray(start, start + length);
  }

  receiveSelection(pkt, pos) {
    this.version = this.readSubpacket(pkt, pos, VERSION_TYPE, VERSION_LENGTH).readUInt32BE(0);
    pos += SUBPACKET_SIZE + VERSION_LENGTH;
    this.selected = this.readSubpacket(pkt, pos, UB1_TYPE, 1)[0];
    if (this.selected !== this.algorithm) {
      errors.throwErr(errors.ERR_ANO_STATUS, this.service === ENCRYPTION ? "AES256 encryption" : "SHA256 integrity");
    }
    return pos + SUBPACKET_SIZE + 1;
  }

  usesModernProtection() {
    // ANO advertises the updated protection format as update 1 for older
    // major versions and as the base format starting with version 23.
    return (this.version >>> 24) >= 23 || ((this.version >>> 12) & 0xff) === 1;
  }
}

class EncryptionService extends AlgorithmService {

  constructor(sAtts, required) {
    super(sAtts, ENCRYPTION, required, AES256);
    if (required) {
      this.numSubPackets++;
    }
  }

  getDataSize() {
    return super.getDataSize() + (this.required ? SUBPACKET_SIZE + 1 : 0);
  }

  sendServiceData(buf, pos) {
    pos = super.sendServiceData(buf, pos);
    if (this.required) {
      pos = this.sendUB1(buf, 1, pos);
    }
    return pos;
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    if (!this.required) {
      return super.receiveServiceData(pkt, numSubPackets, pos);
    }
    if (numSubPackets !== 2) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    return this.receiveSelection(pkt, pos);
  }
}

class DataIntegrityService extends AlgorithmService {

  constructor(sAtts, required) {
    super(sAtts, DATAINTEGRITY, required, SHA256);
  }

  receiveServiceData(pkt, numSubPackets, pos) {
    if (!this.required) {
      return super.receiveServiceData(pkt, numSubPackets, pos);
    }
    if (numSubPackets !== 8) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos = this.receiveSelection(pkt, pos);
    const groupBits = this.readSubpacket(pkt, pos, UB2_TYPE, 2).readUInt16BE(0);
    pos += SUBPACKET_SIZE + 2;
    const exponentBits = this.readSubpacket(pkt, pos, UB2_TYPE, 2).readUInt16BE(0);
    pos += SUBPACKET_SIZE + 2;
    if (groupBits < MIN_DH_BITS || groupBits > MAX_DH_BITS ||
        exponentBits === 0 || exponentBits > MAX_DH_BITS) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    const groupLength = Math.ceil(groupBits / 8);
    const generator = this.readSubpacket(pkt, pos, RAW_TYPE);
    pos += SUBPACKET_SIZE + generator.length;
    const prime = this.readSubpacket(pkt, pos, RAW_TYPE, groupLength);
    pos += SUBPACKET_SIZE + prime.length;
    const peerKey = this.readSubpacket(pkt, pos, RAW_TYPE, groupLength);
    pos += SUBPACKET_SIZE + peerKey.length;
    this.iv = this.readSubpacket(pkt, pos, RAW_TYPE);
    pos += SUBPACKET_SIZE + this.iv.length;
    if (generator.length === 0 || generator.length > groupLength ||
        this.iv.length === 0 || this.iv.length > 64) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }

    // The ANO Diffie-Hellman parameters arrive in the integrity service even
    // when they will also be used for network encryption.
    try {
      const dh = createDiffieHellman(prime, generator);
      this.publicKey = dh.generateKeys();
      this.key = dh.computeSecret(peerKey);
    } catch (err) {
      errors.throwErr(errors.ERR_ANO_STATUS, "Diffie-Hellman key exchange (" + err.message + ")");
    }
    this.publicKey = padDhValue(this.publicKey, groupLength);
    this.key = padDhValue(this.key, groupLength);
    return pos;
  }
}

/* Advanced Networking Options */
class ANO {

  constructor(sAtts, required = false) {
    this.required = required;
    this.encryption = new EncryptionService(sAtts, required);
    this.integrity = new DataIntegrityService(sAtts, required);
    this.serviceList = [new AuthenticationService(sAtts), this.encryption,
      this.integrity, new SupervisorService(sAtts)];
  }

  sendPacket() {
    let bufSize = HEADER_SIZE;
    for (let i = 0; i < this.serviceList.length; i++) {
      bufSize += this.serviceList[i].getDataSize();
    }
    const buf = Buffer.allocUnsafe(bufSize).fill(0);
    let pos = buf.writeUInt32BE(MAGIC);
    pos = buf.writeUInt16BE(bufSize, pos);
    pos = buf.writeUInt32BE(VERSION, pos);
    pos = buf.writeUInt16BE(this.serviceList.length, pos);
    pos = buf.writeUInt8(0, pos);

    /* Send in order of Supervisor, Auth, Encryption, Data Integrity */
    pos = this.serviceList[3].sendServiceData(buf, pos);
    pos = this.serviceList[0].sendServiceData(buf, pos);
    pos = this.serviceList[1].sendServiceData(buf, pos);
    this.serviceList[2].sendServiceData(buf, pos);

    return buf;
  }

  async readResponse(packet, receivePacket) {
    if (!packet || packet.type !== constants.NSPTDA) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    if (!this.required) {
      return packet.buf;
    }

    const headerOffset = constants.NSPDADAT;
    if (packet.buf.length < headerOffset + HEADER_SIZE ||
        packet.buf.readUInt32BE(headerOffset) !== MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    const anoLength = packet.buf.readUInt16BE(headerOffset + 4);
    const totalLength = headerOffset + anoLength;
    if (anoLength < HEADER_SIZE || anoLength > MAX_ANO_PACKET_SIZE ||
        packet.buf.length > totalLength) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    if (packet.buf.length === totalLength) {
      return packet.buf;
    }

    // A DH group can make the server response larger than the negotiated SDU.
    // A continuation contributes its TNS DATA payload, without a second header.
    const response = Buffer.allocUnsafe(totalLength);
    let offset = packet.buf.copy(response);
    while (offset < totalLength) {
      const fragment = await receivePacket();
      if (!fragment || fragment.type !== constants.NSPTDA ||
          fragment.buf.length <= headerOffset ||
          fragment.buf.length - headerOffset > totalLength - offset) {
        errors.throwErr(errors.ERR_ANO_PACKET);
      }
      offset += fragment.buf.copy(response, offset, headerOffset);
    }
    return response;
  }

  processPacket(pkt) {
    let pos = constants.NSPDADAT;
    if (pkt.length < pos + HEADER_SIZE || pkt.readUInt32BE(pos) !== MAGIC) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 4;
    //const pktLen = pkt.readUInt16BE(pos);
    pos += 2;
    this.version = pkt.readUInt32BE(pos);
    pos += 4;
    const services = pkt.readUInt16BE(pos);
    pos += 2;
    if (this.required && pkt.readUInt8(pos) !== NO_ERROR) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    pos += 1;

    /* Receive service headers */
    const ret = [];
    const received = new Set();
    if (services > this.serviceList.length) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
    for (let i = 0; i < services; i++) {
      if (pkt.length - pos < SERVICE_HEADER_SIZE) {
        errors.throwErr(errors.ERR_ANO_PACKET);
      }
      pos = NetworkService.receiveHeader(pkt, ret, pos);

      if (ret[2] != NO_ERROR) {
        errors.throwErrWithORAError(errors.ERR_ANO_NEGOTIATION, ret[2]);
      }
      const service = this.serviceList[serviceMap[ret[0]]];
      if (!service || received.has(service)) {
        errors.throwErr(errors.ERR_ANO_PACKET);
      }
      received.add(service);
      pos = service.receiveServiceData(pkt, ret[1], pos);
    }
    if (this.required && pos !== pkt.length) {
      errors.throwErr(errors.ERR_ANO_PACKET);
    }
  }

  finishKeyExchange() {
    if (!this.required) {
      return;
    }
    const {key, iv, publicKey} = this.integrity;
    if (this.encryption.selected !== AES256 || this.integrity.selected !== SHA256 ||
        !key || !iv || !publicKey) {
      errors.throwErr(errors.ERR_ANO_STATUS, "required AES256 encryption and SHA256 integrity");
    }
    const response = Buffer.alloc(HEADER_SIZE + SERVICE_HEADER_SIZE + SUBPACKET_SIZE + publicKey.length);
    let pos = response.writeUInt32BE(MAGIC);
    pos = response.writeUInt16BE(response.length, pos);
    pos = response.writeUInt32BE(this.version, pos);
    pos = response.writeUInt16BE(1, pos);
    pos = response.writeUInt8(0, pos);
    pos = response.writeUInt16BE(DATAINTEGRITY, pos);
    pos = response.writeUInt16BE(1, pos);
    pos = response.writeUInt32BE(NO_ERROR, pos);
    this.integrity.sendRaw(response, publicKey, publicKey.length, pos);
    return {
      response,
      key,
      iv,
      modernEncryption: this.encryption.usesModernProtection(),
      modernIntegrity: this.integrity.usesModernProtection()
    };
  }
}

function getFlags(protocol, userConfig) {
  if (protocol.toUpperCase() === "TCP" && userConfig.nativeNetworkEncryption === "required") {
    return constants.NSINAWANTED;
  }

  /* Do the NA negotiation only if external Auth and tpcs Authentication service is requested for a tcps connection */
  if (protocol.toUpperCase() == 'TCPS' && userConfig.externalAuth && !userConfig.token)
    return constants.NSINAWANTED;
  else
    return constants.NSINANOSERVICES;
}

module.exports = { ANO, getFlags};
