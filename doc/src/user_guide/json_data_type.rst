.. _jsondatatype:

***************
Using JSON Data
***************

Oracle Database 12.1.0.2 introduced native support for JSON data. You
can use JSON with relational database features, including transactions,
indexing, declarative querying, and views. You can project JSON data
relationally, making it available for relational processes and tools.
Also see :ref:`node-oracledb’s SODA API <sodaoverview>`, which allows
access to JSON documents through a set of NoSQL-style APIs.

For more information about using JSON in Oracle Database see the
`Database JSON Developer’s Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=ADJSN>`__.

**Oracle Database 12c JSON Data Type**

Prior to Oracle Database 21, JSON in relational tables is stored as
BLOB, CLOB or VARCHAR2 data, allowing easy access with node-oracledb.
All of these types can be used with node-oracledb in Thin or Thick mode.

The older syntax to create a table with a JSON column is like:

.. code-block:: sql

    CREATE TABLE j_purchaseorder (po_document BLOB CHECK (po_document IS JSON));

The check constraint with the clause ``IS JSON`` ensures only JSON data
is stored in that column.

The older syntax can still be used in Oracle Database 21, however the
recommendation is to move to the new JSON type. With the old syntax, the
storage can be BLOB, CLOB, or VARCHAR2. Of these, BLOB is preferred to
avoid character set conversion overheads.

**Oracle Database 21c JSON Data Type**

Oracle Database 21c introduced a dedicated JSON data type with a new
`binary storage format <https://blogs.oracle.com/database/post/
autonomous-json-database-under-the-covers-oson-format>`__
that improves performance and functionality. To use the new dedicated
JSON type, you can use node-oracledb 5.1 or later. The 21c JSON data
type can be used in both node-oracledb Thin and Thick modes. With Thick mode,
the Oracle Client libraries must be version 21, or later.

In Oracle Database 21 or later, to create a table with a column called
``PO_DOCUMENT`` for JSON data:

.. code-block:: sql

    CREATE TABLE j_purchaseorder (po_document JSON);

.. _json21ctype:

Using the Oracle Database 21c JSON Type in node-oracledb
========================================================

Using node-oracledb Thin mode with Oracle Database 21c or later, or using
node-oracledb Thick mode or node-oracledb 5.1 (or later) with Oracle Database
21c (or later) and Oracle Client 21c (or later), you can insert JavaScript
objects directly by binding as ``oracledb.DB_TYPE_JSON``:

.. code-block:: javascript

    const data = { "userId": 1, "userName": "Chris", "location": "Australia" };

    await connection.execute(
        `INSERT INTO j_purchaseorder (po_document) VALUES (:bv)`,
        { bv: {val: data, type: oracledb.DB_TYPE_JSON} }
    );

To query a JSON column, use:

.. code-block:: javascript

    const r = await conn.execute(`SELECT po_document FROM j_purchaseorder`);
    console.dir(r.rows, { depth: null });

The output is::

    [
        {
            PO_DOCUMENT: '{"userId":1,"userName":"Chris","location":"Australia"}'
        }
    ]

Using Oracle Client Libraries 19 or Earlier
-------------------------------------------

If node-oracledb uses Oracle Client Libraries 19 (or earlier), querying an
Oracle Database 21 (or later), then JSON column returns a
:ref:`Lob Class <lobclass>` BLOB. You can stream the Lob or use
:meth:`lob.getData()`:

.. code-block:: javascript

    const result = await connection.execute(`SELECT po_document FROM j_purchaseorder`);,

    const lob = result.rows[0][0];  // just show first row
    const d = await lob.getData();
    const j = JSON.parse(d);
    console.dir(j,  { depth: null });

The output is::

    { userId: 1, userName: 'Chris', location: 'Australia' }

Note ``oracledb.fetchAsBuffer`` will not automatically convert the
Oracle Database 21c JSON type to a Buffer. Using it will give
*ORA-40569: Unimplemented JSON feature.* Use ``await lob.getData()`` as
shown above.

.. _json12ctype:

Using the Oracle Database 12c JSON Type in node-oracledb
========================================================

When using Oracle Database 12c or later with JSON using BLOB storage, you can
insert JSON strings:

