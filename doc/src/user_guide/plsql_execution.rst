.. _plsqlexecution:

****************
Executing PL/SQL
****************

PL/SQL stored procedures, functions and anonymous blocks can be called
from node-oracledb using :meth:`~connection.execute()`.

.. _plsqlproc:

PL/SQL Stored Procedures
========================

The PL/SQL procedure:

.. code-block:: sql

    CREATE OR REPLACE PROCEDURE myproc (id IN NUMBER, name OUT VARCHAR2, salary OUT NUMBER) AS
    BEGIN
        SELECT last_name, salary INTO name, salary FROM employees WHERE employee_id = id;
    END;

can be called:

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN
            myproc(:id, :name, :salary);
        END;`,
        {  // bind variables
            id:   159,
            name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
            salary: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
    );

    console.log(result.outBinds);

The output is::

    { name: 'Smith', salary: 8000 }

Binding is required for IN OUT and OUT parameters. It is strongly
recommended for IN parameters. See :ref:`Bind Parameters for Prepared
Statements <bind>`.

.. _plsqlfunc:

PL/SQL Stored Functions
=======================

The PL/SQL function:

.. code-block:: sql

    CREATE OR REPLACE FUNCTION myfunc RETURN VARCHAR2 AS
    BEGIN
        RETURN 'Hello';
    END;

can be called by using an OUT bind variable for the function return
value:

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN
            :ret := myfunc();
        END;`,
        {
            ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
        }
    );

    console.log(result.outBinds);

The output is::

    { ret: 'Hello' }

See :ref:`Bind Parameters for Prepared Statements <bind>` for information
on binding.

.. _plsqlanon:

PL/SQL Anonymous PL/SQL Blocks
==============================

Anonymous PL/SQL blocks can be called from node-oracledb like:

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN
            SELECT last_name INTO :name FROM employees WHERE employee_id = :id;
        END;`,
        {  // bind variables
            id:   134,
            name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
        }
    );

    console.log(result.outBinds);

The output is::

    { name: 'Rogers' }

See :ref:`Bind Parameters for Prepared Statements <bind>` for information
on binding.

.. _dbmsoutput:

Using DBMS_OUTPUT
=================

The `DBMS_OUTPUT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
=GUID-C1400094-18D5-4F36-A2C9-D28B0E12FD8C>`__
package is the standard way to “print” output from PL/SQL. The way
DBMS_OUTPUT works is like a buffer. Your Node.js application code must
first turn on DBMS_OUTPUT buffering for the current connection by
calling the PL/SQL procedure ``DBMS_OUTPUT.ENABLE(NULL)``. Then any
PL/SQL executed by the connection can put text into the buffer using
``DBMS_OUTPUT.PUT_LINE()``. Finally ``DBMS_OUTPUT.GET_LINE()`` is used
to fetch from that buffer. Note that any PL/SQL code that uses DBMS_OUTPUT
runs to completion before any output is available to the user. Also,
other database connections cannot access your buffer.

A basic way to fetch DBMS_OUTPUT with node-oracledb is to bind an output
string when calling the PL/SQL ``DBMS_OUTPUT.GET_LINE()`` procedure,
print the string, and then repeat until there is no more data. The
following snippet is based on the example
`dbmsoutputgetline.js <https://github.com/oracle/node-oracledb/tree/main/
examples/dbmsoutputgetline.js>`__:

.. code-block:: javascript

    let result;
    do {
            result = await connection.execute(
                `BEGIN
                    DBMS_OUTPUT.GET_LINE(:ln, :st);
                 END;`,
                {   ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
                    st: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );
            if (result.outBinds.st === 0)
                console.log(result.outBinds.ln);
    } while (result.outBinds.st === 0);

.. _pipelinedfunction:

Another way is to wrap the ``DBMS_OUTPUT.GET_LINE()`` call into a
pipelined function and fetch the output using a SQL query. See
`dbmsoutputpipe.js <https://github.com/oracle/node-oracledb/tree/main/
examples/dbmsoutputpipe.js>`__ for the full example.

The pipelined function could be created like:

.. code-block:: sql

    CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
    /

    CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
        line VARCHAR2(32767);
        status INTEGER;
        BEGIN LOOP
            DBMS_OUTPUT.GET_LINE(line, status);
            EXIT WHEN status = 1;
            PIPE ROW (line);
        END LOOP;
    END;
    /

To get DBMS_OUTPUT, simply query this function using the same connection
that created the output:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT * FROM TABLE(mydofetch())`,
        [],
        { resultSet: true }
    );

    const rs = result.resultSet;
    let row;
    while ((row = await rs.getRow())) {
        console.log(row);
    }

