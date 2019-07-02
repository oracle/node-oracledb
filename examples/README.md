# Node-oracledb Examples

This directory contains [node-oracledb](https://www.npmjs.com/package/oracledb) examples.

To run the examples:

- [Install node-oracledb](https://oracle.github.io/node-oracledb/INSTALL.html#quickstart).


- Edit `dbconfig.js` and set your username, password and the database
connection string:

  ```
  module.exports = {
      user: "hr",
      password: process.env.NODE_ORACLEDB_PASSWORD,
      connectString:"localhost/orclpdb"
  };

  ```

  This reads the password from the environment variable
  `NODE_ORACLEDB_PASSWORD`, which you must set before running
  examples.

- Then run the samples like:

  ```
  node example.js
  ```

- Some examples require schema objects created by `demo.sql`.  For
  example, to load them in the HR schema run:

  ```
  sqlplus hr/welcome@localhost/orclpdb @demo.sql
  ```

  The demonstration objects can be dropped with `demodrop.sql`:

  ```
  sqlplus hr/welcome@localhost/orclpdb @demodrop.sql
  ```

## Example Overview

If this is your first time with node-oracledb, start with
[`example.js`](example.js).

File Name                   | Description
----------------------------|----------------------------------------------------------------------------------
aqoptions.js                | Oracle Advanced Queuing (AQ) example setting options and message attributes
aqmulti.js                  | Oracle Advanced Queuing (AQ) example passing multiple messages
aqobject.js                 | Oracle Advanced Queuing (AQ) example passing an Oracle Database object
aqraw.js                    | Basic Oracle Advanced Queuing (AQ) example passing text messages
blobhttp.js                 | Simple web app that streams an image
calltimeout.js              | Shows how to cancel a SQL statement if it doesn't complete in a specified time
connect.js                  | Basic example for creating a standalone (non-pooled) connection
connectionpool.js           | Basic example creating a pool of connections
cqn1.js                     | Basic Continuous Query Notification (CQN) example
cqn2.js                     | Continuous Query Notification with notification grouping
date.js                     | Show some DATE and TIMESTAMP behaviors
dbconfig.js                 | Common file used by examples for setting connection credentials
dbmsoutputgetline.js        | Show fetching DBMS_OUTPUT by binding buffers
dbmsoutputpipe.js           | Show fetching DBMS_OUTPUT by using a pipelined table
demo.sql                    | SQL script to create extra schema objects for the examples
demodrop.sql                | SQL script to drop the extra schema objects for the examples
dmlrupd1.js                 | Example of DML RETURNING with a single row match
dmlrupd2.js                 | Example of DML RETURNING where multiple rows are matched
em_batcherrors.js           | `executeMany()` example showing handling data errors
em_dmlreturn1.js            | `executeMany()` example of DML RETURNING that returns single values
em_dmlreturn2.js            | `executeMany()` example of DML RETURNING that returns multiple values
em_insert1.js               | Array DML example using `executeMany()` with bind-by-name syntax
em_insert2.js               | Array DML example using `executeMany()` with bind by position
em_plsql.js                 | `executeMany()` example calling PL/SQL multiple times with one call
em_rowcounts.js             | `executeMany()` example showing how to find the number of rows affected by each input row
endtoend.js                 | Example showing setting tracing attributes
example.js                  | Basic example showing creating a table, inserting multiple rows, and querying rows
fetchinfo.js                | Show how numbers and dates can be returned as strings using `fetchAsString` and `fetchInfo`
impres.js                   | Shows PL/SQL 'Implict Results' returning multiple query results from PL/SQL code.
insert1.js                  | Basic example creating a table and inserting data.  Shows DDL and DML
insert2.js                  | Basic example showing auto commit behavior
lobbinds.js                 | Demonstrates how to bind and query LOBs
lobinsert1.js               | Shows inserting a file into a CLOB column
lobinsert2.js               | Inserts text into a CLOB column using the RETURNING INTO method.
lobinserttemp.js            | Writes data to a Temporary CLOB and then inserts it into the database
lobplsqltemp.js             | Streams data into a Temporary CLOB and then passes it to PL/SQL
lobselect.js                | Shows basic, non-streaming CLOB and BLOB queries
lobstream1.js               | Shows how to stream LOBs to files
lobstream2.js               | Shows using Stream data events to fetch a CLOB
metadata.js                 | Shows the metadata available after executing SELECT statements
plsqlarray.js               | Examples of binding PL/SQL "INDEX BY" tables
plsqlfunc.js                | How to call a PL/SQL function
plsqlproc.js                | How to call a PL/SQL procedure
plsqlrecord.js              | Shows binding of PL/SQL RECORDS
plsqlvarrayrecord.js        | Shows binding a VARRAY of RECORD in PL/SQL
raw1.js                     | Shows using a Buffer to insert and select a RAW
refcursor.js                | Shows using a ResultSet to fetch rows from a REF CURSOR
refcursortoquerystream.js   | Converts a REF CURSOR returned from `execute()` to a query stream.
resultset1.js               | Executes a query and uses a ResultSet to fetch rows with `getRow()`
resultset2.js               | Executes a query and uses a ResultSet to fetch batches of rows with `getRows()`
resultsettoquerystream.js   | Converts a ResultSet returned from `execute()` into a Readable Stream.
rowlimit.js                 | Shows ways to limit the number of records fetched by queries
select1.js                  | Executes a basic query without using a connection pool or ResultSet
select2.js                  | Executes queries to show array and object output formats
selectgeometry.js           | Insert and query Oracle Spatial geometries
selectjson.js               | Shows some JSON features of Oracle Database
selectjsonblob.js           | Shows how to use a BLOB as a JSON column store
selectobject.js             | Insert and query a named Oracle database object
selectstream.js             | Executes a basic query using a Readable Stream
selectvarray.js             | Shows inserting and selecting from a VARRAY column
sessionfixup.js             | Shows a pooled connection callback to efficiently set session state
sessiontagging1.js          | Simple pooled connection tagging for setting session state
sessiontagging2.js          | More complex example of pooled connection tagging for setting session state
soda1.js                    | Basic Simple Oracle Document Access (SODA) example
version.js                  | Shows the node-oracledb version attributes
webappawait.js              | A simple web application using a connection pool
