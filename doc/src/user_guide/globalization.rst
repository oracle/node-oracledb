.. _nls:

*******************************
Character Sets and Localization
*******************************

.. _charset:

Character Sets
==============

Database Character Set
----------------------

All database characters are supported by node-oracledb. In node-oracledb Thick
mode, the data fetched from and sent to Oracle Database will be mapped between
the `database character set <https://www.oracle.com/pls/topic/lookup?ctx=dbla
test&id=GUID-EA913CC8-C5BA-4FB3-A1B8-882734AF4F43>`__ and the "Oracle client"
character set of the Oracle Client libraries used by node-oracledb which is
always AL32UTF8. In node-oracledb Thin mode, the database server does the
required conversion.

.. _findingcharset:

To find the database character set, execute the query:

.. code-block:: sql

    SELECT value AS db_charset
    FROM nls_database_parameters
    WHERE parameter = 'NLS_CHARACTERSET'

Database National Character Set
-------------------------------

For the secondary `‘national character set’ <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-AA8D783D-7337-4A61-BD7D-5DB580C46D9A>`__
used for NCHAR, NVARCHAR2, and NCLOB data types:

- AL16UTF16 is supported by both node-oracledb Thin and Thick modes
- UTF8 is not supported by node-oracledb Thin mode

To find the database's national character set, execute the query:

.. code-block:: sql

    SELECT value AS db_ncharset
    FROM nls_database_parameters
    WHERE parameter = 'NLS_NCHAR_CHARACTERSET'

Setting the Client Character Set
--------------------------------

In node-oracledb, the encoding used for all character data is AL32UTF8.

.. _oratzfile:

Time Zone Files
===============

This section is only applicable to node-oracledb Thick mode.

Oracle Client libraries and Oracle Database use time zone files for date
operations. The files are versioned, but do not always have to be the same
version on the database and client. The name of the Oracle time zone file to
use can be set in the ``ORA_TZFILE`` environment variable.

Finding the Time Zone Files in Use
----------------------------------

You can find the time zone file used by the database itself by executing the
following query:

.. code-block:: sql

    SQL> SELECT * FROM v$timezone_file;

    FILENAME                VERSION     CON_ID
    -------------------- ---------- ----------
    timezlrg_43.dat              43          0

The time zone files on the client side can be shown by running the utility
``genezi -v``.  In Instant Client, this is in the Basic and Basic Light
packages.  The output will be like::

    $ genezi -v

    . . .

    TIMEZONE INFORMATION
    --------------------
    Operating in Instant Client mode.

    Small timezone file = /opt/oracle/instantclient/oracore/zoneinfo/timezone_43.dat
    Large timezone file = /opt/oracle/instantclient/oracore/zoneinfo/timezlrg_43.dat

With Instant Client, the paths refer to a virtual file system in the Oracle
libraries. These files are not present on the OS file system.

The larger file ``timezlrg_<n>.dat`` contains all time zone information. This
is the file used by default.  The smaller ``timezone_<n>.dat`` file contains
only the most commonly used time zones. See `Time Zone Region Names <https://
www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-21D14370-A707-4482-A3FE-
9277263F292A>`__ for more information.

The filenames shows the version of the time zone files, in this example it is
version 43.

The Oracle Database documentation contains more information about time zone
files, see `Choosing a Time Zone File <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-805AB986-DE12-4FEA-AF56-5AABCD2132DF>`__.

Changing the Oracle Client Time Zone File
-----------------------------------------

You can get updated time zone files from a full Oracle Database installation,
or by downloading a patch from `Oracle Support <https://support.oracle.com/>`_.
For use with Instant Client, unzip the patch and copy the necessary files:
installing the patch itself will not work.

**Using a New Time Zone File in Instant Client**

From Oracle Instant Client 12.2, you can use an external time zone file,
allowing you to update time zone information without updating the complete
Instant Client installation. Changing the file in earlier versions of Instant
Client is not possible.

To change the time zone file, do one of the following:

- Create a subdirectory ``oracore/zoneinfo`` under the Instant Client
  directory and move the file into it.  Then set ``ORA_TZFILE`` to the file
  name, without any absolute or relative directory prefix prefix.  For
  example, if Instant Client is in ``/opt/oracle/instantclient``::

    mkdir -p /opt/oracle/instantclient/oracore/zoneinfo
    cp timezone_43.dat /opt/oracle/instantclient/oracore/zoneinfo/
    export ORA_TZFILE=timezone_43.dat

- Alternatively, from Oracle Instant Client 19.18 onwards, you can place the
  external time zone file in any directory and then set the ``ORA_TZFILE``
  environment variable to the absolute path of the file. For example::

    mkdir -p /opt/oracle/myconfig
    cp timezone_43.dat /opt/oracle/myconfig/
    export ORA_TZFILE=/opt/oracle/myconfig/timezone_43.dat

After installing a new client time zone file, run ``genezi -v`` again to check
if it is readable.

**Using the Embedded Small Time Zone File in Instant Client**

By default, Instant Client uses its larger embedded ``timezlrg_<n>.dat`` file.
If you want to use the smaller embedded ``timezone_<n>.dat`` file, then set the
``ORA_TZFILE`` environment variable to the name of the file without any
absolute or relative directory prefix. For example::

    export ORA_TZFILE=timezone_43.dat

**Using a New Time Zone File in a Full Oracle Client**

