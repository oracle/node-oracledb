.. _endtoend:

**************************
Tracing with node-oracledb
**************************

.. _applntracing:

Application Tracing
===================

There are multiple approaches for application tracing and monitoring:

- :ref:`End-to-end database tracing <endtoendtracing>` attributes such as
  :attr:`connection.action` and :attr:`connection.module` are supported in the
  node-oracledb Thin and Thick modes. Using these attributes is recommended
  as they aid application monitoring and troubleshooting.

- The Java Debug Wire Protocol (JDWP) for debugging PL/SQL can be used. See
  :ref:`jdwp`.

- Instrumentation libraries such as OpenTelemetry allow sophisticated
  monitoring. See :ref:`opentelemetry`.

- Node-oracledb in Thick mode can dump a trace of SQL statements executed. See
  :ref:`tracingsql`.

- Node-oracledb in Thin and Thick modes can trace bind data values used in
  statements executed. See :ref:`tracingbind`.

- The unique connection identifiers that appear in connection error messages,
  and in Oracle Database traces and logs, can be used to resolve connectivity
  errors. See :ref:`connectionid`.

- The stack trace limit can be increased to help you understand the reason
  for the error. See :ref:`stacktrace`.

Oracle Database has a number of tracing capabilities and controls,
including the `DBMS_MONITOR <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-951568BF-D798-4456-8478-15FEEBA0C78E>`__
package.

PL/SQL users may be interested in using `PL/Scope <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-24109CB5-7BB9-48B2-AD7A-39458AA13C0C>`__.

.. _endtoendtracing:

End-to-End Tracing, Mid-tier Authentication, and Auditing
---------------------------------------------------------

Oracle Database end-to-end application tracing simplifies diagnosing
application code flow and performance problems in multi-tier or multi-user
environments.

The Connection properties :attr:`~connection.action`,
:attr:`~connection.module`, :attr:`~connection.clientId`,
:attr:`~connection.clientInfo`, :attr:`~connection.ecId`, and
:attr:`~connection.dbOp` set metadata for `end-to-end tracing
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-246A5A52-E666
-4DBC-BDF6-98B83260A7AD>`__. The values can be tracked in database views,
shown in audit trails, and seen in tools such as Enterprise Manager.

Also see :ref:`appcontext` for information about setting Application Contexts.

Applications should set the properties because they can greatly help
troubleshooting. They can help identify and resolve unnecessary database
resource usage, or improper access.

The :attr:`connection.clientId` property can also be used by applications that
do their own mid-tier authentication but connect to the database using the one
database schema. By setting ``clientId`` to the application’s
authenticated user name, the database is aware of who the actual end user is.
This can, for example, be used by Oracle `Virtual Private
Database <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
4F37BAE5-CA2E-42AC-9CDF-EC9181671FFE>`__ policies to automatically restrict
data access by that user. Oracle Database’s `DBMS_MONITOR
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-951568BF-D798-4456-8478-15FEEBA0C78E>`__ package can take advantage of
the client identifer to enable statistics and tracing at an individual level.

The attributes are set on a :attr:`connection <oracledb.connectionClass>`
object and sent to the database on the next :ref:`round-trip <roundtrips>`
from node-oracledb, for example, with ``execute()``:

.. code-block:: javascript

    const connection = await oracledb.getConnection(
      {
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1"
      }
    );

    connection.clientId = "Chris";
    connection.clientInfo = "My demo application";
    connection.module = "End-to-end example";
    connection.action = "Query departments";
    connection.dbOp   = "Billing"

    const result = await connection.execute(`SELECT . . .`);

While the connection is open, the attribute values can be seen, for
example with SQL*Plus::

    SQL> SELECT username, client_identifier, client_info, action, module
         FROM v$session WHERE username = 'HR';

    USERNAME   CLIENT_IDENTIFIER    CLIENT_INFO            ACTION               MODULE
    ---------- -------------------- ---------------------- -------------------- --------------------
    HR         Chris                My demo application    Query departments    End-to-end example

The value of :attr:`connection.dbOp` will be shown in the ``DBOP_NAME``
column of the `V$SQL_MONITOR <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-79E97A84-9C27-4A5E-AC0D-C12CB3E748E6>`__ view:::

    SQL> SELECT dbop_name FROM v$sql_monitor;
    DBOP_NAME
    ------------------------------
    Billing
    . . .

