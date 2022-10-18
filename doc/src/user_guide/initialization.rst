.. _initnodeoracledb:

**************************
Initializing Node-oracledb
**************************

The node-oracledb add-on consists of JavaScript code that calls a binary
module. This binary loads Oracle Client libraries which communicate over
Oracle Net to an existing database. Node-oracledb can be installed with
``npm`` but the Oracle Client libraries need to be installed separately.
See the `node-oracledb installation
instructions <https://oracle.github.io/node-oracledb/INSTALL.html>`__.
Oracle Net is not a separate product: it is how the Oracle Client and
Oracle Database communicate.

.. figure:: /images/node-oracledb-architecture.png
   :alt: Node-oracledb Architecture

   Node-oracledb Architecture

.. _oracleclientloading:

Setting the Oracle Client Library Directory
===========================================

Node-oracledb dynamically loads the Oracle Client libraries using a
search heuristic. Only the first set of libraries found are loaded. If
appropriate libraries cannot be found, node-oracledb will return an
error like *DPI-1047: Cannot locate a 64-bit Oracle Client library*.

The libraries can be:

-  in an installation of Oracle Instant Client.

-  or in a full Oracle Client installation from running the Oracle
   Universal installer ``runInstaller``.

-  or in an Oracle Database installation, if Node.js is running on the
   same machine as the database.

The versions of Oracle Client and Oracle Database do not have to be the
same. For certified configurations see Oracle Support’s `Doc ID
207303.1 <https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1>`__
and see the `node-installation
instructions <https://oracle.github.io/node-oracledb/INSTALL.html>`__.

.. _oracleclientloadingwindows:

Setting the Oracle Client Directory on Windows
----------------------------------------------

On Windows, node-oracledb looks for the Oracle Client libraries as
follows:

-  In the :ref:`libDir <odbinitoracleclientattrsopts>` directory
   specified in a call to :meth:`oracledb.initOracleClient()`. This
   directory should contain the libraries from an unzipped Instant
   Client ‘Basic’ or ‘Basic Light’ package. If you pass the library
   directory from a full client or database installation, such as
   `Oracle Database “XE” Express
   Edition <https://www.oracle.com/database/technologies/appdev/xe.html>`__,
   then you will need to have previously set your environment to use
   that software installation otherwise files such as message files will
   not be located. If the Oracle Client libraries cannot be loaded from
   ``libDir``, then an error like *DPI-1047: Cannot locate a 64-bit
   Oracle Client library* is thrown.

-  If ``libDir`` was not specified, then Oracle Client libraries are
   looked for in the directory where the ``oracledb*.node`` binary is.
   For example in ``node_modules\oracledb\build\Release``. This
   directory should contain the libraries from an unzipped Instant
   Client ‘Basic’ or ‘Basic Light’ package. If the libraries are not
   found, no error is thrown and the search continues, see next bullet
   point.

-  In the directories on the system library search path, e.g. the
   ``PATH`` environment variable. If the Oracle Client libraries cannot
   be loaded, then an error like *DPI-1047: Cannot locate a 64-bit
   Oracle Client library* is thrown.

.. _oracleclientloadingmacos:

Setting the Oracle Client Directory on macOS
--------------------------------------------

On macOS, node-oracledb looks for the Oracle Client libraries as
follows:

-  In the :ref:`libDir <odbinitoracleclientattrsopts>` directory
   specified in a call to
   :ref:`oracledb.initOracleClient() <oracleclientcallinginit>`. This
   directory should contain the libraries from an unzipped Instant
   Client ‘Basic’ or ‘Basic Light’ package. If the Oracle Client
   libraries cannot be loaded from ``libDir``, then an error like
   *DPI-1047: Cannot locate a 64-bit Oracle Client library* is thrown.

-  If ``libDir`` was not specified, then Oracle Client libraries are
   looked for in the directory where the ``oracledb*.node`` binary is.
   For example in ``node_modules/oracledb/build/Release``. This
   directory should contain the libraries from an unzipped Instant
   Client ‘Basic’ or ‘Basic Light’ package. For example, use
   ``ln -s ~/Downloads/instantclient_19_8/libclntsh.dylib   node_modules/oracledb/build/Release/``.
   If the libraries are not found, no error is thrown and the search
   continues, see next bullet point.

