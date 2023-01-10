.. _installation:

**************************************
Installing node-oracledb Version 5.5.0
**************************************

.. _overview:

Node-oracledb Overview
======================

The `node-oracledb <https://www.npmjs.com/package/oracledb>`__ add-on
for Node.js powers high performance Oracle Database applications. The
architecture is shown below.

.. figure:: /images/node-oracledb-architecture.png
   :alt: Architecture diagram of Node.js, node-oracledb and Oracle
      Database.

   Architecture diagram of Node.js, node-oracledb and Oracle Database.

The steps below create a Node.js installation with node-oracledb. Adjust
the steps for your environment.

This node-oracledb release has been tested with Node.js 14, 16 and 18 on
Oracle Linux x86_64 (releases 7 and 8), Windows, and macOS (Intel x86).
The add-on may also build on Linux ARM (aarch64), Windows 32-bit,
Solaris and AIX environments, but these architectures have not been
tested. This version of node-oracledb may work with older Node.js
versions if they are `Node-API <https://nodejs.org/api/n-api.html>`__
version 4 compatible. Older versions of node-oracledb may also work with
older versions of Node.js.

Node-oracledb requires Oracle Client libraries version 11.2 or later,
and can connect to Oracle Database 9.2 or later, depending on the Oracle
Client library version.

Node-oracledb is an `add-on <https://nodejs.org/api/addons.html>`__
available as C source code. Pre-built binaries are available as a
convenience for common architectures. Note the operating systems and
versions of Node.js that the pre-built binaries are compatible with will
change as the Node.js project evolves. The binaries are not guaranteed
to be available or usable in your environment.

.. _quickstart:

Quick Start node-oracledb Installation
======================================

Simple installation instructions for Windows, macOS (Intel x86) and
Linux (x86_64) are available:

-  `Quick Start: Developing Node.js Applications for Oracle
   Database <https://www.oracle.com/database/technologies/appdev/quickstartnodeonprem.html>`__

-  `Quick Start: Developing Node.js Applications for Oracle Autonomous
   Database <https://www.oracle.com/database/technologies/appdev/quickstartnodejs.html>`__

Alternatively, follow these instructions:

-  Install Node.js from `nodejs.org <https://nodejs.org>`__.

-  Add ``oracledb`` to your ``package.json`` dependencies or run
   ``npm install oracledb``. This installs from the `npm
   registry <https://www.npmjs.com/package/oracledb>`__. Pre-built
   node-oracledb binaries are available for Windows 64-bit, Linux
   x86_64, and macOS (Intel x86).

   If you are behind a firewall, you may need to set the proxy with
   ``npm config set proxy http://myproxy.example.com:80/``.

   Windows users will require the `Visual Studio 2017
   Redistributable <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170>`__.

-  If a pre-built binary is not available, you will need to build from the
   source code. Review the :ref:`prerequisites <github>` and add
   ``https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz``
   to your ``package.json`` dependencies or run
   ``npm install   https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz``.

-  Add Oracle Client libraries version 21, 19, 18, 12, or 11.2 to your
   operating system library search path such as ``PATH`` on Windows or
   ``LD_LIBRARY_PATH`` on Linux. On macOS link the libraries to
   ``/usr/local/lib``.

   -  If your database is remote, then get the libraries by downloading
      and unzipping the free `Oracle Instant
      Client <https://www.oracle.com/database/technologies/instant-client.html>`__
      “Basic” or “Basic Light” package for your operating system
      architecture.

      Instant Client on Windows requires an appropriate :ref:`Visual Studio
      Redistributable <winredists>`. On Linux, the ``libaio``
      (sometimes called ``libaio1``) package is needed. When using
      Instant Client 19 on recent Linux versions, such as Oracle Linux
      8, you may also need to install the ``libnsl`` package. This is
      not needed from Instant Client 21 onward.

   -  Alternatively use the Oracle Client libraries already available in
      ``$ORACLE_HOME/lib`` from a locally installed database such as the
      free `Oracle
      XE <https://www.oracle.com/database/technologies/appdev/xe.html>`__
      release.

   Oracle Client libraries 21 can connect to Oracle Database 12.1 or
   greater. Oracle Client libraries 19, 18 and 12.2 can connect to
   Oracle Database 11.2 or greater. Version 12.1 client libraries can
   connect to Oracle Database 10.2 or greater. Version 11.2 client
   libraries can connect to Oracle Database 9.2 or greater.

-  Your Node.js applications can now connect to your database. The
   database can be on the same machine as Node.js, or on a remote
   machine. Node-oracledb does not install or create a database.

   You will need to know `database
   credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ and the
   :ref:`connection string <connectionstrings>` for the database.

See :ref:`Troubleshooting Node-oracledb Installation
Problems <troubleshooting>` if you have installation issues.

After installation, learn how to use node-oracledb from the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
and the
`documentation <https://node-oracledb.readthedocs.io/en/latest/index.html>`__.

.. _instructions:

Node-oracledb Installation Instructions
=======================================

Instructions may need to be adjusted for your platform, environment, and
versions being used.

.. list-table-with-summary::  Instructions Based on Platform and Version
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the name of the platform and version number. The second column displays the instructions to be followed for the platform and version number that is being used.

    * - I have …
      - Follow this …
    * - Windows. My database is on another machine.
      - :ref:`Node-oracledb Installation on Microsoft Windows with Instant Client ZIP files <instwin>`
    * - Windows. My database is on the same machine as Node.js.
      - :ref:`Node-oracledb Installation on Microsoft Windows with a Local Database or Full Client <instwinoh>`
    * - Apple macOS (Intel x86)
      - :ref:`Node-oracledb Installation on Apple macOS (Intel x86) <instosx>`
    * - Linux x86_64 that uses RPM packages. My database is on another machine.
      - :ref:`Node-oracledb Installation on Linux x86_64 with Instant Client RPMs <instrpm>`
    * -  Linux x86_64 that uses Debian packages. My database is on another machine.
      - :ref:`Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files <instzip>`
    * - Linux x86_64. My database is on the same machine as Node.js.
      - :ref:`Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client <instoh>`
    * - Linux x86_64. I have the full Oracle client (installed via ``runInstaller``) on the same machine as Node.js.
      - :ref:`Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client <instoh>`
    * - Linux x86_64. I want to install Node.js and node-oracledb RPM packages.
      - :ref:`Installing Node.js and node-oracledb RPMs from yum.oracle.com <instnoderpms>`
    * - Linux ARM (aarch64)
      - :ref:`Node-oracledb Installation on Linux ARM (aarch64) <aarch64>`
    * - AIX on Power Systems
      - :ref:`Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files <instaix>`
    * - Solaris x86-64 (64-Bit)
      - :ref:`Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files <instsolarisx8664>`
    * - Another OS with Oracle Database 21, 19, 18, 12, or 11.2 client libraries available
      - Update binding.gyp and make any code changes required, sign the `OCA <https://oca.opensource.oracle.com>`__, and submit a pull request with your patch.
    * - Source code from GitHub
      - :ref:`Node-oracledb Installation from Source Code <github>`
    * -  I don’t have internet access
      - :ref:`Node-oracledb Installation Without Internet Access <offline>`

