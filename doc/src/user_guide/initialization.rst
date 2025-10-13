.. _initnodeoracledb:

**************************
Initializing node-oracledb
**************************

By default, node-oracledb runs in a 'Thin' mode which connects directly to
Oracle Database. This mode does not need Oracle Client libraries. However, when
the driver does use these libraries to communicate to Oracle Database, then
node-oracledb is said to be in 'Thick' mode and has :ref:`additional
functionality <featuresummary>` available. See :ref:`thickarch` for the
architecture diagram.

All connections in an application use the same mode. See :ref:`vsessconinfo`
to verify which mode is in use.

.. _enablingthick:

Enabling node-oracledb Thick Mode
=================================

To change from the default Thin mode to the Thick mode:

1. Oracle Client libraries must be available to handle communication to your
   database. These need to be installed separately, see :ref:`installation`.

   Oracle Client libraries from one of the following can be used:

   - An `Oracle Instant Client <https://www.oracle.com/database/technologies/
     instant-client.html>`__ Basic or Basic Light package. This is generally
     the easiest if you do not already have Oracle software installed.

   - A full Oracle Client installation (installed by running the Oracle
     Universal installer ``runInstaller``).

   - An Oracle Database installation, if Node.js is running on the same
     machine as the database.

   The Client library version does not always have to match the Oracle
   Database version.

2. Your application *must* call the synchronous function
   :meth:`oracledb.initOracleClient()` to load the client libraries. For
   example:

   .. code-block:: javascript

       const oracledb = require('oracledb');

       let clientOpts = {};
       if (process.platform === 'win32') {
         // Windows
         // If you use backslashes in the libDir string, you will
         // need to double them.
         clientOpts = { libDir: 'C:\\oracle\\instantclient_23_5' };
       } else if (process.platform === 'darwin' && process.arch === 'arm64') {
         // macOS ARM64
         clientOpts = { libDir: process.env.HOME + '/Downloads/instantclient_23_3' };
       }
       // else on other platforms like Linux the system library search path MUST always be
       // set before Node.js is started, for example with ldconfig or LD_LIBRARY_PATH.

       // enable node-oracledb Thick mode
       oracledb.initOracleClient(clientOpts);

More details and options are shown in the following sections:

- :ref:`oracleclientloadingwindows`
- :ref:`oracleclientloadingmacos`
- :ref:`oracleclientloadinglinux`

**Notes on calling initOracleClient()**

- The :meth:`~oracledb.initOracleClient()` function must be called before any
  :ref:`standalone connection <standaloneconnection>` or
  :ref:`connection pool <connpooling>` is created. If a connection or pool
  is first created, then the Thick mode cannot be enabled.

- If you call :meth:`~oracledb.initOracleClient()` with a ``libDir`` attribute,
  the Oracle Client libraries are loaded immediately from that directory. If
  you call :meth:`~oracledb.initOracleClient()` but do *not* set the ``libDir``
  attribute, the Oracle Client libraries are loaded immediately using the
  search heuristics discussed in later sections. If you set ``libDir`` on
  Linux and related platforms, you must still have configured the system
  library search path to include that directory before starting Node.js.

- Once the Thick mode is enabled, you cannot go back to the Thin mode except by
  removing calls to :meth:`~oracledb.initOracleClient()` and restarting the
  application.

- If Oracle Client libraries cannot be loaded, then
  :meth:`~oracledb.initOracleClient()` will return an error
  ``DPI-1047: Cannot locate a 64-bit Oracle Client library``. To resolve
  this, review the platform-specific instructions below or see
  :ref:`troubleshooting DPI-1047 <dpi1047>`. Alternatively, remove the call to
  :meth:`~oracledb.initOracleClient()` and use
  :ref:`Thin mode <changingthick>`. The features supported by Thin mode can
  be found in :ref:`featuresummary`.

- On any operating system, if you set ``libDir`` to the library directory of a
  full database or full client installation (such as from running
  ``runInstaller``), you will need to have previously set the Oracle
  environment, for example, by setting the ``ORACLE_HOME`` environment
  variable. Otherwise, you will get errors like ``ORA-1804``. You should set
  this variable, and other Oracle environment variables, before starting
  Node.js, as shown in :ref:`Oracle Environment Variables
  <environmentvariables>`.

- The :meth:`~oracledb.initOracleClient()` function may be called multiple
  times in your application but must always pass the same arguments.

.. _oracleclientloadingwindows:

Enabling node-oracledb Thick Mode on Windows
--------------------------------------------

On Windows, the alternative ways to enable Thick mode are:

