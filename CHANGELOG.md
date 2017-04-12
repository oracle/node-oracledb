# Change Log

## node-oracledb v1.13.1 (12 Apr 2017)

- Fix regression with NULL values to PL/SQL procedures with multiple parameters.

## node-oracledb v1.13.0 (15 Mar 2017)

- Added support for fetching BLOBs as Buffers, using `fetchAsBuffer` and `fetchInfo`.

- Improved PL/SQL Index-by array binding error messages based on PR #470 (Hariprasad Kulkarni).

- Fixed several crashes and a memory leak using CLOBs with `fetchAsString`.

- Fixed several issues including a crash using NULLs and empty strings for LOB `BIND_INOUT` binds.

- Automatically clean up sessions in the connection pool when they become unusable after an ORA-56600 occurs.

- Updated NAN dependency from 2.4 to 2.5.

## node-oracledb v1.12.2 (21 Dec 2016)

- Fix memory allocation with Oracle 11g client libraries when querying CLOBs using `fetchAsString` and `fetchInfo`.

## node-oracledb v1.12.1 Development (16 Dec 2016)

- Added support for fetching CLOBs as Strings, using `fetchAsString` and `fetchInfo`.

- Added `BIND_INOUT` support for temporary LOBs.

## node-oracledb v1.12.0 Development (3 Dec 2016)

- Significantly enhanced LOB support:
   - Added `BIND_IN` support for DML
   - Added `BIND_IN`, `BIND_OUT`, `BIND_INOUT` support for PL/SQL
   - Added a `connection.createLob()` method to create temporary LOBs
   - Added a `lob.close()` method
   - Made enhancements to allow binding String or Buffer data as `STRING` or `BUFFER` to LOB database types
   - Writeable LOB Streams now conclude with a 'close' event

- Added a connection pool 'ping' feature controlled with
  `oracledb.poolPingInterval` and a corresponding `createPool()`
  option. This validates pooled connections when they are returned
  from a `getConnection()` call.  Values are

     - zero: always ping for every pooled `getConnection()`
     - negative: never ping
     - positive: time in seconds the connection must be idle in the pool before `getConnection()` does a ping.  Default is 60 seconds

  The setting is a no-op when node-oracledb is built with Oracle
  Database 12.2 client libraries, where a new, lower-level OCI feature
  provides an always-on, lightweight connection check.

- Upgraded NAN dependency from 2.3 to 2.4.

- Stated compatibility is now for Node.js 0.12, 4, 6 and 7.

- Fixed return value of the DATE type bound as `BIND_INOUT`.

- Fixed passing NULL values bound as `BIND_INOUT` for several data types.

- Fixed compilation warnings with newer Node.js versions due to V8 deprecations.

- Fixed some Windows and OS X compilation warnings.

- Linted JavaScript files, standardizing code, example and test files.

- Updated various examples and created new ones.