.. _prerequisites:

Prerequisites
-------------

All installations need:

-  Oracle 21, 19, 18, 12 or 11.2 client libraries on the machine Node.js
   is installed on.

   Run ``node -p "process.arch"`` and make sure to use 64-bit or 32-bit
   Oracle client libraries to match the Node.js architecture.

   Oracle client libraries are included in `Oracle Instant
   Client <https://www.oracle.com/database/technologies/instant-client.html>`__
   RPMs or ZIPs, a full Oracle Client, or a database on the same
   machine. You only need one of these installations.

   Oracle’s standard client-server network interoperability allows
   connections between different versions of Oracle Client and Oracle
   Database. For supported configurations see Oracle Support’s `Doc ID
   207303.1 <https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1>`__.
   In summary, Oracle Client 21 can connect to Oracle Database 12.1 or
   greater. Oracle Client 19, 18 and 12.2 can connect to Oracle Database
   11.2 or greater. Oracle Client 12.1 can connect to Oracle Database
   10.2 or greater. Oracle Client 11.2 can connect to Oracle Database
   9.2 or greater. The technical restrictions on creating connections
   may be more flexible. For example Oracle Client 21 can successfully
   connect to Oracle Database 11.2, while Oracle Client 12.2 can
   successfully connect to Oracle Database 10.2.

-  An Oracle Database. Installing Node-oracledb does not install or
   create a database.

   After installation of node-oracledb, your Node.js applications will
   be able to connect to your database. The database can be on the same
   machine as Node.js, or on a remote machine.

   You will need to know `database
   credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ and the
   :ref:`connection string <connectionstrings>` for the database.

Pre-built node-oracledb binaries are available for Windows 64-bit, Linux
x86_64, and macOS (Intel x86). For other platforms you need to :ref:`build
from source code <github>`.

.. _linuxinstall:

Node-oracledb Installation on Linux
-----------------------------------

For Linux x86_64:

-  :ref:`Node-oracledb Installation on Linux x86_64 with Instant Client ZIP
   files <instzip>`
-  :ref:`Node-oracledb Installation on Linux x86_64 with a Local Database or
   Full Client <instoh>`
-  :ref:`Node-oracledb Installation on Linux x86_64 with Instant Client
   RPMs <instrpm>`
-  :ref:`Installing Node.js and node-oracledb RPMs from
   yum.oracle.com <instnoderpms>`

For Linux ARM:

-  :ref:`Node-oracledb Installation on Linux ARM (aarch64) <aarch64>`

.. _instzip:

Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine and either:

- you prefer installing Instant Client ZIP files instead of RPM packages
- or your Linux distribution uses the Debian package format, for example
  if you are using Ubuntu. Note: you should review Oracle’s supported
  distributions before choosing an operating system.

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
^^^^^^^^^^^^^^^^^^^^^

Review the generic :ref:`prerequisites <prerequisites>`.

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc. The pre-built binaries are known to be usable on
Oracle Linux 6, 7, and 8.

Install Node.js
^^^^^^^^^^^^^^^

Download and extract the `Node.js “Linux
Binaries” <https://nodejs.org>`__ package. For example, if you
downloaded version 14.17.0 for 64-bit you could install Node.js into
``/opt``:

::

   cd /opt
   tar -Jxf node-v14.17.0-linux-x64.tar.xz

Set ``PATH`` to include Node.js:

::

   export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH

Install node-oracledb
^^^^^^^^^^^^^^^^^^^^^

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

If a pre-built node-oracledb binary is not installable or depends on an
newer glibc version, uninstall node-oracledb and build the binary from
source code, see :ref:`Node-oracledb Installation from Source
Code <github>`.

Install the free Oracle Instant Client ‘Basic’ ZIP file
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Download the free **Basic** ZIP file from `Oracle Technology
Network <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html>`__
and `unzip
it <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html#ic_x64_inst>`__
into a directory accessible to your application, for example:

::

   mkdir -p /opt/oracle
   cd /opt/oracle
   wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linuxx64.zip
   unzip instantclient-basic-linuxx64.zip

You will need the operating system ``libaio`` package installed. On some
platforms the package is called ``libaio1``. Run a command like
``yum install -y libaio`` or ``apt-get install -y libaio1``, depending
on your Linux distribution package manager. When using Instant Client 19
on recent Linux versions, such as Oracle Linux 8, you may also need to
install the ``libnsl`` package. This is not needed from Instant Client
21 onward. Note Oracle Instant Client 19 will not run on Oracle Linux 6.

If there is no other Oracle software on the machine that will be
impacted, then permanently add Instant Client to the run-time link path.
For example, if the Basic package unzipped to
``/opt/oracle/instantclient_19_11``, then run the following using sudo
or as the root user:

::

   sudo sh -c "echo /opt/oracle/instantclient_19_11 > /etc/ld.so.conf.d/oracle-instantclient.conf"
   sudo ldconfig

Alternatively, every shell running Node.js will need to have the link
path set:

::

   export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_11:$LD_LIBRARY_PATH

If disk space is important, most users will be able to use the smaller
Basic Light package instead of the Basic package. Review its
`globalization
limitations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E6566C23-54C9-490C-ADD1-EEB6240512EB>`__.
Disk space can be reduced by removing unnecessary libraries and files
from either the Basic or Basic Light packages. The exact libraries
depend on the Instant Client version. For example, with Oracle Instant
Client 19, you can optionally remove files using:

::

   rm -i *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci

Refer to the Oracle Instant Client documentation for details.

Optionally create the Oracle Client configuration file directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory, for example in
``/opt/oracle/your_config_dir``. Then use :meth:`oracledb.initOracleClient()`
in your application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network/admin``
subdirectory of Instant Client, for example in
``/opt/oracle/instantclient_19_11/network/admin``. This is the default
Oracle configuration directory for executables linked with this Instant
Client.

Run an example program
^^^^^^^^^^^^^^^^^^^^^^

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

*Note:* Remember to set ``LD_LIBRARY_PATH`` or equivalent first.

.. _instoh:

Node-oracledb installation on Linux x86_64 with a Local Database or Full Client
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
^^^^^^^^^^^^^^^^^^^^^

Review the generic :ref:`prerequisites <prerequisites>`.

The ``ORACLE_HOME`` can be either a database home or a full Oracle
client installation installed with Oracle’s ``runInstaller``.

For easy development, the free `Oracle
XE <https://www.oracle.com/database/technologies/appdev/xe.html>`__
version of the database is available on Linux. Applications developed
with XE may be immediately used with other editions of the Oracle
Database.

Install Node.js
^^^^^^^^^^^^^^^

Download and extract the `Node.js “Linux
Binaries” <https://nodejs.org>`__ package. For example, if you
downloaded version 14.17.0 for 64-bit you could install Node.js into
``/opt``:

::

   cd /opt
   tar -zxf node-v14.17.0-linux-x64.tar.gz

Set ``PATH`` to include Node.js:

::

   export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH

Install node-oracledb
^^^^^^^^^^^^^^^^^^^^^

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

If a pre-built binary is successfully installed but isn’t usable because
it depends on a different glibc version, uninstall node-oracledb and
install again from source code.

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see :ref:`Node-oracledb Installation from Source
Code <github>`.