Other ways to access metadata include querying ``V$SQLAREA`` and
``sys_context()``, for example
``SELECT SYS_CONTEXT('userenv', 'client_info') FROM dual``.

Metadata values can also be manually set by calling
`DBMS_APPLICATION_INFO <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-14484F86-44F2-4B34-B34E-0C873D323EAD>`__ procedures or
`DBMS_SESSION.SET_IDENTIFIER <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-988EA930-BDFE-4205-A806-E54F05333562>`__.
However, these cause explicit :ref:`round-trips <roundtrips>`, reducing
scalability.

Applications should be consistent about how, and when, they set the
end-to-end tracing attributes so that current values are recorded by the
database.

Idle connections released back to a connection pool will retain the
previous attribute values of that connection. This avoids the overhead
of a round-trip to reset the values. After getting a connection from a
pool, an application that uses end-to-end tracing should set new values
appropriately.

When a Connection object is displayed, such as with ``console.log()``,
the end-to-end tracing attributes will show as ``null`` even if values
have been set and are being sent to the database. This is for
architectural, efficiency and consistency reasons. When an already
established connection is retrieved from a local pool, node-oracledb is
not able to efficiently retrieve values previously established in the
connection. The same occurs if the values are set by a call to PL/SQL
code - there is no efficient way for node-oracledb to know the values
have changed.

The attribute values are commonly useful to DBAs. However, if knowing
the current values is useful in an application, the application should
save the values as part of its application state whenever the
node-oracledb attributes are set. Applications can also find the current
values by querying the Oracle data dictionary or using PL/SQL procedures
such as ``DBMS_APPLICATION_INFO.READ_MODULE()`` with the understanding
that these require round-trips to the database.

.. _jdwp:

Debugging PL/SQL with the Java Debug Wire Protocol
--------------------------------------------------

The Java Debug Wire Protocol (JDWP) for debugging PL/SQL can be used with
node-oracledb.

Node-oracledb applications that call PL/SQL can step through that PL/SQL code
using JDWP in a debugger. This allows Node.js and PL/SQL code to be debugged
in the same debugger environment. You can enable PL/SQL debugging in
node-oracledb as follows:

- In node-oracledb Thin or Thick modes, set the ``ORA_DEBUG_JDWP``
  environment variable to `host=hostname;port=portnum` indicating where the
  PL/SQL debugger is running. Then run the application.

- In node-oracledb Thin mode, you can alternatively set the connection
  parameter ``debugJdwp`` during connection. This variable defaults to the
  value of the ``ORA_DEBUG_JDWP`` environment variable.

See the documentation on `DBMS_DEBUG_JDWP <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-AFF566A0-9E90-4218-B5C6-A74C3BF1CE14>`_, the video
`PL/SQL debugging with Visual Studio and Visual Studio Code <https://www.
youtube.com/watch?v=wk-3hLe30kk>`_, and the blog post `Debugging PL/SQL with
Visual Studio Code (and more) <https://medium.com/oracledevs/debugging-pl-sql-
with-visual-studio-code-and-more-45631f3952cf>`_.

.. _tracingsql:

Tracing Executed Statements
---------------------------

Database statement tracing is commonly used to identify performance
issues. Oracle Database trace files can be analyzed after statements are
executed. Tracing can be enabled in various ways at a database system or
individual session level. Refer to `Oracle Database Tuning documentation
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=TGSQL>`__.
Setting a customer identifier is recommended to make searching for
relevant log files easier::

    ALTER SESSION SET tracefile_identifier='My-identifier' SQL_TRACE=TRUE

The Thick mode of node-oracledb is implemented using the `ODPI-C <https://
oracle.github.io/odpi>`__ wrapper on top of the Oracle Client libraries. The
ODPI-C tracing capability can be used to log executed node-oracledb statements
to the standard error stream. Before executing Node.js, set the environment
variable ``DPI_DEBUG_LEVEL`` to 16.

At a Windows command prompt, this could be done with::

    set DPI_DEBUG_LEVEL=16

On Linux, you might use::

    export DPI_DEBUG_LEVEL=16

After setting the variable, run the Node.js Script, for example on Linux::

    node end-to-endtracing.js 2> log.txt

