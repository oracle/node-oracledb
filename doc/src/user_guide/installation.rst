.. _installation:

************************
Installing node-oracledb
************************

By default, the node-oracledb driver is a pure JavaScript module that directly
connects to Oracle Database 12.1 or later. This 'Thin' mode does not need
Oracle Client libraries. The database can be on the same machine as Node.js, or
it can be remote.

Pre-built 'Thick' mode binaries for common architectures (Windows 64-bit, Linux
x86_64, Linux ARM (aarch64), and macOS Intel) are included in the node-oracledb
installation as a convenience.  Thick mode provides some :ref:`additional
functionality <featuresummary>`.  To use Thick mode, Oracle Client libraries
version 11.2, or later, need to be manually installed.  Node-oracledb Thick
mode can connect to Oracle Database 9.2 or later, depending on the Oracle
Client library version.  Note the operating systems and versions of Node.js
that the pre-built node-oracledb binaries are compatible with will change as
the Node.js project evolves. The binaries are not guaranteed to be available or
usable in your environment.  The Thick mode binary may additionally build from
available C source code on other platforms like Windows 32-bit, Solaris, and
AIX environments. See :ref:`github`.

.. _quickstart:

Quick Start node-oracledb Installation
======================================

Simple installation instructions for Windows, macOS, and Linux are available:

-  `Quick Start: Developing Node.js Applications for Oracle
   Database <https://www.oracle.com/database/technologies/appdev/quickstartnodeonprem.html>`__

-  `Quick Start: Developing Node.js Applications for Oracle Autonomous
   Database <https://www.oracle.com/database/technologies/appdev/quickstartnodejs.html>`__

Alternatively, follow these instructions:

1. Install Node.js from `nodejs.org <https://nodejs.org/en/download/>`__.

2. Add ``oracledb`` to your ``package.json`` dependencies or run:

   .. code-block:: shell

      npm install oracledb

   This installs from the `npm registry <https://www.npmjs.com/package/
   oracledb>`__.

   If you are behind a firewall, you may need to set the proxy with a command
   like ``npm config set proxy http://myproxy.example.com:80/``.

3. Download the node-oracledb `examples
   <https://github.com/oracle/node-oracledb/ tree/main/examples>`__ or
   alternatively create a script like :ref:`myscript.js <examplequery>` or
   :ref:`mysoda.js <examplesodaawait>` as given below.

4. Locate your Oracle Database `user name and password <https://blogs.oracle.
   com/sql/post/how-to-create-users-grant-them-privileges-and-remove-them-in-
   oracle-database>`__, and the database
   :ref:`connection string <connectionstrings>`. The connection string is
   commonly of the format ``hostname/servicename``, using the host name where
   the database is running and the Oracle Database service name of the database
   instance. For example, ``localhost/FREEPDB1``.

5. Substitute your user name, password, and connection string in the code. For
   downloaded examples, put these in `dbconfig.js <https://github.com/oracle/
   node-oracledb/tree/main/examples/dbconfig.js>`__ or set the relevant
   environment variables.

6. Run the script, for example::

    node myscript.js

If you run into installation trouble, see :ref:`troubleshooting`.

.. _examplequery:

Example: A SQL SELECT statement in Node.js
------------------------------------------

.. code-block:: javascript

    // myscript.js

    const oracledb = require('oracledb');

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    const mypw = ...  // set mypw to the hr schema password

    async function run() {

        const connection = await oracledb.getConnection ({
            user          : "hr",
            password      : mypw,
            connectString : "localhost/FREEPDB1"
        });

        const result = await connection.execute(
            `SELECT manager_id, department_id, department_name
             FROM departments
             WHERE manager_id = :id`,
            [103],  // bind value for :id
        );

        console.log(result.rows);
        await connection.close();
    }

    run();

