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

.. _json21ctype:

Using the Oracle Database 21c JSON Type in node-oracledb
========================================================

Oracle Database 21c introduced a dedicated JSON data type with a new
`binary storage format <https://blogs.oracle.com/database/post/
autonomous-json-database-under-the-covers-oson-format>`__
that improves performance and functionality. To take advantage of the new
dedicated JSON type in Oracle Database 21c and later versions, use
node-oracledb 5.1 or later. For Thick mode, you must additionally use
Oracle Client 21c (or later).

In Oracle Database 21c or later, to create a table with a column called
``PO_DOCUMENT`` for JSON data:

.. code-block:: sql

    CREATE TABLE j_purchaseorder (po_document JSON);

**Inserting JSON Data**

To insert JavaScript objects directly by binding as ``oracledb.DB_TYPE_JSON``:

.. code-block:: javascript

    const data = { "userId": 1, "userName": "Chris", "location": "Australia" };

    await connection.execute(
        `INSERT INTO j_purchaseorder (po_document) VALUES (:bv)`,
        { bv: {val: data, type: oracledb.DB_TYPE_JSON} }
    );

.. _json21fetch:

**Fetching JSON Data**

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

Using Oracle Client Libraries 19c or Earlier
--------------------------------------------

If node-oracledb Thick mode uses Oracle Client Libraries 19c (or earlier),
querying an Oracle Database 21c (or later), then JSON column returns a
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

In Oracle Database versions 12c or later (prior to Oracle Database 21c), JSON
in relational tables is stored as BLOB, CLOB, or VARCHAR2 data. All of these
types can be used with node-oracledb in Thin or Thick mode.

The older syntax to create a table with a JSON column is like:

.. code-block:: sql

    CREATE TABLE j_purchaseorder (po_document BLOB CHECK (po_document IS JSON));

The check constraint with the clause ``IS JSON`` ensures only JSON data
is stored in that column.

The older syntax can still be used in Oracle Database 21c. However the
recommendation is to move to the new JSON type. With the old syntax, the
storage can be BLOB, CLOB, or VARCHAR2. Of these, BLOB is preferred to
avoid character set conversion overheads.

**Inserting JSON Data**

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

**Fetching JSON Data**

With Oracle Database 12c (or later), you can fetch VARCHAR2 and LOB columns
that contain JSON data in the same way that
:ref:`JSON type columns <json21fetch>` are fetched when using Oracle
Database 21c (or later). This can be done by setting
:attr:`oracledb.future.oldJsonColumnAsObj` to the value *true* as shown below.
If you are using node-oracledb Thick mode, you must use Oracle Client 19c
(or later) for this setting to work. For example:

.. code-block:: javascript

    oracledb.future.oldJsonColumnAsObj = true;
    const r = await conn.execute(`SELECT po_document FROM j_purchaseorder`);
    console.dir(r.rows, { depth: null });

.. _osontype:

Using BLOB columns with OSON Storage Format in node-oracledb
============================================================

You can use BLOB columns with Oracle's optimized binary storage format called
`OSON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-CBEDC779-
39A3-43C9-AF38-861AE3FC0AEC>`__ if you want the fastest query and update
performance. This OSON binary encoding format can be used with BLOB columns in
both node-oracledb Thin or Thick modes. For Release 19c, BLOB with format OSON
is supported only for Oracle Autonomous Databases. For Thick mode, you must
additionally use Oracle Client 21c (or later).

To specify `OSON format for BLOB columns <https://docs.oracle.com/en/database/
oracle/oracle-database/19/adjsn/overview-of-storage-and-management-of-JSON-
data.html#GUID-26AB85D2-3277-451B-BFAA-9DD45355FCC7>`__, you can use the check
constraint with the clause ``IS JSON FORMAT OSON`` when creating a table. This
check constraint ensures that only binary encoded OSON data is stored in that
column. For example, to create a table with a BLOB column containing OSON
data:

.. code-block:: sql

    CREATE TABLE my_table (oson_col BLOB CHECK (oson_col IS JSON FORMAT OSON));

**Inserting into BLOB columns with OSON Data**

To encode the Javascript value into OSON bytes, you can use the
:meth:`connection.encodeOSON()` method. For example:

.. code-block:: javascript

    const data = {key1: "val1"};
    // Generate OSON bytes
    const osonBytes = connection.encodeOSON(data);
    console.log(osonBytes);

