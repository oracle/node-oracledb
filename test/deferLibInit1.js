const oracledb = require('oracledb');
const should   = require('should');

describe('deferLibInit1.js', () => {

  it('child process #1 of test/deferLibInit.js', () => {
    delete process.env.ORACLE_HOME;
    const ld = process.env.LD_LIBRARY_PATH;
    should.not.exist(ld);

    should.exist(oracledb.versionString);
    (oracledb.versionString).should.be.a.String();
  });
});