-  In the library search path such as set in ``DYLD_LIBRARY_PATH`` (note
   this variable does not propagate to sub-shells) or in
   ``/usr/local/lib``. If the Oracle Client libraries cannot be loaded,
   then an error like *DPI-1047: Cannot locate a 64-bit Oracle Client
   library* is thrown.

.. _oracleclientloadinglinux:

Setting the Oracle Client Directory on Linux and Related Platforms
------------------------------------------------------------------

On Linux and related platforms, node-oracledb looks for the Oracle
Client libraries as follows:

-  In the :ref:`libDir <odbinitoracleclientattrsopts>` directory
   specified in a call to
   :ref:`oracledb.initOracleClient() <oracleclientcallinginit>`. This
   directory should contain the libraries from an unzipped Instant
   Client ‘Basic’ or ‘Basic Light’ package. If you pass the library
   directory from a full client or database installation, such as
   `Oracle Database “XE” Express
   Edition <https://www.oracle.com/database/technologies/appdev/xe.html>`__
   then you will need to have previously set the ``ORACLE_HOME``
   environment variable. If the Oracle Client libraries cannot be loaded
   from ``libDir``, then an error is thrown.

   **Note on Linux ``initOracleClient()`` is only useful to force
   immediate loading of the libraries because the libraries must also be
   in the system library search path, i.e. configured with ``ldconfig``
   or set in ``LD_LIBRARY_PATH``, before Node.js is started**.

-  If ``libDir`` was not specified, then Oracle Client libraries are
   looked for in the operating system library search path, such as
   configured with ``ldconfig`` or set in the environment variable
   ``LD_LIBRARY_PATH``. On some UNIX platforms an OS specific
   equivalent, such as ``LIBPATH`` or ``SHLIB_PATH`` is used instead of
   ``LD_LIBRARY_PATH``. If the libraries are not found, no error is
   thrown and the search continues, see next bullet point.

-  In ``$ORACLE_HOME/lib``. Note the environment variable
   ``ORACLE_HOME`` should only ever be set when you have a full database
   installation or full client installation. It should not be set if you
   are using Oracle Instant Client. The ``ORACLE_HOME`` variable, and
   other necessary variables, should be set before starting Node.js. See
   :ref:`Oracle Environment Variables <environmentvariables>`. If the
   Oracle Client libraries cannot be loaded, then an error like
   *DPI-1047: Cannot locate a 64-bit Oracle Client library* is thrown.

.. _oracleclientcallinginit:

Calling ``initOracleClient()`` to set the Oracle Client Directory
-----------------------------------------------------------------

Applications can call the synchronous function
:meth:`oracledb.initOracleClient()` to specify the directory containing
Oracle Instant Client libraries. The libraries are loaded when
``initOracleClient()`` is called. For example:

.. code:: javascript

   const oracledb = require('oracledb');

   if (process.platform === 'win32') {
     // Windows
     oracledb.initOracleClient({libDir: 'C:\\oracle\\instantclient_19_6'});
   } else if (process.platform === 'darwin') {
     // macOS
     oracledb.initOracleClient({libDir: process.env.HOME + '/Downloads/instantclient_19_8'});
   }
   // else on other platforms like Linux the system library search path MUST always be
   // set before Node.js is started, for example with ldconfig or LD_LIBRARY_PATH.

If you use backslashes in the ``libDir`` string, you will need to double
them.

The ``initOracleClient()`` function should only be called once.

**Note**: If you set ``libDir`` on Linux and related platforms, you must
still have configured the system library search path to include that
directory before starting Node.js.

On any operating system, if you set ``libDir`` to the library directory
of a full database or full client installation (such as from running
``runInstaller``), you will need to have previously set the Oracle
environment, for example by setting the ``ORACLE_HOME`` environment
variable. Otherwise you will get errors like *ORA-1804*. You should set
this variable, and other Oracle environment variables, before starting
Node.js, as shown in :ref:`Oracle Environment
Variables <environmentvariables>`.

If you call ``initOracleClient()`` with a ``libDir`` attribute, the
Oracle Client libraries are loaded immediately from that directory. If
you call ``initOracleClient()`` but do *not* set the ``libDir``
attribute, the Oracle Client libraries are loaded immediately using the
search heuristic discussed in earlier sections. If you do not call
``initOracleClient()``, then the libraries are loaded using the search
heuristic when the first node-oracledb function that depends on the
libraries is called, for example when a connection pool is created. If
there is a problem loading the libraries, then an error is thrown.

