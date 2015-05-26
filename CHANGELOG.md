# Change Log

## node-oracledb v0.6.0 (26 May 2015)

- Node-oracledb now builds with Node.js 0.10, Node.js 0.12 and io.js.

- Fixed naming of `autoCommit` in examples.

## node-oracledb v0.5.0 (5 May 2015)

- Changed the `isAutoCommit` attribute name to `autoCommit`.

- Changed the `isExternalAuth` attribute name to `externalAuth`.

- Fixed outBinds array counting to not give empty array entries for IN binds.

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
