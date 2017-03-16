# node-oracledb version 1.13

## <a name="about"></a> About node-oracledb

The node-oracledb add-on for Node.js powers high performance Oracle
Database applications.

Use node-oracledb to connect Node.js 4, 6 and 7 to Oracle Database.

The add-on is stable, well documented, and has a comprehensive test suite.

The node-oracledb project is open source and maintained by Oracle Corp.  The home page is on the
[Oracle Technology Network](http://www.oracle.com/technetwork/database/database-technologies/scripting-languages/node_js/).

### Node-oracledb supports:

- [Promises](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#promiseoverview), [Callbacks](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#intro) and [Streams](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#querystream)
- [SQL and PL/SQL execution](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#sqlexecution)
- [REF CURSORs](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#refcursors)
- [Large Objects: CLOBs and BLOBs as Streams or Strings and Buffers](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#lobhandling)
- [Oracle Database 12c JSON datatype](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#jsondatatype)
- [Query results as JavaScript objects or arrays](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#queryoutputformats)
- [Smart mapping between JavaScript and Oracle types with manual override available](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#typemap)
- [Data binding using JavaScript types, objects or arrays](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#bind)
- [Transaction Management](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#transactionmgt)
- [Inbuilt Connection Pool with Queueing, Aliasing and Liveness checking](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connpooling)
- [Database Resident Connection Pooling (DRCP)](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#drcp)
- [External Authentication](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth)
- [Row Prefetching](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#rowprefetching)
- [Statement Caching](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#stmtcache)
- [Client Result Caching](https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS464)
- [End-to-end Tracing, Mid-tier Authentication, and Auditing](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#endtoend)
- Oracle High Availability Features
  - [Fast Application Notification (FAN)](https://docs.oracle.com/database/122/ADFNS/high-availability.htm#ADFNS538)
  - [Runtime Load Balancing (RLB)](https://docs.oracle.com/database/122/ADFNS/connection_strategies.htm#ADFNS515)
  - [Transparent Application Failover (TAF)](https://docs.oracle.com/database/122/ADFNS/high-availability.htm#ADFNS-GUID-96599425-9BDA-483C-9BA2-4A4D13013A37)

We are actively working on supporting the best Oracle Database
features, and on functionality requests from
[users involved in the project](https://github.com/oracle/node-oracledb/issues).

## <a name="installation"></a> Installation

Prerequisites:

- [Python 2.7](https://www.python.org/downloads/)
- C Compiler with support for C++ 11 (Xcode, gcc, Visual Studio or similar)
- Oracle 11.2, 12.1 or 12.2 client libraries.  Use the small, free [Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-100365.html) "basic" and "SDK" packages if your database is remote.  Or use the libraries and headers from a locally installed database such as the free [Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html) release.

  Oracle's standard client-server network compatibility applies: Oracle Client 12.2 can connect to Oracle Database 11.2 or greater. Oracle Client 12.1 can connect to Oracle Database 10.2 or greater. Oracle Client 11.2 can connect to Oracle Database 9.2 or greater.
- Set `OCI_LIB_DIR` and `OCI_INC_DIR` during installation if the Oracle libraries and headers are in a non-default location

Run `npm install oracledb` to install from the [npm registry](https://www.npmjs.com/package/oracledb).

See [INSTALL](https://github.com/oracle/node-oracledb/tree/master/INSTALL.md) for details.

## <a name="examples"></a> Examples

See the
[examples](https://github.com/oracle/node-oracledb/tree/master/examples) directory.
Start
with
[examples/select1.js](https://github.com/oracle/node-oracledb/blob/master/examples/select1.js#L35).

## <a name="doc"></a> Documentation

See [Documentation for the Oracle Database Node.js Add-on](https://github.com/oracle/node-oracledb/tree/master/doc/api.md).

## <a name="help"></a> Help

Issues and questions can be raised with the node-oracledb community on [GitHub](https://github.com/oracle/node-oracledb/issues).

## <a name="changes"></a> Changes

See [CHANGELOG](https://github.com/oracle/node-oracledb/tree/master/CHANGELOG.md).

## <a name="testing"></a> Tests

To run the test suite see [test/README](https://github.com/oracle/node-oracledb/tree/master/test/README.md).

## <a name="contrib"></a> Contributing

Node-oracledb is an open source project. See
[CONTRIBUTING](https://github.com/oracle/node-oracledb/tree/master/CONTRIBUTING.md)
for details.

Oracle gratefully acknowledges the contributions to node-oracledb that have been made by the community.

## <a name="license"></a> License

Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved.

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
