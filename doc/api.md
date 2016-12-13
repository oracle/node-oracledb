# node-oracledb 1.12: Documentation for the Oracle Database Node.js Add-on

*Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.*

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
     - 3.1.1 [Query `outFormat` Constants](#oracledbconstantsoutformat)
        - [`ARRAY`](#oracledbconstantsoutformat), [`OBJECT`](#oracledbconstantsoutformat)
     - 3.1.2 [Node-oracledb Type Constants](#oracledbconstantsnodbtype)
        - [`BLOB`](#oracledbconstantsnodbtype), [`BUFFER`](#oracledbconstantsnodbtype), [`CLOB`](#oracledbconstantsnodbtype), [`CURSOR`](#oracledbconstantsnodbtype), [`DATE`](#oracledbconstantsnodbtype), [`DEFAULT`](#oracledbconstantsnodbtype), [`NUMBER`](#oracledbconstantsnodbtype), [`STRING`](#oracledbconstantsnodbtype)
     - 3.1.3 [Oracle Database Type Constants](#oracledbconstantsdbtype)
        - [`DB_TYPE_BINARY_DOUBLE`](#oracledbconstantsdbtype), [`DB_TYPE_BINARY_FLOAT`](#oracledbconstantsdbtype), [`DB_TYPE_BLOB`](#oracledbconstantsdbtype), [`DB_TYPE_CLOB`](#oracledbconstantsdbtype), [`DB_TYPE_DATE`](#oracledbconstantsdbtype), [`DB_TYPE_CHAR`](#oracledbconstantsdbtype), [`DB_TYPE_NUMBER`](#oracledbconstantsdbtype), [`DB_TYPE_RAW`](#oracledbconstantsdbtype), [`DB_TYPE_ROWID`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP_LTZ`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP_TZ`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP`](#oracledbconstantsdbtype), [`DB_TYPE_VARCHAR`](#oracledbconstantsdbtype)
     - 3.1.4 [Execute Bind Direction Constants](#oracledbconstantsbinddir)
        - [`BIND_IN`](#oracledbconstantsbinddir), [`BIND_INOUT`](#oracledbconstantsbinddir), [`BIND_OUT`](#oracledbconstantsbinddir)
  - 3.2 [Oracledb Properties](#oracledbproperties)
     - 3.2.1 [`autoCommit`](#propdbisautocommit)
     - 3.2.2 [`connectionClass`](#propdbconclass)
     - 3.2.3 [`extendedMetaData`](#propdbextendedmetadata)
     - 3.2.4 [`externalAuth`](#propdbisexternalauth)
     - 3.2.5 [`fetchAsString`](#propdbfetchasstring)
     - 3.2.6 [`lobPrefetchSize`](#propdblobprefetchsize)
     - 3.2.7 [`maxRows`](#propdbmaxrows)
     - 3.2.8 [`oracleClientVersion`](#propdboracleClientVersion)
     - 3.2.9 [`outFormat`](#propdboutformat)
     - 3.2.10 [`poolIncrement`](#propdbpoolincrement)
     - 3.2.11 [`poolMax`](#propdbpoolmax)
     - 3.2.12 [`poolMin`](#propdbpoolmin)
     - 3.2.13 [`poolPingInterval`](#propdbpoolpinginterval)
     - 3.2.14 [`poolTimeout`](#propdbpooltimeout)
     - 3.2.15 [`prefetchRows`](#propdbprefetchrows)
     - 3.2.16 [`Promise`](#propdbpromise)
     - 3.2.17 [`queueRequests`](#propdbqueuerequests)
     - 3.2.18 [`queueTimeout`](#propdbqueuetimeout)
     - 3.2.19 [`stmtCacheSize`](#propdbstmtcachesize)
     - 3.2.20 [`version`](#propdbversion)
  - 3.3 [Oracledb Methods](#oracledbmethods)
     - 3.3.1 [`createPool()`](#createpool)
     - 3.3.2 [`getConnection()`](#getconnectiondb)
     - 3.3.3 [`getPool()`](#getpool)
4. [Connection Class](#connectionclass)
  - 4.1 [Connection Properties](#connectionproperties)
     - 4.1.1 [`action`](#propconnaction)
     - 4.1.2 [`clientId`](#propconnclientid)
     - 4.1.3 [`module`](#propconnmodule)
     - 4.1.4 [`oracleServerVersion`](#propconnoracleserverversion)
     - 4.1.5 [`stmtCacheSize`](#propconnstmtcachesize)
  - 4.2 [Connection Methods](#connectionmethods)
     - 4.2.1 [`break()`](#break)
     - 4.2.2 [`close()`](#connectionclose)
     - 4.2.3 [`commit()`](#commit)
     - 4.2.4 [`createLob()`](#connectioncreatelob)
     - 4.2.5 [`execute()`](#execute)
         - 4.2.5.1 [`execute()`: SQL Statement](#executesqlparam)
         - 4.2.5.2 [`execute()`: Bind Parameters](#executebindParams)
             - [`dir`](#executebindParams), [`maxArraySize`](#executebindParams), [`maxSize`](#executebindParams), [`type`](#executebindParams), [`val`](#executebindParams)
         - 4.2.5.3 [`execute()`: Options](#executeoptions)
             - 4.2.5.3.1 [`autoCommit`](#propexecautocommit)
             - 4.2.5.3.2 [`extendedMetaData`](#propexecextendedmetadata)
             - 4.2.5.3.3 [`fetchInfo`](#propexecfetchinfo)
             - 4.2.5.3.4 [`maxRows`](#propexecmaxrows)
             - 4.2.5.3.5 [`outFormat`](#propexecoutformat)
             - 4.2.5.3.6 [`prefetchRows`](#propexecprefetchrows)
             - 4.2.5.3.7 [`resultSet`](#propexecresultset)
         - 4.2.5.4 [`execute()`: Callback Function](#executecallback)
             - 4.2.5.4.1 [`metaData`](#execmetadata)
                 -  [`name`](#execmetadata), [`fetchType`](#execmetadata), [`dbType`](#execmetadata), [`byteSize`](#execmetadata), [`precision`](#execmetadata), [`scale`](#execmetadata), [`nullable`](#execmetadata)
             - 4.2.5.4.2 [`outBinds`](#execoutbinds)
             - 4.2.5.4.3 [`resultSet`](#execresultset)
             - 4.2.5.4.4 [`rows`](#execrows)
             - 4.2.5.4.5 [`rowsAffected`](#execrowsaffected)
     - 4.2.6 [`queryStream()`](#querystream)
     - 4.2.7 [`release()`](#release)
     - 4.2.8 [`rollback()`](#rollback)
5. [Lob Class](#lobclass)
  - 5.1 [Lob Properties](#lobproperties)
     - 5.1.1 [`chunkSize`](#proplobchunksize)
     - 5.1.2 [`length`](#proploblength)
     - 5.1.3 [`pieceSize`](#proplobpiecesize)
     - 5.1.4 [`type`](#proplobtype)
  - 5.2 [Lob Methods](#lobmethods)
     - 5.2.1 [`close()`](#lobclose)
6. [Pool Class](#poolclass)
  - 6.1 [Pool Properties](#poolproperties)
     - 6.1.1 [`connectionsInUse`](#proppoolconnectionsinuse)
     - 6.1.2 [`connectionsOpen`](#proppoolconnectionsopen)
     - 6.1.3 [`poolAlias`](#proppoolpoolalias)
     - 6.1.4 [`poolIncrement`](#proppoolpoolincrement)
     - 6.1.5 [`poolMax`](#proppoolpoolmax)
     - 6.1.6 [`poolMin`](#proppoolpoolmin)
     - 6.1.7 [`poolPingInterval`](#proppoolpoolpinginterval)
     - 6.1.8 [`poolTimeout`](#proppoolpooltimeout)
     - 6.1.9 [`queueRequests`](#proppoolqueuerequests)
     - 6.1.10 [`queueTimeout`](#proppoolqueueTimeout)
     - 6.1.11 [`stmtCacheSize`](#proppoolstmtcachesize)
  - 6.2 [Pool Methods](#poolmethods)
     - 6.2.1 [`close()`](#poolclose)
     - 6.2.2 [`getConnection()`](#getconnectionpool)
     - 6.2.3 [`terminate()`](#terminate)
7. [ResultSet Class](#resultsetclass)
  - 7.1 [ResultSet Properties](#resultsetproperties)
     - 7.1.1 [`metaData`](#rsmetadata)
  - 7.2 [ResultSet Methods](#resultsetmethods)
     - 7.2.1 [`close()`](#close)
     - 7.2.2 [`getRow()`](#getrow)
     - 7.2.3 [`getRows()`](#getrows)
     - 7.2.4 [`toQueryStream()`](#toquerystream)
8. [Connection Handling](#connectionhandling)
  - 8.1 [Connection Strings](#connectionstrings)
     - 8.1.1 [Easy Connect Syntax for Connection Strings](#easyconnect)
     - 8.1.2 [Net Service Names for Connection Strings](#tnsnames)
     - 8.1.3 [JDBC and Node-oracledb Connection Strings Compared](#notjdbc)
  - 8.2 [Connections and Number of Threads](#numberofthreads)
  - 8.3 [Connection Pooling](#connpooling)
     - 8.3.1 [Connection Pool Cache](#connpoolcache)
     - 8.3.2 [Connection Pool Queue](#connpoolqueue)
     - 8.3.3 [Connection Pool Monitoring and Throughput](#connpoolmonitor)
     - 8.3.4 [Connection Pool Pinging](#connpoolpinging)
  - 8.4 [Database Resident Connection Pooling (DRCP)](#drcp)
  - 8.5 [External Authentication](#extauth)
9. [SQL Execution](#sqlexecution)
  - 9.1 [SELECT Statements](#select)
     - 9.1.1 [Fetching Rows](#fetchingrows)
     - 9.1.2 [Result Set Handling](#resultsethandling)
     - 9.1.3 [Streaming Query Results](#streamingresults)
     - 9.1.4 [Query Output Formats](#queryoutputformats)
     - 9.1.5 [Query Column Metadata](#querymeta)
     - 9.1.6 [Result Type Mapping](#typemap)
         - 9.1.6.1 [Fetching Character Types](#stringhandling)
         - 9.1.6.2 [Fetching Numbers](#numberhandling)
         - 9.1.6.3 [Fetching Date and Timestamps](#datehandling)
         - 9.1.6.4 [Fetching Numbers and Dates as String](#fetchasstringhandling)
         - 9.1.6.5 [Mapping Custom Types](#customtypehandling)
     - 9.1.7 [Row Prefetching](#rowprefetching)
10. [PL/SQL Execution](#plsqlexecution)
  - 10.1 [PL/SQL Stored Procedures](#plsqlproc)
  - 10.2 [PL/SQL Stored Functions](#plsqlfunc)
  - 10.3 [Anonymous PL/SQL blocks](#plsqlanon)
  - 10.4 [Using DBMS_OUTPUT](#dbmsoutput)
11. [Working with CLOB and BLOB Data](#lobhandling)
  - 11.1 [Simple Insertion of LOBs](#basiclobinsert)
  - 11.2 [Streams and Lobs](#streamsandlobs)
  - 11.3 [Using RETURNING INTO to Insert into LOBs](#lobinsertdiscussion)
  - 11.4 [Using `createLob()`](#templobdiscussion)
  - 11.5 [Closing Lobs](#closinglobs)
  - 11.6 [Getting LOBs from Oracle Database](#queryinglobs)
12. [Oracle Database 12c JSON Datatype](#jsondatatype)
13. [Bind Parameters for Prepared Statements](#bind)
  - 13.1 [IN Bind Parameters](#inbind)
  - 13.2 [OUT and IN OUT Bind Parameters](#outbind)
  - 13.3 [DML RETURNING Bind Parameters](#dmlreturn)
  - 13.4 [REF CURSOR Bind Parameters](#refcursors)
  - 13.5 [LOB Bind Parameters](#lobbinds)
  - 13.6 [PL/SQL Collection Associative Array (Index-by) Bind Parameters](#plsqlindexbybinds)
14. [Transaction Management](#transactionmgt)
15. [Statement Caching](#stmtcache)
16. [External Configuration](#oraaccess)
17. [Globalization and National Language Support (NLS)](#nls)
18. [End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend)
19. [Promises in node-oracledb](#promiseoverview)
  - 19.1 [Custom Promise Libraries](#custompromises)

## <a name="intro"></a> 1. Introduction

The [*node-oracledb*](https://github.com/oracle/node-oracledb) add-on for Node.js powers high performance Oracle Database applications.

This document shows how to use node-oracledb.  The API reference is in
sections 2 - 7 and the user guide in subsequent sections.

For how to install node-oracledb, see [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md).

### Example: Simple SELECT statement in Node.js with Callbacks

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
          doRelease(connection);
          return;
        }
        console.log(result.rows);
        doRelease(connection);
      });
  });

function doRelease(connection)
{
  connection.close(
    function(err) {
      if (err)
        console.error(err.message);
    });
}
```

With Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

Node-oracledb can also use [Promises](#promiseoverview).

There are more node-oracledb examples in the
[examples](https://github.com/oracle/node-oracledb/tree/master/examples)
directory.

Scripts to create Oracle's sample schemas can be found at
[github.com/oracle/db-sample-schemas](https://github.com/oracle/db-sample-schemas).

## <a name="errorobj"></a> 2. Errors

The last parameter of each method is a callback, unless
[Promises](#promiseoverview) are being used.  The first parameter of
the callback is an *Error* object that contains error information if
the call fails.  If the call succeeds, then the object is null.

When using Promises, the `catch()` callback's error object will
contain error information when the Promise chain fails.

If an invalid value is set for a property, then an error occurs.  The
same is true for invalid operations on read-only or write-only
properties.  If an unrecognized property name is used, it will be
ignored.

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

These constants are defined in the `oracledb` module.  Usage is
described later in this document.

The numeric values for the constants are shown to aid debugging.  They
may change in future, so use the constant names in applications.


#### <a name="oracledbconstantsoutformat"></a> 3.1.1 Query `outFormat` Constants

Constants for the query result [outFormat](#propdboutformat) option:

```
Oracledb.ARRAY                  // (4001) Fetch each row as array of column values

Oracledb.OBJECT                 // (4002) Fetch each row as an object
```

#### <a name="oracledbconstantsnodbtype"></a> 3.1.2 Node-oracledb Type Constants

Constants for `execute()` [bind parameter](#executebindParams) `type` property,
for the [`createLob()`](#connectioncreatelob) `type` parameter,
for the [Lob](#proplobtype) `type` property,
for [`fetchAsString`](#propdbfetchasstring)
and [`fetchInfo`](#propexecfetchinfo), and
for [extended metadata](#propdbextendedmetadata).

Not all constants can be used in all places.

```
Oracledb.BLOB                   // (2007) Bind a BLOB to a Node.js Stream or create a temporary BLOB

Oracledb.BUFFER                 // (2005) Bind a RAW or BLOB to a Node.js Buffer

Oracledb.CLOB                   // (2006) Bind a CLOB to a Node.js Stream or create a temporary CLOB

Oracledb.CURSOR                 // (2004) Bind a REF CURSOR to a node-oracledb ResultSet class

Oracledb.DATE                   // (2003) Bind as JavaScript date type.  Can also be used for fetchAsString and fetchInfo

Oracledb.DEFAULT                // (0) Used with fetchInfo to reset the fetch type to the database type

Oracledb.NUMBER                 // (2002) Bind as JavaScript number type.  Can also be used for fetchAsString and fetchInfo

Oracledb.STRING                 // (2001) Bind as JavaScript String type.  Can be used for most database types.
```

#### <a name="oracledbconstantsdbtype"></a> 3.1.3 Oracle Database Type Constants

These types are shown in [extended metadata](#propdbextendedmetadata)
for queries and REF CURSORS.  They indicate the Oracle Database type.

```
Oracledb.DB_TYPE_BINARY_DOUBLE  // (101) BINARY_DOUBLE

Oracledb.DB_TYPE_BINARY_FLOAT   // (100) BINARY_FLOAT

Oracledb.DB_TYPE_BLOB           // (113) BLOB

Oracledb.DB_TYPE_CHAR           // (96) CHAR

Oracledb.DB_TYPE_CLOB           // (112) CLOB

Oracledb.DB_TYPE_DATE           // (12) DATE

Oracledb.DB_TYPE_NUMBER         // (2) NUMBER or FLOAT

Oracledb.DB_TYPE_RAW            // (23) RAW

Oracledb.DB_TYPE_ROWID          // (104) ROWID

Oracledb.DB_TYPE_TIMESTAMP      // (187) TIMESTAMP

Oracledb.DB_TYPE_TIMESTAMP_LTZ  // (232) TIMESTAMP WITH LOCAL TIME ZONE

Oracledb.DB_TYPE_TIMESTAMP_TZ   // (188) TIMESTAMP WITH TIME ZONE

Oracledb.DB_TYPE_VARCHAR        // (1) VARCHAR2
```

#### <a name="oracledbconstantsbinddir"></a> 3.1.4 Execute Bind Direction Constants

Constants for `execute()` [bind parameter](#executebindParams) `dir`
properties.

These specify whether data values bound to SQL or PL/SQL bind
parameters are passed into, or out from, the database:

```
Oracledb.BIND_IN                // (3001) Direction for IN binds

Oracledb.BIND_INOUT             // (3002) Direction for IN OUT binds

Oracledb.BIND_OUT               // (3003) Direction for OUT binds
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

#### <a name="propdbisautocommit"></a> 3.2.1 `oracledb.autoCommit`

```
Boolean autoCommit
```

If this property is *true*, then the transaction in the current
connection is automatically committed at the end of statement
execution.

The default value is *false*.

This property may be overridden in an [`execute()`](#executeoptions) call.

Note prior to node-oracledb 0.5 this property was called
`isAutoCommit`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.autoCommit = false;
```

#### <a name="propdbconclass"></a> 3.2.2 `oracledb.connectionClass`

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

#### <a name="propdbextendedmetadata"></a> 3.2.3 `oracledb.extendedMetaData`

```
Boolean extendedMetaData
```

Determines whether additional metadata is available for queries and
for REF CURSORs returned from PL/SQL blocks.

The default value for `extendedMetaData` is `false`. With this value,
the [`result.metaData`](#execmetadata)
[`result.resultSet.metaData`](#rsmetadata) objects only include column
names.

If `extendedMetaData` is `true` then `metaData` will contain
additional attributes.  These are listed in
[Result Object Properties](#execmetadata).

This property may be overridden in an [`execute()`](#executeoptions) call.

#### <a name="propdbisexternalauth"></a> 3.2.4 `oracledb.externalAuth`

```
Boolean externalAuth
```

If this property is *true* then connections are established using
external authentication.  See [External Authentication](#extauth) for
more information.

The default value is *false*.

The `user` and `password` properties for connecting or creating a pool
should not be set when `externalAuth` is *true*.

This property can be overridden in the
[`oracledb.createPool()`](#createpool) call and when getting a
standalone connection from
[`oracledb.getConnection()`](#getconnectiondb).

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.externalAuth = false;
```

#### <a name="propdbfetchasstring"></a> 3.2.5 `oracledb.fetchAsString`

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
See [Result Type Mapping](#typemap) for more discussion.

The valid types that can be mapped to strings are
[`DATE`](#oracledbconstantsnodbtype) and
[`NUMBER`](#oracledbconstantsnodbtype).  Columns of type `ROWID` and
`TIMESTAMP WITH TIME ZONE` that cannot natively be fetched can also be
mapped and fetched as strings.

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

#### <a name="propdblobprefetchsize"></a> 3.2.6 `oracledb.lobPrefetchSize`

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

#### <a name="propdbmaxrows"></a> 3.2.7 `oracledb.maxRows`

```
Number maxRows
```

The maximum number of rows that are fetched by the `execute()` call of the *Connection*
object when *not* using a [`ResultSet`](#resultsetclass).  Rows beyond
this limit are not fetched from the database.

The default value is 100.

This property may be overridden in an [`execute()`](#executeoptions) call.

This property is also used by [`queryStream()`](#querystream) as an
internal buffer size tuning parameter.

To improve database efficiency, SQL queries should use a row
limiting clause like [OFFSET /
FETCH](https://docs.oracle.com/database/122/SQLRF/SELECT.htm#GUID-CFA006CA-6FF1-4972-821E-6996142A51C6__BABEAACC)
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

#### <a name="propdboracleClientVersion"></a> 3.2.8 `oracledb.oracleClientVersion`

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

#### <a name="propdboutformat"></a> 3.2.9 `oracledb.outFormat`

```
Number outFormat
```

The format of rows fetched when using the [`execute()`](#execute)
call. This can be either of the [Oracledb
constants](#oracledbconstantsoutformat) `ARRAY` or `OBJECT`.  The default value
is `ARRAY` which is more efficient.

If specified as `ARRAY`, each row is fetched as an array of column
values.

If specified as `OBJECT`, each row is fetched as a JavaScript object.
The object has a property for each column name, with the property
value set to the respective column value.  The property name follows
Oracle's standard name-casing rules.  It will commonly be uppercase,
since most applications create tables using unquoted, case-insensitive
names.

This property may be overridden in an [`execute()`](#executeoptions) call.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.ARRAY;
```

#### <a name="propdbpoolincrement"></a> 3.2.10 `oracledb.poolIncrement`

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

#### <a name="propdbpoolmax"></a> 3.2.11 `oracledb.poolMax`

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

The default value is 4.

This property may be overridden when [creating a connection pool](#createpool).

If you increase this value, you may want to increase the number of
threads available to node-oracledb.  See
[Connections and Number of Threads](#numberofthreads).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMax = 4;
```

#### <a name="propdbpoolmin"></a> 3.2.12 `oracledb.poolMin`

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

#### <a name="propdbpoolpinginterval"></a> 3.2.13 `oracledb.poolPingInterval`

```
Number poolPingInterval
```

When a pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool for at least `poolPingInterval`
seconds, an internal "ping" will be performed first to check the
aliveness of the connection.  At the cost of some overhead for
infrequently accessed connection pools, connection pinging improves
the chance a pooled connection is valid when it is used because
identified un-unusable connections will not be returned to the
application by `getConnection()`.

Note when node-oracledb is built with version 12.2 of the Oracle
client library, the value of `poolPingInterval` is ignored.  Oracle
client 12.2 has a lightweight, always-enabled connection check that
replaces explicit pinging.

With Oracle client 12.1 or earlier, unless `poolPingInterval` is `0`,
it is possible for un-usable connections to be returned by a pool
`getConnection()`.  Since it is also possible for connections to
become unusable after `getConnection()` is called, applications should
implement appropriate statement execution error checking.

The default value is `60` seconds.  Possible values for `poolPingInterval` are:

Value     | Behavior of a Pool `getConnection()` call
----------|------------------------------------------
`n` < `0` | Never checks for connection aliveness
`0`       | Always checks for connection aliveness. There is some overhead in performing a ping so non-zero values are recommended for most applications
`n` > `0` | Checks aliveness if the connection has been idle in the pool (not "checked out" to the application by `getConnection()`) for at least `n` seconds

This property may be overridden when [creating a connection pool](#createpool).

See [Connection Pool Pinging](#connpoolpinging) for more discussion.

##### Example
```javascript
var oracledb = require('oracledb');
oracledb.poolPingInterval = 60;
```

#### <a name="propdbpooltimeout"></a> 3.2.14 `oracledb.poolTimeout`

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

#### <a name="propdbprefetchrows"></a> 3.2.15 `oracledb.prefetchRows`

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
It is also ignored when the query involves a LOB.

The default value is 100.

This property may be overridden in an [`execute()`](#execute) call.

See [Row Prefetching](#rowprefetching) for examples.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.prefetchRows = 100;
```

#### <a name="propdbpromise"></a> 3.2.16 `oracledb.Promise`

```
Promise Promise
```

Node-oracledb supports Promises on all methods.  The standard Promise
library is used in Node.js 0.12 and greater.  Promise support is not
enabled by default in Node.js 0.10.

See [Promises in node-oracledb](#promiseoverview) for a discussion of
using Promises.

This property can be set to override or disable the Promise
implementation.

##### Example

```javascript
var mylib = require('myfavpromiseimplementation');
oracledb.Promise = mylib;
```

Promises can be completely disabled by setting

```javascript
oracledb.Promise = null;
```

#### <a name="propdbqueuerequests"></a> 3.2.17 `oracledb.queueRequests`

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

See [Connection Pool Queue](#connpoolqueue) for more information.

#### <a name="propdbqueuetimeout"></a> 3.2.18 `oracledb.queueTimeout`

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

See [Connection Pool Queue](#connpoolqueue) for more information.

#### <a name="propdbstmtcachesize"></a> 3.2.19 `oracledb.stmtCacheSize`

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

#### <a name="propdbversion"></a> 3.2.20 `oracledb.version`
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

#### <a name="createpool"></a> 3.3.1 `oracledb.createPool()`

##### Prototype

Callback:
```
createPool(Object poolAttrs, function(Error error, Pool pool){});
```
Promise:
```
promise = createPool(Object poolAttrs);
```

##### Description

This method creates a pool of connections with the specified username,
password and connection string.

Internally, `createPool()` creates an [OCI Session
Pool](https://docs.oracle.com/database/122/LNOCI/oci-programming-advanced-topics.htm#LNOCI16617)
for each Pool object.

The default properties may be overridden by specifying new properties
in the `poolAttrs` parameter.

It is possible to add pools to the pool cache when calling `createPool()`.
This allows pools to later be accessed by name, removing the need to
pass the pool object through code.
See [Connection Pool Cache](#connpoolcache) for more details.

A pool should be terminated with the [`pool.close()`](#poolclose)
call, but only after all connections have been released.

##### Parameters
<a name="createpoolpoolattrs"></a>
```
Object poolAttrs
```

The `poolAttrs` parameter provides connection credentials and
pool-specific configuration properties, such as the maximum or minimum
number of connections for the pool, or the statement cache size for
the connections.

The properties provided in the `poolAttrs` parameter override the
default pooling properties of the *Oracledb* object.  If an attribute
is not set, or is null, the value of the related *Oracledb* property
will be used.

Note that the `poolAttrs` parameter may have configuration
properties that are not used by the `createPool()` method.  These are
ignored.

The properties of `poolAttrs` are described below.


```
String user
```

The database user name.  Can be a simple user name or a proxy of the form *alison[fred]*. See the
[Client Access Through a Proxy](https://docs.oracle.com/database/122/LNOCI/oci-programming-basics.htm#GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC)
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

Indicate whether connections should be established using
[External Authentication](#extauth).

This optional property overrides the
[`oracledb.externalAuth`](#propdbisexternalauth) property.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

```
Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

This optional property overrides the
[`oracledb.stmtCacheSize`](#propdbstmtcachesize) property.
<a name="createpoolpoolattrspoolalias"></a>
```
String poolAlias
```

The `poolAlias` is an optional property that is used to explicitly add pools to the
connection pool cache. If a pool alias is provided, then the new pool will be added
to the connection pool cache and the `poolAlias` value can then be used with methods
that utilize the connection pool cache, such as [`oracledb.getPool()`](#getpool) and
[`oracledb.getConnection()`](#getconnectiondb).

See [Connection Pool Cache](#connpoolcache) for details and examples.

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

This optional property overrides the
[`oracledb.poolIncrement`](#propdbpoolincrement) property.

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

This optional property overrides the
[`oracledb.poolMax`](#propdbpoolmax) property.

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

This optional property overrides the
[`oracledb.poolMin`](#propdbpoolmin) property.

```
Number poolPingInterval
```

When a pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool for at least `poolPingInterval`
seconds, an internal "ping" will be performed first to check the
aliveness of the connection.

Note this attribute is ignored when node-oracledb is built with Oracle
client 12.2, since this has its own lightweight, always-enabled
connection check.

This optional property overrides the
[`oracledb.poolPingInterval`](#propdbpoolpinginterval) property.

```
Number poolTimeout
```

The number of seconds after which idle connections (unused in the
pool) may be terminated.  Idle connections are terminated only when
the pool is accessed.  If `poolTimeout` is set to 0, then idle
connections are never terminated.

This optional property overrides the
[`oracledb.poolTimeout`](#propdbpooltimeout) property.

```
Boolean queueRequests
```

Indicate whether [`pool.getConnection()`](#getconnectionpool)
(or [`oracledb.getConnection()`](#getconnectiondb) calls that use a pool)
should be queued when all available connections in the pool are currently in use.

This optional property overrides the
[`oracledb.queueRequests`](#propdbqueuerequests) property.

```
Number queueTimeout
```

The number of milliseconds after which connection requests waiting in the
connection request queue are terminated.  If `queueTimeout` is
set to 0, then queued connection requests are never terminated.

This optional property overrides the
[`oracledb.queueTimeout`](#propdbqueuetimeout) property.

```
function(Error error, Pool pool)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createPool()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Pool pool*   | The newly created connection pool. If `createPool()` fails, `pool` will be NULL.  See [Pool class](#poolclass) for more information.

#### <a name="getconnectiondb"></a> 3.3.2 `oracledb.getConnection()`

##### Prototype

Callback:
```
getConnection([String poolAlias | Object connAttrs], function(Error error, Connection conn){});
```
Promise:
```
promise = getConnection([String poolAlias | Object connAttrs]);
```

##### Description

Obtains a connection from a pool in the [connection pool cache](#connpoolcache) or creates a new,
non-pooled connection.

For situations where connections are used infrequently, creating a new connection
may be more efficient than creating and managing a connection pool. However, in
most cases, Oracle recommends getting connections from a [connection pool](#createpool).

The following table shows the various signatures that can be used when invoking
`getConnection` and describes how the function will behave as a result.

Signature | Description
--------- | -----------
`oracledb.getConnection()` | Gets a connection from the previously created default pool.  Returns a promise.
`oracledb.getConnection(callback)` | Gets a connection from the previously created default pool.  Invokes the callback.
`oracledb.getConnection(poolAlias)` | Gets a connection from the previously created pool with the specified `poolAlias`.  Returns a promise.
`oracledb.getConnection(poolAlias, callback)` | Gets a connection from the previously created pool with the specified `poolAlias`.  Invokes the callback.
`oracledb.getConnection(connAttrs)` | Creates a standalone, non-pooled connection. Returns a promise.
`oracledb.getConnection(connAttrs, callback)` | Creates a standalone, non-pooled connection.  Invokes the callback.

See [Connection Handling](#connectionhandling) for more information on
connections.

##### Parameters

```
String poolAlias
```

The `poolAlias` parameter is used to specify which pool in the connection pool
cache to use to obtain the connection.

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

This optional property overrides the
[`oracledb.externalAuth`](#propdbisexternalauth) property.

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
[`oracledb.stmtCacheSize`](#propdbstmtcachesize) property.

```
function(Error error, Connection conn)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.  If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

#### <a name="getpool"></a> 3.3.3 `oracledb.getPool()`

##### Prototype

```
getPool([String poolAlias]);
```

##### Description

Retrieves a pool from the [connection pool cache](#connpoolcache). Note that this is a synchronous
method.

##### Parameters

```
String poolAlias
```

The pool alias of the pool to retrieve from the connection pool cache. The default
value is 'default' which will retrieve the default pool.

## <a name="connectionclass"></a> 4. Connection Class

A *Connection* object is obtained by a *Pool* class
[`getConnection()`](#getconnectionpool) or
*Oracledb* class [`getConnection()`](#getconnectiondb)
call.

The connection is used to access an Oracle database.

### <a name="connectionproperties"></a> 4.1 Connection Properties

The properties of a *Connection* object are listed below.

#### <a name="propconnaction"></a> 4.1.1 `connection.action`

```
writeonly String action
```

The [action](https://docs.oracle.com/database/122/LNOCI/managing-scalable-platforms.htm#LNOCI-GUID-624A4771-58C5-4E2B-8131-E3389F58A0D6)
attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnclientid"></a> 4.1.2 `connection.clientId`

```
writeonly String clientId
```

The [client
identifier](https://docs.oracle.com/database/122/LNOCI/managing-scalable-platforms.htm#LNOCI-GUID-8A9F1295-4360-4AC6-99A4-050C5C82E0B0)
for end-to-end application tracing, use with mid-tier authentication,
and with [Virtual Private Databases](https://docs.oracle.com/database/122/CNCPT/topics-for-database-administrators-and-developers.htm#GUID-89DB0C3C-A36F-4254-8C82-020F5F6DE31F).

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnmodule"></a> 4.1.3 `connection.module`

```
writeonly String module
```

The [module](https://docs.oracle.com/database/122/LNOCI/managing-scalable-platforms.htm#LNOCI-GUID-624A4771-58C5-4E2B-8131-E3389F58A0D6)
attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnoracleserverversion"></a> 4.1.4 `connection.oracleServerVersion`

```
readonly Number oracleServerVersion
```

This readonly property gives a numeric representation of the Oracle database version.
For version *a.b.c.d.e*, this property gives the number: `(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e`

#### <a name="propconnstmtcachesize"></a> 4.1.5 `connection.stmtCacheSize`

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of the connection.  The default value is
the `stmtCacheSize` property in effect in the *Pool* object when the
connection is created in the pool.

### <a name="connectionmethods"></a> 4.2 Connection Methods

#### <a name="break"></a> 4.2.1 `connection.break()`

##### Prototype

Callback:
```
break(function(Error error){});
```
Promise:
```
promise = break();
```

##### Description

This call stops the currently running operation on the connection.

If there is no operation in progress or the operation has completed by
the time the break is issued, the `break()` is effectively a no-op.

If the running asynchronous operation is interrupted, its callback
will return an error.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `break()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="connectionclose"></a> 4.2.2 `connection.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

Releases a connection.  If the connection was obtained from the pool,
the connection is returned to the pool and is available for reuse.

Calling `close()` as soon as a connection is no longer required is
strongly encouraged.  Releasing early can improve system efficiency.
Calling `close()` for pooled connections is required to prevent the
pool running out of connections.

When a connection is released, any ongoing transaction on the
connection is rolled back.

After releasing a connection to a pool, there is no
guarantee a subsequent `getConnection()` call gets back the same
database connection.  The application must redo any ALTER SESSION
statements on the new connection object, as required.

If an error occurs on a pooled connection and that error is known to
make the connection unusable, then `close()` will drop that connection
from the connection pool.  So a future pooled `getConnection()` call
that grows the pool will create a new, valid connection.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="commit"></a> 4.2.3 `connection.commit()`

##### Prototype

Callback:
```
commit(function(Error error){});
```
Promise:
```
promise = commit();
```

##### Description

This call commits the current transaction in progress on the connection.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `commit()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="connectioncreatelob"></a> 4.2.4 `connection.createLob()`

##### Prototype

Callback:
```
createLob(Number type, function(Error error, Lob lob){});
```
Promise:
```
promise = createLob(Number type);
```

##### Description

Creates a [Lob](#lobclass) as an Oracle
[temporary LOB](http://docs.oracle.com/database/122/ADLOB/introduction-to-large-objects.htm#ADLOB45120).
The LOB is initially empty.  Data can be streamed to the LOB, which
can then be passed into PL/SQL blocks, or inserted into the database.

When no longer required, Lobs created with `createLob()` should be
closed with [`lob.close()`](#lobclose) because Oracle Database
resources will be held open if temporary LOBs are not closed.  If the
application does not explicitly call `lob.close()`, then the temporary
tablespace storage for LOBs created with `createLob()` is freed when a
non-pooled connection is closed, or when a pooled connection is
removed from a pool due to pool shrinkage or pool termination.  The
temporary tablespace storage is also freed at end of scope, as long as
the connection is still open.

Open temporary LOB usage can be monitored using the view
[`V$TEMPORARY_LOBS`](http://docs.oracle.com/database/122/ADLOB/managing-LOBs.htm#ADLOB45157).

LOBs created with `createLob()` can be bound for IN and for OUT binds,
but not for IN OUT binds.  This is to stop temporary LOB leaks where
node-oracledb is unable to free resources held by the initial
temporary LOB.

See [Working with CLOB and BLOB Data](#lobhandling) and [LOB Bind Parameters](#lobbinds) for more information.

##### Parameters

```
Number type
```

One of the [`oracledb.CLOB`](#oracledbconstantsnodbtype)
or [`oracledb.BLOB`](#oracledbconstantsnodbtype) constants.

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createLob()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).


#### <a name="execute"></a> 4.2.5 `connection.execute()`

##### Prototype

Callback:
```
execute(String sql, [Object bindParams, [Object options,]] function(Error error, [Object result]){});
```
Promise:
```
promise = execute(String sql, [Object bindParams, [Object options]]);
```

##### Description

This call executes a SQL or PL/SQL statement.  See [SQL Execution](#sqlexecution) for examples.

The statement to be executed may contain [IN binds](#inbind),
[OUT or IN OUT](#outbind) bind values or variables, which are bound
using either an object or an array.

A callback function returns a [`result`](#executecallback) object, containing any fetched
rows, the values of any OUT and IN OUT bind variables, and the number
of rows affected by the execution of
[DML](https://docs.oracle.com/database/122/CNCPT/sql.htm#GUID-90EA5D9B-76F2-4916-9F7E-CF0D8AA1A09D)
statements.

##### Parameters


Parameter | Description
----------|------------
[`String sql`](#executesqlparam) | The SQL string that is executed. The SQL string may contain bind parameters.
[`Object bindParams`](#executebindParams) | This function parameter is needed if there are bind parameters in the SQL statement.
[`Object options`](#executeoptions) | This is an optional parameter to `execute()` that may be used to control statement execution.
[`function(Error error, [Object result])`](#executecallback) | Callback function with the execution results.

The parameters are discussed in the next sections.

##### <a name="executesqlparam"></a> 4.2.5.1 `execute()`: SQL Statement

```
String sql
```

The SQL or PL/SQL statement that `execute()` executes. The statement
may contain bind variables.

##### <a name="executebindParams"></a> 4.2.5.2 `execute()`: Bind Parameters
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
`dir` | The direction of the bind.  One of the [Oracledb Constants](#oracledbconstantsbinddir) `BIND_IN`, `BIND_INOUT`, or `BIND_OUT`.
`maxArraySize` | The number of array elements to be allocated for a PL/SQL Collection `INDEX OF` associative array OUT or IN OUT array bind variable.
`maxSize` | The maximum number of bytes that an OUT or IN OUT bind variable of type `STRING` or `BUFFER` can use to get data. The default value is 200. The maximum limit depends on the database type.
`type` | The datatype to be bound. One of the [Oracledb Constants](#oracledbconstantsbinddir) `BLOB`, `BUFFER`, `CLOB`, `CURSOR`, `DATE`, `NUMBER`, or `STRING`.
`val` | The input value or variable to be used for an IN or IN OUT bind variable.

The limit for `maxSize` when binding as a `BUFFER` type is 2000 bytes,
and as a `STRING` is 4000 bytes unless you are using Oracle Database
12c and the database initialization parameter `MAX_STRING_SIZE` has a
value of `EXTENDED`.  In this case the limit is 32767 bytes.

When binding Oracle LOBs, as `STRING` or `BUFFER`, the value of
`maxSize` can be much larger, see the limits
in [LOB Bind Parameters](#lobbinds).

When binding IN OUT, then `maxSize` refers to the size of the returned
value.  The input value can be smaller or bigger.

With OUT binds, where the type cannot be inferred by node-oracledb
because there is no input data value, the type defaults to `STRING`
whenever `type` is not specified.

Note `CURSOR` bind variables can be used only for PL/SQL OUT binds.

##### <a name="executeoptions"></a> 4.2.5.3 `execute()`: Options

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
a statement.

###### <a name="propexecautocommit"></a> 4.2.5.3.1 `autoCommit`

```
Boolean autoCommit
```

Overrides [`oracledb.autoCommit`](#propdbisautocommit).

###### <a name="propexecextendedmetadata"></a> 4.2.5.3.2 `extendedMetaData`

```
Boolean extendedMetaData
```

Overrides [`oracledb.extendedMetaData`](#propdbextendedmetadata).

###### <a name="propfetchinfo"></a> <a name="propexecfetchinfo"></a> 4.2.5.3.3 `fetchInfo`

```
Object fetchInfo
```

Object defining how query column data should be represented in JavaScript.

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

The valid values for `type` are [`STRING`](#oracledbconstantsnodbtype) and
[`DEFAULT`](#oracledbconstantsnodbtype).  The former indicates that the given
column should be returned as a string.  The latter can be used to
override any global mapping given by
[`fetchAsString`](#propdbfetchasstring) and allow the column data for
this query to be returned in native format.

The maximum length of a string created by type mapping is 200 bytes.
However, if a database column that is already of type `STRING` is
specified in `fetchInfo`, then the actual database metadata will be
used to determine the maximum length.

Columns fetched from REF CURSORS are not mapped by `fetchInfo`
settings in the `execute()` call.  Use the global
[`fetchAsString`](#propdbfetchasstring) instead.

See [Result Type Mapping](#typemap) for more information on query type
mapping.

###### <a name="propexecmaxrows"></a> 4.2.5.3.4 `maxRows`

```
Number maxRows
```

Overrides [`oracledb.maxRows`](#propdbmaxrows).

###### <a name="propexecoutformat"></a> 4.2.5.3.5 `outFormat`

```
String outFormat
```

Overrides [`oracledb.outFormat`](#propdboutformat).

###### <a name="propexecprefetchrows"></a> 4.2.5.3.6 `prefetchRows`

```
Number prefetchRows
```

Overrides [`oracledb.prefetchRows`](#propdbprefetchrows).

###### <a name="propexecresultset"></a> 4.2.5.3.7 `resultSet`

```
Boolean resultSet
```

Determines whether query results should be returned as a
[`ResultSet`](#resultsetclass) object or directly.  The default is
`false`.

##### <a name="executecallback"></a> 4.2.5.4 `execute()`: Callback Function

```
function(Error error, [Object result])
```

The parameters of the `execute()` callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `execute()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Object result* | The [`result`](#resultobject) object, described below. For DDL statements and DML where the application only checks `error` for success or failure, the `result` parameter can be omitted.

##### <a name="resultobject"></a> Result Object Properties

The properties of `result` object from the `execute()` callback are described below.

###### <a name="execmetadata"></a> 4.2.5.4.1 `metaData`

```
readonly Array metaData
```

For `SELECT` statements, this contains an array of objects describing
details of columns for the select list.  For non queries, this property is undefined.

Each column's `name` is always given.  If the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `execute()` option
[`extendedMetaData`](#propexecextendedmetadata) are `true` then
additional information is included.

- `name`: The column name follows Oracle's standard name-casing rules.  It will commonly be uppercase, since most applications create tables using unquoted, case-insensitive names.
- `fetchType`: one of the [Node-oracledb Type Constant](#oracledbconstantsnodbtype) values.
- `dbType`: one of the [Oracle Database Type Constant](#oracledbconstantsdbtype) values.
- `byteSize`: the database byte size.  This is only set for `DB_TYPE_VARCHAR`, `DB_TYPE_CHAR` and `DB_TYPE_RAW` column types.
- `precision`: set only for `DB_TYPE_NUMBER`, `DB_TYPE_TIMESTAMP`, `DB_TYPE_TIMESTAMP_TZ` and `DB_TYPE_TIMESTAMP_LTZ` columns.
- `scale`: set only for `DB_TYPE_NUMBER` columns.
- `nullable`: indicates whether `NULL` values are permitted for this column.

For numeric columns: when `precision` is `0`, then the column is
simply a `NUMBER`.  If `precision` is nonzero and `scale` is `-127`,
then the column is a `FLOAT`.  Otherwise, it is a `NUMBER(precision,
scale)`.

Metadata for Result Sets and REF CURSORS is available in a
[ResultSet property](#rsmetadata).  For Lobs, a
[Lob type property](#proplobtype) also indicates whether the object is
a `BLOB` or `CLOB`.

See [Query Column Metadata](#querymeta) for examples.

###### <a name="execoutbinds"></a> 4.2.5.4.2 `outBinds`

```
Array/object outBinds
```

This is either an array or an object containing OUT and IN OUT bind
values. If [`bindParams`](#executebindParams) is passed as an array,
then `outBinds` is returned as an array. If `bindParams` is passed as
an object, then `outBinds` is returned as an object.

###### <a name="execresultset"></a> 4.2.5.4.3 `resultSet`

```
Object resultSet
```

For `SELECT` statements when the [`resultSet`](#executeoptions)
option is `true`, use the `resultSet` object to fetch rows.  See
[ResultSet Class](#resultsetclass).

###### <a name="execrows"></a> 4.2.5.4.4 `rows`

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

###### <a name="execrowsaffected"></a> 4.2.5.4.5 `rowsAffected`

```
Number rowsAffected
```

For
[DML](https://docs.oracle.com/database/122/CNCPT/sql.htm#GUID-90EA5D9B-76F2-4916-9F7E-CF0D8AA1A09D)
statements (including SELECT FOR UPDATE) this contains the number of
rows affected, for example the number of rows inserted. For non-DML
statements such as queries, or if no rows are affected, then
`rowsAffected` will appear as undefined.

#### <a name="querystream"></a> 4.2.6 `connection.queryStream()`

##### Prototype

```
queryStream(String sql, [Object bindParams, [Object options]]);
```

##### Return Value

This method will return a
[Readable Stream](https://nodejs.org/api/stream.html) for queries.

##### Description

This function provides query streaming support.  The parameters are
the same as [`execute()`](#execute) except a callback is not used.
Instead this function returns a stream used to fetch data.

Each row is returned as a `data` event.  Query metadata is available
via a `metadata` event.  The `end` event indicates the end of the
query results.

Query results must be fetched to completion to avoid resource leaks.

The connection must remain open until the stream is completely read.

For tuning purposes the [`oracledb.maxRows`](#propdbmaxrows) property
can be used to size an internal buffer used by `queryStream()`.  Note
it does not limit the number of rows returned by the stream.  The
[`oracledb.prefetchRows`](#propdbprefetchrows) value will also affect
performance.

See [Streaming Query Results](#streamingresults) for more information.

##### Parameters

See [execute()](#execute).

#### <a name="release"></a> 4.2.7 `connection.release()`

An alias for [connection.close()](#connectionclose).

#### <a name="rollback"></a> 4.2.8 `connection.rollback()`

##### Prototype

Callback:
```
rollback(function(Error error){});
```
Promise:
```
promise = rollback();
```

##### Description

This call rolls back the current transaction in progress on the
connection.

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
[Node.js Stream](https://nodejs.org/api/stream.html) interface.

See [Working with CLOB and BLOB Data](#lobhandling) and [LOB Bind Parameters](#lobbinds) for more information.

### <a name="lobproperties"></a> 5.1 Lob Properties

The properties of a Lob object are listed below.

#### <a name="proplobchunksize"></a> 5.1.1 `lob.chunkSize`

```
readonly Number chunkSize
```

This corresponds to the size used by the Oracle LOB layer when
accessing or modifying the LOB value.

#### <a name="proploblength"></a> 5.1.2 `lob.length`

```
readonly Number length
```

Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs).

#### <a name="proplobpiecesize"></a> 5.1.3 `lob.pieceSize`

```
Number pieceSize
```

The number of bytes (for BLOBs) or characters (for CLOBs) to read for
each Stream 'data' event of a queried LOB.

The default value is [`chunkSize`](#proplobchunksize).

For efficiency, it is recommended that `pieceSize` be a multiple of
`chunkSize`.

The property should not be reset in the middle of streaming since data
will be lost when internal buffers are resized.

The maximum value for `pieceSize` is limited to the value of UINT_MAX.

#### <a name="proplobtype"></a> 5.1.4 `lob.type`

```
readonly Number type
```

This read-only attribute shows the type of Lob being used.  It will
have the value of one of the constants
[`Oracledb.BLOB`](#oracledbconstantsnodbtype) or
[`Oracledb.CLOB`](#oracledbconstantsnodbtype).  The value is derived from the
bind type when using LOB bind variables, or from the column type when
a LOB is returned by a query.

### <a name="lobmethods"></a> 5.2 Lob Methods

#### <a name="lobclose"></a> 5.2.1 `lob.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

Explicitly closes a Lob.

Lobs created with [`createLob()`](#connectioncreatelob) should be
explicitly closed with [`lob.close()`](#lobclose) when no longer
needed.  This frees resources in node-oracledb and in Oracle Database.

Persistent or temporary Lobs returned from the database may also be
closed with `lob.close()` as long as streaming is not currently
happening.  Note these Lobs are automatically closed when streamed or
used as the source for an IN OUT bind.  If you try to close a Lob
being used for streaming you will get the error *NJS-023: concurrent
operations on a Lob are not allowed*.

The `lob.close()` method emits
the [Node.js Stream](https://nodejs.org/api/stream.html) 'close' event
unless the Lob has already been explicitly or automatically closed.

The connection must be open when calling `lob.close()` on a temporary
LOB, such as those created by `createLob()`.

Once a Lob is closed, it cannot be bound.

See [Closing Lobs](#closinglobs) for more discussion.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="poolclass"></a> 6. Pool Class

A connection *Pool* object is created by calling the
[`oracledb.createPool()`](#createpool) method.

The *Pool* object obtains connections to the Oracle database using the
`getConnection()` method to "check them out" from the pool. Internally
[OCI Session Pooling](https://docs.oracle.com/database/122/LNOCI/oci-programming-advanced-topics.htm#LNOCI16617)
is used.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the `close()` method on the Pool object.

See [Connection Pooling](#connpooling) for more information.

### <a name="poolproperties"></a> 6.1 Pool Properties

The *Pool* object properties may be read to determine the current
values.

#### <a name="proppoolconnectionsinuse"></a> 6.1.1 `pool.connectionsInUse`

```
readonly Number connectionsInUse
```

The number of currently active connections in the connection pool
i.e. the number of connections currently "checked out" using
`getConnection()`.

#### <a name="proppoolconnectionsopen"></a> 6.1.2 `pool.connectionsOpen`

```
readonly Number connectionsOpen
```

The number of currently open connections in the underlying connection
pool.

#### <a name="proppoolpoolalias"></a> 6.1.3 `pool.poolAlias`

```
readonly Number poolAlias
```

The alias of this pool in the [connection pool cache](#connpoolcache).  An alias cannot be changed once the pool has been created.

#### <a name="proppoolpoolincrement"></a> 6.1.4 `pool.poolIncrement`

```
readonly Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

See [`oracledb.poolIncrement`](#propdbpoolincrement).

#### <a name="proppoolpoolmax"></a> 6.1.5 `pool.poolMax`

```
readonly Number poolMax
```

The maximum number of connections that can be open in the connection
pool.

See [`oracledb.poolMax`](#propdbpoolmax).

#### <a name="proppoolpoolmin"></a> 6.1.6 `pool.poolMin`

```
readonly Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

See [`oracledb.poolMin`](#propdbpoolmin).

#### <a name="proppoolpoolpinginterval"></a> 6.1.7 `pool.poolPingInterval`

```
readonly Number poolPingInterval
```

The maximum number of seconds that a connection can remain idle in a
connection pool (not "checked out" to the application by
`getConnection()`) before node-oracledb pings the database prior to
returning that connection to the application.

See [`oracledb.poolPingInterval`](#propdbpoolpinginterval).

#### <a name="proppoolpooltimeout"></a> 6.1.8 `pool.poolTimeout`

```
readonly Number poolTimeout
```

The time (in seconds) after which the pool terminates idle connections
(unused in the pool). The number of connections does not drop below
poolMin.

See [`oracledb.poolTimeout`](#propdbpooltimeout).

#### <a name="proppoolqueuerequests"></a> 6.1.9 `pool.queueRequests`

```
readonly Boolean queueRequests
```

Determines whether requests for connections from the pool are queued
when the number of connections "checked out" from the pool has reached
the maximum number specified by [`poolMax`](#propdbpoolmax).

See [`oracledb.queueRequests`](#propdbqueuerequests).

#### <a name="proppoolqueueTimeout"></a> 6.1.10 `pool.queueTimeout`

```
readonly Number queueTimeout
```

The time (in milliseconds) that a connection request should wait in
the queue before the request is terminated.

See [`oracledb.queueTimeout`](#propdbqueuetimeout).

#### <a name="proppoolstmtcachesize"></a> 6.1.11 `pool.stmtCacheSize`

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

See [`oracledb.stmtCacheSize`](#propdbstmtcachesize).

### <a name="poolmethods"></a> 6.2 Pool Methods

#### <a name="poolclose"></a> 6.2.1 `pool.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

This call terminates the connection pool.

Any open connections should be released with [`connection.close()`](#connectionclose)
before `pool.close()` is called.

If the pool is in the [connection pool cache](#connpoolcache) it will be removed from the cache.

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).


#### <a name="getconnectionpool"></a> 6.2.2 `pool.getConnection()`

##### Prototype

Callback:
```
getConnection(function(Error error, Connection conn){});
```
Promise:
```
promise = getConnection();
```

##### Description

This method obtains a connection from the connection pool.

If a previously opened connection is available in the pool, that
connection is returned.  If all connections in the pool are in use, a
new connection is created and returned to the caller, as long as the
number of connections does not exceed the specified maximum for the
pool. If the pool is at its maximum limit, the `getConnection()` call
results in an error, such as *ORA-24418: Cannot open further sessions*.

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

#### <a name="terminate"></a> 6.2.3 `pool.terminate()`

An alias for [pool.close()](#poolclose).

## <a name="resultsetclass"></a> 7. ResultSet Class

Result Sets allow query results to fetched from the database one at a
time, or in groups of rows.  They can also be converted to Readable
Streams.  Result Sets enable applications to process very large data
sets.

Result Sets should also be used where the number of query rows cannot
be predicted and may be larger than a sensible
[`maxRows`](#propdbmaxrows) size.

A *ResultSet* object is obtained by setting `resultSet: true` in the
`options` parameter of the *Connection* [`execute()`](#execute) method
when executing a query.  A *ResultSet* is also returned to
node-oracledb when binding as type [`CURSOR`](#oracledbconstantsnodbtype) to a
PL/SQL REF CURSOR bind parameter.

The value of [`prefetchRows`](#propdbprefetchrows) can be adjusted to
tune the performance of Result Sets.

See [ResultSet Handling](#resultsethandling) for more information on Result Sets.

### <a name="resultsetproperties"></a> 7.1 ResultSet Properties

The properties of a *ResultSet* object are listed below.

#### <a name="rsmetadata"></a> 7.1.1 `resultset.metaData`

```
readonly Array metaData
```

Contains an array of objects with metadata about the query or REF
CURSOR columns.

Each column's `name` is always given.  If the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `execute()` option
[`extendedMetaData`](#propexecextendedmetadata) are `true` then
additional information is included.

See [`result.metaData`](#execmetadata) for the available attributes.

### <a name="resultsetmethods"></a> 7.2 ResultSet Methods

#### <a name="close"></a> 7.2.1 `resultset.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

Closes a `ResultSet`.  Applications should always call this at the end
of fetch or when no more rows are needed.

#### <a name="getrow"></a> 7.2.2 `resultset.getRow()`

##### Prototype

Callback:
```
getRow(function(Error error, Object row){});
```
Promise:
```
promise = getRow();
```

##### Description

This call fetches one row of the Result Set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `ResultSet` should be freed by calling [`close()`](#close).

#### <a name="getrows"></a> 7.2.3 `resultset.getRows()`

##### Prototype

Callback:
```
getRows(Number numRows, function(Error error, Array rows){});
```
Promise:
```
promise = getRows(Number numRows);
```

##### Description

This call fetches `numRows` rows of the Result Set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `ResultSet` should be freed by calling [`close()`](#close).

#### <a name="toquerystream"></a> 7.2.4 `resultset.toQueryStream()`

##### Prototype

```
toQueryStream();
```

##### Return Value

This method will return a
[Readable Stream](https://nodejs.org/api/stream.html).

##### Description

This synchronous method converts a ResultSet into a stream.

It can be used to make ResultSets from top-level queries or from REF
CURSOR bind variables streamable.  To make top-level queries
streamable, the alternative [`connection.queryStream()`](#querystream)
method may be easier to use.

See [Streaming Query Results](#streamingresults) for more information.

## <a name="connectionhandling"></a> 8. Connection Handling

In applications which use connections infrequently, create a connection
with [`oracledb.getConnection()`](#getconnectiondb):

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

Connections should be released with [`connection.close()`](#connectionclose) when no
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

    connection.close(
      function(err)
      {
        if (err) { console.error(err.message); }
      });
  });
```

Applications which are heavy users of connections should create and
use a [Connection Pool](#connpooling).

### <a name="connectionstrings"></a> 8.1 Connection Strings

The `connectString` parameter for [`oracledb.getConnection()`](#getconnectiondb) and
[`pool.getConnection()`](#getconnectionpool) can be an Easy
Connect string, or a Net Service Name from a local `tnsnames.ora` file
or external naming service, or it can be the SID of a local Oracle
database instance.

If `connectString` is not specified, the empty string "" is used which
indicates to connect to the local, default database.

#### <a name="easyconnect"></a> 8.1.1 Easy Connect Syntax for Connection Strings

An Easy Connect string is often the simplest to use.  With Oracle Database 12c
the syntax is:

```
[//]host_name[:port][/service_name][:server_type][/instance_name]
```

Note that old-school connection SIDs are not supported: only instance names can be used.

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

Applications that request [DRCP](#drcp) connections, for example with
`myhost/XE:pooled`, must use local [Connection Pooling](#connpooling).

For more information on Easy Connect strings see
[Understanding the Easy Connect Naming Method](https://docs.oracle.com/database/122/NETAG/configuring-naming-methods.htm#NETAG255)
in the Oracle documentation.

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

Applications that request [DRCP](#drcp) connections, for example where
the `tnsnames.ora` connection description contains `(SERVER=POOLED)`,
must use local [Connection Pooling](#connpooling).

For more information on `tnsnames.ora` files see
[General Syntax of tnsnames.ora](https://docs.oracle.com/database/122/NETRF/local-naming-parameters-in-tnsnames-ora-file.htm#NETRF1361)
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
[SID](https://docs.oracle.com/database/122/NETRF/glossary.htm#GUID-145065A5-C9C7-4E77-9BBB-8028960D005E),
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

### <a name="numberofthreads"></a> 8.2 Connections and Number of Threads

If you use a large number of connections, such as via increasing
[`poolMax`](#proppoolpoolmax), you may want to also increase the
number of threads available to node-oracledb.

Node.js worker threads executing database statements on a connection will
commonly wait until round-trips between node-oracledb and the database
are complete.  When an application handles a sustained number of user
requests, and database operations take some time to execute or the
network is slow, then the four default threads may all be held in
use. This prevents other connections from beginning work and stops
Node.js from handling more user load.  Increasing the number of worker
threads may improve throughput.  Do this by setting the environment
variable
[UV_THREADPOOL_SIZE](https://docs.libuv.org/en/v1.x/threadpool.html)
before starting Node.

For example, in a Linux terminal, the number of Node.js worker threads
can be increased to 10 by using the following command:

```
$ UV_THREADPOOL_SIZE=10 node myapp.js
```

### <a name="connpooling"></a> 8.3 Connection Pooling

When applications use a lot of connections for short periods, Oracle
recommends using a connection pool for efficiency.  Each pool can
contain one or more connections.  A pool can grow or shrink, as
needed.  Each node-oracledb process can use one or more local pools of
connections.

Pool expansion happens when the following are all true:
(i) [`getConnection()`](#getconnectionpool) is called and (ii) all the
currently established connections in the pool are "checked out" by
previous `getConnection()` calls and are in-use by the application,
and (iii) the number of those connections is less than the pool's
`poolMax` setting.

A pool is created by calling the
[`oracledb.createPool()`](#createpool) method. Internally
[OCI Session Pooling](https://docs.oracle.com/database/122/LNOCI/oci-programming-advanced-topics.htm#LNOCI16617)
is used.

A connection is returned with the
[`pool.getConnection()`](#getconnectionpool) function:

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

Connections should be released with [`connection.close()`](#connectionclose) when no
longer needed:

```javascript
    connection.close(
      function(err)
      {
        if (err) { console.error(err.message); }
      });
```

Make sure to release connections in all codes paths, include error
handlers.

After an application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the [`pool.close()`](#poolclose) method.

The growth characteristics of a connection pool are determined by the
Pool attributes [`poolIncrement`](#proppoolpoolincrement),
[`poolMax`](#proppoolpoolmax), [`poolMin`](#proppoolpoolmin) and
[`poolTimeout`](#proppoolpooltimeout).  Note that when External
Authentication is used, the pool behavior is different, see
[External Authentication](#extauth).

The Pool attribute [`stmtCacheSize`](#propconnstmtcachesize) can be
used to set the statement cache size used by connections in the pool,
see [Statement Caching](#stmtcache).

#### <a name="connpoolcache"></a> 8.3.1 Connection Pool Cache

Node-oracledb has an internal connection pool cache which can be used
to facilitate sharing pools across modules and simplify getting
connections.  At creation time, a pool can be given a named alias.
The alias can later be used to retrieve the related pool object for
use.

Methods that can affect or use the connection pool cache include:
- [oracledb.createPool()](#createpool) - can add a pool to the cache
- [oracledb.getPool()](#getpool) - retrieves a pool from the cache (synchronous)
- [oracledb.getConnection()](#getconnectiondb) - can use a pool in the cache to retrieve connections
- [pool.close()](#poolclose) - automatically removes the pool from the cache if needed

Pools are added to the cache if
a [`poolAlias`](#createpoolpoolattrspoolalias) property is provided in
the [`poolAttrs`](#createpoolpoolattrs) object when invoking
`oracledb.createPool()`.  There can be multiple pools in the cache if
each pool is created with a unique alias.

If a pool is created without providing a pool alias, and a pool with
an alias of 'default' is not in the cache already, this pool will be
cached using the alias 'default'.  This pool is used by default in
methods that utilize the connection pool cache.  If subsequent pools
are created without explicit aliases, they will be not stored in the
pool cache.

##### Examples using the default pool

Assuming the connection pool cache is empty, the following will create a new pool
and cache it using the pool alias 'default':
```javascript
var oracledb = require('oracledb');

oracledb.createPool (
  {
    user: 'hr',
    password: 'welcome',
    connectString: 'localhost/XE'
  },
  function(err, pool) {
    console.log(pool.poolAlias); // 'default'
  }
);
```

Note that `createPool()` is not synchronous.

Once cached, the default pool can be retrieved using [oracledb.getPool()](#getpool) without
passing the `poolAlias` parameter:

```javascript
var oracledb = require('oracledb');
var pool = oracledb.getPool();

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

This specific sequence can be simplified by using the shortcut to
[oracledb.getConnection()](#getconnectiondb) that returns a connection
from a pool:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(function(err, conn) {
  . . . // Use connection from the previously created 'default' pool and then release it
});
```

##### Examples using multiple pools

If the application needs to use more than one pool at a time, unique pool aliases
can be used when creating the pools:

```javascript
var oracledb = require('oracledb');

var hrPoolPromise = oracledb.createPool({
  poolAlias: 'hrpool',
  users: 'hr',
  password: 'welcome',
  connectString: 'localhost/XE'
});

var shPoolPromise = oracledb.createPool({
  poolAlias: 'shpool',
  user: 'sh',
  password: 'welcome',
  connectString: 'localhost/XE'
});

Promise.all([hrPoolPromise, shPoolPromise])
  .then(function(pools) {
    console.log(pools[0].poolAlias); // 'hrpool'
    console.log(pools[1].poolAlias); // 'shpool'
  })
  .catch(function(err) {
    . . . // handle error
  })
```

To use the methods or attributes of a pool in the cache, a pool can be retrieved
from the cache by passing its pool alias to [oracledb.getPool()](#getpool):

```javascript
var oracledb = require('oracledb');
var pool = oracledb.getPool('hrpool'); // or 'shpool'

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

The [oracledb.getConnection()](#getconnectiondb) shortcut can also be used with a pool alias:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection('hrpool', function(err, conn) { // or 'shpool'
  . . . // Use connection from the pool and then release it
});
```

#### <a name="connpoolqueue"></a> 8.3.2 Connection Pool Queue

If the application has called `getConnection()` so that all
connections in the pool are in use, and
further [`pool.getConnection()`](#getconnectionpool) requests
(or [`oracledb.getConnection()`](#getconnectiondb) calls that use a
pool) are made, then each new request will be queued until an in-use
connection is released back to the pool
with [`connection.close()`](#connectionclose).  If `poolMax` has not
been reached, then connections can be satisfied and are not queued.

The pool queue can be disabled by setting the pool property
[`queueRequests`](#propdbqueuerequests) to `false`.  When the queue is
disabled, `getConnection()` requests to a pool that cannot immediately be
satisfied will return an error.

The amount of time that a queued request will wait for a free
connection can be configured with [queueTimeout](#propdbqueuetimeout).
When connections are timed out of the queue, they will return the
error *NJS-040: connection request timeout* to the application.

Internally the queue is implemented in node-oracledb's JavaScript top
level.  A queued connection request is dequeued and passed down to
node-oracledb's underlying C++ connection pool when an active
connection is [released](#connectionclose), and the number of
connections in use drops below the value of
[`poolMax`](#proppoolpoolmax).

#### <a name="connpoolmonitor"></a> 8.3.3 Connection Pool Monitoring and Throughput

Connection pool usage should be monitored to choose the appropriate
connection pool settings for your workload.

The Pool attributes [`connectionsInUse`](#proppoolconnectionsinuse)
and [`connectionsOpen`](#proppoolconnectionsopen) provide basic
information about an active pool.

When using a [pool queue](#propdbqueuerequests), further statistics
can be enabled by setting the [`createPool()`](#createpool)
`poolAttrs` parameter `_enableStats` to *true*.  Statistics
can be output to the console by calling the `pool._logStats()`
method.  The underscore prefixes indicate that these are private
attributes and methods.  **This interface may be altered or
enhanced in the future**.

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

The current implementation of `_logStats()` displays pool queue
statistics, pool settings, and related environment variables.

##### Statistics

The statistics displayed by `_logStats()` in this release are:

Statistic                 | Description
--------------------------|-------------
total up time             | The number of milliseconds this pool has been running.
total connection requests | Number of `getConnection()` requests made by the application to this pool.
total requests enqueued   | Number of `getConnection()` requests that could not be immediately satisfied because every connection in this pool was already being used, and so they had to be queued waiting for the application to return an in-use connection to the pool.
total requests dequeued   | Number of `getConnection()` requests that were dequeued when a connection in this pool became available for use.
total requests failed     | Number of `getConnection()` requests that invoked the underlying C++ `getConnection()` callback with an error state. Does not include queue request timeout errors.
total request timeouts    | Number of queued `getConnection()` requests that were timed out after they had spent [queueTimeout](#propdbqueuetimeout) or longer in this pool's queue.
max queue length          | Maximum number of `getConnection()` requests that were ever waiting at one time.
sum of time in queue      | The sum of the time (milliseconds) that dequeued requests spent in the queue.
min time in queue         | The minimum time (milliseconds) that any dequeued request spent in the queue.
max time in queue         | The maximum time (milliseconds) that any dequeued request spent in the queue.
avg time in queue         | The average time (milliseconds) that dequeued requests spent in the queue.
pool connections in use   | The number of connections from this pool that `getConnection()` returned successfully to the application and have not yet been released back to the pool.
pool connections open     | The number of connections in this pool that have been established to the database.

Note that for efficiency, the minimum, maximum, average, and sum of
times in the queue are calculated when requests are removed from the
queue.  They do not take into account times for connection requests
still waiting in the queue.

##### Attribute Values

The `_logStats()` method also shows attribute values in effect for the pool:

Attribute                                   |
--------------------------------------------|
[`poolAlias`](#createpoolpoolattrspoolalias)|
[`queueRequests`](#propdbqueuerequests)     |
[`queueTimeout`](#propdbqueuetimeout)       |
[`poolMin`](#propdbpoolmin)                 |
[`poolMax`](#propdbpoolmax)                 |
[`poolIncrement`](#propdbpoolincrement)     |
[`poolTimeout`](#propdbpooltimeout)         |
[`poolPingInterval`](#propdbpoolpinginterval) |
[`stmtCacheSize`](#propdbstmtcachesize)     |

##### Related Environment Variables

One related environment variable is is shown by `_logStats()`:

Environment Variable                                 | Description
-----------------------------------------------------|-------------
[`process.env.UV_THREADPOOL_SIZE`](#numberofthreads) | The number of worker threads for this process.

#### <a name="connpoolpinging"></a> 8.3.4 Connection Pool Pinging

If node-oracledb uses Oracle client 12.1 or earlier, and when
connections are idle in a connection pool (not "checked out" to the
application by `getConnection()`), there is the possibility that a
network or Database instance failure makes those connections unusable.
A `getConnection()` call will happily return a connection from the
pool but an error occurs when the application later uses the
connection.

Version 12.2 of the underlying Oracle client library has a
lightweight, always-enabled connection check.  It will return a valid
connection to the node-oracledb driver, which in turn returns it via
`getConnection()`.  When node-oracledb is built with Oracle client
12.2, then the value of the `poolPingInterval` attribute described
below is ignored and no explicit ping is executed because it is not
needed.

With Oracle client 12.1 and earlier, when a
pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool for at least `60` seconds then an
internal "ping" will be performed first to check the aliveness of the
connection.  At the cost of some overhead for infrequently accessed
connection pools, connection pinging improves the chance a pooled
connection is valid when it is used because identified un-unusable
connections will not be returned to the application by
`getConnection()`.

For active applications that are getting and releasing connections
rapidly, the connections will not have been idle longer than
`poolPingInterval` and no pings will be needed.

If a ping detects the connection is invalid, for example if the
network had disconnected, then node-oracledb internally drops the
unusable connection and obtains another from the pool.  This second
connection may also need a ping.  This ping-and-release process may be
repeated until:

- an existing connection that doesn't qualify for pinging is obtained. The `getConnection()` call returns this to the application.  Note it is not guaranteed to  be usable
- a new, usable connection is opened. This is returned to the application
- a number of unsuccessful attempts to find a valid connection have been made, after which an error is returned to the application

Applications should continue to do appropriate error checking when
using connections in case they have become invalid in the time since
`getConnection()` was called.  This error checking will also protect
against cases where there was a network outage out but a connection was idle
in the pool for less than `60` seconds and so `getConnection()` did
not ping.  In all cases, when a bad connection
is [released](#connectionclose) back to the pool, the connection is
automatically destroyed.  This allows a valid connection to be opened
by a subsequent `getConnection()` call.

The default ping interval is `60` seconds.  The interval can be set with
the [`oracledb.poolPingInterval`](#propdbpoolpinginterval) property or
during [pool creation](#createpool).

Possible values for `poolPingInterval` are:

Value     | Behavior of a Pool `getConnection()` call
----------|------------------------------------------
`n` < `0` | Never checks for connection aliveness
`0`       | Always checks for connection aliveness. There is some overhead in performing a ping so non-zero values are recommended for most applications
`n` > `0` | Checks aliveness if the connection has been idle in the pool (not "checked out" to the application by `getConnection()`) for at least `n` seconds

### <a name="drcp"></a> 8.4 Database Resident Connection Pooling (DRCP)

[Database Resident Connection Pooling](https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS228) (DRCP)
enables database resource sharing for applications that run in
multiple client processes or run on multiple middle-tier application
servers.  DRCP reduces the overall number of connections that a
database must handle.

DRCP is useful for applications which share the same database credentials, have
similar session settings (for example date format settings and PL/SQL
package state), and where the application gets a database connection,
works on it for a relatively short duration, and then releases it.

To use DRCP in node-oracledb:

1. The DRCP pool must be started in the database: `SQL> execute dbms_connection_pool.start_pool();`
2. The [`connectionClass`](#propdbconclass) should be set by the node-oracledb application.  If it is not set, the pooled server session memory will not be reused optimally.
3. The `getConnection()` property `connectString` must specify to use a pooled server, either by the Easy Connect syntax like `myhost/sales:POOLED`, or by using a `tnsnames.ora` alias for a connection that contains `(SERVER=POOLED)`.

DRCP connections can only be used with node-oracledb's local
[connection pool](#poolclass).  If a standalone (non-local pool)
connection is created with
[`oracledb.getConnection()`](#getconnectiondb) and the `connectString`
indicates a DRCP server should be used, then an error *ORA-56609:
Usage not supported with DRCP* occurs.

The DRCP 'Purity' is SELF for DRCP connections.  This allows reuse of
both the pooled server process and session memory, giving maximum benefit
from DRCP.  See the Oracle documentation on
[benefiting from scalability](https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS1428).

The
[Oracle DRCP documentation](https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS228)
has more details, including when to use, and when not to use DRCP.

There are a number of Oracle Database `V$` views that can be used to
monitor DRCP.  These are discussed in the Oracle documentation and in the
Oracle white paper
[PHP Scalability and High Availability](http://www.oracle.com/technetwork/topics/php/php-scalability-ha-twp-128842.pdf).
This paper also gives more detail on configuring DRCP.

### <a name="extauth"></a> 8.5 External Authentication

External Authentication allows applications to use an external
password store (such as
[Oracle Wallet](https://docs.oracle.com/database/122/DBIMI/using-oracle-wallet-manager.htm#DBIMI162)),
the
[Secure Socket Layer](https://docs.oracle.com/database/122/DBSEG/configuring-secure-sockets-layer-authentication.htm#DBSEG070)
(SSL), or the
[operating system](https://docs.oracle.com/database/122/DBSEG/configuring-authentication.htm#DBSEG30035)
to validate user access.  One of the benefits is that database
credentials do not need to be hard coded in the application.

To use external authentication, set the
[`oracledb.externalAuth`](#propdbisexternalauth) property to *true*.  This property can
also be set in the `connAttrs` or `poolAttrs` parameters of the
[`oracledb.getConnection()`](#getconnectiondb) or
[`oracledb.createPool()`](#createpool) calls, respectively.  The `user` and
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
the [`oracledb.getConnection()`](#getconnectiondb) or
[`pool.getConnection()`](#getconnectionpool) calls will use external
authentication.  Setting this property does not affect the operation
of existing connections or pools.

Using `externalAuth` in the `connAttrs` parameter of a
`pool.getConnection()` call is not possible.  The connections from a *Pool*
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
[`execute()`](#execute) method.  Either the callback style shown
below, or [promises](#promiseoverview) may be used.

After all database calls on the connection complete, the application
should use the [`connection.close()`](#connectionclose) call to
release the connection.

Queries may optionally be streamed using the *Connection*
[`queryStream()`](#querystream) method.

Connections can handle one database operation at a time.  Other
operations will block.  Structure your code to avoid starting parallel
operations on connections.  For example, instead of using
`async.each()` which calls each of its items in parallel, use
`async.eachSeries()`.

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

Any rows beyond the `maxRows` limit are not returned.

#### <a name="resultsethandling"></a> 9.1.2 Result Set Handling

When the number of query rows is relatively big, or can't be
predicted, it is recommended to use a [`ResultSet`](#resultsetclass)
with callbacks, as described in this section, or via the ResultSet
stream wrapper, as described [later](#streamingresults).  This
prevents query results being unexpectedly truncated by the
[`maxRows`](#propdbmaxrows) limit and removes the need to oversize
`maxRows` to avoid such truncation.  Otherwise, for queries that
return a known small number of rows, non-Result Set queries may have
less overhead.

A Result Set is created when the `execute()` option property
[`resultSet`](#executeoptions) is `true`.  Result Set rows can be
fetched using [`getRow()`](#getrow) or [`getRows()`](#getrows) on the
`execute()` callback function's `result.resultSet` parameter property.

For Result Sets, the [`maxRows`](#propdbmaxrows) limit is ignored.  All
rows can be fetched.

When all rows have been fetched, or the application does not want to
continue getting more rows, then the Result Set should be freed using
[`close()`](#close).

REF CURSORS returned from a PL/SQL block via an `oracledb.CURSOR` OUT
bind are also available as a `ResultSet`. See
[REF CURSOR Bind Parameters](#refcursors).

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
  { resultSet: true }, // return a Result Set.  Default is false
  function(err, result)
  {
    if (err) { . . . }
    fetchOneRowFromRS(connection, result.resultSet);
  });
});

function fetchOneRowFromRS(connection, resultSet)
{
  resultSet.getRow( // get one row
    function (err, row)
    {
      if (err) {
         . . .           // close the Result Set and release the connection
      } else if (!row) { // no rows, or no more rows
        . . .            // close the Result Set and release the connection
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
  { resultSet: true }, // return a Result Set.  Default is false
  function(err, result)
  {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.resultSet, numRows);
  });
});

function fetchRowsFromRS(connection, resultSet, numRows)
{
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows)
    {
      if (err) {
         . . .                        // close the Result Set and release the connection
      } else if (rows.length > 0) {   // got some rows
        console.log(rows);            // process rows
        if (rows.length === numRows)  // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else                          // got fewer rows than requested so must be at end
          . . .                       // close the Result Set and release the connection
      } else {                        // else no rows
          . . .                       // close the Result Set and release the connection
      }
    });
}
```

#### <a name="streamingresults"></a> 9.1.3 Streaming Query Results

Streaming query results allows data to be piped to other streams, for
example when dealing with HTTP responses.

Use [`connection.queryStream()`](#querystream) to create a stream from
a top level query and listen for events.  You can also call
[`connection.execute()`](#execute) and use
[`toQueryStream()`](#toquerystream) to return a stream from the
returned [`ResultSet`](#resultsetclass) or OUT bind REF CURSOR
ResultSet.

With streaming, each row is returned as a `data` event.  Query
metadata is available via a `metadata` event.  The `end` event
indicates the end of the query results.

The connection must remain open until the stream is completely read.

The query stream implementation is a wrapper over the
[ResultSet Class](#resultsetclass).  In particular, calls to
[getRows()](#getrows) are made internally to fetch each successive
subset of data, each row of which will generate a `data` event.  The
number of rows fetched from the database by each `getRows()` call is
set to the value of [`oracledb.maxRows`](#propdbmaxrows).  This value
does not alter the number of rows returned by the stream since
`getRows()` will be called each time more rows are needed.  However
the value can be used to tune performance, as also can the value of
[`oracledb.prefetchRows`](#propdbprefetchrows).

Query results must be fetched to completion to avoid resource leaks.
The ResultSet `close()` call for streaming query results will be
executed internally when all data has been fetched.  If you need to be
able to stop a query before retrieving all data, use a
[ResultSet with callbacks](#resultsethandling).  (Note: An
experimental `querystream._close()` method exists to terminate a
stream early.  It is under evaluation, may changed or be removed, and
should not be used in production.)

An example of streaming query results is:

```javascript
var stream = connection.queryStream('SELECT employees_name FROM employees');

stream.on('error', function (error) {
  // handle any error...
});

stream.on('data', function (data) {
  // handle data row...
});

stream.on('end', function () {
  // release connection...
});

stream.on('metadata', function (metadata) {
  // access metadata of query
});

// listen to any other standard stream events...
```

See
[selectstream.js](https://github.com/oracle/node-oracledb/tree/master/examples/selectstream.js)
for a runnable example using `connection.queryStream()`.

The [REF CURSOR Bind Parameters](#refcursors) section shows using
`toQueryStream()` to return a stream for a REF CURSOR.

#### <a name="queryoutputformats"></a> 9.1.4 Query Output Formats

Query rows may be returned as an array of column values, or as
JavaScript objects, depending on the values of
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

#### <a name="querymeta"></a> 9.1.5 Query Column Metadata

The column names of a query are returned in the `execute()` callback's
[`result.metaData`](#execmetadata) attribute:

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
available in [`result.resultSet.metaData`](#rsmetadata).

The metadata is an array of objects, one per column.  By default each
object has a `name` attribute:

```
[ { name: 'DEPARTMENT_ID' }, { name: 'DEPARTMENT_NAME' } ]
```

The names are in uppercase.  This is the default casing behavior for
Oracle client programs when a database table is created with unquoted,
case-insensitive column names.

##### Extended Metadata

More metadata is included when the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `connection.execute()` option
[`extendedMetaData`](#propexecextendedmetadata) is `true`.  For
example:

```javascript
connection.execute(
  "SELECT department_id, department_name " +
    "FROM departments " +
    "WHERE manager_id < :id",
  [110],  // bind value for :id
  { extendedMetaData: true },
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    console.log(result.metaData);  // show the extended metadata
  });
```

The output is:

```
[ { name: 'DEPARTMENT_ID',
    fetchType: 2002,
    dbType: 2,
    precision: 4,
    scale: 0,
    nullable: false },
  { name: 'DEPARTMENT_NAME',
    fetchType: 2001,
    dbType: 1,
    byteSize: 30,
    nullable: false } ]
```

Description of the properties is given in the
[`result.metaData`](#execmetadata) description.

#### <a name="typemap"></a> 9.1.6 Result Type Mapping

Oracle character, number and date columns can be selected directly
into JavaScript strings and numbers.  BLOBs and CLOBs are selected
into [Lobs](#lobclass).

Datatypes that are currently unsupported give a "datatype is not
supported" error.

##### <a name="stringhandling"></a> 9.1.6.1 Fetching Character Types

Variable and fixed length character columns are mapped to JavaScript strings.

##### <a name="numberhandling"></a> 9.1.6.2 Fetching Numbers

By default all numeric columns are mapped to JavaScript numbers.

When numbers are fetched from the database, conversion to JavaScript's
less precise binary number format can result in "unexpected"
representations.  For example:

```javascript
conn.execute(
"select 38.73 from dual",
function (err, result) {
  if (err)
    . . .
  else
    console.log(result.rows[0]); // gives 38.730000000000004
});
```

Similar issues can occur with binary floating-point arithmetic
purely in Node.js, for example:

```javascript
console.log(0.2 + 0.7); // gives 0.8999999999999999
```

The primary recommendation for number handling is to use Oracle SQL or
PL/SQL for mathematical operations, particularly for currency
calculations.  Alternatively you can use `fetchAsString` or
`fetchInfo` (see [below](#fetchasstringhandling)) to fetch numbers in
string format, and then use one of the available third-party
JavaScript number libraries that handles more precision.

##### <a name="datehandling"></a> 9.1.6.3 Fetching Date and Timestamps

Date and timestamp columns are mapped to JavaScript dates.  Note that
JavaScript Date has millisecond precision.  Therefore, timestamps
having greater precision lose their sub-millisecond fractional part
when fetched.

Internally, `TIMESTAMP` and `DATE` columns are fetched as `TIMESTAMP
WITH LOCAL TIME ZONE`.  When binding a JavaScript Date value in an
`INSERT` statement, the date is also inserted as `TIMESTAMP WITH LOCAL
TIME ZONE`.  In the database, `TIMESTAMP WITH LOCAL TIME ZONE` dates
are normalized to the database time zone.  When retrieved, they are
returned in the session time zone.

To make applications more portable, it is recommended to always set the
session time zone to a pre-determined value, such as UTC.  This can be
done by setting the environment
variable
[`ORA_SDTZ`](http://docs.oracle.com/database/122/NLSPG/datetime-data-types-and-time-zone-support.htm#NLSPG263) before
starting Node.js, for example:

```
$ export ORA_SDTZ='UTC'
$ node myapp.js
```

The session time zone can also be changed at runtime for each connection by
executing:

```javascript
connection.execute(
  "ALTER SESSION SET TIME_ZONE='UTC'",
  function(err) { ... }
);
```

To do this without requiring the overhead of a 'round trip' to execute
the `ALTER` statement, you could use a trigger:

```sql
CREATE OR REPLACE TRIGGER my_logon_trigger
  AFTER LOGON
  ON hr.SCHEMA
BEGIN
  EXECUTE IMMEDIATE 'ALTER SESSION SET TIME_ZONE=''UTC''';
END;
```

See
[Working with Dates Using the Node.js Driver](https://jsao.io/2016/09/working-with-dates-using-the-nodejs-driver/) for
more discussion of date handling.

##### <a name="fetchasstringhandling"></a> 9.1.6.4 Fetching Numbers and Dates as String

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
[`fetchInfo`](#propexecfetchinfo) to map individual number or date columns
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

When using `fetchAsString` or `fetchInfo` for numbers, you may need to
explicitly use `NLS_NUMERIC_CHARACTERS` to override your NLS settings
and force the decimal separator to be a period.  This can be done for
each connection by executing the statement:

```javascript
connection.execute(
  "ALTER SESSION SET NLS_NUMERIC_CHARACTERS = '.,'",
  function(err) { ... }
);
```

Alternatively you can set the equivalent environment variable prior
to starting Node.js:

```
$ export NLS_NUMERIC_CHARACTERS='.,'
```

Note this environment variable is not used unless the `NLS_LANG`
environment variable is also set.

##### <a name="customtypehandling"></a> 9.1.6.5 Mapping Custom Types

Datatypes such as an Oracle Locator `SDO_GEOMETRY`, or your own custom
types, cannot be fetched directly in node-oracledb.  Instead, utilize
techniques such as using an intermediary PL/SQL procedure to map the
type components to scalar values, or use a pipelined table.

For example, consider a `CUSTOMERS` table having a `CUST_GEO_LOCATION`
column of type `SDO_GEOMETRY`, as created in this [example
schema](https://docs.oracle.com/cd/E17781_01/appdev.112/e18750/xe_locator.htm#XELOC560):

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

#### <a name="rowprefetching"></a> 9.1.7 Row Prefetching

[Prefetching](https://docs.oracle.com/database/122/LNOCI/using-sql_statements-in-oci.htm#LNOCI16355)
is a query tuning feature allowing resource usage to be
optimized.  It allows multiple rows to be returned in each network
trip from Oracle Database to node-oracledb when a
[`ResultSet`](#resultsetclass) is used for query or REF CURSOR data.
The prefetch size does not affect when, or how many, rows are returned
by node-oracledb to the application.  The buffering of rows is handled
by Oracle's underlying client libraries.

By default [`prefetchRows`](#propdbprefetchrows) is 100 for
[`ResultSet`](#resultsetclass) fetches.  The application can choose a
different default prefetch size or change it for each query, as
determined by user bench-marking.

The default prefetch size was heuristically chosen to give decent
performance for developers who do not read documentation.  Skilled
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

Prefetching from REF CURSORS requires Oracle Database 11.2 or
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
from node-oracledb using [`execute()`](#execute).

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
[DBMS_OUTPUT](https://docs.oracle.com/database/122/ARPLS/DBMS_OUTPUT.htm#ARPLS67300)
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
[ResultSet](#resultsethandling).

Remember to first enable output using `DBMS_OUTPUT.ENABLE(NULL)`.

## <a name="lobhandling"></a> 11. Working with CLOB and BLOB Data

Oracle Database uses LOB datatypes to store long objects. The CLOB
type is used for character data and the BLOB type is used for binary
data.

There are runnable LOB examples in the GitHub
[examples](https://github.com/oracle/node-oracledb/tree/master/examples)
directory.

### <a name="basiclobinsert"></a> 11.1 Simple Insertion of LOBs

Node.js String or Buffer types can be passed into PL/SQL blocks or
inserted into the database by binding to LOB columns or PL/SQL
parameters.

If the data is larger than can be handled as a String or Buffer in
Node.js or node-oracledb, it will need to be streamed to
a [Lob](#lobclass), as discussed later.
See [LOB Bind Parameters](#lobbinds) for size considerations regarding
LOB binds.  Note node-oracledb will internally use a temporary LOB to
insert String or Buffer data larger than 32 KB.  This is transparent
to the application but size limits on the JavaScript String or Buffer
still apply.

Given the table:

```sql
CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
```

an `INSERT` example is:

```javascript
var fs = require('fs');
var str = fs.readFileSync('example.txt', 'utf8');
. . .

conn.execute(
  "INSERT INTO mylobs (id, myclobcol) VALUES (:idbv, :cbv)",
  { idbv: 1,
    cbv: str },  // type and direction are optional for IN binds
  function(err, result)
  {
    if (err)
      console.error(err.message);
    else
      console.log('CLOB inserted from example.txt');
. . .
```

Updating LOBs is similar to insertion:

```javascript
conn.execute(
  "UPDATE mylobs SET myclobcol = :cbv WHERE id = :idbv",
  { idbv: 1, cbv: str },
. . .
```

Buffers can similarly be bound for inserting into, or updating, BLOB columns.

When using PL/SQL, a procedure:

```sql
PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB) . . .
```

can be called like:

```javascript
bigStr = 'My string to insert';
bigBuf = Buffer.from([. . .]);

conn.execute(
  "BEGIN lobs_in(:id, :c, :b); END;",
  { id: 20,
    c: bigStr,    // type and direction are optional for IN binds
    b: bigBuf } },
  function (err)
  {
    if (err) { return cb(err, conn); }
    console.log("Completed");
    return cb(null, conn);
  }
);
```

### <a name="streamsandlobs"></a> 11.2 Streams and Lobs

The [Lob Class](#lobclass) in node-oracledb implements
the [Node.js Stream](https://nodejs.org/api/stream.html) interface to
provide streaming access to CLOB and BLOB database columns and to
PL/SQL bind parameters.

Node-oracledb Lobs can represent persistent LOBs (those permanently
stored in the database) or temporary LOBs (such as those created
with [`connection.createLob()`](#connectioncreatelob), or returned
from some SQL or PL/SQL).

If multiple LOBs are streamed concurrently, worker threads will
effectively be serialized on the connection.

It is the application's responsibility to make sure the connection
remains open while a Stream operation such as `pipe()` is in progress.

#### Readable Lobs

Being a Stream object, a Lob being read from the database has two
modes of operation: "flowing mode" and "paused mode".  In flowing mode,
data is piped to another stream, or events are posted as data is read.
In paused mode the application must explicitly call `read()` to get
data.

The `read(size)` unit is in characters for CLOBs and in bytes for BLOBs.

When reading a LOB from the database, resources are automatically
released at completion of the readable stream or if there is a LOB
error.  The `lob.close()` method can also be used to close persistent
LOBs that have not been streamed to completion.

A Readable Lob object starts out in paused mode.  If a 'data' event
handler is added, or the Lob is piped to a Writeable stream, then the
Lob switches to flowing mode.

For unpiped Readable Lobs operating in flowing mode where the Lob is
read through event handlers, the Lob object can be switched to paused
mode by calling `pause()`.  Once the Lob is in paused mode, it stops
emitting `data` events.

Similarly, a Readable Lob operating in the paused mode can be switched
to flowing mode by calling `resume()`.  It will then start emitting
'data' events again.

#### Writeable Lobs

Lobs are written to with `pipe()`. Alternatively the `write()` method
can be called successively, with the last piece being written by the
`end()` method.  The `end()` method must be called because it frees
resources.  If the Lob is being piped into, then the `write()` and
`end()` methods are automatically called.

Writeable Lobs also have events, see
the [Node.js Stream](https://nodejs.org/api/stream.html)
documentation.

At the conclusion of streaming into a Writeable Lob, the `close` event
will occur.  It is recommended to put logic such as committing and
releasing connections in this event (or after it occurs).  See
[lobinsert2.js](https://github.com/oracle/node-oracledb/tree/master/examples/lobinsert2.js).

### <a name="lobinsertdiscussion"></a> 11.3 Using RETURNING INTO to Insert into LOBs

If Strings or Buffers are too large to be directly inserted into the
database (see [Simple Insertion of LOBs](#basiclobinsert)), use a
`RETURNING INTO` clause to retrieve a [Lob](#lobclass) for a table
item.  Data can then be streamed into the Lob and committed directly
to the table:

```javascript
connection.execute(
  "INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv",
  { id: 4,
    lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
  { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
      console.error('Error getting a LOB locator');
      return;
    }

    var lob = result.outBinds.lobbv[0];
    lob.on('close', function() {
        connection.commit(  // all data is loaded so we can commit it
          function(err) {
            if (err) console.error(err.message);
            connection.close(function(err) { if (err) console.error(err); });
          });
      });
    lob.on('error', function(err) {
        console.error(err);
        connection.close(function(err) {
          if (err) console.error(err.message);
        });
      });

    var inStream = fs.createReadStream('example.txt'); // open the file to read from
    inStream.on('error', function(err) { if (err) console.error(err); });
    inStream.pipe(lob);  // copies the text to the LOB
  });
```

This example streams from a file into the table.  When the data has
been completely streamed, the Lob is automatically closed and the
'close' event triggered.  At this point the data can be committed.

See [lobinsert2.js](https://github.com/oracle/node-oracledb/tree/master/examples/lobinsert2.js) for
the full example.

### <a name="templobdiscussion"></a> 11.4 Using `createLob()`

Node-oracledb applications can create Oracle 'temporary LOBs' by
calling [`connection.createLob()`](#connectioncreatelob).  These are
instances of the [Lob](#lobclass) class. They can be populated with
data and passed to PL/SQL blocks.  This is useful if the data is
larger than feasible for direct binding
(see [Simple Insertion of LOBs](#basiclobinsert)).  These Lobs can
also be used for SQL statement IN binds, however the `RETURNING INTO`
method shown above will be more efficient.

Lobs from `createLob()` will use space in the temporary tablespace
until [`lob.close()`](#lobclose) is called.  Database Administrators
can track this usage by querying
[`V$TEMPORARY_LOBS`](http://docs.oracle.com/database/122/ADLOB/managing-LOBs.htm#ADLOB45157).

Temporary Lobs such as those created with `createLob()` can be bound
as IN and as OUT binds, but not for IN OUT binds.  This is to stop
temporary LOB leaks where node-oracledb is unable to free resources
held by the initial temporary LOB.

#### Passing a Lob Into PL/SQL

The following insertion example is based on
[lobplsqltemp.js](https://github.com/oracle/node-oracledb/tree/master/examples/lobplsqltemp.js).
It creates an empty LOB, populates it, and then passes it to a PL/SQL
procedure.

A temporary LOB can be created
with [`connection.createLob()`](#connectioncreatelob):

```javascript
conn.createLob(oracledb.CLOB, function(err, templob) {
  if (err) { . . . }

  // ... else use templob
});
```

Once created, data can be inserted into it.  For example to read a
text file:

```javascript
templob.on('error', function(err) { somecallback(err); });

// The data was loaded into the temporary LOB, so use it
templob.on('finish', function() { somecallback(null, templob); });

// copies the text from 'example.txt' to the temporary LOB
var inStream = fs.createReadStream('example.txt');
inStream.on('error', function(err) { . . . });
inStream.pipe(templob);
```

Now the LOB has been populated, it can be bound in `somecallback()` to
a PL/SQL IN parameter:

```javascript
// For PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB)
conn.execute(
  "BEGIN lobs_in(:id, :c, null); END;",
  { id: 3,
    c: templob }, // type and direction are optional for IN binds
  function(err)
  {
    if (err) { return cb(err); }
    console.log("Call completed");
    return cb(null, conn, templob);
  });
```

When the LOB is no longer needed, it should be closed
with [`lob.close()`](#lobclose):

```javascript
templob.close(function (err) {
  if (err)
    . . .
  else
    // success
});
```

### <a name="closinglobs"></a> 11.5 Closing Lobs

Closing a Lob frees up resources. In particular, the temporary
tablespace storage used by a temporary LOB is released.  Once a Lob is
closed, it can no longer be bound or used for streaming.

Lobs created with [`createLob()`](#connectioncreatelob) should be
explicitly closed with [`lob.close()`](#lobclose).  If not explicitly
closed, these Lobs are closed when the connection is closed (for
non-pooled connections), or when a pooled connection is removed from a
pool due to planned pool shrinkage or pool termination.  If
connections are never removed from the pool, you will have 'LOB leaks'
and the temporary tablespace will fill up.

Persistent or temporary Lobs returned from the database should be
closed with `lob.close()` unless they have been automatically closed.
Automatic closing of returned Lobs occurs when:

  - streaming has completed
  - a stream error occurs
  - the Lob was used as the source for an IN OUT bind

If you try to close a Lob
being used for streaming you will get the error *NJS-023: concurrent
operations on a Lob are not allowed*.

The connection must be open when calling `lob.close()` on a temporary
LOB.  If the connection is closed and temporary LOBs are still open,
the warning *NJS-050: Temporary LOBs were open when the connection was
closed* will occur. You should review the application logic and
explicitly close any open Lobs.  These temporary Lobs will have been
created with `lob.createLob()` or returned from the database, perhaps
as the result of a SQL operation like `substr()` on a Lob column.
Persistent LOBs can be closed without the connection being open.

The `lob.close()` method emits
the [Node.js Stream](https://nodejs.org/api/stream.html) 'close' event
unless the Lob has already been closed explicitly or automatically.

### <a name="queryinglobs"></a> 11.6 Getting LOBs from Oracle Database

#### Getting LOBs as String or Buffer

To return data easily to node-oracledb, PL/SQL LOB OUT parameters can
be bound as `oracledb.STRING` or `oracledb.BUFFER`.
See [LOB Bind Parameters](#lobbinds) for size considerations regarding
LOB binds.

```javascript
conn.execute(
  "BEGIN lobs_out(:id, :c, :b); END;",
  { id: 20,
    c: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000},
    b: {type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 50000} },
  function (err, result)
  {
    if (err) { return cb(err, conn); }

    var str = result.outBinds.c;  // a String
    var buf = result.outBinds.b;  // a Buffer
    return cb(null, conn, str, buf); // do something with str and buf
  });
```

The fetched String and Buffer can be used directly in Node.js.

If the data is larger than can be handled as a String or Buffer in
Node.js or node-oracledb, it will need to be explicitly streamed to
a [Lob](#lobclass), as discussed previously.
See [LOB Bind Parameters](#lobbinds) for size considerations regarding
LOB binds.  Note node-oracledb will internally use a temporary LOB to
fetch String or Buffer data larger than 32 KB.  This is transparent to
the application but size limits on the String or Buffer still apply.

#### Selecting and Fetching Lob Instances

When a `SELECT` clause contains a LOB column, or a PL/SQL OUT
parameter returns a LOB, instances of [Lob](#lobclass) are created.

For each Lob, the [`lob.type`](#proplobtype) property will
be [`oracledb.BLOB`](#oracledbconstantsnodbtype)
or [`oracledb.CLOB`](#oracledbconstantsnodbtype), depending on the
column or PL/SQL parameter type.

Returned LOBs can be used
as [Readable Streams](https://nodejs.org/api/stream.html).  Data can
be streamed from each Lob, for example to a file.  At the conclusion
of the stream, persistent LOBs are automatically closed.

Lobs returned from the database that are not streamed can be passed
back to the database as IN binds for PL/SQL blocks, for `INSERT`, or
for `UPDATE` statements.  The Lobs should then be closed
with [`lob.close()`](#lobclose).  If they are passed as IN OUT binds,
they will be automatically closed and the
execution [`outBinds`](#execoutbinds) property will contain the
updated Lob.

##### LOB Query Example

LOBs can be queried from the database.  Each CLOB or BLOB returns
a [Lob](#lobclass).  The table:

```sql
CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
```
can be called to get a Lob `clob` like:

```javascript
conn.execute(
  "SELECT c FROM mylobs WHERE id = 1",
  function(err, result)
  {
    if (err) {
      return cb(err);
    }
    if (result.rows.length === 0) {
      return cb(new Error("whoops"));
    }
    var clob = result.rows[0][0]; // Instance of a node-oracledb Lob
    // console.log(clob.type);    // -> 2006 aka oracledb.CLOB
    cb(null, clob);               // do something with the Lob
  });
```

##### PL/SQL LOB Parameter Fetch Example

A PL/SQL procedure such as this:

```sql
PROCEDURE lobs_out (id IN NUMBER, clob_out OUT CLOB, blob_out OUT BLOB) . . .
```

can be called to get the [Lobs](#lobclass) `clob` and `blob`:

```javascript
conn.execute(
  "BEGIN lobs_out(:id, :c, :b); END;",
  { id: 1,
    c: {type: oracledb.CLOB, dir: oracledb.BIND_OUT},
    b: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
  function(err, result)
  {
    if (err) {
      return cb(err, conn);
    }

    var clob = result.outBinds.c;
    var blob = result.outBinds.b;
    cb(null, clob, blob);         // do something with the Lobs
  });
```

##### Streaming Out a Lob

Once a Lob is obtained from a query or PL/SQL OUT bind, it can be
streamed out:

```javascript
if (lob === null) {
    // . . . do special handling such as create an empty file or throw an error
}

if (lob.type === oracledb.CLOB) {
  lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
}

lob.on('error', function(err) { cb(err); });
lob.on('close', function() { cb(null); });   // all done.  The Lob is automatically closed.

var outStream = fs.createWriteStream('myoutput.txt');
outStream.on('error', function(err) { cb(err); });

// switch into flowing mode and push the LOB to myoutput.txt
lob.pipe(outStream);
```

Note the Lob is automatically closed at the end of the stream.

An alternative to the `lob.pipe()` call is to have a `data` event on
the Lob Stream which processes each chunk of LOB data separately.
Either a String or Buffer can be built up or, if the LOB is big, each
chunk can be written to another Stream or to a file:

```javascript
if (lob === null) {
    // . . . do special handling such as create an empty file or throw an error
}

var str = "";

lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
lob.on('error', function(err) { cb(err); });
lob.on('close', function() { cb(null); });   // all done.  The Lob is automatically closed.
lob.on('data', function(chunk) {
    str += chunk; // or use Buffer.concat() for BLOBS
});
lob.on('end', function() {
    fs.writeFile(..., str, ...);
});

```

Node-oracledb's [`lob.pieceSize`](#proplobpiecesize) can be used to
control the number of bytes retrieved for each readable 'data' event.
This sets the number of bytes (for BLOBs) or characters (for CLOBs).
The default is [`lob.chunkSize`](#proplobchunksize).  The
recommendation is for it to be a multiple of `chunkSize`.

See [lobbinds.js](https://github.com/oracle/node-oracledb/tree/master/examples/lobbinds.js) for a full example.

## <a name="jsondatatype"></a> 12. Oracle Database 12c JSON Datatype

Oracle Database 12.1.0.2 introduced native support for JSON data.  You
can use JSON with relational database features, including
transactions, indexing, declarative querying, and views.  You can
project JSON data relationally, making it available for relational
processes and tools.

JSON data in the database is stored as BLOB, CLOB or VARCHAR2 data.
This means that node-oracledb can easily insert and query it.

As an example, the following table has a `PO_DOCUMENT` column that is
enforced to be JSON:

```sql
CREATE TABLE po (po_document VARCHAR2(4000) CHECK (po_document IS JSON));
```

To insert data using node-oracledb:

```javascript
var data = { customerId: 100, item: 1234, quantity: 2 };
var s = JSON.stringify(data);  // change JavaScript value to a JSON string

connection.execute(
  "INSERT INTO po (po_document) VALUES (:bv)",
  [s]  // bind the JSON string
  function (err) {
  . . .
  });
```

Queries can access JSON with Oracle JSON path expressions.  These
expressions are matched by Oracle SQL functions and conditions to
select portions of the JSON data.  Path expressions can use wildcards
and array ranges.  An example is `$.friends` which is the value of
JSON field `friends`.

Oracle provides SQL functions and conditions to create, query, and
operate on JSON data stored in the database.  An example is the Oracle
SQL Function `JSON_TABLE` which projects JSON data to a relational
format effectively making it usable like an inline relational view.
Another example is `JSON_EXISTS` which tests for the existence of a
particular value within some JSON data:

This example looks for JSON entries that have a `quantity` field:

```JavaScript
conn.execute(
  "SELECT po_document FROM po WHERE JSON_EXISTS (po_document, '$.quantity')",
  function(err, result)
  {
    if (err) {
      . . .
    } else {
      var js = JSON.parse(result.rows[0][0]);  // show only first record in this example
      console.log('Query results: ', js);
    }
  });
```

After the previous `INSERT` example, this query would display:

```
{ customerId: 100, item: 1234, quantity: 2 }
```

In Oracle Database 12.2 the
[`JSON_OBJECT` ](https://docs.oracle.com/cloud/latest/db122/ADJSN/generation.htm#ADJSN-GUID-1084A518-A44A-4654-A796-C1DD4D8EC2AA) function
is a great way to convert relational table data to JSON:

```javascript
conn.execute(
  "select json_object ('deptId' is d.department_id, 'name' is d.department_name) department "
  + "from departments d "
  + "where department_id < :did",
  [50],
  function(err, result)
  {
    if (err) { console.error(err.message); return; }
    for (var i = 0; i < result.rows.length; i++)
      console.log(result.rows[i][0]);
  });
```

This produces:

```
{"deptId":10,"name":"Administration"}
{"deptId":20,"name":"Marketing"}
{"deptId":30,"name":"Purchasing"}
{"deptId":40,"name":"Human Resources"}
```

See [selectjson.js](https://github.com/oracle/node-oracledb/tree/master/examples/selectjson.js)
and [selectjsonclob.js](https://github.com/oracle/node-oracledb/tree/master/examples/selectjsonclob.js)
for runnable examples.

For more information about using JSON in Oracle Database see the
[Database JSON Developer's Guide](https://docs.oracle.com/database/122/ADJSN/toc.htm).

## <a name="bind"></a> 13. Bind Parameters for Prepared Statements

SQL and PL/SQL statements may contain bind parameters, indicated by
colon-prefixed identifiers or numerals.  These indicate where
separately specified values are substituted when the statement is
executed.  Bind variables can be used to substitute data but not the
text of the statement.  Bind parameters are also called bind
variables.

Using bind parameters is recommended in preference to constructing SQL
or PL/SQL statements by string concatenation.  This is for performance
and security.

Inserted data that is bound is passed to the database separately from
the statement text.  It can never be executed.  This means there is no
need to escape bound data inserted into the database.

If a statement is executed more than once with different values for
the bind parameters, Oracle can re-use context from the initial
execution, thus improving performance.  However, if similar statements
contain hard coded values instead of bind parameters, Oracle sees the
statement text is different and would be less efficient.

IN binds are values passed into the database.  OUT binds are used to
retrieve data.  IN OUT binds are passed in, and may return a different
value after the statement executes.  IN OUT binds can be used for
PL/SQL calls, but not for SQL.

OUT bind parameters for `RETURNING INTO` clauses will always return an
array of values. See [DML RETURNING Bind Parameters](#dmlreturn).

### <a name="inbind"></a> 13.1 IN Bind Parameters

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
bind a Node.js Buffer to an Oracle Database `RAW` or `BLOB` type.  The
type `CURSOR` cannot be used with IN binds.

### <a name="outbind"></a> 13.2 OUT and IN OUT Bind Parameters

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

The type `BUFFER` is used to bind an Oracle Database `RAW` or `BLOB`
to a Node.js Buffer.

If `type` is not specified then `STRING` is assumed.

A `maxSize` should be set for `STRING` or `BUFFER` OUT or IN OUT
binds.  This is the maximum number of bytes the bind parameter will
return.  If the output value does not fit in `maxSize` bytes, then an
error such *ORA-06502: PL/SQL: numeric or value error: character
string buffer too small* or *NJS-016: buffer is too small for OUT
binds* occurs.

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

### <a name="dmlreturn"></a> 13.3 DML RETURNING Bind Parameters

Bind parameters from "DML RETURNING" statements (such as `INSERT
... RETURNING ... INTO ...`) can use `BLOB`, `CLOB`, `STRING`,
`NUMBER` or `DATE` for the OUT [`type`](#executebindParams).

For `STRING` types, an error occurs if [`maxSize`](#executebindParams)
is not large enough to hold a returned value.

Note each DML RETURNING bind OUT parameter is returned as an array
containing zero or more elements.  Application code that is designed
to expect only one value could be made more robust if it confirms the
returned array length is not greater than one.  This will help identify
invalid data or an incorrect `WHERE` clause that causes more results
to be returned.

Oracle Database `DATE`, `TIMESTAMP` and `TIMESTAMP WITH LOCAL TIME ZONE`
types can be bound as `DATE` for DML RETURNING.  These types and `ROWID`
can also be bound as `STRING`.

No duplicate binds are allowed in a DML statement with a `RETURNING`
clause, and no duplication is allowed between bind variables in the
DML section and the `RETURNING` section of the statement.

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

### <a name="refcursors"></a> 13.4 REF CURSOR Bind Parameters

Oracle REF CURSORS can be fetched in node-oracledb by binding a
`CURSOR` to a PL/SQL call.  The resulting bind variable becomes a
[`ResultSet`](#resultsetclass), allowing rows to be fetched using
[`getRow()`](#getrow) or [`getRows()`](#getrows).  The ResultSet can
also be converted to a Readable Stream by using
[`toQueryStream()`](#toquerystream).

If using `getRow()` or `getRows()` the Result Set must be freed using
[`close()`](#close) when all rows have been fetched, or when the
application does not want to continue getting more rows.  If the REF
CURSOR is set to NULL or is not set in the PL/SQL procedure then the
returned `ResultSet` is invalid and methods like `getRows()` will
return an error when invoked.

When using Oracle Database 11.2 or greater, then
[`prefetchRows`](#propdbprefetchrows) can be used to tune the
performance of fetching REF CURSORS.

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

var numRows = 10;  // number of rows to return from each call to getRows()

var plsql = "BEGIN get_emp_rs(:sal, :cursor); END;";
var bindvars = {
  sal:  6000,
  cursor:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
}

connection.execute(
  plsql,
  bindvars,
  function(err, result)
  {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.outBinds.cursor, numRows);
  });

function fetchRowsFromRS(connection, resultSet, numRows)
{
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows)
    {
      if (err) {
         . . .                        // close the Result Set and release the connection
      } else if (rows.length > 0) {   // got some rows
        console.log(rows);            // process rows
        if (rows.length === numRows)  // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else                          // got fewer rows than requested so must be at end
          . . .                       // close the Result Set and release the connection
      } else {                        // else no rows
          . . .                       // close the Result Set and release the connection
      }
    });
}
```

See [refcursor.js](https://github.com/oracle/node-oracledb/tree/master/examples/refcursor.js)
for a complete example.

To convert the REF CURSOR ResultSet to a stream, use
[`toQueryStream()`](#toquerystream).  With the PL/SQL and bind values
from the previous examples, the code would become:

```javascript
connection.execute(
  plsql,
  bindvars,
  function(err, result)
  {
    if (err) { . . . }
    fetchRCFromStream(connection, result.outBinds.cursor);
  });

function fetchRCFromStream(connection, cursor)
{
  var stream = cursor.toQueryStream();

  stream.on('error', function (error) {
    // console.log("stream 'error' event");
    console.error(error);
    return;
  });

  stream.on('metadata', function (metadata) {
    // console.log("stream 'metadata' event");
    console.log(metadata);
  });

  stream.on('data', function (data) {
    // console.log("stream 'data' event");
    console.log(data);
  });

  stream.on('end', function () {
    // console.log("stream 'end' event");
    connection.release(
      function(err) {
        if (err) {
          console.error(err.message);
        }
      });
  });
}
```

The connection must remain open until the stream is completely read.
Query results must be fetched to completion to avoid resource leaks.
The ResultSet `close()` call for streaming query results will be
executed internally when all data has been fetched.

### <a name="lobbinds"></a> 13.5 LOB Bind Parameters

Database CLOBs can be bound with `type` set
to [`oracledb.CLOB`](#oracledbconstants).  Database BLOBs can be bound
as [`oracledb.BLOB`](#oracledbconstants).  These binds accept, or
return, node-oracledb [Lob](#lobclass) instances, which implement the
Node.js Stream interface.

Lobs may represent Oracle Database persistent LOBs (those stored in
tables) or temporary LOBs (such as those created
with [`createLob()`](#connectioncreatelob) or returned by some SQL and
PL/SQL operations).

Persistent LOBs can be bound with direction `BIND_IN`, `BIND_OUT` or
`BIND_INOUT`, depending on context.

Temporary LOBs can be bound with direction `BIND_IN` or `BIND_OUT`,
but not with `BIND_INOUT`.  This is to prevent temporary LOB leaks
where node-oracledb is unable to free resources held by the initial
temporary LOB.

Note that any PL/SQL OUT LOB parameter should be initialized in the
PL/SQL block - even just to NULL - before the PL/SQL code
completes. Make sure to do this in all PL/SQL code paths including in
error handlers. This prevents node-oracledb throwing the error
*DPI-007: invalid OCI handle or descriptor*.

In many cases it will be easier to work with JavaScript Strings and
Buffers instead of [Lobs](#lobclass).  These types can be bound
directly for SQL IN binds to insert into, or update, LOB columns.
They can also be bound to PL/SQL LOB parameters.  Use the bind
type [`oracledb.STRING`](#oracledbconstants) for CLOBs
and [`oracledb.BUFFER`](#oracledbconstants) for BLOBs.  The default
size used for these binds in the OUT direction is 200, so set
`maxSize` appropriately.

See [Working with CLOB and BLOB Data](#lobhandling) for examples and
more information on binding and working with LOBs.

#### Theoretical Limits (Bytes) for Binding LOBs to Strings and Buffers

DB Type | Bind Type       | Direction   | Oracle Client 12c Limit<sup>*</sup> | Oracle Client 11.2 Limit<sup>*</sup>
--------|-----------------|-------------|-------------------------|------------------------
CLOB    | oracledb.STRING |BIND_IN      |  1 GB                   | 64 KB
CLOB    | oracledb.STRING |BIND_OUT     |  1 GB                   | 64 KB
CLOB    | oracledb.STRING |BIND_INOUT   | 32 KB                   | 32 KB
BLOB    | oracledb.BUFFER |BIND_IN      |  1 GB                   | 64 KB
BLOB    | oracledb.BUFFER |BIND_OUT     |  1 GB                   | 64 KB
BLOB    | oracledb.BUFFER |BIND_INOUT   | 32 KB                   | 32 KB

<sup>*</sup>The largest usable data length is two bytes less than the
size shown for 12c and one byte less for 11.2.

In practice, the limitation on binding IN or OUT is the memory
available to Node.js and the V8 engine.  For data larger than several
megabytes, it is recommended to bind as `oracledb.CLOB` or
`oracledb.BLOB` and use [Lob streaming](#streamsandlobs).  If you try
to create large Strings or Buffers in Node.js you will see errors like
*JavaScript heap out of memory*, or other space related messages.

Internally, for PL/SQL calls, node-oracledb uses temporary LOBs when
binding Strings and Buffers larger than 32 KB.  Since temporary LOBs
cannot be used for IN OUT binds, the data size in this case is
restricted to 32 KB.  For SQL call no temporary LOBs are used.


### <a name="plsqlindexbybinds"></a> 13.6 PL/SQL Collection Associative Array (Index-by) Bind Parameters

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
It can be set to [`STRING`](#oracledbconstantsnodbtype) or [`NUMBER`](#oracledbconstantsnodbtype).

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


## <a name="transactionmgt"></a> 14. Transaction Management

By default,
[DML](https://docs.oracle.com/database/122/CNCPT/sql.htm#GUID-90EA5D9B-76F2-4916-9F7E-CF0D8AA1A09D)
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
back.  Therefore if a released, pooled connection is re-used by a
subsequent [`pool.getConnection()`](#getconnectionpool) call
(or [`oracledb.getConnection()`](#getconnectiondb) call that uses a
pool), then any DML statements performed on the obtained connection are
always in a new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

Note: Oracle Database will implicitly commit when a
[DDL](https://docs.oracle.com/database/122/CNCPT/sql.htm#GUID-C25B548B-363A-4FE5-B4EE-784502BAAD08)
statement is executed irrespective of the value of `autoCommit`.

## <a name="stmtcache"></a> 15. Statement Caching

Node-oracledb's [`execute()`](#execute) method uses the
[Oracle OCI statement cache](https://docs.oracle.com/database/122/LNOCI/oci-programming-advanced-topics.htm#LNOCI16655)
to make re-execution of statements efficient.  This cache removes the
need for a separate 'prepare' method which is sometimes seen in other
Oracle APIs: there is no separate 'prepare' method in node-oracledb.

Each non-pooled connection and each session in the connection pool has
its own cache of statements with a default size of 30.  Statement
caching lets cursors be used without re-parsing the statement.
Statement caching also reduces meta data transfer costs between the
node-oracledb and the database.  Performance and scalability are
improved.

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

## <a name="oraaccess"></a> 16. External Configuration

When node-oracledb is linked with Oracle Database 12c client libraries, the Oracle
client-side configuration file
[oraaccess.xml](https://docs.oracle.com/database/122/LNOCI/more-oci-advanced-topics.htm#LNOCI73052)
can be used to configure some behaviors of node-oracledb.

For example, oraaccess.xml can be used to:

- turn on [Fast Application Notification](https://docs.oracle.com/database/122/ADFNS/high-availability.htm#ADFNS538) (FAN) events to enable FAN notifications and [Runtime Load Balancing](https://docs.oracle.com/database/122/ADFNS/connection_strategies.htm#ADFNS515) (RLB)
- configure [Client Result Caching](https://docs.oracle.com/database/122/ADFNS/performance-and-scalability.htm#ADFNS464) parameters
- turn on [Client Statement Cache Auto-tuning](https://docs.oracle.com/database/122/LNOCI/more-oci-advanced-topics.htm#LNOCI73051)

Other features can also be enabled.  Refer to the
[oraaccess.xml documentation](https://docs.oracle.com/database/122/LNOCI/more-oci-advanced-topics.htm#LNOCI73052)

## <a name="nls"></a> 17. Globalization and National Language Support (NLS)

Node-oracledb can use Oracle's
[National Language Support (NLS)](https://docs.oracle.com/database/122/NLSPG/toc.htm)
to assist in globalizing applications.

Node-oracledb always uses Oracle's AL32UTF8 character set internally.
Data will be converted between AL32UTF8 and the
database character set when it is inserted into, or queried from, the
database.  The environment variable `NLS_LANG` can be used to
configure the Oracle client language and territory only.

Oracle NLS environment variables, or statements like `ALTER SESSION`,
can be used to configure further aspects of node-oracledb data access
globalization. Examples are `NLS_NUMERIC_CHARACTERS` (discussed
in [Fetching Numbers](#numberhandling)), and `NLS_DATE_FORMAT`
(discussed in [Fetching Numbers and Dates as String](#fetchasstringhandling)).
Refer to [NLS Documentation](https://docs.oracle.com/database/122/NLSPG/setting-up-globalization-support-environment.htm#NLSPG003) for
others.

## <a name="endtoend"></a> 18. End-to-end Tracing, Mid-tier Authentication, and Auditing

The Connection properties [action](#propconnaction),
[module](#propconnmodule), and [clientId](#propconnclientid) set
metadata for
[end-to-end tracing](https://docs.oracle.com/database/122/TGSQL/performing-application-tracing.htm#TGSQL792).
The values can be tracked in database views, shown in audit trails,
and seen in tools such as Enterprise Manager.

The `clientId` property can also be used by applications that do their
own mid-tier authentication but connect to the database using the one
database schema.  By setting `clientId` to the application's
authenticated username, the database is aware of who the actual end
user is.  This can, for example, be used by Oracle
[Virtual Private Database](https://docs.oracle.com/database/122/CNCPT/topics-for-database-administrators-and-developers.htm#GUID-89DB0C3C-A36F-4254-8C82-020F5F6DE31F)
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
[`DBMS_APPLICATION_INFO`](https://docs.oracle.com/cd/B19306_01/appdev.102/b14258/d_appinf.htm#CHECEIEB)
procedures or
[`DBMS_SESSION.SET_IDENTIFIER`](https://docs.oracle.com/cd/B19306_01/appdev.102/b14258/d_sessio.htm#SET_IDENTIFIER),
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

## <a name="promiseoverview"></a> 19. Promises in node-oracledb

Node-oracledb supports Promises with all asynchronous methods.  The native Promise
implementation is used in Node.js 0.12 and greater.  Promise support is not
enabled by default in Node.js 0.10.

If an asynchronous method is invoked without a callback, it returns a
Promise:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  })
  .then(function(conn) {
    return conn.execute(
      "SELECT department_id, department_name " +
        "FROM departments " +
        "WHERE manager_id < :id",
      [110]  // bind value for :id
    )
      .then(function(result) {
        console.log(result.rows);
        return conn.close();
      })
      .catch(function(err) {
        console.error(err);
        return conn.close();
      });
  })
  .catch(function(err) {
    console.error(err);
  });
```

With Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

Notice there are two promise "chains": one to get a connection and the
other to use it.  This is required because it is only possible to
refer to the connection within the function to which it was passed.

When invoking asynchronous methods, it is possible to accidentally
get a Promise by forgetting to pass a callback function:

```javascript
oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/WRONG_SERVICE_NAME"
  });
  . . .
```

Since the returned promise will not have a catch block, as the
developer intended to use the callback programming style, any
rejections that occur will go unnoticed.  Node.js 4.0 added the
`unhandledRejection` event to prevent such rejections from going
unnoticed:

```javascript
process.on('unhandledRejection', (reason, p) => {
  console.error("Unhandled Rejection at: ", p, " reason: ", reason);
  // application specific logging, throwing an error, or other logic here
});

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/WRONG_SERVICE_NAME"
  });
  . . .
```

Whereas the code without the `unhandledRejection` exception silently
exited, adding the handler could, for example, show:

```
$ node myapp.js
Unhandled Rejection at:  Promise {
  <rejected> [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
] }  reason:  [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
]
```

### <a name="custompromises"></a> 19.1 Custom Promise Libraries

The Promise implementation is designed to be overridden, allowing a
custom Promise library to be used.  An external library can also be
used to add Promise support to Node.js 0.10.

```javascript
var mylib = require('myfavpromiseimplementation');
oracledb.Promise = mylib;
```

Promises can be completely disabled by setting

```javascript
oracledb.Promise = null;
```

If your code uses the promise style in Node.js 0.10 but you have not
installed your own promise library then you will get an error like:

```
$ node mypromiseapp.js

node_modules/oracledb/lib/util.js:53
    throw new Error(getErrorMessage(errorCode, messageArg1));
          ^
Error: NJS-009: invalid number of parameters
    at Object.assert (node_modules/oracledb/lib/util.js:53:11)
    at Oracledb.getConnection (node_modules/oracledb/lib/oracledb.js:71:12)
    at Oracledb.getConnection (node_modules/oracledb/lib/util.js:72:19)
    at Object.<anonymous> (mypromiseapp.js:8:10)
    at Module._compile (module.js:456:26)
    at Object.Module._extensions..js (module.js:474:10)
    at Module.load (module.js:356:32)
    at Function.Module._load (module.js:312:12)
    at Function.Module.runMain (module.js:497:10)
    at startup (node.js:119:16)
```

Because node-oracledb Promises support is not enabled by default when
using Node.js 0.10, the callback API is expected.  The error stack trace
indicates that line 10 of `mypromiseapp.js` forgot to pass the
callback.  Either install your own Promise library or use the callback
programming style.