- By passing the :ref:`libDir <odbinitoracleclientattrsopts>` parameter in a
  call to :meth:`~oracledb.initOracleClient()`, for example:

  .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient({libDir: 'C:\\oracle\\instantclient_23_5'});

  If you use backslashes in the ``libDir`` string, you will need to double
  them.

  This directory should contain the libraries from an unzipped `Instant
  Client 'Basic' or 'Basic Light' <https://www.oracle.com/database/
  technologies/instant-client.html>`__ package. If you pass the library
  directory from a full client or database installation, such as
  `Oracle Database “XE” Express Edition <https://www.oracle.com/database
  /technologies/appdev/xe.html>`__, then you will need to have previously
  set your environment to use that software installation otherwise files
  such as message files will not be located.

- Alternatively, copy the Oracle Instant Client libraries to the
  ``node_modules/oracledb/build/Release`` directory where the
  ``oracledb*.node`` binary is. This directory should contain the
  libraries from an unzipped `Instant Client 'Basic' or 'Basic Light'
  <https://www.oracle.com/database/technologies/instant-client.html>`__
  package.

  Update your application to call :meth:`oracledb.initOracleClient()`
  which enables Thick mode:

  .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

- Alternatively, add the Oracle Client library directory to the ``PATH``
  environment variable. If you are running Node.js on the same machine as your
  database, and node-oracledb can therefore use the client libraries that are
  available in the Oracle Database software, this variable may already be set
  correctly. The directory must occur in ``PATH`` before any other Oracle
  directories. Restart any open command prompt windows.

  Update your application to call :meth:`oracledb.initOracleClient()`
  which enables Thick mode:

  .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

- Alternatively, use ``SET`` to change your ``PATH`` in each command
  prompt window before you run node.

- Another way to set the ``PATH`` variable is to use a batch file that sets
  this variable before Node.js is executed, for example::

        REM mynode.bat
        SET PATH=C:\oracle\instantclient_23_5;%PATH%
        node %*

  Invoke this batch file every time you want to run Node.js.

  Update your application to call :meth:`oracledb.initOracleClient()`
  which enables Thick mode:

  .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

.. _oracleclientloadingmacos:

Enabling node-oracledb Thick Mode on macOS
------------------------------------------

On macOS, the alternative ways to enable Thick mode are:

- By passing the :ref:`libDir <odbinitoracleclientattrsopts>` parameter in a
  call to :meth:`~oracledb.initOracleClient()`.

  .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient({libDir: process.env.HOME + '/Downloads/instantclient_23_3'});

  This directory should contain the libraries from an unzipped `Instant
  Client 'Basic' or 'Basic Light' <https://www.oracle.com/database/
  technologies/instant-client.html>`__ package.

- Alternatively, you can call :meth:`~oracledb.initOracleClient()` without
  passing a ``libDir`` parameter.

  .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

  In this case, the Oracle Client libraries are first looked for in the
  directory where the ``oracledb*.node`` binary is. For example in
  ``node_modules/oracledb/build/Release``. This directory should contain the
  libraries from an unzipped `Instant Client 'Basic' or 'Basic Light'
  <https://www.oracle.com/database/technologies/instant-client.html>`__
  package. For example, use
  ``ln -s ~/Downloads/instantclient_23_3/libclntsh.dylibnode_modules/oracledb/build/Release/``.

  If the libraries are not found, the library search path such as set in
  ``DYLD_LIBRARY_PATH`` (note this variable does not propagate to sub-shells)
  or files in ``/usr/local/lib`` may be used.

- Alternatively, create a symbolic link for the ‘client shared library’
  in the ``node_modules/oracledb/build/Release`` directory where the
  ``oracledb*.node`` binary is. For example::

        ln -s ~/Downloads/instantclient_23_3/libclntsh.dylib node_modules/oracledb/build/Release

  This can be added to your ``package.json`` files::

        "scripts": {
            "postinstall": "ln -s $HOME/Downloads/instantclient_23_3/libclntsh.dylib $(npm root)/oracledb/build/Release"
        },

  With the libraries in place, your application can then enable Thick mode:

  .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

- Alternatively, create a symbolic link for the ‘client shared library’
  in ``/usr/local/lib``. Note this may not work on all versions of
  macOS. If the ``lib`` sub-directory does not exist, you can create
  it. For example::

        mkdir /usr/local/lib
        ln -s ~/Downloads/instantclient_23_3/libclntsh.dylib /usr/local/lib

  With the libraries in place, your application can then enable Thick mode:

  .. code:: javascript

        const oracledb = require('oracledb');
        oracledb.initOracleClient();