For an application that does a single query, the log file might contain a
tracing line consisting of the prefix 'ODPI', a thread identifier, a timestamp,
and the SQL statement executed::

    ODPI [6905309] 2017-09-13 09:02:46.140: SQL select sysdate from dual where :b = 1

See `ODPI-C Debugging <https://oracle.github.io/odpi/doc/user_guide/debugging.
html>`__ for documentation on ``DPI_DEBUG_LEVEL``.

.. _connectionid:

Using Connection Identifiers
----------------------------

A unique connection identifier (``CONNECTION_ID``) is generated for each
connection to the Oracle Database. The connection identifier is shown in some
Oracle Network error messages and logs, which helps in better tracing and
diagnosing of connection failures. For example::

    NJS-501: connection to host dbhost.example.com port 1521 terminated unexpectedly.
    (CONNECTION_ID=4VIdFEpcSe3gU+FoRmR0aA==)

Depending on the Oracle Database version in use, the information that is shown
in logs varies.

You can define a prefix value which is added to the beginning of the
``CONNECTION_ID`` value. This prefix aids in identifying the connections from a
specific application.

See `Troubleshooting Oracle Net Services <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-3F42D057-C9AC-4747-B48B-5A5FF7672E5D>`_ for more
information on connection identifiers.

**Node-oracledb Thin mode**

In node-oracledb Thin mode, you can specify a prefix using the
``connectionIdPrefix`` parameter when creating
:meth:`standalone connections <oracledb.getConnection()>` or
:meth:`pooled connections <oracledb.createPool()>`. For example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
      user          : "hr",
      password      : mypw,  // contains the hr schema password
      connectString : "localhost/orclpdb",
      connectionIdPrefix: "MYAPP"
    });

If this connection to the database fails, ``MYAPP`` is added as a prefix to the
``CONNECTION_ID`` value shown in the error message, for example::

    NJS-501: connection to host dbhost.example.com port 1521 terminated unexpectedly.
    (CONNECTION_ID=MYAPP4VIdFEpcSe3gU+FoRmR0aA==)

**Node-oracledb Thick mode**

In node-oracledb Thick mode, you can specify the connection identifier prefix
in the connection string or connect descriptor. For example::

    mydb = (DESCRIPTION =
             (ADDRESS_LIST= (ADDRESS=...) (ADDRESS=...))
             (CONNECT_DATA=
                (SERVICE_NAME=sales.us.example.com)
                (CONNECTION_ID_PREFIX=MYAPP)
             )
           )

.. _tracingbind:

Tracing Bind Values
-------------------

Sometimes it is useful to trace the bind data values that have been used
when executing statements. Several methods are available.

In the Oracle Database, the view `V$SQL_BIND_CAPTURE <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-D353F4BE-5943-4F5B-A99B-BC9505E9579C>`__
can capture bind information. Tracing with Oracle Database’s
`DBMS_MONITOR.SESSION_TRACE_ENABLE() <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-C9054D20-3A70-484F-B11B-CC591A10D609>`__
may also be useful.

You can also write your own wrapper around ``execute()`` and log any
parameters.

OpenTelemetry can also be used to trace bind values. See :ref:`opentelemetry`.

.. _dbviews:

Database Views for Tracing node-oracledb
----------------------------------------

This section shows some of the Oracle Database views useful for tracing and
monitoring node-oracledb. Other views and columns not described here also
contain useful information, such as the views discussed in
:ref:`endtoendtracing` and :ref:`tracingbind`.

``V$SESSION``
+++++++++++++

The following table list sample values for some `V$SESSION
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-28E2DC75-E157-
4C0A-94AB-117C205789B9>`__ columns. You may see other values if you have set
the equivalent connection or pool creation parameters, or set the attribute
:attr:`connection.module` as shown in :ref:`endtoendtracing`.

.. list-table-with-summary:: Sample V$SESSION column values
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 10 15 15
    :name: V$SESSION_COLUMN_VALUES
    :summary: The first column is the name of the column. The second column lists a sample node-oracledb Thick mode value. The third column lists a sample node-oracledb Thin mode value.

    * - Column
      - Sample Thin mode value
      - Sample Thick mode value
    * - MACHINE
      - "myusername-mac"
      - "myusername-mac"
    * - MODULE
      - `node`
      - Similar to `node@myuser-mac2 (TNS V1-V3)`
    * - OSUSER
      - "myusername"
      - "myusername"
    * - PROGRAM
      - `node`
      - Similar to `node@myuser-mac2 (TNS V1-V3)`
    * - TERMINAL
      - "unknown"
      - Similar to `ttys001`