The query rows in this example are handled using a
:ref:`ResultSet <resultsethandling>`.

Remember to first enable output using ``DBMS_OUTPUT.ENABLE(NULL)``.

.. _ebr:

Edition-Based Redefinition
==========================

The `Edition-Based Redefinition <https://www.oracle.com/pls/topic/lookup
?ctx=dblatest&id=GUID-58DE05A0-5DEF-4791-8FA8-F04D11964906>`__
(EBR) feature of Oracle Database allows multiple versions of views,
synonyms, PL/SQL objects and SQL Translation profiles to be used
concurrently. Each item's version is associated with an ‘edition’ which
can be nominated at runtime by applications. This lets database logic be
updated and tested while production users are still accessing the
original version. Once every user has begun using the objects in the new
edition, the old objects can be dropped.

.. note::

    In this release, Edition-Based Redefinition is only supported in the
    node-oracledb Thick mode. See :ref:`enablingthick`.

To choose the edition, node-oracledb applications can set
:attr:`oracledb.edition` globally, or specify a value
when :ref:`creating a pool <createpoolpoolattrsedition>` or a
:ref:`standalone connection <getconnectiondbattrsedition>`.

The example below shows how a PL/SQL function ``DISCOUNT`` can be
created with two different implementations. The initial procedure is
created as normal in the SQL*Plus command line:

.. code-block:: sql

    CONNECT nodedemo/welcome

    -- The default edition's DISCOUNT procedure

    CREATE OR REPLACE FUNCTION discount(price IN NUMBER) RETURN NUMBER
    AS
        newprice NUMBER;
    BEGIN
        newprice := price - 4;
        IF (newprice < 1) THEN
            newprice := 1;
        END IF;
        RETURN newprice;
    END;
    /

This initial implementation is in the default ‘edition’ ``ora$base``,
which is pre-created in new and upgraded databases.

The user ``nodedemo`` can be given permission to create new ‘editions’:

.. code-block:: sql

    CONNECT system

    GRANT CREATE ANY EDITION TO nodedemo;
    ALTER USER nodedemo ENABLE EDITIONS FORCE;

The next SQL*Plus script creates a new edition ``e2``, and changes the
current session to use it. A new version of ``DISCOUNT`` is created
under that edition:

.. code-block:: sql

    CONNECT nodedemo/welcome

    CREATE EDITION e2;
    ALTER SESSION SET EDITION = e2;

    -- E2 edition's discount

    CREATE OR REPLACE FUNCTION discount(price IN NUMBER) RETURN NUMBER
    AS
        newprice NUMBER;
    BEGIN
        newprice := 0.75 * price;
        RETURN newprice;
    END;
    /

There are now two implementations of the PL/SQL procedure ``DISCOUNT``
with the same prototype. Applications can choose at runtime which
implementation to use. Here is a script that calls ``DISCOUNT``:

.. code-block:: javascript

    const mypw = ...  // set mypw to the nodedemo schema password

    const connection = await oracledb.getConnection(
        {
            user: 'nodedemo',
            password: mypw,
            connectString: 'localhost/orclpdb1'
        }
    );

    const result = await connection.execute(
        `SELECT name, price, DISCOUNT(price) AS discountprice
        FROM parts
        ORDER BY id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(result.rows);

Since the code does not explicitly set ``oracledb.edition`` (or
equivalent), then the first implementation of ``DISCOUNT`` in the
default edition is used. The output might be like::

    [   { NAME: 'lamp', PRICE: 40, DISCOUNTPRICE: 36 },
        { NAME: 'wire', PRICE: 10, DISCOUNTPRICE: 6 },
        { NAME: 'switch', PRICE: 4, DISCOUNTPRICE: 1 } ]

If the connection uses edition ``e2``, then the second implementation of
``DISCOUNT`` will be used:

.. code-block:: javascript

    const connection = await oracledb.getConnection(
        {
            user: 'nodedemo',
            password: mypw,  // mypw contains the nodedemo schema password
            connectString: 'localhost/orclpdb1',
            edition: 'e2'
        }
    );
    . . . // same query code as before

The output might be like::

    [   { NAME: 'lamp', PRICE: 40, DISCOUNTPRICE: 30 },
        { NAME: 'wire', PRICE: 10, DISCOUNTPRICE: 7.5 },
        { NAME: 'switch', PRICE: 4, DISCOUNTPRICE: 3 } ]

See the Database Development Guide chapter `Using Edition-Based
Redefinition <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-58DE05A0-5DEF-4791-8FA8-F04D11964906>`__
for more information about EBR.

.. _implicitresults:

Implicit Results
================

Oracle Implicit Results allow queries in PL/SQL to be returned to
Node.js without requiring REF CURSORS or :ref:`bind variables <bind>`.
Implicit Results requires node-oracledb 4.0, Oracle Database 12.1 or
later, and Oracle Client 12.1 or later.

PL/SQL code uses ``DBMS_SQL.RETURN_RESULT()`` to return query results.
These are accessible in the ``execute()`` callback
:ref:`implicitResults <execimplicitresults>` attribute.

For example::

    const plsql = `
        DECLARE
            c1 SYS_REFCURSOR;
            c2 SYS_REFCURSOR;
        BEGIN
            OPEN c1 FOR SELECT city, postal_code
                        FROM locations
                        WHERE location_id < 1200;
            DBMS_SQL.RETURN_RESULT(c1);

            OPEN C2 FOR SELECT job_id, employee_id, last_name
                        FROM employees
                        WHERE employee_id < 103;
            DBMS_SQL.RETURN_RESULT(c2);
        END;`;

    result = await connection.execute(plsql);
    console.log(result.implicitResults);

will display::

    [
        [
            [ 'Roma', '00989' ],
            [ 'Venice', '10934' ],
        ],
        [
            [ 'AD_PRES', 100, 'King' ],
            [ 'AD_VP', 101, 'Kochhar' ],
            [ 'AD_VP', 102, 'De Haan' ],
        ]
    ]

For larger query results, fetching :ref:`ResultSets <resultsethandling>`
is recommended::

    result = await connection.execute(plsql, [], { resultSet: true });
    for (const i = 0; i < result.implicitResults.length; i++) {
        console.log(" Implicit Result Set", i + 1);
        const rs = result.implicitResults[i];  // get the next ResultSet
        let row;
        while ((row = await rs.getRow())) {
            console.log("  ", row);
        }
        console.log();
        await rs.close();
    }

This displays::

    Implicit Result Set 1
        [ 'Roma', '00989' ]
        [ 'Venice', '10934' ]

    Implicit Result Set 2
        [ 'AD_PRES', 100, 'King' ]
        [ 'AD_VP', 101, 'Kochhar' ]
        [ 'AD_VP', 102, 'De Haan' ]

A runnable example is in `impres.js <https://github.com/oracle/node-oracledb/
tree/main/examples/impres.js>`__.

.. _plsqlcreate:

Creating PL/SQL Procedures and Functions
========================================

PL/SQL procedures and functions can easily be created in node-oracledb
by calling ``connection.execute()``, for example:

.. code-block:: javascript

    await connection.execute(
        `CREATE OR REPLACE PROCEDURE no_proc
        (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
        AS
        BEGIN
            p_inout := p_in || p_inout;
            p_out := 101;
        END;`
    );

See the examples `plsqlproc.js <https://github.com/oracle/node-oracledb/
tree/main/examples/plsqlproc.js>`__ and `plsqlfunc.js
<https://github.com/oracle/node-oracledb/tree/main/examples/plsqlfunc.js>`__.

.. _plsqlcompwarnings:

PL/SQL Compilation Warnings
---------------------------

When creating PL/SQL procedures and functions (or creating types) in
node-oracledb using SQL statements, the statement might succeed without
throwing an error, but there may be additional informational messages. (These
messages are sometimes known in Oracle as "success with info" messages). Your
application can manually check for these messages using the
:ref:`warning <execwarning>` property of the
:ref:`result object <resultobject>` in :meth:`connection.execute()` or
:meth:`connection.executeMany()`. A subsequent query from a table like
``USER_ERRORS`` will show more details. For example:

.. code-block:: javascript

    const result = await connection.execute(
        `CREATE OR REPLACE PROCEDURE badproc AS
        BEGIN
            INVALID
        END;`);

    if (result.warning && result.warning.code == "NJS-700")
        console.log(result.warning.message)

    const r = await connection.execute(
        `SELECT line, position, text
        FROM user_errors
        WHERE name = 'BADPROC' AND type = 'PROCEDURE'
        ORDER BY name, type, line, position`,
        [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (r.rows.length) {
        console.error(r.rows[0].TEXT);
        console.error('at line', r.rows[0].LINE, 'position', r.rows[0].POSITION);
    }

In node-oracledb Thin mode, the output would be::

    NJS-700: creation succeeded with compilation errors
    PLS-00103: Encountered the symbol "END" when expecting one of the following:

        := . ( @ % ;
    The symbol ";" was substituted for "END" to continue.

    at line 4 position 8

In node-oracledb Thick mode, the output would be::

    NJS-700: creation succeeded with compilation errors
    ORA-24344: success with compilation error
    PLS-00103: Encountered the symbol "END" when expecting one of the following:

        := . ( @ % ;
    The symbol ";" was substituted for "END" to continue.

    at line 4 position 8
