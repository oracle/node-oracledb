.. _programstyles:

**************************************************
Node.js Programming Styles and Resource Management
**************************************************

Node-oracledb supports :ref:`callbacks <callbackoverview>`,
:ref:`Promises <promiseoverview>`, and :ref:`Async/Await <asyncawaitoverview>`
Node.js styles of programming. The latter is recommended.
:ref:`Explicit Resource Management <explicitresourcemgmtoverview>` is also
supported for :ref:`Connection <connectionclass>`, :ref:`Pool <poolclass>` and
:ref:`Resultset <resultsetclass>` objects from node-oracledb version 7.0
onwards.

.. _asyncawaitoverview:

Using Node.js Async/Await with node-oracledb
============================================

Node.js supports async functions, also known as Async/Await. These
can be used with node-oracledb. For example:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ... // the hr schema password

    function getEmployee(empid) {
        return new Promise(async function(resolve, reject) {
            let connection;

            try {
                connection = await oracledb.getConnection({
                    user          : "hr",
                    password      : mypw,
                    connectString : "localhost/FREEPDB1"
                });

                const result = await connection.execute(
                 `SELECT * FROM employees WHERE employee_id = :bv`,
                 [empid]
                );
                resolve(result.rows);

            } catch (err) { // catches errors in getConnection and the query
                reject(err);
            } finally {
                if (connection) {   // the connection assignment worked, must release
                    try {
                        await connection.release();
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        });
    }

    async function run() {
        try {
            const res = await getEmployee(101);
            console.log(res);
        } catch (err) {
            console.error(err);
        }
    }

    run();

If you are using :ref:`Lob instances <lobclass>` for LOB data, then the
Lobs must be streamed since there is no Promisified interface for them.
Alternatively you can work with the data directly as Strings or Buffers.

.. _promiseoverview:

Using Node.js Promises with node-oracledb
=========================================

Node-oracledb supports Promises with all asynchronous methods. The
native Promise implementation is used.

If an asynchronous method is invoked without a callback, it returns a
Promise:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ... // the user password

    oracledb.getConnection(
      {
        user          : "hr",
        password      : mypw,
        connectString : "localhost/FREEPDB1"
      })
    .then(function(connection) {
        return connection.execute(
         `SELECT department_id, department_name
          FROM departments
          WHERE manager_id < :id`,
         [110]  // bind value for :id
        )
        .then(function(result) {
            console.log(result.rows);
            return connection.close();
        })
        .catch(function(err) {
            console.error(err);
            return connection.close();
        });
    })
    .catch(function(err) {
        console.error(err);
    });

With Oracle’s sample HR schema, the output is::

    [ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]

Notice there are two promise “chains”: one to get a connection and the
other to use it. This is required because it is only possible to refer
to the connection within the function to which it was passed.

When invoking asynchronous methods, it is possible to accidentally get a
Promise by forgetting to pass a callback function:

.. code-block:: javascript

    oracledb.getConnection(
      {
        user          : "hr",
        password      : mypw,
        connectString : "localhost/WRONG_SERVICE_NAME"
      });
    . . .

Since the returned promise will not have a catch block, as the intention
was to use the callback programming style, any rejections that occur
will go unnoticed. Node.js 4.0 added the ``unhandledRejection`` event to
prevent such rejections from going unnoticed:

.. code-block:: javascript

    process.on('unhandledRejection', (reason, p) => {
        console.error("Unhandled Rejection at: ", p, " reason: ", reason);
        // application specific logging, throwing an error, or other logic here
    });

    oracledb.getConnection(
      {
        user          : "hr",
        password      : mypw,
        connectString : "localhost/WRONG_SERVICE_NAME"
      });
    . . .

Whereas the code without the ``unhandledRejection`` exception silently
exited, adding the handler could, for example, show::

    $ node myapp.js
    Unhandled Rejection at:  Promise {
        <rejected> [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
    ] }  reason:  [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
    ]

.. _custompromises:

Custom Promise Libraries
------------------------

From node-oracledb 5.0, custom Promise libraries can no longer be used.
Use the native Node.js Promise implementation instead.

.. _callbackoverview:

Using Node.js Callbacks with node-oracledb
==========================================

Node-oracledb supports callbacks.

.. code-block:: javascript

    // myscript.js

    const oracledb = require('oracledb');

    const mypw = ...  // set mypw to the hr schema password

    oracledb.getConnection(
      {
            user          : "hr",
            password      : mypw
            connectString : "localhost/FREEPDB1"
      },
      function(err, connection) {
        if (err) {
            console.error(err.message);
            return;
        }
        connection.execute(
         `SELECT manager_id, department_id, department_name
          FROM departments
          WHERE manager_id = :id`,
         [103],  // bind value for :id
         function(err, result) {
            if (err) {
                console.error(err.message);
                doRelease(connection);
                return;
            }
            console.log(result.rows);
            doRelease(connection);
        });
    });

    function doRelease(connection) {
        connection.close(
          function(err) {
            if (err)
            console.error(err.message);
          });
    }

With Oracle’s sample HR schema, the output is::

    [ [ 103, 60, 'IT' ] ]

.. _explicitresourcemgmtoverview:

Using Node.js Explicit Resource Management with node-oracledb
=============================================================

Node-oracledb supports Node.js `Explicit Resource Management <https://tc39.es/
proposal-explicit-resource-management/>`__ which enables an application to
automatically manage clean up of resources when they are no longer needed.
This helps prevent memory leaks and eliminates the need for repetitive
"try...finally" blocks.

Explicit resource management was introduced in Node.js version 24 and is
available for :ref:`Connection <connectionclass>`, :ref:`Pool <poolclass>`,
and :ref:`Resultset <resultsetclass>` objects from node-oracledb 7.0 onwards.

To use explicit resource management, you must use the ``await using`` syntax
in your code. Using a standalone connection, for example:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ... // the hr schema password

    async function(run){
        await using connection = await oracledb.getConnection({
            user : "hr",
            password: mypw,
            connectString : "localhost/FREEPDB1"
        });

        const { resultSet } = await connection.execute(
            `SELECT department_id, department_name FROM departments
             ORDER BY department_id`,
            [], // no bind variables
            {
              resultSet: true,
            }
        );

        await using rs = resultSet;
        let row;
        let i = 1;

        while ((row = await rs.getRow())) {
          console.log("getRow(): row " + i++);
          console.log(row);
        }
    }
    run();

See `resourceMgmt.js <https://github.com/oracle/node-oracledb/tree/main/
examples/resourceMgmt.js>`__ for a runnable example.

For connection pools, it is recommended to also create connections with the
``await using`` syntax. This will ensure that there are no busy or leaked
connections when the connection pool goes out of scope. An example of using
explicit resource management with a connection pool is shown below:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ... // the hr schema password

    async function(run){
        await using pool = await oracledb.createPool({
            user : "hr",
            password: mypw,
            connectString : "localhost/FREEPDB1",
            poolMin: 1,
            poolMax: 5
        });

        await using connection = await pool.getConnection();

        const { resultSet } = await connection.execute(
            `SELECT department_id, department_name FROM departments
             ORDER BY department_id`,
            [], // no bind variables
            {
              resultSet: true,
            }
        );

        await using rs = resultSet;
        let row;
        let i = 1;

        while ((row = await rs.getRow())) {
          console.log("getRow(): row " + i++);
          console.log(row);
        }
    }
    run();