.. _oracleclientloadinglinux:

Enabling node-oracledb Thick Mode on Linux and Related Platforms
----------------------------------------------------------------

On Linux and related platforms, enable Thick mode by calling
:meth:`~oracledb.initOracleClient()` without passing a ``libDir`` parameter.

.. code-block:: javascript

      const oracledb = require('oracledb');
      oracledb.initOracleClient();

Oracle Client libraries are looked for in the operating system library
search path, such as configured with ``ldconfig`` or set in the environment
variable ``LD_LIBRARY_PATH``. This must be configured *prior* to running the
Node.js process. Web servers and other daemons commonly reset environment
variables so using ``ldconfig`` is generally preferred instead. On some UNIX
platforms, an OS specific equivalent such as ``LIBPATH`` or ``SHLIB_PATH`` is
used instead of ``LD_LIBRARY_PATH``.

If the libraries are not found in the system library search path, then
libraries in ``$ORACLE_HOME/lib`` will be used. Note that the environment
variable ``ORACLE_HOME`` should only ever be set when you have a full
database installation or full client installation (such as installed with
the Oracle GUI installer). It should not be set if you are using `Oracle
Instant Client <https://www.oracle.com/database/technologies/instant-
client.html>`__. If being used, the ``ORACLE_HOME`` variable and other
necessary variables should be set before starting Node.js. See
:ref:`Oracle Environment Variables <environmentvariables>`.

On Linux, node-oracledb Thick mode will not automatically load Oracle Client
library files from the directory where the node-oracledb binary module is
located. One of the above methods should be used instead.

Ensure that the Node.js process has directory and file access permissions
for the Oracle Client libraries. OS restrictions may prevent the opening of
Oracle Client libraries installed in unsafe paths, such as from a user
directory. You may need to install the Oracle Client libraries under a
directory like ``/opt`` or ``/usr/local``.

Tracing Oracle Client Libraries Loading
---------------------------------------

To trace the loading of Oracle Client libraries, the environment
variable ``DPI_DEBUG_LEVEL`` can be set to 64 before starting Node.js.
For example, on Linux, you might use::

    $ export DPI_DEBUG_LEVEL=64
    $ node myapp.js 2> log.txt

On Windows you might set the variable like::

    set DPI_DEBUG_LEVEL=64

.. _optconfigfiles:

Optional Oracle Configuration Files
===================================

.. _tnsadmin:

Optional Oracle Net Configuration Files
---------------------------------------

Optional Oracle Net configuration files may be read by node-oracledb. These
files affect connections and applications. The common files are:

.. list-table-with-summary::  Optional Oracle Net Configuration Files
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 40
    :summary: The first column displays the name of the file. The second column
       displays the description of the file.

    * - Name
      - Description
    * - ``tnsnames.ora``
      - Contains Oracle Net Service names and Oracle Net options for databases that can be connected to, see :ref:`Net Service Names for Connection Strings <tnsnames>`. This file is only needed for advanced configuration. Not needed if connection strings use the :ref:`Easy Connect syntax <easyconnect>`. The `Oracle Net documentation on tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__ has more information.

        From version 6.6 onwards, node-oracledb recognizes the `IFILE <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F8AC6FC6-F456-481F-8997-3B0E906BB745>`__ parameter that is used in the ``tnsnames.ora`` file to embed custom network configuration files.
    * - ``sqlnet.ora``
      - A configuration file controlling the network transport behavior. For example it can set call timeouts for :ref:`high availability <connectionha>`, or be used to :ref:`encrypt network traffic <securenetwork>`, or be used to configure logging and tracing. The `Oracle Net documentation on sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-19423B71-3F6C-430F-84CC-18145CC2A818>`__ has more information.  Many settings can alternatively be specified using :ref:`Easy Connect syntax <easyconnect>`

        This file is only used in node-oracledb Thick mode. In node-oracledb Thin mode, many settings can be defined in :ref:`Easy Connect syntax <easyconnect>`, in :meth:`~oracledb.getConnection()` or :meth:`~oracledb.createPool()` calls, or in the ``tnsnames.ora`` file.


The documentation :ref:`Connections and High Availability <connectionha>`
discusses some specific Oracle Net configuration options useful for
node-oracledb applications.

See :ref:`usingconfigfiles` to understand how node-oracledb locates the files.

.. _oraaccess:

Optional Oracle Client Configuration File
-----------------------------------------

If the Oracle Client Libraries used by node-oracledb Thick mode are version
12, or later, then an optional `oraaccess.xml <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__
file can be used to configure some behaviors of those libraries, such as
statement caching and prefetching. This can be useful if the application
cannot be altered. The file is read when node-oracledb starts. The file is
read from the same directory as the :ref:`Optional Oracle Net Configuration
<tnsadmin>` files.