.. code-block:: javascript

    const data = { "userId": 1, "userName": "Chris", "location": "Australia" };
    const s = JSON.stringify(data);  // change JavaScript value to a JSON string
    const b = Buffer.from(s, 'utf8');

    const result = await connection.execute(
        `INSERT INTO j_purchaseorder (po_document) VALUES (:bv)`,
        [b]  // bind the JSON string
    );

IN Bind Type Mapping
====================

When binding a JavaScript object as ``oracledb.DB_TYPE_JSON`` for
``oracledb.BIND_IN`` or ``oracledb.BIND_INOUT`` in Oracle Database 21
(or later), JavaScript values are converted to JSON attributes as shown
in the following table. The ‘SQL Equivalent’ syntax can be used in SQL
INSERT and UPDATE statements if specific attribute types are needed but
there is no direct mapping from JavaScript.

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the JavaScript Type or Value. The second column displays the JSON Attribute Type or Value. The third column displays the SQL Equivalent Example.

    * - JavaScript Type or Value
      - JSON Attribute Type or Value
      - SQL Equivalent Example
    * - null
      - null
      - NULL
    * - undefined
      - null
      - n/a
    * - true
      - true
      - n/a
    * - false
      - false
      - n/a
    * - Number
      - NUMBER
      - ``json_scalar(1)``
    * - String
      - VARCHAR2
      - ``json_scalar('String')``
    * - Date
      - TIMESTAMP
      - ``json_scalar(to_timestamp('2020-03-10'), 'YYYY-MM-DD')``
    * - Buffer
      - RAW
      - ``json_scalar(utl_raw.cast_to_raw('A raw value'))``
    * - Array
      - Array
      - ``json_array(1, 2, 3returning json)``
    * - Object
      - Object
      - ``json_object(key 'Fred' value json_scalar(5), key 'George' value json_scalar('A string')returning json)``
    * - n/a
      - CLOB
      - ``json_scalar(to_clob('A short CLOB'))``
    * - n/a
      - BLOB
      - ``json_scalar(to_blob(utl_raw.cast_to_raw('A short BLOB')))``
    * - n/a
      - DATE
      - ``json_scalar(to__date('2020-03-10'), 'YYYY-MM-DD')``
    * - n/a
      - INTERVAL YEAR TO MONTH
      - ``json_scalar(to_yminterval('+5-9'))``
    * - n/a
      - INTERVAL DAY TO SECOND
      - ``json_scalar(to_dsinterval('P25DT8H25M'))``
    * - n/a
      - BINARY_DOUBLE
      - ``json_scalar(to_binary_double(25))``
    * - n/a
      - BINARY_FLOAT
      - ``json_scalar(to_binary_float(15.5))``


An example of creating a CLOB attribute with key ``mydocument`` in a
JSON column using SQL is:

.. code-block:: javascript

    const sql = `INSERT INTO mytab (myjsoncol)
                 VALUES (JSON_OBJECT(key 'mydocument' value JSON_SCALAR(TO_CLOB(:b)) RETURNING JSON))`;
    await connection.execute(sql, ['A short CLOB']);

When ``mytab`` is queried in node-oracledb, the CLOB data will be
returned as a JavaScript String, as shown by the following table. Output
might be like::

    { mydocument: 'A short CLOB' }

Query and OUT Bind Type Mapping
===============================

When getting Oracle Database 21 or later JSON values from the database, the
following attribute mapping occurs:

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :width: 100%
    :summary: The first column displays the JavaScript Type or Value. The second column displays the JSON Attribute Type or Value. The third column displays the SQL Equivalent Example.

    * - Database JSON Attribute Type or Value
      - Javascript Type or Value
    * - null
      - null
    * - false
      - false
    * - true
      - true
    * - NUMBER
      - Number
    * - VARCHAR2
      - String
    * - RAW
      - Buffer
    * - CLOB
      - String
    * - BLOB
      - Buffer
    * - DATE
      - Date
    * - TIMESTAMP
      - Date
    * - INTERVAL YEAR TO MONTH
      - Not supported. Will give an error.
    * - INTERVAL DAY TO SECOND
      - Not supported. Will give an error.
    * - BINARY_DOUBLE
      - Number
    * - BINARY_FLOAT
      - Number
    * - Arrays
      - Array
    * - Objects
      - A plain JavaScript Object