The default Oracle Client configuration directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Optional Oracle client configuration files such as
`tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__,
`sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__,
and
`oraaccess.xml <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__
can be placed in ``$ORACLE_HOME/network/admin``.

Alternatively, if you use Oracle client configuration files, they can be
put in another, accessible directory. Then use
``oracledb.initOracleClient({configDir: '/your_path/your_config_dir'});``
or set the environment variable ``TNS_ADMIN`` to that directory name.

Run an example program
^^^^^^^^^^^^^^^^^^^^^^

Set required Oracle environment variables, such as ``ORACLE_HOME`` and
``LD_LIBRARY_PATH`` by executing:

::

   source /usr/local/bin/oraenv

Or, if you are using Oracle XE 11.2, by executing:

::

   source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh

Make sure the Node.js process has directory and file access permissions
for the Oracle libraries and other files. Typically the home directory
of the Oracle software owner will need permissions relaxed.

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _instrpm:

Node-oracledb Installation on Linux x86_64 with Instant Client RPMs
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine and your
Linux distribution uses RPM packages. Also see :ref:`Installing Node.js and
node-oracledb RPMs from yum.oracle.com <instnoderpms>`.

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
^^^^^^^^^^^^^^^^^^^^^

Review the generic :ref:`prerequisites <prerequisites>`.

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc. The pre-built binaries are known to be usable on
Oracle Linux 6, 7, and 8.

Install Node.js
^^^^^^^^^^^^^^^

Download and extract the `Node.js “Linux
Binaries” <https://nodejs.org>`__ package. For example, if you
downloaded version 14.17.0 for 64-bit you could install Node.js into
``/opt``:

::

   cd /opt
   tar -Jxf node-v14.17.0-linux-x64.tar.xz

Set ``PATH`` to include Node.js:

::

   export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH

Install node-oracledb
^^^^^^^^^^^^^^^^^^^^^

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

The pre-built binaries were built on Oracle Linux 6.

If a pre-built node-oracledb binary is not installable or depends on an
newer glibc version, uninstall node-oracledb and build the binary from
source code, see :ref:`Node-oracledb Installation from Source
Code <github>`.

Install the free Oracle Instant Client ‘Basic’ RPM
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Download the latest version of the free **Basic** RPM from
yum.oracle.com.

Instant Client is available for `Oracle Linux
7 <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient21/x86_64/index.html>`__
and `Oracle Linux
8 <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient21/x86_64/index.html>`__.
Older Oracle Instant Clients are also available in the `Oracle Linux
6 <https://yum.oracle.com/repo/OracleLinux/OL6/oracle/instantclient/x86_64/index.html>`__,
`Oracle Linux
7 <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html>`__
and `Oracle Linux
8 <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/x86_64/index.html>`__
repositories. The RPMs are also available from `Oracle Technology
Network <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html>`__.

`Install Instant Client
Basic <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html#ic_x64_inst>`__
with sudo or as the root user. You can install directly from
yum.oracle.com, for example using:

::

   sudo yum -y install oracle-release-el7
   sudo yum-config-manager --enable ol7_oracle_instantclient
   sudo yum -y install oracle-instantclient19.11-basic

Alternatively you can manually download the RPM and install from your
local file system:

::

   sudo yum install oracle-instantclient19.11-basic-19.11.0.0.0-1.x86_64.rpm

The link
`instantclient-basic-linuxx64.zip <https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linuxx64.zip>`__
will download the latest version available from
`OTN <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html>`__.

If you have a `ULN <https://linux.oracle.com>`__ subscription, another
alternative is to use ``yum`` to install the Basic package after
enabling the ol7_x86_64_instantclient or ol6_x86_64_instantclient
repository, depending on your version of Linux.

Using any of these methods will install the required ``libaio`` package,
if it is not already present. When using Instant Client 19 on recent
Linux versions, such as Oracle Linux 8, you may also need to manually
install the ``libnsl`` package. This is not needed from Instant Client
21 onward.

For Instant Client 19 RPMs, the system library search path is
automatically configured during installation. For older versions, if
there is no other Oracle software on the machine that will be impacted,
then permanently add Instant Client to the run-time link path. For
example, with sudo or as the root user:

::

   sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
   sudo ldconfig

Alternatively, for version 18 and earlier, every shell running Node.js
will need to have the link path set:

::

   export LD_LIBRARY_PATH=/usr/lib/oracle/18.3/client64/lib

Optionally create the Oracle Client configuration file directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory, for example in
``/opt/oracle/your_config_dir``. Then use :meth:`oracledb.initOracleClient()`
in your application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network/admin``
subdirectory of Instant Client, for example in
``/usr/lib/oracle/19.11/client64/lib/network/admin``. This is the
default Oracle configuration directory for executables linked with this
Instant Client.

Run an example program
^^^^^^^^^^^^^^^^^^^^^^

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

*Note:* Remember to set ``LD_LIBRARY_PATH`` or equivalent first.

.. _aarch64:

Node-oracledb Installation on Linux ARM (aarch64)
+++++++++++++++++++++++++++++++++++++++++++++++++

A pre-built node-oracledb binary is not available for Linux ARM
(aarch64). You need to :ref:`compile node-oracledb from source
code <github>`.

Oracle Instant Client for Linux ARM (aarch64) can be downloaded from
`oracle.com <https://www.oracle.com/database/technologies/instant-client/linux-arm-aarch64-downloads.html>`__.
A link to installation instructions is on that page.

The various node-oracledb installation sections for Linux x86_64 will
give some useful background.

.. _instnoderpms:

Installing Node.js and node-oracledb RPMs from yum.oracle.com
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Node.js and node-oracledb Linux RPM packages are available on
`yum.oracle.com <https://yum.oracle.com/oracle-linux-nodejs.html>`__.
See `Node.js for Oracle
Linux <https://yum.oracle.com/oracle-linux-nodejs.html>`__ for
installation details.

.. _instosx:

Node-oracledb Installation on Apple macOS (Intel x86)
-----------------------------------------------------

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
+++++++++++++++++++++

Review the generic :ref:`prerequisites <prerequisites>`.

The pre-built binaries were built on macOS (Intel x86) Big Sur 11.6

Oracle Instant Client libraries are required on macOS.

There is no native Oracle Database for macOS but one can easily be run
in a Linux virtual machine using Vagrant. See the `Oracle Database
Vagrant
projects <https://github.com/oracle/vagrant-projects/tree/main/OracleDatabase>`__.

Install Node.js
+++++++++++++++

Download the `Node.js package <https://nodejs.org>`__ for macOS 64-bit
and install it.

Install node-oracledb
+++++++++++++++++++++

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

Install the free Oracle Instant Client ‘Basic’ package
++++++++++++++++++++++++++++++++++++++++++++++++++++++

Download the **Basic** 64-bit DMG from `Oracle Technology
Network <https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html>`__.

Manual Installation
^^^^^^^^^^^^^^^^^^^

In Finder, double click on the DMG to mount it.

Open a terminal window and run the install script in the mounted
package, for example:

::

   $ /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh

