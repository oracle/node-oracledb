.. _intro:

************************************************************
Introduction to the Node-oracledb Driver for Oracle Database
************************************************************

The `node-oracledb <https://www.npmjs.com/package/oracledb>`__ add-on
for Node.js powers high performance Oracle Database applications. You
can use node-oracledb in your Node.js TypeScript or JavaScript code.
This lets you easily write complex applications, or build sopisticated
web services using
`REST <https://blogs.oracle.com/oraclemagazine/post/build-rest-apis-for-nodejs-part-1>`__
or
`GraphQL <https://blogs.oracle.com/opal/post/demo-graphql-with-oracle-database-and-node-oracledb>`__.

The node-oracledb API is a generic Oracle Database access layer. Almost
all the functionality described here is common across all current Oracle
Databases. However, the documentation may describe some database features
that are in specific Oracle Database versions, editions, or require
additional database options or packs.

**Node-oracledb Features**

The node-oracledb feature highlights are:

-  Easily installed from
   `npm <https://www.npmjs.com/package/oracledb>`__
-  Support for Node.js 14 and later, and for multiple Oracle Database
   versions. (Note: older versions of node-oracledb supported older
   versions of Node.js)
-  Execution of SQL and PL/SQL statements, and access to
   :ref:`SODA <sodaoverview>` document-style access APIs.
-  Extensive Oracle data type support, including large objects (CLOB and
   BLOB) and binding of SQL objects
-  Connection management, including connection pooling
-  Oracle Database High Availability features
-  Full use of Oracle Network Service infrastructure, including
   encrypted network traffic and security features

A complete list of features can be seen
`here <https://oracle.github.io/node-oracledb/#features>`__.

.. _architecture:

Node-oracledb Architecture
===========================

Node-oracledb is a Node.js add-on that allows Node.js applications to
access Oracle Database.

.. figure:: /images/node-oracledb-architecture.png
   :alt: Architecture diagram of Node.js, node-oracledb and Oracle
      Database. It is described in the next paragraph

   Architecture diagram of Node.js, node-oracledb and Oracle Database.
   It is described in the next paragraph

The diagram shows one deployment scenario. Users interact with a Node.js
application, for example by making web requests. The application program
makes calls to node-oracledb functions. Internally node-oracledb
dynamically loads Oracle Client libraries. Connections are established
from node-oracledb to Oracle Database. This allows
:ref:`SQL <sqlexecution>`, :ref:`PL/SQL <plsqlexecution>`, and
:ref:`SODA <sodaoverview>` to be used by the application.

Node-oracledb is typically installed from the `npm
registry <https://www.npmjs.com/package/oracledb>`__. The Oracle Client
libraries need to be installed separately. The libraries can be obtained
from an installation of Oracle Instant Client, from a full Oracle Client
installation, or even from an Oracle Database installation (if Node.js
is running on the same machine as the database). The versions of Oracle
Client and Oracle Database do not have to be the same. Oracle Net is not
a separate product: it is how the Oracle Client and Oracle Database
communicate.

Some behaviors of the Oracle Client libraries can optionally be
configured with an ``oraaccess.xml`` file, for example to enable
auto-tuning of a statement cache. See :ref:`Optional Oracle Client
Configuration <oraaccess>`.

The Oracle Net layer can optionally be configured with files such as
``tnsnames.ora`` and ``sqlnet.ora``, for example to enable network
encryption. See :ref:`Optional Oracle Net Configuration <tnsadmin>`.

Oracle environment variables that are set before node-oracledb first
creates a database connection will affect node-oracledb behavior.
Optional variables include ``NLS_LANG``, ``NLS_DATE_FORMAT`` and
``TNS_ADMIN``. See :ref:`Oracle Environment
Variables <environmentvariables>`.

.. _getstarted:

Getting Started with Node-oracledb
==================================

Install Node.js from `nodejs.org <https://nodejs.org/en/download/>`__.

