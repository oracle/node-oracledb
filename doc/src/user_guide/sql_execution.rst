.. _sqlexecution:

*************
Executing SQL
*************

A single SQL or PL/SQL statement may be executed using the *Connection*
:meth:`~connection.execute()` method. :ref:`Promises <promiseoverview>`,
:ref:`Async/Await <asyncawaitoverview>` or :ref:`Callback style <callbackoverview>`
may be used.

Results may be returned in a single array, or fetched in batches with a
:ref:`ResultSet <resultsetclass>`. Queries may optionally be streamed
using the :meth:`connection.queryStream()` method.

Node-oracledb’s :meth:`~connection.execute()` and
:meth:`~connection.queryStream()` methods use :ref:`Statement
Caching <stmtcache>` to make re-execution of statements efficient.
This removes the need for a separate ‘prepare’ method to parse
statements.

Tune query performance by adjusting
:ref:`fetchArraySize <propexecfetcharraysize>` and
:ref:`prefetchRows <propexecprefetchrows>`. See :ref:`Tuning Fetch
Performance <rowfetching>`.

Connections can handle one database operation at a time. Other database
operations will block. Structure your code to avoid starting parallel
operations on a connection. For example, avoid using ``async.parallel``
or ``Promise.all()`` which call each of their items in parallel. See
:ref:`Parallelism on Each Connection <parallelism>`.

After all database calls on the connection complete, the application
should use the :meth:`connection.close()` call to release the connection.

.. _select:

SELECT Statements
=================

.. _fetchingrows:

Fetching Rows with Direct Fetches
---------------------------------

By default, queries are handled as ‘direct fetches’, meaning all results
are returned in the callback :ref:`result.rows <execrows>` property:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE department_id = :did`,
        [180],
        { maxRows: 10 }  // a maximum of 10 rows will be returned
    );

    console.log(result.rows);  // print all returned rows

Any rows beyond the :ref:`maxRows <propexecmaxrows>` limit are not
returned. If ``maxRows`` is 0 (the default), then all rows will be
returned - up to the limit by Node.js memory.

To improve database efficiency, SQL queries should use a row limiting
clause like :ref:`OFFSET / FETCH <pagingdata>` or equivalent. The
``maxRows`` property can be used to stop badly coded queries from
returning unexpectedly large numbers of rows.

Internally, rows are fetched from Oracle Database in batches to improve
performance. The internal batch size is based on the lesser of
:ref:`fetchArraySize <propexecfetcharraysize>` and ``maxRows``. Row
prefetching can also be adjusted for tuning (See :ref:`Tuning Fetch
Performance <rowfetching>`). Each internally fetched batch is
concatenated into the array eventually returned to the application.

For queries expected to return a small number of rows, reduce
:ref:`fetchArraySize <propexecfetcharraysize>` to reduce internal
memory overhead by node-oracledb.

For direct fetches, JavaScript memory can become a limitation in two
cases:

-  the absolute amount of data returned is simply too large for
   JavaScript to hold in a single array.

-  the JavaScript heap can be exceeded, or become fragmented, due to
   concatenation of the successive buffers of records fetched from the
   database. To minimize this, use ``fetchArraySize`` and
   ``prefetchRows`` values determined by tuning.

In both cases, use a :ref:`ResultSet <resultsethandling>` or :ref:`Query
Stream <streamingresults>` instead of a direct fetch.

.. _executeobj:

If you are using the ``sql`` function of the third-party `sql-template-tag
<https://www.npmjs.com/package/sql-template-tag#oracledb>`__ module, then you
can pass the object returned by this function in :meth:`connection.execute()`.
This object exposes the SQL statement and values properties to retrieve the
SQL string and bind values.

.. code-block:: javascript

    import sql from sql-template-tag;

    const id = 20;
    let options = { maxRows: 1 };
    query = sql`SELECT * FROM departments WHERE department_id = ${id}`;
    result = await connection.execute(query, options);
    console.log(result.rows);

If the object returned by the ``sql`` function contains a SQL statement with a
``RETURNING INTO`` clause, then :meth:`connection.execute()` will not work and
an error will be thrown.

.. _resultsethandling:

Fetching Rows with Result Sets
------------------------------

When the number of query rows is relatively big, or cannot be predicted,
it is recommended to use a :ref:`ResultSet <resultsetclass>`, as described
in this section, or alternatively use query streaming, as described
:ref:`later <streamingresults>`. These methods prevent query results
exceeding Node.js memory constraints. Otherwise, for queries that return
a known small number of rows, non-ResultSet queries may have less
overhead.

A ResultSet is created when the ``execute()`` option property
:ref:`resultSet <executeoptions>` is *true*. ResultSet rows can be
fetched using :meth:`~resultset.getRow()` or :meth:`~resultset.getRows()`
on the ``execute()`` callback function’s ``result.resultSet`` property.
This property can also be iterated over.

For ResultSets, the :attr:`~oracledb.maxRows` limit is ignored.
All rows can be fetched.

When all rows have been fetched, or the application does not want to
continue getting more rows, then the ResultSet should be freed using
:meth:`resultset.close()`. The ResultSet should also be explicitly closed
in the cases where no rows will be fetched from it.

REF CURSORS returned from PL/SQL blocks via
:ref:`oracledb.CURSOR <oracledbconstants>` OUT binds are also
available as ResultSets. See :ref:`REF CURSOR Bind
Parameters <refcursors>`.

The format of each row will be an array or object, depending on the
value of :attr:`~oracledb.outFormat`.

See
`resultset1.js <https://github.com/oracle/node-oracledb/tree/main/examples/resultset1.js>`__,
`resultset2.js <https://github.com/oracle/node-oracledb/tree/main/examples/resultset2.js>`__
and
`refcursor.js <https://github.com/oracle/node-oracledb/tree/main/examples/refcursor.js>`__
for full examples.

