.. _bind:

********************
Using Bind Variables
********************

SQL and PL/SQL statements may contain bind parameters, which are
colon-prefixed identifiers or numerals. These indicate where separately
specified values are substituted in a statement when it is executed, or
where values are to be returned after execution. For example, ``:country_id``
and ``:country_name`` are the two bind variables in this SQL statement:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const result = await connection.execute(
     `INSERT INTO countries VALUES (:country_id, :country_name)`,
     {country_id: 90, country_name: "Tonga"}
   );

IN binds are values passed into the database. OUT binds are used to
retrieve data. IN OUT binds are passed in, and may return a different
value after the statement executes.

.. note::

    Using bind parameters is recommended in preference to constructing SQL or
    PL/SQL statements by string concatenation or template literals. This is
    for performance and security.

Inserted data that is bound is passed to the database separately from
the statement text. It can never be executed directly. This means there
is no need to escape bound data inserted into the database.

If a statement is executed more than once with different values for the
bind parameters, then Oracle can re-use context from the initial
execution, generally improving performance. However, if similar
statements contain hard coded values instead of bind parameters, Oracle
sees that the statement text is different and will be less efficient.

Bind parameters can be used to substitute data values. They cannot be
used for direct substitution of column or table names in dynamically
constructed statements, see :ref:`Binding Column and Table Names in
Queries <sqlbindtablename>`.

Bind variables cannot be used in `DDL <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-FD9A8CB4-6B9A-44E5-B114-EFB8DA76FC88>`__
statements, for example ``CREATE TABLE`` or ``ALTER`` commands.

Sets of values can bound for use in :meth:`connection.executeMany()`,
see :ref:`Batch Statement Execution and Bulk Loading <batchexecution>`.

.. _inbind:

IN Bind Parameters
==================

For IN binds, a data value is passed into the database and substituted
into the statement during execution of SQL or PL/SQL.

.. _bindbyname:

Bind by Name
------------

To bind data values, the :ref:`bindParams <executebindParams>`
argument of ``execute()`` should contain bind variable objects with
:ref:`dir <executebindparamdir>`, :ref:`val <executebindparamval>`,
:ref:`type <executebindparamtype>` properties. Each bind variable
object name must match the statement’s bind parameter name:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const result = await connection.execute(
     `INSERT INTO countries VALUES (:country_id, :country_name)`,
     {
        country_id: { dir: oracledb.BIND_IN, val: 90, type: oracledb.NUMBER },
        country_name: { dir: oracledb.BIND_IN, val: "Tonga", type: oracledb.STRING }
     }
    );

    console.log("Rows inserted " + result.rowsAffected);

For IN binds:

- The direction ``dir`` is ``oracledb.BIND_IN``, which is the default
  when ``dir`` is not specified.

- The ``val`` attribute may be a constant or a JavaScript variable.

- If ``type`` is omitted, it is derived from the bind data value. If it
  is set, it can be one of the values in the :ref:`type
  table <executebindparamtypevalues>`. Typically ``type`` is one of
  ``oracledb.STRING``, ``oracledb.NUMBER``, ``oracledb.DATE`` or
  ``oracledb.BUFFER`` matching the standard Node.js type of the data
  being passed into the database. Use a bind type of ``oracledb.BLOB``
  or ``oracledb.CLOB`` to pass in :ref:`Lob <lobclass>` instances. For
  binding Oracle Database objects, it can also be the name of an Oracle
  Database object or collection, or a :ref:`DbObject
  Class <dbobjectclass>` type.

Since ``dir`` and ``type`` have defaults, these attributes are sometimes
omitted for IN binds. Binds can be like:

.. code-block:: javascript

    const result = await connection.execute(
     `INSERT INTO countries VALUES (:country_id, :country_name)`,
     {country_id: 90, country_name: "Tonga"}
    );

    console.log("Rows inserted " + result.rowsAffected);

When a bind parameter name is used more than once in the SQL statement,
it should only occur once in the bind object:

.. code-block:: javascript

    const result = await connection.execute(
     `SELECT first_name, last_name FROM employees WHERE first_name = :nmbv OR last_name = :nmbv`,
     {nmbv: 'Christopher'}
    );

.. _bindbypos:

Bind by Position
----------------

Instead of using named bind parameters, the data can alternatively be in
an array. In this example, values are bound to the SQL bind parameters
``:country_id`` and ``:country_name``:

.. code-block:: javascript

    const result = await connection.execute(
     `INSERT INTO countries VALUES (:country_id, :country_name)`,
     [90, "Tonga"]
    );

The position of the array values corresponds to the position of the SQL
bind parameters as they occur in the statement, regardless of their
names. This is still true even if the bind parameters are named like
``:0``, ``:1``, etc. The following snippet will fail because the country
name needs to be the second entry of the array so it becomes the second
value in the ``INSERT`` statement

.. code-block:: javascript

    const result = await connection.execute(
     `INSERT INTO countries (country_id, country_name) VALUES (:1, :0)`,
     ["Tonga", 90]  // fail
    );

In the context of SQL statements, the input array position ‘n’ indicates
the bind parameter at the n’th position in the statement. However, in
the context of PL/SQL statements the position ‘n’ in the bind call
indicates a binding for the n’th unique parameter name in the statement
when scanned left to right.

If a bind parameter name is repeated in the SQL string, then :ref:`bind by
name <bindbyname>` syntax should be used.

.. _binddatatypenotes:

Bind Data Type Notes
--------------------

When binding a JavaScript Date value in an ``INSERT`` statement, by
default the bind ``type`` is equivalent to TIMESTAMP. In the database,
TIMESTAMP WITH LOCAL TIME ZONE dates are normalized to the database time
zone, or to the time zone specified for TIMESTAMP WITH TIME ZONE columns.
If later queried, they are returned in the session time zone. See
:ref:`Fetching Date and Timestamps <datehandling>` for more information.

The binding of BigInt values was introduced in node-oracledb 6.5. When binding
a JavaScript BigInt value in an ``INSERT`` statement, the bind ``type`` used by
default is ``oracledb.DB_TYPE_NUMBER``. For example:

.. code-block:: javascript

    const result = await connection.execute(
     `INSERT INTO employees (id) VALUES (:1)`,
     [98765432123456n]
    );

For information on fetching BigInt numbers, see this
:ref:`section <biginthandling>`.

.. _outbind:

OUT and IN OUT Bind Parameters
==============================

OUT binds are used to retrieve data from the database. IN OUT binds are
passed into the database, and may return a different value after the
statement executes. IN OUT binds can be used for PL/SQL calls, but not
for SQL.

For each OUT and IN OUT bind parameter in
:ref:`bindParams <executebindParams>`, a bind variable object
containing :ref:`dir <executebindparamdir>`,
:ref:`val <executebindparamval>`,
:ref:`type <executebindparamtype>`, and
:ref:`maxSize <executebindparammaxsize>` properties is used:

- The ``dir`` attribute should be ``oracledb.BIND_OUT`` or
  ``oracledb.BIND_INOUT``, depending on whether data is only to be
  returned from the database or additionally passed into the database.

- The ``val`` parameter in needed when binding IN OUT to pass a value
  into the database. It is not used for OUT binds.

- The ``type`` attribute can be one of the constants as discussed in
  the :ref:`type table <executebindparamtypevalues>`. This determines the
  mapping between the database type and the JavaScript type.

  The attribute should be set for OUT binds. If ``type`` is not
  specified, then ``oracledb.STRING`` is assumed.

  For IN OUT binds, ``type`` can inferred from the input data value
  type. However is recommended to explicitly set ``type``, because the
  correct value cannot be determined if the input data is null. The
  output data type will always be the same as the input data type.

- A ``maxSize`` attribute should be set for String and Buffer OUT or IN
  OUT binds. This is the maximum number of bytes the bind parameter
  will return. If the output value does not fit in ``maxSize`` bytes,
  then an error such *ORA-06502: PL/SQL: numeric or value error:
  character string buffer too small* or *NJS-016: buffer is too small
  for OUT binds* occurs.

  A default value of 200 bytes is used when ``maxSize`` is not provided
  for OUT binds that are returned in Strings or Buffers.

  A string representing a UROWID may be up to 5267 bytes long in
  node-oracledb.