If node-oracledb Thick mode is using Oracle Client libraries from a full
Oracle Client software installation (such as installed with Oracle's GUI
installer), and you want to use a non-default time zone file, then set
``ORA_TZFILE`` to the file name with an absolute path directory prefix. For
example::

    export ORA_TZFILE=/opt/oracle/myconfig/timezone_43.dat

This also works if node-oracledb Thick mode is using libraries from an Oracle
Database installation.

Setting the Client Locale
=========================

Thick Mode Oracle Database National Language Support (NLS)
----------------------------------------------------------

Node-oracledb Thick mode uses Oracle Database's National Language Support
(NLS) functionality to assist in globalizing applications, for example to
convert numbers and dates to strings in the locale specific format.

Oracle NLS environment variables, or statements like ``ALTER SESSION``,
can be used to configure further aspects of node-oracledb data access
globalization. Examples are ``NLS_NUMERIC_CHARACTERS`` (discussed in
:ref:`Fetching Numbers <numberhandling>`), and ``NLS_DATE_FORMAT``
(discussed in :ref:`Fetching Numbers and Dates as String
<fetchasstringhandling>`). Refer to `NLS Documentation <https://www.oracle.
com/pls/topic/lookup?ctx=dblatest&id=GUID-D5C74C82-8622-46F4-8760-
0F8ABA28A816>`__ for others.

You can use the ``NLS_LANG`` environment variable to set the language and
territory used by the Oracle Client libraries. For example, on Linux you could
set::

    export NLS_LANG=JAPANESE_JAPAN

The language ("JAPANESE" in this example) specifies conventions such as the
language used for Oracle Database messages, sorting, day names, and month
names. The territory ("JAPAN") specifies conventions such as the default date,
monetary, and numeric formats. If the language is not specified, then the value
defaults to AMERICAN. If the territory is not specified, then the value is
derived from the language value. See `Choosing a Locale with the NLS_LANG
Environment Variable <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-86A29834-AE29-4BA5-8A78-E19C168B690A>`__.

If the ``NLS_LANG`` environment variable is set in the application with
``os.environ['NLS_LANG']``, it must be set before any connection pool is
created, or before any standalone connections are created.

Any client character set value in the ``NLS_LANG`` variable, for example
``JAPANESE_JAPAN.JA16SJIS``, is ignored by node-oracledb. See `Setting the
Client Character Set`_.

Other Oracle globalization variables, such as ``NLS_DATE_FORMAT`` can also be
set to change the behavior of node-oracledb Thick, see `Setting NLS Parameters
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-6475CA50-6476-4559-AD87-35D431276B20>`__.

For more information, see the `Database Globalization Support Guide
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NLSPG>`__.

.. _thinnumber:

Thin Mode Locale-aware Number Conversion
----------------------------------------

.. note::

    All NLS environment variables are ignored by node-oracledb Thin mode.
    Also, the ``ORA_TZFILE`` variable is ignored.

In node-oracledb Thin mode, fetch type handlers can be used to perform number
localization. Fetch type handlers like the one used in the example below can
also be used in node-oracledb Thick mode.

For example, to convert numbers to the German display format with '.' as the
thousands separator and ',' as the decimal separator:

.. code-block:: javascript

    function fth(metaData) {
        if (metaData.dbType === oracledb.DB_TYPE_NUMBER) {
            return {converter: formatNumber};
        }
    }

    // Converter to change numbers to a German display format
    function formatNumber(val) {
        if (val !== null) {
            val = val.toLocaleString('de-DE');
        }
        return val;
    }

This fetch type handler is called once for each column in the SELECT query.
If the column data type is numeric, the converter ``formatNumber`` will be
called in Node.js. This converter formats numbers using the German display
format. The data will be processed by the converter function before it is
returned to the application. Using it in a query:

.. code-block:: javascript

    const result = await connection.execute(
        SELECT 123456.78 FROM DUAL,
        [],
        { fetchTypeHandler: fth }
    );
    console.log(result.rows);

This query prints ``'123.456,78'`` which shows that the number was converted to
the German display format.

See `examples/typehandlernum.js <https://github.com/oracle/node-oracledb/tree/
main/examples/typehandlernum.js>`__ for a runnable example.

.. _thindate:

Thin Mode Locale-aware Date Conversion
--------------------------------------

.. note::

    All NLS environment variables are ignored by node-oracledb Thin mode
    including the ``ORA_TZFILE`` variable.

In node-oracledb Thin mode, fetch type handlers can be used to perform date
localization. Fetch type handlers like the one used in the example below can
also be used in node-oracledb Thick mode.

For example, to convert dates:

.. code-block:: javascript

    function fth(metaData) {
        if (metaData.dbType === oracledb.DB_TYPE_DATE) {
            return {converter: formatDate};
        }
    }

    // Converter to change dates to a German display format
    function formatDate(val) {
        if (val !== null) {
            val = val.toLocaleString('de-DE');
        }
        return val;
    }

This fetch type handler is called once for each column in the SELECT query.
If the column data type is date, the converter ``formatDate`` will be called
in Node.js. This converter formats dates using the German date display format.
The data will be processed by the converter function before it is returned to
the application. Using it in a query:

.. code-block:: javascript

    const result = await connection.execute(
        SELECT sysdate FROM DUAL,
        [],
        { fetchTypeHandler: fth }
    );
    console.log(result.rows);

This query prints a date like ``'4.5.2023, 13:13:21'`` which shows that the
date was converted to the German display format.

See `examples/typehandlerdate.js <https://github.com/oracle/node-oracledb/tree
/main/examples/typehandlerdate.js>`__ for a runnable example.
