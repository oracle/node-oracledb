'use strict';

const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const test = require('node:test');
const { NneProtection } = require('../../../lib/thin/sqlnet/nneProtection.js');

const sessionKey = Buffer.from(Array.from({ length: 48 }, (_, index) => index));
const iv = Buffer.from(Array.from({ length: 16 }, (_, index) => index + 0xa0));

// Oracle Net packet payloads generated with go-ora v2.9.0's CBC and SHA256
// implementations, in both directions with independent checksum streams.
const client1 = '11ecdbe903fd15d20c6390f04c5678d2d1c7f9df5a4341b42c6059c63f028002c00d39e4552297e567b23e8b601c71440500';
const server1 = '30e1236e3630b38b89223a33c1beeef16bb986580ca1a8559698eee8960ec80a2ca9f488b8d7d8147ca603a23995bd1c0500';
const client2 = 'd8c95758e3353e530fa52bd10e73b986cb6104370c8e912cbf12045cd1aa15cf8f9901580a85c92f9510a00b26d598940100';
const server2 = '3cdccca59e83ee1032e1f9a3ad9c9f7486e3b86333c6fa6b01ad4fa728471faed61f627abb6bd39983c8414023f602e40400';
const client3 = 'e2e41fb5ba0bc29db4487aecdaf23ca7bd3e3a3087676e3e3b438f4ac0d91f5aeb301db5505464ff7d2ce7af0b89d7c20600';
const server3 = '7539155a6d64b9ba1566dc65a8247a1f1f6a49600bc8b32681702a172ba7a5fc3564cad074ffbbf9cf5166d2da078e1f0600';

test('AES256 and SHA256 protect both directions and reset the checksum streams', () => {
  const protection = new NneProtection(sessionKey, iv);
  assert.equal(protection.protect(Buffer.from('first client')).toString('hex'), client1);
  assert.equal(protection.unprotect(Buffer.from(server1, 'hex')).toString(), 'first server');
  assert.equal(protection.protect(Buffer.from('0123456789abcdef')).toString('hex'), client2);
  assert.equal(protection.unprotect(Buffer.from(server2, 'hex')).toString(), 'second server');
  protection.reset();
  assert.equal(protection.protect(Buffer.from('after reset')).toString('hex'), client3);
  assert.equal(protection.unprotect(Buffer.from(server3, 'hex')).toString(), 'after reset');
});

test('rejects malformed, corrupted, and out-of-sequence protected DATA payloads', () => {
  const payload = Buffer.from(server1, 'hex');
  const corrupted = Buffer.from(payload);
  corrupted[0] ^= 1;
  const invalidTrailer = Buffer.from(payload);
  invalidTrailer[invalidTrailer.length - 2] = 17;
  const unknownFoldIn = Buffer.from(payload);
  unknownFoldIn[unknownFoldIn.length - 1] = 1;

  for (const invalid of [corrupted, invalidTrailer, unknownFoldIn, payload.subarray(1),
    Buffer.from(server2, 'hex')]) {
    const protection = new NneProtection(sessionKey, iv);
    assert.throws(() => protection.unprotect(invalid), { code: 'NJS-509' });
  }
});

test('modern AES256 and SHA256 fold in the authenticated TTC secret', () => {
  // Oracle Net packet payloads generated with go-ora v3 b4ef646.
  const modernClient = 'aed30c141eea5c036fdc25a3135764d6c6c0b110deb1d5d24a8c2cd2c52eec38360053ecdc04ebb8d3de162c49b9f02d0400';
  const modernServer = 'c0d8d07dc5db8a125bd1a1a914786a8f69cd9e23c307214ffa80d90658ca0b1a3487fb213e7c74cd928bce9a7664bcbf0400';
  const foldedClient = '09e1e795a64484c961c1e5b2ae27d3252cf2040c06218769a3b29eb3fd99c1e554a5894d94b3baf7f92ce33aed4b1cff0401';
  const foldedServer = '8975f9ab6ee9164519c0bfc4ba609832bca211d66eca8385fd3d0dfb87ecde6d96bb51df09bc581d7e336caa9843a57a0401';
  const mode = { modernEncryption: true, modernIntegrity: true };
  const authKey = Buffer.from(Array.from({ length: 32 }, (_, index) => index + 0x80));

  const protection = new NneProtection(sessionKey, iv, mode);
  assert.equal(protection.requiresKeyFoldIn, true);
  assert.equal(protection.protect(Buffer.from('client packet')).toString('hex'), modernClient);
  assert.equal(protection.unprotect(Buffer.from(modernServer, 'hex')).toString(), 'server packet');
  assert.throws(() => protection.foldIn(null), { code: 'NJS-531' });
  protection.foldIn(authKey);
  assert.equal(protection.protect(Buffer.from('client packet')).toString('hex'), foldedClient);
  assert.equal(protection.unprotect(Buffer.from(foldedServer, 'hex')).toString(), 'server packet');
  assert.throws(() => protection.foldIn(authKey), { code: 'NJS-531' });

  const foldedProtection = new NneProtection(sessionKey, iv, mode);
  foldedProtection.foldIn(authKey);
  assert.throws(() => foldedProtection.unprotect(Buffer.from(modernServer, 'hex')), { code: 'NJS-509' });
});