``V$SESSION_CONNECT_INFO``
++++++++++++++++++++++++++

The following table shows sample values for some `V$SESSION_CONNECT_INFO
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9F0DCAEA-A67E-
4183-89E7-B1555DC591CE>`__ columns. You may see other values if you have set
the equivalent connection or pool creation parameters, or set the
``driverName`` parameter in :meth:`oracledb.initOracleClient()`.

.. list-table-with-summary:: Sample V$SESSION_CONNECT_INFO column values
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 10 15 15
    :name: V$SESSION_CONNECT_INFO
    :summary: The first column is the name of V$SESSION_CONNECT_INFO view's column. The second column lists a sample node-oracledb Thick mode value. The third column list a sample node-oracledb Thin mode value.

    * - Column
      - Sample Thin Mode Value
      - Sample Thick Mode Value
    * - CLIENT_DRIVER
      - "node-oracledb thn : 6.9.0"
      - "node-oracledb thk : 6.9.0"
    * - CLIENT_OCI_LIBRARY
      - "Unknown"
      - The Oracle Client or Instant Client type, such as "Full Instant Client"
    * - CLIENT_VERSION
      - "6.9.0.0.0" (the node-oracledb version number with an extra .0.0)
      - The Oracle Client library version number
    * - OSUSER
      - "myusername"
      - "myusername"

.. _vsessconinfo:

Finding the node-oracledb Mode
==============================

You can find the current mode of the node-oracledb driver using the boolean
attribute :attr:`oracledb.thin`. The boolean attributes
:attr:`connection.thin` and :attr:`pool.thin` can be used to show the current
mode of a node-oracledb connection or pool, respectively. The node-oracledb
version can be shown with :attr:`oracledb.version`.

The information can also be seen in the Oracle Database data dictionary table
`V$SESSION_CONNECT_INFO <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__:

.. code-block:: javascript

    const result = await connection.execute(
      `SELECT UNIQUE CLIENT_DRIVER FROM V$SESSION_CONNECT_INFO WHERE
       SID = SYS_CONTEXT('USERENV', 'SID')`)

In the node-oracledb Thin mode, the output will be::

    node-oracledb thn : 6.0.0

In the node-oracledb Thick mode, the output will be::

    node-oracledb thk : 6.0.0

Database Administrators (DBAs) can verify whether applications are
using the desired add-on version. For example::

    SQL> SELECT UNIQUE sid, client_driver
         FROM v$session_connect_info
         WHERE client_driver LIKE 'node-oracledb%'
         ORDER BY sid;

        SID CLIENT_DRIVER
    ---------- ------------------------------
        16 node-oracledb thn : 6.0.0
        33 node-oracledb thk : 6.0.0


If you are using the node-oracledb Thick mode, the ``CLIENT_DRIVER`` value
can be configured with a call to :meth:`oracledb.initOracleClient()` such as
``oracledb.initOracleClient({driverName:'myapp : 2.0.0'})``. The
``driverName`` attribute in :meth:`~oracledb.initOracleClient()` can be used
to override the value that will be shown in the ``CLIENT_DRIVER`` column. See
:ref:`otherinit`.

The ``CLIENT_DRIVER`` value is not configurable in node-oracledb Thin mode.

Note if :attr:`oracledb.connectionClass` is set for a non-pooled connection,
the ``CLIENT_DRIVER`` value will not be set for that connection.

.. _opentelemetry:

Using node-oracledb with OpenTelemetry
======================================

The `OpenTelemetry <https://opentelemetry.io/>`__ observability framework
contains a set of APIs, Software Development Kits (SDKs), and tools that
enables you to instrument, generate, collect, and export telemetry data
(metrics, logs, and traces) to analyze your application’s performance and
identify bottlenecks. The OpenTelemetry project is open-source and available
on `GitHub <https://github.com/open-telemetry>`__ and from
`npmjs.com <https://www.npmjs.com/org/opentelemetry>`__.

