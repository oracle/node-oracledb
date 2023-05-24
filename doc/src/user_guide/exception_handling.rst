.. _exceptions:

**************
Error Handling
**************

When using :ref:`Promises <promiseoverview>` or
:ref:`Async/Await <asyncawaitoverview>`, the ``catch()`` error object will
contain error information when a failure occurs. See :ref:`errorobj` for
information about the properties.

Applications can catch exceptions as needed. For example, when trying to query
a table that does not exist:

.. code:: javascript

    try {
            const sql = `SELECT * FROM DOESNOTEXIST`;
            result = await connection.execute(sql);
            return result;
    } catch (err) {
            console.error(err);
    }

If this was in a file called test.js, the displayed error would be like::

    Error: ORA-00942: table or view does not exist
        . . .
        at async run (/Users/cjones/test.js:19:5) {
     offset: 14,
     errorNum: 942,
     code: 'ORA-00942'
    }

If you are using the callback programming style, the first parameter of the
callback is an *Error* object that contains error information if the call
fails. If the call succeeds, then the object is null.

If an invalid value is set for a node-oracledb class attribute, then an error
occurs. The same is true for invalid operations on read-only or write-only
properties. If an unrecognized property name is used, it will be
ignored.

.. _connectionid:

Connection Identifiers
======================

Some Oracle Network errors contain connection identifiers (``CONNECTION_ID``)
which uniquely identifies a connection in the trace and logs. With the
connection identifier, you can correlate diagnostics and resolve
connectivity errors. For example::

    NJS-501: connection to host dbhost.example.com port 1521 terminated unexpectedly.
    (CONNECTION_ID=4VIdFEpcSe3gU+FoRmR0aA==)

See `Troubleshooting Oracle Net Services <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-3F42D057-C9AC-4747-B48B-5A5FF7672E5D>`_ for more
information on connection identifiers.

.. _stacktrace:

Increasing the Stack Trace Limit
================================

When you encounter an error in your Node.js application, a stack trace is
generated. By default, Node.js displays a total of 10 error frames in the
stack trace.

If this stack trace is not enough to show the application's error line, you
can increase the stack trace limit with the ``Error.stackTraceLimit``
property, for example:

.. code-block:: javascript

    Error.stackTraceLimit = 50;

    const oracledb = require('oracledb');
    const mypw = ...  // set mypw to the hr schema password

    async function run() {
    try {
            connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,
            connectString : "localhost/FREEPDB1"
        });
        result = await connection.execute(`SELECT last_name FROM employees`);
        console.log("Result is:", result);
    }

.. _errordiff:

Errors in Thin and Thick Modes
==============================

In node-oracledb:

- The error prefix ``ORA`` is used by errors generated in the Oracle Database,
  and also from the Oracle Call Interface (OCI) libraries used by Thick mode.

- The error prefix ``NJS`` is used by errors generated in the node-oracledb
  implementation.

- The error prefix ``DPI`` is used by errors generated in the
  `ODPI-C <https://oracle.github.io/odpi/>`__ code used by Thick mode.

The Thin and Thick modes of node-oracledb return some errors differently. Some
differences are shown in the examples below:

* Connection messages: The node-oracledb Thin mode connection and networking
  is handled by Node.js itself. Some errors portable accross operating systems
  and Node.js versions have NJS-prefixed errors displayed by node-oracledb.
  Other messages are returned directly from Node.js and may vary accordingly.
  The traditional Oracle connection errors with prefix "ORA" are not shown. For
  example, the scenarios detailed below show how the connection and network
  error messages might differ between the node-oracledb Thin and Thick modes.

  * Scenario 1: The given host does not have a database listener running.

    node-oracledb Thin mode Error::

      NJS-511: connection to listener at host dbhost.example.com port 1521 was refused.
      (CONNECTION_ID=4VIdFEpcSe3gU+FoRmR0aA==)
      Cause: The connection request could not be completed because the database listener
      process is not running.

    node-oracledb Thick mode Error may be::

      ORA-12541: TNS:no listener

  * Scenario 2: The requested connection alias was not found in the tnsnames.ora file.

    node-oracledb Thin mode Error::

      NJS-517: cannot connect to Oracle Database. Unable to find "sales" in
      "/u01/app/oracle/product/21.3.0/dbhome_1/network/admin/tnsnames.ora"

    node-oracledb Thick mode Error may be::

      ORA-12154: TNS:could not resolve the connect identifier specified

  * Scenario 3: The Oracle Database listener does not know of the requested
    service name.

    node-oracledb Thin mode Error::

      NJS-518: cannot connect to Oracle Database. Service
      "sales_service.example.com" is not registered with the listener at
      host dbhost.example.com port 1521. (CONNECTION_ID=4VIdFEpcSe3gU+FoRmR0aA==)

    node-oracledb Thick mode Error may be::

      ORA-12514: TNS:listener does not currently know of service requested in
      connect descriptor

* Connection Pooling: The node-oracledb Thin mode pool is not based on the
  Oracle Call Interface (OCI) Session Pool and has its own NJS messages.

* Binding: When binding is incorrect, the node-oracledb Thick mode may
  generate an Oracle Client library error such as::

    ORA-01008: not all variables bound

  In contrast, the node-oracledb Thin mode might generate::

    NJS-097: no bind placeholder named ":USER1" was found in the SQL text
