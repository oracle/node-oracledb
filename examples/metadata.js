/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   metadata.js
 *
 * DESCRIPTION
 *   Shows default and extended query column metadata
 *   Uses Oracle's sample HR schema.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *   This example requires node-oracledb 1.10 or later.
 *
 *  *****************************************************************************/

var async = require('async');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var doconnect = function(cb) {
  oracledb.getConnection(
    {
      user          : dbConfig.user,
      password      : dbConfig.password,
      connectString : dbConfig.connectString
    },
    cb);
};

var dorelease = function(conn) {
  conn.close(function (err) {
    if (err)
      console.error(err.message);
  });
};

// Default metadata available
var basic = function (conn, cb) {
  conn.execute(
    "SELECT location_id, city FROM locations",
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log(result.metaData);
        return cb(null, conn);
      }
    });
};

// Extended metadata available
var extended = function (conn, cb) {
  conn.execute(
    "SELECT location_id, city FROM locations",
    {},  // no binds
    { extendedMetaData: true },  // enable the extra metadata
    function(err, result) {
      if (err) {
        return cb(err, conn);
      } else {
        console.log(result.metaData);
        return cb(null, conn);
      }
    });
};

async.waterfall(
  [
    doconnect,
    basic,
    extended
  ],
  function (err, conn) {
    if (err) { console.error("In waterfall error cb: ==>", err, "<=="); }
    if (conn)
      dorelease(conn);
  });
