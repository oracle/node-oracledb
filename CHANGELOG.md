# Change Log

## node-oracledb v1.7.1 (1 Mar 2016)

- Made public methods overwritable in new JavaScript layer

## node-oracledb v1.7.0 (29 Feb 2016)

- Added a JavaScript wrapper around the C++ API to allow for easier
  extension.

- Added a connection pool queue configured with `queueRequests` and
  `queueTimeout` attributes.  The queue is enabled by default.
  
- Added connection pool option attribute `_enableStats` and method
  `pool._logStats()` to display pool and queue statistics.  Note: these may
  change in future.
  
- Added "bind by position" syntax for PL/SQL Index-by array binds.

- Allowed node-oracledb class instances to be tested with 'instanceof'.

- Fixed some bind issues when bind values are not set by the database.

- Replaced internal usage of `info.This()` with `info.Holder()` for Node.js 0.10.

- Fixed some compilation warnings with some Windows compilers.

## node-oracledb v1.6.0 (30 Jan 2016)

- Added support for binding PL/SQL Collection Associative Array
  (Index-by) types containing numbers and strings.

- Fixed a LOB problem causing an uncaught error to be generated.

- Removed the 'close' event that was incorrectly emitted for LOB Writable
  Streams.  The Node.js Streams documentation specifies it only for
  Readable Streams.

- Updated the LOB examples to show connection release.

- Updated README so first-time users see pre-requisites earlier.

- Extended the OS X install instructions with a way to install that doesn't
  need root access for Instant Client 11.2 on El Capitan.

- Added RPATH link option when building on OS X in preparation for future client.

## node-oracledb v1.5.0 (21 Dec 2015)

- Treat Oracle Database 'Success With Info' warnings as success.

- Extend rollback-on-connection-release with 11g Oracle Clients to occur for all non-query executions. (Not needed with 12c clients).

- Updated OS X install instructions to work on El Capitan.

- Display an error and prevent connection release while database calls are in progress.

- Fixed intermittent crash while selecting data from CLOB column.

- Fixed crash when trying to set invalid values for connection properties.

## node-oracledb v1.4.0 (17 Nov 2015)

- Upgraded NAN dependency to version 2 allowing node-oracledb to build 
  with Node 0.10, 0.12, 4 and 5.  Note: a compiler supporting C++11 is required to build with Node 4.2 and 5.

- Fixed a cursor leak when statement execution fails.

- Fixed a crash when accessing Pool properties on Windows.

- Added a run-script 'testWindows' target for Windows testing. See [test/README.md](test/README.md)

- Fixed compilation warnings with recent compilers.

## node-oracledb v1.3.0 (15 Oct 2015)

- Added a `oracledb.oracleClientVersion` property giving the version of the Oracle
  client library, and a `connection.oracleServerVersion` property giving the Oracle
  Database version.

- Fixed `result.outBinds` corruption after PL/SQL execution.

- Fixed null output from DML RETURNING with Oracle Database 11.2 when the string is of size 4000.

- Fixed default bind direction to be `BIND_IN`.

## node-oracledb v1.2.0 (25 Sep 2015)

- Added support for RAW data type.

- Added a `type` property to the Lob class to distinguish CLOB and BLOB types.

- Changed write-only attributes of Connection objects to work with `console.log()`. Note the attribute values will show as `null`.  Refer to the documentation.

- Added a check to make sure `maxRows` is greater than zero for non-ResultSet queries.

- Improved installer messages for Oracle client header and library detection on Linux, OS X and Solaris.

- Optimized CLOB memory allocation to account for different database-to-client character set expansions.

- Fixed a crash while reading a LOB from a closed connection

- Fixed a crash when selecting multiple rows with LOB values.

- Corrected the order of Stream 'end' and 'close' events when reading a LOB.

- Fixed AIX-specific REF CURSOR related failures.

- Fixed intermittent crash while setting `fetchAsString`, and incorrect output while reading the value.

- Added a check to return an NJS error when an invalid DML RETURN statement does not give an ORA error.

- Removed non-portable memory allocation for queries that return NULL.

- Fixed encoding issues with several files that caused compilation warnings in some Windows environments.

- Made installation halt sooner for Node.js versions currently known to be unusable.

- Fixed a typo in `examples/dbmsoutputgetline.js`

## node-oracledb v1.1.0 (3 Sep 2015)

- Enhanced pool.release() to drop the session if it is known to be unusable, allowing a new session to be created.

- Optimized query memory allocation to account for different database-to-client character set expansions.

- Fixed build warnings on Windows with VS 2015.

- Fixed truncation issue while fetching numbers as strings.

- Fixed AIX-specific failures with queries and RETURNING INTO clauses.

- Fixed a crash with NULL or uninitialized REF CURSOR OUT bind variables.

