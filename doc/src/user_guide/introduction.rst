.. _intro:

************************************************************
Introduction to the node-oracledb Driver for Oracle Database
************************************************************

The `node-oracledb <https://www.npmjs.com/package/oracledb>`__ add-on for
Node.js is a database driver for high performance Oracle Database applications
written in JavaScript or Typescript.  You can easily write complex
applications, or build sophisticated web services that expose `REST
<https://blogs.oracle.com/oraclemagazine/post/
build-rest-apis-for-nodejs-part-1>`__ or `GraphQL <https://blogs.oracle.
com/opal/post/demo-graphql-with-oracle-database-and-node-oracledb>`__
endpoints. Node-oracledb runs in Node.js, typically as a mid-tier application
server or service. Node-oracledb applications will not run directly in a
browser.

The node-oracledb API is a generic Oracle Database access layer. Almost all the
functionality described in this documentation is common across all current
Oracle Database releases. However, the documentation may describe some features
that are in specific Oracle Database versions, editions, or require additional
database options or packs.

Node-oracledb is typically installed from the `npm registry <https://www.npmjs
.com/package/oracledb>`__. See :ref:`installation` for more information.

This node-oracledb release has been tested with Node.js 14, 16, 18 and 20 on
Oracle Linux x86_64 (releases 7 and 8), Oracle Linux ARM (aarch64, release 8),
Windows, and macOS.  Node-oracledb may run on other platforms, and with other
Node.js versions, if they are `Node-API <https://nodejs.org/api/n-api.html>`__
version 4 compatible. Previous versions of node-oracledb may work with older
versions of Node.js.

.. _architecture:

Architecture
============

Node-oracledb is a 'Thin' driver written in JavaScript.  An optional 'Thick'
mode can be enabled by a run-time setting.  Thick mode uses a binary add-on to
provide :ref:`additional functionality <featuresummary>`.  Binaries built for
common operating systems are included in the node-oracledb installation.

.. _thinarch:

node-oracledb Thin Mode Architecture
------------------------------------

By default, the node-oracledb driver runs in the Thin mode which directly
connects to Oracle Database 12.1 or later. This Thin mode does not need Oracle
Client libraries.

.. _thinarchfig:
.. figure:: /images/node-oracledb-thin.png
   :align: center
   :alt: Illustrates the architecture of the node-oracledb driver in Thin mode. At the left is the Users icon. It is connected to a block labeled Node.js process, which contains two smaller blocks labeled Node.js and node-oracledb module. The Node.js block connects to the Oracle Database icon. The connection establishment sequence is described in the following text.

   Architecture of the node-oracledb driver in Thin mode

The figure shows the architecture of node-oracledb Thin mode. Users interact
with a Node.js application, for example by making web requests. The
application program makes calls to node-oracledb functions. The connection
from node-oracledb Thin mode to the Oracle Database is established directly.  The
database can be on the same machine as Node.js, or it can be remote.

The Oracle Net behavior can optionally be configured by using a
``tnsnames.ora`` file and with application settings. See :ref:`tnsadmin`.

.. _thickarch:

node-oracledb Thick Mode Architecture
-------------------------------------

When node-oracledb uses Oracle Client libraries, then the driver is said to be
in 'Thick' mode and has :ref:`additional functionality <featuresummary>`
available.  An application script runtime option enables this mode by loading
the client libraries, see :ref:`enablingthick`.

.. _thickarchfig:
.. figure:: /images/node-oracledb-thick.png
   :align: center
   :alt: Illustrates the architecture of the node-oracledb driver in Thick mode. At the left is the Users icon. It is connected to a block labeled Node.js process, which contains three smaller blocks labelled Node.js, node-oracledb module, and Oracle Client libraries. The Node.js block connects to the Oracle Database icon. The connection establishment sequence is described in the following text.

   Architecture of the node-oracledb driver in Thick mode

The figure shows the architecture of node-oracledb Thick mode. Users interact
with a Node.js application, for example by making web requests. The application
program makes calls to node-oracledb functions. Internally, node-oracledb
dynamically loads Oracle Client libraries which handle the connections to
Oracle Database.  Depending on the version of the libraries, this mode of
node-oracledb can connect to Oracle Database 9.2 or later.  The database can be
on the same machine as Node.js, or it can be remote.

To use node-oracledb Thick mode, the Oracle Client libraries must be installed
separately, see :ref:`installation`. The libraries can be from an installation
of `Oracle Instant Client <https://www.oracle.com/database/technologies/
instant-client.html>`__, from a full Oracle Client installation (such as
installed by Oracle's GUI installer), or even from an Oracle Database
installation (if Node.js is running on the same machine as the database).
Oracle's standard client-server version interoperability allows connection to
both older and newer databases from different Oracle Client library versions.

Some behaviors of the Oracle Client libraries can optionally be configured
with an ``oraaccess.xml`` file, for example to enable auto-tuning of a
statement cache. See :ref:`Optional Oracle Client Configuration <oraaccess>`.

The Oracle Net behavior can optionally be configured with files such as
``tnsnames.ora`` and ``sqlnet.ora``, for example to enable network encryption.
See :ref:`Optional Oracle Net Configuration <tnsadmin>`.

Oracle environment variables that are set before node-oracledb first creates a
database connection may affect node-oracledb behavior. See
:ref:`Oracle Environment Variables <environmentvariables>`.

Feature Highlights of node-oracledb
===================================

The node-oracledb feature highlights are:

- Easy installation from `npm <https://www.npmjs.com/package/oracledb>`__
- Support for multiple Node.js later, and for multiple Oracle Database
  versions
- Execution of SQL and PL/SQL statements, and access to
  :ref:`SODA <sodaoverview>` document-style access APIs.
- Extensive Oracle data type support, including JSON, CLOB, and BLOB,
  and binding of data types including Oracle Database objects and collections
- Connection management, including connection pooling
- Oracle Database High Availability features
- Full use of Oracle Network Service infrastructure, including encrypted
  network traffic and security features

See :ref:`featuresummary` for more information.
