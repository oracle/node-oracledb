.. _startupshutdown:

*************************************
Starting and Stopping Oracle Database
*************************************

There are two groups of database start up and shut down functions:

- Simple usage: :meth:`oracledb.startup()` and :meth:`oracledb.shutdown()`

- Flexible usage: :meth:`connection.startup()` and
  :meth:`connection.shutdown()`

These can be used to control database instances. With the `Oracle
Database Multitenant architecture <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-AB84D6C9-4BBE-4D36-992F-2BB85739329F>`__,
you use these functions on a “CDB” container database instance and then
use SQL commands to control the pluggable “PDB” databases.

.. note::

    In this release, database start up and shut down functionality is only
    supported in node-oracledb Thick mode. See :ref:`enablingthick`.

.. _startupshutdownsimple:

Simple Database Start Up and Shut Down
======================================

The simple methods accept database credentials and perform the requested
start up or shut down. Internally a standalone connection with privilege
:ref:`oracledb.SYSOPER <oracledbconstantsprivilege>` is created, used,
and then closed. The methods require appropriate connection attributes,
which will vary depending with your database access rights, and if you
are connecting over TCP or to a local database. A username, password,
connection string and mode to specify external authentication can be
used.

Simple Start Up
---------------

The simple :meth:`oracledb.startup()` method to start up a
local database instance, when your operating system user is in the
operating system’s ``oper`` group, is:

.. code-block:: javascript

    await oracledb.startup( {
        externalAuth: true
    });

Start up :ref:`options <odbstartupattrsoptions>` can be specified. You
can use a database parameter `pfile <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-8BAD86FC-27C5-4103-8151-AC5BADF274E3>`__,
or indicate that database access should be restricted after start up, or
force the database instance to be shut down before restarting it. For
example:

.. code-block:: javascript

    await oracledb.startup( {
        externalAuth: true
        },
        {
            force: true,
            restrict: true
            pfile: '/my/path/to/my/pfile.ora'
        }
    );

By default when the options are not specified, the database is opened
normally, and uses the database parameter file.

To start up a remote database, configure the Oracle Net listener to use
`static service registration <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-0203C8FA-A4BE-44A5-9A25-3D1E578E879F>`__
by adding a ``SID_LIST_LISTENER`` entry to the database ``listener.ora``
file. Starting the database in node-oracledb would then be like:

.. code-block:: javascript

    await oracledb.startup( {
        user: 'sys',
        password: syspw,
        connectString: 'mymachine.example.com/orclcdb'
    });

Simple Shut Down
----------------

The simple :meth:`oracledb.shutdown()` method to shut down a remote database
is:

.. code-block:: javascript

    const syspw = ...  // set syspw to the sys schema password

    await oracledb.shutdown( {
        user: "sys",
        password: syspw,
        connectString: "mymachine.example.com/orclcdb"
    });

An optional, :ref:`shutdownMode <odbshutdownattrsmode>` can be passed,
for example to terminate uncommitted transactions and roll back:

.. code-block:: javascript

    await oracledb.shutdown( {
        user: "sys",
        password: syspw,
        connectString: "mymachine.example.com/orclpdb1"
        },
        oracledb.SHUTDOWN_MODE_IMMEDIATE
    );

The shut down mode should be one of the constants:
:ref:`oracledb.SHUTDOWN_MODE_ABORT <oracledbconstantsshutdown>`,
:ref:`oracledb.SHUTDOWN_MODE_DEFAULT <oracledbconstantsshutdown>`,
:ref:`oracledb.SHUTDOWN_MODE_IMMEDIATE <oracledbconstantsshutdown>`,
:ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL <oracledbconstantsshutdown>`,
or
:ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL <oracledbconstantsshutdown>`.
If a mode is not specified, ``oracledb.SHUTDOWN_MODE_DEFAULT`` is used.

.. _startupshutdownflexible:

Flexible Database Start Up and Shut Down
========================================

The ‘flexible’ functions for starting and stopping databases allow you
more control over connection access, for example you can use the
``oracledb.SYSDBA`` privilege instead of ``oracledb.SYSOPER``. The
functions also let you, for example, do database recovery as part of the
database start up.

Flexible Start Up
-----------------

A :meth:`connection.startup()` example that is equivalent
to the first ‘simple’ start up example above is:

.. code-block:: javascript

    connection = await oracledb.getConnection( {
        externalAuth: true
        privilege: oracledb.SYSOPER | oracledb.SYSPRELIM
    });

    await connection.startup();  // options could be passed, if required

    await connection.close();

    connection = await oracledb.getConnection( {
        externalAuth: true
        privilege: oracledb.SYSOPER
    });

    await connection.execute(`ALTER DATABASE MOUNT`);
    await connection.execute(`ALTER DATABASE OPEN`);

    await connection.close();

The ``SYSPRELIM`` privilege is required for the first connection. The
:meth:`connection.startup()` method lets you optionally
specify a database parameter ‘pfile’, or indicate the database access
should be restricted after start up, or force the database instance to
be shut down before restarting it.

After calling ``connection.startup()``, you can use your choice of SQL
statements, for example to perform database recovery.

Flexible Shut Down
------------------

The flexible :meth:`connection.shutdown()` example
equivalent to the first ‘simple’ shut down example above is:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "sys",
        password: syspw,
        connectString: "mymachine.example.com/orclcdb",
        privilege: oracledb.SYSOPER
    });

    await connection.shutdown();  // a shut down mode can be specified, if required

    await connection.execute (`ALTER DATABASE CLOSE NORMAL`);
    await connection.execute (`ALTER DATABASE DISMOUNT`);

    await connection.shutdown(oracledb.SHUTDOWN_MODE_FINAL);

    connection.close();

If the ``connection.shutdown()`` :ref:`shutdownMode <conshutdownmode>`
``oracledb.SHUTDOWN_MODE_ABORT`` is used, then ``connection.shutdown()``
does not need to be called a second time.

.. _startupshutdownpdb:

Oracle Multitenant Pluggable and Container Databases
====================================================

You can use the ``startup()`` and ``shutdown()`` methods on Oracle
Multitenant `container database <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-AB84D6C9-4BBE-4D36-992F-2BB85739329F>`__
instances.

Once a CDB is running, you can connect as a privileged user and execute
SQL ``ALTER PLUGGABLE`` commands to start or stop PDBs. Similar commands
can also be run if you connect directly to a PDB.

For example, when connected to a CDB, you can open the pluggable
database in it called ‘orclpdb1’ with:

.. code-block:: sql

    ALTER PLUGGABLE DATABASE orclpdb1 OPEN

or, to open all PDBs:

.. code-block:: sql

    ALTER PLUGGABLE DATABASE ALL OPEN

The command:

.. code-block:: sql

    ALTER PLUGGABLE DATABASE ALL SAVE STATE

can be used so that a subsequent restart of a CDB will automatically
open all currently open PDBs.

To close a PDB, you can use a command like
``ALTER PLUGGABLE DATABASE mypdbname CLOSE``.

Refer to the `Oracle Database Administrator’s
Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-0F711EA4
-08A8-463F-B4C6-1CE3A24274C8>`__ for more options.
