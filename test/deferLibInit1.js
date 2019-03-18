const oracledb = require('oracledb');
const should   = require('should');

delete process.env.ORACLE_HOME;

describe('deferLibInit1.js', () => {

  it('child process #1 of test/deferLibInit.js', () => {
    const ld = process.env.LD_LIBRARY_PATH;
    should.not.exist(ld);

    should.exist(oracledb.versionString);
    (oracledb.versionString).should.be.a.String();
  });
});