Make sure the Node.js process has directory and file access permissions
for the Oracle Client libraries. On Linux ensure a ``libclntsh.so`` file
exists. On macOS ensure a ``libclntsh.dylib`` file exists. Node-oracledb
will not directly load ``libclntsh.*.XX.1`` files in ``libDir`` or from
the directory where the ``oracledb*.node`` binary is. Note other
libraries used by ``libclntsh*`` are also required.

The ``oracledb.initOracleClient()`` method and searching of the
directory where the ``oracledb*.node`` binary is located were added in
node-oracledb 5.0.

Tracing Oracle Client Libraries Loading
+++++++++++++++++++++++++++++++++++++++

To trace the loading of Oracle Client libraries, the environment
variable ``DPI_DEBUG_LEVEL`` can be set to 64 before starting Node.js.
For example, on Linux, you might use:

::

   $ export DPI_DEBUG_LEVEL=64
   $ node myapp.js 2> log.txt

.. _tnsadmin:

Optional Oracle Net Configuration
=================================

Optional Oracle Net configuration files are read when node-oracledb is
loaded. These files affect connections and applications. The common
files are:

.. list-table-with-summary::  Optional Oracle Net Configuration Files
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the name of the file. The second column
       displays the description of the file.

    * - Name
      - Description
    * - ``tnsnames.ora``
      - Contains net service names and Oracle Net options for databases that
        can be connected to, see :ref:`Net Service Names for Connection Strings
        <tnsnames>`. This file is only needed for advanced configuration. Not
        needed if connection strings use the :ref:`Easy Connect syntax
        <easyconnect>`. The `Oracle Net documentation on tnsnames.ora
        <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5
        -5498-427C-9390-4A5C6767ADAA>`__ has more information.
    * - ``sqlnet.ora``
      - A configuration file controlling the network transport behavior. For
        example it can set call timeouts for :ref:`high availability
        <connectionha>`, or be used to :ref:`encrypt network traffic
        <securenetwork>`, or be used to configure logging and tracing.
        The `Oracle Net documentation on sqlnet.ora <https://www.oracle.com/
        pls/topic/lookup?ctx=dblatest&id=GUID-19423B71-3F6C-430F-84CC-18145CC2A
        818>`__ has more information.

The files should be in a directory accessible to Node.js, not on the
database server host.

To make node-oracledb use the files you can set
:ref:`configDir <odbinitoracleclientattrsopts>` in a call to
:meth:`oracledb.initOracleClient()`. For example,
if the file ``/etc/my-oracle-config/tnsnames.ora`` should be used, then
your code could be:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({configDir: '/etc/my-oracle-config'});

(If you use backslashes in the ``configDir`` string, you will need to
double them.)

This is equivalent to setting the environment variable
`TNS_ADMIN <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-12C94B15-2CE1-4B98-9D0C-8226A9DDF4CB>`__ to ``/etc/my-oracle-config``.

If ``initOracleClient()`` is not called, or it is called but
:ref:`configDir <odbinitoracleclientattrsopts>` is not set, then
default directories are searched for the configuration files. They
include:

-  ``$TNS_ADMIN``
-  ``/opt/oracle/instantclient_19_6/network/admin`` if Instant Client is
   in ``/opt/oracle/instantclient_19_6``.
-  ``/usr/lib/oracle/19.6/client64/lib/network/admin`` if Oracle 19.6
   Instant Client RPMs are used on Linux.
-  ``$ORACLE_HOME/network/admin`` or ``$ORACLE_BASE_HOME/network/admin``
   if node-oracledb is using libraries from the database installation.

A wallet configuration file ``cwallet.sso`` for secure connection can be
located with, or separately from, the ``tnsnames.ora`` and
``sqlnet.ora`` files. It should be securely stored. The ``sqlnet.ora``
file’s ``WALLET_LOCATION`` path should be set to the directory
containing ``cwallet.sso``. For Oracle Autonomous Database use of
wallets, see :ref:`Connecting to Oracle Cloud Autonomous
Databases <connectionadb>`.

Note the :ref:`Easy Connect Plus <easyconnect>` syntax can set many common
configuration options without needing ``tnsnames.ora`` or ``sqlnet.ora``
files.

