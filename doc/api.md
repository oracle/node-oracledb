# node-oracledb: Documentation for the Oracle Database Node.js Driver

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
     - OBJECT
     - STRING
     - NUMBER
     - DATE
     - CURSOR
     - BUFFER
     - BIND_IN
     - BIND_INOUT
     - BIND_OUT
  - 3.2 [Oracledb Properties](#oracledbproperties)
     - 3.2.1 [autoCommit](#propdbisautocommit)
     - 3.2.2 [connectionClass](#propdbconclass)
     - 3.2.3 [externalAuth](#propdbisexternalauth)
     - 3.2.4 [maxRows](#propdbmaxrows)
     - 3.2.5 [outFormat](#propdboutformat)
     - 3.2.6 [poolIncrement](#propdbpoolincrement)
     - 3.2.7 [poolMax](#propdbpoolmax)
     - 3.2.8 [poolMin](#propdbpoolmin)
     - 3.2.9 [poolTimeout](#propdbpooltimeout)
     - 3.2.10 [prefetchRows](#propdbprefetchrows)
     - 3.2.11 [stmtCacheSize](#propdbstmtcachesize)
     - 3.2.12 [version](#propdbversion)
  - 3.3 [Oracledb Methods](#oracledbmethods)
     - 3.3.1 [createPool()](#createpool)
     - 3.3.2 [getConnection()](#getconnectiondb)
4. [Pool Class](#poolclass)
  - 4.1 [Pool Properties](#poolproperties)
     - 4.1.1 [connectionsInUse](#proppoolconnectionsinuse)
     - 4.1.2 [connectionsOpen](#proppoolconnectionsopen)
     - 4.1.3 [poolIncrement](#proppoolpoolincrement)
     - 4.1.4 [poolMax](#proppoolpoolmax)
     - 4.1.5 [poolMin](#proppoolpoolmin)
     - 4.1.6 [poolTimeout](#proppoolpooltimeout)
     - 4.1.7 [stmtCacheSize](#proppoolstmtcachesize)
  - 4.2 [Pool Methods](#poolmethods)
     - 4.2.1 [getConnection()](#getconnectionpool)
     - 4.2.2 [terminate()](#terminate)
5. [Connection Class](#connectionclass)
  - 5.1 [Connection Properties](#connectionproperties)
     - 5.1.1 [action](#propconnaction)
     - 5.1.2 [clientId](#propconnclientid)
     - 5.1.3 [module](#propconnmodule)
     - 5.1.4 [stmtCacheSize](#propconnstmtcachesize)
  - 5.2 [Connection Methods](#connectionmethods)
     - 5.2.1 [break()](#break)
     - 5.2.2 [commit()](#commit)
     - 5.2.3 [execute()](#execute)
        - 5.2.3.1 [execute(): SQL Statement](#executesqlparam)
        - 5.2.3.2 [execute(): Bind Parameters](#executebindParams)
        - 5.2.3.3 [execute(): Options](#executeoptions)
        - 5.2.3.4 [execute(): Callback Function](#executecallback)
     - 5.2.4 [release()](#release)
     - 5.2.5 [rollback()](#rollback)
6. [ResultSet Class](#resultsetclass)
  - 6.1 [ResultSet Properties](#resultsetproperties)
     - 6.1.1 [metaData](#rsmetadata)
  - 6.2 [ResultSet Methods](#resultsetmethods)
     - 6.2.1 [close()](#close)
     - 6.2.2 [getRow()](#getrow)
     - 6.2.3 [getRows()](#getrows)
7. [Connection Handling](#connectionhandling)
  - 7.1 [Connection Strings](#connectionstrings)
     - 7.1.1 [Easy Connect Syntax for Connection Strings](#easyconnect)
     - 7.1.2 [Net Service Names for Connection Strings](#tnsnames)
     - 7.1.3 [JDBC and Node-oracledb Connection Strings Compared](#notjdbc)
  - 7.2 [Database Resident Connection Pooling](#drcp)
  - 7.3 [External Authentication](#extauth)
8. [SQL Execution](#sqlexecution)
  - 8.1 [SELECT Statements](#select)
     - 8.1.1 [Fetching Rows](#fetchingrows)
     - 8.1.2 [Result Set Handling](#resultsethandling)
     - 8.1.3 [Query Output Formats](#queryoutputformats)
     - 8.1.4 [Query Column Metadata](#querymeta)
     - 8.1.5 [Result Type Mapping](#typemap)
     - 8.1.6 [Statement Caching](#stmtcache)
     - 8.1.7 [Row Prefetching](#rowprefetching)
  - 8.2 [Bind Parameters for Prepared Statements](#bind)
     - 8.2.1 [IN Bind Parameters](#inbind)
     - 8.2.2 [OUT and IN OUT Bind Parameters](#outbind)
     - 8.2.3 [DML RETURNING Bind Parameters](#dmlreturn)
     - 8.2.4 [REF CURSOR Bind Parameters](#refcursors)
9. [Transaction Management](#transactionmgt)
10. [External Configuration](#oraaccess)

## <a name="intro"></a> 1. Introduction

The Oracle Database Node.js driver *node-oracledb* powers high
performance Node.js applications.

This document shows how to use node-oracledb.  This document contains
the API reference in sections 2 - 6 and the user guide in subsequent
sections.

For how to install node-oracledb, see [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md).

### Example:  Simple SELECT statement implementation in Node.js

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

There are more node-oracledb examples in the
[examples](https://github.com/oracle/node-oracledb/tree/master/examples)
directory.

Scripts to create Oracle's sample schemas can be found at
[github.com/oracle/db-sample-schemas](https://github.com/oracle/db-sample-schemas).

## <a name="errorobj"></a> 2. Errors

Unless otherwise specified, the last parameter of each method is a
callback.  If an application does not pass a callback function where
it is expected, then the driver throws an exception of type *Error*.

The first parameter of the callback is an *Error* object that
contains error information if the call fails.  If the call succeeds,
then the object is null.

If an invalid value is set for a property, then the *Error* object is
thrown by the driver. The same is true for a read operation on a
write-only property.

### <a name="properror"></a> 2.1 Error Properties

The *Error* object contains a message property.

```
String message
```

The text of the error message.

The error may be a standard Oracle message with a prefix like ORA or
PLS.  Alternatively it may be a driver specific error prefixed with
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

The *Oracledb* object is instantiated by loading the driver:

```javascript
var oracledb = require("oracledb");
```

Internally, the driver creates the *Oracledb* object as a singleton.
Reloading it in the same Node.js process creates a new pointer to the
same object.

### <a name="oracledbconstants"></a> 3.1 Oracledb Constants

Usage of these constants is described later in this document.

#### Query result [outFormat](#propdboutformat) option constants:

```
Oracledb.ARRAY                     // Fetch each row as array of column values

Oracledb.OBJECT                    // Fetch each row as an object
```

#### Constants for `execute()` [bind parameter](#executebindParams) `type` properties:

```
Oracledb.STRING                    // Bind as JavaScript string type

Oracledb.NUMBER                    // Bind as JavaScript number type

Oracledb.DATE                      // Bind as JavaScript date type

Oracledb.CURSOR                    // Bind a REF CURSOR to a node-oracledb resultSet class

Oracledb.BUFFER                    // Bind a node.js Buffer
```

#### Constants for `execute()` [bind parameter](#executebindParams) `dir` properties

These specify whether bound values are passed into or out from the
database:

```
Oracledb.BIND_IN                   // Direction for IN binds

Oracledb.BIND_INOUT                // Direction for IN OUT binds

Oracledb.BIND_OUT                  // Direction for OUT binds

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
[Database Resident Connection Pooling](#drcp) (DRCP) to allow or
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

#### <a name="propdbmaxrows"></a> 3.2.4 maxRows

```
Number maxRows
```

The maximum number of rows that are fetched by the `execute()` call of the *Connection*
object when *not* using a [`resultSet`](#resultsetclass).

The default value is 100.

This property may be overridden in an [`execute()`](#execute) call.

`maxRows` is ignored when fetching rows with a
[`resultSet`](#resultsetclass).

To improve database efficiency, SQL queries should use a row
limiting clause like [OFFSET /
FETCH](https://docs.oracle.com/database/121/SQLRF/statements_10002.htm#BABEAACC)
or equivalent. The `maxRows` property can be used to stop badly coded
queries from returning unexpectedly large numbers of rows.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.maxRows = 100;
```

#### <a name="propdboutformat"></a> 3.2.5 outFormat

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
value set to the respective column value.  The case of the
property name will generally be uppercase, depending whether the table
column was created with a default, case-insensitive name.  This
follows Oracle's standard casing rules.

This property may be overridden in an [`execute()`](#execute) call.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.ARRAY;
```

#### <a name="propdbpoolincrement"></a> 3.2.6 poolIncrement

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

The default value is 1.

This property may be overridden when creating a connection pool.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolIncrement = 1;
```

#### <a name="propdbpoolmax"></a> 3.2.7 poolMax

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

The default value is 4.

This property may be overridden when creating the connection pool.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMax = 4;
```

#### <a name="propdbpoolmin"></a> 3.2.8 poolMin

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

The default value is 0.

This property may be overridden when creating a connection pool.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMin = 0;
```

#### <a name="propdbpooltimeout"></a> 3.2.9 poolTimeout

```
Number poolTimeout
```

The time (in seconds) after which idle connections (unused in the
pool) are terminated.  Idle connections are terminated only when the
pool is accessed.  If the `poolTimeout` is set to 0, then idle
connections are never terminated.

The default value is 60.

This property may be overridden when creating a connection pool.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolTimeout = 60;
```

#### <a name="propdbprefetchrows"></a> 3.2.10 prefetchRows

```
Number prefetchRows
```

The number of additional rows the underlying Oracle client library
gets whenever query data is returned from the database in a
[`resultSet`](#resultsetclass).  This is a tuning parameter to
maximize data transfer efficency.  The prefetch size does not affect
when, or how many, rows are returned by node-oracledb to the
application.

`prefetchRows` is ignored unless a [`resultSet`](#resultsetclass) is used.

The default value is 100.

This property may be overridden in an [`execute()`](#execute) call.

See [Row Prefetching](#rowprefetching) for examples.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.prefetchRows = 100;
```

#### <a name="propdbstmtcachesize"></a> 3.2.11 stmtCacheSize

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

#### <a name="propdbversion"></a> 3.2.12 version
```
readonly Number version
```

This readonly property gives a numeric representation of the driver's version.
For driver version *x.y.z*, this property gives the number: `(10000 * x) + (100 * y) + z`

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

If this optional property is *true* then the pool's connections will
be established using [External Authentication](#extauth).

This property overrides the *Oracledb*
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
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

This optional property may be used to override the corresponding
property in the *Oracledb* object.

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.  This optional
property may be used to override the corresponding property in the
*Oracledb* object.

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections. This
optional property may be used to override the corresponding property
in the *Oracledb* object.

```
Number poolTimeout
```

The time (in seconds) after which idle connections (left ununsed in
the pool) are terminated.

This optional property may be used to override the corresponding
property in the *Oracledb* object.

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

## <a name="poolclass"></a> 4. Pool Class

A connection *Pool* object is created by calling the
[`createPool()`](#createpool) method of the *Oracledb* object.

The *Pool* object obtains connections to the Oracle database using the
`getConnection()` method to "check them out" from the pool. Internally, an
[OCI Session Pool](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
is created for each *Pool* object.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the `terminate()` method on the Pool object.

### <a name="poolproperties"></a> 4.1 Pool Properties

The *Pool* object properties may be read to determine the current
values.

#### <a name="proppoolconnectionsinuse"></a> 4.1.1 connectionsInUse

```
readonly Number connectionsInUse
```

The number of currently active connections in the connection pool
i.e.  the number of connections currently checked-out using
`getConnection()`.

#### <a name="proppoolconnectionsopen"></a> 4.1.2 connectionsOpen

```
readonly Number connectionsOpen
```

The number of currently open connections in the underlying connection
pool.

#### <a name="proppoolpoolincrement"></a> 4.1.3 poolIncrement

```
readonly Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

#### <a name="proppoolpoolmax"></a> 4.1.4 poolMax

```
readonly Number poolMax
```

The maximum number of connections that can be open in the connection
pool.

#### <a name="proppoolpoolmin"></a> 4.1.5 poolMin

```
readonly Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

#### <a name="proppoolpooltimeout"></a> 4.1.6 poolTimeout

```
readonly Number poolTimeout
```

The time (in seconds) after which the pool terminates idle connections
(unused in the pool). The number of connection does not drop below
poolMin.

#### <a name="proppoolstmtcachesize"></a> 4.1.7 stmtCacheSize

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

The default is the [`stmtCacheSize`](#propdbstmtcachesize) property of
the *Oracledb* object when the pool is created.

### <a name="poolmethods"></a> 4.2 Pool Methods

#### <a name="getconnectionpool"></a> 4.2.1 getConnection()

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

#### <a name="terminate"></a> 4.2.2 terminate()

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

## <a name="connectionclass"></a> 5. Connection Class

A *Connection* object is obtained by a *Pool* class
[`getConnection()`](#getconnectionpool) or
*Oracledb* class [`getConnection()`](#getconnectiondb)
call.

The connection is used to access an Oracle database.

### <a name="connectionproperties"></a> 5.1 Connection Properties

The properties of a *Connection* object are listed below.

#### <a name="propconnaction"></a> 5.1.1 action

```
writeonly String action
```

The [action](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1434)
attribute for end-to-end application tracing. This is a write-only property.

#### <a name="propconnclientid"></a> 5.1.2 clientId

```
writeonly String clientId
```

The [client
identifier](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1414)
for end-to-end application tracing, use with mid-tier authentication,
and with [Virtual Private Databases](http://docs.oracle.com/database/121/CNCPT/cmntopc.htm#CNCPT62345).
This is a write-only property.

#### <a name="propconnmodule"></a> 5.1.3 module

```
writeonly String module
```

The [module](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1433)
attribute for end-to-end application tracing. This is a write-only property.

#### <a name="propconnstmtcachesize"></a> 5.1.4 stmtCacheSize

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of the connection.  The default value is
the `stmtCacheSize` property in effect in the *Pool* object when the
connection is created in the pool.

### <a name="connectionmethods"></a> 5.2 Connection Methods

#### <a name="break"></a> 5.2.1 break()

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

####  <a name="commit"></a> 5.2.2 commit()

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

#### <a name="execute"></a> 5.2.3 execute()

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

##### <a name="executesqlparam"></a> 5.2.3.1 `execute()`: SQL Statement

```
String sql
```

The SQL or PL/SQL statement that `execute()` executes. The statement
may contain bind variables.

##### <a name="executebindParams"></a> 5.2.3.2 `execute()`: Bind Parameters
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
`val` | The input value or variable to be used for an IN or IN OUT bind variable.
`dir` | The direction of the bind.  One of the [Oracledb Constants](#oracledbconstants) `BIND_IN`, `BIND_INOUT`, or `BIND_OUT`.
`type` | The datatype to be bound. One of the [Oracledb Constants](#oracledbconstants) `STRING`, `NUMBER`, `DATE`, `CURSOR` or `BUFFER`.
`maxSize` | The maximum number of bytes that an OUT or IN OUT bind variable can use.  For `STRING` binds, a default value of 200 is used.

With OUT binds, where the type cannot be inferred by node-oracledb
because there is no input data value, the type defaults to `STRING`
whenever `type` is not specified.

Note `CURSOR` bind variables can only be used for PL/SQL OUT binds.

See [Bind Parameters for Prepared Statements](#bind) for usage and examples.

##### <a name="executeoptions"></a> 5.2.3.3 `execute()`: Options
```
Object options
```

This is an optional parameter to `execute()` that may be used to
control statement execution.

If there are no bind variables in the SQL statement, then a null
`bindParams`, for example *{}*, must be specified before `options`
otherwise you will get the error *ORA-01036: Illegal variable
name/number*.

The following properties can be set or overridden for the execution of
a statement:

Options Property | Description
----------------|-------------
*Boolean autoCommit* | Overrides *Oracledb* [`autoCommit`](#propdbisautocommit)
*Number maxRows* | Overrides *Oracledb* [`maxRows`](#propdbmaxrows)
*String outFormat* | Overrides *Oracledb* [`outFormat`](#propdboutformat)
*Number prefetchRows* | Overrides *Oracledb* [`prefetchRows`](#propdbprefetchrows)
*Boolean resultSet* | Determines whether query results should be returned as a [`resultSet`](#resultsetclass) or directly.  The default is `false`.

##### <a name="executecallback"></a> 5.2.3.4 `execute()`: Callback Function
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
case of the name will generally be uppercase, depending whether the
table column was created with a default, case-insensitive name.  This
follows Oracle's standard casing rules.

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

For `SELECT` statements where [`resultSet`](#executeoptions) is
`true`, use `resultSet` to fetch rows.  See
[ResultSet Class](#resultsetclass).

```
Array rows
```

For `SELECT` statements where [`resultSet`](#executeoptions) is
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

#### <a name="release"></a> 5.2.4 release()

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

#### <a name="rollback"></a> 5.2.5 rollback()

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

## <a name="resultsetclass"></a> 6. ResultSet Class

Result sets allow query results to fetched from the database one at a
time, or in groups of rows.  This enables applications to process very
large data sets.

A *ResultSet* object is obtained by setting `resultSet: true` in the
`options` parameter of the *Connection* [`execute()`](#execute) method
when executing a query.  A *ResultSet* is also returned to
node-oracledb when binding as type [`CURSOR`](#oracledbconstants) to a
PL/SQL REF CURSOR bind parameter.

The value of [`prefetchRows`](#propdbprefetchrows) can be adjusted to
tune the performance of result sets.

See [ResultSet Handling](#resultsethandling) for more information on result sets.

### <a name="resultsetproperties"></a> 6.1 ResultSet Properties

The properties of a *ResultSet* object are listed below.

#### <a name="rsmetadata"></a> 6.1.1 metaData

```
Array metaData
```

Contains an array of column names for the select list of the query or
REF CURSOR.  The case of the name will generally be uppercase,
depending whether the table column was created with a default,
case-insensitive name.  This follows Oracle's standard casing rules.

### <a name="resultsetmethods"></a> 6.2 ResultSet Methods

#### <a name="close"></a> 6.2.1 close()

##### Prototype

```
void close(function(Error error){});
```

##### Return Value

None

##### Description

Closes a `resultSet`.  Applications should always call this at the end
of fetch or when no more rows are needed.

#### <a name="getrow"></a> 6.2.2 getRow()

##### Prototype

```
void getRow(function(Error error, Object row){});
```

##### Return Value

None

##### Description

This call fetches one row of the result set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `resultSet` should be freed by calling [`close()`](#close).

#### <a name="getrows"></a> 6.2.3 getRows()

##### Prototype

```
void getRows(Number numRows, function(Error error, Array rows){});
```

##### Return Value

None

##### Description

This call fetches `numRows` rows of the result set as an object or an array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the `resultSet` should be freed by calling [`close()`](#close).

## <a name="connectionhandling"></a> 7. Connection Handling

Connections can be created directly by *Oracledb*
[`getConnection()`](#getconnectiondb):

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
    . . .
  });
```

Alternatively connections can be obtained from *Pool*
[`getConnection()`](#getconnectionpool):


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
      . . .
      });
  });
```

In most cases, Oracle recommends using a connection pool because all
connections created on the *Oracledb* object are new and cannot be
recycled.  However, in situations where connections are used
infrequently, direct connections may be more efficient than using a
connection pool.

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
    if (err) {
      console.error(err.message);
      return;
    }

    . . .

    connection.release(
      function(err)
      {
        console.error(err.message);
        return;
      });
  });
```

This is particularly true with connection pools.  Pooled connections
should also be released before calling [`terminate()`](#terminate).

### <a name="connectionstrings"></a> 7.1 Connection Strings

The *Oracledb* [`getConnection()`](#getconnectiondb) and *Pool*
[`getConnection()`](#getconnectionpool) `connectString` can be an Easy
Connect string, or a Net Service Name from a local `tnsnames.ora` file
or external naming service, or it can be the SID of a local Oracle
database instance.

If `connectString` is not specified, the empty string "" is used which
indicates to connect to the local, default database.

#### <a name="easyconnect"></a> 7.1.1 Easy Connect Syntax for Connection Strings

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

#### <a name="tnsnames"></a> 7.1.2 Net Service Names for Connection Strings

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

#### <a name="notjdbc"></a> 7.1.3 JDBC and Node-oracledb Connection Strings Compared

Developers familar with Java connection strings that reference a
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

### <a name="drcp"></a> 7.2 Database Resident Connection Pooling

[Database Resident Connection Pooling](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS228)
enables database resource sharing for applications that run in
multiple client processes or run on multiple middle-tier application
servers.  DRCP reduces the overall number of connections that a
database must handle.

DRCP is distinct from node-oracledb's local
[connection pool](#poolclass).  The two pools can be used separately,
or together.

DRCP is useful for applications which share the same credentials, have
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

### <a name="extauth"></a> 7.3 External Authentication

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
[`externalAuth`](propdbextauth) property to *true*.  This property can
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
connections initially created is zero even if a non-zero value is
specified for the [`poolMin`](#propdbpoolmin).  However, once the
number of open connections exceeds `poolMin` and connections are idle
for more than the [`poolTimeout`](#propdbpooltimeout) seconds, then
the number of open connections does not fall below `poolMin`.

## <a name="sqlexecution"></a> 8. SQL Execution

A SQL or PL/SQL statement may be executed using the *Connection*
[`execute()`](#execute) method.

After all database calls on the connection complete, the application
should use the [`release()`](#release) call to release the connection.

### <a name="select"></a> 8.1 SELECT Statements

#### <a name="fetchingrows"></a> 8.1.1 Fetching Rows

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
      { maxRows: 10 },  // a maxium of 10 rows will be returned.  Default limit is 100
      function(err, result)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log(result.rows);  // print all returned rows
      });
```

#### <a name="resultsethandling"></a> 8.1.2 Result Set Handling

If the optional [`execute()` option](#executeoptions) property
`resultSet` is `true`, then query rows can be fetched using the
callback function's `result.resultSet` parameter property.  This is an
instance of the [ResultSet Class](#resultsetclass).  For result sets
the [`maxRows`](#propdbmaxrows) limit is ignored.  All rows can be
fetched.

REF CURSORS returned from a PL/SQL block via a `oracledb.CURSOR` OUT bind
are also available as a `resultSet` object.

Result set rows can be fetched from `resultSet` by using
[`getRow()`](#getrow) or [`getRows()`](getrows).

When all rows have been fetched, or the application does not want to
continue getting more rows, then the result set should be freed using
[`close()`](#close).

The format of each row will be array or object, depending on the value
of [outFormat](#propdboutformat).

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

To fetch multiple rows at a time use `getRows()`:

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

#### <a name="queryoutputformats"></a> 8.1.3 Query Output Formats

Query rows may be returned as an array of column values, or as
Javascript objects, depending on the values of
[outFormat](#propdboutformat).

The default format for each row is an array of column values.
For example:

```javascript
connection.execute("SELECT first_name, salary, hire_date "
                 + "FROM   employees, departments "
                 + "WHERE  employees.department_id = departments.department_id "
                 + "AND    departments.department_name = 'Accounting'",
                   function(err, result) {
                     if (err) { console.error(err.message); return; }
                     var rows = result.rows;
                     for (var i = 0; i < rows.length; i++)
                       console.log("Row " + i + " : " + rows[i]);
                   });
```

If run with Oracle's sample HR schema, the output is:

```
Row 0 : Shelley,12000,Tue Jun 07 1994 01:00:00 GMT-0700 (PDT)
Row 1 : William,8300,Tue Jun 07 1994 01:00:00 GMT-0700 (PDT)
```

Using this format is recommended for efficiency.

Alternatively, rows may be fetched as JavaScript objects. To do so,
specify the `outFormat` option to be `OBJECT`:

```javascript
var oracledb = require('oracledb');

. . .

connection.execute("SELECT first_name, salary, hire_date "
                 + "FROM employees, departments "
                 + "WHERE employees.department_id = departments.department_id "
                 + "AND departments.department_name = 'Accounting'",
                   [],  // No bind variables
                   {outFormat: oracledb.OBJECT},
                   function(err, result) {
                     if (err) { console.error(err.message); return; }
                     var rows = result.rows;
                     for (var i = 0; i < rows.length; i++)
                       console.log("Row " + i + " : " +
                                   rows[i].FIRST_NAME + ", ",
                                   rows[i].SALARY + ", ", rows[i].HIRE_DATE);
                   });
```

If run with Oracle's sample HR schema, the output is:

```
Row 0 : Shelley,  12000,  Tue Jun 07 1994 01:00:00 GMT-0700 (PDT)
Row 1 : William,  8300,  Tue Jun 07 1994 01:00:00 GMT-0700 (PDT)
```

In the preceding example, each row is a JavaScript object that
specifies column names and their respective values.  Note that the
property names are uppercase.  This is the default casing behavior for
Oracle client programs when a database table is created with
case-insensitive column names.

#### <a name="querymeta"></a> 8.1.4 Query Column Metadata

The column names of a query are returned in the
[`execute()`](#execute) callback's `result.metaData` parameter
attribute:

```javascript
connection.execute("SELECT department_id, department_name "
                 + "FROM departments "
                 + "WHERE department_id = :did",
                   [180],
                   function(err, result)
                   {
                     if (err) {
                       console.error(err.message);
                       return;
                     }
                     console.log(result.metaData);  // show the metadata
                   });
```

When using a [`resultSet`](#resultsetclass), metadata is also
available in `result.resultSet.metaData`.

The metadata is an array of objects, one per column.  Each object has
a `name` attribute:

```
[ { name: 'DEPARTMENT_ID' }, { name: 'DEPARTMENT_NAME' } ]
```

The names are in uppercase.  This is the default casing behavior for
Oracle client programs when a database table is created with
case-insensitive column names.

#### <a name="typemap"></a> 8.1.5 Result Type Mapping

Oracle character, number and date columns can be selected.  Data types
that are currently unsupported give a "datatype is not supported"
error.

Query result type mappings for Oracle Database types to JavaScript types are:

-   Variable and fixed length character columns are mapped to JavaScript strings.

-   All numeric columns are mapped to JavaScript numbers.

-   Date and Timestamp columns are mapped to JavaScript dates.
    Note that JavaScript Date has millisecond precision.
    Therefore, timestamps having greater
    precision lose their sub-millisecond fractional part
    when fetched. Internally, `TIMESTAMP` and `DATE`
    columns are fetched as `TIMESTAMP WITH LOCAL TIMEZONE` using
    [OCIDateTime](https://docs.oracle.com/database/121/LNOCI/oci12oty.htm#LNOCI16840).
    When binding a JavaScript Date value in an `INSERT` statement, the date is also inserted as `TIMESTAMP WITH
    LOCAL TIMEZONE` using OCIDateTime.

#### <a name="stmtcache"></a> 8.1.6 Statement Caching

Node-oracledb uses the
[Oracle OCI statement cache](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#i471377).
Each non-pooled connection and each session in the connection pool has
its own cache of statements with a default size of 30.  Statement
caching lets cursors be used without re-parsing the statement.
Statement caching also reduces meta data transfer costs between the
driver and the database.  Performance and scalability are improved.

In general, set the statement cache to the size of the working set of
statements being executed by the application.

Statement caching can be disabled by setting the size to 0.  Disabling
the cache may be beneficial when the quantity or order of statments
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
the[`createPool()`](#createpool) method.

With Oracle Database 12c, the statement cache size can be automatically tuned with the
[External Configuration](#oraaccess) *oraaccess.xml* file.

#### <a name="rowprefetching"></a> 8.1.7 Row Prefetching

Prefetching is a query tuning feature allowing resource usage to be
optimized.  It allows multiple rows to be returned in each network
trip from Oracle Database to node-oracledb when a
[`resultSet`](#resultsetclass) is used for query or REF CURSOR data.
The prefetch size does not affect when, or how many, rows are returned
by node-oracledb to the application.  The buffering of rows is handled
by Oracle's underlying client libraries.

By default [`prefetchRows`](#propdbprefetchrows) is 100 for
[`resultSet`](#resultsetclass) fetches.  The application can choose a
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
`resultSet`.

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

### <a name="bind"></a> 8.2 Bind Parameters for Prepared Statements

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

#### <a name="inbind"></a> 8.2.1 IN Bind Parameters

With IN binds, the bound data value, or current value of a JavaScript
variable, is used during execution of the SQL statement.

In this example, the SQL bind parameters *:country\_id* and
*:country\_name* can be bound to values in node-oracledb using an
array:

```javascript
connection.execute("INSERT INTO countries VALUES (:country_id, :country_name)",
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
SQL bind variables.  This is often called "bind by position".

Instead of binding by array, an object that names each bind value can
be used.  The attributes can in be any order but their names must
match the SQL bind parameter names.  This is often called "bind by
name":

```javascript
connection.execute("INSERT INTO countries VALUES (:country_id, :country_name)",
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
connection.execute("INSERT INTO countries VALUES (:country_id, :country_name)",
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
`STRING`, `NUMBER`, `DATE` or `BUFFER`, matching the data.  The type `CURSOR`
cannot be used with IN binds.

#### <a name="outbind"></a> 8.2.2 OUT and IN OUT Bind Parameters

For each OUT and IN OUT bind parameter, a bind value object containing
`val`, `dir`, `type` and `maxSize` properties is used.

The `dir` attribute should be `BIND_OUT` or `BIND_INOUT`.

The `type` attribute should be `STRING`, `NUMBER`, `DATE`, `CURSOR` or `BUFFER`.
If `type` is not specified then `STRING` is assumed.  Note `CURSOR`
can only be used for PL/SQL OUT bind parameters.

A `maxSize` should be set for `STRING` OUT or IN OUT binds.  This is
the maximum number of bytes the bind parameter will return.  If the
output value does not fit in `maxSize` bytes, then an error such
*ORA-06502: PL/SQL: numeric or value error: character string buffer
too small* or *NJS-016: buffer is too small for OUT binds* occurs.

A default value of 200 bytes is used when `maxSize` is not provided
for OUT binds of type `STRING`.

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

With PL/SQL statements, only scalar parameters can be bound because
PL/SQL array parameters are currently not supported.

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
    if (err) {
      console.error(err.message);
      return;
     }
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

#### <a name="dmlreturn"></a> 8.2.3 DML RETURNING Bind Parameters

Bind parameters from "DML RETURNING" statements (such as `INSERT
... RETURNING ... INTO ...`) can be bound as `STRING` or `NUMBER` OUT
types.

For `STRING` types, an error occurs if `maxSize` is not large enough
to hold a returned value.

Note each DML RETURNING bind parameter is returned as an array
containing zero or more elements.  Application code that is designed
to expect only one value could be made more robust if it confirms the
returned array length is not greater than one.  This will help identify
invalid data or an incorrect `WHERE` clause that causes more results
to be returned.

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
    if (err)
    {
      console.error(err);
      return;
    }
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

#### <a name="refcursors"></a> 8.2.4 REF CURSOR Bind Parameters

Oracle REF CURSORS can be fetched in node-oracledb by binding a
`CURSOR` to a PL/SQL call.  The resulting bind variable becomes a
[`resultSet`](#resultsetclass), allowing rows to be fetched using
[`getRow()`](#getrow) or [`getRows()`](getrows).  When all rows have
been fetched, or the application does not want to continue getting
more rows, then the result set must be freed using
[`close()`](#close).

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

## <a name="transactionmgt"></a> 9. Transaction Management

By default,
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements are not committed in node-oracledb.

The driver implements [`commit()`](#commit) and
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

## <a name="oraaccess"></a> 10. External Configuration

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