.. note::

    The ``oraaccess.xml`` files is only used in node-oracledb Thick mode. See
    :ref:`enablingthick`.

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

- Changing the value of :ref:`Fast Application Notification
  (FAN) <connectionfan>` events which affects notifications and
  :ref:`Runtime Load Balancing (RLB) <connectionrlb>`.
- Configuring `Client Result
  Caching <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
  D2FA7B29-301B-4AB8-8294-2B1B015899F9>`__ parameters
- Turning on `Client Statement Cache
  Auto-tuning <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
  -6E21AA56-5BBE-422A-802C-197CAC8AAEA4>`__

Refer to the documentation on `oraaccess.xml <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2>`__
for more information.

See :ref:`usingconfigfiles` to understand how node-oracledb locates the file.

.. _usingconfigfiles:

Using Optional Oracle Configuration Files
-----------------------------------------

If you use optional Oracle configuration files such as ``tnsnames.ora``,
``sqlnet.ora`` or ``oraaccess.xml``, then put the files in an accessible
directory and follow the Thin or Thick mode instructions below.

The files should be in a directory accessible to Node.js, not on the database
server host.

**For node-oracledb Thin mode**

In node-oracledb Thin mode, you must specify the directory that contains the
``tnsnames.ora`` file by either:

- Setting the `TNS_ADMIN <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
  &id=GUID-12C94B15-2CE1-4B98-9D0C-8226A9DDF4CB>`__ environment variable to the
  directory containing the file and then running your application.  For
  example, in a terminal::

      export TNS_ADMIN=/opt/oracle/your_config_dir
      node myapp.js

- Or setting the ``configDir`` attribute to the directory containing the file
  when :meth:`connecting <oracledb.getConnection()>` or creating a
  :meth:`connection pool <oracledb.createPool()>`.  For example:

  .. code-block:: javascript

      const oracledb = require('oracledb');

      async function run() {
          const connection = await oracledb.getConnection({
              user          : "hr",
              password      : mypw,  // contains the hr schema password
              connectString : "myhost/FREEPDB1",
              configDir     : "/opt/oracle/your_config_dir"
          });

On Windows, if you use backslashes in the ``configDir`` string, you will need
to double them.

.. note::

    In Thin mode, you must explicitly set the directory because traditional
    "default" locations such as the Instant Client ``network/admin/``
    subdirectory, ``$ORACLE_HOME/network/admin/``, or
    ``$ORACLE_BASE/homes/XYZ/network/admin/`` (in a read-only Oracle Database
    home) are not automatically looked in.

**For node-oracledb Thick mode**

In node-oracledb Thick mode, the directory containing the optional files can be
explicitly specified or a default location will be used.  Do one of:

- Set the :ref:`configDir <odbinitoracleclientattrsopts>` attribute to the
  directory containing the files when :ref:`enabling Thick mode
  <oracleclientloadinglinux>` with :meth:`~oracledb.initOracleClient()`:

  .. code-block:: javascript

      const oracledb = require('oracledb');
      oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});

  On Windows, if you use backslashes in the ``configDir`` string, you will need
  to double them.

- If :meth:`~oracledb.initOracleClient()` is called to enable Thick mode but
  :ref:`configDir <odbinitoracleclientattrsopts>` is not specified, then default
  directories are searched. They include:

  - The directory specified by the `TNS_ADMIN
    <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
    &id=GUID-12C94B15-2CE1-4B98-9D0C-8226A9DDF4CB>`__ environment variable.

  - For Oracle Instant Client ZIP files, the ``network/admin`` subdirectory of
    Instant Client, for example
    ``/opt/oracle/instantclient_23_5/network/admin``.

  - For Oracle Instant Client RPMs, the ``network/admin`` subdirectory of
    Instant Client, for example
    ``/usr/lib/oracle/23.5/client64/lib/network/admin``.

  - When using libraries from a local Oracle Database or full client
    installation, in ``$ORACLE_HOME/network/admin`` or
    ``$ORACLE_BASE_HOME/network/admin``.

.. _environmentvariables:

Oracle Environment Variables for node-oracledb
==============================================

Some common environment variables that influence node-oracledb are shown
below. The variables that may be needed depend on how Node.js is installed,
how you connect to the database, and what optional settings are desired. It is
recommended to set Oracle variables in the environment before invoking
Node.js, however they may also be set in application code as long as they are
set before node-oracledb is first used. System environment variables like
``LD_LIBRARY_PATH`` must be set before Node.js starts.