- Updated README.md and api.md introductory examples, based on a patch proposed by [Leigh Schrandt](https://github.com/stealthybox).

- Updated README.md thanks to [Nick Heiner](https://github.com/NickHeiner).

- Updated documentation links to point to the Oracle Database 12.2 documentation.

- Made some internal changes to the DPI layer to avoid name space collisions
  and fix session tagging.  These are not visible / exposed through
  node-oracledb.

## node-oracledb v1.11.0 (19 Aug 2016)

- Added a connection pool cache feature allowing pools to have aliases and be more easily used.

- Improved the bootstrap error message when the node-oracledb binary cannot be loaded.

- Fixed memory leaks with `DATE` and `TIMESTAMP` bind values.

- Fixed external authentication which broke in 1.10.

- Fixed metadata `scale` and `precision` values on AIX.

- Made an internal change to replace `std::string.data()` with `std::string.c_str()`.

- Made an internal change to remove an unused parameter from the `NJS_SET_EXCEPTION` macro.

## node-oracledb v1.10.1 (21 Jul 2016)

- Fixed a bug that prevented a null value being passed from JavaScript into an IN OUT bind.

- Fixed a memory leak introduced in 1.10 with REF CURSORs.

- Fixed a memory leak in error handling paths when using REF CURSORs.

- Made an internal change for queries selecting unsupported column types allowing them to report an error earlier.

- Made an internal change to use `std::string&` for string lengths.

- Fixed a compilation warning on Windows.

- Added a mocha configuration file for the test suite.

## node-oracledb v1.10.0 (8 Jul 2016)

- Enhanced query and REF CURSOR metadata is available when a new
  `oracledb.extendedMetaData` or `execute()` option `extendedMetaData`
  property is `true`. (Leonardo Olmi).

- Fixed an issue preventing the garbage collector cleaning up when a
  query with LOBs is executed but LOB data isn't actually streamed.

- Fixed a bug where an error event could have been emitted on a
  QueryStream instance prior to the underlying ResultSet having been
  closed.  This would cause problems if the user tried to close the
  connection in the error event handler as the ResultSet could have
  prevented it.

- Fixed a bug where the public `close()` method was invoked on the
  ResultSet instance that underlies the QueryStream instance if an
  error occurred during a call to `getRows()`. The public method would
  have thrown an error had the QueryStream instance been created from
  a ResultSet instance via the `toQueryStream()` method. Now the
  underlying C++ layer's `close()` method is invoked directly.

- Updated `Pool._logStats()` to throw an error instead of printing to
  the console if the pool is not valid.

- Report an error earlier when a named bind object is used in a
  bind-by-position context.  A new error NJS-044 is returned.
  Previously errors like ORA-06502 were given.

- Added GitHub Issue and Pull Request templates.

- Some enhancements were made to the underlying DPI data access layer.
  **These are not exposed to node-oracledb users.**

   - Allow <code>SYSDBA</code> connections
   - Allow session tagging
   - Allow the character set and national character set to be specified via parameters to the DPI layer.
   - Support heterogeneous pools (in addition to existing homogeneous pools)

## node-oracledb v1.9.3 (24 May 2016)

- Fix error with `OCI_ERROR_MAXMSG_SIZE2` when building with Oracle client 11.2.0.1 and 11.2.0.2.

## node-oracledb v1.9.2 (23 May 2016)

- Fix `results.metaData` for queries with `{resultSet: true}`.

## node-oracledb v1.9.1 (18 May 2016)

- Upgraded to NAN 2.3 for Node 6 support.

- Added a persistent reference to JavaScript objects during Async
  operations to prevent crashes due to premature garbage collection.

- Added a persistent reference to the internal Lob buffer to prevent
  premature garbage collection.

- Fixed memory leaks when using ResultSets.

- Fixed memory leak with the Pool queue timer map.

- Fixed memory release logic when querying LOBs and an error occurs.

- Improved some null pointer checking.

- Altered some node-oracledb NJS-xyz error message text for consistency.

- Improved validation for `fetchInfo` usage.

- Increased the internal buffer size for Oracle Database error messages.

- Call `pause()` internally when closing a query Stream with `_close()`.

- Fixed a symbol redefinition warning for `DATA_BLOB` when compiling on Windows.

- The test suite is no longer installed with `npm install oracledb`.
  The tests remain available in GitHub.

## node-oracledb v1.9.0 Development (19 Apr 2016)

- Added Promise support. All asynchronous functions can now return
  promises. By default the standard Promise library is used for Node
  0.12, 4 and 5.  This can be overridden.

- Added a `toQueryStream()` method for ResultSets, letting REF CURSORS
  be transformed into Readable Streams.

- Added an experimental query Stream `_close()` method.  It allows query
  streams to be closed without needing to fetch all the data.  It is
  not for production use.

- Added aliases `pool.close()` and `connection.close()` for
  `pool.terminate()` and `connection.release()` respectively.

- Some method parameter validation checks, such as the number or types
  of parameters, will now throw errors synchronously instead of
  returning errors via the callback.

- Removed an extra call to `getRows()` made by `queryStream()` at
  end-of-fetch.

- Some random crashes caused by connections being garbage collected
  while still in use should no longer occur.

- Regularized NJS error message capitalization.

## node-oracledb v1.8.0 (24 Mar 2016)

- Added `connection.queryStream()` for returning query results using a
  Node Readable Stream (Sagie Gur-Ari).

- Connection strings requesting DRCP server can now only be used with
  a node-oracledb connection pool.  They will give *ORA-56609* when
  used with `oracledb.getConnection()`.

- Set the internal driver name to `node-oracledb : 1.8.0`.  This is
  visible to DBAs, for example in `V$SESSION_CONNECT_INFO`.

- Added up-time to pool queue statistics.

- Fixed creation of Windows debug builds.

- Bumped NAN dependency to NAN 2.2.

- Added .editorconfig file (Sagie Gur-Ari).

- Improved test date and time checks (Antonio Bustos).

- Improved some parameter checks for `maxArraySize` and `maxSize`.

## node-oracledb v1.7.1 (1 Mar 2016)

- Made public methods over-writable in the new JavaScript layer

## node-oracledb v1.7.0 (29 Feb 2016)

- Added a JavaScript wrapper around the C++ API to allow for easier
  extension.

- Added a connection pool queue configured with `queueRequests` and
  `queueTimeout` attributes.  The queue is enabled by default.

- Added connection pool option attribute `_enableStats` and method
  `pool._logStats()` to display pool and queue statistics.  Note: these may
  change in future.

- Added "bind by position" syntax for PL/SQL Index-by array binds (Dieter Oberkofler).

- Allowed node-oracledb class instances to be tested with 'instanceof'.

- Fixed some bind issues when bind values are not set by the database.

- Replaced internal usage of `info.This()` with `info.Holder()` for Node.js 0.10.

- Fixed some compilation warnings with some Windows compilers.

## node-oracledb v1.6.0 (30 Jan 2016)

- Added support for binding PL/SQL Collection Associative Array
  (Index-by) types containing numbers and strings (Dieter Oberkofler).

- Fixed a LOB problem causing an uncaught error to be generated.

- Removed the 'close' event that was incorrectly emitted for LOB Writable
  Streams.  The Node.js Streams documentation specifies it only for
  Readable Streams.

- Updated the LOB examples to show connection release.

- Updated README so first-time users see pre-requisites earlier.

- Extended the OS X install instructions with a way to install that doesn't
  need root access for Instant Client 11.2 on El Capitan.

- Added RPATH link option when building on OS X in preparation for future client.

- README updates (Kevin Sheedy)

## node-oracledb v1.5.0 (21 Dec 2015)

- Treat Oracle Database 'Success With Info' warnings as success (Francisco Trevino).

- Extend rollback-on-connection-release with 11g Oracle Clients to occur for all non-query executions. (Not needed with 12c clients).

- Updated OS X install instructions to work on El Capitan.

- Display an error and prevent connection release while database calls are in progress.

- Fixed intermittent crash while selecting data from CLOB column.

- Fixed crash when trying to set invalid values for connection properties.

## node-oracledb v1.4.0 (17 Nov 2015)

- Upgraded NAN dependency to version 2 allowing node-oracledb to build
  with Node 0.10, 0.12, 4 and 5 (Richard Natal).  Note: a compiler supporting C++11 is required to build with Node 4 and 5.

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

- Added support for RAW data type (Bruno Jouhier).

- Added a `type` property to the Lob class to distinguish CLOB and BLOB types.

- Changed write-only attributes of Connection objects to work with `console.log()`. Note the attribute values will show as `null`.  Refer to the documentation.

- Added a check to make sure `maxRows` is greater than zero for non-ResultSet queries.

- Improved installer messages for Oracle client header and library detection on Linux, OS X and Solaris.

- Optimized CLOB memory allocation to account for different database-to-client character set expansions.

- Fixed a crash while reading a LOB from a closed connection.

- Fixed a crash when selecting multiple rows with LOB values (Bruno Jouhier).

- Corrected the order of Stream 'end' and 'close' events when reading a LOB (Bruno Jouhier).

- Fixed AIX-specific REF CURSOR related failures.

- Fixed intermittent crash while setting `fetchAsString`, and incorrect output while reading the value.

- Added a check to return an NJS error when an invalid DML RETURN statement does not give an ORA error.

- Removed non-portable memory allocation for queries that return NULL.

- Fixed encoding issues with several files that caused compilation warnings in some Windows environments.

- Made installation halt sooner for Node.js versions currently known to be unusable.

- Fixed a typo in `examples/dbmsoutputgetline.js`

- Windows install instruction updates (Bill Christo)

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

- Node-oracledb now builds with Node.js 0.10, Node.js 0.12 and io.js (Richard Natal).

- Fixed naming of `autoCommit` in examples.

## node-oracledb v0.5.0 (5 May 2015)

- Changed the `isAutoCommit` attribute name to `autoCommit`.

- Changed the `isExternalAuth` attribute name to `externalAuth`.

- Fixed `outBinds` array counting to not give empty array entries for IN binds.

- Added support for DML RETURNING bind variables.

- Rectified the error message for invalid type properties.

## node-oracledb v0.4.2 (28 Mar 2015)

- node-oracledb is now officially installable from https://www.npmjs.com/package/oracledb (Tim Branyen)

- Added metadata support. Query column names are now provided in the `execute()` callback result object.

- Require a more recent version of Node.js 0.10.

- Changed the default Instant Client directory on AIX from /opt/oracle/instantclient_12_1 to /opt/oracle/instantclient.

## node-oracledb v0.4.1 (13 Mar 2015)

- Added support for External Authentication.

- The `isAutoCommit` flags now works with query execution. This is useful in cases where multiple DML statements are executed followed by a SELECT statement. This can be used to avoid a round trip to the database that an explicit call to `commit()` would add.

- Added AIX build support to package.json (Hannes Prirschl).

- Improved errors messages when setting out of range property values.

- Fixed a bug: When `terminate()` of a connection pool fails because connections have not yet been closed, subsequent use of `release()` to close those connections no longer gives an error "ORA-24550: Signal Received".

- Some code refactoring (Krishna Narasimhan).

## node-oracledb v0.3.1 (16 Feb 2015)

- Added Windows build configuration (Rinie Kervel).

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
