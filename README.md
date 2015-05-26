# node-oracledb version 0.6

## <a name="about"></a> 1. About node-oracledb

The Oracle Database Node.js driver powers high performance
Node.js applications.

Node-oracledb 0.6 supports basic and advanced Oracle features, including:

- SQL and PL/SQL Execution
- Query results as JavaScript objects or array 
- Binding using JavaScript objects or arrays
- Conversion between JavaScript and Oracle types
- Transaction Management
- Connection Pooling
- [Database Resident Connection Pooling](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS228) (DRCP)
- [External Authentication](http://docs.oracle.com/database/121/DBSEG/authentication.htm#DBSEG99840)
- [Statement Caching](http://docs.oracle.com/database/121/LNOCI/oci09adv.htm#i471377)
- [Client Result Caching](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS464)
- [End-to-end tracing](http://docs.oracle.com/database/121/TGSQL/tgsql_trace.htm#CHDBDGIJ)
- High Availability Features
  - [Fast Application Notification](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS538) (FAN)
  - [Runtime Load Balancing](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS515) (RLB)
  - [Transparent Application Failover](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS534) (TAF)

Node-oracledb 0.6 is a preview release.  We are actively working on
adding features including LOB support and batch fetching / streaming
of large query result sets.

Share your feedback at the Oracle Technology Network
[Node.js discussion forum](https://community.oracle.com/community/database/developer-tools/node_js/content)
so we can incorporate any fixes and "must-haves" into a 1.0 release
soon.  Issues with node-oracledb can also be reported
[here](https://github.com/oracle/node-oracledb/issues).

The driver is maintained by Oracle Corp.

The node-oracledb home page is on the
[Oracle Technology Network](http://www.oracle.com/technetwork/database/database-technologies/node_js/index.html).

### Example: Simple SELECT statement implementation in node-oracledb

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
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      "SELECT department_id, department_name "
    + "FROM departments "
    + "WHERE department_id = :did",
      [180],
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log(result.rows);
      });
  });
```

With Oracle's sample HR schema, the output is:

```
[ [ 180, 'Construction' ] ]
```

There are more examples in the [examples](examples) directory.

## <a name="installation"></a> 2. Installation

The basic install steps are:

- Install the small, free [Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-100365.html) libraries if your database is remote, or have a local database such as the free [Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html) release.
- Run `npm install oracledb` to install from the NPM registry.

See [INSTALL](INSTALL.md) for details.

## <a name="doc"></a> 3. Documentation

See [Documentation for the Oracle Database Node.js Driver](doc/api.md)

## <a name="changes"></a> 4. Changes

See [CHANGELOG](CHANGELOG.md)

*Note* there were two small, backward-compatibility breaking attribute name changes in node-oracledb 0.5.

## <a name="contrib"></a> 5. Contributing

Node-oracledb is an open source project. See 
[CONTRIBUTING](CONTRIBUTING.md)
for details.

## <a name="license"></a> 6. Licence

Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved.

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
