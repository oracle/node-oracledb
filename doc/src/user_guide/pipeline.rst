.. _pipelining:

******************************
Pipelining Database Operations
******************************

Pipelining allows an application to send multiple, independent statements to
Oracle Database with one call. The database can be kept busy without waiting
for the application to receive a result set and send the next statement. While
the database processes the pipeline of statements, the application can continue
with non-database work. When the database has executed all the pipelined
operations, their results are returned to the application.

Pipelined operations are executed sequentially by the database. They do not
execute concurrently. It is local tasks that can be executed at the same time
the database is working.

Effective use of Oracle Database Pipelining can increase the responsiveness
of an application and improve overall system throughput. Pipelining is useful
when many small operations are being performed in rapid succession. It is most
beneficial when the network to the database is slow. Compared with executing
the equivalent SQL statements individually with calls like
:meth:`connection.execute()`, pipelining allows an application to send
multiple requests to the database without waiting for the response from each
individual operation before sending the next one. The database processes the
queued operations sequentially, reducing client wait time and network latency
overhead.

See `Oracle Database Pipelining <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-D131842B-354E-431D-A1B3-26A001289806>`__ for more information.

.. note::

    True pipelining only occurs when you are connected to Oracle AI Database
    26ai (or later) using node-oracledb Thin mode.

    When you use node-oracledb Thick mode or connect to an older Oracle
    Database version, operations are sequentially executed by node-oracledb.
    Each operation concludes before the next is sent to the database. Requests
    are not queued on the database server, so the latency and throughput
    benefits of true pipelining are not available. This approach is
    recommended for code portability when upgrading to a latest database
    version that supports pipelining.

Using Pipelines
===============

To create a pipeline to process a set of database operations, use the
:ref:`Pipeline class <pipelineclass>`. For example:

.. code-block:: javascript

    const pipeline = new oracledb.Pipeline();

You can then add various operations to the pipeline using
:meth:`~pipeline.addCommit()`, :meth:`~pipeline.addExecute()`,
:meth:`~pipeline.addExecuteMany()`, :meth:`~pipeline.addFetchAll()`,
:meth:`~pipeline.addFetchMany()`, and :meth:`~pipeline.addFetchOne()`. For
example:

.. code-block:: javascript

    pipeline.addExecute(`INSERT INTO mytable (mycol) VALUES (1234)`);
    pipeline.addFetchOne(`SELECT user FROM dual`);
    pipeline.addFetchMany(`SELECT employee_id FROM employees`, [], {}, 20);

Note that do not call :meth:`pipeline.addExecute()` for queries that return
results. Instead use :meth:`~pipeline.addFetchAll()`,
:meth:`~pipeline.addFetchMany()`, or :meth:`~pipeline.addFetchOne()`.

Only one set of query results can be returned from each query operation. For
example :meth:`~pipeline.addFetchMany()` will only fetch the first set of
query records, up to the limit specified by the method's ``numRows`` parameter
(that is, 20 here). Similarly, for :meth:`~pipeline.addFetchOne()` only the
first row can ever be fetched. It is not possible to fetch more data from these
operations. To prevent the database processing rows that cannot be fetched by
the application, consider adding appropriate ``WHERE`` conditions or using a
``FETCH NEXT`` clause in the statement, see :ref:`Limiting Rows <pagingdata>`.

Query results or :ref:`OUT binds <outbind>` from one operation cannot be
passed to subsequent operations in the same pipeline.

To execute the pipeline, call :meth:`connection.runPipeline()`.

.. code-block:: javascript

    const results = await connection.runPipeline(pipeline);

The operations are sent to the database without waiting for the response from
each operation. The database queues and executes them sequentially. The method
returns an array of results in the pipeline operation order. Each entry in the
array corresponds to an operation executed in the pipeline. The array contains
information about the execution of the relevant operation, such as any error
number, PL/SQL function return value, or any query rows and column metadata.

The :attr:`connection.callTimeout` value has no effect on pipeline operations.

To tune fetching of rows with :meth:`pipeline.addFetchAll()`, set
:attr:`oracledb.fetchArraySize` or pass the ``fetchArraySize`` parameter.

Note that binds that use :ref:`Oracle Database Object <dbobjectclass>` types
are not supported in pipeline mode. :ref:`OpenTelemetry <opentelemetry>`
tracing is not supported for pipeline execution.

Pipelining Example
------------------

An example of pipelining is:

.. code-block:: javascript

    // Create a pipeline
    const pipeline = new oracledb.Pipeline();

    // Define number of rows to be fetched
    const numRows = 5;

    // Define the operations in the pipeline
    pipeline.addFetchOne(`SELECT first_name FROM employees WHERE employee_id = 112`);
    pipeline.addFetchAll(`SELECT first_name FROM employees`);
    pipeline.addFetchMany(`SELECT last_name FROM employees ORDER BY employee_id`, [], {}, numRows);
    pipeline.addExecute(`INSERT INTO employees (first_name, last_name) VALUES (:1, :2)`, ["John", "Doe"]);
    pipeline.addCommit();

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // contains the hr schema password
        connectString : "localhost/FREEPDB1"
    });

    // Run the operations in the pipeline
    const results = await connection.runPipeline(pipeline);
    console.log(results[0].rows);
    console.log(results[1].rows);
    console.log(results[2].rows);

    await connection.close();