The OpenTelemetry instrumentation support in Node.js for Oracle Database is
available on npm as a separate package,
`@opentelemetry/instrumentation-oracledb <https://www.npmjs.com/package/
@opentelemetry/instrumentation-oracledb>`__. The source code is available in
the `OpenTelemetry JavaScript GitHub repository <https://github.com/open-
telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-
oracledb>`__. This module uses the tracing feature available in node-oracledb
to generate the telemetry data for applications using this driver.

The following components can be used to view the trace information from
node-oracledb:

- An OpenTelemetry trace visualizer that provides a graphic and intuitive
  representation of the OpenTelemetry trace information such as Zipkin,
  Jaeger, Prometheus, or another collector.

- A trace exporter package compatible with your visualizer that sends the
  telemetry data to a specific backend or storage system.

Tracing information can also be printed on the console by making use of the
exporter ConsoleSpanExporter from the @opentelemetry/sdk-trace-base package.

**Sample Table Definition and Data Insertion**

The following table will be used in the subsequent example to demonstrate
using node-oracledb with OpenTelemetry:

.. code-block:: sql

    CREATE TABLE cars(
        id NUMBER,
        model VARCHAR2(20),
        year NUMBER
    );

Consider the following data is inserted into the table:

.. code-block:: sql

    INSERT INTO cars VALUES (1, 'Skoda', 2024);

**Install the OpenTelemetry instrumentation module for Oracle Database**

To use node-oracledb with OpenTelemetry, install the OpenTelemetry
instrumentation module for Oracle Database in Node.js by using::

    npm install @opentelemetry/instrumentation-oracledb

**Load the Required Modules**

You can load the required modules as shown below:

.. code-block:: javascript

    const { OracleInstrumentation } = require('@opentelemetry/instrumentation-oracledb');
    const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
    const { resourceFromAttributes } = require('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
    const { registerInstrumentations } = require('@opentelemetry/instrumentation');
    const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
    const oracledb = require('oracledb');

OpenTelemetry's NodeTraceProvider object is used to initialize the
OpenTelemetry APIs to use trace bindings of your trace visualizer. Also,
initialize the Oracle Database Instrumentation Object, OracleInstrumentation,
and set it to work with the NodeTraceProvider as shown in the code below. By
setting this, the instrumentation traces generated from OracleInstrumentation
will be sent to your Trace Visualizer.

**Sample of Using node-oracledb with OpenTelemetry**

The sample code below uses OpenTelemetry's ConsoleSpanExporter to export and
display trace information on the console.

.. code-block:: javascript

    const svcName = { serviceName: 'oracle-OT-service' };

    // Add your trace exporter to the TraceProvider object
    const exporter = new ConsoleSpanExporter();
    const provider = new NodeTracerProvider({
      resource: resourceFromAttributes({
          [ATTR_SERVICE_NAME]: svcName.serviceName
      }),
      spanProcessors: [
          new SimpleSpanProcessor(exporter)
      ]
    });

    // Initialise the OpenTelemetry APIs to use the BasicTracer bindings
    provider.register();

    // Register the Oracle DB Instrumentation module
    // Setting the enhancedDatabaseReporting parameter to true will print
    // the SQL statement and bind value and should be used carefully!
    // This parameter is set to false by default.
    const instrumentation = new OracleInstrumentation(
      { enhancedDatabaseReporting: true });
    registerInstrumentations({
      instrumentations: [
        instrumentation,
      ],
    });

    // Send the instrumentation logs to your trace provider
    instrumentation.setTracerProvider(provider);

    // Create a connection to Oracle Database
    async function run() {
      const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
      });

      // Run the SQL query on the cars table created earlier
      const result = await conn.execute('select model from cars where year = :1', [2024]);
      console.log('The model of the car is', result.rows[0][0]);

      await connection.close();
    }

    run();