SQL/JSON Path Expressions
=========================

Oracle Database provides SQL access to JSON data using SQL/JSON path
expressions. A path expression selects zero or more JSON values that
match, or satisfy, it. Path expressions can use wildcards and array
ranges. A simple path expression is ``$.friends`` which is the value of
the JSON field ``friends``.

For example, the previously created ``j_purchaseorder`` table with JSON
column ``po_document`` can be queried like:

.. code-block:: sql

    SELECT po.po_document.location FROM j_purchaseorder po

With the JSON ``'{"userId":1,"userName":"Chris","location":"Australia"}'``
stored in the table, a queried value would be ``Australia``.

The ``JSON_EXISTS`` function tests for the existence of a particular
value within some JSON data. To look for JSON entries that have a
``location`` field:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT po_document FROM j_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')`
    );
    const d = result.rows[0][0];      // show only first record in this example
    console.dir(d, { depth: null });  // assumes Oracle Database and Client 21c

This query displays::

    { userId: 1, userName: 'Chris', location: 'Australia' }

The SQL/JSON functions ``JSON_VALUE`` and ``JSON_QUERY`` can also be
used.

Note that the default error-handling behavior for these functions is
NULL ON ERROR, which means that no value is returned if an error occurs.
To ensure that an error is raised, use ERROR ON ERROR.

For more information, see `SQL/JSON Path Expressions <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-2DC05D71-3D62-4A14-855F-76E054032494>`__
in the Oracle JSON Developer’s Guide.

Accessing Relational Data as JSON
=================================

In Oracle Database 12.2 or later, the `JSON_OBJECT <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-1EF347AE-7FDA-4B41-AFE0-DD5A49E8B370>`__
function is a great way to convert relational table data to JSON:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT JSON_OBJECT ('deptId' IS d.department_id, 'name' IS d.department_name) department
         FROM departments d
         WHERE department_id < :did
         ORDER BY d.department_id`,
        [50]
        );

    for (const row of result.rows)
        console.log(row[0]);

This produces::

    {"deptId":10,"name":"Administration"}
    {"deptId":20,"name":"Marketing"}
    {"deptId":30,"name":"Purchasing"}
    {"deptId":40,"name":"Human Resources"}

Portable JSON
=============

Writing applications that can handle all the potential JSON storage
types and potential client-server version combinations requires code
that checks the Oracle versions and the returned column metadata. This
allows the code to do appropropriate streaming or type conversion. It
will be simpler to restrict the environment and data types supported by
the application. Where possible, migrate to the new JSON type to take
advantage of its ease of use and performance benefits.

Here is an example of code that works with multiple versions, with the
assumption that older DBs use BLOB storage.

Create a table:

.. code-block:: javascript

    if (connection.oracleServerVersion >= 2100000000) {
        await connection.execute(`CREATE TABLE mytab (mycol JSON)`);
    } else if (connection.oracleServerVersion >= 1201000200) {
        await connection.execute(`CREATE TABLE mytab (mycol BLOB CHECK (mycol IS JSON)) LOB (mycol) STORE AS (CACHE)`);
    } else {
        throw new Error('This application only works with Oracle Database 12.1.0.2 or greater');
    }

Insert data:

.. code-block:: javascript

    const inssql = `INSERT INTO mytab (mycol) VALUES (:bv)`;
    const data = { "userId": 2, "userName": "Anna", "location": "New Zealand" };

    if (oracledb.oracleClientVersion >= 2100000000 && connection.oracleServerVersion >= 2100000000 ) {
        await connection.execute(inssql, { bv: { val: data, type: oracledb.DB_TYPE_JSON } });
    } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await connection.execute(inssql, { bv: { val: b } });
    }

Query data:

.. code-block:: javascript

    const qrysql = `SELECT mycol
                    FROM mytab
                    WHERE JSON_EXISTS (mycol, '$.location')
                    OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`;

    result = await connection.execute(qrysql, [], { outFormat: oracledb.OUT_FORMAT_ARRAY });
    if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0][0];
    } else {
        const d = await result.rows[0][0].getData();
        j = await JSON.parse(d);
    }

    console.dir(j, { depth: null });
