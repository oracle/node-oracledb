.. _batchexecution:

******************************************
Batch Statement Execution and Bulk Loading
******************************************

The :meth:`connection.executeMany()` method allows many
sets of data values to be bound to one DML or PL/SQL statement for
execution. It is like calling :meth:`connection.execute()`
multiple times but requires fewer :ref:`round-trips <roundtrips>`. This is
an efficient way to handle batch changes, for example when doing bulk
inserts, or for updating multiple rows. The method cannot be used for
queries.

The ``executeMany()`` method supports IN, IN OUT and OUT binds for most
data types except :ref:`PL/SQL Collection Associative
Arrays <plsqlindexbybinds>`.

There are runnable examples in the GitHub
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
directory.

For example, to insert three records into the database:

.. code:: javascript

  const sql = `INSERT INTO mytab VALUES (:a, :b)`;

  const binds = [
    { a: 1, b: "One" },
    { a: 2, b: "Two" },
    { a: 3, b: "Three" }
  ];

  const options = {
    autoCommit: true,
    bindDefs: {
      a: { type: oracledb.NUMBER },
      b: { type: oracledb.STRING, maxSize: 5 }
    }
  };

  const result = await connection.executeMany(sql, binds, options);

  console.log(result.rowsAffected);  // 3

Strings and Buffers require a ``maxSize`` value in ``bindDefs``. It must
be the length (or greater) of the longest data value. For efficiency,
keep the size as small as possible.

The :ref:`options <executemanyoptions>` parameter is optional.

If :ref:`bindDefs <executemanyoptbinddefs>` is not set, then the bind
direction is assumed to be IN, and the :ref:`bind data <executemanybinds>`
are used to determine the bind variable types, names and maximum sizes.
Using ``bindDefs`` is generally recommended because it removes the
overhead of scanning all records.

The bind definitions ``bindDefs`` can also use “bind by position”
syntax, see the next examples.

Along with using ``executeMany()``, `tune your data
loads <https://www.youtube.com/watch?v=PWFb7amjqCE>`__ by reviewing your
schema design and its triggers, sequences, indexes, partitioning, and
redo generation.

Attempting to use very large data sets may give the error *DPI-1015:
array size is too large*. To avoid this, repeatedly call
``executeMany()`` with subsets of the data.

Identifying Affected Rows with ``executeMany()``
================================================

When executing a DML statement the number of database rows affected for
each input record can be shown by setting
:ref:`dmlRowCounts <execmanydmlrowscounts>`. For example when deleting
rows:

.. code:: javascript

  const sql = `DELETE FROM tab WHERE id = :1`;

  const binds = [
    [20],
    [30],
    [40]
  ];

  const options = { dmlRowCounts: true };

  const result = await connection.executeMany(sql, binds, options);

  console.log(result.dmlRowCounts);

If the table originally contained three rows with id of 20, five rows
with id of 30 and six rows with id of 40, then the output would be::

  [ 3, 5, 6 ]

.. _handlingbatcherrors:

Handling Data Errors with ``executeMany()``
===========================================

With large sets of data, it can be helpful not to abort processing on
the first data error, but to continue processing and resolve the errors
later.

When :ref:`batchErrors <executemanyoptbatcherrors>` is *true*,
processing will continue even if there are data errors in some records.
The ``executeMany()`` callback error parameter is not set. Instead, an
array containing each error will be returned in the callback ``result``
parameter. All valid data records will be processed and a transaction
will be started but not committed, even if ``autoCommit`` is *true*. The
application can examine the errors, take action, and explicitly commit
or rollback, as desired.

For example::

  const sql = `INSERT INTO childtab VALUES (:1, :2, :3)`;

  const binds = [
   [1016, 10, "Child 2 of Parent A"],
   [1017, 10, "Child 3 of Parent A"],
   [1018, 20, "Child 4 of Parent B"],
   [1018, 20, "Child 4 of Parent B"],   // duplicate key
   [1019, 30, "Child 3 of Parent C"],
   [1020, 40, "Child 4 of Parent D"],
   [1021, 75, "Child 1 of Parent F"],   // parent does not exist
   [1022, 40, "Child 6 of Parent D"]
  ];

  const options = {
   autoCommit: true,
   batchErrors: true,
   bindDefs: [
      { type: oracledb.NUMBER },
      { type: oracledb.NUMBER },
      { type: oracledb.STRING, maxSize: 20 }
    ]
  };

  const result = await connection.executeMany(sql, binds, options);

  console.log(result.batchErrors);

The output is an array of :ref:`error objects <errorobj>` that were
reported during execution. The ``offset`` property corresponds to the
0-based index of the ``executeMany()`` :ref:`binds
parameter <executemanybinds>` array, indicating which record could
not be processed::

  [ { Error: ORA-00001: unique constraint (HR.CHILDTAB_PK) violated errorNum: 1, offset: 3 },
    { Error: ORA-02291: integrity constraint (HR.CHILDTAB_FK) violated - parent key not found errorNum: 2291, offset: 6 } ]