This code creates an Oracle Database connection and runs a simple SELECT
query. The ConsoleSpanExporter prints the complete span traces of the three
node-oracledb functions (``getConnection()``, ``execute()``, and
``close()``) on the console, which are quite detailed. Here is a sample
output::

    ...
    {
      resource: { attributes: { 'service.name': 'oracle-OT-service' } },
      instrumentationScope: {
        name: '@opentelemetry/instrumentation-oracledb',
        version: '0.26.0',
        schemaUrl: undefined
      },
      traceId: 'c16c0db547a9acbd844c44057cb6057e',
      parentSpanContext: undefined,
      traceState: undefined,
      name: 'oracledb.getConnection',
      id: 'c3daa0f6d86f55b6',
      kind: 2,
      timestamp: 1748512419932000,
      duration: 329122.9,
      attributes: {
        'db.system.name': 'oracle.db',
        'network.transport': 'TCP',
        'db.user': 'scott',
        'db.namespace': 'orcl|ORCLPDB|orclpdb',
        'server.address': 'localhost',
        'server.port': 1521
      },
      status: { code: 0 },
      events: [],
      links: []
    }
    ...
    {
      resource: { attributes: { 'service.name': 'oracle-OT-service' } },
      instrumentationScope: {
        name: '@opentelemetry/instrumentation-oracledb',
        version: '0.26.0',
        schemaUrl: undefined
      },
      traceId: '321c7b2ba7eb136a8c887e3283e95951',
      parentSpanContext: undefined,
      traceState: undefined,
      name: 'oracledb.Connection.execute:SELECT orcl|ORCLPDB|orclpdb',
      id: '871493c320f2e15c',
      kind: 2,
      timestamp: 1748512420263000,
      duration: 13863.1,
      attributes: {
        'db.system.name': 'oracle.db',
        'network.transport': 'TCP',
        'db.user': 'scott',
        'db.namespace': 'orcl|ORCLPDB|orclpdb',
        'server.address': 'localhost',
        'server.port': 1521,
        'db.operation.name': 'SELECT',
        'db.query.text': 'select model from cars where year = :1',
        'db.operation.parameter.0': '2024'
      },
      status: { code: 0 },
      events: [],
      links: []
    }
    ...
    The model of the car is Skoda
    ...
    {
      resource: { attributes: { 'service.name': 'oracle-OT-service' } },
      instrumentationScope: {
        name: '@opentelemetry/instrumentation-oracledb',
        version: '0.26.0',
        schemaUrl: undefined
      },
      traceId: 'f731a5261003f8834e2fc5525f5b9a02',
      parentSpanContext: undefined,
      traceState: undefined,
      name: 'oracledb.Connection.close',
      id: 'c2957831a6e49b61',
      kind: 2,
      timestamp: 1748512420280000,
      duration: 3898.3,
      attributes: {
        'db.system.name': 'oracle.db',
        'network.transport': 'TCP',
        'db.user': 'scott',
        'db.namespace': 'orcl|ORCLPDB|orclpdb',
        'server.address': 'localhost',
        'server.port': 1521
      },
      status: { code: 0 },
      events: [],
      links: []
    }

Note that the output is shown in an abbreviated form here to only highlight
the relevant OpenTelemetry spans and query output.

In the above sample code, the ``enhancedDatabaseReporting`` property is set to
*true* which enables the tracing of statements and bind values.

.. warning::

    Use the ``enhancedDatabaseReporting`` property carefully since bind values
    may contain sensitive information.

The types of OpenTelemetry data and metrics for Oracle Database are listed
`here <https://github.com/open-telemetry/semantic-conventions/blob/main/docs/
database/oracledb.md>`__.

The tracing parameters and methods that can be used by the OpenTelemetry
JavaScript project to generate telemetry data were introduced in node-oracledb
6.7. See :ref:`tracehandlerinterface`.

For more information, see the blog `Integrate OpenTelemetry to build
high-performance Oracle Database Applications with Node.js <https://medium.com
/oracledevs/integrate-opentelemetry-to-build-high-performance-oracle-database-
applications-with-node-js-118e3a6c8793#f0c3>`__.

Low Level node-oracledb Driver Tracing
======================================

Low level tracing is mostly useful to maintainers of node-oracledb.

- For the node-oracledb Thin mode, packets can be traced by setting the
  environment variable::

      NODE_ORACLEDB_DEBUG_PACKETS=1

  Output goes to stdout. The logging is similar to an Oracle Net trace of
  level 16.

- The node-oracledb Thick mode can be traced using:

  - DPI_DEBUG_LEVEL as documented in `ODPI-C Debugging
    <https://oracle.github.io/odpi/doc/user_guide/debugging.html>`__.

  - Oracle Call Interface (OCI) tracing as directed by Oracle Support.

  - Oracle Net services tracing as documented in `Oracle Net Services Tracing
    Parameters <https://docs.oracle.com/en/database/oracle/oracle-database/21/
    netrf/parameters-for-the-sqlnet.ora.html>`__.