This copies the contents to ``$HOME/Downloads/instantclient_19_8``.
Applications may not have access to the ``Downloads`` directory, so you
should move Instant Client somewhere convenient.

In Finder, eject the mounted Instant Client package.

If you have multiple Instant Client DMG packages mounted, you only need
to run ``install_ic.sh`` once. It will copy all mounted Instant Client
DMG packages at the same time.

Scripted Installation
^^^^^^^^^^^^^^^^^^^^^

Instant Client installation can alternatively be scripted, for example:

::

   cd $HOME/Downloads
   curl -O https://download.oracle.com/otn_software/mac/instantclient/198000/instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
   hdiutil mount instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
   /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh
   hdiutil unmount /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru

The Instant Client directory will be
``$HOME/Downloads/instantclient_19_8``. Applications may not have access
to the ``Downloads`` directory, so you should move Instant Client
somewhere convenient.

Configure Instant Client
^^^^^^^^^^^^^^^^^^^^^^^^

There are several alternative ways to tell node-oracledb where your
Oracle Client libraries are, see :ref:`Initializing
Node-oracledb <initnodeoracledb>`:

-  Use
   :meth:`oracledb.initOracleClient()` in your application code:

   .. code:: javascript

      const oracledb = require('oracledb');
      try {
        oracledb.initOracleClient({libDir: '/Users/your_username/Downloads/instantclient_19_8'});
      } catch (err) {
        console.error('Whoops!');
        console.error(err);
        process.exit(1);
      }

-  Alternatively, create a symbolic link for the ‘client shared library’
   in the ``node_modules/oracledb/build/Release`` directory where the
   ``oracledb*.node`` binary is. For example:

   ::

      ln -s ~/Downloads/instantclient_19_8/libclntsh.dylib node_modules/oracledb/build/Release

   This can be added to your ``package.json`` files:

   ::

        "scripts": {
          "postinstall": "ln -s $HOME/Downloads/instantclient_19_8/libclntsh.dylib $(npm root)/oracledb/build/Release"
         },

   Instead of linking, you can also copy all the required OCI libraries,
   for example:

   ::

      cp ~/Downloads/instantclient_19_8/{libclntsh.dylib.19.1,libclntshcore.dylib.19.1,libnnz19.dylib,libociei.dylib} node_modules/oracledb/build/Release
      cd node_modules/oracledb/build/Release/ && ln -s libclntsh.dylib.19.1 libclntsh.dylib

-  Alternatively, create a symbolic link for the ‘client shared library’
   in ``/usr/local/lib``. Note this may not work on all versions of
   macOS. If the ``lib`` sub-directory does not exist, you can create
   it. For example:

   ::

      mkdir /usr/local/lib
      ln -s ~/Downloads/instantclient_19_8/libclntsh.dylib /usr/local/lib

   Instead of linking, you can also copy all the required OCI libraries,
   for example:

   ::

      mkdir /usr/local/lib
      cp ~/Downloads/instantclient_19_8/{libclntsh.dylib.19.1,libclntshcore.dylib.19.1,libnnz19.dylib,libociei.dylib} /usr/local/lib/

.. _optionally-create-the-oracle-client-configuration-file-directory-2:

Optionally create the Oracle Client configuration file directory
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory, for example in
``/Users/your_username/your_config_dir``. Then use
:meth:`oracledb.initOracleClient()` in your application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/Users/your_username/your_config_dir'});

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network/admin``
subdirectory of Instant Client, for example in
``/Users/your_username/Downloads/instantclient_19_8/network/admin``.
This is the default Oracle configuration directory for executables
linked with this Instant Client.

Run an example program
++++++++++++++++++++++

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Make sure Instant Client is configured as shown above. For example you
may want to add calls to ``oracledb.initOracleClient()`` to the scripts.

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _windowsinstallation:

Node-oracledb Installation on Microsoft Windows
-----------------------------------------------

There are two ways to install node-oracledb on Microsoft Windows:

-  :ref:`Using Instant Client ZIP files <instwin>`
-  :ref:`Using a Local Database or Full Client <instwinoh>`

.. _instwin:

Node-oracledb Installation on Microsoft Windows with Instant Client ZIP files
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Follow these steps if your database is on a remote machine, or if you
already have Oracle software installed but you want node-oracledb to use
a different version of the libraries.

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
^^^^^^^^^^^^^^^^^^^^^

Review the generic :ref:`prerequisites <prerequisites>`.

The pre-built binaries were built with Visual Studio 2017 and require
the matching
`redistributable <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170>`__.

You may need Administrator privileges to set environment variables or
install software.

Install Node.js
^^^^^^^^^^^^^^^

Install the 64-bit Node.js MSI (e.g. node-v14.17.0-x64.msi) from
`nodejs.org <https://nodejs.org>`__. Make sure the option to add the
Node and npm directories to the path is selected.

Install node-oracledb
^^^^^^^^^^^^^^^^^^^^^

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see :ref:`Node-oracledb Installation from Source
Code <github>`.

Install the free Oracle Instant Client ZIP
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Download the free 64-bit Instant Client **Basic** ZIP file from `Oracle
Technology
Network <https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html>`__.
If your Node.js architecture is 32-bit, then use the `32-bit Instant
Client <https://www.oracle.com/database/technologies/instant-client/microsoft-windows-32-downloads.html>`__
instead. Windows 7 users: Note that Oracle 19 is not supported on
Windows 7.

Unzip the ZIP file into a directory that is accessible to your
application. For example unzip
``instantclient-basic-windows.x64-19.11.0.0.0dbru.zip`` to
``C:\oracle\instantclient_19_11``.

There are several alternative ways to tell node-oracledb where your
Oracle Client libraries are, see :ref:`Initializing
Node-oracledb <initnodeoracledb>`:

-  Use :meth:`oracledb.initOracleClient()` in your application:

   .. code:: javascript

      const oracledb = require('oracledb');
      try {
        oracledb.initOracleClient({libDir: 'C:\\oracle\\instantclient_19_11'});
      } catch (err) {
        console.error('Whoops!');
        console.error(err);
        process.exit(1);
      }

   If you use backslashes in the ``libDir`` string, you will need to
   double them.

-  Alternatively, copy the Oracle Instant Client libraries to the
   ``node_modules/oracledb/build/Release`` directory where the
   ``oracledb*.node`` binary is.

-  Alternatively, add the Oracle Instant Client directory to the
   ``PATH`` environment variable. The directory must occur in ``PATH``
   before any other Oracle directories.

   Restart any open command prompt windows.

   To avoid interfering with existing tools that require other Oracle
   Client versions then, instead of updating the system-wide ``PATH``
   variable, you may prefer to write a batch file that sets ``PATH``,
   for example:

   ::

      REM mynode.bat
      SET PATH=C:\oracle\instantclient_19_11;%PATH%
      node %*

   Invoke this batch file every time you want to run Node.js.

   Alternatively use ``SET`` to change your ``PATH`` in each command
   prompt window before you run node.

If disk space is important, most users will be able to use the smaller
Basic Light package instead of the Basic package. Review its
`globalization
limitations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E6566C23-54C9-490C-ADD1-EEB6240512EB>`__.
Disk space can be reduced by removing unnecessary libraries and files
from either the Basic or Basic Light packages. The exact libraries
depend on the Instant Client version. Refer to the Instant Client
documentation.