To fetch one row at a time use getRow() :

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT city, postal_code FROM locations`,
        [], // no bind variables
        {
            resultSet: true // return a ResultSet (default is false)
        }
    );

    const rs = result.resultSet;
    let row;
    let i = 1;

    while ((row = await rs.getRow())) {
        console.log("getRow(): row " + i++);
        console.log(row);
    }
    // always close the ResultSet
    await rs.close();

To fetch multiple rows at a time, use ``getRows()``:

.. code-block:: javascript

    const numRows = 10;

    const result = await connection.execute(
        `SELECT employee_id, last_name
        FROM   employees
        ORDER BY employee_id`,
        [], // no bind variables
        {
            resultSet: true // return a ResultSet (default is false)
        }
    );

    // Fetch rows from the ResultSet.

    const rs = result.resultSet;
    let rows;

    do {
        rows = await rs.getRows(numRows); // get numRows rows at a time
        if (rows.length > 0) {
            console.log("getRows(): Got " + rows.length + " rows");
            console.log(rows);
        }
    } while (rows.length === numRows);

    // always close the ResultSet
    await rs.close();

From node-oracledb 5.5, you can asynchronously iterate over ResultSets:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT city, postal_code FROM locations`,
        [], // no bind variables
        {
            resultSet: true // return a ResultSet (default is false)
        }
    );

    // Fetch rows from the resultSet object using asyncIterator
    const rs = result.resultSet;

    // Call the asyncIterator for the resultSet object
    for await (const row of rs) {
        console.log(row);
    }

    // always close the ResultSet
    await rs.close();

See `resultset3.js <https://github.com/oracle/node-oracledb/tree/main/
examples/resultset3.js>`__ for a runnable example.

.. _streamingresults:

Query Streaming
---------------

Streaming of query results allows data to be piped to other streams, for
example when dealing with HTTP responses.

Use :meth:`connection.queryStream()` to create a stream
from a top level query and listen for events. You can also call
:meth:`~connection.execute()` and use
:meth:`resultset.toQueryStream()` to return a stream from the
returned :ref:`ResultSet <resultsetclass>`, from an OUT bind REF CURSOR
ResultSet, or from :ref:`Implicit Results <implicitresults>` ResultSets.

With streaming, each row is returned as a ``data`` event. Query metadata
is available via a ``metadata`` event. The ``end`` event indicates the
end of the query results. After the ``end`` event has been received, the
Stream
`destroy() <https://nodejs.org/api/stream.html#stream_readable_destroy_error>`__
function should be called to clean up resources properly. Any further
end-of-fetch logic, in particular the connection release, should be in
the ``close`` event.

Query results should be fetched to completion to avoid resource leaks,
or the Stream
`destroy() <https://nodejs.org/api/stream.html#stream_readable_destroy_error>`__
function can be used to terminate a stream early. When fetching, the
connection must remain open until the stream is completely read and the
``close`` event received. Any returned :ref:`Lob <lobclass>` objects
should also be processed first.

The query stream implementation is a wrapper over the :ref:`ResultSet
Class <resultsetclass>`. In particular, successive calls to
:meth:`resultset.getRow()` are made internally. Each row will generate a
``data`` event. For tuning, adjust the values of the
``connection.querystream()`` options
:ref:`fetchArraySize <propexecfetcharraysize>` and
:ref:`prefetchRows <propexecprefetchrows>`. See :ref:`Tuning Fetch
Performance <rowfetching>`.

An example of streaming query results is:

.. code-block:: javascript

    const stream = connection.queryStream(`SELECT employees_name FROM employees`);

    stream.on('error', function (error) {
        // handle any error...
    });

    stream.on('data', function (data) {
        // handle data row...
    });

    stream.on('end', function () {
        // all data has been fetched...
        stream.destroy();  // the stream should be closed when it has been finished
    });

    stream.on('close', function () {
        // can now close connection...  (Note: do not close connections on 'end')
    });

    stream.on('metadata', function (metadata) {
        // access metadata of query
    });

    // listen to any other standard stream events...

See `selectstream.js <https://github.com/oracle/node-oracledb/tree/main/
examples/selectstream.js>`__ for a runnable example using
``connection.queryStream()``.

The :ref:`REF CURSOR Bind Parameters <refcursors>` section shows using
``toQueryStream()`` to return a stream for a REF CURSOR.

.. _queryoutputformats:

Query Output Formats
--------------------

Query rows may be returned as an array of column values, or as
JavaScript objects, depending on the values of
:attr:`~oracledb.outFormat`.

The default format for each row is an array of column values. For
example:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE manager_id < :id`,
        [110]  // bind value for :id
    );

    console.log(result.rows);

If run with Oracle’s sample HR schema, the output is::

    [ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]

Using this format is recommended for efficiency.

Alternatively, rows may be fetched as JavaScript objects. To do so,
specify the ``outFormat`` option to be ``oracledb.OUT_FORMAT_OBJECT``:

.. code-block:: javascript

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

The value can also be set as an ``execute()`` option:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE manager_id < :id`,
        [110],  // bind value for :id
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(result.rows);

