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
mode, the data fetched from and sent to Oracle Database will be mapped between the
`database character set <https://www.oracle.com/pls/topic/lookup?ctx=dbla
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

- AL16UTF16 is supported by both the node-oracledb Thin and Thick modes
- UTF8 is not supported by the node-oracledb Thin mode

To find the database's national character set, execute the query:

.. code-block:: sql

    SELECT value AS db_ncharset
    FROM nls_database_parameters
    WHERE parameter = 'NLS_NCHAR_CHARACTERSET'

Setting the Client Character Set
--------------------------------

In node-oracledb, the encoding used for all character data is "UTF-8".

Setting the Client Locale
=========================

Thick Mode Oracle Database National Language Support (NLS)
----------------------------------------------------------

The node-oracledb Thick mode uses Oracle Database's National Language Support
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

    All NLS environment variables are ignored by the node-oracledb Thin mode.
    Also, the ``ORA_TZFILE`` variable is ignored.

In the node-oracledb Thin mode, fetch type handlers can be used to
perform number localization. Fetch type handlers like the one used in the
example below can also be used in node-oracledb Thick mode.

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

    All NLS environment variables are ignored by the node-oracledb Thin mode.
    including the ``ORA_TZFILE`` variable.

In the node-oracledb Thin mode, fetch type handlers can be used to
perform date localization. Fetch type handlers like the one used in the
example below can also be used in node-oracledb Thick mode.

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
