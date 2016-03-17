# node-oracledb version 1.7.1

## <a name="about"></a> About node-oracledb

The node-oracledb add-on for Node.js powers high performance Oracle
Database applications.

Use node-oracledb to connect Node.js 0.10, 0.12, 4 LTS and 5 to
Oracle Database.

The add-on is stable, well documented, and has a comprehensive test suite.

The node-oracledb project is open source and maintained by Oracle Corp.  The home page is on the
[Oracle Technology Network](http://www.oracle.com/technetwork/database/database-technologies/scripting-languages/node_js/).


### Node-oracledb supports:

- [SQL and PL/SQL execution](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#sqlexecution)
- [Fetching of large result sets](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#resultsethandling)
- [REF CURSORs](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#refcursors)
- [Large Objects: CLOBs and BLOBs](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#lobhandling)
- [Query results as JavaScript objects or array ](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#queryoutputformats)
- [Smart mapping between JavaScript and Oracle types with manual override available](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#typemap)
- [Data binding using JavaScript objects or arrays](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#bind)
- [Transaction Management](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#transactionmgt)
- [Inbuilt Connection Pool with Queueing](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connpooling)
- [Database Resident Connection Pooling (DRCP)](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#drcp)
- [External Authentication](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth)
- [Row Prefetching](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#rowprefetching)
- [Statement Caching](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#stmtcache)
- [Client Result Caching](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS464)
- [End-to-end Tracing, Mid-tier Authentication, and Auditing](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#endtoend)
- High Availability Features
  - [Fast Application Notification (FAN)](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS538)
  - [Runtime Load Balancing (RLB)](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS515)
  - [Transparent Application Failover (TAF)](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS534)

We are actively working on supporting the best Oracle Database
features, and on functionality requests from
[users involved in the project](https://github.com/oracle/node-oracledb/issues).

## <a name="installation"></a> Installation

Prerequisites:

- [Python 2.7](https://www.python.org/downloads/)
- C Compiler with support for C++ 11 (Xcode, gcc, Visual Studio or similar)
- The small, free [Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-100365.html) libraries if your database is remote.  Or use a locally installed database such as the free [Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html) release
- Set `OCI_LIB_DIR` and `OCI_INC_DIR` during installation if the Oracle libraries and headers are in a non-default location 

Run `npm install oracledb` to install from the [NPM registry](https://www.npmjs.com/package/oracledb).

See [INSTALL](https://github.com/oracle/node-oracledb/tree/master/INSTALL.md) for details.

## <a name="examples"></a> Examples

There are examples in the [examples](https://github.com/oracle/node-oracledb/tree/master/examples) directory.

### A simple query example:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return; }

    connection.execute(
      "SELECT department_id, department_name " +
        "FROM departments " +
        "WHERE manager_id < :id",
      [110],  // bind value for :id
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        console.log(result.rows);
      });
  });
```

With Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

## <a name="doc"></a> Documentation

See [Documentation for the Oracle Database Node.js Add-on](https://github.com/oracle/node-oracledb/tree/master/doc/api.md).

## <a name="changes"></a> Changes

See [CHANGELOG](https://github.com/oracle/node-oracledb/tree/master/CHANGELOG.md)

## <a name="testing"></a> Testsuite

To run the included testsuite see [test/README](https://github.com/oracle/node-oracledb/tree/master/test/README.md).

## <a name="contrib"></a> Contributing

Node-oracledb is an open source project. See
[CONTRIBUTING](https://github.com/oracle/node-oracledb/tree/master/CONTRIBUTING.md)
for details.

Oracle gratefully acknowledges the contributions to node-oracledb that have been made by the community.

## <a name="license"></a> License

Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
