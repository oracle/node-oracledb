const oracledb = require('oracledb');
const assert   = require('assert');

describe('deferLibInit1.js', () => {

  it('child process #1 of test/deferLibInit.js', () => {
    delete process.env.ORACLE_HOME;
    const ld = process.env.LD_LIBRARY_PATH;
    assert.ifError(ld);

    assert(oracledb.versionString);
    assert.strictEqual(typeof (oracledb.versionString), "string");
  });
});