Optionally create the Oracle Client configuration file directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory. For example if they are in
``C:\oracle\your_config_dir`` then use :meth:`oracledb.initOracleClient()`
in your application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: 'C:\\oracle\\your_config_dir'});

If you use backslashes in the ``configDir`` string, you will need to
double them.

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network\admin``
subdirectory of Instant Client, for example in
``C:\oracle\instantclient_19_11\network\admin``. This is the default
Oracle configuration directory for executables linked with this Instant
Client.

.. _winredists:

Install the Visual Studio Redistributables
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``PATH`` variable needs to include the appropriate VS
Redistributable: - Oracle client 21 requires the `Visual Studio 2019
Redistributable <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170>`__
or later. - Oracle client 19 requires the `Visual Studio 2017
Redistributable <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170>`__.
- Oracle client 18 and 12.2 require the `Visual Studio 2013
Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2013-vc-120>`__.
- Oracle client 12.1 requires the `Visual Studio 2010
Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2010-vc-100-sp1-no-longer-supported>`__.
- Oracle client 11.2 requires the `Visual Studio 2005
Redistributable <https://docs.microsoft.com/en-US/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2005-vc-80-sp1-no-longer-supported>`__.

You can also find out the version required by locating the library
``OCI.DLL`` and running:

::

   dumpbin /dependents oci.dll

For example, if you see ``MSVCR120.dll`` then you need the VS 2013
Redistributable. If you see ``MSVCR100.dll`` then you need the VS 2010
Redistributable. If you see ``MSVCR80.dll`` then you need the VS 2005
Redistributable.

Run an example program
^^^^^^^^^^^^^^^^^^^^^^

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Make sure Instant Client is configured as shown above. For example you
may want to add calls to ``oracledb.initOracleClient()`` to the scripts.

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _instwinoh:

Node-oracledb Installation on Microsoft Windows with a Local Database or Full Client
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
^^^^^^^^^^^^^^^^^^^^^

Review the generic :ref:`prerequisites <prerequisites>`.

The pre-built binaries were built with Visual Studio 2017 and require
the matching
`redistributable <https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170>`__.

The Oracle software can be either a database home or a full Oracle
client installation. Make sure that ``PATH`` contains the correct binary
directory, for example ``C:\oracle\product\12.2.0\dbhome_1\bin``.

For easy development, the free `Oracle
XE <https://www.oracle.com/database/technologies/appdev/xe.html>`__
version of the database is available on Windows. Applications developed
with XE may be immediately used with other editions of the Oracle
Database.

You may need Administrator privileges to set environment variables or
install software.

Install Node.js
^^^^^^^^^^^^^^^

Install the 64-bit Node.js MSI (e.g. node-v14.17.0-x64.msi) from
`nodejs.org <https://nodejs.org>`__. Make sure the option to add the
Node and npm directories to the path is selected.

Install node-oracledb
^^^^^^^^^^^^^^^^^^^^^

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Install node-oracledb using the ``npm`` package manager, which is
included in Node.js:

::

   npm install oracledb

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see :ref:`Node-oracledb Installation from Source
Code <github>`.

The default Oracle Client configuration directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Optional Oracle client configuration files such as
`tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__,
`sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__,
and
`oraaccess.xml <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__
can be placed in ``$ORACLE_HOME\network\admin``.

Alternatively, if you use Oracle client configuration files, they can be
put in another, accessible directory. For example in
``C:\oracle\your_config_dir``. Then use
``oracledb.initOracleClient({configDir: 'C:\\oracle\\your_config_dir'});``
in your application or set the environment variable ``TNS_ADMIN`` to
that directory name.

Run an example program
^^^^^^^^^^^^^^^^^^^^^^

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _instaix:

Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files
--------------------------------------------------------------------------------

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
+++++++++++++++++++++

Review the generic :ref:`prerequisites <prerequisites>`.

The GCC compiler is needed.

Use GNU Make 4.1-1 or above.

Python 2.7 is needed by node-gyp.

Install Node.js
+++++++++++++++

Download `Node.js <https://nodejs.org>`__ for AIX on Power Systems. For
example, if you downloaded version 10.16.0 you could install Node.js
into ``/opt``:

::

   cd /opt
   gunzip -c node-v10.16.0-aix-ppc64.tar.gz | tar -xvf -

Set ``PATH`` to include Node.js:

::


   export PATH=/opt/node-v10.16.0-aix-ppc64/bin:$PATH

Install node-oracledb
+++++++++++++++++++++

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Set the compiler to GCC:

::

   export CC=gcc

Locate the `GitHub tag <https://github.com/oracle/node-oracledb/tags>`__
of the desired node-oracledb version, for example ``v5.5.0``, and
use the ``npm`` package manager (which is included in Node.js) to
install it.

If you have the ``git`` utility, you can install with:

::

   npm install oracle/node-oracledb.git#v5.5.0

Otherwise install using:

::

   npm install https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz

Install the free Oracle Instant Client ‘Basic’ ZIP file
+++++++++++++++++++++++++++++++++++++++++++++++++++++++

Download the **Basic** ZIP file from `Oracle Technology
Network <https://www.oracle.com/database/technologies/instant-client/aix-ppc64-downloads.html>`__
and extract it into a directory that is accessible to your application,
for example ``/opt/oracle``:

::

   unzip instantclient-basic-aix.ppc64-19.11.0.0.0dbru.zip
   mkdir -p /opt/oracle
   mv instantclient_19_11 /opt/oracle

To run applications, you will need to set the link path:

::

   export LIBPATH=/opt/oracle/instantclient_19_11:$LIBPATH

Optionally create the Oracle Client configuration file directory
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory, for example in
``/opt/oracle/your_config_dir``. Then use the following in your
application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network/admin``
subdirectory of Instant Client, for example in
``/opt/oracle/instantclient_19_11/network/admin``. This is the default
Oracle configuration directory for executables linked with this Instant
Client.

Run an example program
++++++++++++++++++++++

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _instsolarisx8664:

Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files
------------------------------------------------------------------------------------------

Questions and issues can be posted as `GitHub
Issues <https://github.com/oracle/node-oracledb/issues>`__.

Install Prerequisites
+++++++++++++++++++++

Review the generic :ref:`prerequisites <prerequisites>`.

Install Node.js
+++++++++++++++

Download the `Node.js source code <https://nodejs.org>`__.

Compile and build the Node.js engine into a directory of your choice,
such as ``/opt/node``:

::

   ./configure --dest-cpu=x64 --dest-os=solaris --prefix=/opt/node
   make
   make install

*Note:* if warnings are shown for ``objdump`` and ``dtrace``, then set
``PATH`` to include these binaries. This is most likely ``/usr/gnu/bin``
and ``/usr/bin``, respectively.

Set ``PATH`` to include the Node.js and Node-gyp binaries

::

   export PATH=/opt/node/bin:/opt/node/lib/node_modules/npm/bin/node-gyp-bin:$PATH

Install node-oracledb
+++++++++++++++++++++

If you are behind a firewall you may need to set your proxy, for
example:

