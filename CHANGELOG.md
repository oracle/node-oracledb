# Change Log

## node-oracledb v3.1.1 (25 Jan 2019)

- Rebuild npm package to resolve Linux binary build issue.

## node-oracledb v3.1.0 (22 Jan 2019)

- Support tagging of pooled connections when releasing them to the
  connection pool.  When using Oracle Client libraries 12.2 or later,
  Oracle's multi-property tagging is used, and a PL/SQL "session"
  state fix-up procedure can be called when a requested connection tag
  does not match the actual tag.  This removes the need to reset
  connection session state after every `pool.getConnection()` call.

- Support a Node.js callback function for connection pools.  It is
  called when a connection is newly created and has never been
  acquired from the pool before, or when a requested connection tag
  does not match the actual tag.

- Support explicit dropping of connections from connection pools.

- Support passing parameters in `oracledb.getConnection()` (such as
  `poolAlias`, `tag` and proxy authentication credentials) for use
  with the pool cache.

- Support the combination of a user proxy and external authentication
  with standalone connections (ODPI-C change).

- Defer initialization of the Oracle Client libraries until the first
  use of `oracledb.getConnection()`, `oracledb.createPool()`,
  `oracledb.oracleClientVersion`, or
  `oracledb.oracleClientVersionString`.

  If the Oracle Client cannot be loaded, `getConnection()` and
  `createPool()` will return an error via the callback.  Accessing
  `oracledb.oracleClientVersion` or
  `oracledb.oracleClientVersionString` with throw an error.

  This change allows `require('oracledb')` to always succeed, allowing
  node-oracledb constants and other attributes to be accessed even if
  the Oracle Client is not installed.

  This makes it easier to include node-oracledb in multi-database
  applications where not all users will be accessing Oracle Database.

  It allows code generation tools to access node-oracledb constants
  without needing Oracle Client installed (see
  [#983](https://github.com/oracle/node-oracledb/issues/983)).

  Applications now have more scope to alter Oracle environment
  variables referenced by the Oracle Client layer. Note it is still
  recommended that the environment be set before Node.js is executed
  due to potential for confusion or unexpected behavior due to
  order-of-execution issues.

- Support fetching XMLTYPE columns in queries.  They will return as
  String limited to the VARCHAR2 length.

- Updated install processes by bundling all pre-built binaries into
  the https://www.npmjs.com/package/oracledb package, removing the
  need for a separate binary package download from GitHub.  At runtime
  an appropriate binary is loaded by `require()`, if it exists,
  allowing one `node_modules/oracledb` install to be usable in
  different environments.

  Source code is no longer included in the npm package.  It is still
  available from GitHub and oss.oracle.com.

  The steps for self-hosting a node-oracledb package have changed, see
  [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#selfhost).

- Fixed a crash with high frequency notifications from CQN
  ([#1009](https://github.com/oracle/node-oracledb/issues/1009)).

- Fixed `poolPingInterval` with Oracle client libraries 12.2 or later
  (ODPI-C change).

- Fixed an issue with `poolPingInterval` that could cause usable
  pooled connections to be unnecessarily dropped by
  `connection.close()`.  (ODPI-C change).

- Fixed a memory leak under certain cirumstances when pooled
  connections are released back to the pool. (ODPI-C change)

- Display correct error message for SODA `createIndex()` when no
  parameter is passed.

- Fixed some SODA stability issues (node-oracledb and ODPI-C changes).

- Improved the statement error white list to avoid unnecessarily
  dropping statements from the statement cache (ODPI-C change).

- Made internal changes to fix V8 deprecation compilation warnings
  with Node.js 10.12, and fixed other static analysis warnings.

## node-oracledb v3.0.1 (15 Nov 2018)

- Improve validation for SODA `createDocument()` arguments.

- Stated compatibility is now for Node.js 6, 8, 10, and 11.

- Upgraded NAN dependency from 2.10 to 2.11.1.

## node-oracledb v3.0.0 (1 Oct 2018)

- Added new APIs for Simple Oracle Document Access
  ([SODA](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#sodaoverview)),
  available when using Oracle Database 18.3 and Oracle client
  libraries version 18.3, or later.

- Added a `drainTime` argument to
  [`pool.close()`](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#poolclose),
  allowing pools to be force-closed after a specified number of
  seconds.  PR #950 (Danilo Silva).

- Added a
  [`connection.callTimeout`](https://oracle.github.io/node-oracledb/doc/api.html#propconncalltimeout)
  property to interrupt long running database calls, available when
  using Oracle client libraries version 18.1, or later.

- Added support for specifying the number of iterations to
  `executeMany()` instead of always requiring an input binds array.
  This is useful when there are no binds, or only OUT binds.

- Added binary installer basic proxy authentication support.  Reuse
  `npm config` proxy.  PR #919 (Cemre Mengu).

- Additionally enable `poolPingInterval` functionality when using
  Oracle client libraries 12.2, or later, to aid silent pool
  connection re-establishment after connections exceed database
  session resource limits (e.g. ORA-02396), or are explicitly closed
  by DBAs (e.g. ORA-00028).  (ODPI-C change).

- Removed the connection pool
  [`queueRequests`](https://oracle.github.io/node-oracledb/doc/api.html#propdbqueuerequests)
  property.  Now `pool.getConnection()` calls are always queued if the
  pool is fully in use.

- Altered the internal `pool.getConnection()` logic to work better
  with Oracle client 18 library pool changes and retain backward
  compatibility with older Oracle clients.  This prevents
  `pool.getConnection()` returning ORA-24418 when the connection pool
  needs to grow and Oracle client 18 libraries are being used.

- Unused properties in objects such as the `execute()` result are no
  longer set.  Previously some were set to `undefined`.

- On Windows, Oracle Client libraries in
  `node_modules\oracledb\build\Release` adjacent to the oracledb.node
  binary will now be used in preference to those in PATH. (ODPI-C
  change).

- Change the binary package filename format from '...-node-vXX...' to
  to '...-node-abiXX...' to reduce Node version and ABI confusion.

- Eliminated a memory leak when fetching LOBs and more than one
  internal fetch occurs.

- Test updates.

- Documentation updates, including an attribute type correction from
  PR #970 (Cemre Mengu)

- Examples were added and updated.

## node-oracledb v2.3.0 (7 Jun 2018)

- The stated compatibility is now for Node.js 6, 8, and 10 due to EOL
  of Node.js 4, and the release of Node 10.

- Added support for heterogeneous connection pooling and for proxy
  support in connection pools.  This allows each connection in the
  pool to use different database credentials.

- Added support for Oracle Database Continuous Query Notifications
  (CQN), allowing JavaScript methods to be called when database
  changes are committed.

- Added support to `fetchAsString` and `fetchInfo` for fetching RAW
  columns as STRING (hex-encoded).

- Added Windows support for building binary packages for self-hosting
  on internal networks. PR #891 (Danilo Silva).

- Eliminated a memory leak when binding LOBs as `oracledb.BIND_INOUT`.

- Added an error message indicating that `batchErrors` and
  `dmlRowCounts` can only be used with INSERT, UPDATE, DELETE and
  MERGE statements.

- Fixed a bug that caused `queryStream()` to emit multiple close
  events in Node.js 10.

- Fixed a crash when getting the list of names for an undefined object
  with Node.js 6.

- Remove deprecated `Buffer()` function in tests in order to eliminate
  a deprecation warning with Node.js 10.

- Upgraded NAN dependency from 2.8 to 2.10.

- Made some internal changes to fix NAN 2.10 deprecations: Replaced
  `v8::String::Utf8Value` with `Nan::Uft8String`.  Replaced
  `MakeCallback()` with `runInAsyncScope()`.

- Mention that `queueRequests` is deprecated and will be removed in a
  future version; connection pool queuing will always be enabled in
  that future version.

## node-oracledb v2.2.0 (3 Apr 2018)

- Added
  [`oracledb.oracleClientVersionString`](https://oracle.github.io/node-oracledb/doc/api.html#propdboracleclientversionstring)
  and
  [`connection.oracleServerVersionString`](https://oracle.github.io/node-oracledb/doc/api.html#propconnoracleserverversionstring)
  to complement the existing numeric properties.

- Added
  [`oracledb.edition`](https://oracle.github.io/node-oracledb/doc/api.html#propdbedition)
  to support Edition-Based Redefinition.  This removes the need to use
  an `ALTER SESSION` command or `ORA_EDITION` environment variable.

- Added
  [`oracledb.events`](https://oracle.github.io/node-oracledb/doc/api.html#propdbevents)
  to allow the Oracle client library to receive Oracle Database
  service events, such as FAN and RLB events.  This removes the need
  to use an `oraaccess.xml` file to enable event handling.

- Added
  [`connection.changePassword()`](https://oracle.github.io/node-oracledb/doc/api.html#changingpassword)
  for changing passwords, and also added support for changing the
  password during `oracledb.getConnection()`.

- Added
  [`connection.executeMany()`](https://oracle.github.io/node-oracledb/doc/api.html#executemany)
  for efficient batch DML (e.g. INSERT, UPDATE and DELETE) and PL/SQL
  execution with multiple records.

- Added
  [`connection.getStatementInfo()`](https://oracle.github.io/node-oracledb/doc/api.html#getstmtinfo)
  to find information about a SQL statement without executing it.

- Added
  [`connection.ping()`](https://oracle.github.io/node-oracledb/doc/api.html#connectionping)
  to support system health checks.

- Added support for binding RAW types into Buffers in DML RETURNING statements.

- Created GitHub 'pages' for hosting documentation.  See:
    - https://oracle.github.io/node-oracledb
    - https://oracle.github.io/node-oracledb/INSTALL.html
    - https://oracle.github.io/node-oracledb/doc/api.html

- Simplified the binary installer messages to reduce user uncertainty.

- Improved the text for the NJS-045 runtime loader failure error.

- Made the implementations of `connection.close()` and `pool.close()`
  the primary code paths in place of their respective aliases
  `connection.release()` and `pool.terminate()`.

- An empty object for `fetchInfo` no longer produces an error.

- Updated database abstraction layer to ODPI-C 2.3

- Fixed compilation warnings on Windows.

- Updated the node-oracledb implementation to replace V8 deprecations.

## node-oracledb v2.1.2 (21 Feb 2018)

- Fixed regression with end-to-end tracing attributes not being set.

- Fix binary installer proxy 403 (Bruno Jouhier)

## node-oracledb v2.1.1 (16 Feb 2018)

- Fixed regression with `queryStream()` in Node 4 & 6
  ([#847](https://github.com/oracle/node-oracledb/issues/847)).

## node-oracledb v2.1.0 (15 Feb 2018)

- Added support for [privileged standalone
  connections](https://oracle.github.io/node-oracledb/doc/api.html#privconn):
  SYSDBA, SYSOPER, SYSASM, SYSBACKUP, SYSDG, SYSKM, and SYSRAC

- Improved the
  [Error](https://oracle.github.io/node-oracledb/doc/api.html#properror)
  object with new `errorNum` and `offset` properties for Oracle
  errors.

- Added new
  [`versionString`](https://oracle.github.io/node-oracledb/doc/api.html#propdbversionstring)
  and
  [`versionSuffix`](https://oracle.github.io/node-oracledb/doc/api.html#propdbversionsuffix)
  attributes to aid showing node-oracledb version and release status.

- Added
  [`connectionString`](https://oracle.github.io/node-oracledb/doc/api.html#createpoolpoolattrsconnectstring)
  as an alias for `connectString` in `oracledb.createPool()` and
  `oracledb.getConnection()` (Sagie Gur-Ari).

- Updated the ODPI-C layer:
    - Eliminate DPI-1054 errors, allowing connections to be closed when ResultSets and Lobs are open.
    - Avoid unnecessary roundtrips for rollbacks at connection close.

- Replaced obsolete [NAN](https://github.com/nodejs/nan) API calls in
  internal implementation and fixed other static analysis warnings.
  This means node-oracledb 2.1 no longer builds with Node.js 0.10 or
  Node.js 0.12.

- Improved [`queryStream()`](https://oracle.github.io/node-oracledb/doc/api.html#querystream) streaming:

    - Add support for the Stream `destroy()` method available with Node 8.

    - Simplified the internal implementation by reusing `ResultSet.getRow()`.

    - Fixed some timing and race issues.

    - Made sure the 'close' event is emitted after the 'end' event.

- Simplified query direct fetch implementation and improved
  performance by reusing ResultSet code.

- Exceptions are no longer raised when accessing attributes on closed
  Connections, Pools, Lobs or ResultSets.

- ResultSets are now closed on error to free resources earlier.

- Improved NJS-010 message content by adding the position and invalid
  data type number.

- Fixed support for integers that are larger than Node.js's 32-bit
  integer is capable of handling.

- Updated [INSTALL](https://oracle.github.io/node-oracledb/INSTALL.html)
  to mention:
    - The [yum.oracle.com](http://yum.oracle.com/oracle-linux-nodejs.html) Node.js RPM Packages for Oracle Linux
    - The [Oracle mirror](oss.oracle.com/git/oracle) of [github.com/oracle](https://github.com/oracle).

- Correct the error message text when attempting to set `oracledb.oracleClientVersion`.

## node-oracledb v2.0.15 (15 Dec 2017) changes since node-oracledb version 1

- Release testing is now done for Node.js 4, 6, 8 and 9.

- Node-oracledb now uses the [ODPI-C](https://github.com/oracle/odpi)
  database abstraction library.

- Upgraded [NAN](https://github.com/nodejs/nan) build dependency to 2.8.

- Installation has significantly improved.  Some pre-built binaries
  are available for convenience, or the add-on can be continue to built
  from source code.  Refer to
  [INSTALL](https://oracle.github.io/node-oracledb/INSTALL.html).

    - Added utilities to /package for building binaries for
      distribution, and for installing them.

    - When building from source code:
        - Oracle header files are no longer needed.
        - The `OCI_LIB_DIR` and `OCI_INC_DIR` environment variables are not needed.

    - A single node-oracledb binary now works with any of the Oracle
      11.2, 12.1 or 12.2 clients.  This improves portability when the
      node-oracledb add-on is copied between machines.  Applications
      should be tested with their target environment to make sure
      expected Oracle functionality is available.

    - At run time, users of macOS must put the Oracle client libraries
      in `~/lib` or `/usr/local/lib`.  Linux users of Instant Client
      RPMs must always set `LD_LIBRARY_PATH` or use ldconfig - the
      previous RPATH linking option is not available.  Other Linux users
      should continue to use `LD_LIBRARY_PATH` or ldconfig.  Windows
      users should continue to put Oracle client libraries in `PATH`.

    - On non-Windows platforms, if Oracle client libraries are not
      located in the system library search path
      (e.g. `LD_LIBRARY_PATH`), then node-oracledb attempts to use
      libraries in `$ORACLE_HOME/lib`.

    - A new [Troubleshooting
      section](https://oracle.github.io/node-oracledb/INSTALL.html#troubleshooting)
      was add to INSTALL.

    - Improvements were made to `require('oracledb')` failure messages
      to help users resolve problems.

    - Changed the installation message prefix in binding.gyp from
      'node-oracledb' to 'oracledb'.

- Improved query handling:

    - Enhanced direct fetches to allow an unlimited number of rows to be
      fetched.  This occurs when `oracledb.maxRows = 0`

    - Changed the default value of `oracledb.maxRows` to 0, meaning
      unlimited.

    - Replaced `prefetchRows` (used for internal fetch buffering and
      tuning) with a new property `fetchArraySize`.  This affects direct
      fetches, ResultSet `getRow()` and `queryStream()`.

    - `getRows(numRows,...)` internal fetch buffering is now only tuned
      by the `numRows` value.

    - Implemented `getRow()` in JavaScript for better performance.

- Tightened up checking on in-use ResultSets and Lobs to avoid leaks
  and threading issues by making sure the application has closed them
  before connections can be closed.  The error DPI-1054 may now be
  seen if connections are attempted to be closed too early.

- Added support for fetching columns types LONG (as String) and LONG
  RAW (as Buffer).  There is no support for streaming these types, so
  the value stored in the database may not be able to be completely
  fetched if Node.js and V8 memory limits are reached.

- Added support for TIMESTAMP WITH TIME ZONE date type.  These are
  mapped to a Date object in node-oracledb using LOCAL TIME ZONE.
  The TIME ZONE component is not available in the Date object.

- Added support for ROWID data type.  Data is fetched as a String.

- Added support for UROWID data type. Data is fetched as a String.

- Added query support for NCHAR and NVARCHAR2 columns.  Note binding
  these types for DML may not insert data correctly, depending on the
  database character set and the database national character set.

- Added query support for NCLOB columns.  NCLOB data can be streamed
  or fetched as String.  Note binding NCLOB for DML may not insert
  data correctly, depending on the database character set and the
  database national character set.

- Removed node-oracledb size restrictions on LOB `fetchAsString` and
  `fetchAsBuffer` queries, and also on LOB binds.  Node.js memory
  restrictions will still prevent large LOBs being manipulated in
  single chunks.

- In LOB binds, the bind `val` can now be a String when `type` is
  CLOB, and `val` can now be a Buffer when `type` is BLOB.

- Improved validation for invalid attribute and parameter values.

- The error parameter of function callbacks is now always null if no
  error occurred.

- Database error messages no longer have an extra newline.

- Statements that generate errors are now dropped from the statement
  cache.  Applications running while table definitions change will no
  longer end up with unusable SQL statements due to stale cache
  entries.  Note that Oracle best-practice is never to change table
  definitions while applications are executing.

- Prevent use of NaN with Oracle numbers to avoid data corruption.

- For LOB streaming, make sure 'close' is the very last event, and
  doesn't occur before an 'error' event.

- Fix duplicate 'close' event for error conditions when streaming LOBs
  in Node 8.

- `connection.createLob()` now uses Oracle Call Interface's (OCI)
  underlying 'cache' mode.

- `Lob.close()` now marks LOBs invalid immediately rather than during
  the asynchronous portion of the `close()` method, so that all other
  attempts are no-ops.

- Relaxed the restriction preventing `oracledb.connectionClass` being
  used with dedicated connections; it previously gave ORA-56609.  Now
  DRCP can now be used with dedicated connections but the
  `CLIENT_DRIVER` value in `V$SESSION_CONNECT_INFO` will not be set in
  this case.  The recommendation is still to use a session pool when
  using DRCP.

- Fixed a crash with LOB out binds in DML RETURNING statements when the
  number of rows returned exceeds the number of rows originally
  allocated internally.

- Empty arrays can now be used in PL/SQL Collection Associative Array
  (Index-by) binds.

- Some NJS and DPI error messages and numbers have changed.  This is
  particularly true of DPI errors due to the use of ODPI-C.

- Many new tests have been created.

- Updated examples for new functionality.

- Documentation has been updated and improved.

## node-oracledb v2.0.15 (15 Dec 2017)

- The stated compatibility is now for Node.js 4, 6, 8 and 9.

- Improved query handling:

    - Enhanced direct fetches to allow an unlimited number of rows to be
      fetched.  This occurs when `oracledb.maxRows = 0`

    - Changed the default value of `oracledb.maxRows` to 0, meaning
      unlimited.

    - Replaced `prefetchRows` (used for internal fetch buffering and
      tuning) with a new property `fetchArraySize`.  This affects direct
      fetches, ResultSet `getRow()` and `queryStream()`.

    - `getRows(numRows,...)` internal fetch buffering is now only tuned
      by the `numRows` value.

    - Implemented `getRow()` in JavaScript for better performance.

    - Moved operations on REF CURSORS out of the main thread in order to
      improve performance and memory usage.

- Fixed proxy support in the binary installer.

- Ensured the callback error parameter is null, not undefined, when no
  error occurred.

- Improvements were made to `require('oracledb')` failure messages to
  help users resolve installation and usage problems.

- Fixed compiler deprecation warnings regarding `Nan::ForceSet`.

## node-oracledb v2.0.14 Development (20 Nov 2017)

- Added infrastructure to /package for creating binary installs.
  Updated INSTALL.md.

- Improved validation for invalid attribute and parameter values.

- In LOB binds, the bind "val" can now be a String when "type" is
  CLOB, and "val" can now be a Buffer when "type" is BLOB.

- Changed binding.gyp message prefix from 'node-oracledb' to 'oracledb'.

- Fix compiler warning with va_start

- Eliminate memory leak when processing result sets containing LOBs
  that require more than one fetch operation (regression from v1).

- Move fetch buffer allocation to reduce memory use for Result Sets
  (regression from v1).

- Upgraded NAN dependency from 2.5 to 2.8.

- Updated ODPI-C submodule:
    - Reinstate safe size limit for LOB bind to PL/SQL (node-oracledb regression from v1).
    - Fix valgrind byte overrun when loading `libclntsh` from `$ORACLE_HOME`.
    - Do not prevent connections from being explicitly closed when a fatal error has taken place.
    - Eliminate race condition on initialization.  Add finalization code.
    - Eliminate use of OCI wrappers for use of mutexes, which improves performance (now uses native threading, e.g. pthreads).
    - Prevent use of NaN with Oracle numbers to avoid data corruption.
    - Prevent ORA-1010 during connection ping to pre 10g Oracle Database.
    - Improve debug trace output format.
    - Prevent crash for DML RETURNING of variables that require dynamic binding.

- Updated examples to avoid "DPI-1054: connection cannot be closed
  when open statements or LOBs exist" and to avoid duplicate callbacks
  on stream errors.

- Check for JavaScript exceptions and if one is found, ensure that the
  error is passed correctly to the callback and is not raised when the
  C++ method has finished.

- Added code to handle invalid object properties.

- Make sure 'close' is the very last event, and doesn't occur before
  an 'error' event.  Also emit 'close' after 'error' event for
  `queryStream()`

- Changed default sample connect string to `"localhost/orclpdb"` which
  is the Oracle Database 12.2 default for pluggable databases.

- Moved NJS code from `/src/njs/src` to `/src` to remove obsolete
  directory nesting.

- Perform error cleanup as soon as possible in order to avoid possible
  race conditions when errors take place.

- Move operations on REF CURSORS out of the main thread in order to
  improve performance and memory usage.

- Relaxed the restriction preventing `oracledb.connectionClass` being
  used with dedicated connections; it previously gave ORA-56609.  Now
  DRCP can now be used with dedicated connections but the
  `CLIENT_DRIVER` value in `V$SESSION_CONNECT_INFO` will not be set in
  this case.  The recommendation is still to use a session pool when
  using DRCP.

- Tighten up checking on in-use ResultSets and Lobs to avoid leaks and
  threading issues by making sure the application has closed them
  before connections can be closed.  The error DPI-1054 may now be
  seen if connections are attempted to be closed too early.

- On Windows, disable ODPI-C thread cleanup to resolve a thread timing
  issue, since Node.js creates all threads at startup and never
  terminates them.

- Added extra message text to NJS-045 to give potential causes for
  `require('oracledb')` failures when the ODPI-C layer can't detect
  the issue.

- Updated ODPI-C submodule: various changes including improved
  initialization error messages, and runtime-enabled debug tracing.

- Fix duplicate 'close' event for error conditions when streaming Lobs
  in Node 8.

- Fix LOB streaming 'close' and 'end' event order (regression from v1).

- Fixed crash with LOB out binds in DML RETURNING statements when the
  number of rows returned exceeds the number of rows originally
  allocated internally.

- Improve handling of invalid `externalAuth`, `fetchAsString`, and
  `fetchAsBuffer` attribute values.

- Fix support for `connectionClass` (regression from v1).

## node-oracledb v2.0.13 Development (19 Jun 2017)

- Node-oracledb now uses the [ODPI-C](https://github.com/oracle/odpi)
  database abstraction library.

- Installation instructions have changed.  Refer to
  [INSTALL](https://oracle.github.io/node-oracledb/INSTALL.html).
  Distribution is still via source code.

  Oracle header files are no longer needed.  The `OCI_LIB_DIR` and
  `OCI_INC_DIR` environment variables are not needed.

  At run time, Oracle 11.2, 12.1 or 12.2 client libraries should still
  be in `PATH` (for Windows) or `LD_LIBRARY_PATH` (for Linux) or
  similar platform library loading path.  Users of macOS must put the
  Oracle client libraries in `~/lib` or `/usr/local/lib`.  Linux users
  of Instant Client RPMs must always set `LD_LIBRARY_PATH` or use
  ldconfig - the previous RPATH linking option is not available.

  On non-Windows platforms, if Oracle client libraries are not located
  in the system library search path (e.g. `LD_LIBRARY_PATH`), then
  node-oracledb attempts to use libraries in `$ORACLE_HOME/lib`.

  A single node-oracledb binary now works with any of the Oracle
  client 11.2, 12.1 or 12.2 libraries.  This improves portability when
  node-oracledb builds are copied between machines.

- `Lob.close()` now marks LOBs invalid immediately rather than during
  the asynchronous portion of the `close()` method, so that all other
  attempts are no-ops.

- Incorrect application logic in version 1 that attempted to close a
  connection while certain LOB, ResultSet or other database operations
  were still occurring gave an NJS-030, NJS-031 or NJS-032 "connection
  cannot be released" error.  Now in version 2 the connection will be
  closed but any operation that relied on the connection being open
  will fail.

- Some NJS and DPI error messages and numbers have changed.  This is
  particularly true of DPI errors due to the use of ODPI-C.

- Stated compatibility is now for Node.js 4, 6 and 8.

- Added support for fetching columns types LONG (as String) and LONG
  RAW (as Buffer).  There is no support for streaming these types, so
  the value stored in the DB may not be able to be completely fetched
  if Node.js and V8 memory limits are reached.

- Added support for TIMESTAMP WITH TIME ZONE date type.  These are
  mapped to a Date object in node-oracledb using LOCAL TIME ZONE.
  The TIME ZONE component is not available in the Date object.

- Added support for ROWID data type.  Data is fetched as a String.

- Added support for UROWID data type. Data is fetched as a String.

- Added query support for NCHAR and NVARCHAR2 columns.  Binding for
  DML may not insert data correctly, depending on the database
  character set and the database national character set.

- Added query support for NCLOB columns.  NCLOB data can be streamed
  or fetched as String.  Binding for DML may not insert data
  correctly, depending on the database character set and the database
  national character set.

- Removed node-oracledb size restrictions on LOB `fetchAsString` and
  `fetchAsBuffer` queries, and also on LOB binds.  Node.js and V8
  memory restrictions will still prevent large LOBs being manipulated
  in single chunks.

- Statements that generate errors are now dropped from the statement
  cache.  Applications running while table definitions change will no
  longer end up with unusable SQL statements due to stale cache
  entries.  Note that Oracle best-practice is never to change table
  definitions while applications are executing.

- Empty arrays can now be used in PL/SQL Collection Associative Array
  (Index-by) binds.

- `connection.createLob()` now uses OCI's underlying 'cache' mode.

- Database errors no longer have an extra newline.

- Upgraded NAN dependency from 2.5 to 2.6.

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
  from a `getConnection()` call.  Values are:
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
