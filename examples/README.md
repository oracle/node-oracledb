# Node-oracledb Examples

This directory contains [node-oracledb](https://www.npmjs.com/package/oracledb)
examples.  Documentation is [here
](https://oracle.github.io/node-oracledb/doc/api.html).

To run the examples:

- [Install node-oracledb](https://oracle.github.io/node-oracledb/INSTALL.html#quickstart).

- Edit `dbconfig.js` and set your username and the database connection string,
for example:

  ```
  module.exports = {
      user: "hr",
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString:"localhost/orclpdb1"
  };

  ```

- In a terminal window, set the environment variable `NODE_ORACLEDB_PASSWORD` to
  the value of your database password.

- Review the samples and then run them like:

  ```
  node example.js
  ```

- After running example, the demonstration objects can be dropped with `demodrop.js`:

  ```
  node demodrop.js
  ```

## Example Overview

If this is your first time with node-oracledb, start with
[`example.js`](example.js).

File Name                                                 | Description
----------------------------------------------------------|----------------------------------------------------------------------------------
[`aqmulti.js`](aqmulti.js)                                | Oracle Advanced Queuing (AQ) example passing multiple messages
[`aqobject.js`](aqobject.js)                              | Oracle Advanced Queuing (AQ) example passing an Oracle Database object
[`aqoptions.js`](aqoptions.js)                            | Oracle Advanced Queuing (AQ) example setting options and message attributes
[`aqraw.js`](aqraw.js)                                    | Basic Oracle Advanced Queuing (AQ) example passing text messages
[`blobhttp.js`](blobhttp.js)                              | Simple web app that streams an image
[`calltimeout.js`](calltimeout.js)                        | Shows how to cancel a SQL statement if it doesn't complete in a specified time
[`connect.js`](connect.js)                                | Basic example for creating a standalone (non-pooled) connection
[`connectionpool.js`](connectionpool.js)                  | Basic example creating a pool of connections
[`cqn1.js`](cqn1.js)                                      | Basic Continuous Query Notification (CQN) example
[`cqn2.js`](cqn2.js)                                      | Continuous Query Notification with notification grouping
[`date.js`](date.js)                                      | Show some DATE and TIMESTAMP behaviors
[`dbconfig.js`](dbconfig.js)                              | Common file used by examples for setting connection credentials
[`dbmsoutputgetline.js`](dbmsoutputgetline.js)            | Show fetching DBMS_OUTPUT by binding buffers
[`dbmsoutputpipe.js`](dbmsoutputpipe.js)                  | Show fetching DBMS_OUTPUT by using a pipelined table
[`demodrop.js`](demodrop.js)                              | Drops the schema objects created by the examples
[`demosetup.js`](demosetup.js)                            | Used to create common schema objects for the examples
[`dmlrupd.js`](dmlrupd.js)                                | Example of DML RETURNING where multiple rows are matched
[`em_batcherrors.js`](em_batcherrors.js)                  | `executeMany()` example showing handling data errors
[`em_dmlreturn1.js`](em_dmlreturn1.js)                    | `executeMany()` example of DML RETURNING that returns single values
[`em_dmlreturn2.js`](em_dmlreturn2.js)                    | `executeMany()` example of DML RETURNING that returns multiple values
[`em_insert1.js`](em_insert1.js)                          | Array DML example using `executeMany()` with bind-by-name syntax
[`em_insert2.js`](em_insert2.js)                          | Array DML example using `executeMany()` with bind by position
[`em_plsql.js`](em_plsql.js)                              | `executeMany()` example calling PL/SQL multiple times with one call
[`em_rowcounts.js`](em_rowcounts.js)                      | `executeMany()` example showing how to find the number of rows affected by each input row
[`endtoend.js`](endtoend.js)                              | Example showing setting tracing attributes
[`example.js`](example.js)                                | Basic example showing creating a table, inserting multiple rows, and querying rows
[`fetchinfo.js`](fetchinfo.js)                            | Show how numbers and dates can be returned as strings using `fetchAsString` and `fetchInfo`
[`impres.js`](impres.js)                                  | Shows PL/SQL 'Implict Results' returning multiple query results from PL/SQL code.
[`insert1.js`](insert1.js)                                | Basic example creating a table and inserting data.  Shows DDL and DML
[`insert2.js`](insert2.js)                                | Basic example showing auto commit behavior
[`lastinsertid.js`](lastinsertid.js)                      | Shows inserting a row and getting its ROWID.
[`lobbinds.js`](lobbinds.js)                              | Demonstrates how to bind and query LOBs
[`lobinsert1.js`](lobinsert1.js)                          | Shows inserting a file into a CLOB column
[`lobinsert2.js`](lobinsert2.js)                          | Inserts text into a CLOB column using the RETURNING INTO method.
[`lobinserttemp.js`](lobinserttemp.js)                    | Writes data to a Temporary CLOB and then inserts it into the database
[`lobplsqltemp.js`](lobplsqltemp.js)                      | Streams data into a Temporary CLOB and then passes it to PL/SQL
[`lobselect.js`](lobselect.js)                            | Shows basic, non-streaming CLOB and BLOB queries
[`lobstream1.js`](lobstream1.js)                          | Shows how to stream LOBs to files
[`lobstream2.js`](lobstream2.js)                          | Shows using Stream data events to fetch a CLOB
[`metadata.js`](metadata.js)                              | Shows the metadata available after executing SELECT statements
[`plsqlarray.js`](plsqlarray.js)                          | Examples of binding PL/SQL "INDEX BY" tables
[`plsqlfunc.js`](plsqlfunc.js)                            | How to call a PL/SQL function
[`plsqlproc.js`](plsqlproc.js)                            | How to call a PL/SQL procedure
[`plsqlrecord.js`](plsqlrecord.js)                        | Shows binding of PL/SQL RECORDS
[`plsqlvarrayrecord.js`](plsqlvarrayrecord.js)            | Shows binding a VARRAY of RECORD in PL/SQL
[`raw.js`](raw.js)                                        | Shows using a Buffer to insert and select a RAW
[`refcursor.js`](refcursor.js)                            | Shows using a ResultSet to fetch rows from a REF CURSOR
[`refcursortoquerystream.js`](refcursortoquerystream.js)  | Converts a REF CURSOR returned from `execute()` to a query stream.
[`resultset1.js`](resultset1.js)                          | Executes a query and uses a ResultSet to fetch rows with `getRow()`
[`resultset2.js`](resultset2.js)                          | Executes a query and uses a ResultSet to fetch batches of rows with `getRows()`
[`resultsettoquerystream.js`](resultsettoquerystream.js)  | Converts a ResultSet returned from `execute()` into a Readable Stream.
[`rowlimit.js`](rowlimit.js)                              | Shows ways to limit the number of records fetched by queries
[`select1.js`](select1.js)                                | Executes a basic query without using a connection pool or ResultSet
[`select2.js`](select2.js)                                | Executes queries to show array and object output formats
[`selectgeometry.js`](selectgeometry.js)                  | Insert and query Oracle Spatial geometries
[`selectjson.js`](selectjson.js)                          | Shows some JSON features of Oracle Database 21c
[`selectjsonblob.js`](selectjsonblob.js)                  | Shows how to use a BLOB as a JSON column store
[`selectobject.js`](selectobject.js)                      | Insert and query a named Oracle database object
[`selectnestedcursor.js`](selectnestedcursor.js)          | Shows selecting from a nested cursor
[`selectstream.js`](selectstream.js)                      | Executes a basic query using a Readable Stream
[`selectvarray.js`](selectvarray.js)                      | Shows inserting and selecting from a VARRAY column
[`sessionfixup.js`](sessionfixup.js)                      | Shows a pooled connection callback to efficiently set session state
[`sessiontagging1.js`](sessiontagging1.js)                | Simple pooled connection tagging for setting session state
[`sessiontagging2.js`](sessiontagging2.js)                | More complex example of pooled connection tagging for setting session state
[`soda1.js`](soda1.js)                                    | Basic Simple Oracle Document Access (SODA) example
[`version.js`](version.js)                                | Shows the node-oracledb version attributes
[`webapp.js`](webapp.js)                                  | A simple web application using a connection pool