The section :ref:`Connections and High Availability <connectionha>` has
some discussion about Oracle Net configuration.

.. _oraaccess:

Optional Oracle Client Configuration
====================================

If the Oracle Client Libraries used by node-oracledb are version 12, or
later, then an optional
`oraaccess.xml <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__ file can be used to configure some
behaviors of those libraries, such as statement caching and prefetching.
This can be useful if the application cannot be altered. The file is read
when node-oracledb starts. The file is read from the same directory as the
:ref:`Optional Oracle Net Configuration <tnsadmin>` files.

The following ``oraaccess.xml`` file sets the Oracle client
`‘prefetch’ <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
7AE9DBE2-5316-4802-99D1-969B72823F02>`__ value to 1000 rows. This value
affects every SQL query in the application::

   <?xml version="1.0"?>
    <oraaccess xmlns="http://xmlns.oracle.com/oci/oraaccess"
     xmlns:oci="http://xmlns.oracle.com/oci/oraaccess"
     schemaLocation="http://xmlns.oracle.com/oci/oraaccess
     http://xmlns.oracle.com/oci/oraaccess.xsd">
     <default_parameters>
       <prefetch>
         <rows>1000</rows>
       </prefetch>
     </default_parameters>
   </oraaccess>

Prefetching is a tuning feature, see :ref:`Tuning Fetch
Performance <rowfetching>`.

The ``oraaccess.xml`` file has other uses including:

-  Changing the value of :ref:`Fast Application Notification
   (FAN) <connectionfan>` events which affects notifications and
   :ref:`Runtime Load Balancing (RLB) <connectionrlb>`.
-  Configuring `Client Result
   Caching <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
   D2FA7B29-301B-4AB8-8294-2B1B015899F9>`__ parameters
-  Turning on `Client Statement Cache
   Auto-tuning <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
   -6E21AA56-5BBE-422A-802C-197CAC8AAEA4>`__

Refer to the ``oraaccess.xml`` documentation `<https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__
for more information.

.. _environmentvariables:

Oracle Environment Variables
============================

Some common environment variables that influence node-oracledb are shown
below. The variables that may be needed depend on how Node.js is
installed, how you connect to the database, and what optional settings
are desired. It is recommended to set Oracle variables in the
environment before invoking Node.js, however they may also be set in
application code as long as they are set before node-oracledb is first
used. System environment variables like ``LD_LIBRARY_PATH`` must be set
before Node.js starts.

.. list-table-with-summary:: Common Oracle Environment Variables
    :header-rows: 1
    :class: wy-table-responsive
    :summary: The first column displays the common Oracle Environment Variable. The second column, Purpose, describes what the environment variable is used for.

    * - Oracle Environment Variables
      - Purpose
    * - ``LD_LIBRARY_PATH``
      - Used on Linux and some UNIX platforms. Set this to the directory
        containing the Oracle Client libraries, for example
        ``/opt/oracle/instantclient_19_6`` or ``$ORACLE_HOME/lib``. The
        variable needs to be set in the environment before Node.js is invoked.
        The variable is not needed if the libraries are located by an
        alternative method, such as from running ``ldconfig``. On some UNIX
        platforms an OS specific equivalent, such as ``LIBPATH`` or
        ``SHLIB_PATH`` is used instead of ``LD_LIBRARY_PATH``.
    * - ``PATH``
      - The library search path for Windows should include the location where
        ``OCI.DLL`` is found. Not needed if you pass
        :ref:`libDir <odbinitoracleclientattrsopts>` when calling
        :meth:`oracledb.initOracleClient()`.
    * - ``TNS_ADMIN``
      - The location of the optional :ref:`Oracle Net configuration files
        <tnsadmin>` and :ref:`Oracle Client configuration files <oraaccess>`,
        including ``tnsnames.ora``, ``sqlnet.ora``, and ``oraaccess.xml``, if
        they are not in a default location. The :ref:`configDir
        <odbinitoracleclientattrsopts>` value in a call to
        :meth:`oracledb.initOracleClient()` overrides ``TNS_ADMIN``.
    * - ``ORA_SDTZ``
      - The default session time zone, see :ref:`Fetching Dates and Timestamps
        <datehandling>`.
    * - ``ORA_TZFILE``
      - The name of the Oracle time zone file to use. See the notes below.
    * - ``ORACLE_HOME``
      - The directory containing the Oracle Database software. This directory
        must be accessible by the Node.js process. This variable should *not*
        be set if node-oracledb uses Oracle Instant Client.
    * - ``NLS_LANG``
      - Determines the ‘national language support’ globalization options for
        node-oracledb. If not set, a default value will be chosen by Oracle.
        Note that node-oracledb will always uses the AL32UTF8 character set.
        See :ref:`Globalization and National Language Support (NLS) <nls>`.
    * - ``NLS_DATE_FORMAT``, ``NLS_TIMESTAMP_FORMAT``
      - See :ref:`Fetching Numbers and Dates as String <fetchasstringhandling>`.
        The variables are ignored if ``NLS_LANG`` is not set.
    * - ``NLS_NUMERIC_CHARACTERS``
      - See :ref:`Fetching Numbers and Dates as String <fetchasstringhandling>`.
        The variables are ignored if ``NLS_LANG`` is not set.