The output is::

    [   { DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT' },
        { DEPARTMENT_ID: 90, DEPARTMENT_NAME: 'Executive' },
        { DEPARTMENT_ID: 100, DEPARTMENT_NAME: 'Finance' } ]

In the preceding example, each row is a JavaScript object that specifies
column names and their respective values. Note the property names follow
Oracle’s standard name-casing rules. They will commonly be uppercase,
since most applications create tables using unquoted, case-insensitive
names.

Prior to node-oracledb 4.0, the constants ``oracledb.ARRAY`` and
``oracledb.OBJECT`` were used. These are now deprecated.

.. _nestedcursors:

Fetching Nested Cursors
-----------------------

Support for queries containing `cursor
expressions <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-B28362BE-8831-4687-89CF-9F77DB3698D2>`__
that return nested cursors was added in node-oracledb 5.0.

Each nested cursor in query results is returned as a sub-array of rows
in :ref:`result.rows <execrows>`. For example with:

.. code-block:: javascript

    const sql = `SELECT department_name,
                CURSOR(SELECT salary, commission_pct
                FROM employees e
                WHERE e.department_id = d.department_id
                ORDER BY salary) as nc
                FROM departments d
                ORDER BY department_name`;

    const result = await connection.execute(sql);
    console.dir(result.rows, {depth: null});

Output will be::

    [
        [ 'Accounting', [ [ 8300, null ], [ 12008, null ] ] ],
        [ 'Administration', [ [ 4400, null ] ] ],
        [ 'Benefits', [] ],
        [ 'Construction', [] ],
        [ 'Contracting', [] ],
        [ 'Control And Credit', [] ],
        [ 'Corporate Tax', [] ],
        [
            'Executive',
            [ [ 17000, null ], [ 17000, null ], [ 24000, null ] ]
        ],
        [
            'Finance',
            [
                [ 6900, null ],
                [ 7700, null ],
                [ 7800, null ],
                [ 8200, null ],
                [ 9000, null ],
                [ 12008, null ]
            ]
        ],
    . . .

If :attr:`oracledb.outFormat` is ``oracledb.OUT_FORMAT_OBJECT``, then each
row in the sub-array is an object, for example with:

.. code-block:: javascript

    result = await connection.execute(sql, [], {outFormat: oracledb.OUT_FORMAT_OBJECT});

Output will be::

    [
        {
            DEPARTMENT_NAME: 'Accounting',
            NC: [
                { SALARY: 8300, COMMISSION_PCT: null },
                { SALARY: 12008, COMMISSION_PCT: null }
            ]
        },
        {
            DEPARTMENT_NAME: 'Administration',
            NC: [ { SALARY: 4400, COMMISSION_PCT: null } ]
        },
    . . .

The values of :attr:`oracledb.maxRows`, and
:attr:`oracledb.fetchArraySize` used when
executing the top-level query also apply to each nested cursor that is
fetched. The :attr:`oracledb.fetchAsBuffer` and
:attr:`oracledb.fetchAsString` values are also
used.

The total number of cursors open is constrained by the `OPEN_CURSORS
initialization
parameter <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FAFD1247-06E5-4E64-917F-AEBD4703CF40>`__
of the database. With the query above, where each row contains a single
nested cursor, and when :attr:`~oracledb.fetchArraySize`
is 100 (the default), then 101 cursors will be open at a time. One
cursor is required for the top level query and one cursor is required
for each of the 100 rows internally fetched at a time.

If the ``connection.execute()`` option
:ref:`resultSet <propexecresultset>` is set to *true*, or when using
:meth:`connection.queryStream()`, then each nested cursor
in a fetched row is returned as a :ref:`ResultSet <resultsetclass>`
object. You can recursively call :meth:`resultSet.getRow()`,
:meth:`resultSet.getRows()`, or
:meth:`resultSet.toQueryStream()` on the ResultSet to
fetch each nested cursor’s data.

For example:

.. code-block:: javascript

    async function traverseResults(resultSet) {
        const fetchedRows = [];
        while (true) {
            const row = await resultSet.getRow();
            if (!row)
                break;
            for (let i = 0; i < row.length; i++) {
                if (row[i] instanceof oracledb.ResultSet) {
                    const rs = row[i];
                    row[i] = await traverseResults(rs); // replace a cursor with its expansion
                    await rs.close();
                }
            }
            fetchedRows.push(row);
        }
        return fetchedRows;
    }

    const sql = `SELECT department_name,
                CURSOR(SELECT salary, commission_pct
                FROM employees e
                WHERE e.department_id = d.department_id
                ORDER BY salary) as nc
                FROM departments d
                ORDER BY department_name`;

    const result = await connection.execute(sql, [], { resultSet: true });

    const rows = await traverseResults(result.resultSet);
    await result.resultSet.close();

    console.dir(rows, {depth: null});

Output is the same as the previous non-resultSet example.

Each ResultSet should be closed when it is no longer needed.

Warning: You should not concurrently fetch data from nested cursors, for
example with ``Promise.all()``, in different data rows because this may
give inconsistent results.

.. _querymeta:

Query Column Metadata
---------------------

The column names of a query are returned in the ``execute()`` callback’s
:ref:`result.metaData <execmetadata>` attribute.

When using a :ref:`ResultSet <resultsetclass>`, metadata is also available
in :attr:`resultset.metaData`. For queries using
:meth:`~connection.queryStream()`, metadata is available via the
``metadata`` event.

The metadata is an array of objects, one per column. By default each
object has the ``name``, ``fetchType``, ``dbType``, ``dbTypeName``,
``nullable``, ``precision``, and ``scale`` attributes. Description of these
properties is given in the :ref:`result.metaData <execmetadata>` description.

Also, see :meth:`connection.getStatementInfo()`.

For example:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE manager_id < :id`,
        [110]  // bind value for :id
    );

    console.dir(result.metaData, { depth: null });  // show the metadata

The output is::

    [
        {
            name: 'DEPARTMENT_ID',
            fetchType: 2010,
            dbType: 2010,
            dbTypeName: 'NUMBER',
            nullable: false,
            precision: 4,
            scale: 0
        },
        {
            name: 'DEPARTMENT_NAME',
            fetchType: 2001,
            dbType: 2001,
            dbTypeName: 'VARCHAR2',
            nullable: false,
            byteSize: 30
        }
    ]

The names are in uppercase. This is the default casing behavior for
Oracle Client programs when a database table is created with unquoted,
case-insensitive column names. You can use a
:ref:`fetch type handler <columncase>` to change the column names to
lowercase.

The :attr:`oracledb.extendedMetadata` property and the
:meth:`connection.execute()` option
:ref:`extendedMetaData <propexecextendedmetadata>` are desupported. Extended
metadata is now always returned.

.. _changefetcheddata:

Changing Fetched Data
---------------------

You may need to change the default conversion from an Oracle Database type
to a Node.js type in order to prevent data loss or to fit the purpose of your
Node.js application. Data returned by node-oracledb queries can be changed by
using the :ref:`fetchAsString and fetchAsBuffer <fetchppties>` properties, by
using :ref:`fetch type handlers <fetchtypehandler>`, or by using
:ref:`"converters" <converterfunc>`.

.. _fetchppties:

Using :attr:`~oracledb.fetchAsString` or :attr:`~oracledb.fetchAsBuffer` Properties
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

The global :attr:`~oracledb.fetchAsString`and :attr:`~oracledb.fetchAsBuffer`
properties are convenience settings which can be used by an application for
common data type conversions.

The :attr:`~oracledb.fetchAsString` property can be used by an application to
force the queried column data to be returned as Strings instead of the default
type such as number, date, or CLOB. See :ref:`fetchasstringhandling` for an
example.

The :attr:`~oracledb.fetchAsBuffer` property can be used to force the queried
column data to be returned as Buffers instead of the default
:ref:`Lob <lobclass>` instance. See :ref:`fetching every BLOB as a buffer
<fetchasbuffereg>` for an example.

.. _fetchtypehandler:

Using Fetch Type Handlers
+++++++++++++++++++++++++

Other than common data type conversions using the global ``fetchAsString`` and
``fetchAsBuffer`` settings, you may need more flexibility to modify the
fetched column data. In such cases, a fetch type handler introduced in
node-oracledb 6.0 can be specified for queries. The fetch type handler
asks the database to perform a conversion of the column data type to the
desired data type before the data is returned from the database to
node-oracledb. If the database does not support the conversion of data types,
an error will be returned. Also, fetch type handlers allow you to change
column names, for example, to lowercase.
The fetch type handler functionality replaces the deprecated
:ref:`fetchInfo <propexecfetchinfo>` property.

For BLOB, CLOB, NCLOB, and JSON data types, the data type conversion is
performed on the database. For all other data types, the node-oracledb Thick
mode uses :ref:`National Language Support (NLS) <nls>` conversion routines to
perform the data type conversion. The node-oracledb Thin mode uses
JavaScript functionality such as ``toString()``. To modify the default
conversion behavior, you can use a :ref:`converter function <converterfunc>`.

A fetch type handler can be specified in the :attr:`oracledb.fetchTypeHandler`
attribute or as an :ref:`option <propexecfetchtypehandler>` in
:meth:`connection.execute()`. The
:ref:`fetchTypeHandler option <propexecfetchtypehandler>` specified
in the ``connection.execute()`` overrides the value of
:attr:`oracledb.fetchTypeHandler`.

The fetch type handler is expected to be a function with two object
arguments. The first object argument contains the ``annotations``,
``byteSize``, ``dbType``, ``dbTypeName``, ``dbTypeClass``, ``domainName``,
``domainSchema``, ``isJson``, ``name``, ``nullable``, ``precision``, and
``scale`` attributes. See :attr:`oracledb.fetchTypeHandler` for more
information on these attributes. The second object argument contains the
:ref:`metadata <execmetada>` list of all the result columns fetched using the
SELECT statement.

The function is called once for each column that is going to be fetched. The
function is expected to return either nothing or an object containing:

- The ``type`` attribute
- Or the :ref:`converter <converterfunc>` attribute
- Or both the ``type`` and ``converter`` attributes

The ``type`` attribute is the requested database type and it is one of the
:ref:`oracledbconstantsdbtype`. The conversion is performed from the
``dbType`` value in the metadata found in the database to this requested
type.

For example, to tell the database to return numbers as strings:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT name, salary FROM employees WHERE employee_id = :id`,
        [178],
        {
            fetchTypeHandler: function(metaData, rowsetMetaData) {
                // Tells the database to return number as strings
                if (metaData.dbType == oracledb.DB_TYPE_NUMBER) {
                    // Gets the metadata of the name column
                    const nameColumn = rowsetMetaData.find(col => col.name === 'NAME');
                    console.log("MetaData of the NAME column:", nameColumn);
                    return {type: oracledb.STRING}
                }
            }
        }
    );

    console.log("Result as an array of JSON values (String):", result.rows);

This prints the following output::

    MetaData of the NAME column: {
      name: 'NAME',
      dbType: [DbType DB_TYPE_VARCHAR],
      nullable: true,
      isJson: false,
      isOson: false,
      byteSize: 20,
      dbTypeName: 'VARCHAR2',
      fetchType: [DbType DB_TYPE_VARCHAR]
    }
    Result as an array of JSON values (String): { NAME: 'Donald', SALARY: '7000' }

The fetch type handler defined in the example is called once for the name and
salary columns in the SELECT query. The database will return the metadata of
the name and salary columns, and a string representation of the row's value as
an array of JSON values. In the above example, the metadata of name column is
accessed when the fetch type handler is called for a number column. Note that
the query prints the salary column value as ``'7000'`` which is a string, not
a number, because of the fetch type handler conversion.

Without the fetch type handler, the output would have been the number
``7000``.

.. note::

    If the value returned by the fetch type handler function is undefined or
    no value is specified in the ``type`` attribute of the returned object,
    then the ``type`` specified in the metadata or the ``type`` defined by
    processing the :attr:`oracledb.fetchAsString` and
    :attr:`oracledb.fetchAsBuffer` properties is used.

.. _columncase:

An example of a fetch type handler that converts column names to lowercase is
shown below:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT 1 AS col1, 2 AS COL2 FROM dual`,
        [],
        {
            fetchTypeHandler: function(metaData) {
                // Tells the database to return column names in lowercase
                metaData.name = metaData.name.toLowerCase();
            }
        }
    );

    console.dir(result.rows, {depth: null});

In the output, the column names are printed in lowercase::

    [
        {
            col1: 1,
            col2: 2,
        }
    ]

See `lowercasecolumns.js <https://github.com/oracle/node-oracledb/
tree/main/examples/lowercasecolumns.js>`__ for a runnable example.

An example of using fetch type handlers for date and number localizations
is shown in :ref:`thindate` and :ref:`thinnumber`.

.. _converterfunc:

Using Fetch Type Handlers with Converters
+++++++++++++++++++++++++++++++++++++++++

Node-oracledb "converters" can be used with fetch type handlers to change the
returned data. The converter is a function which accepts the value that will be
returned by :meth:`connection.execute()` for a particular row and column
and returns the value that will actually be returned by
``connection.execute()``. The converter function runs within the
:meth:`connection.execute()` or :meth:`resultSet.getRows()` functions
and can make database calls.

For example:

.. code-block:: javascript

    oracledb.fetchTypeHandler = function(metaData) {
        if (metadata.name.endsWith("ID")) {
            const myConverter = (v) => {
                if (v !== null)
                    v = v.padStart(9, "0");
                return v;
            };
            return {type: oracledb.DB_TYPE_VARCHAR, converter: myConverter};
        }
    }

The fetch type handler is called once for each column in the SELECT query. For
each column name that ends with "ID", the database will return a string
representation of each row's value. The converter will then be called in
Node.js for each of those values. Using it in a query:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT 5 AS myid, 6 AS myvalue, 'A string' AS mystring FROM DUAL`;
    );
    console.log(result.rows)

This query prints::

    ['000000005', 6 , 'A string']

This shows that the number was first converted to a string by the database, as
requested in the fetch type handler. The converter function then added the
eight leading zeroes to the data before the value was returned to the
application.

.. note::

    If the value returned by the fetch type handler function is undefined or
    no value is specified in the converter function of the returned object, then
    no conversion takes place.

.. _typemap:

Fetching Different Data Types
-----------------------------

Oracle number, date, character, ROWID, UROWID, LONG and LONG RAW column
types are selected as Numbers, Dates, Strings, or Buffers. BLOBs and
CLOBs are selected into :ref:`Lobs <lobclass>` by default.

The default mapping for some types can be changed using
:attr:`~oracledb.fetchAsBuffer`, :attr:`~oracledb.fetchAsString`, or
:attr:`~oracledb.fetchTypeHandler`. The
:ref:`fetchTypeHandler <propexecfetchtypehandler>` property can also be
used to change the default mapping, or override a global mapping, for
individual columns.

Data types in ``SELECT`` statements that are unsupported give an error
*NJS-010: unsupported data type in select list*.

Details are in the following sections.

.. _stringhandling:

Fetching CHAR, VARCHAR2, NCHAR and NVARCHAR
+++++++++++++++++++++++++++++++++++++++++++

Columns of database type CHAR, VARCHAR2, NCHAR and NVARCHAR are returned
from queries as JavaScript strings.

.. _numberhandling:

Fetching Numbers
++++++++++++++++

By default, all numeric columns are mapped to JavaScript numbers. Node.js
uses double floating point numbers as its native number type.

Node.js can also only represent numbers up to 2 ^ 53 which is
9007199254740992. Numbers larger than this will be truncated.

The primary recommendation for number handling is to use Oracle SQL or
PL/SQL for mathematical operations, particularly for currency calculations.

When working with numbers in Node.js, the output may result in "unexpected"
representations. For example, a binary floating-point arithmetic purely in
Node.js:

.. code-block:: javascript

    console.log(0.2 + 0.7); // gives 0.8999999999999999

To reliably work with numbers in Node.js, you can use
:attr:`~oracledb.fetchAsString` or a
:ref:`fetch type handler <fetchtypehandler>` (See
:ref:`fetchasstringhandling`) to fetch numbers in string format, and then use
one of the available third-party JavaScript number libraries that handles
large values and more precision.

When decimal numbers are fetched from the database, the conversion to
JavaScript's less precise binary number format differs in node-oracledb Thin
and Thick modes. For example:

.. code-block:: javascript

    const result = await connection.execute(`SELECT 38.73 FROM dual`);
    console.log(result.rows[0]);

This query prints ``38.73`` in node-oracledb Thin mode.

In node-oracledb Thick mode, this query results in “unexpected”
representations and prints ``38.730000000000004``. To alter this default
conversion from decimal to binary number format in Thick mode, you can use a
fetch type handler as shown in the example below.

.. code-block:: javascript

    const result = await connection.execute(
        'SELECT 38.73 FROM dual',
        [],
        {
            fetchTypeHandler: function(metaData) {
                if (metaData.dbType == oracledb.DB_TYPE_NUMBER) {
                    const converter = (v) => {
                        if (v !== null)
                            v = parseFloat(v);
                        return v;
                    };
                    return {type: oracledb.DB_TYPE_VARCHAR, converter: converter};
                }
            }
        }
    );

    console.log(result.rows);

The output is ``38.73``.

This shows that the number was first converted to a string by the database, as
requested in the fetch type handler. The converter function then converted the
string to a floating point number.

See `examples/typehandlernum.js <https://github.com/oracle/node-oracledb/tree/
main/examples/typehandlernum.js>`__ for a runnable example.

.. _biginthandling:

Fetching BigInt Numbers
+++++++++++++++++++++++

BigInt is a numerical JavaScript data type to represent integer values that
are larger than the range supported by the Number data type. BigInt values can
be created by appending 'n' to the end of integer values or by calling the
``BigInt()`` function. For example, 123n, -123n, 1_000_000_001n,
9876543321n, or BigInt(9876543321). See :ref:`binddatatypenotes` for
information on binding BigInt values.

By default, BigInt numbers fetched from the database are returned as
JavaScript numbers as shown below.

.. code-block:: javascript

    const sql = `SELECT id FROM employees WHERE id = :1`;
    const binds = [ 98765432123456n ];
    const result = await connection.execute(sql, binds);
    console.log(result.rows[0]);

This query prints ``98765432123456``.

To reliably work with BigInt numbers, it is recommended to use a
:ref:`fetch type handler <fetchtypehandler>`. The following fetch type handler
can be used with the example above to return the correct BigInt value:

.. code-block:: javascript

    // Tells the driver to return the number as a BigInt value
    const myfetchTypeHandler = function() {
        return {
            converter: (val) =>  val === null ? null : BigInt(val)
        };
    };
    oracledb.fetchTypeHandler = myfetchTypeHandler;

With this fetch type handler, the query would print ``98765432123456n``.

Without a fetch type handler, fetching a very large or a very small BigInt
number that is not supported by the application platform will result in
truncation to the maximum and the minimum integer values respectively.

.. _datehandling:

Fetching Dates and Timestamps
+++++++++++++++++++++++++++++

Oracle Database DATE and TIMESTAMP columns are fetched as dates in the timezone
of the application.  The TIMESTAMP WITH TIME ZONE and TIMESTAMP WITH LOCAL TIME
ZONE columns are fetched as absolute dates.  Note that JavaScript Date has
millisecond precision. Therefore, timestamps will lose any sub-millisecond
fractional part when fetched.

.. versionchanged:: 6.0

    Oracle Database DATE and TIMESTAMP types are now returned as JavaScript
    date types in the application's timezone, and no longer fetched or bound as
    TIMESTAMP WITH LOCAL TIME ZONE.  The connection session time zone no longer
    impacts these types.  This behavior aligns with other Oracle Database tools
    and drivers. Handling of TIMESTAMP WITH TIMEZONE and TIMESTAMP WITH LOCAL
    TIMEZONE has not changed.  For DATE and TIMESTAMP compatibility with
    node-oracledb 5.5, use a :ref:`fetch type handler <fetchtypehandler>` and
    set the return ``type`` attribute to ``oracledb.DB_TYPE_TIMESTAMP_LTZ``.
    Also use a similar type when binding if compatibility is needed.

To make applications more portable, it is recommended to set the client system
time zone (for example, the ``TZ`` environment variable or the Windows
time zone region) to match the Oracle session time zone, and to use a
pre-determined value, such as UTC.

You can find the current session time zone with:

.. code-block:: sql

    SELECT sessiontimezone FROM DUAL;

You can set the environment variable
`ORA_SDTZ <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
578B5988-31E2-4D0F-ACEA-95C827F6012B>`__ before starting Node.js, for example:

::

    $ export ORA_SDTZ='UTC'
    $ node myapp.js

If this variable is set in the application, it must be set before the
first connection is established:

.. code-block:: javascript

    process.env.ORA_SDTZ = 'UTC';

    const oracledb = require('oracledb');
    const connection = await oracledb.getConnection(. . . );

The session time zone can also be changed at runtime for each connection
by executing:

.. code-block:: javascript

    await connection.execute(`ALTER SESSION SET TIME_ZONE='UTC'`);

Note that this setting will not have any effect on the application
if it is run in node-oracledb Thin mode.

With pooled connections, you could make use of a
:ref:`sessionCallback <createpoolpoolattrssessioncallback>` function
to minimize the number of times the ALTER SESSION needs to be executed.

To set the time zone without requiring the overhead of a
:ref:`round-trip <roundtrips>` to execute the ``ALTER`` statement, you
could use a PL/SQL trigger:

.. code-block:: sql

    CREATE OR REPLACE TRIGGER my_logon_trigger
        AFTER LOGON
        ON hr.SCHEMA
    BEGIN
        EXECUTE IMMEDIATE 'ALTER SESSION SET TIME_ZONE=''UTC''';
    END;

A query that returns the node-oracledb client-side date and timestamp
is:

.. code-block:: sql

    oracledb.fetchAsString = [oracledb.DATE];
    result = await connection.execute(`SELECT current_date, current_timestamp FROM DUAL`);
    console.log(result);

For more information on time zones, see Oracle Support’s `Timestamps &
time zones - Frequently Asked Questions, Doc ID 340512.1
<https://support.oracle.com/epmos/faces/DocumentDisplay?id=340512.1>`__.

.. _intervalhandling:

Fetching Intervals
++++++++++++++++++

See :ref:`intervaltype`.

.. _fetchasstringhandling:

Fetching Numbers and Dates as String
++++++++++++++++++++++++++++++++++++

The global :attr:`~oracledb.fetchAsString` property can be
used to force all number or date columns (and :ref:`CLOB
columns <queryinglobs>`) queried by an application to be fetched as
strings instead of in native format. Allowing data to be fetched as
strings helps avoid situations where using JavaScript types can lead to
numeric precision loss, or where date conversion is unwanted. This
method can be used for CLOBs up to 1 GB in length. The
:ref:`INTERVAL data types <intervalhandling>` cannot be fetched as strings
using :attr:`~oracledb.fetchAsString`. You can use
:ref:`fetch type handlers <fetchtypehandler>` to fetch interval data types as
strings.

For example, to force all dates and numbers used by queries in an
application to be fetched as strings:

.. code-block:: javascript

    const oracledb = require('oracledb');

    // Returns date and number as strings
    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];