.. list-table-with-summary:: Common Oracle Environment Variables supported by node-oracledb
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 20 40 10
    :name: _oracle_environment_variables
    :summary: The first column displays the common Oracle Environment Variable. The second column, Purpose, describes what the environment variable is used for. The third column displays whether the environment variable can be used in node-oracledb Thin mode, Thick mode, or both modes.

    * - Oracle Environment Variables
      - Purpose
      - Node-oracledb Mode
    * - ``LD_LIBRARY_PATH``
      - The library search path for Linux and some UNIX platforms. Set this to the directory containing the Oracle Client libraries, for example ``/opt/oracle/instantclient_23_5`` or ``$ORACLE_HOME/lib``. The variable needs to be set in the environment before Node.js is invoked. The variable is not needed if the libraries are located by an alternative method, such as from running ``ldconfig``. On some UNIX platforms, an OS specific equivalent such as ``LIBPATH`` or ``SHLIB_PATH`` is used instead of ``LD_LIBRARY_PATH``.
      - Thick
    * - ``NLS_DATE_FORMAT``, ``NLS_TIMESTAMP_FORMAT``
      - See :ref:`Fetching Numbers and Dates as String <fetchasstringhandling>`. The variables are ignored if ``NLS_LANG`` is not set.
      - Thick
    * - ``NLS_LANG``
      - Determines the ‘national language support’ globalization options for node-oracledb. If not set, a default value will be chosen by Oracle.
        Note that node-oracledb will always uses the AL32UTF8 character set. See :ref:`Globalization and National Language Support (NLS) <nls>`.
      - Thick
    * - ``NLS_NUMERIC_CHARACTERS``
      - See :ref:`Fetching Numbers and Dates as String <fetchasstringhandling>`. The variables are ignored if ``NLS_LANG`` is not set.
      - Thick
    * - ``ORA_SDTZ``
      - The default session time zone, see :ref:`Fetching Dates and Timestamps <datehandling>`.
      - Both
    * - ``ORA_TZFILE``
      - The name of the Oracle time zone file to use. See :ref:`oratzfile`.
      - Thick
    * - ``ORACLE_HOME``
      - The directory containing the Oracle Database software. This directory must be accessible by the Node.js process. This variable should *not* be set if node-oracledb uses Oracle Instant Client.
      - Thick
    * - ``PATH``
      - The library search path for Windows should include the location where ``OCI.DLL`` is found. Not needed if you pass :ref:`libDir <odbinitoracleclientattrsopts>` when calling :meth:`oracledb.initOracleClient()`.
      - Thick
    * - ``TNS_ADMIN``
      - The location of the optional :ref:`Oracle Net configuration files <tnsadmin>` and :ref:`Oracle Client configuration files <oraaccess>`, including ``tnsnames.ora``, ``sqlnet.ora``, and ``oraaccess.xml``, if they are not in a default location. The :ref:`configDir <odbinitoracleclientattrsopts>` value in a call to :meth:`oracledb.initOracleClient()` overrides ``TNS_ADMIN``.
      - Both

Scripts for Setting the Default Environment in a Database Installation
----------------------------------------------------------------------

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

.. note::

    The ``ORACLE_HOME`` and ``LD_LIBRARY_PATH`` environment variables are only
    used in node-oracledb Thick mode.

.. _otherinit:

Other node-oracledb Thick Mode Initialization
=============================================

The :meth:`oracledb.initOracleClient()` function allows
:ref:`driverName <odbinitoracleclientattrsopts>` and
:ref:`errorUrl <odbinitoracleclientattrsopts>` attributes to be set.
These are useful for applications whose end-users are not aware
node-oracledb is being used. An example of setting the attributes is:

.. code-block:: javascript

    const oracledb = require('oracledb');
    oracledb.initOracleClient({
        driverName: 'My Great App : 3.1.4'
        errorUrl: 'https://example.com/MyInstallInstructions.html',
    });

The ``driverName`` value will be shown in Oracle Database views like
``V$SESSION_CONNECT_INFO``. The convention for ``driverName`` is to
separate the product name from the product version by a colon and single
space characters. If this attribute is not specified, then the value
“node-oracledb thk : *version*” is used, see :ref:`vsessconinfo`.

The ``errorUrl`` string will be shown in the exception raised if
:meth:`~oracledb.initOracleClient()` cannot load Oracle Client libraries.
This allows applications that use node-oracledb in Thick mode to refer users
to application-specific installation instructions. If this attribute is not
set, then the :ref:`node-oracledb installation instructions <installation>`
are used.