::

   npm config set proxy http://myproxy.example.com:80/

Use the GNU ``gmake`` utility:

::

   export MAKE=gmake

Locate the `GitHub tag <https://github.com/oracle/node-oracledb/tags>`__
of the desired node-oracledb version, for example ``v5.5.0``, and
use the ``npm`` package manager (which is included in Node.js) to
install it.

If you have the ``git`` utility, you can install with:

::

   npm install oracle/node-oracledb.git#v5.5.0

Otherwise install using:

::

   npm install https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz

If this fails due to an invalid ``cp -a`` option, you can download the
node-oracledb source from GitHub. Then use ``node-gyp configure``. Edit
``build/Makefile`` and change the ``cmd_copy`` definition ``cp`` options
from ``cp -af`` to ``cp -pPR``. Finally, run ``node-gyp build``.

Install the free Oracle Instant Client ‘Basic’ ZIP file
+++++++++++++++++++++++++++++++++++++++++++++++++++++++

Download the **Basic** ZIP file from `Oracle Technology
Network <https://www.oracle.com/database/technologies/instant-client/solx8664-downloads.html>`__
and extract it into a directory that is accessible to your application,
for example ``/opt/oracle``:

::

   cd /opt/oracle
   unzip instantclient-basic-solaris.x64-19.11.0.0.0dbru.zip

To run applications, you will need to set the link path:

::

   export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_19_11:$LD_LIBRARY_PATH_64

.. _optionally-create-the-oracle-client-configuration-file-directory-5:

3.6.5 Optionally create the Oracle Client configuration file directory
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml`` with Instant Client, then put the
files in an accessible directory, for example in
``/opt/oracle/your_config_dir``. Then use the following in your
application:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});

Or you can set the environment variable ``TNS_ADMIN`` to that directory
name.

Another alternative is to put the files in the ``network/admin``
subdirectory of Instant Client, for example in
``/opt/oracle/instantclient_19_11/network/admin``. This is the default
Oracle configuration directory for executables linked with this Instant
Client.

Run an example program
++++++++++++++++++++++

Download the
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
from GitHub.

Edit ``dbconfig.js`` and set the `database
credentials <https://www.youtube.com/watch?v=WDJacg0NuLo>`__ to your
environment, for example:

::

   module.exports = {
     user          : "hr",
     password      : process.env.NODE_ORACLEDB_PASSWORD,
     connectString : "localhost/XEPDB1"
   };

Run one of the examples, such as
`example.js <https://github.com/oracle/node-oracledb/tree/main/examples/example.js>`__:

::

   node example.js

.. _github:

Node-oracledb Installation from Source Code
-------------------------------------------

Some build tools are required to compile node-oracledb.

Recent Node.js tools should work with Python 3 but you may need to
install `Python 2.7 <https://www.python.org/downloads/>`__ for the
node-gyp utility.

-  If another version of Python occurs first in your binary path then
   run ``npm config set python /wherever/python-2.7/bin/python`` or use
   the ``--python`` option to indicate the correct version. For example:
   ``npm install --python=/whereever/python-2.7/bin/python oracledb``.

-  On Windows, install the Python 2.7 MSI and select the customization
   option to “Add python.exe to Path”.

Install a C compiler:

-  On Linux, GCC 4.8.5 (the default on Oracle Linux 7) is known to work.

-  On macOS (Intel x86) install Xcode from the Mac App store.

-  On Windows, install a C build environment such as Microsoft Visual
   Studio 2017. Compilers supported by Oracle libraries are found in
   `Oracle documentation <https://docs.oracle.com/database/>`__ for each
   version, for example `Oracle Database Client Installation Guide for
   Microsoft
   Windows <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NTCLI>`__.
   Some users report that the npm ``windows-build-tools`` package has
   the necessary tools to build node-oracledb from source code.

The directories with the ``python`` and ``npm`` executables should be in
your PATH environment variable. On Windows you can use vcvars64.bat (or
vcvars.bat if you building with 32-bit binaries) to set the environment.
Alternatively you can open the ‘Developer Command Prompt for Visual
Studio’ which has environment variables already configured.

.. _githubclone:

Installing GitHub clones and ZIP files
++++++++++++++++++++++++++++++++++++++

If you clone the node-oracledb repository, or download a zip from
`GitHub <https://github.com/oracle/node-oracledb/>`__ to build
node-oracledb from source code, then you need to make sure the `ODPI-C
submodule <https://www.github.com/oracle/odpi>`__ is also included.
Otherwise the build will fail with an error like **‘dpi.h’ file not
found**.

-  If you download a node-oracledb ZIP file from GitHub, then separately
   download the ODPI-C submodule code and extract it into a ``odpi``
   subdirectory.

-  When cloning the node-oracledb repository, include ODPI-C by doing:

   ::

      git clone --recurse-submodules https://github.com/oracle/node-oracledb.git

With the node-oracledb source code in ``your_dir_path/node-oracledb``
use a ``package.json`` dependency like:

::

   "dependencies": {
      "oracledb": "file:/your_dir_path/node-oracledb"
   },

Alternatively change to your application directory and run:

::

   npm install your_dir_path/node-oracledb

.. _githubtags:

Installing using GitHub branches and tags
+++++++++++++++++++++++++++++++++++++++++

Node-oracledb can be installed directly from GitHub tags and branches.
The ``git`` source code utility is required for this method.

To install the current development code from the GitHub main branch, use
a ``package.json`` dependency like:

::

   "dependencies": {
      "oracledb": "oracle/node-oracledb#main"
   },

Alternatively, use the command:

::

   npm install oracle/node-oracledb#main

To install from a tag, replace ``main`` with the tag name like:
``oracle/node-oracledb#v5.5.0``.

.. _sourcepackage:

Installing from a source package
++++++++++++++++++++++++++++++++

Users without ``git`` can compile pre-bundled source code using a
``package.json`` dependency like:

::

   "dependencies": {
      "oracledb": "https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz"
   },

Or install with:

::

   npm install https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz

.. _nogithubaccess:

Installing from Oracle’s repository
+++++++++++++++++++++++++++++++++++

Oracle has a mirror of the GitHub repository source code that can be
cloned with:

::

   git clone --recurse-submodules https://opensource.oracle.com/git/oracle/node-oracledb.git

With the node-oracledb source code in ``your_dir_path/node-oracledb``
use a ``package.json`` dependency like:

::

   "dependencies": {
      "oracledb": "file:/your_dir_path/node-oracledb"
   },

Alternatively, change to your application directory and run:

::

   npm install your_dir_path/node-oracledb

.. _compilepackage:

Creating a node-oracledb package from source code
+++++++++++++++++++++++++++++++++++++++++++++++++

You can create a package containing the binary module and required
JavaScript files. This is equivalent to the package that is normally
installed from the `npm
registry <https://www.npmjs.com/package/oracledb>`__. Your new package
can be :ref:`self-hosted <selfhost>` for use within your company, or it
can be used directly from the file system to install node-oracledb.

-  Download
   `oracledb-src-5.5.0.tgz <https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz>`__
   from GitHub.

-  Extract the file: ``tar -xzf oracledb-src-5.5.0.tgz``