For dates and numbers, the maximum length of a string created can be 200
bytes.

Individual queries can use the :meth:`~connection.execute()` option
:ref:`fetchTypeHandler <propexecfetchtypehandler>` to map individual number
or date columns to strings without affecting other columns or other queries.
Any global ``fetchAsString`` setting can be overridden to allow specific
columns to have data returned in native format.

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT last_name, hire_date, salary, commission_pct FROM employees WHERE employee_id = :id`,
        [178],
        {
            fetchTypeHandler: function(metaData) {

                if (metaData.name == "HIRE_DATE") {
                    // Tells the database to return the date as string if the
                    // column name is HIRE_DATE
                    return {type: oracledb.DB_TYPE_VARCHAR};
                }
                if (metaData.name == "COMMISSION_PCT") {

                    // Tells the database to override oracledb.fetchAsString
                    // if the column name is COMMISSION_PCT and fetch as
                    // number type
                    return {type: oracledb.DB_TYPE_NUMBER};
                }
            }
        }
    );

    console.log(result.rows);

The output is::

    [
        [
            'Grant',
            'Thu May 24 2007 00:00:00 GMT+1000 (Australian Eastern Standard Time)',
            '7000',
            0.15
        ]
    ]

The date and salary columns are returned as strings, but the commission
is a number. In node-oracledb Thick mode, the default date format can be
set, for example, with the environment variable ``NLS_DATE_FORMAT``. Note
that this variable will only be read if ``NLS_LANG`` is also set.

In node-oracledb Thin mode, all NLS environment variables are ignored.
Fetch type handlers need to be used for :ref:`date <thindate>` and
:ref:`number <thinnumber>` localizations.

Without the mapping capabilities provided by ``fetchAsString`` and
``fetchTypeHandler``, the hire date would have been a JavaScript date, and
both numeric columns would have been represented as numbers::

    [ [ 'Grant', 2007-05-23T14:00:00.000Z, 7000, 0.15 ] ]

To map columns returned from REF CURSORS, use ``fetchAsString``. The
``fetchTypeHandler`` settings do not apply.

In node-oracledb Thick mode, when using ``fetchAsString`` or
``fetchTypeHandler`` for numbers, you may need to explicitly use
``NLS_NUMERIC_CHARACTERS`` to override your NLS settings and force the decimal
separator to be a period. This can be done for each connection by executing
the statement:

.. code-block:: javascript

    await connection.execute(`ALTER SESSION SET NLS_NUMERIC_CHARACTERS = '.,'`);

Alternatively you can set the equivalent environment variable prior to
starting Node.js::

    $ export NLS_NUMERIC_CHARACTERS='.,'

Note this environment variable is not used unless the ``NLS_LANG``
environment variable is also set.

.. _fetchlob:

Fetching BLOB, CLOB and NCLOB
+++++++++++++++++++++++++++++

By default BLOB, CLOB and NCLOB columns are fetched into
:ref:`Lob <lobclass>` instances. For LOBs less than 1 GB in length it can
be more efficient and convenient to fetch them directly into Buffers or
Strings by using the global :attr:`~oracledb.fetchAsBuffer`
or :attr:`~oracledb.fetchAsString` settings, or the
per-column :attr:`~oracledb.fetchTypeHandler` setting. See the
section :ref:`Working with CLOB, NCLOB and BLOB Data <lobhandling>`.

.. _fetchlong:

Fetching LONG and LONG RAW
++++++++++++++++++++++++++

LONG columns in queries will be fetched as Strings. LONG RAW columns
will be fetched as Buffers.

Unlike for LOBs, there is no support for streaming LONG types. Oracle
Database allows values 2 GB in length, but Node.js and V8 memory
limitations typically only allow memory chunks in the order of tens of
megabytes. This means complete data may not be able to fetched from the
database. The SQL function `TO_LOB <https://www.oracle.com/pls/topic/lookup
?ctx=dblatest&id=GUID-35810313-029E-4CB8-8C27-DF432FA3C253>`__
can be used to migrate data to LOB columns which can be streamed to
node-oracledb, however ``TO_LOB`` cannot be used directly in a
``SELECT``.

.. _fetchrowid:

Fetching ROWID and UROWID
+++++++++++++++++++++++++

Queries will return ROWID and UROWID columns as Strings.

.. _fetchraw:

Fetching RAW
++++++++++++

Queries will return RAW columns as Node.js Buffers.

.. _fetchobjects:

Fetching Oracle Database Objects and Collections
++++++++++++++++++++++++++++++++++++++++++++++++

See :ref:`Oracle Database Objects and Collections <objects>`.

.. _pagingdata:

Limiting Rows and Creating Paged Datasets
-----------------------------------------

Query data is commonly fetched in one or more batches of rows:

-  For fetching all data in small sets to process when the number of
   records is too large for Node.js to handle at the same time. This can
   be handled by :ref:`ResultSets <resultsethandling>` or
   :meth:`~connection.queryStream()` with one execution of the SQL
   query.

-  To perform ‘Web pagination’ that allows moving from one set of rows
   to a next, or previous, set on demand.

-  To give an upper bound on the number of rows that a query has to
   process, which can help improve database scalability.

‘Web pagination’ and limiting the maximum number of rows are discussed
in this section. For each ‘page’ of results, a SQL query is executed to
get the appropriate set of rows from a table. Since the query will be
executed more than once, make sure to use :ref:`bind variables <bind>` for
the starting row and the number of rows.

Techniques include:

-  For Oracle Database 12c or later, use the ``OFFSET`` / ``FETCH`` syntax.
   This is similar to the ``LIMIT`` keyword of MySQL. See `Row Limiting:
   Examples <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
   CFA006CA-6FF1-4972-821E-6996142A51C6>`__ in the Oracle documentation.
   A node-oracledb example is:

   .. code-block:: javascript

        const myoffset = 0;       // do not skip any rows (start at row 1)
        const mymaxnumrows = 20;  // get 20 rows

        const sql = `SELECT last_name
                     FROM employees
                     ORDER BY last_name, employee_id -- See below
                     OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY`;

        const result = await connection.execute(
            sql,
            { offset: myoffset, maxnumrows: mymaxnumrows },
            { prefetchRows: mymaxnumrows + 1, fetchArraySize: mymaxnumrows }
        );

   A runnable example is in `rowlimit.js <https://github.com/oracle/
   node-oracledb/tree/main/examples/rowlimit.js>`__.

   It is generally important to ensure that the query returns an
   unambiguous and repeatable order. In the example above, employees can
   have the same last names so it is necessary to also indicate the next
   order field or the primary key, for example ``employee_id``. In some
   applications, where the table data is being changed by other users,
   this may not be possible. However the use of an ``AS OF`` query
   flashback clause in the statement can be considered, depending on the
   application requirements.

   You can use a basic :meth:`~connection.execute()` or a
   :ref:`ResultSet <resultsetclass>`, or
   :meth:`~connection.queryStream()` with your query. For basic
   ``execute()`` fetches, make sure that ``oracledb.maxRows`` is greater
   than the value bound to ``:maxnumrows``, or set to 0 (meaning
   unlimited).

   In applications where the SQL query is not known in advance, this
   method sometimes involves appending the ``OFFSET`` clause to the
   ‘real’ user query. Be very careful to avoid SQL injection security
   issues.

-  For Oracle Database 11g and earlier there are several alternative
   ways to limit the number of rows returned. The old, canonical paging
   query is:

   .. code-block:: sql

        SELECT *
        FROM (SELECT a.*, ROWNUM AS rnum
              FROM (YOUR_QUERY_GOES_HERE -- including the order by) a
              WHERE ROWNUM <= MAX_ROW)
        WHERE rnum >= MIN_ROW

   Here, ``MIN_ROW`` is the row number of first row and ``MAX_ROW`` is
   the row number of the last row to return. Using the same bind values
   definitions as previously, an example is:

   .. code-block:: javascript

        const sql = `SELECT *
                     FROM (SELECT a.*, ROWNUM AS rnum
                           FROM (SELECT last_name FROM employees ORDER BY last_name) a
                           WHERE ROWNUM <= :maxnumrows + :offset)
                     WHERE rnum >= :offset + 1`;

   This always has an ‘extra’ column, here called RNUM.

-  An alternative, preferred query syntax for Oracle Database 11g uses
   the analytic ``ROW_NUMBER()`` function. For example:

   .. code-block:: javascript

    const sql = `SELECT last_name
                 FROM (SELECT last_name,
                       ROW_NUMBER() OVER (ORDER BY last_name) AS myr
                       FROM employees)
                 WHERE myr BETWEEN :offset + 1 and :maxnumrows + :offset`;

   Refer to `On Top-n and Pagination Queries <https://blogs.oracle.com/
   oraclemagazine/post/on-top-n-and-pagination-queries>`__
   in Oracle Magazine for details.

As an anti-example, another way to limit the number of rows returned
involves setting :attr:`~oracledb.maxRows`. However it is more efficient
to let Oracle Database do the row selection in the SQL query and only
fetch the exact number of rows required from the database.

The videos `SQL for pagination queries - memory and
performance <https://www.youtube.com/watch?v=rhOVF82KY7E>`__ and `SQL
for pagination queries - advanced
options <https://www.youtube.com/watch?v=0TdqGlA4bxI>`__ are worth
reviewing.

