# node-oracledb version 2.0

## <a name="about"></a> About node-oracledb

The node-oracledb add-on for Node.js powers high performance Oracle
Database applications.

Use node-oracledb to connect Node.js 4, 6, 8 and 9 to Oracle Database.

The add-on is stable, well documented, and has a comprehensive test suite.

The node-oracledb project is open source and maintained by Oracle Corp.

### Node-oracledb supports:

- [Async/Await][2], [Promises][3], [Callbacks][4] and [Streams][5]
- [SQL and PL/SQL execution][6]
- [REF CURSORs][7]
- [Large Objects: CLOBs and BLOBs as Streams or Strings and Buffers][8]
- [Oracle Database 12c JSON datatype][9]
- [Query results as JavaScript objects or arrays][10]
- [Smart mapping between JavaScript and Oracle types with manual override available][11]
- [Data binding using JavaScript types, objects or arrays][12]
- [Transaction Management][13]
- [Inbuilt Connection Pool with Queuing, Aliasing and Liveness checking][14]
- [Database Resident Connection Pooling (DRCP)][15]
- [External Authentication][16]
- [Array Fetches][17]
- [Statement Caching][18]
- [Client Result Caching][19]
- [End-to-end Tracing, Mid-tier Authentication, and Auditing][20]
- Oracle High Availability Features
  - [Fast Application Notification (FAN)][21]
  - [Runtime Load Balancing (RLB)][22]
  - [Transparent Application Failover (TAF)][23]

We are actively working on supporting the best Oracle Database
features, and on functionality requests from [users involved in the
project][24].

## <a name="start"></a> Getting Started

See [Getting Started with Node-oracledb][1].

## <a name="installation"></a> Installation

See [Quick Start Node-oracledb Installation][37].

## <a name="examples"></a> Examples

See the [examples][30] directory.  Start with
[examples/select1.js][31].

## <a name="doc"></a> Documentation

See [Documentation for the Oracle Database Node.js Add-on][32].

## <a name="help"></a> Help

Issues and questions can be raised with the node-oracledb community on
[GitHub][24].

## <a name="changes"></a> Changes

See [CHANGELOG][33].

## <a name="testing"></a> Tests

To run the test suite see [test/README][34].

## <a name="contrib"></a> Contributing

Node-oracledb is an open source project. See [CONTRIBUTING][35] for
details.

Oracle gratefully acknowledges the contributions to node-oracledb that
have been made by the community.

## <a name="license"></a> License

Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved.

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
[http://www.apache.org/licenses/LICENSE-2.0][36].  Unless required by
applicable law or agreed to in writing, software distributed under the
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.



[1]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#getstarted
[2]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#asyncawaitoverview
[3]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#promiseoverview
[4]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#intro
[5]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#querystream
[6]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#sqlexecution
[7]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#refcursors
[8]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#lobhandling
[9]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#jsondatatype
[10]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#queryoutputformats
[11]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#typemap
[12]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#bind
[13]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#transactionmgt
[14]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connpooling
[15]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#drcp
[16]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth
[17]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#propdbfetcharraysize
[18]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#stmtcache
[19]: https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS464
[20]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#endtoend
[21]: https://docs.oracle.com/database/122/ADFNS/high-availability.htm#ADFNS538
[22]: https://docs.oracle.com/database/122/ADFNS/connection_strategies.htm#ADFNS515
[23]: https://docs.oracle.com/database/122/ADFNS/high-availability.htm#ADFNS-GUID-96599425-9BDA-483C-9BA2-4A4D13013A37
[24]: https://github.com/oracle/node-oracledb/issues
[25]: https://www.npmjs.com/package/oracledb
[26]: http://www.oracle.com/technetwork/database/features/instant-client/index-100365.html
[27]: https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#winredists
[28]: http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html
[29]: https://github.com/oracle/node-oracledb/blob/master/INSTALL.md
[30]: https://github.com/oracle/node-oracledb/blob/master/examples
[31]: https://github.com/oracle/node-oracledb/blob/master/examples/select1.js#L35
[32]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md
[33]: https://github.com/oracle/node-oracledb/blob/master/CHANGELOG.md
[34]: https://github.com/oracle/node-oracledb/blob/master/test/README.md
[35]: https://github.com/oracle/node-oracledb/blob/master/CONTRIBUTING.md
[36]: http://www.apache.org/licenses/LICENSE-2.0
[37]: https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#quickstart
