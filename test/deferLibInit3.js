const oracledb = require('oracledb');
const should   = require('should');
const sodaUtil = require('./sodaUtil.js');
const dbconfig = require('./dbconfig.js');

describe('deferLibInit3.js', () => {
  
  it('child process #3 of test/deferLibInit.js', async () => {
    let conn;
    await sodaUtil.assertThrowsAsync(
      async () => conn = await oracledb.getConnection(dbconfig),
      /DPI-1047:/
    );
    // DPI-1047: 64-bit Oracle Client library cannot be loaded...

    should.not.exist(conn);
  });
});