With Oracle’s sample `HR
schema <https://github.com/oracle/db-sample-schemas>`__, the
output is::

    [ { MANAGER_ID: 103, DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT' } ]

This example uses :ref:`Async/Await <asyncawaitoverview>` syntax.
Node-oracledb can also use :ref:`Callbacks <callbackoverview>`, and
:ref:`Promises <promiseoverview>`.

.. _examplesodaawait:

Example: Simple Oracle Document Access (SODA) in Node.js
--------------------------------------------------------

Node-oracledb’s :ref:`SODA API <sodaoverview>` can be used for document-style
access with Oracle Database 18 and above when node-oracledb Thick mode uses
Oracle Client 18.5 or Oracle Client 19.3 (or later) libraries.  Users require
the database CREATE TABLE privilege and the SODA_APP role.

.. code-block:: javascript

    // mysoda.js

    const oracledb = require('oracledb');

    let clientOpts = {};
    if (process.platform === 'win32') {                                   // Windows
        clientOpts = { libDir: 'C:\\oracle\\instantclient_19_18' };
    } else if (process.platform === 'darwin' && process.arch === 'x64') { // macOS Intel
        clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_19_8' };
    } // else on other platforms the system library search path
      // must always be set before Node.js is started.

    // enable Thick mode which is needed for SODA
    oracledb.initOracleClient(clientOpts);

    const mypw = ...  // set mypw to the hr schema password

    oracledb.autoCommit = true;

    async function run() {
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

        await connection.close();
    }

    run();

Output is::

    Sally lives in Melbourne.

Supported Oracle Database Versions
==================================

When node-oracledb is used in the default Thin mode, it connects directly to
the Oracle Database and does not require Oracle Client libraries. Connections
in this mode can be made to Oracle Database 12.1 or later.

When node-oracledb is in :ref:`Thick mode <enablingthick>` using Oracle Client
libraries, connections can be made to Oracle Database 9.2, or later, depending
on the Oracle Client library version.

Oracle's standard client-server network interoperability allows connections
between different versions of Oracle Client libraries and Oracle Database. For
currently certified configurations, see Oracle Support's `Doc ID 207303.1
<https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1>`__.  In
summary:

- Oracle Client 23 can connect to Oracle Database 19 or later
- Oracle Client 21 can connect to Oracle Database 12.1 or later
- Oracle Client 19, 18, and 12.2 can connect to Oracle Database 11.2 or later
- Oracle Client 12.1 can connect to Oracle Database 10.2 or later
- Oracle Client 11.2 can connect to Oracle Database 9.2 or later

Not all features are available in all versions or driver modes. Any attempt to
use Oracle features that are not supported by a particular mode or client
library/database combination will result in runtime errors.The
node-oracledb attributes :attr:`oracledb.thin`, :attr:`pool.thin` and
:attr:`connection.thin` can be used to see what mode a connection is in. In the
Thick mode, the attribute :attr:`oracledb.oracleClientVersion` can be used to
determine which Oracle Client version is in use. The attribute
:attr:`connection.oracleServerVersionString` can be used to determine which
Oracle Database version a connection is accessing.  These attributes can be
used to adjust application feature usage appropriately.

.. _prerequisites:

Installation Requirements
=========================

To use node-oracledb, you need:

- Node.js 14.6 or later.

- Access to an Oracle Database either local or remote, on-premises, or in the
  :ref:`Cloud <connectionadb>`. You will need to know the `database
  credentials <https://www.youtube.com/ watch?v=WDJacg0NuLo>`__ and the
  :ref:`connection string <connectionstrings>` for the database.

  Installing node-oracledb does not install or create a database.

- Optionally, Oracle Client libraries can be installed to enable the
  :ref:`node-oracledb Thick mode <enablingthick>` which has some
  :ref:`additional functionality <featuresummary>`. These libraries can be:

  - from the free `Oracle Instant Client
    <https://www.oracle.com/database/technologies/instant-client.html>`__, or

  - from a full Oracle Client installation (such as installed by Oracle's GUI
    installer), or

  - from those included in Oracle Database if Node.js is on the same machine as
    the database

  Oracle Client libraries versions 23, 21, 19, 18, 12, and 11.2 are supported
  where available on Linux, Windows, and macOS. Oracle's standard
  client-server version interoperability allows connection to both older and
  newer databases.

  Run ``node -p "process.arch"`` to identify the Node.js architecture so that
  you can install the appropriate 64-bit or 32-bit Oracle Client libraries.

.. _linuxinstall:

Installing Node.js and node-oracledb on Linux
=============================================

Review the :ref:`prerequisites`.

.. _nodelin:

Install Node.js
---------------

1. Download and extract the `Node.js “Linux Binaries” <https://nodejs.org>`__
   package. For example, if you downloaded version 18.16.0 for 64-bit you could
   install Node.js into ``/opt``::

        cd /opt
        tar -Jxf node-v18.16.0-linux-x64.tar.xz

2. Set ``PATH`` to include Node.js::

        export PATH=/opt/node-v18.16.0-linux-x64/bin:$PATH

.. _nodeoracledblin:

Install node-oracledb
---------------------

1. Install node-oracledb using the ``npm`` package manager, which is included
   in Node.js::

        npm install oracledb

   This will download and install node-oracledb from the `npm registry
   <https://www.npmjs.com/package/oracledb>`__.

   If you are behind a firewall, then you may need to set your proxy first
   before installing node-oracledb, for example::

        npm config set proxy http://myproxy.example.com:80/


2. You can now run applications.

   Runnable samples are available from GitHub. To try them follow these steps:

   a. Download the `examples <https://github.com/oracle/node-oracledb/tree/
      main/examples>`__.

   b. Edit ``dbconfig.js`` and set the `database credentials <https://www.
      youtube.com/watch?v=WDJacg0NuLo>`__ to your environment, for example::

        module.exports = {
            user          : "hr",
            password      : process.env.NODE_ORACLEDB_PASSWORD,
            connectString : "localhost/FREEPDB1"
        };

   c. Run one of the examples, such as `example.js <https://github.com/oracle/
      node-oracledb/tree/main/examples/example.js>`__::

        node example.js

3. If you want to use node-oracledb :ref:`Thick mode features <featuresummary>`
   in your application, then follow the instructions in the
   :ref:`next section <clientlin>`. Otherwise, if you will only ever use Thin
   mode, you can optionally minimize the install footprint by removing all the
   Thick mode binaries automatically installed with node-oracledb. To remove
   the binaries, run commands like::

        cd node_modules/oracledb
        npm run prune all

   This can be automated with a ``postinstall`` script in your ``package.json``
   file::

        "scripts": {
          "postinstall": "cd node_modules/oracledb && npm run prune all"
        },

Questions can be asked as `GitHub Discussions
<https://github.com/oracle/node-oracledb/discussions>`__.

.. _clientlin:

Install Oracle Client to use Thick Mode
---------------------------------------

By default, the node-oracledb driver is a pure JavaScript module that runs in a
Thin mode connecting directly to Oracle Database so no further installation
steps are required.  However, to use additional node-oracledb features
available in :ref:`Thick mode <featuresummary>`, you need to install Oracle
Client libraries.  Oracle Client versions 23, 21, 19, 18, 12, and 11.2 are
supported. Thick mode uses a binary add-on installed with node-oracledb that
loads these Oracle Client libraries.

Depending on whether your database is on the same machine as Node.js or
remote, you may need to adjust the Oracle Client installation instructions:

- If your database is on a remote computer, then download the free `Oracle
  Instant Client <https://www.oracle.com/database/technologies/instant-client.
  html>`__ "Basic" or "Basic Light" package for your operating system
  architecture and if your Linux distribution:

  - Uses the Debian package format, then follow the instructions in
    :ref:`instzip`
  - Or uses RPM packages, then follow the instructions in :ref:`instrpm`

- Alternatively, use the client libraries already available in a locally
  installed database such as the free `Oracle Database Free <https://www.
  oracle.com/database/technologies/free-downloads.html>`_ release
  (previously known as Oracle Database Express Edition ("XE")) and follow the
  instructions in :ref:`instoh`.

For Linux x86_64, the pre-built node-oracledb binary was built on Oracle Linux
8 and requires glibc 2.14 version or later. For Linux ARM (aarch64), the
binary was built on Oracle Linux 8. If you want to use Thick mode but a
pre-built binary is not available for your architecture, you will need to
:ref:`compile node-oracledb from source code <github>`.

If you have multiple copies of Oracle Client libraries installed, check if the
expected version is first in ``LD_LIBRARY_PATH``.

If you need system privileges to set, or preserve, variables like ``PATH``,
you can use ``sudo -E`` on Linux.

.. note::

    To use node-oracledb in Thick mode you must call
    :meth:`oracledb.initOracleClient()` in your application, see
    :ref:`oracleclientloadinglinux`. For example:

    .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

On Linux, do not pass the ``libDir`` attribute to
:meth:`oracledb.initOracleClient()`. The Oracle Client libraries on Linux
*must* be in the system library search path *before* the Node.js process
starts.

.. _instzip:

Oracle Instant Client ZIP Files
+++++++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine and either:

- you prefer installing Instant Client ZIP files instead of
  :ref:`RPM packages <instrpm>`

- or your Linux distribution uses the Debian package format, for example
  if you are using Ubuntu. Note: you should review Oracle’s supported
  distributions before choosing an operating system.

To use node-oracledb Thick mode with Oracle Instant Client zip files:

1. Download an Oracle 23, 21, 19, 18, 12, or 11.2 "Basic" or "Basic Light" zip
   file matching your architecture:

   - `Linux 64-bit (x86-64) <https://www.oracle.com/database/technologies/
     instant-client/linux-x86-64-downloads.html>`__

   - `Linux ARM 64-bit (aarch64) <https://www.oracle.com/database/
     technologies/instant-client/linux-arm-aarch64-downloads.html>`__

   Oracle Instant Client 23ai will connect to Oracle Database 19 or later.
   Oracle Instant Client 21c will connect to Oracle Database 12.1 or later.
   Oracle Instant Client 19c will connect to Oracle Database 11.2 or later.

   It is recommended to keep up to date with the latest Oracle Instant Client
   release updates of your desired major version.  Oracle Database 23ai and 19c
   are Long Term Support Releases whereas Oracle Database 21c is an Innovation
   Release.

2. Unzip the package into a directory accessible to your application, for
   example::

        mkdir -p /opt/oracle
        cd /opt/oracle
        wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linuxx64.zip
        unzip instantclient-basic-linuxx64.zip

   Note: OS restrictions may prevent the opening of Oracle Client libraries
   installed in unsafe paths, such as from a user directory. You may need to
   install under a directory like ``/opt`` or ``/usr/local``.

3. Install the ``libaio`` package. On some platforms the package is called
   ``libaio1``. Depending on your Linux distribution package manager, run a
   command like::

        yum install -y libaio

   or::

        apt-get install -y libaio1

   When using Oracle Instant Client 19 on recent Linux versions such as Oracle
   Linux 8, you may need to manually install the ``libnsl`` package to make
   ``libnsl.so`` available. This package is not needed from Oracle Instant
   Client 21 and later.

4. If there is no other Oracle software on the machine that will be impacted,
   then permanently add Instant Client to the run-time link path. For example,
   if the Basic package is unzipped to ``/opt/oracle/instantclient_19_18``,
   then run the following using sudo or as the root user::

        sudo sh -c "echo /opt/oracle/instantclient_19_18 > /etc/ld.so.conf.d/oracle-instantclient.conf"
        sudo ldconfig

   Alternatively, set the environment variable ``LD_LIBRARY_PATH`` to the
   appropriate directory for the Instant Client version. For example::

        export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_18:$LD_LIBRARY_PATH

5. Call :meth:`oracledb.initOracleClient()` in your application to enable
   Thick mode, see :ref:`oracleclientloadinglinux`.

6. If you use the optional Oracle configuration files, see
   :ref:`usingconfigfiles`.

If disk space is important, most users will be able to use the smaller Basic
Light package instead of the Basic package. Review its `globalization limitations
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E6566C23-54C9-490C-
ADD1-EEB6240512EB>`__. Disk space can be reduced by removing unnecessary
libraries and files from either the Basic or Basic Light packages. The exact
libraries depend on the Instant Client version. For example, with Oracle
Instant Client 19, you can optionally remove files using::

    rm -i *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci

Refer to the `Oracle Instant Client documentation <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-3AD5FA09-8A7C-4757-8481-7A6A6ADF479E>`_ for
details.

.. _instrpm:

Oracle Instant Client RPMs
++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine and your
Linux distribution uses RPM packages. Also see :ref:`Installing Node.js and
node-oracledb RPMs from yum.oracle.com <instnoderpms>`.

To use node-oracledb with Oracle Instant Client RPMs:

1. Download an Oracle 23, 21, 19, 18, 12, or 11.2 "Basic" or "Basic Light" RPM
   matching your architecture:

   - `Linux 64-bit (x86-64) <https://www.oracle.com/database/technologies/
     instant-client/linux-x86-64-downloads.html>`__
   - `Linux ARM 64-bit (aarch64) <https://www.oracle.com/database/
     technologies/instant-client/linux-arm-aarch64-downloads.html>`__

  Alternatively, Oracle's yum server has convenient repositories, see `Oracle
  Database Instant Client for Oracle Linux
  <https://yum.oracle.com/oracle-instant-client.html>`__ instructions. The
  repositories are:

  - Oracle Linux 9 (x86-64)

    - `Instant Client 23 for Oracle Linux 9 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL9/oracle/instantclient23/x86_64/index.html>`__

    - `Instant Client 19 for Oracle Linux 9 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL9/oracle/instantclient/x86_64/index.html>`__

  - Oracle Linux 8 (x86-64)

    - `Instant Client 23 for Oracle Linux 8 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient23/x86_64/index.html>`__

    - `Instant Client 21 for Oracle Linux 8 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient21/x86_64/index.html>`__

    - `Instant Client 19 for Oracle Linux 8 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/x86_64/index.html>`__

  - Oracle Linux 8 (aarch64)

    - `Instant Client 19 for Oracle Linux Arm 8 (aarch64)
      <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/aarch64/index.html>`__

  - Oracle Linux 7 (x86-64)

    - `Instant Client 21 for Oracle Linux 7 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient21/x86_64/index.html>`__

    - `Instant Client 19 and 18 for Oracle Linux 7 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html>`__

  - Oracle Linux 7 (aarch64)

    - `Instant Client 19 for Oracle Linux Arm 7 (aarch64)
      <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/aarch64/index.html>`__

  - Oracle Linux 6 (x86-64)

    - `Instant Client 18 for Oracle Linux 6 (x86-64)
      <https://yum.oracle.com/repo/OracleLinux/OL6/oracle/instantclient/x86_64/index.html>`__

   Oracle Instant Client 23ai will connect to Oracle Database 19 or later.
   Oracle Instant Client 21c will connect to Oracle Database 12.1 or later.
   Oracle Instant Client 19c will connect to Oracle Database 11.2 or later.

   It is recommended to keep up to date with the latest Oracle Instant Client
   release updates of your desired major version.  Oracle Database 23ai and 19c
   are Long Term Support Releases whereas Oracle Database 21c is an Innovation
   Release.

2. Install the downloaded RPM with sudo or as the root user. For example::

        sudo yum install oracle-instantclient19.18-basic-19.18.0.0.0-1.x86_64.rpm

   You can install directly from yum.oracle.com, for example using::

        sudo yum -y install oracle-release-el8
        sudo yum-config-manager --enable ol8_oracle_instantclient
        sudo yum -y install oracle-instantclient19.18-basic

   If you have a `ULN <https://linux.oracle.com>`__ subscription, another
   alternative is to use ``yum`` to install the Basic package after
   enabling the ol7_x86_64_instantclient or ol6_x86_64_instantclient
   repository, depending on your version of Linux.

   Yum automatically installs required dependencies, such as ``libaio``
   package.

   When using Oracle Instant Client 19 on recent Linux versions such as Oracle
   Linux 8, you may need to manually install the ``libnsl`` package to make
   ``libnsl.so`` available. This package is not needed from Oracle Instant
   Client 21 onward.

3. For Instant Client 19 RPMs, the system library search path is automatically
   configured during installation.

   For older versions, if there is no other Oracle software on the machine
   that will be impacted, then permanently add Instant Client to the run-time
   link path. For example, with sudo or as the root user::

        sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
        sudo ldconfig

   Alternatively, for version 18 and earlier, every shell running Node.js
   will need to have the link path set::

        export LD_LIBRARY_PATH=/usr/lib/oracle/18.3/client64/lib

4. Call :meth:`oracledb.initOracleClient()` in your application to enable
   Thick mode, see :ref:`oracleclientloadinglinux`.

5. If you use the optional Oracle configuration files, see
   :ref:`usingconfigfiles`.

.. _instoh:

Local Database or Full Client
+++++++++++++++++++++++++++++

Follow these steps if you are running Node.js on the same machine where
Oracle Database is installed.

The ``ORACLE_HOME`` can be either a database home or a full Oracle
client installation installed with Oracle’s ``runInstaller``.

For easy development, `Oracle Database Free
<https://www.oracle.com/database/free/>`__ is available on Linux. Applications
developed with this database may be immediately used with other editions of the
Oracle Database.

To use node-oracledb with local database or full client:

1. Set required Oracle environment variables, such as ``ORACLE_HOME`` and
   ``LD_LIBRARY_PATH`` by executing::

        source /usr/local/bin/oraenv

   Or, if you are using Oracle XE 11.2, by executing::

        source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh

   Ensure that the Node.js process has directory and file access permissions
   for the Oracle Client libraries and other files. Typically the home directory
   of the Oracle software owner will need permissions relaxed.

2. Place the optional Oracle client configuration files such as
   `tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
   -7F967CE5-5498-427C-9390-4A5C6767ADAA>`__, `sqlnet.ora <https://www.oracle.
   com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC
   642>`__, and `oraaccess.xml <https://www.oracle.com/pls/topic/lookup?ctx=
   dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__ as detailed in
   :ref:`usingconfigfiles`.

3. Call :meth:`oracledb.initOracleClient()` in your application to enable
   Thick mode, see :ref:`oracleclientloadinglinux`.

.. _instnoderpms:

Installing Node.js and node-oracledb RPMs from yum.oracle.com
-------------------------------------------------------------

Node.js and node-oracledb Linux RPM packages are available on
`yum.oracle.com <https://yum.oracle.com/oracle-linux-nodejs.html>`__.
See `Node.js for Oracle Linux <https://yum.oracle.com/oracle-linux-nodejs.
html>`__ for installation details.

.. _instosx:

Installing Node.js and node-oracledb on Apple macOS
===================================================

Review the generic :ref:`prerequisites`.

Note there is no native Oracle Database for macOS but you can connect to a
remote database.  Alternatively a database can easily be run in Docker or in a
Linux virtual machine using Vagrant. See the `Oracle Database Vagrant projects
<https://github.com/oracle/vagrant-projects/tree/main/ OracleDatabase>`__.


.. _nodeos:

Install Node.js
---------------

Download the `Node.js package <https://nodejs.org>`__ for macOS and install it.

.. _nodeoracledbos:

Install node-oracledb
---------------------

1. Install node-oracledb using the ``npm`` package manager, which is included in
   Node.js::

        npm install oracledb

   If you are behind a firewall, then you may need to set your proxy first
   before installing node-oracledb, for example::

        npm config set proxy http://myproxy.example.com:80/

2. You can now run applications.

   Runnable samples are available from GitHub. To try them follow these steps:

   a. Download the `examples <https://github.com/oracle/node-oracledb/tree/
      main/examples>`__.

   b. Edit ``dbconfig.js`` and set the `database credentials <https://www.youtube.
      com/watch?v=WDJacg0NuLo>`__ to your environment, for example::

        module.exports = {
            user          : "hr",
            password      : process.env.NODE_ORACLEDB_PASSWORD,
            connectString : "localhost/FREEPDB1"
        };

   c. Run one of the examples, such as `example.js <https://github.com/oracle/
      node-oracledb/tree/main/examples/example.js>`__::

        node example.js

3. If you want to use node-oracledb :ref:`Thick mode features <featuresummary>`
   in your application, then follow the instructions in the
   :ref:`next section <clientos>`. Otherwise, if you will only ever use Thin
   mode, you can optionally minimize the install footprint by removing all the
   Thick mode binaries automatically installed with node-oracledb. To remove
   the binaries, run commands like::

        cd node_modules/oracledb
        npm run prune all

   This can be automated with a ``postinstall`` script in your ``package.json``
   file::

        "scripts": {
          "postinstall": "cd node_modules/oracledb && npm run prune all"
        },

Questions can be asked as `GitHub Discussions
<https://github.com/oracle/node-oracledb/discussions>`__.

.. _clientos:

Install Oracle Client to use Thick Mode
---------------------------------------

By default, the node-oracledb driver is a pure JavaScript module that runs in a
Thin mode connecting directly to Oracle Database so no further installation
steps are required.  However, to use additional node-oracledb features
available in :ref:`Thick mode <featuresummary>`, you need to install Oracle
Client libraries.  Thick mode uses a binary add-on installed with node-oracledb
that loads these libraries.  This binary is available for macOS Intel only.

Download the **Basic** 64-bit DMG from `Oracle Technology Network <https://www.
oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.
html>`__.

.. note::

    To use node-oracledb in Thick mode you must call
    :meth:`oracledb.initOracleClient()` in your application, see
    :ref:`oracleclientloadingmacos`. For example:

    .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

Manual Installation
+++++++++++++++++++

1. In Finder, double click on the DMG to mount it.

2. Open a terminal window and run the install script in the mounted
   package, for example::

        $ /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh

   This copies the contents to ``$HOME/Downloads/instantclient_19_8``.
   Applications may not have access to the ``Downloads`` directory, so you
   should move Instant Client somewhere convenient.

3. In Finder, eject the mounted Instant Client package.

4. Call :meth:`oracledb.initOracleClient()` to enable Thick mode, see
   :ref:`oracleclientloadingmacos`.

5. If you use the optional Oracle configuration files, see
   :ref:`usingconfigfiles`.

If you have multiple Instant Client DMG packages mounted, you only need
to run ``install_ic.sh`` once. It will copy all mounted Instant Client
DMG packages at the same time.

Scripted Installation
+++++++++++++++++++++

Instant Client installation can alternatively be scripted, for example::

    cd $HOME/Downloads
    curl -O https://download.oracle.com/otn_software/mac/instantclient/198000/instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
    hdiutil mount instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
    /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh
    hdiutil unmount /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru

The Instant Client directory will be ``$HOME/Downloads/instantclient_19_8``.
Applications may not have access to the ``Downloads`` directory, so you should
move Instant Client somewhere convenient.

Call :meth:`oracledb.initOracleClient()` to enable Thick mode, see
:ref:`oracleclientloadingmacos`.

If you use the optional Oracle configuration files, see
:ref:`usingconfigfiles`.

.. _windowsinstallation:

Installing Node.js and node-oracledb on Microsoft Windows
=========================================================

Review the :ref:`prerequisites`.

.. _nodewin:

Install Node.js
---------------

Install the 64-bit Node.js MSI (for example, node-v18.16.0-x64.msi) from
`nodejs.org <https://nodejs.org>`__. Make sure the option to add the
Node.js and npm directories to the path is selected.

.. _nodeoracledbwin:

Install node-oracledb
---------------------

1. Open a terminal window.

2. Install node-oracledb using the ``npm`` package manager, which is
   included in Node.js::

        npm install oracledb

   If you are behind a firewall, then you may need to set your proxy first
   before installing node-oracledb, for example::

        npm config set proxy http://myproxy.example.com:80/

3. You can now run applications.

   Runnable samples are available from GitHub. To try them follow these steps:

   a. Download the `examples <https://github.com/oracle/node-oracledb/tree/
      main/examples>`__.

   b. Edit ``dbconfig.js`` and set the `database credentials <https://www.youtube
      .com/watch?v=WDJacg0NuLo>`__ to your environment, for example::

        module.exports = {
            user          : "hr",
            password      : process.env.NODE_ORACLEDB_PASSWORD,
            connectString : "localhost/FREEPDB1"
        };

   c. Run one of the examples, such as `example.js <https://github.com/oracle/
      node-oracledb/tree/main/examples/example.js>`__::

        node example.js

3. If you want to use node-oracledb :ref:`Thick mode features <featuresummary>`
   in your application, then follow the instructions in the
   :ref:`next section <clientwin>`. Otherwise, if you will only ever use Thin
   mode, you can optionally minimize the install footprint by removing all the
   Thick mode binaries automatically installed with node-oracledb. To remove
   the binaries, run commands like::

        cd node_modules\oracledb
        npm run prune all

   This can be automated with a ``postinstall`` script in your ``package.json``
   file::

        "scripts": {
          "postinstall": "cd node_modules/oracledb && npm run prune all"
        },

Questions can be asked as `GitHub Discussions
<https://github.com/oracle/node-oracledb/discussions>`__.

.. _clientwin:

Install Oracle Client to use Thick Mode
---------------------------------------

By default, the node-oracledb driver is a pure JavaScript module that runs in a
Thin mode connecting directly to Oracle Database so no further installation
steps are required.  However, to use additional features available in
:ref:`Thick mode <featuresummary>` you need Oracle Client libraries
installed. Oracle Client versions 21, 19, 18, 12, and 11.2 are supported. Thick
mode uses a binary add-on installed with node-oracledb that loads these
libraries.

Depending on whether your database is on the same machine as Node.js or
remote, you may need to adjust the Oracle Client installation instructions:

- If your database is on a remote computer, then download the free `Oracle
  Instant Client <https://www.oracle.com/database/technologies/instant-client.
  html>`__ "Basic" or "Basic Light" package for your operating system
  architecture and follow the instructions in :ref:`instwin`.

- If your database is on a local machine, use the client libraries already
  available in a locally installed database such as the free
  `Oracle Database Express Edition ("XE") <https://www.oracle.com/database/
  technologies/appdev/xe.html>`__ release and follow the instructions in
  :ref:`instwinoh`.

If you have multiple copies of Oracle Client libraries installed, check if the
expected version is first in ``PATH``.

If you need system privileges to set, or preserve, variables like ``PATH``,
you can use an elevated command prompt on Windows.

.. note::

    To use node-oracledb in Thick mode you must call
    :meth:`oracledb.initOracleClient()` in your application, see
    :ref:`oracleclientloadingwindows`. For example:

    .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

.. _instwin:

Oracle Instant Client ZIP Files
+++++++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine, or if you
already have Oracle software installed but you want node-oracledb to use
a different version of the libraries.

The pre-built binaries were built with Visual Studio 2017 and require
the matching `redistributable <https://docs.microsoft.com/en-us/cpp/windows
/latest-supported-vc-redist?view=msvc-170>`__.

You may need Administrator privileges to set environment variables or
install software.

To use node-oracledb in Thick mode with Oracle Instant Client ZIP files:

1. Download the free 64-bit Instant Client **Basic** ZIP file from `Oracle
   Technology Network <https://www.oracle.com/database/technologies/instant
   -client/winx64-64-downloads.html>`__.

2. Unzip the ZIP file into a directory that is accessible to your application.
   For example unzip ``instantclient-basic-windows.x64-19.22.0.0.0dbru.zip``
   to ``C:\oracle\instantclient_19_22``.

3. Oracle Instant Client libraries require a Visual Studio redistributable
   with a 64-bit or 32-bit architecture to match Instant Client's architecture.
   Each Instant Client requires a different redistributable version:

   .. _winredists:

   - For Oracle Instant Client 21, install `Visual Studio 2019 Redistributable
     <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?
     view=msvc-170>`__ or later
   - For Oracle Instant Client 19, install `Visual Studio 2017 Redistributable
     <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?
     view=msvc-170>`__
   - For Oracle Instant Client 18 and 12.2, install the `Visual Studio 2013
     Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-
     supported-vc-redist?view=msvc-170#visual-studio-2013-vc-120>`__
   - For Oracle Instant Client 12.1, install `Visual Studio 2010
     Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-
     supported-vc-redist?view=msvc-170#visual-studio-2010-vc-100-sp1-no-longer
     -supported>`__
   - For Oracle Instant Client 11.2, install `Visual Studio 2005
     Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-
     supported-vc-redist?view=msvc-170#visual-studio-2005-vc-80-sp1-no-longer-
     supported>`__

    You can also find out the version required by locating the library
    ``OCI.DLL`` and running::

        dumpbin /dependents oci.dll

    For example, if you see ``MSVCR120.dll`` then you need the VS 2013
    Redistributable. If you see ``MSVCR100.dll`` then you need the VS 2010
    Redistributable. If you see ``MSVCR80.dll`` then you need the VS 2005
    Redistributable.

4. Call :meth:`oracledb.initOracleClient()` to enable Thick mode, see
   :ref:`oracleclientloadingwindows`.

5. If you use the optional Oracle configuration files, see
   :ref:`usingconfigfiles`.

If disk space is important, most users will be able to use the smaller
Basic Light package instead of the Basic package. Review its
`globalization limitations <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-E6566C23-54C9-490C-ADD1-EEB6240512EB>`__. Disk space can be
reduced by removing unnecessary libraries and files from either the Basic or
Basic Light packages. The exact libraries depend on the Instant Client
version. Refer to the `Oracle Database Instant Client documentation <https:
//www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD183FA4-2C13-4D44-93DB-
49172ECECE39>`_.

.. _instwinoh:

Local Database or Full Client
+++++++++++++++++++++++++++++

Follow these steps if you are running Node.js on the same machine where
Oracle Database is installed.

Node-oracledb Thick mode applications can use Oracle Client 21, 19, 18, 12,
or 11.2 libraries from a local Oracle Database or full Oracle Client (such as
installed by Oracle's GUI installer).

The pre-built node-oracledb binary was built with Visual Studio 2017 and
requires the matching `redistributable
<https://docs.microsoft.com/en-us/cpp/windows
/latest-supported-vc-redist?view=msvc-170>`__. Ensure that ``PATH`` contains
the correct binary directory, for example ``C:\oracle\product\12.2.0\dbhome_1\
bin``.

For easy development, the free `Oracle XE <https://www.oracle.com/database
/technologies/appdev/xe.html>`__ version of the database is available on
Windows. Applications developed with XE may be immediately used with other
editions of the Oracle Database.

You may need Administrator privileges to set environment variables or
install software.

To use node-oracledb in Thick mode with a local database or full client:

1. Place the optional Oracle Client configuration files such as
   `tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
   GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__, `sqlnet.ora <https://www.
   oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F
   -DCC9D0DEC642>`__, and `oraaccess.xml <https://www.oracle.com/pls/topic/
   lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__ as
   detailed in :ref:`usingconfigfiles`.

2. Call :meth:`oracledb.initOracleClient()` in your application to enable
   Thick mode, see :ref:`oracleclientloadingwindows`.

.. _offline:

Installing node-oracledb Without Internet Access
================================================

On a machine with internet access, download the node-oracledb package from
`npm <https://www.npmjs.com/package/oracledb>`__, for example from
`https://registry.npmjs.com/oracledb/-/oracledb-6.0.0.tgz <https://registry.
npmjs.com/oracledb/-/oracledb-6.0.0.tgz>`__

Transfer the file to the desired machine and install it, for
example with::

    npm install your_dir_path/oracledb-6.0.0.tgz

Then follow the node-oracledb installation instructions for your operating
system.

Alternatively, on an identical machine that has access to the internet,
install node-oracle following the instructions for your operating system.
Then copy ``node_modules/oracledb`` to the offline computer. If you are using
the Thick mode, then also copy the Oracle Client libraries to the offline
computer.

By default, node-oracledb runs in a Thin mode which connects directly to
Oracle Database so no further installation steps are required.

To use additional features available in :ref:`Thick mode <featuresummary>`, you
need Oracle Client libraries installed.

If you are using Thick mode on an architecture that does not have a
pre-supplied binary then you can build your own node-oracledb package, see
:ref:`Creating a node-oracledb package from source code <compilepackage>`.
Consider self-hosting the node-oracledb package inside your network, see
:ref:`Hosting your own node-oracledb Packages <selfhost>`.

.. _github:

Installing node-oracledb from Source Code
=========================================

Some build tools are required to install node-oracledb from source code.

1. Recent Node.js tools should work with Python 3 but you may need to have `Python
   2.7 <https://www.python.org/downloads/>`__ for the node-gyp utility.

   - Check if you have an old version of ``node-gyp`` installed. Try updating
     it. Also, try deleting ``$HOME/.node-gyp`` or equivalent.
   - If another version of Python occurs first in your binary path then
     run ``npm config set python /wherever/python-2.7/bin/python`` or use
     the ``--python`` option to indicate the correct version. For example:
     ``npm install --python=/whereever/python-2.7/bin/python oracledb``.

   - On Windows, install the Python 2.7 MSI and select the customization
     option to “Add python.exe to Path”.

2. If you want to build the optional node-oracledb Thick mode binary, install a C
   compiler:

   - On Linux, GCC 4.8.5 (the default on Oracle Linux 7) is known to work.

   - On macOS install Xcode from the Mac App store.

   - On Windows, install a C build environment such as Microsoft Visual
     Studio 2017. Compilers supported by Oracle libraries are found in
     `Oracle documentation <https://docs.oracle.com/database/>`__ for each
     version, for example `Oracle Database Client Installation Guide for
     Microsoft Windows <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
     &id=NTCLI>`__. Some users report that the npm ``windows-build-tools``
     package has the necessary tools to build node-oracledb from source code.

   The directories with the ``python`` and ``npm`` executables should be in
   your PATH environment variable. On Windows you can use vcvars64.bat (or
   vcvars.bat if you building with 32-bit binaries) to set the environment.
   Alternatively you can open the ‘Developer Command Prompt for Visual
   Studio’ which has environment variables already configured.

.. _githubclone:

Installing GitHub Clones and ZIP Files
--------------------------------------

1. You can clone the node-oracledb source code repository or download a ZIP
   from `GitHub <https://github.com/oracle/node-oracledb/>`__.

   - Either clone the node-oracledb repository using the ``git`` source code
     utility::

         git clone --recurse-submodules https://github.com/oracle/node-oracledb.git

     Then checkout the branch or tag you wish to build::

         git checkout main
         git submodule update

   - Alternatively, if you download a node-oracledb ZIP file from GitHub, choose
     the appropriate tag first.

     If you intend to build the optional Thick mode binary module, separately
     download the `ODPI-C submodule <https://www.github.com/oracle/odpi>`__
     code and extract it into a ``odpi`` subdirectory.  Check the version of
     ODPI-C downloaded matches the version used in the node-oracledb GitHub
     repository.  The version is shown in the ``dpi.h`` header file.

2. If you only want to use node-oracledb in Thin mode, then delete the file
   ``binding.gyp``.

3. With the node-oracledb source code in ``your_dir_path/node-oracledb`` use a
   ``package.json`` dependency like::

        "dependencies": {
            "oracledb": "file:/your_dir_path/node-oracledb"
        },

   and install::

       npm install

   Alternatively, change to your application directory and run::

       npm install your_dir_path/node-oracledb

   Note that if this builds the Thick mode binary then you need to make sure
   the ODPI-C submodule is present, either by using ``--recurse-submodules``
   when cloning or by explicity adding it to the extracted ZIP archive.
   Without ODPI-C, building the binary module will fail with an error like
   **‘dpi.h’ file not found**.

.. _githubtags:

Installing using GitHub Branches and Tags
-----------------------------------------

Node-oracledb can be installed directly from GitHub tags and branches.
The ``git`` source code utility is required for this method.

To install the current development code from the GitHub main branch, use
a ``package.json`` dependency like::

    "dependencies": {
        "oracledb": "oracle/node-oracledb#main"
    },

Alternatively, use the command::

    npm install oracle/node-oracledb#main

To install from a tag, replace ``main`` with the tag name like:
``oracle/node-oracledb#v6.0.0``.

This will install node-oracledb and build the optional Thick mode binary.

.. _sourcepackage:

Installing from a Source Package
--------------------------------

Users without ``git`` can compile pre-bundled source code using a
``package.json`` dependency like::

    "dependencies": {
        "oracledb": "https://github.com/oracle/node-oracledb/releases/download/v6.0.0/oracledb-src-6.0.0.tgz"
    },

Or install with::

    npm install https://github.com/oracle/node-oracledb/releases/download/v6.0.0/oracledb-src-6.0.0.tgz

This will install node-oracledb and build the optional Thick mode binary.

.. _nogithubaccess:

Installing from Oracle’s Repository
-----------------------------------

Oracle has a mirror of the GitHub repository source code that can be
cloned with::

    git clone --recurse-submodules https://opensource.oracle.com/git/oracle/node-oracledb.git

With the node-oracledb source code in ``your_dir_path/node-oracledb``
use a ``package.json`` dependency like::

    "dependencies": {
        "oracledb": "file:/your_dir_path/node-oracledb"
    },

Alternatively, change to your application directory and run::

    npm install your_dir_path/node-oracledb

This will install node-oracledb and build the optional Thick mode binary.

.. _compilepackage:

Creating a node-oracledb Package from Source Code
-------------------------------------------------

You can create a package containing the required JavaScript files and
optionally also containing the Thick mode binary. This is equivalent to the
package that is normally installed from the `npm registry
<https://www.npmjs.com/package/oracledb>`__.

To create the package, follow the instructions in `package/README
<https://github.com/oracle/node-oracledb/tree/main/package#readme>`__.

Your new package can be :ref:`self-hosted <selfhost>` for use within your
company, or it can be used directly from the file system to install
node-oracledb.

.. _selfhost:

Hosting Your Own node-oracledb Packages
=======================================

You can host node-oracledb packages locally.

Download the node-oracledb package from npm, for example from
`https://registry.npmjs.com/oracledb/-/oracledb-6.0.0.tgz <https://registry.
npmjs.com/oracledb/-/oracledb-6.0.0.tgz>`__. Alternatively, if you want to
build your own binaries and node-oracledb package, see :ref:`compilepackage`.

If you make the package accessible on your local web server, for example
at www.example.com/oracledb-6.0.0.tgz, then your ``package.json``
would contain::

    . . .
    "dependencies": {
        "oracledb": "https://www.example.com/oracledb-6.0.0.tgz"
    },
    . . .

Or you would install with::

    npm install https://www.example.com/oracledb-6.0.0.tgz

.. _docker:

Using node-oracledb in Docker
=============================

`Docker <https://www.docker.com/>`__ allows applications to be
containerized. Each application will have a ``Dockerfile`` with steps to
create a Docker image. Once created, the image can be shared and run.

Sample Dockerfiles for Oracle Linux are available on
`GitHub <https://github.com/oracle/docker-images/tree/main/OracleLinuxDevelopers>`__.
Some container images are in `Oracle’s GitHub Container
Registry <https://github.com/orgs/oracle/packages>`__.

Installing Node.js in Docker
----------------------------

If your ``Dockerfile`` uses Oracle Linux::

    FROM oraclelinux:7-slim

Then you can install Node.js from
`yum.oracle.com <https://yum.oracle.com/oracle-linux-nodejs.html>`__
using::

    RUN  yum -y install oracle-nodejs-release-el7 && \
         yum -y install nodejs && \
         rm -rf /var/cache/yum

One alternative to Oracle Linux is to use a `Node.js image from Docker
Hub <https://hub.docker.com/_/node/>`__, for example using::

    FROM node:12-buster-slim

Note: You should review Oracle’s supported distributions before choosing
an operating system.

Installing node-oracledb and Your Application
---------------------------------------------

Include node-oracledb as a normal dependency in your application
``package.json`` file::

    . . .
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "oracledb" : "^6"
    },
    . . .

The ``package.json`` and application file can be added to the image, and
dependencies installed when the image is built::

    WORKDIR /myapp
    ADD package.json server.js /myapp/
    RUN npm install

    CMD exec node server.js

Installing Instant Client in Docker
-----------------------------------

If you want to use node-oracledb in :ref:`Thick mode <thickarch>`, then you
need to separately install Oracle Instant Client in the container.

Review the available Instant Client Linux x86_64 packages for `Oracle Linux 7
<https://yum.
oracle.com/repo/OracleLinux/OL7/oracle/instantclient21/x86_64/index.html>`__
and `Oracle Linux 8 <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/
instantclient21/x86_64/index.html>`__. Older Oracle Instant Clients are in the
`Oracle Linux 7 <https://yum.oracle.com/repo/OracleLinux/OL7/
oracle/instantclient/x86_64/index.html>`__ and `Oracle Linux 8 <https://yum.
oracle.com/repo/OracleLinux/OL8/oracle/instantclient/x86_64/index.html>`__
repositories.

Packages for Oracle Linux ARM (aarch64) are available for `Oracle Linux 8
<https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/aarch64/index.html>`__.

Instant Client RPMs and ZIP files are also available from `Oracle Database
Instant Client download pages
<https://www.oracle.com/database/technologies/instant-client.html>`__.

There are various ways to install Instant Client. Three methods are
shown below.

1. Using Oracle Linux Instant Client RPMs

   If you have an Oracle Linux image::

        FROM oraclelinux:7-slim

   Then you can install Instant Client RPMs::

        RUN yum -y install oracle-instantclient-release-el7 && \
            yum -y install oracle-instantclient-basic && \
            rm -rf /var/cache/yum

2. Automatically downloading an Instant Client ZIP file

   You can automatically download an Instant Client ZIP file during
   image creation. This is most useful on Debian-based operating
   systems. (Note: you should review Oracle’s supported distributions
   before choosing an operating system).

   The ``libaio`` (or ``libaio1``), ``wget`` and ``unzip`` packages will
   need to be added manually.

   On Oracle Linux::

        RUN yum install -y libaio wget unzip

   On a Debian-based Linux::

        RUN apt-get update && apt-get install -y libaio1 wget unzip

   Then, to use the latest available Instant Client::

        RUN wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
            unzip instantclient-basiclite-linuxx64.zip && rm -f instantclient-basiclite-linuxx64.zip && \
            cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci && \
            echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

   When using Instant Client 19 on recent Linux versions, such as Oracle
   Linux 8, you may also need to install the ``libnsl`` package. This is
   not needed from Instant Client 21 onward.

3. Copying Instant Client zip files from the host

   To avoid the cost of repeated network traffic, you may prefer to
   download the Instant Client Basic Light zip file to your Docker host,
   extract it, and remove unnecessary files. The resulting directory can
   be added during subsequent image creation. For example, with Instant
   Client Basic Light 21.1, the host computer (where you run Docker)
   could have a directory ``instantclient_21_1`` with these files::

        libclntshcore.so.21.1
        libclntsh.so.21.1
        libnnz21.so
        libociicus.so

   With this, your Dockerfile could contain::

        ADD instantclient_21_1/* /opt/oracle/instantclient_21_1
        RUN echo /opt/oracle/instantclient_21_1 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
            ldconfig

   The ``libaio`` or ``libaio1`` package will be needed.

   On Oracle Linux::

        RUN yum install -y libaio

   On a Debian-based Linux::

        RUN apt-get update && apt-get install -y libaio1

   When using Instant Client 19 on recent Linux versions, such as Oracle
   Linux 8, you may also need to install the ``libnsl`` package. This is
   not needed from Instant Client 21 onward.

Using Oracle Net configuration Files and Oracle Wallets
-------------------------------------------------------

:ref:`Optional Oracle Net Configuration <tnsadmin>` files (like
``tnsnames.ora`` and ``sqlnet.ora``) and files that need to be secured such as
:ref:`Oracle wallets <connectionadb>` can be mounted at runtime using a Docker
volume.  When using the optional node-oracledb Thick mode, it is convenient to
map the volume to the ``network/admin`` subdirectory of Instant Client so the
``TNS_ADMIN`` environment variable does not need to be set. For example, when
the Wallet or configuration files are in ``/OracleCloud/wallet/`` on the host
computer, and the image uses Instant Client 19.18 RPMs, then you can mount the
files using::

    docker run -v /OracleCloud/wallet:/usr/lib/oracle/19.18/client64/lib/network/admin:Z,ro . . .

The ``Z`` option is needed when SELinux is enabled.

Example Application in Docker
+++++++++++++++++++++++++++++

This example consists of a ``Dockerfile``, a ``package.json`` file with
the application dependencies, a ``server.js`` file that is the
application, and an ``envfile.list`` containing the database credentials
as environment variables.  This example show node-oracledb Thick mode.

If you use Oracle Linux, your ``Dockerfile`` will be like::

    FROM oraclelinux:7-slim

    RUN yum -y install oracle-instantclient-release-el7 && \
        yum -y install oracle-instantclient-basiclite && \
        rm -rf /var/cache/yum

    WORKDIR /myapp
    ADD package.json server.js /myapp/
    RUN npm install

    CMD exec node server.js

An equivalent Dockerfile that uses a Node.js image is::

    FROM node:18-buster-slim

    RUN apt-get update && apt-get install -y libaio1 wget unzip

    WORKDIR /opt/oracle

    RUN wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
        unzip instantclient-basiclite-linuxx64.zip && rm -f instantclient-basiclite-linuxx64.zip && \
        cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci && \
        echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

    WORKDIR /myapp
    ADD package.json server.js /myapp/
    RUN npm install

    CMD exec node server.js

Note: You should review Oracle’s supported distributions before choosing
an operating system.

For either Dockerfile, the ``package.json`` is::

    {
        "name": "test",
        "version": "1.0.0",
        "private": true,
        "description": "Docker Node.js application",
        "scripts": {
            "start": "node server.js"
        },
        "keywords": [
            "myapp"
        ],
        "dependencies": {
            "oracledb" : "^6"
        },
        "author": "Me",
        "license": "UPL"
    }

The application ``server.js`` contains code like:

.. code:: javascript

    . . .

    connection = await oracledb.getConnection({
        user: process.env.NODE_ORACLEDB_USER,
        password: process.env.NODE_ORACLEDB_PASSWORD,
        connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING
    });
    const result = await connection.execute(
        `SELECT TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS D FROM DUAL`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(result);
    . . .

The environment variables in ``envfile.list`` are used at runtime. The
file contains::

    NODE_ORACLEDB_USER=hr
    NODE_ORACLEDB_PASSWORD=<hr password>
    NODE_ORACLEDB_CONNECTIONSTRING=server.example.com/orclpdb1

The image can be built::

    docker build -t nodedoc .

Alternatively, if you are behind a firewall, you can pass proxies when
building::

    docker build --build-arg https_proxy=http://myproxy.example.com:80 --build-arg http_proxy=http://www-myproxy.example.com:80 -t nodedoc .

Finaly, a container can be run from the image::

    docker run -ti --name nodedoc --env-file envfile.list nodedoc

The output is like::

    { metaData: [ { name: 'D' } ],
      rows: [ { D: '24-Nov-2019 23:39' } ] }
