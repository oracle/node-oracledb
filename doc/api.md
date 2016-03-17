# node-oracledb 1.8: Documentation for the Oracle Database Node.js Add-on

*Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

## Contents

1. [Introduction](#intro)
2. [Errors](#errorobj)
  - 2.1 [Error Properties](#properror)
3. [Oracledb Class](#oracledbclass)
  - 3.1 [Oracledb Constants](#oracledbconstants)
     - ARRAY
     - BIND_IN
     - BIND_INOUT
     - BIND_OUT
     - BLOB
     - BUFFER
     - CLOB
     - CURSOR
     - DATE
     - DEFAULT
     - NUMBER
     - OBJECT
     - STRING
  - 3.2 [Oracledb Properties](#oracledbproperties)
     - 3.2.1 [autoCommit](#propdbisautocommit)
     - 3.2.2 [connectionClass](#propdbconclass)
     - 3.2.3 [externalAuth](#propdbisexternalauth)
     - 3.2.4 [fetchAsString](#propdbfetchasstring)
     - 3.2.5 [lobPrefetchSize](#propdblobprefetchsize)
     - 3.2.6 [maxRows](#propdbmaxrows)
     - 3.2.7 [oracleClientVersion](#propdboracleClientVersion)
     - 3.2.8 [outFormat](#propdboutformat)
     - 3.2.9 [poolIncrement](#propdbpoolincrement)
     - 3.2.10 [poolMax](#propdbpoolmax)
     - 3.2.11 [poolMin](#propdbpoolmin)
     - 3.2.12 [poolTimeout](#propdbpooltimeout)
     - 3.2.13 [prefetchRows](#propdbprefetchrows)
     - 3.2.14 [queueRequests](#propdbqueuerequests)
     - 3.2.15 [queueTimeout](#propdbqueuetimeout)
     - 3.2.16 [stmtCacheSize](#propdbstmtcachesize)
     - 3.2.17 [version](#propdbversion)
  - 3.3 [Oracledb Methods](#oracledbmethods)
     - 3.3.1 [createPool()](#createpool)
     - 3.3.2 [getConnection()](#getconnectiondb)
4. [Connection Class](#connectionclass)
  - 4.1 [Connection Properties](#connectionproperties)
     - 4.1.1 [action](#propconnaction)
     - 4.1.2 [clientId](#propconnclientid)
     - 4.1.3 [module](#propconnmodule)
     - 4.1.4 [oracleServerVersion](#propconnoracleserverversion)
     - 4.1.5 [stmtCacheSize](#propconnstmtcachesize)
  - 4.2 [Connection Methods](#connectionmethods)
     - 4.2.1 [break()](#break)
     - 4.2.2 [commit()](#commit)
     - 4.2.3 [execute()](#execute)
        - 4.2.3.1 [execute(): SQL Statement](#executesqlparam)
        - 4.2.3.2 [execute(): Bind Parameters](#executebindParams)
        - 4.2.3.3 [execute(): Options](#executeoptions)
        - 4.2.3.4 [execute(): Callback Function](#executecallback)
     - 4.2.4 [release()](#release)
     - 4.2.5 [rollback()](#rollback)
5. [Lob Class](#lobclass)
  - 5.1 [Lob Properties](#lobproperties)
     - 5.1.1 [chunkSize](#proplobchunksize)
     - 5.1.2 [length](#proploblength)
     - 5.1.3 [pieceSize](#proplobpiecesize)
     - 5.1.4 [type](#proplobtype)
6. [Pool Class](#poolclass)
  - 6.1 [Pool Properties](#poolproperties)
     - 6.1.1 [connectionsInUse](#proppoolconnectionsinuse)
     - 6.1.2 [connectionsOpen](#proppoolconnectionsopen)
     - 6.1.3 [poolIncrement](#proppoolpoolincrement)
     - 6.1.4 [poolMax](#proppoolpoolmax)
     - 6.1.5 [poolMin](#proppoolpoolmin)
     - 6.1.6 [poolTimeout](#proppoolpooltimeout)
     - 6.1.7 [queueRequests](#proppoolqueuerequests)
     - 6.1.8 [queueTimeout](#proppoolqueueTimeout)
     - 6.1.9 [stmtCacheSize](#proppoolstmtcachesize)
  - 6.2 [Pool Methods](#poolmethods)
     - 6.2.1 [getConnection()](#getconnectionpool)
     - 6.2.2 [terminate()](#terminate)
7. [ResultSet Class](#resultsetclass)
  - 7.1 [ResultSet Properties](#resultsetproperties)
     - 7.1.1 [metaData](#rsmetadata)
  - 7.2 [ResultSet Methods](#resultsetmethods)
     - 7.2.1 [close()](#close)
     - 7.2.2 [getRow()](#getrow)
     - 7.2.3 [getRows()](#getrows)
8. [Connection Handling](#connectionhandling)
  - 8.1 [Connection Strings](#connectionstrings)
     - 8.1.1 [Easy Connect Syntax for Connection Strings](#easyconnect)
     - 8.1.2 [Net Service Names for Connection Strings](#tnsnames)
     - 8.1.3 [JDBC and Node-oracledb Connection Strings Compared](#notjdbc)
  - 8.2 [Connection Pooling](#connpooling)
     - 8.2.1 [Connection Pool Monitoring and Throughput](#connpoolmonitor)
  - 8.3 [Database Resident Connection Pooling (DRCP)](#drcp)
  - 8.4 [External Authentication](#extauth)
9. [SQL Execution](#sqlexecution)
  - 9.1 [SELECT Statements](#select)
     - 9.1.1 [Fetching Rows](#fetchingrows)
     - 9.1.2 [Result Set Handling](#resultsethandling)
     - 9.1.3 [Query Output Formats](#queryoutputformats)
     - 9.1.4 [Query Column Metadata](#querymeta)
     - 9.1.5 [Result Type Mapping](#typemap)
     - 9.1.6 [Row Prefetching](#rowprefetching)
10. [PL/SQL Execution](#plsqlexecution)
  - 10.1 [PL/SQL Stored Procedures](#plsqlproc)
  - 10.2 [PL/SQL Stored Functions](#plsqlfunc)
  - 10.3 [Anonymous PL/SQL blocks](#plsqlanon)
  - 10.4 [Using DBMS_OUTPUT](#dbmsoutput)
11. [Working with CLOB and BLOB Data](#lobhandling)
12. [Bind Parameters for Prepared Statements](#bind)
  - 12.1 [IN Bind Parameters](#inbind)
  - 12.2 [OUT and IN OUT Bind Parameters](#outbind)
  - 12.3 [DML RETURNING Bind Parameters](#dmlreturn)
  - 12.4 [REF CURSOR Bind Parameters](#refcursors)
  - 12.5 [LOB Bind Parameters](#lobbinds)
  - 12.6 [PL/SQL Collection Associative Array (Index-by) Bind Parameters](#plsqlindexbybinds)
13. [Transaction Management](#transactionmgt)
14. [Statement Caching](#stmtcache)
15. [External Configuration](#oraaccess)
16. [Globalization and National Language Support (NLS)](#nls)
17. [End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend)

## <a name="intro"></a> 1. Introduction

The [*node-oracledb*](https://github.com/oracle/node-oracledb) add-on for Node.js powers high performance Oracle Database applications.

This document shows how to use node-oracledb.  The API reference is in
sections 2 - 7 and the user guide in subsequent sections.

For how to install node-oracledb, see [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md).

### Example: Simple SELECT statement implementation in Node.js

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
      "SELECT department_id, department_name " +
        "FROM departments " +
        "WHERE manager_id < :id",
      [110],  // bind value for :id
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
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

There are more node-oracledb examples in the
[examples](https://github.com/oracle/node-oracledb/tree/master/examples)
directory.

Scripts to create Oracle's sample schemas can be found at
[github.com/oracle/db-sample-schemas](https://github.com/oracle/db-sample-schemas).

## <a name="errorobj"></a> 2. Errors

Unless otherwise specified, the last parameter of each method is a
callback.  If an application does not pass a callback function where
it is expected, then node-oracledb throws an exception of type *Error*.

The first parameter of the callback is an *Error* object that
contains error information if the call fails.  If the call succeeds,
then the object is null.

If an invalid value is set for a property, then the *Error* object is
thrown.  The same is true for invalid operations on
read-only or write-only properties.

### <a name="properror"></a> 2.1 Error Properties

The *Error* object contains a message property.

```
String message
```

The text of the error message.

The error may be a standard Oracle message with a prefix like ORA or
PLS.  Alternatively it may be a node-oracledb specific error prefixed with
NJS or DPI.

A single line error message may look like this:

```
ORA-01017: invalid username/password; logon denied
```

A multi-line error message may look like this:

```
ORA-06550: line 1, column 7:
PLS-00201: identifier 'TESTPRC' must be declared
ORA-06550: line 1, column 7:
PL/SQL: Statement ignored
```


## <a name="oracledbclass"></a> 3. Oracledb Class

The *Oracledb* object is the factory class for *Pool* and *Connection* objects.

The *Oracledb* object is instantiated by loading node-oracledb:

```javascript
var oracledb = require("oracledb");
```

Internally, the add-on creates the *Oracledb* object as a singleton.
Reloading it in the same Node.js process creates a new pointer to the
same object.

### <a name="oracledbconstants"></a> 3.1 Oracledb Constants

These constants are defined in the `oracledb` module that provides all
the node-oracledb functionality.  Individual constant usage is
described later in this document.

#### Constants for the query result [outFormat](#propdboutformat) option:

```
Oracledb.ARRAY                     // Fetch each row as array of column values

Oracledb.OBJECT                    // Fetch each row as an object
```

#### Type constants for `execute()` [bind parameter](#executebindParams) and [Lob](#proplobpiecesize) `type` properties, for [`fetchAsString`](#propdbfetchasstring), and for [`fetchInfo`](#propfetchinfo)

Not all constants can be used in all places:

```
Oracledb.BLOB                      // Bind a BLOB to a Node.js Stream

Oracledb.BUFFER                    // Bind a RAW to a Node.js Buffer

Oracledb.CLOB                      // Bind a CLOB to a Node.js Stream

Oracledb.CURSOR                    // Bind a REF CURSOR to a node-oracledb ResultSet class

Oracledb.DATE                      // Bind as JavaScript date type.  Can also be used for fetchAsString and fetchInfo

Oracledb.DEFAULT                   // Used with fetchInfo to reset the fetch type to the database type

Oracledb.NUMBER                    // Bind as JavaScript number type.  Can also be used for fetchAsString and fetchInfo

Oracledb.STRING                    // Bind as JavaScript string type
```

#### Constants for `execute()` [bind parameter](#executebindParams) `dir` properties

These specify whether data values bound to SQL or PL/SQL bind
parameters are passed into, or out from, the database:

```
Oracledb.BIND_IN                   // Direction for IN binds

Oracledb.BIND_INOUT                // Direction for IN OUT binds

Oracledb.BIND_OUT                  // Direction for OUT binds

```

#### Example

This example shows setting the output format so all query results are returned in object format:

```javascript
var oracledb = require("oracledb");
oracledb.outFormat = oracledb.OBJECT;
```

### <a name="oracledbproperties"></a> 3.2 Oracledb Properties

The properties of the *Oracledb* object are used for setting up
configuration parameters for deployment.

If required, these properties can be overridden for the *Pool* or
*Connection* objects.

These properties may be read or modified. If a property is modified,
only subsequent invocations of the `createPool()` or `getConnection()`
methods will be affected. Objects that exist before a property is
modified are not altered.

Invalid values, or combinations of values, for pool configuration
properties can result in the error *ORA-24413: Invalid number of
sessions specified*.

Each of the configuration properties is described below.

#### <a name="propdbisautocommit"></a> 3.2.1 autoCommit

```
Boolean autoCommit
```

If this property is *true*, then the transaction in the current
connection is automatically committed at the end of statement
execution.

The default value is *false*.

This property may be overridden in an [`execute()`](#execute) call.

Note prior to node-oracledb 0.5 this property was called
`isAutoCommit`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.autoCommit = false;
```

#### <a name="propdbconclass"></a> 3.2.2 connectionClass

```
String connectionClass
```

The user-chosen Connection class value defines a logical name for connections.
Most single purpose applications should set `connectionClass` when
using a connection pool or DRCP.

When a pooled session has a connection class, Oracle ensures that the
session is not shared outside of that connection class.

The connection class value is similarly used by
[Database Resident Connection Pooling (DRCP)](#drcp) to allow or
disallow sharing of sessions.

For example, where two different kinds of users share one pool, you
might set `connectionClass` to 'HRPOOL' for connections that access a
Human Resources system, and it might be set to 'OEPOOL' for users of an
Order Entry system.  Users will only be given sessions of the
appropriate class, allowing maximal reuse of resources in each case,
and preventing any session information leaking between the two systems.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.connectionClass = 'HRPOOL';
```

#### <a name="propdbisexternalauth"></a> 3.2.3 externalAuth

```
Boolean externalAuth
```

If this property is *true* then connections are established using
external authentication.  See [External Authentication](#extauth) for
more information.

The default value is *false*.

The `user` and `password` properties for connecting or creating a pool
should not be set when `externalAuth` is *true*.

This property can be overridden in the *Oracledb*
[`getConnection()`](#getconnectiondb) or [`createPool()`](#createpool)
calls.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.externalAuth = false;
```

#### <a name="propdbfetchasstring"></a> 3.2.4 fetchAsString

```
Array fetchAsString
```

An array of node-oracledb types.  When any column having the specified
type is queried with [`execute()`](#execute), the column data is
returned as a string instead of the native representation.  For column
types not specified in `fetchAsString`, native types will be returned.

By default all columns are returned as native types.

This property helps avoid situations where using JavaScript types can
lead to numeric precision loss, or where date conversion is unwanted.

The valid types that can be mapped to strings are
[`DATE`](#oracledbconstants) and [`NUMBER`](#oracledbconstants).

The maximum length of a string created by this mapping is 200 bytes.

Individual query columns in an [`execute()`](#execute) call can
override the `fetchAsString` global setting by using
[`fetchInfo`](#executeoptions).

The conversion to string is handled by Oracle client libraries and is
often referred to as *defining* the fetch type.


##### Example

```javascript
var oracledb = require('oracledb');
oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
```

#### <a name="propdblobprefetchsize"></a> 3.2.5 lobPrefetchSize

```
Number lobPrefetchSize
```

This attribute is temporarily disabled.  Setting it has no effect.

Node-oracledb internally uses Oracle *LOB Locators* to manipulate long
object (LOB) data.  LOB Prefetching allows LOB data to be returned
early to node-oracledb when these locators are first returned.
This is similar to the way [row prefetching](#rowprefetching) allows
for efficient use of resources and round-trips between node-oracledb
and the database.

Prefetching of LOBs is mostly useful for small LOBs.

The default size is 16384.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.lobPrefetchSize = 16384;
```

#### <a name="propdbmaxrows"></a> 3.2.6 maxRows

```
Number maxRows
```

The maximum number of rows that are fetched by the `execute()` call of the *Connection*
object when *not* using a [`ResultSet`](#resultsetclass).  Rows beyond
this limit are not fetched from the database.

The default value is 100.

This property may be overridden in an [`execute()`](#execute) call.

To improve database efficiency, SQL queries should use a row
limiting clause like [OFFSET /
FETCH](https://docs.oracle.com/database/121/SQLRF/statements_10002.htm#BABEAACC)
or equivalent. The `maxRows` property can be used to stop badly coded
queries from returning unexpectedly large numbers of rows.

Adjust `maxRows` as required by each application or query.  Values
that are larger than required can result in sub-optimal memory usage.

`maxRows` is ignored when fetching rows with a
[`ResultSet`](#resultsetclass).

When the number of query rows is relatively big, or can't be
predicted, it is recommended to use a [`ResultSet`](#resultsetclass).
This prevents query results being unexpectedly truncated by the
`maxRows` limit and removes the need to oversize `maxRows` to avoid
such truncation.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.maxRows = 100;
```

#### <a name="propdboracleClientVersion"></a> 3.2.7 oracleClientVersion

```
readonly Number oracleClientVersion
```

This readonly property gives a numeric representation of the Oracle client library version.
For version *a.b.c.d.e*, this property gives the number: `(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e`

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Oracle client library version number is " + oracledb.oracleClientVersion);
```

#### <a name="propdboutformat"></a> 3.2.8 outFormat

```
Number outFormat
```

The format of rows fetched when using the [`execute()`](#execute)
call. This can be either of the [Oracledb
constants](#oracledbconstants) `ARRAY` or `OBJECT`.  The default value
is `ARRAY` which is more efficient.

If specified as `ARRAY`, each row is fetched as an array of column
values.

If specified as `OBJECT`, each row is fetched as a JavaScript object.
The object has a property for each column name, with the property
value set to the respective column value.  The property name follows
Oracle's standard name-casing rules.  It will commonly be uppercase,
since most applications create tables using unquoted, case-insensitive
names.

This property may be overridden in an [`execute()`](#execute) call.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.ARRAY;
```

#### <a name="propdbpoolincrement"></a> 3.2.9 poolIncrement

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

The default value is 1.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolIncrement = 1;
```

#### <a name="propdbpoolmax"></a> 3.2.10 poolMax

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

The default value is 4.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMax = 4;
```

#### <a name="propdbpoolmin"></a> 3.2.11 poolMin

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

The default value is 0.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMin = 0;
```

#### <a name="propdbpooltimeout"></a> 3.2.12 poolTimeout

```
Number poolTimeout
```

The number of seconds after which idle connections (unused in the
pool) are terminated.  Idle connections are terminated only when the
pool is accessed.  If the `poolTimeout` is set to 0, then idle
connections are never terminated.

The default value is 60.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolTimeout = 60;
```

#### <a name="propdbprefetchrows"></a> 3.2.13 prefetchRows

```
Number prefetchRows
```

The number of additional rows the underlying Oracle client library
fetches whenever node-oracledb requests query data from the database.

Prefetching is a tuning option to maximize data transfer efficiency and
minimize round-trips to the database.  The prefetch size does not
affect when, or how many, rows are returned by node-oracledb to the
application.  The cache management is transparently handled by the
Oracle client libraries.

`prefetchRows` is ignored unless a [`ResultSet`](#resultsetclass) is used.

The default value is 100.

This property may be overridden in an [`execute()`](#execute) call.

See [Row Prefetching](#rowprefetching) for examples.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.prefetchRows = 100;
```

#### <a name="propdbqueuerequests"></a> 3.2.14 queueRequests

```
Boolean queueRequests
```

If this property is *true* and the number of connections "checked out"
from the pool has reached the number specified by
[`poolMax`](#propdbpoolmax), then new requests for connections are
queued until in-use connections are released.

If this property is *false* and a request for a connection is made
from a pool where the number of "checked out" connections has reached
`poolMax`, then an *ORA-24418* error indicating that further sessions
cannot be opened will be returned.

The default value is *true*.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.queueRequests = false;
```

#### <a name="propdbqueuetimeout"></a> 3.2.15 queueTimeout

```
Number queueTimeout
```

The number of milliseconds after which connection requests waiting in
the connection request queue are terminated.  If `queueTimeout` is
0, then queued connection requests are never terminated.

The default value is 60000.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.queueTimeout = 3000; // 3 seconds
```

#### <a name="propdbstmtcachesize"></a> 3.2.16 stmtCacheSize

```
Number stmtCacheSize
```

The number of statements that are cached in the [statement cache](#stmtcache) of
each connection.

The default value is 30.

This property may be overridden for specific *Pool* or *Connection*
objects.

In general, set the statement cache to the size of the working set of
statements being executed by the application.  Statement caching can
be disabled by setting the size to 0.

See [Statement Caching](#stmtcache) for examples.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.stmtCacheSize = 30;
```

#### <a name="propdbversion"></a> 3.2.17 version
```
readonly Number version
```

This readonly property gives a numeric representation of the node-oracledb version.
For version *x.y.z*, this property gives the number: `(10000 * x) + (100 * y) + z`

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Driver version number is " + oracledb.version);
```

### <a name="oracledbmethods"></a> 3.3 Oracledb Methods

#### <a name="createpool"></a> 3.3.1 createPool()

##### Prototype

```
void createPool(Object poolAttrs, function(Error error, Pool pool){});
```

##### Return Value

None

##### Description

This method creates a pool of connections with the specified username,
password and connection string.

This is an asynchronous call.

Internally, `createPool()` creates an [OCI Session
Pool](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
for each Pool object.

The default properties may be overridden by specifying new properties
in the `poolAttrs` parameter.

A pool should be terminated with the [`terminate()`](#terminate) call.

##### Parameters

```
Object poolAttrs
```

The `poolAttrs` parameter provides connection credentials and
pool-specific configuration properties, such as the maximum or minimum
number of connections for the pool, or `stmtCacheSize` for the connections.
The properties provided in the `poolAttrs` parameter override the default
pooling properties in effect in the *Oracledb* object.

Note that the `poolAttrs` parameter may have configuration
properties that are not used by the `createPool()` method.  These are
ignored.

The properties of `poolAttrs` are described below.

```
String user
```

The database user name.  Can be a simple user name or a proxy of the form *alison[fred]*. See the
[Client Access Through Proxy](https://docs.oracle.com/cd/B19306_01/appdev.102/b14250/oci02bas.htm#LNOCI13341)
section in the OCI manual for more details about proxy
authentication.

```
String password
```

The password of the database user. A password is also necessary if a
proxy user is specified.

```
String connectString
```

The Oracle database instance to connect to.  The string can be an Easy
Connect string, or a Net Service Name from a `tnsnames.ora` file, or the
name of a local Oracle database instance.  See
[Connection Strings](#connectionstrings) for examples.

```
Boolean externalAuth
```

Indicate whether to connections should be established using
[External Authentication](#extauth).

This optional property overrides the *Oracledb*
[`externalAuth`](#propdbisexternalauth) property.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

```
Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

This optional property overrides the *Oracledb*
[`stmtCacheSize`](#propdbstmtcachesize) property.

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

This optional property overrides the *Oracledb*
[`poolMax`](#propdbpoolmax) property.

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

This optional property overrides the *Oracledb*
[`poolMin`](#propdbpoolmin) property.

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

This optional property overrides the *Oracledb*
[`poolIncrement`](#propdbpoolincrement) property.

```
Number poolTimeout
```

The number of seconds after which idle connections (unused in the
pool) may be terminated.  Idle connections are terminated only when
the pool is accessed.  If `poolTimeout` is set to 0, then idle
connections are never terminated.

This optional property overrides the *Oracledb*
[`poolTimeout`](#propdbpooltimeout) property.

```
Boolean queueRequests
```

Indicate whether [`pool.getConnection()`](#getconnectionpool) calls
should be queued when all available connections are in currently use.

This optional property overrides the *Oracledb*
[`queueRequests`](#propdbqueuerequests) property.

```
Number queueTimeout
```

The number of milliseconds after which connection requests waiting in the
connection request queue are terminated.  If `queueTimeout` is
set to 0, then queued connection requests are never terminated.

This optional property overrides the *Oracledb*
[`queueTimeout`](#propdbqueuetimeout) property.

```
function(Error error, Pool pool)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createPool()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Pool pool*   | The newly created connection pool. If `createPool()` fails, `pool` will be NULL.  See [Pool class](#poolclass) for more information.

#### <a name="getconnectiondb"></a> 3.3.2 getConnection()

##### Prototype

```
void getConnection(Object connAttrs, function(Error error, Connection conn){});
```

##### Return Value

None

##### Description

Obtains a connection directly from an *Oracledb* object.

These connections are not pooled.  For situations where connections
are used infrequently, this call may be more efficient than creating
and managing a connection pool.  However, in most cases, Oracle
recommends getting new connections from a
[connection pool](#createpool).

This is an asynchronous call.

See [Connection Handling](#connectionhandling) for more information on
connections.

##### Parameters

```
Object connAttrs
```

The `connAttrs` parameter provides connection credentials and
connection-specific configuration properties, such as `stmtCacheSize`.

Note that the `connAttrs` object may have configuration
properties that are not used by the `getConnection()` method.  These
are ignored.

The properties of the `connAttrs` object are described below.

```
String user
```

The database user name.  Can be a simple user name or a proxy of the form *alison[fred]*. See the
[Client Access Through Proxy](https://docs.oracle.com/cd/B19306_01/appdev.102/b14250/oci02bas.htm#LNOCI13341)
section in the OCI manual for more details about proxy
authentication.

```
String password
```

The password of the database user. A password is also necessary if a
proxy user is specified.

```
String connectString
```

The Oracle database instance to connect to.  The string can be an Easy Connect string, or a
Net Service Name from a `tnsnames.ora` file, or the name of a local
Oracle database instance.  See
[Connection Strings](#connectionstrings) for examples.

```
Boolean externalAuth
```

If this optional property is *true* then the connection will be
established using [External Authentication](#extauth).

This optional property overrides the *Oracledb*
[`externalAuth`](#propdbisexternalauth) property.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

```
Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.  This optional
property may be used to override the
[stmtCacheSize](#propdbstmtcachesize) property of the *Oracledb*
object.

```
function(Error error, Connection conn)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.  If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

## <a name="connectionclass"></a> 4. Connection Class

A *Connection* object is obtained by a *Pool* class
[`getConnection()`](#getconnectionpool) or
*Oracledb* class [`getConnection()`](#getconnectiondb)
call.

The connection is used to access an Oracle database.

### <a name="connectionproperties"></a> 4.1 Connection Properties

The properties of a *Connection* object are listed below.

#### <a name="propconnaction"></a> 4.1.1 action

```
writeonly String action
```

The [action](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1434)
attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnclientid"></a> 4.1.2 clientId

```
writeonly String clientId
```

The [client
identifier](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1414)
for end-to-end application tracing, use with mid-tier authentication,
and with [Virtual Private Databases](http://docs.oracle.com/database/121/CNCPT/cmntopc.htm#CNCPT62345).

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnmodule"></a> 4.1.3 module

```
writeonly String module
```

The [module](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1433)
attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnoracleserverversion"></a> 4.1.4 oracleServerVersion

```
readonly Number oracleServerVersion
```

This readonly property gives a numeric representation of the Oracle database version.
For version *a.b.c.d.e*, this property gives the number: `(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e`

#### <a name="propconnstmtcachesize"></a> 4.1.5 stmtCacheSize

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of the connection.  The default value is
the `stmtCacheSize` property in effect in the *Pool* object when the
connection is created in the pool.

### <a name="connectionmethods"></a> 4.2 Connection Methods

#### <a name="break"></a> 4.2.1 break()

##### Prototype

```
void break(function(Error error){});
```

##### Return Value

None

##### Description

This call stops the currently running operation on the connection.

If there is no operation in progress or the operation has completed by
the time the break is issued, the `break()` is effectively a no-op.

If the running asynchronous operation is interrupted, its callback
will return an error.

This is an asynchronous call.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `break()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="commit"></a> 4.2.2 commit()

##### Prototype

```
void commit(function(Error error){});
```

##### Return Value

None

##### Description

This call commits the current transaction in progress on the connection.

This is an asynchronous call.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `commit()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="execute"></a> 4.2.3 execute()

##### Prototype

```
void execute(String sql, [Object bindParams, [Object options,]] function(Error error, [Object result]){});
```

##### Return Value

None

##### Description

This call executes a SQL or PL/SQL statement.  See [SQL Execution](#sqlexecution) for examples.

This is an asynchronous call.

The statement to be executed may contain [IN binds](#inbind),
[OUT or IN OUT](#outbind) bind values or variables, which are bound
using either an object or an array.

A callback function returns a `result` object, containing any fetched
rows, the values of any OUT and IN OUT bind variables, and the number
of rows affected by the execution of
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements.

##### Parameters


Parameter | Description
----------|------------
`String sql` | The SQL string that is executed. The SQL string may contain bind parameters.
`Object bindParams` | This function parameter is needed if there are bind parameters in the SQL statement.
`Object options` | This is an optional parameter to `execute()` that may be used to control statement execution.
`function(Error error, [Object result])` | Callback function with the execution results.

The parameters are discussed in the next sections.

##### <a name="executesqlparam"></a> 4.2.3.1 `execute()`: SQL Statement

```
String sql
```

The SQL or PL/SQL statement that `execute()` executes. The statement
may contain bind variables.

##### <a name="executebindParams"></a> 4.2.3.2 `execute()`: Bind Parameters
```
Object bindParams
```

This `execute()` function parameter is needed if there are bind
variables in the statement, or if [`options`](#executeoptions) are
used.  It can be either an object that associates values or JavaScript
variables to the statement's bind variables by name, or an array of
values or JavaScript variables that associate to the statement's bind
variables by their relative positions.  See
[Bind Parameters for Prepared Statements](#bind) for more details on
binding.

If a bind value is an object it may have the following properties:

Bind Property | Description
---------------|------------
`dir` | The direction of the bind.  One of the [Oracledb Constants](#oracledbconstants) `BIND_IN`, `BIND_INOUT`, or `BIND_OUT`.
`maxArraySize` | The number of array elements to be allocated for a PL/SQL Collection `INDEX OF` associative array OUT or IN OUT array bind variable.
`maxSize` | The maximum number of bytes that an OUT or IN OUT bind variable of type STRING or BUFFER can use. The default value is 200. The maximum limit is 32767.
`type` | The datatype to be bound. One of the [Oracledb Constants](#oracledbconstants) `STRING`, `NUMBER`, `DATE`, `CURSOR` or `BUFFER`.
`val` | The input value or variable to be used for an IN or IN OUT bind variable.

The maximum size of a `BUFFER` type is 2000 bytes, unless you are
using Oracle Database 12c and the database initialization parameter
`MAX_STRING_SIZE` has a value of `EXTENDED`.  In this case the maximum
size of a `BUFFER` is 32767.

With OUT binds, where the type cannot be inferred by node-oracledb
because there is no input data value, the type defaults to `STRING`
whenever `type` is not specified.

Note `CURSOR` bind variables can only be used for PL/SQL OUT binds.

See [Bind Parameters for Prepared Statements](#bind) for usage and examples.

##### <a name="executeoptions"></a> 4.2.3.3 `execute()`: Options
```
Object options
```

This is an optional parameter to `execute()` that may be used to
control statement execution.

If there are no bind variables in the SQL statement, then a null
`bindParams`, for example *{}*, must be specified before `options`
otherwise you will get an error like *ORA-01036: Illegal variable
name/number* or *NJS-012: encountered invalid bind datatype*.

The following properties can be set or overridden for the execution of
a statement:

Options Property | Description
----------------|-------------
*Boolean autoCommit* | Overrides *Oracledb* [`autoCommit`](#propdbisautocommit)
*Object fetchInfo* | Object defining how query column data should be represented in JavaScript. See [below](#propfetchinfo).
*Number maxRows* | Overrides *Oracledb* [`maxRows`](#propdbmaxrows)
*String outFormat* | Overrides *Oracledb* [`outFormat`](#propdboutformat)
*Number prefetchRows* | Overrides *Oracledb* [`prefetchRows`](#propdbprefetchrows)
*Boolean resultSet* | Determines whether query results should be returned as a [`ResultSet`](#resultsetclass) object or directly.  The default is `false`.

<a name="propfetchinfo"></a> The description of `fetchInfo` follows:

```
Object fetchInfo
```

The `fetchInfo` property can be used to indicate that number or date
columns in a query should be returned as strings instead of their
native format.  The property can be used in conjunction with, or
instead of, the global setting [`fetchAsString`](#propdbfetchasstring).

For example:

```
fetchInfo:
{
  "HIRE_DATE":      { type : oracledb.STRING },  // return the date as a string
  "COMMISSION_PCT": { type : oracledb.DEFAULT }  // override Oracledb.fetchAsString
}
```

Each column is specified by name, using Oracle's standard naming
convention.

The valid values for `type` are [`STRING`](#oracledbconstants) and
[`DEFAULT`](#oracledbconstants).  The former indicates that the given
column should be returned as a string.  The latter can be used to
override any global mapping given by
[`fetchAsString`](#propdbfetchasstring) and allow the column data for
this query to be returned in native format.

The maximum length of a string created by type mapping is 200 bytes.
However, if a database column that is already of type STRING is
specified in `fetchInfo`, then the actual database metadata will be
used to determine the maximum length.

Columns fetched from REF CURSORS are not mapped by `fetchInfo`
settings in the `execute()` call.  Use the global
[`fetchAsString`](#propdbfetchasstring) instead.

See [Result Type Mapping](#typemap) for more information on query type
mapping.

##### <a name="executecallback"></a> 4.2.3.4 `execute()`: Callback Function
```
function(Error error, [Object result])
```

The parameters of the `execute()` callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `execute()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Object result* | The [`result`](#resultobject) object, described below. For DDL statements and DML where the application only checks `error` for success or failure, the `result` parameter can be omitted.


<a name="resultobject"></a>
##### Result Object Properties

The properties of `result` object from the `execute()` callback are described below.

```
Array metaData
```

For `SELECT` statements, this contains an array of column names for
the select list.  For non queries, this property is undefined.  The
column names follow Oracle's standard name-casing rules.  They will
commonly be uppercase, since most applications create tables using
unquoted, case-insensitive names.

```
Array/object outBinds
```

This is either an array or an object containing OUT and IN OUT bind
values. If [`bindParams`](#executebindParams) is passed as an array,
then `outBinds` is returned as an array. If `bindParams` is passed as
an object, then `outBinds` is returned as an object.

```
Object resultSet
```

For `SELECT` statements when the [`resultSet`](#executeoptions)
option is `true`, use the `resultSet` object to fetch rows.  See
[ResultSet Class](#resultsetclass).

```
Array rows
```

For `SELECT` statements where the [`resultSet`](#executeoptions) option is
`false` or unspecified, `rows` contains an array of fetched rows.  It
will be NULL if there is an error or the SQL statement was not a
SELECT statement.  By default, the rows are in an array of column
value arrays, but this can be changed to arrays of objects by setting
[`outFormat`](#propdboutformat) to `OBJECT`.  If a single row is
fetched, then `rows` is an array that contains one single row.  The
number of rows returned is limited to the `maxRows` configuration
property of the *Oracledb* object, although this may be overridden in
any `execute()` call.

```
Number rowsAffected
```

For
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements (including SELECT FOR UPDATE) this contains the number of
rows affected, for example the number of rows inserted. For non-DML
statements such as queries, or if no rows are affected, then
`rowsAffected` will be zero.

#### <a name="release"></a> 4.2.4 release()

##### Prototype

```
void release(function(Error error){});
```

##### Return Value

None

##### Description

Releases a connection.  If the connection was obtained from the pool,
the connection is returned to the pool.

Note: calling `release()` when connections are no longer required is
strongly encouraged.  Releasing helps avoid resource leakage and can
improve system efficiency.

When a connection is released, any ongoing transaction on the
connection is rolled back.

After releasing a connection to a pool, there is no
guarantee a subsequent `getConnection()` call gets back the same
database connection.  The application must redo any ALTER SESSION
statements on the new connection object, as required.

This is an asynchronous call.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `release()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="rollback"></a> 4.2.5 rollback()

##### Prototype

```
void rollback(function(Error error){});
```

##### Return Value

None

##### Description

This call rolls back the current transaction in progress on the
connection.

This is an asynchronous call.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `rollback()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="lobclass"></a> 5. Lob Class

Lob objects can be used to access Oracle Database CLOB and BLOB data.

A Lob object implements the
[Node Stream](https://nodejs.org/api/stream.html) interface.

See [Working with CLOB and BLOB Data](#lobhandling) for more information.

### <a name="lobproperties"></a> 5.1 Lob Properties

The properties of a Lob object are listed below.

#### <a name="proplobchunksize"></a> 5.1.1 chunkSize

```
readonly Number chunkSize
```

This corresponds to the size used by the Oracle LOB layer when
accessing or modifying the LOB value.

#### <a name="proploblength"></a> 5.1.2 length

```
readonly Number length
```

Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs).

#### <a name="proplobpiecesize"></a> 5.1.3 pieceSize

```
Number pieceSize
```

The number of bytes (for BLOBs) or characters (for CLOBs) to read for
each Stream 'data' event of a queried LOB.

The default value is [`chunkSize`](#proplobchunksize).

For efficiency, it is recommended that `pieceSize` be a multiple of
`chunkSize`.

The maximum value for `pieceSize` is limited to the value of UINT_MAX.

#### <a name="proplobtype"></a> 5.1.4 type

```
readonly Number type
```

This read-only attribute shows the type of Lob being used.  It will
have the value of one of the constants
[`Oracledb.BLOB`](#oracledbconstants) or
[`Oracledb.CLOB`](#oracledbconstants).  The value is derived from the
bind type when using LOB bind variables, or from the column type when
a LOB is returned by a query.

## <a name="poolclass"></a> 6. Pool Class

A connection *Pool* object is created by calling the
[`createPool()`](#createpool) method of the *Oracledb* object.

The *Pool* object obtains connections to the Oracle database using the
`getConnection()` method to "check them out" from the pool. Internally
[OCI Session Pooling](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
is used.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the `terminate()` function on the Pool object.

See [Connection Pooling](#connpooling) for more information.

### <a name="poolproperties"></a> 6.1 Pool Properties

The *Pool* object properties may be read to determine the current
values.

#### <a name="proppoolconnectionsinuse"></a> 6.1.1 connectionsInUse

```
readonly Number connectionsInUse
```

The number of currently active connections in the connection pool
i.e.  the number of connections currently checked-out using
`getConnection()`.

#### <a name="proppoolconnectionsopen"></a> 6.1.2 connectionsOpen

```
readonly Number connectionsOpen
```

The number of currently open connections in the underlying connection
pool.

#### <a name="proppoolpoolincrement"></a> 6.1.3 poolIncrement

```
readonly Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

#### <a name="proppoolpoolmax"></a> 6.1.4 poolMax

```
readonly Number poolMax
```

The maximum number of connections that can be open in the connection
pool.

#### <a name="proppoolpoolmin"></a> 6.1.5 poolMin

```
readonly Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

#### <a name="proppoolpooltimeout"></a> 6.1.6 poolTimeout

```
readonly Number poolTimeout
```

The time (in seconds) after which the pool terminates idle connections
(unused in the pool). The number of connections does not drop below
poolMin.

#### <a name="proppoolqueuerequests"></a> 6.1.7 queueRequests

```
readonly Boolean queueRequests
```

Determines whether requests for connections from the pool are queued
when the number of connections "checked out" from the pool has reached
the maximum number specified by [`poolMax`](#propdbpoolmax).

#### <a name="proppoolqueueTimeout"></a> 6.1.8 queueTimeout

```
readonly Number queueTimeout
```

The time (in milliseconds) that a connection request should wait in
the queue before the request is terminated.

#### <a name="proppoolstmtcachesize"></a> 6.1.9 stmtCacheSize

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

### <a name="poolmethods"></a> 6.2 Pool Methods

#### <a name="getconnectionpool"></a> 6.2.1 getConnection()

##### Prototype

```
void getConnection(function(Error error, Connection conn){});
```

##### Return Value

None

##### Description

This method obtains a connection from the connection pool.

If a previously opened connection is available in the pool, that
connection is returned. If all connections in the pool are in use, a
new connection is created and returned to the caller, as long as the
number of connections does not exceed the specified maximum for the
pool. If the pool is at its maximum limit, the `getConnection()` call
results in an error, such as *ORA-24418: Cannot open further sessions*.

This is an asynchronous call.

See [Connection Handling](#connectionhandling) for more information on
connections.

##### Parameters

```
function(Error error, Connection conn)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.   If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

#### <a name="terminate"></a> 6.2.2 terminate()

##### Prototype

```
void terminate(function(Error error){});
```

##### Return Value

None

##### Description

This call terminates the connection pool.

Any open connections should be released with [`release()`](#release)
before `terminate()` is called.

This is an asynchronous call.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `terminate()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="resultsetclass"></a> 7. ResultSet Class

Result sets allow query results to fetched from the database one at a
time, or in groups of rows.  This enables applications to process very
large data sets.

Result sets should also be used where the number of query rows cannot
be predicted and may be larger than a sensible
[`maxRows`](#propdbmaxrows) size.

A *ResultSet* object is obtained by setting `resultSet: true` in the
`options` parameter of the *Connection* [`execute()`](#execute) method
when executing a query.  A *ResultSet* is also returned to
node-oracledb when binding as type [`CURSOR`](#oracledbconstants) to a
PL/SQL REF CURSOR bind parameter.

The value of [`prefetchRows`](#propdbprefetchrows) can be adjusted to
tune the performance of result sets.

See [ResultSet Handling](#resultsethandling) for more information on result sets.

### <a name="resultsetproperties"></a> 7.1 ResultSet Properties

The properties of a *ResultSet* object are listed below.

#### <a name="rsmetadata"></a> 7.1.1 metaData

```
Array metaData
```

Contains an array of column names for the select list of the query or
REF CURSOR.  The column names follow Oracle's standard name-casing
rules.  They will commonly be uppercase, since most applications
create tables using unquoted, case-insensitive names.

### <a name="resultsetmethods"></a> 7.2 ResultSet Methods

#### <a name="close"></a> 7.2.1 close()

##### Prototype

```
void close(function(Error error){});
```

##### Return Value

None

##### Description

Closes a `ResultSet`.  Applications should always call this at the end
of fetch or when no more rows are needed.

#### <a name="getrow"></a> 7.2.2 getRow()

##### Prototype

```
void getRow(function(Error error, Object row){});
```

##### Return Value

None

##### Description

This call fetches one row of the result set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `ResultSet` should be freed by calling [`close()`](#close).

#### <a name="getrows"></a> 7.2.3 getRows()

##### Prototype

```
void getRows(Number numRows, function(Error error, Array rows){});
```

##### Return Value

None

##### Description

This call fetches `numRows` rows of the result set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `ResultSet` should be freed by calling [`close()`](#close).

## <a name="connectionhandling"></a> 8. Connection Handling

In applications which use connections infrequently, create a connection
with *Oracledb* [`getConnection()`](#getconnectiondb):

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

    . . . // use connection

  });
```

Connections should be released with [`release()`](#release) when no
longer needed:

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

    . . .  // use connection

    connection.release(
      function(err)
      {
        if (err) { console.error(err.message); }
      });
  });
```

Applications which are heavy users of connections should create and
use a [Connection Pool]("#connpooling).

### <a name="connectionstrings"></a> 8.1 Connection Strings

The *Oracledb* [`getConnection()`](#getconnectiondb) and *Pool*
[`getConnection()`](#getconnectionpool) `connectString` can be an Easy
Connect string, or a Net Service Name from a local `tnsnames.ora` file
or external naming service, or it can be the SID of a local Oracle
database instance.

If `connectString` is not specified, the empty string "" is used which
indicates to connect to the local, default database.

#### <a name="easyconnect"></a> 8.1.1 Easy Connect Syntax for Connection Strings

An Easy Connect string is often the simplest to use.  With Oracle Database 12c
the syntax is:
*[//]host_name[:port][/service_name][:server_type][/instance_name]*

For example, use *"localhost/XE"* to connect to the database *XE* on the local machine:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  },
  . . .
```

For more information see
[Understanding the Easy Connect Naming Method](https://docs.oracle.com/database/121/NETAG/naming.htm#i498306)
in the Oracle documentation..

#### <a name="tnsnames"></a> 8.1.2 Net Service Names for Connection Strings

A Net Service Name, such as `sales` in the example below, can be used
to connect:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "sales"
  },
  . . .
```

This could be defined in a directory server, or in a local
`tnsnames.ora` file, for example:

```
sales =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orcl)
    )
  )
```

The `tnsnames.ora` file can be in a default location such as
`$ORACLE_HOME/network/admin/tnsnames.ora` or
`/etc/tnsnames.ora`. Alternatively set the `TNS_ADMIN` environment
variable and put the file in `$TNS_ADMIN/tnsnames.ora`.

For more information see
[General Syntax of tnsnames.ora](https://docs.oracle.com/database/121/NETRF/tnsnames.htm#NETRF260)
in the Oracle documentation.

#### <a name="notjdbc"></a> 8.1.3 JDBC and Node-oracledb Connection Strings Compared

Developers familiar with Java connection strings that reference a
service name like:

```
jdbc:oracle:thin:@hostname:port/service_name
```

can use Oracle's Easy Connect syntax in node-oracledb:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "hostname:port/service_name"
  },
  . . .
```

Alternatively, if a JDBC connection string uses an old-style
[SID](http://docs.oracle.com/database/121/NETRF/glossary.htm#NETRF1681),
and there is no service name available:

```
jdbc:oracle:thin:@hostname:port:sid
```

then consider creating a `tnsnames.ora` entry, for example:

```
finance =
 (DESCRIPTION =
   (ADDRESS = (PROTOCOL = TCP)(HOST = hostname)(PORT = 1521))
   (CONNECT_DATA =
     (SID = ORCL)
   )
 )
```

This can be referenced in node-oracledb:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "finance"
  },
  . . .
```

### <a name="connpooling"></a> 8.2 Connection Pooling

When applications use a lot of connections for short periods, Oracle
recommends using a connection pool for efficiency.  Each node-oracledb
process can use one or more local pools of connections.

A connection *Pool* object is created by calling the
[`createPool()`](#createpool) function of the *Oracledb*
object. Internally
[OCI Session Pooling](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
is used.

A connection is returned with the *Pool*
[`getConnection()`](#getconnectionpool) function:

```javascript
var oracledb = require('oracledb');

oracledb.createPool (
  {
    user          : "hr"
    password      : "welcome"
    connectString : "localhost/XE"
  },
  function(err, pool)
  {
    pool.getConnection (
      function(err, connection)
      {
      . . .  // use connection
      });
  });
```

Connections should be released with [`release()`](#release) when no
longer needed:

```javascript
    connection.release(
      function(err)
      {
        if (err) { console.error(err.message); }
      });
```

After an application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the [`terminate()`](#terminate) method on the Pool object.

The growth characteristics of a connection pool are determined by the
Pool attributes [`poolIncrement`](#proppoolpoolincrement),
[`poolMax`](#proppoolpoolmax), [`poolMin`](#proppoolpoolmin) and
[`poolTimeout`](#proppoolpooltimeout).  Note that when External
Authentication is used, the pool behavior is different, see
[External Authentication](#extauth).

The Pool attribute [`stmtCacheSize`](#propconnstmtcachesize) can be
used to set the statement cache size used by connections in the pool,
see [Statement Caching](#stmtcache).

#### <a name="connpoolmonitor"></a> 8.2.1 Connection Pool Monitoring and Throughput

Connection pool usage can be monitored to choose the appropriate
connection pool settings for your workload.

The Pool attributes [`connectionsInUse`](#proppoolconnectionsinuse)
and [`connectionsOpen`](#proppoolconnectionsopen) provide basic
information about an active pool.

When using a [pool queue](#propdbqueuerequests), further statistics
can be enabled by setting the [`createPool()`](#createpool)
`poolAttrs` parameter `_enableStats` to *true*.  Statistics
can be output to the console by calling the *Pool* `_logStats()`
method.  The underscore prefixes indicate that these are private
attributes and methods.  As such, this functionality may be altered or
enhanced in the future.

Queue statistics include the number of `getConnection()` requests that
were queued waiting for an available connection.  The sum and average
time spent in the queue are also recorded.  If the pool queue is
heavily used, consider increasing the connection pool
[`poolMax`](#proppoolpoolmax) value.

To enable recording of queue statistics:

```javascript
oracledb.createPool (
  {
    queueRequests : true,  // default is true
    _enableStats  : true,   // default is false
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  },
  function(err, pool)
  {
  . . .
```

The application can later, on some developer-chosen event, display the
current statistics to the console by calling:

```javascript
pool._logStats();
```

##### Number of Threads

Node worker threads executing database statements on a connection will
commonly wait until round-trips between node-oracledb and the database
are complete.  When an application handles a sustained number of user
requests, and database operations take some time to execute or the
network is slow, then the four default threads may all be in use.
This prevents Node from handling more user load.  Increasing the
number of worker threads may improve throughput.  Do this by setting
the environment variable
[UV_THREADPOOL_SIZE](http://docs.libuv.org/en/v1.x/threadpool.html)
before starting Node.

For example, in a Linux terminal, the number of Node worker threads
can be increased to 10 by using the following command:

```
$ UV_THREADPOOL_SIZE=10 node myapp.js
```

### <a name="drcp"></a> 8.3 Database Resident Connection Pooling (DRCP)

[Database Resident Connection Pooling](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS228) (DRCP)
enables database resource sharing for applications that run in
multiple client processes or run on multiple middle-tier application
servers.  DRCP reduces the overall number of connections that a
database must handle.

DRCP is distinct from node-oracledb's local
[connection pool](#poolclass).  The two pools can be used separately,
or together.

DRCP is useful for applications which share the same database credentials, have
similar session settings (for example date format settings and PL/SQL
package state), and where the application gets a database connection,
works on it for a relatively short duration, and then releases it.

To use DRCP in node-oracledb:

1. The DRCP pool must be started in the database: `execute dbms_connection_pool.start_pool();`
2. The `getConnection()` property `connectString` must specify to use a pooled server, either by the Easy Connect syntax like `myhost/sales:POOLED`, or by using a `tnsnames.ora` alias for a connection that contains `(SERVER=POOLED)`.
3. The [`connectionClass`](#propdbconclass) should be set by the node-oracledb application.  If it is not set, the pooled server session memory will not be reused optimally.

The DRCP 'Purity' value is NEW for
[`oracledb.getConnection()`](#getconnectiondb) connections that do not
use a local connection pool.  These connections reuse a DRCP pooled
server process (thus avoiding the costs of process creation and
destruction) but do not reuse its session memory.  The 'Purity' is
SELF for [`pool.getConnection()`](#getconnectionpool) connections,
allowing reuse of the pooled server process and session memory, giving
maximum benefit from DRCP.  See the Oracle documentation on
[benefiting from scalability](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS506).

The
[Oracle DRCP documentation](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS228)
has more details, including when to use, and when not to use DRCP.

There are a number of Oracle Database `V$` views that can be used to
monitor DRCP.  These are discussed in the Oracle documentation and in the
Oracle white paper
[PHP Scalability and High Availability](http://www.oracle.com/technetwork/topics/php/php-scalability-ha-twp-128842.pdf).
This paper also gives more detail on configuring DRCP.

### <a name="extauth"></a> 8.4 External Authentication

External Authentication allows applications to use an external
password store (such as
[Oracle Wallet](http://docs.oracle.com/database/121/DBIMI/to_dbimi10236_d209.htm#DBIMI10236)),
the
[Secure Socket Layer](http://docs.oracle.com/database/121/DBSEG/asossl.htm#DBSEG070)
(SSL), or the
[operating system](http://docs.oracle.com/database/121/DBSEG/authentication.htm#DBSEG30035)
to validate user access.  One of the benefits is that database
credentials do not need to be hard coded in the application.

To use external authentication, set the *Oracledb*
[`externalAuth`](#propdbisexternalauth) property to *true*.  This property can
also be set in the `connAttrs` or `poolAttrs` parameters of the
*Oracledb* [`getConnection()`](#getconnectiondb) or
[`createPool()`](#createpool) calls, respectively.  The `user` and
`password` properties should not be set, or should be empty strings:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    externalAuth: true,
    connectString: "localhost/orcl"
  },
  . . .
```

When `externalAuth` is set, any subsequent connections obtained using
the *Oracledb* [`getConnection()`](#getconnectiondb) or *Pool*
[`getConnection()`](#getconnectionpool) calls will use external
authentication.  Setting this property does not affect the operation
of existing connections or pools.

Using `externalAuth` in the `connAttrs` parameter of a *Pool*
`getConnection()` call is not possible.  The connections from a *Pool*
object are always obtained in the manner in which the pool was
initially created.

For pools created with external authentication, the number of
connections initially created is zero even if a larger value is
specified for [`poolMin`](#propdbpoolmin).  The pool increment is
always 1, regardless of the value of
[`poolIncrement`](#proppoolpoolincrement).  Once the number
of open connections exceeds `poolMin` and connections are idle for
more than the [`poolTimeout`](#propdbpooltimeout) seconds, then the
number of open connections does not fall below `poolMin`.

## <a name="sqlexecution"></a> 9. SQL Execution

A SQL or PL/SQL statement may be executed using the *Connection*
[`execute()`](#execute) method.

After all database calls on the connection complete, the application
should use the [`release()`](#release) call to release the connection.

### <a name="select"></a> 9.1 SELECT Statements

#### <a name="fetchingrows"></a> 9.1.1 Fetching Rows

By default, query results are returned all at once in the `rows`
property of `result` parameter to the *Connection*
[`execute()`](#execute) callback.  The number of rows returned is
restricted to [`maxRows`](#propdbmaxrows):

```javascript
    connection.execute(
      "SELECT department_id, department_name "
    + "FROM departments "
    + "WHERE department_id = :did",
      [180],
      { maxRows: 10 },  // a maximum of 10 rows will be returned.  Default limit is 100
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        console.log(result.rows);  // print all returned rows
      });
```

#### <a name="resultsethandling"></a> 9.1.2 Result Set Handling

When the number of query rows is relatively big, or can't be
predicted, it is recommended to use a [`ResultSet`](#resultsetclass).
This prevents query results being unexpectedly truncated by the
[`maxRows`](#propdbmaxrows) limit and removes the need to oversize
`maxRows` to avoid such truncation.  Otherwise, for queries that
return a known small number of rows, non-result set queries may have
less overhead.

A result set is created when the `execute()` option property
[`resultSet`](#executeoptions) is `true`.  Result set rows can be
fetched using [`getRow()`](#getrow) or [`getRows()`](#getrows) on the
`execute()` callback function's `result.resultSet` parameter property.

For result sets the [`maxRows`](#propdbmaxrows) limit is ignored.  All
rows can be fetched.

When all rows have been fetched, or the application does not want to
continue getting more rows, then the result set should be freed using
[`close()`](#close).

REF CURSORS returned from a PL/SQL block via an `oracledb.CURSOR` OUT bind
are also available as a `ResultSet`.

The format of each row will be an array or object, depending on the
value of [outFormat](#propdboutformat).

See [resultset1.js](https://github.com/oracle/node-oracledb/tree/master/examples/resultset1.js),
[resultset2.js](https://github.com/oracle/node-oracledb/tree/master/examples/resultset2.js)
and [refcursor.js](https://github.com/oracle/node-oracledb/tree/master/examples/refcursor.js)
for full examples.

To fetch one row at a time use `getRow()` :

```javascript
connection.execute(
  "SELECT employee_id, last_name FROM employees ORDER BY employee_id",
  [], // no bind variables
  { resultSet: true }, // return a result set.  Default is false
  function(err, result)
  {
    if (err) { . . . }
    fetchOneRowFromRS(connection, result.resultSet);
  });
});

. . .

function fetchOneRowFromRS(connection, resultSet)
{
  resultSet.getRow( // get one row
    function (err, row)
    {
      if (err) {
         . . .           // close the result set and release the connection
      } else if (!row) { // no rows, or no more rows
        . . .            // close the result set and release the connection
      } else {
        console.log(row);
        fetchOneRowFromRS(connection, resultSet);  // get next row
      }
    });
}
```

It is generally more efficient to fetch multiple rows at a time using `getRows()`:

```javascript
var numRows = 10;  // number of rows to return from each call to getRows()

connection.execute(
  "SELECT employee_id, last_name FROM employees ORDER BY employee_id",
  [], // no bind variables
  { resultSet: true }, // return a result set.  Default is false
  function(err, result)
  {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.resultSet, numRows);
  });
});

. . .

function fetchRowsFromRS(connection, resultSet, numRows)
{
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows)
    {
      if (err) {
         . . .                        // close the result set and release the connection
      } else if (rows.length == 0) {  // no rows, or no more rows
        . . .                         // close the result set and release the connection
      } else if (rows.length > 0) {
        console.log(rows);
        fetchRowsFromRS(connection, resultSet, numRows);  // get next set of rows
      }
    });
}
```

#### <a name="queryoutputformats"></a> 9.1.3 Query Output Formats

Query rows may be returned as an array of column values, or as
Javascript objects, depending on the values of
[outFormat](#propdboutformat).

The default format for each row is an array of column values.
For example:

```javascript
var oracledb = require('oracledb');
. . .

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
```

If run with Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

Using this format is recommended for efficiency.

Alternatively, rows may be fetched as JavaScript objects. To do so,
specify the `outFormat` option to be `OBJECT`:

```javascript
oracledb.outFormat = oracledb.OBJECT;
```

The value can also be set as an `execute()` option:

```javascript
connection.execute(
  "SELECT department_id, department_name " +
    "FROM departments " +
    "WHERE manager_id < :id",
  [110],  // bind value for :id
  { outFormat: oracledb.OBJECT },
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.rows);
  });
```

The output is:

```
[ { DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT' },
  { DEPARTMENT_ID: 90, DEPARTMENT_NAME: 'Executive' },
  { DEPARTMENT_ID: 100, DEPARTMENT_NAME: 'Finance' } ]
```

In the preceding example, each row is a JavaScript object that
specifies column names and their respective values.  Note the property
names follow Oracle's standard name-casing rules.  They will commonly
be uppercase, since most applications create tables using unquoted,
case-insensitive names.

#### <a name="querymeta"></a> 9.1.4 Query Column Metadata

The column names of a query are returned in the
[`execute()`](#execute) callback's `result.metaData` parameter
attribute:

```javascript
connection.execute(
  "SELECT department_id, department_name " +
    "FROM departments " +
    "WHERE manager_id < :id",
  [110],  // bind value for :id
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.metaData);  // show the metadata
  });
```

When using a [`ResultSet`](#resultsetclass), metadata is also
available in `result.resultSet.metaData`.

The metadata is an array of objects, one per column.  Each object has
a `name` attribute:

```
[ { name: 'DEPARTMENT_ID' }, { name: 'DEPARTMENT_NAME' } ]
```

The names are in uppercase.  This is the default casing behavior for
Oracle client programs when a database table is created with unquoted,
case-insensitive column names.

#### <a name="typemap"></a> 9.1.5 Result Type Mapping

Oracle character, number and date columns can be selected.  Data types
that are currently unsupported give a "datatype is not supported"
error.

The default query result type mappings for Oracle Database types to JavaScript types are:

-   Variable and fixed length character columns are mapped to JavaScript strings.

-   All numeric columns are mapped to JavaScript numbers.

-   Date and timestamp columns are mapped to JavaScript dates.
    Note that JavaScript Date has millisecond precision.
    Therefore, timestamps having greater
    precision lose their sub-millisecond fractional part
    when fetched. Internally, `TIMESTAMP` and `DATE`
    columns are fetched as `TIMESTAMP WITH LOCAL TIMEZONE` using
    [OCIDateTime](https://docs.oracle.com/database/121/LNOCI/oci12oty.htm#LNOCI16840).
    When binding a JavaScript Date value in an `INSERT` statement, the date is also inserted as `TIMESTAMP WITH
    LOCAL TIMEZONE` using OCIDateTime.

##### Fetching as String

The global [`fetchAsString`](#propdbfetchasstring) property can be
used to force all number or date columns queried by an application to
be fetched as strings instead of in native format.  Allowing data to
be fetched as strings helps avoid situations where using JavaScript
types can lead to numeric precision loss, or where date conversion is
unwanted.

For example, to force all dates and numbers used by queries in an
application to be fetched as strings:

```javascript
var oracledb = require('oracledb');
oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
```

Only number and date columns can be mapped to strings with `fetchAsString`.

The maximum length of a string created can be 200 bytes.

Individual queries can use the [`execute()`](#execute) option
[`fetchInfo`](#propfetchinfo) to map individual number or date columns
to strings without affecting other columns or other queries.  Any
global `fetchAsString` setting can be overridden to allow specific
columns to have data returned in native format:

```javascript
var oracledb = require('oracledb');

oracledb.fetchAsString = [ oracledb.NUMBER ];  // any number queried will be returned as a string

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
      "SELECT last_name, hire_date, salary, commission_pct FROM employees WHERE employee_id = :id",
      [178],
      {
        fetchInfo :
        {
          "HIRE_DATE":      { type : oracledb.STRING },  // return the date as a string
          "COMMISSION_PCT": { type : oracledb.DEFAULT }  // override oracledb.fetchAsString and fetch as native type
        }
      },
      function(err, result)
      {
        if (err) { console.error(err.message); return; }
        console.log(result.rows);
      });
  });
```

The output is:

```
[ [ 'Grant', '24-MAY-07', '7000', 0.15 ] ]
```

The date and salary columns are returned as strings, but the
commission is a number.  The date is mapped using the current session
date format, which was `DD-MON-YY` in this example.  The default date
format can be set, for example, with the environment variable
`NLS_DATE_FORMAT`.  Note this variable will only be read if `NLS_LANG`
is also set.

Without the mapping capabilities provided by `fetchAsString` and
`fetchInfo` the hire date would have been a JavaScript date in the
local time zone, and both numeric columns would have been
represented as numbers:

```
[ [ 'Grant', Thu May 24 2007 00:00:00 GMT+1000 (AEST), 7000, 0.15 ] ]
```


To map columns returned from REF CURSORS, use `fetchAsString`.  The
`fetchInfo` settings do not apply.

##### Mapping Custom Types

Datatypes such as an Oracle Locator `SDO_GEOMETRY`, or your own custom
types, cannot be fetched directly in node-oracledb.  Instead, utilize
techniques such as using an intermediary PL/SQL procedure to map the
type components to scalar values, or use a pipelined table.

For example, consider a `CUSTOMERS` table having a `CUST_GEO_LOCATION`
column of type `SDO_GEOMETRY`, as created in this [example
schema](http://docs.oracle.com/cd/E17781_01/appdev.112/e18750/xe_locator.htm#XELOC560):

```sql
CREATE TABLE customers (
  customer_id NUMBER,
  last_name VARCHAR2(30),
  cust_geo_location SDO_GEOMETRY);

INSERT INTO customers VALUES
  (1001, 'Nichols', SDO_GEOMETRY(2001, 8307, SDO_POINT_TYPE (-71.48923,42.72347,NULL), NULL, NULL));

COMMIT;
```

Instead of attempting to get `CUST_GEO_LOCATION` by directly calling a
PL/SQL procedure that returns an `SDO_GEOMETRY` parameter, you could
instead get the scalar coordinates by using an intermediary PL/SQL
block that decomposes the geometry:

```javascript
    . . .
    var sql =
      "BEGIN " +
      "  SELECT t.x, t.y" +
      "  INTO :x, :y" +
      "  FROM customers, TABLE(sdo_util.getvertices(customers.cust_geo_location)) t" +
      "  WHERE customer_id = :id;" +
      "END; ";
    var bindvars = {
      id: 1001,
      x: { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
      y: { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
    }
    connection.execute(
      sql,
      bindvars,
      function (err, result) {
        if (err) { console.error(err.message); return; }
        console.log(result.outBinds);
      });
```

The output is:

```
{ x: -71.48922999999999, y: 42.72347 }
```

Note the JavaScript precision difference.  In this particular example,
you may want to bind using `type: oracledb.STRING`.  Output would be:

```
{ x: '-71.48923', y: '42.72347' }
```

#### <a name="rowprefetching"></a> 9.1.6 Row Prefetching

[Prefetching](http://docs.oracle.com/database/121/LNOCI/oci04sql.htm#LNOCI16355) is a query tuning feature allowing resource usage to be
optimized.  It allows multiple rows to be returned in each network
trip from Oracle Database to node-oracledb when a
[`ResultSet`](#resultsetclass) is used for query or REF CURSOR data.
The prefetch size does not affect when, or how many, rows are returned
by node-oracledb to the application.  The buffering of rows is handled
by Oracle's underlying client libraries.

By default [`prefetchRows`](#propdbprefetchrows) is 100 for
[`ResultSet`](#resultsetclass) fetches.  The application can choose a
different default prefetch size or change it for each query, as
determined by user benchmarking.

The default prefetch size was heuristically chosen to give decent
performance for developers who don't read documentation.  Skilled
developers should benchmark their applications and adjust the prefetch
value of each query for optimum performance, memory use, and network
utilization.

For queries returning small sets of rows, reduce the default prefetch
to avoid unnecessary memory allocation and initialization.  For
queries that return only a single row the minimum recommended prefetch
value is 2.  This value lets node-oracledb fetch one row and check for
end-of-fetch at the same time.

The value of `prefetchRows` size is ignored when *not* using a
`ResultSet`.

Prefetching from REF CURSORS requires Oracle Database 11gR2 or
greater.

Prefetching can be disabled by setting `prefetchRows` to 0.

The prefetch size can be changed for the whole application:

```javascript
var oracledb = require('oracledb');
oracledb.prefetchRows = 2;
```

Alternatively the prefetch size can be changed for individual queries
in the `execute()` [`options`](#executeoptions) parameter:

```javascript
connection.execute(
  "SELECT last_name FROM employees",
  [],
  {resultSet: true, prefetchRows: 2},
  function(err, result)
  {
     . . .
  });
```

## <a name="plsqlexecution"></a> 10. PL/SQL Execution

PL/SQL stored procedures, functions and anonymous blocks can be called
from node-oracledb.

### <a name="plsqlproc"></a> 10.1 PL/SQL Stored Procedures

The PL/SQL procedure:

```sql
CREATE OR REPLACE PROCEDURE myproc (id IN NUMBER, name OUT STRING) AS
BEGIN
  SELECT last_name INTO name FROM employees WHERE employee_id = id;
END;
```

can be called:

```javascript
. . .
connection.execute(
  "BEGIN myproc(:id, :name); END;",
  {  // bind variables
    id:   159,
    name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
  },
  function (err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ name: 'Smith' }
```

Binding is required for IN OUT and OUT parameters.  It is strongly
recommended for IN parameters.  See
[Bind Parameters for Prepared Statements](#bind).

### <a name="plsqlfunc"></a> 10.2 PL/SQL Stored Functions

The PL/SQL function:

```sql
CREATE OR REPLACE FUNCTION myfunc RETURN VARCHAR2 AS
BEGIN
  RETURN 'Hello';
END;
```

can be called by using an OUT bind variable for the function return value:

```javascript
. . .
connection.execute(
  "BEGIN :ret := myfunc(); END;",
  { ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 } },
  function (err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ ret: 'Hello' }
```

See [Bind Parameters for Prepared Statements](#bind) for information on binding.

### <a name="plsqlanon"></a> 10.3 PL/SQL Anonymous PL/SQL Blocks

Anonymous PL/SQL blocks can be called from node-oracledb like:

```javascript
. . .
connection.execute(
  "BEGIN SELECT last_name INTO :name FROM employees WHERE employee_id = :id; END;",
  {  // bind variables
    id:   134,
    name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
  },
  function (err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ name: 'Rogers' }
```

See [Bind Parameters for Prepared Statements](#bind) for information on binding.

### <a name="dbmsoutput"></a> 10.4 Using DBMS_OUTPUT

The
[DBMS_OUTPUT](http://docs.oracle.com/database/121/ARPLS/d_output.htm#ARPLS036)
package is the standard way to "print" output from PL/SQL.  The way
DBMS_OUTPUT works is like a buffer.  Your Node.js application code
must first turn on DBMS_OUTPUT buffering for the current connection by
calling the PL/SQL procedure `DBMS_OUTPUT.ENABLE(NULL)`.  Then any
PL/SQL executed by the connection can put text into the buffer using
`DBMS_OUTPUT.PUT_LINE()`.  Finally `DBMS_OUTPUT.GET_LINE()` is used to
fetch from that buffer.  Note, any PL/SQL code that uses DBMS_OUTPUT
runs to completion before any output is available to the user.  Also,
other database connections cannot access your buffer.

A basic way to fetch DBMS_OUTPUT with node-oracledb is to bind an
output string when calling the PL/SQL `DBMS_OUTPUT.GET_LINE()`
procedure, print the string, and then repeat until there is no more
data.  The following snippet is based on the example
[dbmsoutputgetline.js](https://github.com/oracle/node-oracledb/tree/master/examples/dbmsoutputgetline.js):

```javascript
function fetchDbmsOutputLine(connection, cb) {
  connection.execute(
    "BEGIN DBMS_OUTPUT.GET_LINE(:ln, :st); END;",
    { ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
      st: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    function(err, result) {
      if (err) {
        return cb(err, connection);
      } else if (result.outBinds.st == 1) { // no more output
        return cb(null, connection);
      } else {
        console.log(result.outBinds.ln);
        return fetchDbmsOutputLine(connection, cb);
      }
    });
  }
```

Another way is to wrap the `DBMS_OUTPUT.GET_LINE()` call into a
pipelined function and fetch the output using a SQL query.  See
[dbmsoutputpipe.js](https://github.com/oracle/node-oracledb/tree/master/examples/dbmsoutputpipe.js) for the full example.

The pipelined function could be created like:

```sql
CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
/

CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
  line VARCHAR2(32767);
  status INTEGER;
  BEGIN LOOP
    DBMS_OUTPUT.GET_LINE(line, status);
    EXIT WHEN status = 1;
    PIPE ROW (line);
  END LOOP;
END;
/
```

To get DBMS_OUTPUT that has been created, simply execute the query
using the same connection:

```sql
connection.execute(
  "SELECT * FROM TABLE(mydofetch())",
  [],
  { resultSet: true },
  function (err, result) {
  . . .
```

The query rows can be handled using a
[ResultSet](http://localhost:8899/doc/api.md#resultsethandling).

Remember to first enable output using `DBMS_OUTPUT.ENABLE(NULL)`.

## <a name="lobhandling"></a> 11. Working with CLOB and BLOB Data

The [Lob Class](#lobclass) in node-oracledb implements the
[Node.js Stream](https://nodejs.org/api/stream.html) interface to provide
read and write access to CLOB and BLOB database columns and PL/SQL
bind parameters.  Note, currently only `BIND_OUT` is supported for LOB bind
parameters.

It is the application's responsibility to make sure the connection is
not released while a Lob operation such as `pipe()` is in progress.

#### Readable Lobs

Being a Stream object, a Lob being read from the database has two
modes of operation: "flowing mode" and "paused mode".  In flowing mode
data is piped to another stream, or events are posted as data is read.
In paused mode the application must explicitly call `read()` to get
data.

The `read(size)` unit is in characters for CLOBs and in bytes for BLOBs.

When reading a LOB from the database, make sure to fetch all data.
Resources are only released at completion of the read or if there is a
LOB error.

A Readable Lob object starts out in paused mode.  If a 'data' event
handler is added, or the Lob is piped to a Writeable stream, then the
Lob switches to flowing mode.

For unpiped Readable Lobs operating in flowing mode where the Lob is
read through event handlers, the Lob object can be switched to paused
mode by calling `pause()`.  Once the Lob is in paused mode, it stops
emitting 'data' events.

Similarly, a Readable Lob operating in the paused mode can be switched
to flowing mode by calling `resume()`.  It will then start emitting
'data' events again.

#### Writeable Lobs

Lobs are written to the database with `pipe()`. Alternatively the
`write()` method can be called successively, with the last piece being
written by the `end()` method.  The `end()` method must be called
because it frees resources.  If the Lob is being piped into, then the
`write()` and `end()` methods are automatically called.

Writeable Lobs also have events, see the
[Node.js Stream](https://nodejs.org/api/stream.html) documentation.

#### Examples

There are runnable LOB examples in the GitHub
[examples](https://github.com/oracle/node-oracledb/tree/master/examples)
directory.

The following code is based on example
[`clobinsert1.js`](https://github.com/oracle/node-oracledb/tree/master/examples/clobinsert1.js).
It shows inserting text into an Oracle Database CLOB column using
flowing mode.  It first inserts an `EMPTY_CLOB()` and uses a
`RETURNING INTO` clause to pass the new LOB locator to node-oracledb,
where it is available as an instance of the [Lob Class](#lobclass).  A
Stream `pipe()` call loads data into the LOB.  The data is committed
when the 'end' event fires, indicating the load has completed.
Autocommit is disabled when getting the locator because a transaction
must be open until the LOB data is inserted.  In this example the
input data stream is simply a file on disk.  Both the Lob stream and
input data stream have 'error' events to handle unexpected issues:

```javascript
var oracledb = require('oracledb');

. . .

connection.execute(
  "INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv",
  { id: 1, lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
  { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
      console.error('Error getting a LOB locator');
      return;
    }

    var lob = result.outBinds.lobbv[0];
    lob.on('error', function(err) { console.error(err); });
    lob.on('finish',
      function()
      {
        connection.commit(
          function(err)
          {
            if (err)
              console.error(err.message);
            else
              console.log("Text inserted successfully.");
            connection.release(function(err) {
              if (err) console.error(err.message);
            });
          });
      });

    console.log('Reading from ' + inFileName);
    var inStream = fs.createReadStream(inFileName);
    inStream.on('error',
      function(err)
      {
        console.error(err);
        connection.release(function(err) {
          if (err) console.error(err.message);
        });
      });

    inStream.pipe(lob);  // copies the text to the CLOB
  });
  ```

The `EMPTY_CLOB()` / `RETURNING INTO` sequence is used because
node-oracledb currently does not support temporary LOBs and `BIND_IN`
for LOBs.  A similar sequence is used to update LOBs.

The following example shows selecting a CLOB using flowing mode and
writing it to a file.  It is similar to the example
[`clobstream1.js`](https://github.com/oracle/node-oracledb/tree/master/examples/clobstream1.js).
The returned column value is a Lob stream which is piped to an opened
file stream.

By default the Lob stream is a Node.js buffer - which is useful for
BLOB data.  Since this example uses a CLOB, the `setEncoding()` call
is used to indicate data should be a string.  Both the Lob stream and
output data stream have 'error' events to handle unexpected issues:

```javascript
var oracledb = require('oracledb');

. . .

connection.execute(
  "SELECT c FROM mylobs WHERE id = :id",
  { id: 1 },
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    if (result.rows.length === 0) { console.log("No results"); return; }

    var lob = result.rows[0][0];
    if (lob === null) { console.log("CLOB was NULL"); return; }

    lob.setEncoding('utf8');  // we want text, not binary output
    lob.on('error', function(err) { console.error(err); });
    lob.on('close', function() {
      connection.release(function(err) { if (err) console.error(err.message); });
    });

    console.log('Writing to ' + outFileName);
    var outStream = fs.createWriteStream(outFileName);
    outStream.on('error', function(err) { console.error(err); });
    lob.pipe(outStream);
  });
```

## <a name="bind"></a> 12. Bind Parameters for Prepared Statements

SQL and PL/SQL statements may contain bind parameters, indicated by
colon-prefixed identifiers or numerals.  These indicate where
separately specified values are substituted when the statement is
executed.  Bind parameters are also called bind variables.

Using bind parameters is recommended in preference to constructing SQL
or PL/SQL statements by string concatenation.  This is for performance
and security.

IN binds are values passed into the database.  OUT binds are used to
retrieve data.  IN OUT binds are passed in, and may return a different
value after the statement executes.

With PL/SQL statements, only scalar parameters can be bound.  An array
of values cannot be bound to a PL/SQL bind parameter.

OUT bind parameters for `RETURNING INTO` clauses will always return an
array of values. See [DML RETURNING Bind Parameters](#dmlreturn).

### <a name="inbind"></a> 12.1 IN Bind Parameters

With IN binds, the bound data value, or current value of a JavaScript
variable, is used during execution of the SQL statement.

In this example, the SQL bind parameters *:country\_id* and
*:country\_name* can be bound to values in node-oracledb using an
array.  This is often called "bind by position":

```javascript
connection.execute(
  "INSERT INTO countries VALUES (:country_id, :country_name)",
  [90, "Tonga"],
  function(err, result)
  {
    if (err)
      console.error(err.message);
    else
      console.log("Rows inserted " + result.rowsAffected);
  });
```

The position of the array values corresponds to the position of the
SQL bind variables as they occur in the statement, regardless of their
names.  This is still true even if the bind variables are named like
`:0`, `:1` etc.  The following snippet will fail because the country
name needs to be the second entry of the array so it becomes the
second value in the `INSERT` statement

```javascript
connection.execute(
  "INSERT INTO countries VALUES (:1, :0)",
  ["Tonga", 90],  // fail
  . . .
```

Instead of binding by array, an object that names each bind value can
be used.  The attributes can in be any order but their names must
match the SQL bind parameter names.  This is often called "bind by
name":

```javascript
connection.execute(
  "INSERT INTO countries VALUES (:country_id, :country_name)",
  {country_id: 90, country_name: "Tonga"},
  function(err, result)
  {
    if (err)
      console.error(err.message);
    else
      console.log("Rows inserted " + result.rowsAffected);
  });
```

The default direction for binding is `BIND_IN`.  The datatype used for
IN binds is inferred from the bind value.

If desired, each IN bind parameter can be described by an object having
explicit attributes for the bind direction (`dir`), the datatype
(`type`) and the value (`val`):

```javascript
var oracledb = require('oracledb');
. . .
connection.execute(
  "INSERT INTO countries VALUES (:country_id, :country_name)",
  {
    country_id: { val: 90, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
    country_name: { val: "Tonga", dir: oracledb.BIND_IN, type:oracledb.STRING }
  },
  function(err, result)
  {
    if (err)
      console.error(err.message);
    else
      console.log("Rows inserted " + result.rowsAffected);
  });
```

For IN binds the direction must be `BIND_IN`.  The type can be
`STRING`, `NUMBER`, `DATE` matching the data.  The type `BUFFER` can
bind a Node.js Buffer to an Oracle Database `RAW` type.  The type
`CURSOR` cannot be used with IN binds.

### <a name="outbind"></a> 12.2 OUT and IN OUT Bind Parameters

For each OUT and IN OUT bind parameter, a bind value object containing
[`val`](#executebindParams), [`dir`](#executebindParams),
[`type`](#executebindParams) and [`maxSize`](#executebindParams)
properties is used.  For
[PL/SQL Associative Array binds](#plsqlindexbybinds) a
[`maxArraySize`](#executebindParams) property is required.

The `dir` attribute should be `BIND_OUT` or `BIND_INOUT`.

For `BIND_INOUT` parameters, the `type` attribute should be `STRING`,
`NUMBER`, `DATE` or `BUFFER`.

For `BIND_OUT` parameters the `type` attribute should be `STRING`,
`NUMBER`, `DATE`, `CURSOR`, `BLOB`, `CLOB` or `BUFFER`.

The type `BUFFER` is used to bind an Oracle Database `RAW` to a
Node.js Buffer.

If `type` is not specified then `STRING` is assumed.

A `maxSize` should be set for `STRING` OUT or IN OUT binds.  This is
the maximum number of bytes the bind parameter will return.  If the
output value does not fit in `maxSize` bytes, then an error such
*ORA-06502: PL/SQL: numeric or value error: character string buffer
too small* or *NJS-016: buffer is too small for OUT binds* occurs.

A default value of 200 bytes is used when `maxSize` is not provided
for OUT binds of type `STRING` or `BUFFER`.

The `results` parameter of the `execute()` callback contains an
`outBinds` property that has the returned OUT and IN OUT binds as
either array elements or property values.  This depends on whether an
array or object was initially passed as the `bindParams` parameter to
the `execute()` call.  That is, if bind-by-name is done by passing an
object with keys matching the bind variable names, then the OUT bind is
also returned as an object with the same keys.  Similarly, if
bind-by-position is done by passing an array of bind values, then the
OUT and IN OUT binds are in an array with the bind positions in the
same order.

Here is an example program showing the use of binds:

```javascript
var oracledb = require('oracledb');
. . .
var bindVars = {
  i:  'Chris', // default direction is BIND_IN. Datatype is inferred from the data
  io: { val: 'Jones', dir: oracledb.BIND_INOUT },
  o:  { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
}
connection.execute(
  "BEGIN testproc(:i, :io, :o); END;",
  bindVars,
  function (err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

Given the creation of `TESTPROC` using:

```sql
CREATE OR REPLACE PROCEDURE testproc (
p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
AS
BEGIN
  p_inout := p_in || p_inout;
  p_out := 101;
END;
/
show errors
```

The Node.js output would be:

```
{ io: 'ChrisJones', o: 101 }
```

An alternative to the named bind syntax is positional syntax:

```javascript
var bindVars = [
  'Chris',
  { val: 'Jones', dir: oracledb.BIND_INOUT },
  { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
];
```

Mixing positional and named syntax is not supported.  The following
will throw an error:

```javascript
var bindVars = [
  'Chris',
  { val: 'Jones', dir: oracledb.BIND_INOUT },
  { o: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }  // invalid
];
```

### <a name="dmlreturn"></a> 12.3 DML RETURNING Bind Parameters

Bind parameters from "DML RETURNING" statements (such as `INSERT
... RETURNING ... INTO ...`) can use `STRING`, `NUMBER` or `DATE` for
the OUT [`type`](#executebindParams).

For `STRING` types, an error occurs if [`maxSize`](#executebindParams)
is not large enough to hold a returned value.

Note each DML RETURNING bind parameter is returned as an array
containing zero or more elements.  Application code that is designed
to expect only one value could be made more robust if it confirms the
returned array length is not greater than one.  This will help identify
invalid data or an incorrect `WHERE` clause that causes more results
to be returned.

Oracle Database DATE, TIMESTAMP and TIMESTAMP WITH LOCAL TIME ZONE
types can be bound as `DATE` for DML RETURNING.  These types and ROWID
can also be bound as `STRING`.

An example of DML RETURNING binds is:

```javascript
var oracledb = require('oracledb');
. . .
connection.execute(
   "UPDATE mytab SET name = :name "
 + "WHERE id = :id "
 + "RETURNING id, name INTO :rid, :rname",
  {
    id:    1001,
    name:  "Krishna",
    rid:   { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
  },
  function(err, result)
  {
    if (err) { console.error(err); return; }
    console.log(result.outBinds);
  });
```

If the `WHERE` clause matches one record, the output would be like:

```
{ rid: [ 1001 ], rname: [ 'Krishna' ] }
```

When a couple of rows match, the output could be:

```
{ rid: [ 1001, 1001 ], rname: [ 'Krishna', 'Krishna' ] }
```

If the `WHERE` clause matches no rows, the output would be:

```
{ rid: [], rname: [] }
```

### <a name="refcursors"></a> 12.4 REF CURSOR Bind Parameters

Oracle REF CURSORS can be fetched in node-oracledb by binding a
`CURSOR` to a PL/SQL call.  The resulting bind variable becomes a
[`ResultSet`](#resultsetclass), allowing rows to be fetched using
[`getRow()`](#getrow) or [`getRows()`](#getrows).  When all rows have
been fetched, or the application does not want to continue getting
more rows, then the result set must be freed using
[`close()`](#close).  If the REF cursor is not set to any value, or is
set to NULL, in the PL/SQL procedure, then the returned `ResultSet` is
invalid and methods like `getRows()` will return an error when
invoked.

When using Oracle Database 11gR2 or greater, then
[`prefetchRows`](#propdbprefetchrows) can be used to tune the
performance of fetching REF CURSORS.

See [refcursor.js](https://github.com/oracle/node-oracledb/tree/master/examples/refcursor.js)
for a complete example.

Given a PL/SQL procedure defined as:

```sql
CREATE OR REPLACE PROCEDURE get_emp_rs (
  p_sal IN NUMBER,
  p_recordset OUT SYS_REFCURSOR) AS
BEGIN
  OPEN p_recordset FOR
    SELECT first_name, salary, hire_date
    FROM   employees
    WHERE  salary > p_sal;
END;
/
```

This PL/SQL procedure can be called in node-oracledb using:

```javascript
var oracledb = require('oracledb');

. . .

var numRows = 10;  // number of rows to return from each call to getRows()

var bindvars = {
  sal:  6000,
  cursor:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
}

connection.execute(
  "BEGIN get_emp_rs(:sal, :cursor); END;",
  bindvars,
  function(err, result)
  {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.outBinds.cursor, numRows);
  });

. . .

function fetchRowsFromRS(connection, resultSet, numRows)
{
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows)
    {
      if (err) {
         . . .                        // close the result set and release the connection
      } else if (rows.length == 0) {  // no rows, or no more rows
        . . .                         // close the result set and release the connection
      } else if (rows.length > 0) {
        console.log(rows);
        fetchRowsFromRS(connection, resultSet, numRows);  // get next set of rows
      }
    });
}
```

### <a name="lobbinds"></a> 12.5 LOB Bind Parameters

LOBs can be bound with `dir` set to `BIND_OUT`.  Binding LOBs with
`BIND_IN` or `BIND_INOUT` is currently not supported.

To use the node-oracledb [Lob API](#lobclass), CLOB variables should be bound with
`type` [CLOB](#oracledbconstants).  BLOB variables should be bound
with `type` [BLOB](#oracledbconstants).

PL/SQL OUT CLOB parameters can also be bound as `STRING` but this is
not recommended because the returned length is limited to the maximum
limit of [`maxSize`](#executebindParams).

The following code snippet binds a PL/SQL OUT CLOB parameter and
returns a Lob to node-oracledb:

```javascript
/*
  CREATE TABLE mylobs (id number, c CLOB);
  INSERT INTO mylobs . . .
  CREATE OR REPLACE PROCEDURE myproc (p_id IN NUMBER, p_c OUT CLOB) AS
  BEGIN
    SELECT c INTO p_c FROM mylobs WHERE id = p_id;
  END;
*/

var oracledb = require('oracledb');

. . .

connection.execute(
  "BEGIN myproc(:id, :cbv); END;",
  { id: 1, cbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    var lob = result.outBinds.cbv;

    // Use Node.js Streams API to fetch the CLOB data from lob
    . . .
```

See [Working with CLOB and BLOB Data](#lobhandling) for more information
on working with Lob streams.

### <a name="plsqlindexbybinds"></a> 12.6 PL/SQL Collection Associative Array (Index-by) Bind Parameters

Arrays of strings and numbers can be bound to PL/SQL IN, IN OUT, and
OUT parameters of PL/SQL `INDEX BY` associative array type.  This type
was formerly called PL/SQL tables or index-by tables.  This method of
binding can be a very efficient way of transferring small data sets.
Note PL/SQL's `VARRAY` and nested table collection types cannot be
bound.

Given this table and PL/SQL package:

```sql
DROP TABLE mytab;
CREATE TABLE mytab (id NUMBER, numcol NUMBER);

CREATE OR REPLACE PACKAGE mypkg IS
  TYPE numtype IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;
  PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype);
  PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype);
END;
/

CREATE OR REPLACE PACKAGE BODY mypkg IS

  PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype) IS
  BEGIN
    FORALL i IN INDICES OF vals
      INSERT INTO mytab (id, numcol) VALUES (p_id, vals(i));
  END;

  PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype) IS
  BEGIN
    SELECT numcol BULK COLLECT INTO vals FROM mytab WHERE id = p_id ORDER BY 1;
  END;

END;
/
```

To bind an array in node-oracledb using "bind by name" syntax for insertion into `mytab` use:

```javascript
connection.execute(
  "BEGIN mypkg.myinproc(:id, :vals); END;",
  {
    id: 1234,
    vals: { type: oracledb.NUMBER,
             dir: oracledb.BIND_IN,
             val: [1, 2, 23, 4, 10]
          }
  }, . . .
```

Alternatively, "bind by position" syntax can be used:

 ```javascript
connection.execute(
  "BEGIN mypkg.myinproc(:id, :vals); END;",
  [
    1234,
    { type: oracledb.NUMBER,
       dir: oracledb.BIND_IN,
       val: [1, 2, 23, 4, 10]
    }
  ],

  function (err) { . . . });
```

After executing either of these `mytab` will contain:

```
    ID         NUMCOL
---------- ----------
      1234          1
      1234          2
      1234         23
      1234          4
      1234         10
```

The [`type`](#executebindParams) must be set for PL/SQL array binds.
It can be set to `STRING` or `NUMBER`

For OUT and IN OUT binds, the [`maxArraySize`](#executebindParams)
bind property must be set.  Its value is the maximum number of
elements that can be returned in an array.  An error will occur if the
PL/SQL block attempts to insert data beyond this limit.  If the PL/SQL
code returns fewer items, the JavaScript array will have the actual
number of data elements and will not contain null entries.  Setting
`maxArraySize` larger than needed will cause unnecessary memory
allocation.

For IN OUT binds, `maxArraySize` can be greater than the number of
elements in the input array.  This allows more values to be returned
than are passed in.

For IN binds, `maxArraySize` is ignored, as also is `maxSize`.

For `STRING` IN OUT or OUT binds, the string length
[`maxSize`](#executebindParams) property may be set.  If it is not set
the memory allocated per string will default to 200 bytes.  If the
value is not large enough to hold the longest string data item in the
collection a runtime error occurs.  To avoid unnecessary memory
allocation, do not let the size be larger than needed.

The next example fetches an array of values from a table.  First,
insert these values:

```sql
INSERT INTO mytab (id, numcol) VALUES (99, 10);
INSERT INTO mytab (id, numcol) VALUES (99, 25);
INSERT INTO mytab (id, numcol) VALUES (99, 50);
COMMIT;
```

With these values, the following node-oracledb code will print
`[ 10, 25, 50 ]`.

```javascript
connection.execute(
  "BEGIN mypkg.myoutproc(:id, :vals); END;",
  {
    id: 99,
    vals: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_OUT,
            maxArraySize: 10          // allocate memory to hold 10 numbers
        }
  },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds.vals);
  });
```

If `maxArraySize` was reduced to `2`, the script would fail with:

```
ORA-06513: PL/SQL: index for PL/SQL table out of range for host language array
```

See [Oracledb Constants](#oracledbconstants) and
[execute(): Bind Parameters](#executebindParams) for more information
about binding.

See
[plsqlarray.js](https://github.com/oracle/node-oracledb/tree/master/examples/plsqlarray.js)
for a runnable example.


## <a name="transactionmgt"></a> 13. Transaction Management

By default,
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements are not committed in node-oracledb.

The node-oracledb add-on implements [`commit()`](#commit) and
[`rollback()`](#rollback) methods that can be used to explicitly
control transactions.

If the [`autoCommit`](#propdbisautocommit) flag is set to *true*,
then a commit occurs at the end of each `execute()` call.  Unlike an
explicit `commit()`, this does not require a round-trip to the
database.  For maximum efficiency, set `autoCommit` to true for the
last `execute()` call of a transaction in preference to using an
additional, explicit `commit()` call.

When a connection is released, any ongoing transaction will be rolled
back.  Therefore if a released, pooled connection is used by a
subsequent [`pool.getConnection()`](#getconnectionpool) call, then any
DML statements performed on the obtained connection are always in a
new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

Note: Oracle Database will implicitly commit when a
[DDL](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CHDJJGGF)
statement is executed irrespective of the value of `autoCommit`.

## <a name="stmtcache"></a> 14. Statement Caching

Node-oracledb uses the
[Oracle OCI statement cache](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#i471377).
Each non-pooled connection and each session in the connection pool has
its own cache of statements with a default size of 30.  Statement
caching lets cursors be used without re-parsing the statement.
Statement caching also reduces meta data transfer costs between the
node-oracledb and the database.  Performance and scalability are improved.

In general, set the statement cache to the size of the working set of
statements being executed by the application.

Statement caching can be disabled by setting the size to 0.  Disabling
the cache may be beneficial when the quantity or order of statements
causes cache entries to be flushed before they get a chance to be
reused.  For example if there are more distinct statements than cache
slots, and the order of statement execution causes older statements to
be flushed from the cache before the statements are re-executed.

The statement cache size can be set globally with [stmtCacheSize](#propdbstmtcachesize):

```javascript
var oracledb = require('oracledb');
oracledb.stmtCacheSize = 40;
```

The value can be overridden in an `oracledb.getConnection()` call:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE",
    stmtCacheSize : 40
  },
  function(err, connection)
  {
    . . .
  });
```

The value can also be overridden in the `poolAttrs` parameter to
the [`createPool()`](#createpool) method.

With Oracle Database 12c, the statement cache size can be automatically tuned with the
[External Configuration](#oraaccess) *oraaccess.xml* file.

## <a name="oraaccess"></a> 15. External Configuration

When node-oracledb is linked with Oracle Database 12c client libraries, the Oracle
client-side configuration file
[oraaccess.xml](http://docs.oracle.com/database/121/LNOCI/oci10new.htm#LNOCI73052)
can be used to configure some behaviors of node-oracledb.

For example, oraaccess.xml can be used to:

- turn on [Fast Application Notification](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS538) (FAN) events to enable FAN notifications and [Runtime Load Balancing](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS515) (RLB)
- configure [Client Result Caching](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS464) parameters
- turn on [Client Statement Cache Auto-tuning](http://docs.oracle.com/database/121/LNOCI/oci10new.htm#LNOCI73009)

Other features can also be enabled.  Refer to the
[oraaccess.xml documentation](http://docs.oracle.com/database/121/LNOCI/oci10new.htm#LNOCI73052)

## <a name="nls"></a> 16. Globalization and National Language Support (NLS)

Node-oracledb can use Oracle's
[National Language Support (NLS)](https://docs.oracle.com/database/121/NLSPG/toc.htm)
to assist in globalizing applications.

Node-oracledb always uses Oracle's AL32UTF8 character set internally.
Data will be converted between AL32UTF8 and the
database character set when it is inserted into, or queried from, the
database.  The environment variable `NLS_LANG` can be used to
configure the Oracle client language and territory only.

Oracle NLS environment variables, or statements like `ALTER SESSION`,
can be used to configure further aspects of node-oracledb data access
globalization.  Refer to
[NLS Documentation](https://docs.oracle.com/database/121/NLSPG/ch3globenv.htm#g1028448).

## <a name="endtoend"></a> 17. End-to-end Tracing, Mid-tier Authentication, and Auditing

The Connection properties [action](#propconnaction),
[module](#propconnmodule), and [clientId](#propconnclientid) set
metadata for
[end-to-end tracing](http://docs.oracle.com/database/121/TGSQL/tgsql_trace.htm#CHDBDGIJ).
The values can be tracked in database views, shown in audit trails,
and seen in tools such as Enterprise Manager.

The `clientId` property can also be used by applications that do their
own mid-tier authentication but connect to the database using the one
database schema.  By setting `clientId` to the application's
authenticated username, the database is aware of who the actual end
user is.  This can, for example, be used by Oracle
[Virtual Private Database](http://docs.oracle.com/database/121/CNCPT/cmntopc.htm#CNCPT62345)
policies to automatically restrict data access by that user.

Applications should set the properties because they can greatly help
to identify and resolve unnecessary database resource usage, or
improper access.

The attributes are set on a [connection](#propdbconclass) object and
sent to the database on the next 'round-trip' from node-oracledb, for
example, with `execute()`:

```javascript
oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/orcl"
  },
  function(err, connection)
  {
    if (err) { console.error(err.message); return;    }

    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    connection.execute("SELECT . . .",
      function(err, result)
      {
        . . .
```

While the connection is open the attribute values can be seen, for example with SQL*Plus:

```
SQL> SELECT username, client_identifier, action, module FROM v$session WHERE username = 'HR';

USERNAME   CLIENT_IDENTIFIER    ACTION               MODULE
---------- -------------------- -------------------- --------------------
HR         Chris                Query departments    End-to-end example
```

The values can also be manually set by calling
[`DBMS_APPLICATION_INFO`](http://docs.oracle.com/cd/B19306_01/appdev.102/b14258/d_appinf.htm#CHECEIEB)
procedures or
[`DBMS_SESSION.SET_IDENTIFIER`](http://docs.oracle.com/cd/B19306_01/appdev.102/b14258/d_sessio.htm#SET_IDENTIFIER),
however these cause explicit round-trips, reducing scalability.

In general, applications should be consistent about how, and when,
they set the end-to-end tracing attributes so that current values are
recorded by the database.

Idle connections released back to a connection pool will retain the
previous attribute values of that connection. This avoids the overhead
of a round-trip to reset the values.  The Oracle design assumption is
that pools are actively used and have few idle connections. After
getting a connection from a pool, an application that uses end-to-end
tracing should set new values appropriately.

When a Connection object is displayed, such as with `console.log()`,
the end-to-end tracing attributes will show as `null` even if values
have been set and are being sent to the database.  This is for
architectural, efficiency and consistency reasons.  When an already
established connection is retrieved from a local pool, node-oracledb
is not able to efficiently retrieve values previously established in
the connection.  The same occurs if the values are set by a call to
PL/SQL code - there is no efficient way for node-oracledb to know the
values have changed.

The attribute values are commonly useful to DBAs.  However, if knowing
the current values is useful in an application, the application should
save the values as part of its application state whenever the
node-oracledb attributes are set.  Applications can also find the
current values by querying the Oracle data dictionary or using PL/SQL
procedures such as `DBMS_APPLICATION_INFO.READ_MODULE()` with the
understanding that these require round-trips to the database.