Using OUT and IN OUT Binds with Pipelines
=========================================

:ref:`OUT and IN OUT binds <outbind>` can be defined directly in the bind
parameters passed to :meth:`pipeline.addExecute()`. After
:meth:`connection.runPipeline()` completes, the returned values are available
in the :ref:`outBinds <resultobjrunpipeline>` property of its corresponding
result entry. For example:

.. code-block:: javascript

    const pipeline = new oracledb.Pipeline();
    pipeline.addExecute(
      `BEGIN
        :b1 := 1234;
        :b2 := 'Node.js';
       END;`,
      {
        b1: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        b2: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20 }
      }
    );

    pipeline.addFetchOne(`SELECT user FROM dual`);

    const results = await connection.runPipeline(pipeline);

    console.log(results[0].outBinds.b1);      // 1234
    console.log(results[0].outBinds.b2);      // 'Node.js'
    console.log(results[1].rows);

This prints::

    1234
    Node.js
    [ [ 'HR' ] ]

Pipeline Error Handling
=======================

The ``continueOnError`` parameter of :meth:`connection.runPipeline()`
determines whether subsequent operations should continue to run after a failure
in one operation has occurred. When set to the default value *false*, if any
error is returned in any operation in the pipeline then the database terminates
all subsequent operations.

For example:

.. code-block:: javascript

    // Continue on error set to default value false

    pipeline.addFetchAll(`SELECT 1234 FROM does_not_exist`);
    pipeline.addFetchOne(`SELECT 5678 FROM dual`);

    const results = await connection.runPipeline(pipeline);

will only execute the first operation and will throw the failure message::

    oracledb.exceptions.DatabaseError: ORA-00942: table or view "HR"."DOES_NOT_EXIST" does not exist
    Help: https://docs.oracle.com/error-help/db/ora-00942/

whereas this code:

.. code-block:: javascript

    // Continue on error

    pipeline.addFetchAll(`SELECT 1234 FROM does_not_exist`);
    pipeline.addFetchOne(`SELECT 5678 FROM dual`);

    const results = await connection.runPipeline(pipeline, true);
    console.log(results);

will execute all operations and will display::

    [
      {
        error: Error: ORA-00942: table or view "SCOTT"."DOES_NOT_EXIST" does not exist
        Help: https://docs.oracle.com/error-help/db/ora-00942/
            at Protocol._raiseException .....(full error stack trace) {
           offset: 17,
           errorNum: 942,
           isRecoverable: false,
           code: 'ORA-00942'
        }
    },
    { metaData: [
        {
          name: '5678',
          dbColumnName: '5678',
          nullable: true,
          dbType: [DbType DB_TYPE_NUMBER],
          isJson: false,
          isOson: false,
          precision: 0,
          scale: -127,
          dbTypeName: 'NUMBER',
          fetchType: [DbType DB_TYPE_NUMBER],
          converter: [Function: converter]
        }
     ],
     rows: [ [ 5678 ] ] }
    ]

.. _pipelinewarning:

**PL/SQL Compilation Warnings**

:ref:`plsqlcompwarnings` can be identified by checking the ``warning``
property of the :ref:`result object <runpipelineresultobj>` in
:meth:`connection.runPipeline()`. For example:

.. code-block:: javascript

    pipeline.addExecute(
        `CREATE OR REPLACE PROCEDURE myproc AS
        BEGIN
            INVALID
        END;`);

    const results = await connection.runPipeline(pipeline);
    console.log(results[0].warning);

will print::

    NJS-700: creation succeeded with compilation errors

**Retry Behavior in True Pipelining**

In true pipelining, some operations may behave differently because internal
message retry is disabled, which can affect error handling behavior.

When using :meth:`connection.execute()`, node-oracledb Thin mode may retry
certain queries in cases such as a bind-type mismatch (for example,
ORA-00932), by clearing the cached statement and re-executing it. With true
pipelining, the retry does not occur because it would require an additional
round-trip. Instead, the operation returns the error, or
:meth:`connection.runPipeline()` raises it if ``continueOnError`` is set to
*false*. For example:

.. code-block:: javascript

    const sql = 'SELECT :1 FROM DUAL';

    await connection.execute(sql, [2]);

    const date = new Date();
    const pipeline = new oracledb.Pipeline();
    pipeline.addFetchOne(sql, [date]); // returns ORA-00932 in true pipelining
    pipeline.addFetchOne(sql, [1]);

    const results = await conn.runPipeline(pipeline, true);

Pipeline Wait Time and Round-trips
==================================

Pipelined operations are executed sequentially by the database. The key
benefit of pipelining is that multiple requests can be sent without waiting
for individual responses. This allows the application to issue several
requests in succession while the database processes them continuously,
eliminating the need to wait for a round trip after each request.

Some operations may still require additional client-database exchanges such
as:

- Queries that contain :ref:`LOBs <lobclass>`
- Queries with :meth:`~pipeline.addFetchAll()`
- PL/SQL blocks that require additional execute processing

Note that the traditional method of monitoring round-trips by taking snapshots
of the V$SESSTAT view is not accurate for pipelines.