Time Zone File
--------------

The name of the Oracle time zone file to use can be set in
``ORA_TZFILE``.

If node-oracledb is using Oracle Client libraries from an Oracle
Database or full Oracle Client software installation, and you want to
use a non-default time zone file, then set ``ORA_TZFILE`` to the file
name with a directory prefix, for example:
``export ORA_TZFILE=/opt/oracle/myconfig/timezone_31.dat``.

Oracle Instant Client includes embedded small and big time zone ‘files’,
for example ``timezone_32.dat`` and ``timezlrg_32.dat``. The versions
can be shown by running the utility ``genezi -v`` located in the Instant
Client directory. The small file contains only the most commonly used
time zones. By default the larger ``timezlrg_n.dat`` file is used. If
you want to use the smaller ``timezone_n.dat`` file, then set the
``ORA_TZFILE`` environment variable to the name of the file without any
directory prefix, for example ``export ORA_TZFILE=timezone_32.dat``.
With Oracle Instant Client 12.2 or later, you can also use an external
time zone file. Create a subdirectory ``oracore/zoneinfo`` under the
Instant Client directory, and move the file into it. Then set
``ORA_TZFILE`` to the file name, without any directory prefix. The
``genezi -v`` utility will show the time zone file in use.

The Oracle Database documentation contains more information about time
zone files, see `Choosing a Time Zone
File <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-805AB986-
DE12-4FEA-AF56-5AABCD2132DF>`__.

Scripts for the Default Environment in a Database Installation
--------------------------------------------------------------

If you are using Linux, and node-oracledb is being run on the same
computer as the database, you can set required Oracle environment
variables, such as ``ORACLE_HOME`` and ``LD_LIBRARY_PATH`` in your shell
by executing::

   source /usr/local/bin/oraenv

Or, if you are using `Oracle Database XE
11.2 <https://www.oracle.com/database/technologies/appdev/xe.html>`__,
by executing::

   source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh

Make sure the Node.js process has directory and file access permissions
for the Oracle libraries and other files. Typically the home directory
of the Oracle software owner will need permissions relaxed.

.. _otherinit:

Other Node-oracledb Initialization
==================================

The :meth:`oracledb.initOracleClient()` function
allows :ref:`driverName <odbinitoracleclientattrsopts>` and
:ref:`errorUrl <odbinitoracleclientattrsopts>` attributes to be set.
These are useful for applications whose end-users are not aware
node-oracledb is being used. An example of setting the attributes is:

.. code:: javascript

   const oracledb = require('oracledb');
   oracledb.initOracleClient({
     driverName: 'My Great App : 3.1.4'
     errorUrl: 'https://example.com/MyInstallInstructions.html',
   });

The ``driverName`` value will be shown in Oracle Database views like
``V$SESSION_CONNECT_INFO``. The convention for ``driverName`` is to
separate the product name from the product version by a colon and single
space characters. If this attribute is not specified, then the value
“node-oracledb : *version*” is used, see :ref:`Add-on
Name <drivernameview>`.

The ``errorUrl`` string will be shown in the exception raised if the
Oracle Client libraries cannot be loaded. This allows applications that
use node-oracledb to refer users to application-specific installation
instructions. If this attribute is not set, then the `node-oracledb
installation
instructions <https://oracle.github.io/node-oracledb/INSTALL.html>`__
URL is used.