For :ref:`PL/SQL Associative Array binds <plsqlindexbybinds>` a
:ref:`maxArraySize <executebindparammaxarraysize>` property is also
required.

Note that before a PL/SQL block returns, all OUT binds should be
explicitly set to a value. This includes bind variables that will be
ignored. Set simple variables to NULL. Set REF CURSORS to an empty
result set. See this `GitHub
Issue <https://github.com/oracle/node-oracledb/issues/886>`__.

.. _outbinds:

Accessing OUT Bind Values
-------------------------

The :ref:`results <resultobject>` parameter of the ``execute()``
callback contains an :ref:`outBinds <execoutbinds>` property with the
returned OUT and IN OUT bind values.

Given the creation of the PL/SQL procedure ``TESTPROC``:

.. code-block:: sql

    CREATE OR REPLACE PROCEDURE testproc (
    p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
    AS
    BEGIN
        p_inout := p_in || p_inout;
        p_out := 101;
    END;
    /
    show errors

The procedure ``TESTPROC`` can be called with:

.. code-block:: javascript

    const bindVars = {
        i:  'Chris', // default direction is BIND_IN. Data type is inferred from the data
        io: { val: 'Jones', dir: oracledb.BIND_INOUT },
        o:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };

    const result = await connection.execute(
     `BEGIN testproc(:i, :io, :o); END;`,
     bindVars
    );

    console.log(result.outBinds);

Since ``bindParams`` is passed as an object, the ``outBinds`` property
is also an object. The Node.js output is:

::

    { io: 'ChrisJones', o: 101 }

PL/SQL allows named parameters in procedure and function calls. This can
be used in ``execute()`` like:

::

    `BEGIN testproc(p_in => :i, p_inout => :io, p_out => :o); END;`,

An alternative to node-oracledb’s ‘bind by name’ syntax is ‘bind by
array’ syntax:

.. code-block:: javascript

    const bindVars = [
     'Chris',
     { val: 'Jones', dir: oracledb.BIND_INOUT },
     { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    ];

When :ref:`bindParams <executebindParams>` is passed as an array, then
``outBinds`` is returned as an array, with the same order as the OUT
binds in the statement:

::

    [ 'ChrisJones', 101 ]

Mixing positional and named syntax is not supported. The following will
throw an error:

.. code-block:: javascript

    const bindVars = [
     'Chris',                                                  // valid
     { val: 'Jones', dir: oracledb.BIND_INOUT },               // valid
     { o: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }  // invalid
    ];

.. _dmlreturn:

DML RETURNING Bind Parameters
=============================

“DML RETURNING” (also known as “RETURNING INTO”) statements such as
``INSERT INTO tab VALUES (:1) RETURNING ROWID INTO :2`` are a way
information can be returned about row changes from
`DML <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__
statements. For example you can use DML RETURNING to get the ROWIDs of
newly inserted rows. Another common use case is to return :ref:`auto
incremented column values <autoincrement>`.

For statements that affect single rows, you may prefer to use
:ref:`lastRowid <execlastrowid>`.

Bind parameters for DML RETURNING statements can use ``oracledb.BLOB``,
``oracledb.CLOB``, ``oracledb.STRING``, ``oracledb.NUMBER`` or
``oracledb.DATE`` for the BIND_OUT :ref:`type <executebindparamtype>`.
To bind named Oracle objects use the class name or
:ref:`DbObject <dbobjectclass>` prototype class for the bind type, as
shown for object binds in :ref:`Fetching Oracle Database Objects and
Collections <objects>`.

Oracle Database DATE, TIMESTAMP, TIMESTAMP WITH LOCAL TIME ZONE and
TIMESTAMP WITH TIME ZONE types can be bound as ``oracledb.DATE`` for DML
RETURNING. These types can also be bound as ``oracledb.STRING``, if
desired. ROWID and UROWID data to be returned can be bound as
``oracledb.STRING``. Note that a string representing a UROWID may be up
to 5267 bytes long.

For string and buffer types, an error occurs if
:ref:`maxSize <executebindparammaxsize>` is not large enough to hold a
returned value.

Note each DML RETURNING bind OUT parameter is returned as an array
containing zero or more elements. Application code that is designed to
expect only one value could be made more robust if it confirms the
returned array length is not greater than one. This will help identify
invalid data or an incorrect ``WHERE`` clause that causes more results
to be returned.

An example of DML RETURNING binds is:

.. code-block:: javascript

    const result = await connection.execute(
     `UPDATE mytab SET name = :name
      WHERE id = :id
      RETURNING id, ROWID INTO :ids, :rids`,
     {
        id:    1001,
        name:  "Krishna",
        ids:   { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        rids:  { type: oracledb.STRING, dir: oracledb.BIND_OUT }
     }
    );

    console.log(result.outBinds);

If the ``WHERE`` clause matches one record, the output would be like:

::

    { ids: [ 1001 ], rids: [ 'AAAbvZAAMAAABtNAAA' ] }

When a couple of rows match, the output could be:

::

    { ids: [ 1001, 1002 ],
      rids: [ 'AAAbvZAAMAAABtNAAA', 'AAAbvZAAMAAABtNAAB' ] }

If the ``WHERE`` clause matches no rows, the output would be:

::

    { ids: [], rids: [] }

The same bind variable placeholder name cannot be used both before and after
the RETURNING clause. Consider the example below.

.. code-block:: javascript

    // a variable cannot be used for both input and output in a DML returning
    // statement
    const result = await connection.execute(
     `UPDATE mytab SET name = :name || ' EXTRA TEXT'
      WHERE id = :id
      RETURNING name INTO :name`,
     {
        id:    1001,
        name:  { type: oracledb.STRING, val: "Krishna", dir: oracledb.BIND_INOUT, maxSize: 100 }
     }
    );
    console.log(result.outBinds.name);

Here, the ``:name`` bind variable is used both before and after the RETURNING
clause. In node-oracledb Thick mode, the bind variable will not be updated as
expected with the ' EXTRA TEXT' value and no error is thrown. The Thick mode
prints the following output::

    Krishna

With node-oracledb Thin mode, the above example returns the following error::

    NJS-149: the bind variable placeholder "NAME" cannot be used both before
    and after the RETURNING clause in a DML RETURNING statement

.. _refcursors:

REF CURSOR Bind Parameters
==========================

Oracle REF CURSORS can be bound in node-oracledb by using the type
``oracledb.CURSOR`` in PL/SQL calls. For an OUT bind, the resulting bind
variable becomes a :ref:`ResultSet <resultsetclass>`, allowing rows to be
fetched using :meth:`~resultset.getRow()` or :meth:`~resultset.getRows()`.
The ResultSet can also be converted to a
Readable Stream by using :meth:`~resultset.toQueryStream()`.
Oracle :ref:`Implicit Results <implicitresults>` are an alternative way to
return query results from PL/SQL.

If using ``getRow()`` or ``getRows()`` the ResultSet must be freed using
:meth:`~resultset.close()` when all rows have been fetched, or when the
application does not want to continue getting more rows. If the REF
CURSOR is set to NULL or is not set in the PL/SQL procedure, then the
returned ResultSet is invalid and methods like ``getRows()`` will return
an error when invoked.

Given a PL/SQL procedure defined as:

.. code-block:: sql

    CREATE OR REPLACE PROCEDURE get_emp_rs (
     p_sal IN NUMBER,
     p_recordset OUT SYS_REFCURSOR) AS
    BEGIN
     OPEN p_recordset FOR
        SELECT first_name, salary, hire_date
        FROM   employees
        WHERE  salary > p_sal;
    END;
    /

This PL/SQL procedure can be called in node-oracledb using:

.. code-block:: javascript

    const result = await connection.execute(
     `"BEGIN get_emp_rs(:sal, :cursor); END;`,
     {
        sal: 6000,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
     },
     {
        fetchArraySize: 1000
     }
    );

    const resultSet = result.outBinds.cursor;
    let row;
    while ((row = await resultSet.getRow())) {
        console.log(row);
    }

    await resultSet.close();   // always close the ResultSet

All rows can be fetched in one operation by calling ``getRows()`` with
no argument. This is useful when the query is known to return a “small”
number of rows:

.. code-block:: javascript

    const result = await connection.execute(
     `"BEGIN get_emp_rs(:sal, :cursor); END;`,
     {
        sal: 6000,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
     },
     {
        fetchArraySize: 200
     }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows();
    console.log(rows);

    await resultSet.close();   // always close the ResultSet

The :attr:`~oracledb.prefetchRows` and :attr:`~oracledb.fetchArraySize` can
be used to tune the ``getRows()`` call. The values must be set before, or when,
the ResultSet is obtained.

See `refcursor.js <https://github.com/oracle/node-oracledb/tree/main/examples
/refcursor.js>`__ for a complete example.

To convert the REF CURSOR ResultSet to a stream, use
:meth:`~resultset.toQueryStream()`:

.. code-block:: javascript

    const result = await connection.execute(
     `"BEGIN get_emp_rs(:sal, :cursor); END;`,
     {
        sal: 6000,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
     }
    );

    const cursor = result.outBinds.cursor;
    const queryStream = cursor.toQueryStream();

    const consumeStream = new Promise((resolve, reject) => {
        queryStream.on('data', function(row) {
            console.log(row);
        });
        queryStream.on('error', reject);
        queryStream.on('close', resolve);
    });

    await consumeStream;

The connection must remain open until the stream is completely read.
Query results must be fetched to completion to avoid resource leaks. The
ResultSet ``close()`` call for streaming query results will be executed
internally when all data has been fetched.

If you want to pass a queried ResultSet into PL/SQL using direction
``oracledb.BIND_IN``, then set :ref:`prefetchRows <propexecprefetchrows>` to
0 for the query returning the ResultSet. This stops the first rows being
silently fetched by node-oracledb and not being available in the later
receiving PL/SQL code. For example:

.. code-block:: javascript

    const result = await connection.execute(
     `SELECT * FROM locations`,
     [],
     {
        resultSet:    true,
        prefetchRows: 0      // stop node-oracledb internally fetching rows from the ResultSet
     }
    );

    // Pass the ResultSet as a REF CURSOR into PL/SQL

    await conn.execute(
     `BEGIN myproc(:rc); END;`,
     {
        rc: { val: result.resultSet, type: oracledb.CURSOR, dir: oracledb.BIND_IN }
     }
    );

Because the default bind direction is ``BIND_IN``, and the type can be
inferred from ``result.resultSet``, the PL/SQL procedure call can be
simplified to:

.. code-block:: javascript

    await conn.execute(`BEGIN myproc(:rc); END;`, [result.resultSet]);

.. _lobbinds:

LOB Bind Parameters
===================

Database CLOBs can be bound with ``type`` set to
:ref:`oracledb.CLOB <oracledbconstants>`. Database BLOBs can be bound
as :ref:`oracledb.BLOB <oracledbconstants>`. These binds accept, or
return, node-oracledb :ref:`Lob <lobclass>` instances, which implement the
Node.js Stream interface.

Lobs may represent Oracle Database persistent LOBs (those stored in
tables) or temporary LOBs (such as those created with
:meth:`connection.createLob()` or returned by some SQL and
PL/SQL operations).

LOBs can be bound with direction ``oracledb.BIND_IN``,
``oracledb.BIND_OUT`` or ``oracledb.BIND_INOUT``, depending on context.

Note that any PL/SQL OUT LOB parameter should be initialized in the
PL/SQL block - even just to NULL - before the PL/SQL code completes.
Make sure to do this in all PL/SQL code paths including in error
handlers. This prevents node-oracledb throwing the error *DPI-007:
invalid OCI handle or descriptor*.

In many cases it will be easier to work with JavaScript Strings and
Buffers instead of :ref:`Lobs <lobclass>`. These types can be bound
directly for SQL IN binds to insert into, or update, LOB columns. They
can also be bound to PL/SQL LOB parameters. Set the bind ``type`` to
:ref:`oracledb.STRING <oracledbconstantsnodbtype>` for CLOBs,
:ref:`oracledb.DB_TYPE_NVARCHAR <oracledbconstantsdbtype>` for NCLOBs,
and :ref:`oracledb.BUFFER <oracledbconstantsnodbtype>` for BLOBs. The
default size used for these binds in the OUT direction is 200, so set
``maxSize`` appropriately.

See :ref:`Working with CLOB, NCLOB and BLOB Data <lobhandling>` for
examples and more information on binding and working with LOBs.

Size Limits for Binding LOBs to Strings and Buffers
---------------------------------------------------

When CLOBs are bound as ``oracledb.STRING``, BCLOBs bound as
``oracledb.DB_TYPE_NVARCHAR``, or BLOBs are bound as
``oracledb.BUFFER``, then their size is limited to 1GB. Commonly the
practical limitation is the memory available to Node.js and the V8
engine. For data larger than several megabytes, it is recommended to
bind as ``oracledb.CLOB`` or ``oracledb.BLOB`` and use :ref:`Lob
streaming <streamsandlobs>`. If you try to create large Strings or
Buffers in Node.js you will see errors like *JavaScript heap out of
memory*, or other space related messages.

Internally, temporary LOBs are used when binding Strings and Buffers
larger than 32 KB for PL/SQL calls. Freeing of the temporary LOB is
handled automatically. For SQL calls no temporary LOBs are used.

.. _sqlwherein:

Binding Multiple Values to a SQL ``WHERE IN`` Clause
====================================================

Binding a single JavaScript value into a SQL ``WHERE IN`` clause is
easy:

.. code-block:: javascript

    sql = `SELECT first_name, last_name FROM employees WHERE first_name IN (:bv)`;
    binds = ['Christopher'];
    await connection.execute(sql, binds, function(...));

But a common use case for a SQL ``WHERE IN`` clause is for multiple
values, for example when a web user selects multiple check-box options
and the query should match all chosen values.

To use a fixed, small number of values in an ``WHERE IN`` bind clause,
the SQL query should have individual bind parameters, for example:

.. code-block:: javascript

    const sql = `SELECT first_name, last_name FROM employees WHERE first_name IN (:bv1, :bv2, :bv3, :bv4)`;
    const binds = ['Alyssa', 'Christopher', 'Hazel', 'Samuel'];
    const result = await connection.execute(sql, binds);

If you sometimes execute the query with a smaller number of items, then
null can be bound for each ‘missing’ value:

.. code-block:: javascript

    const binds = ['Alyssa', 'Christopher', 'Hazel', null];

When the exact same statement text is re-executed many times regardless
of the number of user supplied values, this provides performance and
scaling benefits from not having multiple, unique SQL statements being
run.

If the statement is not going to be re-executed, or the number of values
is only going to be known at runtime, then a SQL statement can be built
up:

.. code-block:: javascript

    const binds = ['Christopher', 'Hazel', 'Samuel'];
    let sql = `SELECT first_name, last_name FROM employees WHERE first_name IN (`;
    for (const i = 0; i < binds.length; i++)
        sql += (i > 0) ? ", :" + i : ":" + i;
    sql += ")";

This will construct a SQL statement:

::

    SELECT first_name, last_name FROM employees WHERE first_name IN (:0, :1, :2)

You could use a `tagged literal template <https://github.com/oracle/
node-oracledb/issues/699#issuecomment-524009129>`__
to do this conveniently. Binds are still used for security. But,
depending how often this query is executed, and how changeable the
number of bind values is, you can end up with lots of ‘unique’ query
strings being executed. You might not get the statement caching benefits
that re-executing a fixed SQL statement would have.

A general solution for a larger number of values is to construct a SQL
statement like:

::

    SELECT ... WHERE col IN ( <something that returns a list of values> )

The best way to do the ``<something that returns a list of values>``
will depend on how the data is initially represented and the number of
items. You might look at using CONNECT BY or at using a global temporary
table.

One method is to use an Oracle collection with the ``TABLE()`` clause.
For example, if the following type was created::

    SQL> CREATE OR REPLACE TYPE name_array AS TABLE OF VARCHAR2(20);
      2  /

then the application could do:

.. code-block:: javascript

    const sql = `SELECT first_name, last_name
                 FROM employees
                 WHERE first_name IN (SELECT * FROM TABLE(:bv))`;

    const inlist = ['Christopher', 'Hazel', 'Samuel'];

    const binds = { bv: { type: "NAME_ARRAY", val: inlist } };

    const result = await connection.execute(sql, binds, options);

You may decide to overload the use of the database
``SYS.ODCIVARCHAR2LIST`` or ``SYS.ODCINUMBERLIST`` types so you don’t
need to create a type like ``name_array``:

.. code-block:: javascript

    const binds = { bv: { type: 'SYS.ODCIVARCHAR2LIST', val: inlist } };

Since this ``TABLE()`` solution uses an object type, there is a
performance impact because of the extra :ref:`round-trips <roundtrips>`
required to get the type information. Unless you have a large number of
binds you may prefer one of the previous solutions.

Some general references are `On Cursors, SQL, and Analytics <https://blogs.
oracle.com/oraclemagazine/post/on-cursors-sql-and-analytics>`__ and in
`this StackOverflow answer <https://stackoverflow.com/a/43330282/4799035>`__.

.. _sqlbindlike:

Binding in a ``LIKE`` or ``REGEXP_LIKE`` Clause
===============================================

To do pattern matching with a ``LIKE`` clause, bind a string containing
the pattern match wildcards, for example:

.. code-block:: javascript

    const pattern = "%uth%";

    result = await connection.execute(
     `SELECT CITY FROM LOCATIONS WHERE CITY LIKE :bv`,
     { bv: pattern }
    );
    console.log(result.rows[0]);

Output is like:

::

    [ [ 'South Brunswick' ], [ 'South San Francisco' ], [ 'Southlake' ] ]

The same is true for regular expression functions such as
``REGEXP_LIKE`` and ``REGEXP_SUBSTR``. For example:

.. code-block:: javascript

    const pattern = ',[^,]+,';

    result = await connection.execute(
     `SELECT REGEXP_SUBSTR('500 Oracle Parkway, Redwood Shores, CA', :bv) FROM DUAL`,
     { bv: pattern }
    );
    console.log(result.rows);

Output is like:

::

    [ [ ', Redwood Shores,' ] ]

.. _sqlbindtablename:

Binding Column and Table Names in Queries
=========================================

It is not possible to bind table names in queries. Instead use a
hard-coded Allow List of names to build the final SQL statement, for
example:

.. code-block:: javascript

    const validTables = ['LOCATIONS', 'DEPARTMENTS'];

    const tableName = getTableNameFromEndUser();

    if (!validTables.includes(tableName)) {
     throw new Error('Invalid table name');
    }

    const query = `SELECT * FROM ` + tableName;

The same technique can be used to construct the list of selected column
names. Make sure to use an Allow List of names to avoid SQL Injection
security risks.

Each final SQL statement will obviously be distinct, and will use a slot
in the :ref:`statement cache <stmtcache>` by default.

It is possible to bind column names used in an ORDER BY:

.. code-block:: javascript

    const sql = `SELECT first_name, last_name
                 FROM employees
                 ORDER BY
                    CASE :ob
                        WHEN 'FIRST_NAME' THEN first_name
                        ELSE last_name
                    END`;

    const columnName = getColumnNameFromEndUser();  // your function
    const binds = [columnName];

    const result = await connection.execute(sql, binds);

In this example, when ``columnName`` is ‘FIRST_NAME’ then the result set
will be ordered by first name, otherwise the order will be by last name.

You should analyze the statement usage patterns and optimizer query plan
before deciding whether to using binds like this, or to use multiple
hard-coded SQL statements, each with a different ORDER BY.