Install node-oracledb using the :ref:`Quick Start Node-oracledb
Installation <quickstart>` steps. Node-oracledb runs in Node.js, typically
as a mid-tier application server or service. Node-oracledb applications will
not run directly in a browser.

Download node-oracledb
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
or create a script like the one below. As well as
:ref:`Async/Await <asyncawaitoverview>` functions, node-oracledb can also
use :ref:`Callbacks <callbackoverview>`, and
:ref:`Promises <promiseoverview>`.

Locate your Oracle Database `user name and
password <https://blogs.oracle.com/sql/post/how-to-create-users-grant-them-privileges-and-remove-them-in-oracle-database>`__,
and the database :ref:`connection string <connectionstrings>`. The
connection string is commonly of the format ``hostname/servicename``,
using the host name where the database is running and the Oracle
Database service name of the database instance.

Substitute your user name, password and connection string in the code.
For downloaded examples, put these in
`dbconfig.js <https://github.com/oracle/node-oracledb/tree/main/examples/dbconfig.js>`__.

Run the script, for example::

  node myscript.js

.. _examplequery:

Example: A SQL SELECT statement in Node.js
------------------------------------------

.. code-block:: javascript

   // myscript.js
   // This example uses Node 8's async/await syntax.

   const oracledb = require('oracledb');

   oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

   const mypw = ...  // set mypw to the hr schema password

   async function run() {

     let connection;

     try {
       connection = await oracledb.getConnection( {
         user          : "hr",
         password      : mypw,
         connectString : "localhost/XEPDB1"
       });

       const result = await connection.execute(
         `SELECT manager_id, department_id, department_name
          FROM departments
          WHERE manager_id = :id`,
         [103],  // bind value for :id
       );
       console.log(result.rows);

     } catch (err) {
       console.error(err);
     } finally {
       if (connection) {
         try {
           await connection.close();
         } catch (err) {
           console.error(err);
         }
       }
     }
   }

   run();

With Oracle’s sample `HR
schema <https://github.com/oracle/db-sample-schemas>`__, the
output is::

   [ { MANAGER_ID: 103, DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT' } ]

.. _examplesodaawait:

Example: Simple Oracle Document Access (SODA) in Node.js
--------------------------------------------------------

:ref:`node-oracledb’s SODA API <sodaoverview>` can be used for
document-style access with Oracle Database 18 and above, when
node-oracledb uses Oracle Client 18.5 or Oracle Client 19.3, or later.
Users require the CREATE TABLE privilege and the SODA_APP role.

.. code-block:: javascript

   // mysoda.js
   // This example uses Node 8's async/await syntax.

   const oracledb = require('oracledb');

   const mypw = ...  // set mypw to the hr schema password

   oracledb.autoCommit = true;

   async function run() {

     let connection;

     try {
       connection = await oracledb.getConnection( {
         user          : "hr",
         password      : mypw,
         connectString : "localhost/orclpdb1"
       });

       // Create a new (or open an existing) document collection
       const soda = connection.getSodaDatabase();
       const collectionName = 'nodb_soda_collection';
       const myCollection = await soda.createCollection(collectionName);

       // Insert a new document
       const myContent = { name: "Sally", address: {city: "Melbourne"} };
       await myCollection.insertOne(myContent);

       // Print names of people living in Melbourne
       const filterSpec = { "address.city": "Melbourne" };
       const myDocuments = await myCollection.find().filter(filterSpec).getDocuments();
       myDocuments.forEach(function(element) {
         const content = element.getContent();
         console.log(content.name + ' lives in Melbourne.');
       });
     } catch(err) {
       console.log('Error in processing:\n', err);
     } finally {
       if (connection) {
         try {
           await connection.close();
         } catch(err) {
           console.log('Error in closing connection:\n', err);
         }
       }
     }
   }

   run();

Output is::

  Sally lives in Melbourne.
