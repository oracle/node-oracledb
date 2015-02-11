# node-oracledb: API Documentation for the Oracle Database Node.js Driver

*Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved.*

## Contents

1. [Introduction](#intro)
2. [Errors](#errorobj)
3. [Oracledb Class](#oracledbclass)
  - 3.1 [Oracledb Constants](#oracledbconstants)
     - ARRAY
     - OBJECT
     - STRING
     - NUMBER
     - DATE
     - BIND_IN
     - BIND_INOUT
     - BIND_OUT
  - 3.2 [Oracledb Properties](#oracledbproperties)
     - [connectionClass](#propdbconclass)
     - [isAutoCommit](#propdbisautocommit)
     - [maxRows](#propdbmaxrows)
     - [outFormat](#propdboutformat)
     - [poolIncrement](#propdbpoolincrement)
     - [poolMax](#propdbpoolmax)
     - [poolMin](#propdbpoolmin)
     - [poolTimeout](#propdbpooltimeout)
     - [stmtCacheSize](#propdbstmtcachesize)
     - [version](#propdbversion)
  - 3.3 [Oracledb Methods](#oracledbmethods)
     - 3.3.1 [createPool()](#createpool)
     - 3.3.2 [getConnection()](#getconnection1)
4. [Pool Class](#poolclass)
  - 4.1 [Pool Properties](#poolproperties)
     - [connectionsInUse](#proppoolconnectionsinuse)
     - [connectionsOpen](#proppoolconnectionsopen)
     - [poolIncrement](#proppoolpoolincrement)
     - [poolMax](#proppoolpoolmax)
     - [poolMin](#proppoolpoolmin)
     - [poolTimeout](#proppoolpooltimeout)
     - [stmtCacheSize](#proppoolstmtcachesize)
  - 4.2 [Pool Methods](#poolmethods)
     - 4.2.1 [getConnection()](#getconnection2)
     - 4.2.2 [terminate()](#terminate)
5. [Connection Class](#connectionclass)
  - 5.1 [Connection Properties](#connectionproperties)
     - [action](#propconnaction)
     - [clientId](#propconnclientid)
     - [module](#propconnmodule)
     - [stmtCacheSize](#propconnstmtcachesize)
  - 5.2 [Connection Methods](#connectionmethods)
     - 5.2.1 [break()](#break)
     - 5.2.2 [commit()](#commit)
     - 5.2.3 [execute()](#execute)
     - 5.2.4 [release()](#release)
     - 5.2.5 [rollback()](#rollback)
  - 5.3 [SQL Execution](#sqlexecution)
     - 5.3.1 [IN Bind  Parameters](#inbind)
     - 5.3.2 [OUT and IN OUT Bind Parameters](#outbind)
     - 5.3.3 [SELECT Statements](#select)
         - [Result Type Mapping](#typemap)
         - [Statement Caching](#stmtcache)
6. [Transaction Management](#transactionmgt)
7. [Database Resident Connection Pooling](#drcp)
8. [External Configuration](#oraaccess)

## <a name="intro"></a> 1. Introduction

The Oracle Database Node.js driver *node-oracledb* powers high
performance Node.js applications.

This document shows how to use node-oracledb.  For how to install
node-oracledb, see [INSTALL](#../INSTALL.md).

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

There are more examples in the
[examples](https://github.com/oracle/node-oracledb/examples)
directory.

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

The *Error* object contains a message string in the format:

```
<origin>-<errno>: <message text>
```

A single line error message may look like this:

```
ORA-01017: invalid username/password; logon denied
```

An error message may be multi-line, like this:

```
ORA-06550: line 1, column 7:
PLS-00201: identifier 'TESTPRC' must be declared
ORA-06550: line 1, column 7:
PL/SQL: Statement ignored
```

### 2.1 Error Properties

```
String message
```

The text of the error message.  The error may be a standard Oracle
message with a prefix like ORA or PLS.  Alternatively it may be a
driver specific error prefixed with NJS or DPI.

## <a name="oracledbclass"></a> 3. Oracledb Class

The *Oracledb* object is the factory class for *Pool* and *Connection* objects.
It loads the driver and overrides default configuration parameters.

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
Number ARRAY                = 1     // rows as array of column values

Number OBJECT               = 2     // row as objects
```

#### Constants for [bind parameter](#executebindParams) `type` properties:

```
Number STRING               = 2001  // JavaScript string type

Number NUMBER               = 2002  // JavaScript number type

Number DATE                 = 2003  // JavaScript date type
```

#### Constants for [bind parameter](#executebindParams) `dir` properties

These specify whether bound values are passed into or out from the
database:

```
Number BIND_IN              = 1     // for IN binds

Number BIND_INOUT           = 2     // for IN OUT binds

Number BIND_OUT             = 3     // or OUT binds

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
parameters can result in the error *ORA-24413: Invalid number of
sessions specified*.

Each of the configuration properties is described below.

<a name="propdbconclass"></a>
```
String connectionClass
```

The Connection class value defines a logical name for connections.
When a pooled session has a connection class, Oracle ensures that the
session is not shared outside of that connection class.

The connection class value is similarly used by
[Database Resident Connection Pooling](#drcp) (DRCP) to allow or
disallow sharing of sessions.

For example, where two different kinds of users share one pool, you
might set ```connectionClass``` to 'HR' for connections that access a
Human Resources system, and it might be set to 'OE' for users of an
Order Entry system.  Users will only be given sessions of the
appropriate class, allowing maximal reuse of resources in each case,
and preventing any session information leaking between the two systems.

<a name="propdbisautocommit"></a>
```
Boolean isAutoCommit
```

If this parameter is true, each [DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042) statement is
automatically committed.

By default, this property is false.

<a name="propdbmaxrows"></a>
```
Number maxRows
```

The maximum number of rows that are fetched by the `execute()` call of the *Connection*
object. This parameter may be overridden during the `execute()` call.

The default value is 100.

To improve database efficiency, SQL queries should use a row
limiting clause like [OFFSET /
FETCH](https://docs.oracle.com/database/121/SQLRF/statements_10002.htm#BABEAACC)
or equivalent. The `maxRows` attribute can be used to stop badly coded
queries from returning unexpectedly large numbers of rows.

<a name="propdboutformat"></a>
```
String outFormat
```

The format of rows fetched by the `execute()` call. This can be either
`ARRAY` or `OBJECT`. If specified as `ARRAY`, each row is fetched as an
array of column values.  The default value is `ARRAY`, which is more
efficient.

If specified as `OBJECT`, each row is fetched as a JavaScript object.
The object has a property for each column name, with the property
value set to the the respective column value.  The case of the
property name will generally be uppercase, depending whether the table
column was created with a default, case-insensitive name.  This
follows Oracle's standard casing rules.

<a name="propdbpoolincrement"></a>
```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections. This
parameter may be overridden when creating a connection pool.

The default value is 1.

<a name="propdbpoolmax"></a>
```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.
This parameter may be overridden when creating the connection pool.

The default value is 4.

<a name="propdbpoolmin"></a>
```
Number poolMin
```

The minimum number of connections a connection pool maintains, even if
there is no activity to the target database of the pool. This
parameter may be overridden when creating a connection pool.

The default value is 0.

<a name="propdbpooltimeout"></a>
```
Number poolTimeout
```

The time (in seconds) after which idle connections (unchecked out from
the pool) are terminated. This parameter may be overridden when
creating a connection pool. If the `poolTimeout` is set to 0, then idle
connections are never terminated.

The default value is 60.

<a name="propdbstmtcachesize"></a>
```
Number stmtCacheSize
```

The number of statements that are cached in the [statement cache](#stmtcache) of
each connection. This parameter may be overridden for specific *Pool* or
*Connection* objects.

The default value is 30.

In general, set the statement cache to the size of the working set of
statements being executed by the application.

<a name="propdbversion"></a>
```
readonly Number version
```

The `version` property gives a numeric representation of the driver's version.
For driver version *x.y.z*, this property gives the number: `(10000 * x) + (100 * y) + z`

### <a name="oracledbmethods"></a> 3.3 Oracledb Methods

#### <a name="createpool"></a> 3.3.1 createPool()

This method creates a pool of connections with the specified username,
password and connection string.

##### Description

This is an asynchronous call.

Internally, `createPool()` creates an [OCI Session
Pool](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
for each Pool object. The default properties may be overridden by
specifying new properties in the `poolAttrs` parameter.

A pool should be terminated with the `pool.terminate()` call.

##### Prototype

```
void createPool(Object poolAttrs, function(Error error, Pool pool){});
```

##### Return Value

None

##### Parameters

```
Object poolAttrs
```

The `poolAttrs` parameter provides connection credentials and
pool-specific configuration parameters, such as maximum or minimum
number of connections for the pool or `stmtCacheSize` for the connections.
The properties provided in the `poolAttrs` parameter override the default
pooling properties in effect in the *Oracledb* object.

Note that the `poolAttrs` parameter may have configuration
properties that are not used by the `createPool()` method.  These are
ignored.

The properties of the `poolAttrs` object are described below.

```
String connectString
```

The Oracle database instance to connect to.  The string can be an Easy Connect string, or a
Connect Name from a `tnsnames.ora` file, or the name of a local
Oracle database instance.

The [Easy Connect](https://docs.oracle.com/database/121/NETAG/naming.htm#i498306) syntax is:
*[//]host_name[:port][/service_name][:server_type][/instance_name]*

For example, use *"localhost/XE"* to connect to the database *XE* on the the local machine.

If a Connect Name from a `tnsnames.ora` file is used, set the
`TNS_ADMIN` environment variable such that `$TNS_ADMIN/tnsnames.ora`
is read.  Alternatively make sure the name is in
`$ORACLE_HOME/network/admin/tnsnames.ora` or `/etc/tnsnames.ora`.

If `connectString` is not specified, the empty string "" is used which
indicates to connect to the local, default database.

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
Number stmtCacheSize
```

The number of statements that are cached in the [statement cache](#stmtcache) of
each connection. This optional attribute may be used to override the
corresponding property in the *Oracledb* object.

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

This optional attribute may be used to override the corresponding
property in the *Oracledb* object.

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even if
there is no activity to the target database of the pool. This optional
attribute may be used to override the corresponding property in the
*Oracledb* object.

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections. This
optional attribute may be used to override the corresponding property
in the *Oracledb* object.

```
Number poolTimeout
```

The time (in seconds) after which idle connections (unchecked out from
the pool) are terminated.

This optional attribute may be used to override the corresponding
property in the *Oracledb* object.

```
function(Error error, Pool pool)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createPool()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Pool pool*   | The newly created connection pool. If `createPool()` fails, `pool` will be NULL.  See [Pool class](#poolclass) for more information.

#### <a name="getconnection1"></a> 3.3.2 getConnection()

Gets a connection to a database instance.

##### Description

This is an asynchronous call.

Obtains a connection directly from an *Oracledb* object.  These
connections are not pooled. Such connections are released and
terminated, and all connections created on the *Oracledb* object are
new and cannot be recycled. Therefore, the `getConnection()` call on
the *Oracledb* object incurs more overhead if it is compared to the
`getConnection()` call on the Pool object. However, for situations
where connections are used infrequently, this approach is more
efficient than creating and managing a connection pool.

Note: In most cases, Oracle recommends getting new connections via a
[connection pool](#createpool) instead.

##### Prototype

```
void getConnection(Object connAttrs, function(Error error, Connection conn){});
```

##### Return Value

None

##### Parameters

```
Object connAttrs
```

The `connAttrs` parameter provides connection credentials and
connection-specific configuration parameters, such as `stmtCacheSize`.

Note that the `connAttrs` object may have configuration
properties that are not used by the `getConnection()` method.  These
are ignored.

The properties of the `connAttrs` object are described below.

```
String connectString
```

The Oracle database instance to connect to.  The string can be an Easy Connect string, or a
Connect Name from a `tnsnames.ora` file, or the name of a local
Oracle database instance.

The [Easy Connect](https://docs.oracle.com/database/121/NETAG/naming.htm#i498306) syntax is:
*[//]host_name[:port][/service_name][:server_type][/instance_name]*

For example, use *"localhost/XE"* to connect to the database *XE* on the the local machine.

If a Connect Name from a `tnsnames.ora` file is used, set the
`TNS_ADMIN` environment variable such that `$TNS_ADMIN/tnsnames.ora`
is read.  Alternatively make sure the name is in
`$ORACLE_HOME/network/admin/tnsnames.ora` or `/etc/tnsnames.ora`.

If `connectString` is not specified, the empty string "" is used which
indicates to connect to the local, default database.

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
Number stmtCacheSize
```

The number of statements that must be cached in the [statement cache](#stmtcache) of
each connection.  This optional attribute may be used to override the corresponding
property in the *Oracledb* object.

```
function(Error error, Connection conn)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.  If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

## <a name="poolclass"></a> 4. Pool Class

The Pool, a connection pool object, is created by calling the
[`createPool()`](#createpool) method of the *Oracledb* object.

The Pool object obtains connections to the Oracle database using the
`getConnection()` method to "check them out" from the pool. Internally, an
[OCI Session Pool](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#LNOCI16617)
is created for each Pool object.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the `terminate()` method on the Pool object.

### <a name="poolproperties"></a> 4.1 Pool Properties

The Pool object properties may be read to determine the current
values.

<a name="proppoolconnectionsinuse"></a>
```
readonly Boolean connectionsInUse
```

The number of currently active connections in the connection pool
i.e.  the number of connections currently checked-out using
`getConnection()`.

<a name="proppoolconnectionsopen"></a>
```
readonly Number connectionsOpen
```

The number of currently open connections in the underlying connection
pool.

<a name="proppoolpoolincrement"></a>
```
readonly Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

<a name="proppoolpoolmax"></a>
```
readonly Number poolMax
```

The maximum number of connections that can be open in the connection
pool.

<a name="proppoolpoolmin"></a>
```
readonly Number poolMin
```

The minimum number of connections a connection pool maintains, even if
there is no activity to the target database of the pool.

<a name="proppoolpooltimeout"></a>
```
readonly Number poolTimeout
```

The time (in seconds) after which the pool terminates idle connections
(unchecked out from the pool). The number of connection does not drop
below poolMin.

<a name="proppoolstmtcachesize"></a>
```
readonly Number stmtCacheSize
```

The number of statements that must be cached in the [statement cache](#stmtcache) of
each connection.  This parameter may be overridden for a specific
Connection object.  The default is the `stmtCacheSize` property of the
*Oracledb* object when the pool is created.

### <a name="poolmethods"></a> 4.2 Pool Methods

#### <a name="getconnection2"></a> 4.2.1 getConnection()

This method obtains a connection from the connection pool.

##### Description

This is an asynchronous call.

If a previously opened connection is available in the pool, that
connection is returned. If all connections in the pool are in use, a
new connection is created and returned to the caller, as long as the
number of connections does not exceed the specified maximum for the
pool. If the pool is at its maximum limit, the `getConnection()` call
results in an error, such as *ORA-24418: Cannot open further sessions*.

##### Prototype

```
void getConnection(function(Error error, Connection conn){});
```

##### Return Value

None

##### Parameters

```
function(Error error, Connection conn)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.   If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

#### <a name="terminate"></a> 4.2.2 terminate()

This call terminates the connection pool.

##### Description

This is an asynchronous call.

Any open connections should be released with [`release()`](#release)
before `terminate()` is called, otherwise an error will be returned
and the pool will be unusable.

##### Prototype

```
void terminate(function(Error error){});
```

##### Return Value

None

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `terminate()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="connectionclass"></a> 5. Connection Class

The Connection object is obtained by a Pool Class
[`getConnection()`](#getconnection2) or
Oracledb Class [`getConnection()`](#getconnection1)
call.

The connection is used to access an Oracle database.

### <a name="connectionproperties"></a> 5.1 Connection Properties

The properties of a *Connection* object are listed below.

<a name="propconnaction"></a>
```
writeonly String action
```

The [action](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1434)
for attribute for end-to-end application tracing. This is a write-only property.

<a name="propconnclientid"></a>
```
writeonly String clientId
```

The [client
identifier](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1414)
for end-to-end application tracing, use with mid-tier authentication,
and with [Virtual Private Databases](http://docs.oracle.com/database/121/CNCPT/cmntopc.htm#CNCPT62345).
This is a write-only property.
<a name="propconnmodule"></a>
```
writeonly String module
```

The [module](https://docs.oracle.com/database/121/LNOCI/oci08sca.htm#sthref1433)
attribute for end-to-end application tracing. This is a write-only property.

<a name="propconnstmtcachesize"></a>
```
readonly Number stmtCacheSize
```

The number of statements that must be cached in the [statement cache](#stmtcache) of
the connection. The default value is the `stmtCacheSize` property in effect in the *Pool*
object when the connection is created in the pool.

### <a name="connectionmethods"></a> 5.2 Connection Methods

#### <a name="break"></a> 5.2.1 break()

This call stops the currently running operation on the connection.

If there is no operation in progress or the operation has completed by
the time the break is issued, the `break()` is effectively a no-op.

If the running operation is broken, its executing call will return an error.

##### Description

This is an asynchronous call.

##### Prototype

```
void break(function(Error error){});
```

##### Return Value

None

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `break()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="commit"></a> 5.2.2 commit()

This call commits the current transaction in progress on the connection.

##### Description

This is an asynchronous call.

##### Prototype

```
void commit(function(Error error){});
```

##### Return Value

None

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `commit()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="execute"></a> 5.2.3 execute()

This call executes a SQL or PL/SQL statement.  See [SQL Execution](#sqlexecution) for examples.

##### Description

This is an asynchronous call.

The statement to be executed may contain [IN binds](#inbind),
[OUT or IN OUT](#outbind) bind values or variables, which are bound
using either an object or an array.

A callback function returns a `result` object, containing any fetched
rows, the values of any OUT and IN OUT bind variables, and the number
of rows affected by the execution of
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements.

##### Prototype

```
void execute(String sql, [Object bindParams, [Object options,]] function(Error error, [Object result]){});
```

##### Return Value

None

##### Parameters

```
String sql
```

The SQL string that is executed. The SQL string may contain bind
parameters.

<a name="executebindParams"></a>
```
Object bindParams
```

This parameter only needs to be specified if there are bind
parameters in the SQL statement.  If the `execute()` parameter
`options` is needed and there are no bind variables, then a null
bind parameter must be specified, for example: *{}*, otherwise you
will get error *ORA-01036: Illegal variable name/number*.

See [SQL Execution](#sqlexecution) for more details on binding.

The bind parameter can be either an object that specifies bind
values or variables by name, or an array that specifies bind values
or variable by position. For example, the bind parameters
*:country\_id* and *:country\_name* can be bound using an object
that names each bind value: *{country_id: 90, country_name: "Tonga"}*

Alternatively, the bind parameters can also be specified by position
using an array: *[90, "Tonga"]*

A bind value may be an object with the following attributes:

Bind Property | Description
---------------|------------
`val` | The input value or variable to be used for an IN or IN OUT bind variable.
`dir` | The direction of the bind.  One of the [Oracledb Constants](#oracledbconstants) `BIND_IN`, `BIND_INOUT`, or `BIND_OUT`.
`type` | The datatype to be bound. One of the [Oracledb Constants](#oracledbconstants) `STRING`, `NUMBER` or `DATE`.
`maxSize` | The maximum number of bytes that an OUT or IN OUT bind variable can use.  For `STRING` binds, a default value of 200 is used.

When `type` is not specified, the type defaults to `STRING`.

```
Object options
```

This is an optional parameter to `execute()` that may be used to override the
default SQL execution properties of the *Oracledb* object. The
following properties can be overridden.

Option Property | Description
----------------|-------------
*Number maxRows*  | Number of rows to fetch for `SELECT` statements. To improve database efficiency, SQL queries should use a row limiting clause like [OFFSET / FETCH](https://docs.oracle.com/database/121/SQLRF/statements_10002.htm#BABEAACC) or equivalent. The `maxRows` attribute can be used to stop badly coded queries from returning unexpectedly large numbers of rows.
*String outFormat* |  The format of rows fetched for `SELECT` statements. This can be either `ARRAY` or `OBJECT`. If specified as `ARRAY`, then each row is fetched as an array of column values. If specified as `OBJECT`, then each row is fetched as a JavaScript object.
*Boolean isAutoCommit* | If it is true, then each [DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042) is automatically committed. Note: Oracle Database will implicitly commit when a [DDL](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CHDJJGGF) statement is executed.

```
function(Error error, [Object result])
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `execute()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Object result* | The [`result`](#resultobject) object, described below. For DDL statements and DML where the application only checks `error` for success or failure, the `result` parameter can be omitted.


<a name="resultobject"></a>
##### Result Object Properties

The properties of `result` object from the `execute()` callback are described below.

```
Number rowsAffected
```

For
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements this contains the number of rows affected, for example the
number of rows inserted. For non-DML statements such as queries, or if
no rows are affected, then `rowsAffected` will be zero.

```
array rows
```

For `SELECT` statements, `rows` contains an array of fetched rows.  It
will be NULL if there is an error or the SQL statement was not a
SELECT statement.  By default, the rows are in an array of column
value arrays, but this can be changed to arrays of objects by
passing the `outFormat` option for the `execute()` call as `OBJECT`.
If a single row is fetched, then `rows` is an array that contains
one single row.  The number of rows returned is limited to the
`maxRows` configuration property of the *Oracledb* object, although
this may be overridden in any `execute()` call.

```
Array/object outBinds
```

This is either an array or an object containing OUT and IN OUT bind
values. If `bindParams` is passed as an array, then `outBinds` is
returned as an array. If `bindParams` is passed as an object, then
`outBinds` is returned as an object.

#### <a name="release"></a> 5.2.4 release()

Releases a connection.  If the connection was obtained from the pool,
the connection is returned to the pool.

##### Description

This is an asynchronous call.

Note: calling `release()` when connections are no longer required is
strongly encouraged.  Releasing helps avoid resource leakage and can
improve system efficiency.

When a connection is released, any ongoing transaction on the
connection is rolled back.

After releasing a connection to a pool, there is no
guarantee a subsequent `getConnection()` call gets back the same
database connection.  The application must redo any ALTER SESSION
statements on the new connection object, as required.

##### Prototype

```
void release(function(Error error){});
```

##### Return Value

None

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `release()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="rollback"></a> 5.2.5 rollback()

This call rolls back the current transaction in progress on the
connection.

##### Description

This is an asynchronous call.

##### Prototype

```
void rollback(function(Error error){});
```

##### Return Value

None

##### Parameters

```
function(Error error)
```

The parameters of the callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `rollback()` succeeds `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

### <a name="sqlexecution"></a> 5.3 SQL Execution

A SQL or PL/SQL statement may be executed using the *Connection*
[`execute()`](#execute) method.


[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements are not committed unless the `commit()` call is issued or
the `isAutoCommit` property is *true* at the time of execution.  Any
ongoing transaction will be rolled back when [`release()`](#release)
is called, or when the application ends.

Using bind variables in SQL statements is recommended in preference to
constructing SQL statements by string concatenation.  This is for
performance and security.  IN binds are values passed into the
database.  OUT binds are used to retrieve data.  IN OUT binds are
passed in, and may return a different value after the statement
executes.

#### <a name="inbind"></a> 5.3.1 IN Bind Parameters

SQL and PL/SQL statements may contain bind parameters, indicated by
colon-prefixed identifiers or numerals.  For example, this SQL
statement contains two bind parameters *:country\_id* and
*:country\_name*.

```
INSERT INTO countries VALUES (:country_id, :country_name)
```

The parameters can be bound using either an object that contains bind
values.  The bind parameters *:country\_id* and *:country\_name*, can
be bound using an object that names each bind value:

```javascript
connection.execute("INSERT INTO countries VALUES (:country_id, :country_name)",
             {country_id: 90, country_name: "Tonga"},
             function(err, result)
             {
                 if (!err)
                     console.log("Rows inserted " + result.rowsAffected);
             });
```


Alternatively, the bind parameters can be specified by position
using an array:

```javascript
connection.execute("INSERT INTO countries VALUES (:country_id, :country_name)",
             [90, "Tonga"],
             function(err, result)
             {
                 if (!err)
                     console.log("Rows inserted " + result.rowsAffected);
             });
```

It is also possible to specify bind variables (as opposed to bind
values) in the bind parameter object or array. The current values of the
variables are used for the SQL execution.

With PL/SQL statements, only scalar parameters can be passed.  An
array of values cannot be passed to a PL/SQL bind parameter.

#### <a name="outbind"></a> 5.3.2 OUT and IN OUT Bind Parameters

For OUT and IN OUT binds, the bind value is an object containing
`val`, `dir`, `type` and `maxSize` properties.  The `results`
parameter of the `execute()` callback contains an `outBinds` property
that has the returned OUT and IN OUT binds as either array elements or
property values.  This depends on whether an array or object was
initially passed as the `inout` parameter to the `execute()` call.
That is, if bind-by-name is done by passing an object with a key
matching the bind variable name, then the OUT bind is also returned as
an object with the same key.  Similarly, if bind-by-position is done
by passing an array of bind values, then the OUT and IN OUT binds are
in an array with the bind positions in the same order.

If the type is not specified then the type `STRING` is assumed. In
case of `STRING`, applications should preferably specify the `maxSize`
which is the maximum number of bytes the corresponding OUT or IN OUT
bind parameter would take.  If the output bind value does not fit in
`maxSize` bytes, then an error *ORA-1406: fetched column
value was truncated* occurs.

A default value of 200 bytes is used when `maxSize` is not provided
for binds of type `STRING`.

With PL/SQL statements, only scalar parameters can be bound because
PL/SQL array parameters are currently not supported.

Here is an example program showing the use of OUT binds.

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  },
  function (err, connection)
  {
    if (err) { console.error(err.message); return; }

    var bindvars = {
      i:  'Chris',  // default is type STRING and direction IN
      io: { val: 'Jones', dir : oracledb.BIND_INOUT },
      o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
    }
    connection.execute(
      "BEGIN testproc(:i, :io, :o); END;",
      bindvars,
      function (err, result)
      {
        if (err) { console.error(err.message); return; }
        console.log(result.outBinds);
      });
  });
```

Given the creation of `TESTPROC` as:

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

The output would be:

```
{ io: 'ChrisJones', o: 101 }
```

#### <a name="select"></a> 5.3.3 SELECT Statements

If the the `execute()` method contains a SQL `SELECT` statement, it returns
an array of rows. Each row, by default, is an array of column values.
The rows array holds up to `maxRows` number of rows.

The following example shows how to obtain rows returned a `SELECT`
statement.

```javascript
connection.execute("SELECT first_name, salary, hire_date "
                 + "FROM   employees, departments "
                 + "WHERE  employees.department_id = departments.department_id "
                 + "AND    departments.department_name = :1",
                   ["Accounting"],
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
connection.execute("SELECT first_name, salary, hire_date "
                  + "FROM employees, departments "
                  + "WHERE employees.department_id = departments.department_id "
                  + "AND departments.department_name = :1",
                   ["Accounting"],
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

#### <a name="typemap"></a> Result Type Mapping

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
    LOCAL TIMEZONE` using
    [OCIDateTime](https://docs.oracle.com/database/121/LNOCI/oci12oty.htm#LNOCI16840).

#### <a name="stmtcache"></a> Statement Caching

Node-oracledb uses the
[Oracle OCI statement cache](https://docs.oracle.com/database/121/LNOCI/oci09adv.htm#i471377)
which manages a cache of statements for each session.  In the database
server, statement caching lets cursors be used without reparsing the
statement.  This eliminates repetitive statement parsing and reduces
meta data transfer costs between the driver and the database.  This
improve performance and scalability.

In general, set the statement cache to the size of the working set of
statements being executed by the application.

The statement cache can be automatically tuned with the
[oraaccess.xml file](#oraaccess).

## <a name="transactionmgt"></a> 6. Transaction Management

Node-oraclebd implements [`commit()`](#commit) and
[`rollback()`](#rollback) methods.

After all database calls on the connection complete, the application
should use the [`release()`](#release) call to release the connection.

When a connection is released, it rolls back any ongoing
transaction.  Therefore if a released, pooled connection is used by
a subsequent [`pool.getConnection()`](#getconnection2) call, then any
[DML](https://docs.oracle.com/database/121/CNCPT/glossary.htm#CNCPT2042)
statements performed on the obtained connection are always in a new
transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back if there is no explicit commit.

## <a name="drcp"></a> 7. Database Resident Connection Pooling

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
[`oracledb.getConnection()`](#getconnection1) connections that do not
use a local connection pool.  These connections reuse a DRCP pooled
server process (thus avoiding the costs of process creation and
destruction) but do not reuse its session memory.  The 'Purity' is
SELF for [`pool.getConnection()`](#getconnection2) connections,
allowing reuse of the pooled server process and session memory, giving
maximum benefit from DRCP.  See the Oracle documentation on
[benefiting from scalability](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS506).

The
[Oracle DRCP documentation](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS228)
has more details, including when to use, and when not to use DRCP.

There are a number of Oracle Database `V$` views that can be used to
monitor DRCP.  These are discussed in the documentation and in the
Oracle white paper
[PHP Scalability and High Availability](http://www.oracle.com/technetwork/topics/php/php-scalability-ha-twp-128842.pdf).
This paper also gives more detail on configuring DRCP.

## <a name="oraaccess"></a> 8. External Configuration

When node-oracledb is linked with Oracle 12c client libraries, the Oracle
client-side configuration file
[oraaccess.xml](http://docs.oracle.com/database/121/LNOCI/oci10new.htm#LNOCI73053)
can be used to configure some behaviors of node-oracledb.

For example, oraaccess.xml can be used to:

- turn on [Fast Application Notification](http://docs.oracle.com/database/121/ADFNS/adfns_avail.htm#ADFNS538) (FAN) events to enable FAN notifications and [Runtime Load Balancing](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS515) (RLB)
- configure [Client Result Caching](http://docs.oracle.com/database/121/ADFNS/adfns_perf_scale.htm#ADFNS464) parameters
- turn on client auto-tuning

Other features can also be enabled.  Refer to the
[oraaccess.xml documentation](http://docs.oracle.com/database/121/LNOCI/oci10new.htm#LNOCI73053)
