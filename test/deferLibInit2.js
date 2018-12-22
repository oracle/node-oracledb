const oracledb = require('oracledb');
const should   = require('should');

describe('deferLibInit2.js', () => {

  it('child process #2 of test/deferLibInit.js', () => {
   
    should.throws(
      () => {
        console.log(oracledb.oracleClientVersion);
      },
      /DPI-1047:/
    );
    // DPI-1047: 64-bit Oracle Client library cannot be loaded...
  });
});