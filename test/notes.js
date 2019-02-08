'use strict';

const oracledb = require('oracledb');
const async = require('async');
const dbconfig = require('./dbconfig.js');

const nodeVersion = process.versions.modules;

if (nodeVersion < 57) {
  console.log("\n\n");
  console.log("**************************************************************");
  console.log("For Node.js v6, please run tests with command `npm run testv6`");
  console.log("**************************************************************");
  console.log("\n\n\n");
}

/****************** Verify the "user/password" provided by user **********************/

const LOGTAG = "Global before-all Hook:\n";

const configList = [
  {
    user: dbconfig.user,
    password: dbconfig.password,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using default schema user failed.\n" +
      "\tPlease ensure you set the following environment variables correctly:\n" +
      "\t* NODE_ORACLEDB_USER\n" +
      "\t* NODE_ORACLEDB_PASSWORD\n" +
      "\t* NODE_ORACLEDB_CONNECTIONSTRING\n",
  }
]

if (dbconfig.test.DBA_PRIVILEGE) {
  configList.push({
    user: dbconfig.test.DBA_user,
    password: dbconfig.test.DBA_password,
    connectString: dbconfig.connectString,
    privilege: oracledb.SYSDBA,
    errMsg: LOGTAG +
      "\tGetting connection using DBA user failed.\n" +
      "\tPlease ensure you set the following environment variables correctly:\n" +
      "\t* NODE_ORACLEDB_DBA_USER\n" +
      "\t* NODE_ORACLEDB_DBA_PASSWORD\n" +
      "\tOr skip tests that requires DBA privilege using:\n" +
      "\tunset NODE_ORACLEDB_DBA_PRIVILEGE\n",
  });
}

if (dbconfig.test.externalAuth) {
  configList.push({
    externalAuth:  true,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using external authentication failed.\n" +
      "\tPlease ensure you set the external authentication environment correctly.\n" +
      "\tOr skip tests that requires external authentication using:\n" +
      "\tunset NODE_ORACLEDB_EXTERNALAUTH\n",
  });
}

if (dbconfig.test.proxySessionUser) {
  configList.push({
    user: `${dbconfig.user}[${dbconfig.test.proxySessionUser}]`,
    password: dbconfig.password,
    connectString: dbconfig.connectString,
    errMsg: LOGTAG +
      "\tGetting connection using proxy authentication failed.\n" +
      "\tPlease ensure you set the proxy authentication environment correctly.\n" +
      "\tOr skip tests that requires proxy authentication using:\n" +
      "\tunset NODE_ORACLEDB_PROXY_SESSION_USER\n"
  });
}

before(function(done) {
  var conn, seriesList=[];
  configList.map(function (conf, index) {
    seriesList.push(function (cb) {
      oracledb.getConnection(conf, function (err, connection) {
        conn = connection;
        cb(err, index);
      });
    });
    seriesList.push(function (cb) {
      conn.execute(
        "select * from dual",
        function(err, result) {
          if (!Boolean(err) && Boolean(result.rows) && (result.rows[0][0]==="X")) {
            cb(null, index);
          } else {
            cb(new Error("Query test failed"), index);
          }
        }
      );
    });
    seriesList.push(function (cb) {
      conn.close(function (err) {cb(err, index)});
    });
  });
  async.series(seriesList, function(err, results) {
    if (err) {
      done(configList[results[results.length - 1]].errMsg);
    } else {
      done();
    }
  });
});