.. _autoincrement:

Auto-Increment Columns
----------------------

From Oracle Database 12c you can create tables with auto-incremented
values. This is useful to generate unique primary keys for your data
when ROWID or UROWID are not preferred.

In SQL*Plus execute:

.. code-block:: sql

    CREATE TABLE mytable
        (myid NUMBER(11) GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH 1),
         mydata VARCHAR2(20)
        )

Refer to the `CREATE TABLE identity column documentation
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F9CE0CC3-
13AE-4744-A43C-EAC7A71AAAB6__CJAHCAFF>`__.

If you already have a sequence ``myseq`` you can use values from it to
auto-increment a column value like this:

.. code-block:: sql

    CREATE TABLE mytable
        (myid NUMBER DEFAULT myseq.NEXTVAL,
         mydata VARCHAR2(20)
        )

This also requires Oracle Database 12c or later.

Prior to Oracle Database 12c, auto-increment columns in Oracle Database
can be created using a sequence generator and a trigger.

Sequence generators are defined in the database and return Oracle
numbers. Sequence numbers are generated independently of tables.
Therefore, the same sequence generator can be used for more than one
table or anywhere that you want to use a unique number. You can get a
new value from a sequence generator using the NEXTVAL operator in a SQL
statement. This gives the next available number and increments the
generator. The similar CURRVAL operator returns the current value of a
sequence without incrementing the generator.