-  Change directory: ``cd package``

-  Run: ``npm run buildbinary``

   Ignore errors about ``git``, which is used to record some basic
   metadata when this command is run in a git clone.

-  Optionally run the above commands on other architectures and copy the
   resulting ``package/Staging/*`` files to your local
   ``package/Staging`` directory. This will allow the final
   node-oracledb package to be installed on multiple architectures.

-  Run: ``npm run buildpackage`` The package ``oracledb-5.5.0.tgz``
   is created.

This package can be shared or self-hosted, see :ref:`Hosting your own
node-oracledb Packages <selfhost>`.

.. _offline:

Node-oracledb Installation Without Internet Access
--------------------------------------------------

On a machine with access, download the node-oracledb package from
`npm <https://www.npmjs.com/package/oracledb>`__, for example from
`https://registry.npmjs.com/oracledb/-/oracledb-5.5.0.tgz <https://registry.npmjs.com/oracledb/-/oracledb-5.5.0.tgz>`__

This can be transferred to the desired machine and installed, for
example with:

::

   npm install your_dir_path/oracledb-5.5.0.tgz

If you are using an architecture that does not have pre-supplied
binaries then you can build your own package, see :ref:`Creating a
node-oracledb package from source code <compilepackage>`.

Consider self-hosting the node-oracledb package inside your network, see
:ref:`Hosting your own node-oracledb Packages <selfhost>`.

Alternatively, on an identical machine that has access to the internet,
install node-oracle following the :ref:`Node-oracledb Installation
Instructions <instructions>` for that operating system. Then copy
``node_modules/oracledb`` and Oracle Client libraries to the offline
computer. Windows users should see the next section and make sure the
correct Visual Studio Redistributable is also installed.

.. _winbins:

Copying node-oracledb Binaries on Windows
+++++++++++++++++++++++++++++++++++++++++

Node-oracledb binaries can be copied between compatible Windows systems.

After node-oracledb has been built or installed on the source computer,
copy the ``node_modules\oracledb`` directory to the destination
computer’s ``node_module`` directory.

Both computers must have the same version and architecture (32-bit or
64-bit) of Node.js.

Oracle client libraries of the same architecture as Node.js should be in
the destination computer’s ``PATH``. They may alternatively be in the
directory ``node_modules\oracledb\build\Release`` where the
``oracledb.node`` binary is located. Note the Oracle client library
versions do not have to be the same on different computers, but
node-oracledb behavior and features may then differ.

The destination computer’s ``PATH`` needs to include Visual Studio
Redistributables. If you have Oracle client 19 install the Visual Studio
2017 Redistributable. If you have Oracle client 18 or 12.2, install the
Visual Studio 2013 Redistributable. For Oracle client 12.1 install the
Visual Studio 2010 Redistributable. For Oracle client 11.2 install the
Visual Studio 2005 Redistributable.

You can also find out the Redistributable required by locating the
library ``OCI.DLL`` on the source computer and running:

::

   dumpbin /dependents oci.dll

If you see ``MSVCR120.dll`` then you need the VS 2013 Redistributable.
If you see ``MSVCR100.dll`` then you need the VS 2010 Redistributable.
If you see ``MSVCR80.dll`` then you need the VS 2005 Redistributable.

.. _selfhost:

Hosting your own node-oracledb Packages
---------------------------------------

You can host node-oracledb packages locally.

Download the node-oracledb package from npm, for example from
`https://registry.npmjs.com/oracledb/-/oracledb-5.5.0.tgz <https://registry.npmjs.com/oracledb/-/oracledb-5.5.0.tgz>`__
Alternatively, if you want to build your own binaries and node-oracledb
package, see :ref:`Creating a node-oracledb package from source
code <compilepackage>`.

If you make the package accessible on your local web server, for example
at www.example.com/oracledb-5.5.0.tgz, then your ``package.json``
would contain:

::

   . . .
      "dependencies": {
         "oracledb": "https://www.example.com/oracledb-5.5.0.tgz"
      },
   . . .

Or you would install with:

::

   npm install https://www.example.com/oracledb-5.5.0.tgz

.. _docker:

Using node-oracledb in Docker
-----------------------------

`Docker <https://www.docker.com/>`__ allows applications to be
containerized. Each application will have a ``Dockerfile`` with steps to
create a Docker image. Once created, the image can be shared and run.

Sample Dockerfiles for Oracle Linux are available on
`GitHub <https://github.com/oracle/docker-images/tree/main/OracleLinuxDevelopers>`__.
Some container images are in `Oracle’s GitHub Container
Registry <https://github.com/orgs/oracle/packages>`__.

Installing Node.js in Docker
++++++++++++++++++++++++++++

If your ``Dockerfile`` uses Oracle Linux:

::

   FROM oraclelinux:7-slim

Then you can install Node.js from
`yum.oracle.com <https://yum.oracle.com/oracle-linux-nodejs.html>`__
using:

::

   RUN  yum -y install oracle-nodejs-release-el7 && \
        yum -y install nodejs && \
        rm -rf /var/cache/yum

One alternative to Oracle Linux is to use a `Node.js image from Docker
Hub <https://hub.docker.com/_/node/>`__, for example using:

::

   FROM node:12-buster-slim

Note: you should review Oracle’s supported distributions before choosing
an operating system.

Installing Instant Client in Docker
+++++++++++++++++++++++++++++++++++

Review the available Instant Client packages for `Oracle Linux
7 <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient21/x86_64/index.html>`__
and `Oracle Linux
8 <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient21/x86_64/index.html>`__.
Older Oracle Instant Clients are also available in the `Oracle Linux
7 <https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html>`__
and `Oracle Linux
8 <https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/x86_64/index.html>`__
repositories. The RPMs and ZIP files are also available from `Oracle
Technology
Network <https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html>`__.

There are various ways to install Instant Client. Three methods are
shown below.

1. Using Oracle Linux Instant Client RPMs

   If you have an Oracle Linux image:

   ::

      FROM oraclelinux:7-slim

   Then you can install Instant Client RPMs:

   ::

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

   On Oracle Linux:

   ::

      RUN yum install -y libaio wget unzip

   On a Debian-based Linux:

   ::

      RUN apt-get update && apt-get install -y libaio1 wget unzip

   Then, to use the latest available Instant Client:

   ::

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
   could have a directory ``instantclient_21_1`` with these files:

   ::

      libclntshcore.so.21.1
      libclntsh.so.21.1
      libnnz21.so
      libociicus.so

   With this, your Dockerfile could contain:

   ::

      ADD instantclient_21_1/* /opt/oracle/instantclient_21_1
      RUN echo /opt/oracle/instantclient_21_1 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
          ldconfig

   The ``libaio`` or ``libaio1`` package will be needed.

   On Oracle Linux:

   ::

      RUN yum install -y libaio

   On a Debian-based Linux:

   ::

      RUN apt-get update && apt-get install -y libaio1

   When using Instant Client 19 on recent Linux versions, such as Oracle
   Linux 8, you may also need to install the ``libnsl`` package. This is
   not needed from Instant Client 21 onward.

Installing node-oracledb and your application
+++++++++++++++++++++++++++++++++++++++++++++

Include node-oracledb as a normal dependency in your application
``package.json`` file:

::

     . . .
     "scripts": {
       "start": "node server.js"
     },
     "dependencies": {
       "oracledb" : "^5"
     },
     . . .

The ``package.json`` and application file can be added to the image, and
dependencies installed when the image is built:

::

   WORKDIR /myapp
   ADD package.json server.js /myapp/
   RUN npm install

   CMD exec node server.js

Using Oracle Net configuration files and Oracle Wallets
+++++++++++++++++++++++++++++++++++++++++++++++++++++++

:ref:`Optional Oracle Net Configuration <tnsadmin>` files (like ``tnsnames.ora``
and ``sqlnet.ora``) and files that need to be secured such as :ref:`Oracle
wallets <connectionadb>` can be mounted at runtime using a Docker volume. Map
the volume to the ``network/admin`` subdirectory of Instant Client so the
``TNS_ADMIN`` environment variable does not need to be set. For example, when
the Wallet or configuration files are in ``/OracleCloud/wallet/`` on the host
computer, and the image uses Instant Client 19.11 RPMs, then you can mount the
files using:

::

   docker run -v /OracleCloud/wallet:/usr/lib/oracle/19.11/client64/lib/network/admin:Z,ro . . .

The ``Z`` option is needed when SELinux is enabled.

Example Application in Docker
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This example consists of a ``Dockerfile``, a ``package.json`` file with
the application dependencies, a ``server.js`` file that is the
application, and an ``envfile.list`` containing the database credentials
as environment variables.

If you use Oracle Linux, your ``Dockerfile`` will be like:

::

   FROM oraclelinux:7-slim

   RUN yum -y install oracle-instantclient-release-el7 && \
       yum -y install oracle-instantclient-basiclite && \
       rm -rf /var/cache/yum

   WORKDIR /myapp
   ADD package.json server.js /myapp/
   RUN npm install

   CMD exec node server.js

An equivalent Dockerfile that uses a Node.js image is:

::

   FROM node:12-buster-slim

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

Note: you should review Oracle’s supported distributions before choosing
an operating system.

For either Dockerfile, the ``package.json`` is:

::

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
       "oracledb" : "^5"
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
file contains:

::

   NODE_ORACLEDB_USER=hr
   NODE_ORACLEDB_PASSWORD=<hr password>
   NODE_ORACLEDB_CONNECTIONSTRING=server.example.com/orclpdb1

The image can be built:

::

   docker build -t nodedoc .

Alternatively, if you are behind a firewall, you can pass proxies when
building:

::

   docker build --build-arg https_proxy=http://myproxy.example.com:80 --build-arg http_proxy=http://www-myproxy.example.com:80 -t nodedoc .

Finaly, a container can be run from the image:

::

   docker run -ti --name nodedoc --env-file envfile.list nodedoc

The output is like:

::

   { metaData: [ { name: 'D' } ],
     rows: [ { D: '24-Nov-2019 23:39' } ] }

.. _installingoldvers:

Installing Older Versions of Node-oracledb
==========================================

Pre-built node-oracledb 3 and 4 binaries are available for some
platforms and Node.js versions. Review the `release
tags <https://github.com/oracle/node-oracledb/releases>`__ for
availability. You can compile the add-on for other platforms or
versions.

The node-oracledb 4.2 installation steps are in the `version 4.2 INSTALL
guide <https://github.com/oracle/node-oracledb/blob/v4.2.0/INSTALL.md>`__.

The node-oracledb 3.1 installation steps are in the `version 3.1 INSTALL
guide <https://github.com/oracle/node-oracledb/blob/v3.1.2/INSTALL.md>`__.

To get an old add-on you must explicitly use its version when
installing, for example:

::

   npm install oracledb@4.2.0

or your ``package.json`` could contain:

::

   . . .
      "dependencies": {
         "oracledb": "4.2.0"
      },
   . . .

.. _troubleshooting:

Troubleshooting Node-oracledb Installation Problems
===================================================

*Read the*\ :ref:`Node-oracledb Installation Instructions <instructions>`.

**Google anything that looks like an error.**

If ``npm install oracledb`` fails:

-  Review the error messages closely. If a pre-built node-oracledb
   binary package is not available for your Node.js version or operating
   system, then change your Node.js version or :ref:`compile node-oracledb
   from source code <github>`.

-  Was there a network connection error? Do you need to use
   ``npm config set   proxy``, or set ``http_proxy`` and/or
   ``https_proxy``?

-  Use ``npm install --verbose oracledb``. Review your output and logs.
   Try to install in a different way. Try some potential solutions.

-  When compiling node-oracledb from source, do you have Python 2.7? Run
   ``python --version``.

-  When compiling node-oracledb from source, do you have an old version
   of ``node-gyp`` installed? Try updating it. Also try deleting
   ``$HOME/.node-gyp`` or equivalent.

-  Try running ``npm cache clean -f`` and deleting the
   ``node_modules/oracledb`` directory.

If creating a connection fails:

-  If you got *DPI-1047: Cannot locate an Oracle Client library*, then
   review any messages, the installation instructions, and see
   :ref:`Initializing Node-oracledb <initnodeoracledb>`.

   Note that on Linux, calling :meth:`~oracledb.initOracleClient()` is not
   sufficient for setting the Oracle Client library path. Those libraries
   still need to be in the operating system search path, such as from running
   ``ldconfig`` or set in the environment variable ``LD_LIBRARY_PATH``
   before your Node.js process starts.

-  If you got *DPI-1072: the Oracle Client library version is
   unsupported*, then review the installation requirements.
   Node-oracledb needs Oracle client libraries 11.2 or later. Note that
   version 19 is not supported on Windows 7.

-  Does your Node.js architecture (32-bit or 64-bit) match the Oracle
   client library architecture? Run ``node -p 'process.arch'`` and
   compare with, for example, ``dumpbin /headers oci.dll`` (on Windows),
   ``file libclntsh.dylib`` (macOS) or ``file libclntsh.so.*`` (Linux).

-  On Windows, do you have the correct VS Redistributable? Review the
   :ref:`Windows install instructions <winredists>`.

-  On Windows, check the ``PATH`` environment variable includes the
   Oracle client libraries. Ensure that you have restarted your command
   prompt after you modified any environment variables.

-  Do you need system privileges to set, or preserve, variables like
   ``PATH``, e.g. an elevated command prompt on Windows, or ``sudo -E``
   on Linux?

-  Do you have multiple copies of Oracle libraries installed? Is the
   expected version first in ``PATH`` (on Windows) or
   ``LD_LIBRARY_PATH`` (on Linux)?

Issues and questions about node-oracledb can be posted on
`GitHub <https://github.com/oracle/node-oracledb/issues>`__ or
`Slack <https://node-oracledb.slack.com/>`__ (`link to join
Slack <https://join.slack.com/t/node-oracledb/shared_invite/enQtNDU4Mjc2NzM5OTA2LWMzY2ZlZDY5MDdlMGZiMGRkY2IzYjI5OGU4YTEzZWM5YjQ3ODUzMjcxNWQyNzE4MzM5YjNkYjVmNDk5OWU5NDM>`__).