This method returns a Buffer and prints an output such as::

    <Buffer ff 4a 5a 01 21 02 01 00 05 00 0d 00 00 fa 00 00 04 6b 65 79 32 a4 01 01 00 00 00 07 33 04 76 61 6c 32>

To insert the OSON bytes into the table, you can use:

.. code-block:: javascript

    // Insert the OSON bytes
    const result = await connection.execute(
      `INSERT INTO my_table (oson_col) VALUES (:1)`,
      [osonBytes]
    );

**Fetching BLOB Columns with OSON Data**

You can fetch BLOB columns which have the ``IS JSON FORMAT OSON`` check
constraint enabled in the same way :ref:`JSON type columns <json21fetch>`
are fetched when using Oracle Database 21c (or later). This can be done by
setting :attr:`oracledb.future.oldJsonColumnAsObj` to the value *true* as
shown below. If you are using node-oracledb Thick mode, you must use Oracle
Client 21c (or later) for this setting to work. For example:

.. code-block:: javascript

    oracledb.future.oldJsonColumnAsObj = true;
    const result = await connection.execute(`SELECT oson_col FROM my_table`);
    console.log(result.rows[0][0]);

This prints an output such as::

    {key1: "val1"}

If you do not set the :attr:`oracledb.future.oldJsonColumnAsObj` to *true*,
then you can fetch BLOB columns that contain OSON data as shown below:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT json_object ('hello' value 'world' returning blob format oson
         ) FROM dual`
    );
    const decodeOsonObj = connection.decodeOSON(result.rows[0][0]);
    console.log(decodeOsonObj);

The :meth:`connection.decodeOSON()` decodes the OSON Buffer and returns a
Javascript value. This prints an ouput such as::

    { hello: 'world' }

IN Bind Type Mapping
====================

When binding a JavaScript object as ``oracledb.DB_TYPE_JSON`` for
``oracledb.BIND_IN`` or ``oracledb.BIND_INOUT`` in Oracle Database 21c
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

When getting Oracle Database 21c or later JSON values from the database, the
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

.. _jsondualityviews:

JSON-Relational Duality Views
=============================

Oracle Database version 23 JSON-Relational Duality Views allow data to be
stored as rows in tables to provide the benefits of the relational model and
SQL access, while also allowing read and write access to data as JSON
documents for application simplicity. See the `JSON-Relational Duality
Developer's Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
JSNVU>`__ for more information.

For example, if the tables ``authorTable`` and ``bookTable`` exist::

    CREATE TABLE authorTable (
        authorId NUMBER GENERATED BY DEFAULT ON NULL AS IDENTITY PRIMARY KEY,
        authorName VARCHAR2(100)
    );

    CREATE TABLE bookTable (
        bookId NUMBER GENERATED BY DEFAULT ON NULL AS IDENTITY PRIMARY KEY,
        bookTitle VARCHAR2(100),
        authorId NUMBER REFERENCES authorTable (authorId)
    );

Then a JSON Duality View over the tables can be created using SQL*Plus::

    CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW bookDV AS
    bookTable @insert @update @delete
    {
        _id: bookId,
        book_title: bookTitle,
        author: authorTable @insert @update
        {
            author_id: authorId,
            author_name: authorName
        }
    };

You can insert into JSON Duality Views using SQL*Plus::

    INSERT INTO bookDV VALUES(
        '{"book_title": My Book",
          "author": {"author_name": "James"}}'
    );

Applications can choose whether to use relational access to the underlying
tables, or use the duality view.

Inserting JSON into the view will update the base relational tables:

.. code-block:: javascript

    const data = { "_id": 1000, "book_title": "My New Book",
                   "author": { "author_id": 2000, "author_name": "John Doe" }};
    await connection.execute(
        `INSERT INTO bookDV VALUES (:bv)`,
        { bv: {val: data, type: oracledb.DB_TYPE_JSON}
    );

You can use SQL/JSON to query the view and return JSON. The query uses the
special column ``DATA``:

.. code-block:: javascript

    const sql = `SELECT b.data.book_title, b.data.author.author_name FROM
                 bookDV b WHERE b.data.author.author_id = :1`;
    const binds = [1];
    const options = {
        bindDefs: [ { type: oracledb.NUMBER } ]
    };
    const result = await connection.execute(sql, binds, options);
    console.log(result.rows);

This will print the book title and author name for the author whose id is
``1``.

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