A trigger is a PL/SQL procedure that is automatically invoked at a
predetermined point. In this example a trigger is invoked whenever an
insert is made to a table.

In SQL*Plus run:

.. code-block:: sql

    CREATE SEQUENCE myseq;
    CREATE TABLE mytable (myid NUMBER PRIMARY KEY, mydata VARCHAR2(20));
    CREATE TRIGGER mytrigger BEFORE INSERT ON mytable FOR EACH ROW
    BEGIN
        :new.myid := myseq.NEXTVAL;
    END;
    /

Prior to Oracle Database 11g replace the trigger assignment with a
SELECT like:

.. code-block:: sql

    SELECT myseq.NEXTVAL INTO :new.myid FROM dual;

Getting the Last Insert ID
++++++++++++++++++++++++++

To get the automatically inserted identifier in node-oracledb, use a
:ref:`DML RETURNING <dmlreturn>` clause:

.. code-block:: javascript

    . . .
    const result = await connection.execute(
        `INSERT INTO mytable (mydata) VALUES ('Hello') RETURN myid INTO :id`,
        {id : {type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }
    );

    console.log(result.outBinds.id);  // print the ID of the inserted row

Instead of using application generated identifiers, you may prefer to
use ROWIDs, see :ref:`lastRowid <execlastrowid>`.

.. _cursors1000:

Cursor Management
=================

A cursor is a “handle for the session-specific private SQL area that
holds a parsed SQL statement and other processing information”. If your
application returns the error *ORA-1000: maximum open cursors exceeded*
here are possible solutions:

-  Avoid having too many incompletely processed statements open at one
   time:

   -  Make sure your application is handling connections and statements
      in the order you expect.

   -  :meth:`Close ResultSets <resultset.close()>` before releasing the connection.

   -  If cursors are opened with ``DBMS_SQL.OPEN_CURSOR()`` in a PL/SQL
      block, close them before the block returns - except for REF
      CURSORs being passed back to node-oracledb.

-  Choose the appropriate Statement Cache size. Node-oracledb has a
   statement cache per connection. When node-oracledb internally
   releases a statement it will be put into the statement cache of that
   connection, and its cursor will remain open. This makes statement
   re-execution very efficient.

   The cache size is settable with the :attr:`oracle.stmtCacheSize`
   attribute. The size you choose will depend on your knowledge of the
   locality of the statements, and of the resources available to the
   application. Are statements re-executed? Will they still be in the cache
   when they get executed? How many statements do you want to be cached?
   In rare cases when statements are not re-executed, or are likely not to
   be in the cache, you might even want to disable the cache to eliminate its
   management overheads.

   Incorrectly sizing the statement cache will reduce application efficiency.

   To help set the cache size, you can turn on auto-tuning with Oracle Client
   libraries 12.1 or later, using an :ref:`oraaccess.xml <oraaccess>` file.

   For more information, see the :ref:`Statement Caching <stmtcache>`
   documentation.

-  Use :ref:`bind variables <bind>` otherwise each variant of the
   statement will have its own statement cache entry and cursor. With
   appropriate binding only one entry and cursor will be needed.

-  Set the database’s `open_cursors <https://www.oracle.com/pls/topic/lookup?
   ctx=dblatest&id=GUID-FAFD1247-06E5-4E64-917F-AEBD4703CF40>`__
   parameter appropriately. This parameter specifies the maximum number
   of cursors that each “session” (i.e each node-oracledb connection)
   can use. When a connection exceeds the value, the *ORA-1000* error is
   thrown.

   Along with a cursor per entry in the connection’s statement cache,
   any new statements that a connection is currently executing, or
   ResultSets that have not been released (in neither situation are
   these yet cached), will also consume a cursor. Make sure that
   *open_cursors* is large enough to accommodate the maximum open
   cursors any connection may have. The upper bound required is the sum
   of *stmtCacheSize* and the maximum number of executing statements in
   a connection.

   Remember this is all per connection. Also cache management happens
   when statements are internally released. The majority of your
   connections may use less than *open_cursors* cursors, but if one
   connection is at the limit and it then tries to execute a new
   statement, that connection will get *ORA-1000*.