Note that some classes of error will always return via the
``executeMany()`` callback error object, not as batch errors. No
transaction is created in this case. This includes errors where string
or buffer data is larger than the specified
:ref:`maxSize <executemanyoptbinddefs>` value.

DML RETURNING with ``executeMany()``
====================================

Values can be returned with DML RETURNING syntax::

  const sql = `INSERT INTO tab VALUES (:1) RETURNING ROWID INTO :2`;

  const binds = [
    ["One"],
    ["Two"],
    ["Three"]
  ];

  const options = {
    bindDefs: [
      { type: oracledb.STRING, maxSize: 5 },
      { type: oracledb.STRING, maxSize: 18, dir: oracledb.BIND_OUT  },
    ]
  };

  const result = await connection.executeMany(sql, binds, options);

  console.log(result.outBinds);

Output is::

  [ [ [ 'AAAmI9AAMAAAAnVAAA' ] ],
    [ [ 'AAAmI9AAMAAAAnVAAB' ] ],
    [ [ 'AAAmI9AAMAAAAnVAAC' ] ] ]

Calling PL/SQL with ``executeMany()``
=====================================

The ``executeMany()`` method can be used to execute a PL/SQL statement
multiple times with different input values. For example, the following
PL/SQL procedure:

.. code:: sql

  CREATE PROCEDURE testproc (
    a_num IN NUMBER,
    a_outnum OUT NUMBER,
    a_outstr OUT VARCHAR2)
  AS
  BEGIN
    a_outnum := a_num * 2;
    FOR i IN 1..a_num LOOP
      a_outstr := a_outstr || 'X';
    END LOOP;
  END;
  /

can be called like:

.. code:: javascript

  const sql = `BEGIN testproc(:1, :2, :3); END;`;

  // IN binds
  const binds = [
    [1],
    [2],
    [3],
    [4]
  ];

  const options = {
    bindDefs: [
      { type: oracledb.NUMBER },
      { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
    ]
  };

  const result = await connection.executeMany(sql, binds, options);

  console.log(result.outBinds);

The returned bind values are::

  [ [ 2, 'X' ],
    [ 4, 'XX' ],
    [ 6, 'XXX' ],
    [ 8, 'XXXX' ] ]

The variant of ``executeMany()`` that accepts a number of iterations is
useful when there are no bind values, or only OUT bind values. This
example calls a PL/SQL block eight times:

.. code:: javascript

  const plsql = `DECLARE
                   t_id NUMBER;
                 BEGIN
                   SELECT NVL(COUNT(*), 0) + 1 INTO t_id FROM testtable;
                   INSERT INTO testtable VALUES (t_id, 'Test String ' || t_id);
                   SELECT SUM(id) INTO :1 FROM testtable;
                 END;`

  const options = {
    bindDefs: [
      { type : oracledb.NUMBER, dir : oracledb.BIND_OUT }
    ]
  };

  const numIterations = 8;

  const result = await connection.executeMany(plsql, numIterations, options);

  console.log(result.outBinds);

Output would be an array of eight values such as::

  [ [ 6 ], [ 10 ], [ 15 ], [ 21 ], [ 28 ], [ 36 ], [ 45 ], [ 55 ] ]

.. _executemanyobjects:

Binding Objects with ``executeMany()``
======================================

You can use ``executeMany()`` with :ref:`Oracle Database
objects <objects>`. For example, given a procedure ``myproc`` that
accepts and returns a RECORD:

.. code:: sql

  CREATE OR REPLACE PACKAGE rectest AS
     TYPE rectype IS RECORD (name VARCHAR2(40), pos NUMBER);
     PROCEDURE myproc (p_in IN rectype, p_out OUT rectype);
  END rectest;
  /

This can be called like:

.. code:: javascript

  const RectypeClass = await connection.getDbObjectClass("RECTEST.RECTYPE");

  const plsql = `CALL rectest.myproc(:inbv, :outbv)`;

  // Input data
  binds = [
    { inbv: { NAME: 'Car', POS: 56 } },
    { inbv: { NAME: 'Train', POS: 78 } },
    { inbv: { NAME: 'Bike', POS: 83 } }
  ];

  options = {
    bindDefs: {
      inbv: { type: RectypeClass },
      outbv: { type: RectypeClass, dir: oracledb.BIND_OUT },
    }
  };

  result = await connection.executeMany(plsql, binds, options);
  for (const b of result.outBinds) {
    console.log(b.outbv);
  }

Each value to be bound to ``inbv`` is a record’s data. The attribute
names correspond to the attributes of the PL/SQL record type using
Oracle Database’s standard casing rules. Since ``rectype`` was created
with case insensitive names, these are represented as uppercase
attribute names in the JavaScript objects

See `examples/plsqlrecord.js <https://github.com/oracle/node-oracledb/tree/
main/examples/plsqlrecord.js>`__ for a runnable sample.
