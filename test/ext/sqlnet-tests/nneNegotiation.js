'use strict';

const assert = require('node:assert/strict');
const {getDiffieHellman} = require('node:crypto');
const test = require('node:test');
const {ANO, getFlags} = require('../../../lib/thin/sqlnet/ANO.js');
const constants = require('../../../lib/thin/sqlnet/constants.js');

const attributes = {uuid: Buffer.alloc(16).toString('base64')};
const group = getDiffieHellman('modp14');
const serverKey = group.generateKeys();
const legacyIV = Buffer.alloc(16, 23);

function uint16(value) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(value);
  return buf;
}

function uint32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value);
  return buf;
}

function field(type, data) {
  return Buffer.concat([uint16(data.length), uint16(type), data]);
}

function service(id, version, algorithm, fields = []) {
  return Buffer.concat([uint16(id), uint16(fields.length + 2), Buffer.alloc(4),
    field(5, uint32(version)), field(2, Buffer.from([algorithm])), ...fields]);
}

function serverPacket(encryption, encVersion = 0x17700000, intVersion = encVersion) {
  const encryptionService = service(2, encVersion, encryption);
  const integrityService = service(3, intVersion, 5, [
    field(3, uint16(2048)), field(3, uint16(256)), field(1, group.getGenerator()),
    field(1, group.getPrime()), field(1, serverKey), field(1, legacyIV)
  ]);
  const anoLength = 13 + encryptionService.length + integrityService.length;
  return Buffer.concat([Buffer.alloc(constants.NSPDADAT), uint32(0xdeadbeef),
    uint16(anoLength), uint32(0x17700000), uint16(2), Buffer.alloc(1),
    encryptionService, integrityService]);
}

test('NNE requests ANO on TCP and derives the same key as an independent peer', () => {
  const options = {nativeNetworkEncryption: 'required'};
  assert.equal(getFlags('TCP', options), constants.NSINAWANTED);
  assert.equal(getFlags('TCPS', options), constants.NSINANOSERVICES);
  assert.equal(getFlags('TCP', {}), constants.NSINANOSERVICES);

  const negotiation = new ANO(attributes, true);
  const request = negotiation.sendPacket();
  assert.equal(request.readUInt16BE(4), request.length);
  negotiation.processPacket(serverPacket(17, 0x0c101200, 0x0c100200));
  const state = negotiation.finishKeyExchange();
  assert.equal(state.modernEncryption, true);
  assert.equal(state.modernIntegrity, false);
  assert.deepEqual(state.iv, legacyIV);
  assert.equal(state.response.readUInt16BE(4), state.response.length);
  assert.equal(state.response.readUInt16BE(13), 3);
  const clientKey = state.response.subarray(25);
  assert.deepEqual(state.key, group.computeSecret(clientKey));
});

test('required NNE rejects an unsupported algorithm, missing exchange, and malformed packet', () => {
  assert.throws(() => new ANO(attributes, true).processPacket(serverPacket(0)), {code: 'NJS-532'});
  assert.throws(() => new ANO(attributes, true).finishKeyExchange(), {code: 'NJS-532'});
  assert.throws(() => new ANO(attributes, true).processPacket(serverPacket(17).subarray(0, -1)),
    {code: 'NJS-531'});
  assert.equal(new ANO(attributes).finishKeyExchange(), undefined);
});

test('reads bounded ANO responses spanning multiple TNS DATA packets', async () => {
  const negotiation = new ANO(attributes, true);
  const response = serverPacket(17);
  const first = {type: constants.NSPTDA, buf: response.subarray(0, 320)};
  const remaining = {type: constants.NSPTDA, buf: Buffer.concat([
    Buffer.alloc(constants.NSPDADAT), response.subarray(320),
  ])};
  assert.deepEqual(await negotiation.readResponse(first, () => Promise.resolve(remaining)), response);
  await assert.rejects(negotiation.readResponse(first, () => Promise.resolve(undefined)), {code: 'NJS-531'});
  await assert.rejects(negotiation.readResponse(first, () => Promise.resolve({type: constants.NSPTMK})),
    {code: 'NJS-531'});

  const oversized = Buffer.from(first.buf);
  oversized.writeUInt16BE(0xffff, constants.NSPDADAT + 4);
  await assert.rejects(negotiation.readResponse({type: constants.NSPTDA, buf: oversized}),
    {code: 'NJS-531'});
});