- Fixed potential memory leak when connecting throws an error. 

- Added a check to throw an error sooner when a CURSOR type is used for IN or IN OUT binds. (Support is pending).

- Temporarily disabling setting lobPrefetchSize

## node-oracledb v1.0.0 (17 Aug 2015)

- Implemented Stream interface for CLOB and BLOB types, adding support for
  LOB queries, inserts, and PL/SQL LOB bind variables

- Added `fetchAsString` and `execute()` option `fetchInfo` properties to allow numbers, dates and ROWIDs to be fetched as strings.

- Added support for binding DATE, TIMESTAMP and TIMESTAMP WITH LOCAL TIME ZONE as `DATE` to DML RETURNING (aka RETURNING INTO) `type`.

- The internal Oracle client character set is now always set to AL32UTF8.

- The test suite and example scripts database credentials can now be set via environment variables.

- Fixed issues with database-to-client character set conversion by allocating extra memory to allow for character expansion.

- Fixed a crash with `ResultSet` and unsupported column data types.

- Fixed a crash allocating memory for large `maxRows` values.

- Fixed a bug preventing closing of a `ResultSet` when `getRow()` or `getRows()` returned an error.

- Fixed date precision issues affecting insert and query.

- Fixed `BIND_OUT` bind `type` not defaulting to `STRING`.

- Fixed INSERT of a date when the SQL has a RETURNING INTO clause and the bind style is array format.

- Improved RETURNING INTO handling of unsupported types and sizes.

- Correctly throw an error when array and named bind syntaxes are mixed together.

## node-oracledb v0.7.0 (20 Jul 2015)

- Added result set support for fetching large data sets.

- Added REF CURSOR support for returning query results from PL/SQL.

- Added row prefetching support.

- Added a test suite.

- Fixed error handling for SQL statements using RETURNING INTO.

- Fixed INSERT of a date when the SQL has a RETURNING INTO clause.

- Renumbered the values used by the Oracledb Constants.

## node-oracledb v0.6.0 (26 May 2015)

- Node-oracledb now builds with Node.js 0.10, Node.js 0.12 and io.js.

- Fixed naming of `autoCommit` in examples.

## node-oracledb v0.5.0 (5 May 2015)

- Changed the `isAutoCommit` attribute name to `autoCommit`.

- Changed the `isExternalAuth` attribute name to `externalAuth`.

- Fixed `outBinds` array counting to not give empty array entries for IN binds.

- Added support for DML RETURNING bind variables.

- Rectified the error message for invalid type properties.

## node-oracledb v0.4.2 (28 Mar 2015)

- node-oracledb is now officially installable from https://www.npmjs.com/package/oracledb

- Added metadata support. Query column names are now provided in the `execute()` callback result object.

- Require a more recent version of Node.js 0.10.

- Changed the default Instant Client directory on AIX from /opt/oracle/instantclient_12_1 to /opt/oracle/instantclient.

## node-oracledb v0.4.1 (13 Mar 2015)

- Added support for External Authentication.

- The `isAutoCommit` flags now works with query execution. This is useful in cases where multiple DML statements are executed followed by a SELECT statement. This can be used to avoid a round trip to the database that an explicit call to `commit()` would add.

- Added AIX build support to package.json.

- Improved errors messages when setting out of range property values.

- Fixed a bug: When `terminate()` of a connection pool fails because connections have not yet been closed, subsequent use of `release()` to close those connections no longer gives an error "ORA-24550: Signal Received".

## node-oracledb v0.3.1 (16 Feb 2015)

- Added Windows build configuration.

- Added Database Resident Connection Pooling (DRCP) support.

- Made an explicit connection `release()` do a rollback, to be consistent with the implicit release behavior.

- Made install on Linux look for Oracle libraries in a search order.

- Added RPATH support on Linux.

- Changed default Oracle Instant client paths to /opt/oracle/instantclient and C:\oracle\instantclient

- Added a compile error message "Oracle 11.2 or later client libraries are required for building" if attempting to build with older Oracle client libraries.

- Fixed setting the `isAutoCommit` property.

- Fixed a crash using pooled connections on Windows.

- Fixed a crash querying object types.

- Fixed a crash doing a release after a failed terminate. (The Pool is still unusable - this will be fixed later)

## node-oracledb v0.2.4 (20 Jan 2015 - initial release)

**Initial Features include**:

- SQL and PL/SQL Execution

- Binding using JavaScript objects or arrays

- Query results as JavaScript objects or array

- Conversion between JavaScript and Oracle types

- Transaction Management

- Connection Pooling

- Statement Caching

- Client Result Caching

- End-to-end tracing

- High Availability Features

  - Fast Application Notification (FAN)

  - Runtime Load Balancing (RLB)

  - Transparent Application Failover (TAF)
