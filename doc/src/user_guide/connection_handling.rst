.. _connectionhandling:

*****************************
Connecting to Oracle Database
*****************************

Connections between node-oracledb and Oracle Database are used for executing
:ref:`SQL <sqlexecution>`, :ref:`PL/SQL <plsqlexecution>`, and for
:ref:`SODA <sodaoverview>`.

By default, node-oracledb runs in a 'Thin' mode which connects directly to
Oracle Database. This mode does not need Oracle Client libraries. However, when
node-oracledb uses these libraries, then the driver is said to be in 'Thick'
mode and has :ref:`additional functionality <featuresummary>`. See
:ref:`enablingthick`.

Connections can be either:

- :ref:`Standalone <standaloneconnection>`: These connections are useful when
  the application needs a single connection to a database. Connections are
  created by calling :meth:`oracledb.getConnection()`.

- :ref:`Pooled <connpooling>`: These connections are important for performance
  when applications frequently connect and disconnect from the database. Oracle
  high availability features in the pool implementation mean that small pools
  can also be useful for applications that want a few connections available for
  infrequent use. Pools are created with :meth:`oracledb.createPool()` at
  application initialization time, and then :meth:`pool.getConnection()` can be
  called to obtain a connection from a pool.

Many connection behaviors can be controlled by node-oracledb options.
Other settings can be configured in :ref:`Oracle Net files <tnsadmin>` or
in :ref:`connection strings <easyconnect>`. These include :ref:`limiting the
amount of time <dbcalltimeouts>` that opening a connection can take,
or enabling :ref:`network encryption <securenetwork>`.

.. _standaloneconnection:

Standalone Connections
======================

Standalone connections are database connections that do not use a node-oracledb
connection pool. They are useful for applications that use a single connection
to a database. You can create connections by calling
:meth:`oracledb.getConnection()` and passing a database username, the database
password for that user, and a :ref:`connect string <connectionstrings>`.
Node-oracledb also supports :ref:`external authentication <extauth>` and
:ref:`token-based authentication <tokenbasedauthentication>` so passwords do
not need to be in the application.

An example passing credentials is:

.. code-block:: javascript

    const oracledb = require('oracledb');

    async function run() {
        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // contains the hr schema password
            connectString : "localhost/FREEPDB1"
        });

        const result = await connection.execute(`SELECT city FROM locations`);
        console.log("Result is:", result.rows);

        await connection.close();   // Always close connections
    }

    run();

Connections must be released with :meth:`connection.close()` when they are no
longer needed. Make sure to release connections in all code paths including in
error handlers.

.. note::

        If you do not explicitly close a connection, you may experience a short
        delay when the application terminates.  This is due to the timing
        behavior of Node.js garbage collection which needs to free the
        connection reference.

.. _connectionstrings:

Connection Strings
==================

The ``connectString`` property for :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` can be one of:

-  An :ref:`Easy Connect <easyconnect>` string
-  A :ref:`Connect Descriptor <embedtns>` string
-  A :ref:`Net Service Name <tnsnames>` from a local
   :ref:`tnsnames.ora <tnsnames>` file or external naming service
-  The SID of a local Oracle Database instance

If a connect string is not specified, the empty string “” is used which
indicates to connect to the local, default database.

The ``connectionString`` property is an alias for ``connectString``. Use
only one of the properties.

.. note::

        Creating a connection in node-oracledb Thin mode always requires a
        connection string, or the database host name and service name, to be
        specified. Bequeath connections cannot be made.  The Thin mode does not
        reference Oracle environment variables such as ``ORACLE_SID``,
        ``TWO_TASK``, or ``LOCAL``.

.. _easyconnect:

Easy Connect Syntax for Connection Strings
------------------------------------------

An Easy Connect string is often the simplest connection string to use. For
example, to connect to the Oracle Database service ``orclpdb1`` that is
running on the host ``mydbmachine.example.com`` with the default Oracle
Database port 1521, use:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });

If the database is using a non-default port, for example 1984, the port
must be given:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com:1984/orclpdb1"
    });

The Easy Connect syntax has been extended in recent versions of Oracle
Database client since its introduction in Oracle 10g. Check the Easy Connect
Naming method in `Oracle Net Service Administrator’s Guide <https://www.oracle
.com/pls/topic/lookup?ctx=dblatest&id=GUID-B0437826-43C1-49EC-A94D-
B650B6A4A6EE>`__ for the syntax in your version of the Oracle Client
libraries. The Easy Connect syntax supports Oracle Database service names. It
cannot be used with the older System Identifiers (SID).

In node-oracledb Thin mode, any unknown Easy Connect options are ignored and
are not passed to the database. See :ref:`Connection String Differences
<diffconnstr>` for more information.

If you are using node-oracledb Thick mode with Oracle Client 19c (or later),
the latest `Easy Connect Plus <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-8C85D289-6AF3-41BC-848B-BF39D32648BA>`__ syntax allows the
use of multiple hosts or ports, along with optional entries for the wallet
location, the distinguished name of the database server, and even lets some
network configuration options be set. Oracle's `Technical Paper on Easy
Connect Plus Syntax <https://download.oracle.com/ocomdocs/global/Oracle-Net-
Easy-Connect-Plus.pdf>`__ discusses the syntax. The Easy Connect Plus syntax
means that :ref:`tnsnames.ora <tnsadmin>` or :ref:`sqlnet.ora <tnsadmin>`
files are not needed for some further common connection scenarios.

For example, if a firewall terminates idle connections every five minutes, you
may decide it is more efficient to keep connections alive instead of having the
overhead of recreation. Your connection string could be
``"mydbmachine.example.com/orclpdb1?expire_time=2"`` to send packets every two
minutes with the `EXPIRE_TIME <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-6140611A-83FC-4C9C-B31F-A41FC2A5B12D>`__ feature. The general
recommendation for ``EXPIRE_TIME`` is to use a value that is slightly less
than half of the termination period.

Another common use case for Easy Connect Plus is to limit the amount of time
required to open a connection. For example, to return an error after 15 seconds
if a connection cannot be established to the database, use
``"mydbmachine.example.com/orclpdb1?connect_timeout=15"``.

.. _embedtns:

Embedded Connect Descriptor Strings
-----------------------------------

Full Connect Descriptor strings can be embedded directly in node-oracledb
applications:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=orcl)))"
    });

.. _tnsnames:

Net Service Names for Connection Strings
----------------------------------------

Connect Descriptor strings are commonly stored in optional
:ref:`tnsnames.ora configuration files <tnsadmin>` and associated with
a Net Service Name, for example::

    sales =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = orcl)
        )
      )

Net Service Names may also be defined in a directory server.

Given a Net Service Name, node-oracledb Thin mode can connect using the
following code:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "sales"
        configDir     : "/opt/oracle/config"
    });

See :ref:`Optional Oracle Net Configuration <tnsadmin>` for more options on how
node-oracledb locates the ``tnsnames.ora`` files. Note that in node-oracledb
Thick mode, the configuration file must a default location or be set during
initialization, not at connection time.

For general information on ``tnsnames.ora`` files, see the Oracle Net
documentation on `tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__.

.. note::

        When using node-oracledb in Thin mode, the ``tnsnames.ora`` file will
        not be automatically located. The file's directory must be explicitly
        specified when connecting.

You can retrieve the network service names that are defined in the
:ref:`tnsnames.ora <tnsadmin>` file using
:meth:`oracledb.getNetworkServiceNames()`. The directory that contains the
``tnsnames.ora`` file can be specified in the ``configDir`` property of
:meth:`~oracledb.getNetworkServiceNames()`. For example, if the
``tnsnames.ora`` file is stored in the ``/opt/oracle/config`` directory and
contains the following network service names::

    sales =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = ORCL)
        )
      )

    finance =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mydbmachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = ORCLPDB1)
        )
      )

To retrieve the network service names from the above ``tnsnames.ora`` file,
you can use:

.. code-block:: javascript

    const serviceNames = await oracledb.getNetworkServiceNames("/opt/oracle/config");
    console.log(serviceNames);

This prints ``['sales', 'finance']`` as the output.

.. _notjdbc:

JDBC and Oracle SQL Developer Connection Strings
------------------------------------------------

The node-oracledb connection string syntax is different to Java JDBC and
the common Oracle SQL Developer syntax. If these JDBC connection strings
reference a service name like::

    jdbc:oracle:thin:@hostname:port/service_name

for example::

    jdbc:oracle:thin:@mydbmachine.example.com:1521/orclpdb1

then use Oracle’s Easy Connect syntax in node-oracledb:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com:1521/orclpdb1"
    });

Alternatively, if a JDBC connection string uses an old-style Oracle
system identifier `SID <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&i
d=GUID-BADFDC72-0F1D-47FA-8857-EC15DC8ACFBB>`__, and there is no service name
available::

    jdbc:oracle:thin:@hostname:port:sid

for example::

    jdbc:oracle:thin:@mydbmachine.example.com:1521:orcl

then either :ref:`embed the Connect Descriptor <embedtns>`:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SID=ORCL)))"
    });

or create a :ref:`Net Service Name <tnsnames>`::

    # tnsnames.ora

    finance =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mydbmachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SID = ORCL)
        )
      )

This can be referenced in node-oracledb:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "finance"
    });

.. _numberofthreads:

Connections, Threads, and Parallelism
=====================================

To scale and optimize your applications, it is useful to understand how
connections interact with Node.js.

.. _workerthreads:

Connections and Worker Threads
------------------------------

Node.js has four background worker threads by default (not to be confused with
the newer user space `worker_threads <https://nodejs.org/api/worker_threads.
html>`_ module). If you are using node-oracledb Thick mode and open more than
four :ref:`standalone connections <connectionhandling>` or pooled connections,
such as by increasing :attr:`pool.poolMax`, then you must increase the number
of worker threads available to node-oracledb.

.. note::

    This section on Worker thread pool sizing applies only to node-oracledb
    Thick mode. Changing ``UV_THREADPOOL_SIZE`` is not needed for node-oracledb
    when using Thin mode.

A worker thread pool that is too small can cause a decrease in
application performance,
`deadlocks <https://github.com/oracle/node-oracledb/issues/603#issuecomment-
277017313>`__, or failure in connection requests with the error
*NJS-040: connection request timeout* or *NJS-076: connection request
rejected*.

A Node.js worker thread is used by each node-oracledb Thick mode connection to
execute a database statement. Each thread will wait until all :ref:`round-trips
<roundtrips>` between node-oracledb and the database for the statement are
complete.  When an application handles a sustained number of user requests, and
database operations take some time to execute or the network is slow, then all
available threads may be held in use. This prevents other connections from
beginning work and stops Node.js from handling more user load.

The thread pool size should be equal to, or greater than, the maximum
number of connections. If the application does database and non-database
work concurrently, then additional threads could also be required for
optimal throughput.

Increase the thread pool size by setting the environment variable
`UV_THREADPOOL_SIZE <https://docs.libuv.org/en/v1.x/threadpool.html>`__
before starting Node.js. For example, on Linux your ``package.json`` may
have a script like::

    "scripts": {
        "start": "export UV_THREADPOOL_SIZE=10 && node index.js"
    },
    . . .

Or, on Windows::

    "scripts": {
        "start": "SET UV_THREADPOOL_SIZE=10 && node index.js"
    },
    . . .

With these, you can start your application with ``npm start``. This will
allow up to 10 connections to be actively excuting SQL statements in
parallel.

On non-Windows platforms, the value can also be set inside the
application. It must be set prior to any asynchronous Node.js call that
uses the thread pool::

    // !! First file executed.  Non-Windows only !!

    process.env.UV_THREADPOOL_SIZE = 10

    // ... rest of code

If you set ``UV_THREADPOOL_SIZE`` too late in the application, or try to
set it this way on Windows, then the setting will be ignored and the
default thread pool size of 4 will still be used. Note that
:meth:`pool.getStatistics()` and :meth:`pool.logStatistics()` can only give
the value of the variable, not the actual size of the thread pool created.
On Linux you can use ``pstack`` to see how many threads are actually
running. Node.js will create a small number of threads in addition to
the expected number of worker threads.

The `libuv <https://github.com/libuv/libuv>`__ library used by Node.js
12.5 and earlier limits the number of threads to 128. In Node.js 12.6
onward the limit is 1024. You should restrict the maximum number of
connections opened in an application,
that is, :ref:`poolMax <createpoolpoolattrspoolmax>`, to a value lower
than ``UV_THREADPOOL_SIZE``. If you have multiple pools, make sure the
sum of all ``poolMax`` values is no larger than ``UV_THREADPOOL_SIZE``.

.. _parallelism:

Parallelism on Each Connection
------------------------------

Oracle Database can only execute operations one at a time on each
connection. Examples of operations include ``connection.execute()``,
``connection.executeMany()``, ``connection.queryStream()``,
``connection.getDbObjectClass()``, ``connection.commit()``,
``connection.close()``, :ref:`SODA <sodaoverview>` calls, and streaming
from :ref:`Lobs <lobclass>`. Multiple connections may be in concurrent
use, but each connection can only do one thing at a time. Code will not
run faster when parallel database operations are attempted using a
single connection.

From node-oracledb 5.2, node-oracledb function calls that use a single
connection for concurrent database access will be queued in the
JavaScript layer of node-oracledb. In earlier node-oracledb versions,
locking occurred in the Oracle Client libraries, which meant many
threads could be blocked.

It is recommended to structure your code to avoid parallel operations on
a single connection. For example, avoid using ``Promise.all()`` on a
single connection. Similarly, instead of using ``async.parallel()`` or
``async.each()`` which call each of their items in parallel, use
``async.series()`` or ``async.eachSeries()``. If you want to repeat a
number of INSERT or UPDATE statements, then use
:meth:`connection.executeMany()`.

To rewrite code that uses ``Promise.all()`` you could, for example, use
a basic ``for`` loop with ``async/await`` to iterate through each
action:

.. code-block:: javascript

    async function myfunc() {
        const stmts = [
            `INSERT INTO ADRESSES (ADDRESS_ID, CITY) VALUES (94065, 'Redwood Shores')`,
            `INSERT INTO EMPLOYEES (ADDRESS_ID, EMPLOYEE_NAME) VALUES (94065, 'Jones')`
        ];

        for (const s of stmts) {
            await connection.execute(s);
        }
    }

If you use ESlint for code validation, and it warns about `await in
loops <https://eslint.org/docs/rules/no-await-in-loop>`__ for code that
is using a single connection, then disable the ``no-await-in-loop`` rule
for these cases.

Another alternative rewrite for ``Promise.all()`` is to wrap the SQL
statements in a single PL/SQL block.

Note that using functions like ``Promise.all()`` to fetch rows from
:ref:`nested cursor result sets <nestedcursors>` can result in
inconsistent data.

During development, you can set :attr:`oracledb.errorOnConcurrentExecute`
to *true* to help identify application code that executes concurrent
database operations on a single connection. Such uses may be logic
errors such as missing ``await`` keywords that could lead to unexpected
results. When ``errorOnConcurrentExecute`` is set to *true*, an error
will be thrown so you can identify offending code. Setting
``errorOnConcurrentExecute`` is not recommended for production use in
case it generates errors during normal operation. For example
third-party code such as a framework may naturally use ``Promise.all()``
in its generic code. Or your application may be coded under the
assumption that node-oracledb will do any necessary serialization. Note
the use of ``errorOnConcurrentExecute`` will not affect parallel use of
multiple connections, which may all be in use concurrently, and each of
which can be doing a single operation.

.. _pooled-connections:
.. _connpooling:

Connection Pooling
==================

Applications which frequently create and close connections should use a
connection pool.  This is important for performance and scalability when
applications need to handle a large number of users who do database work for
short periods of time but have relatively long periods when the connections
are not needed. The high availability features of pools also make small pools
useful for applications that want a few connections available for infrequent
use and requires them to be immediately usable when acquired. Applications
that would benefit from connection pooling but are too difficult to modify
from the use of standalone connections can take advantage of
:ref:`implicitpool`.

Each node-oracledb process can use one or more connection pools. Each pool can
contain zero or more connections. In addition to providing an immediately
available set of connections, pools provide :ref:`dead connection detection
<connpoolpinging>` and transparently handle Oracle Database :ref:`High
Availability events <connectionha>`. This helps shield applications during
planned maintenance and from unplanned failures.  In node-oracledb Thick mode,
the pool implementation uses Oracle's `session pool technology
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-F9662FFB-EAEF-495C-96FC-49C6D1D9625C>`__ which supports additional
Oracle Database features such as Application Continuity.

Pools are created by calling :meth:`oracledb.createPool()`. Generally,
applications will create a pool once as part of initialization.  After an
application finishes using a connection pool, it should release all connections
and terminate the connection pool by calling the :meth:`pool.close()`
method.  During runtime, some pool properties can be changed with
:meth:`pool.reconfigure()`.  Note that in node-oracledb Thick mode, the number
of :ref:`worker threads <workerthreads>` should be sized correctly before
creating a pool.

Connections from the pool are obtained with :meth:`pool.getConnection()`.
If all connections in a pool are being used, then
subsequent ``getConnection()`` calls will be put in
a :ref:`queue <connpoolqueue>` until a connection is available.
Connections must be released with :meth:`connection.close()` when no longer
needed so they can be reused. Make sure to release connections in all
code paths including in error handlers.

Each connection in a pool should be used for a given unit of work, such as a
transaction or a set of sequentially executed statements. Statements should be
:ref:`executed sequentially, not in parallel <numberofthreads>` on each
connection.

For example:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ...  // set mypw to the hr schema password

    async function run() {
        try {
            await oracledb.createPool({
                user          : "hr",
                password      : mypw  // mypw contains the hr schema password
                connectString : "localhost/FREEPDB1"
            });

            let connection;
            try {
                // get connection from the pool and use it
                connection = await oracledb.getConnection();
                result = await connection.execute(`SELECT last_name FROM employees`);
                console.log("Result is:", result);
            } catch (err) {
                throw (err);
            } finally {
                if (connection) {
                    try {
                        await connection.close(); // Put the connection back in the pool
                    } catch (err) {
                        throw (err);
                    }
                }
            }
        } catch (err) {
            console.error(err.message);
        } finally {
            await oracledb.getPool().close(0);
        }
    }

    run();

When a connection is released back to its pool, any ongoing transaction
will be :ref:`rolled back <transactionmgt>` however it will retain session
state, such as :ref:`NLS <nls>` settings from ALTER SESSION statements.
See :ref:`Connection Tagging and Session State <connpooltagging>` for more
information.

Connections can also be :ref:`dropped completely from the
pool <connectionclose>`.

The default value of :attr:`~oracledb.poolMin` is 0, meaning no
connections are created when ``oracledb.createPool()`` is called. This
means the credentials and connection string are not validated when the
pool is created, so problems such as invalid passwords will not return
an error. Credentials will be validated when a connection is later
created, for example with ``pool.getConnection()``. Validation will
occur when ``oracledb.createPool()`` is called if ``poolMin`` is greater
or equal to 1, since this creates one or more connections when the pool
is started.

A connection pool should be started during application initialization,
for example before the web server is started:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ...  // set mypw to the hr schema password

    // Start a connection pool (which becomes the default pool) and start the webserver
    async function init() {
        try {

            await oracledb.createPool({
                user          : "hr",
                password      : mypw,               // mypw contains the hr schema password
                connectString : "localhost/FREEPDB1",
                poolIncrement : 0,
                poolMax       : 4,
                poolMin       : 4
            });

            const server = http.createServer();
            server.on('error', (err) => {
                console.log('HTTP server problem: ' + err);
            });
            server.on('request', (request, response) => {
                handleRequest(request, response);
            });
            await server.listen(3000);

            console.log("Server is running");

        } catch (err) {
            console.error("init() error: " + err.message);
        }
    }

Each web request will invoke ``handleRequest()``. In it, a connection
can be obtained from the pool and used:

.. code-block:: javascript

    async function handleRequest(request, response) {

        response.writeHead(200, {"Content-Type": "text/html"});
        response.write("<!DOCTYPE html><html><head><title>My App</title></head><body>");

        let connection;
        try {

            connection = await oracledb.getConnection();  // get a connection from the default pool
            const result = await connection.execute(`SELECT * FROM locations`);

            displayResults(response, result);  // do something with the results

        } catch (err) {
            response.write("<p>Error: " + text + "</p>");
        } finally {
            if (connection) {
                try {
                    await connection.close();  // always release the connection back to the pool
                } catch (err) {
                    console.error(err);
                }
            }
        }

        response.write("</body></html>");
        response.end();

    }

See `webapp.js <https://github.com/oracle/node-oracledb/tree/main/examples/
webapp.js>`__ for a runnable example.

.. _conpoolsizing:

Connection Pool Sizing
----------------------

The main characteristics of a connection pool are determined by its
attributes :attr:`~pool.poolMin`, :attr:`~pool.poolMax`,
:attr:`~pool.poolIncrement`, and :attr:`~pool.poolTimeout`.

.. note::

    Note in node-oracledb Thick mode, the number of worker threads should be
    sized correctly before creating a pool. See :ref:`Connections and Worker
    Threads <workerthreads>`

Setting ``poolMin`` causes the specified number of connections to be
established to the database during pool creation. This allows subsequent
``pool.getConnection()`` calls to return quickly for an initial set of
users. An appropriate ``poolMax`` value avoids overloading the database
by limiting the maximum number of connections ever opened.

Pool expansion happens when :meth:`pool.getConnection()`
is called and both the following are true:

-  all the currently established connections in the pool are “checked
   out” of the pool by previous ``pool.getConnection()`` calls

-  the number of those currently established connections is less than
   the pool’s ``poolMax`` setting

Pool shrinkage happens when the application returns connections to the pool,
and they are then unused for more than :attr:`~oracledb.poolTimeout`
seconds. Any excess connections above ``poolMin`` will be closed. When
node-oracledb Thick mode is using using Oracle Client 19 or earlier, this pool
shrinkage is only initiated when the pool is accessed, so a pool in a
completely idle application will not shrink.

For pools created with :ref:`External Authentication <extauth>`, with
:ref:`homogeneous <createpoolpoolattrshomogeneous>` set to *false*, or
when using :ref:`Database Resident Connection Pooling (DRCP) <drcp>`, then
the number of connections initially created is zero even if a larger
value is specified for ``poolMin``. Also in these cases the pool
increment is always 1, regardless of the value of
:ref:`poolIncrement <createpoolpoolattrspoolincrement>`. Once the
number of open connections exceeds ``poolMin`` then the number of open
connections does not fall below ``poolMin``.

The Oracle Real-World Performance Group’s recommendation is to use fixed
size connection pools. The values of ``poolMin`` and ``poolMax`` should
be the same. This avoids connection storms which can decrease
throughput. See `Guideline for Preventing Connection Storms: Use Static
Pools <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7DFBA826
-7CC0-4D16-B19C-31D168069B54>`__, which contains more details about sizing of
pools. Having a fixed size will guarantee that the database can handle the
upper pool size. For example, if a pool needs to grow but the database
resources are limited, then ``pool.getConnection()`` may return errors such
as *ORA-28547*. With a fixed pool size, this class of error will occur when
the pool is created, allowing you to change the size before users access the
application. With a dynamically growing pool, the error may occur much
later after the pool has been in use for some time.

The Real-World Performance Group also recommends keeping pool sizes
small, as this may perform better than larger pools. Use
:meth:`pool.getStatistics()` or :meth:`pool.logStatistics()` to monitor pool
usage. The pool attributes should be adjusted to handle the desired workload
within the bounds of resources available to Node.js and the database.

When the values of ``poolMin`` and ``poolMax`` are the same, ``poolIncrement``
can be set greater than zero. (In Thick mode this needs Oracle Client 18c or
later).  This value changes how a :ref:`homogeneous pool
<createpoolpoolattrshomogeneous>` grows when the number of :attr:`connections
established <pool.connectionsOpen>` has become lower than ``poolMin``, for
example if network issues have caused connections to become unusable and they
have been dropped from the pool. Setting ``poolIncrement`` greater than 1 in
this scenario means the next ``pool.getConnection()`` call that needs to grow
the pool will initiate the creation of multiple connections. That
``pool.getConnection()`` call will not return until the extra connections have
been created, so there is an initial time cost. However it can allow subsequent
connection requests to be immediately satisfied. In this growth scenario, a
``poolIncrement`` of 0 is treated as 1.

Make sure any firewall, `resource manager <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-2BEF5482-CF97-4A85-BD90-9195E41E74EF>`__
or user profile `IDLE_TIME <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__ does not expire
idle connections, since this will require connections to be recreated which
will impact performance and scalability. See :ref:`Preventing Premature
Connection Closing <connectionpremclose>`.

.. _conpooldraining:

Connection Pool Closing and Draining
------------------------------------

Closing a connection pool allows database resources to be freed. If
Node.js is killed without :meth:`pool.close()` being called
successfully, then some time may pass before the unused database-side of
connections are automatically cleaned up in the database.

When ``pool.close()`` is called with no parameter, the pool will be
closed only if all connections have been released to the pool with
``connection.close()``. Otherwise an error is returned and the pool will
not be closed.

An optional ``drainTime`` parameter can be used to force the pool closed
even if connections are in use. This lets the pool be ‘drained’ of
connections. The ``drainTime`` indicates how many seconds the pool is
allowed to remain active before it and its connections are terminated.
For example, to give active connections 10 seconds to complete their
work before being terminated:

.. code-block:: javascript

    await pool.close(10);

When a pool has been closed with a specified ``drainTime``, then any new
``pool.getConnection()`` calls will fail. If connections are currently
in use by the application, they can continue to be used for the
specified number of seconds, after which the pool and all open
connections are forcibly closed. Prior to this time limit, if there are
no connections currently “checked out” from the pool with
``getConnection()``, then the pool and its connections are immediately
closed.

In network configurations that drop (or in-line) out-of-band breaks,
forced pool termination may hang unless you have `DISABLE_OOB=ON
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-42E939DC-
EF37-49A0-B4F0-14158F0E55FD>`__
in a `sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__ file, see
:ref:`Optional Oracle Net Configuration <tnsadmin>`.

Non-zero ``drainTime`` values are recommended so that applications have the
opportunity to gracefully finish database operations. However, pools can
be forcibly closed by specifying a zero drain time:

.. code-block:: javascript

    await pool.close(0);

Closing the pool would commonly be one of the last stages of a Node.js
application. A typical closing routine look likes:

.. code-block:: javascript

    // Close the default connection pool with 10 seconds draining, and exit
    async function closePoolAndExit() {
        console.log("\nTerminating");
        try {
            await oracledb.getPool().close(10);
            process.exit(0);
        } catch(err) {
            console.error(err.message);
            process.exit(1);
        }
    }

It is helpful to invoke ``closePoolAndExit()`` if Node.js is sent a
signal or interrupted:

.. code-block:: javascript

    // Close the pool cleanly if Node.js is interrupted
    process
        .once('SIGTERM', closePoolAndExit)
        .once('SIGINT',  closePoolAndExit);

If ``pool.close()`` is called while a :meth:`pool.reconfigure()` is taking
place, then an error will be thrown.

.. _connpoolcache:

Connection Pool Caching
-----------------------

When pools are created, they can be given a named alias. The alias can
later be used to retrieve the related pool object for use. This
facilitates sharing pools across modules and simplifies getting
connections.

Pools are added to the cache by using a
:ref:`poolAlias <createpoolpoolattrspoolalias>` property in the
:ref:`poolAttrs <createpoolpoolattrs>` object:

.. code-block:: javascript

    async function init() {
    try {
        await oracledb.createPool({ // no need to store the returned pool
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            poolAlias: 'hrpool'
        });

        // do stuff
        . . .

        // get the pool from the cache and use it
        const pool = oracledb.getPool('hrpool');
        . . .
    }

There can be multiple pools in the cache if each pool is created with a
unique alias.

If a pool is created without providing a pool alias:

-  If no other pool in the cache already has the alias of ‘default’,
   then the new pool will be cached using the
   :attr:`pool.poolAlias` ‘default’.

   This pool is used by default in methods that utilize the connection
   pool cache.

-  If an existing pool in the cache already has the alias ‘default’,
   then :attr:`pool.poolAlias` of the new pool will
   be undefined and the pool will be not stored in the pool cache. The
   application must retain a variable for subsequent pool use:
   ``const pool = await oracledb.createPool({   . . . })``.

Methods that can affect or use the connection pool cache include:

- :meth:`oracledb.createPool()`: Can add a pool to the cache.
- :meth:`oracledb.getPool()`: Retrieves a pool from the cache.
- :meth:`oracledb.getConnection()`: Can use a pool in the cache to retrieve
  connections.
- :meth:`pool.close()`: Automatically removes a pool from the cache.

Using the Default Pool
++++++++++++++++++++++

Assuming the connection pool cache is empty, the following will create a
new pool and cache it using the pool alias ‘default’:

.. code-block:: javascript

    async function init() {
        try {
            await oracledb.createPool({
                user: 'hr',
                password: mypw,  // mypw contains the hr schema password
                connectString: 'localhost/FREEPDB1'
            });

            . . .
    }

If you are using callbacks, note that ``createPool()`` is not
synchronous.

Connections can be returned by using the shortcut to
:meth:`oracledb.getConnection()` that returns a
connection from a pool:

.. code-block:: javascript

    const connection = await oracledb.getConnection();

    . . . // Use connection from the previously created 'default' pool

    await connection.close(); // always release the connection back to the pool

The default pool can also be retrieved using :meth:`oracledb.getPool()`
without passing the ``poolAlias`` parameter:

.. code-block:: javascript

    const pool = oracledb.getPool();
    console.log(pool.poolAlias); // 'default'
    const connection = await pool.getConnection();

    . . . // Use connection

    await connection.close();

Using Multiple Pools
++++++++++++++++++++

If the application needs to use more than one pool at a time, unique
pool aliases can be used when creating the pools:

.. code-block:: javascript

    await oracledb.createPool({
        user: 'hr',
        password: myhrpw,  // myhrpw contains the hr schema password
        connectString: 'localhost/FREEPDB1',
        poolAlias: 'hrpool'
    });

    await oracledb.createPool({
        user: 'sh',
        password: myshpw,  // myshpw contains the sh schema password
        connectString: 'localhost/FREEPDB1',
        poolAlias: 'shpool'
    });

    . . .

To get a connection from a pool, pass the pool alias:

.. code-block:: javascript

    const connection = await oracledb.getConnection('hrpool');

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

From node-oracledb 3.1.0 you can alternatively pass the alias as an
attribute of the options:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'hrpool' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

The presence of the ``poolAlias`` attribute indicates the previously
created connection pool should be used instead of creating a standalone
connection. This syntax is useful when you want to pass other attributes
to a pooled ``getConnection()`` call, such as for :ref:`proxy
connections <connpoolproxy>` or with :ref:`connection
tagging <connpooltagging>`:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'hrpool', tag: 'loc=cn;p=1' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

To use the default pool in this way you must explicitly pass the alias
``default``:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'default', tag: 'loc=cn;p=1' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

A specific pool can be retrieved from the cache by passing its pool
alias to :meth:`oracledb.getPool()`:

.. code-block:: javascript

    const pool = oracledb.getPool('hrpool');
    const connection = await pool.getConnection();

    . . . // Use connection from the pool

    await connection.close();

.. _connpoolqueue:

Connection Pool Queue
---------------------

The number of users that can concurrently do database operations is
limited by the number of connections in the pool. The maximum number of
connections is :attr:`~oracledb.poolMax`. Node-oracledb queues
any additional ``pool.getConnection()`` requests to prevent users from
immediately getting an error that the database is not available. The
connection pool queue allows applications to gracefully handle more
users than there are connections in the pool, and to handle connection
load spikes without having to set ``poolMax`` too large for general
operation.

If the application has called :meth:`pool.getConnection()` (or
:meth:`oracledb.getConnection()` calls that use a pool) enough times so that
all connections in the pool are in use, and further ``getConnection()`` calls
are made, then each of those new ``getConnection()`` requests will be queued
and will not return until an in-use connection is released back to the pool
with :meth:`connection.close()`. If, instead, ``poolMax`` has not been reached,
then the additional connection requests can be immediately satisfied and are
not queued.

The amount of time that a queued request will wait for a free connection
can be configured with :attr:`~oracledb.queueTimeout`. When
connections are timed out of the queue, the ``pool.getConnection()``
call returns the error *NJS-040: connection request timeout* to the
application.

If more than :attr:`oracledb.queueMax` pending
connection requests are in the queue, then ``pool.getConnection()``
calls will immediately return an error *NJS-076: connection request
rejected. Pool queue length queueMax reached* and will not be queued.
Use this to protect against connection request storms. The setting helps
applications return errors early when many connections are requested
concurrently. This avoids connection requests blocking (for up to
:attr:`~oracledb.queueTimeout` seconds) while waiting an
available pooled connection. It lets you see when the pool is too small.

You may also experience *NJS-040* or *NJS-076* errors if your application is
not correctly closing connections, or if are using node-oracledb Thick mode and
:ref:`UV_THREADPOOL_SIZE <numberofthreads>` is too small.

.. _connpoolmonitor:

Connection Pool Monitoring
--------------------------

Connection pool usage should be monitored to choose the appropriate
settings for your workload. If the current settings are non optimal,
then :meth:`pool.reconfigure()` can be called to alter
the configuration.

Pool attributes :attr:`~pool.connectionsInUse` and
:attr:`~pool.connectionsOpen` always provide basic
information about an active pool:

.. code-block:: javascript

    const pool = await oracledb.createPool(...);

    . . .

    console.log(pool.connectionsOpen);   // how big the pool actually is
    console.log(pool.connectionsInUse);  // how many of those connections are held by the application

Statistics are calculated from the time the pool was created, or since
:meth:`pool.reconfigure()` was used to reset the statistics.

The recording of :ref:`pool queue <connpoolqueue>` statistics, pool
settings, and related environment variables can be enabled by setting
``enableStatistics`` to *true* when using :meth:`oracledb.createPool()` or
:meth:`pool.reconfigure()`.

To enable recording of statistics when creating the pool:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        enableStatistics : true,   // default is false
        user             : "hr",
        password         : mypw,   // mypw contains the hr schema password
        connectString    : "localhost/FREEPDB1"
    });
    . . .

Statistics can alternatively be enabled on a running pool with:

.. code-block:: javascript

    await pool.reconfigure({ enableStatistics: true });

Applications can then get the current statistics by calling
:meth:`pool.getStatistics()` which returns a
:ref:`PoolStatistics Class <poolstatisticsclass>` object. Attributes of
the object can be accessed individually for your tracing requirements.
The complete statistics can be printed by calling
:meth:`poolstatistics.logStatistics()`.

.. code-block:: javascript

    const poolstatistics = pool.getStatistics();

    console.log(poolstatistics.currentQueueLength);  // print one attribute
    poolstatistics.logStatistics();                  // print all statistics to the console

Alternatively the statistics can be printed directly by calling
:meth:`pool.logStatistics()`.

.. code-block:: javascript

    pool.logStatistics();    // print all statistics to the console

The output of :meth:`poolstatistics.logStatistics()` and
:meth:`pool.logStatistics()` is identical.

For efficiency, the minimum, maximum, average, and sum of times in the
pool queue are calculated when requests are removed from the queue. They
include times for connection requests that were dequeued when a pool
connection became available, and also for connection requests that timed
out. They do not include times for connection requests still waiting in
the queue.

The sum of ‘requests failed’, ‘requests exceeding queueMax’, and
‘requests exceeding queueTimeout’ is the number of
``pool.getConnection()`` calls that failed.

The :ref:`PoolStatistics object <poolstatisticsclass>` and ``logStatistics()``
function record the following:

.. _poolstats:

.. list-table-with-summary:: PoolStatistics Class Attribute and Equivalent ``logStatistics()`` Label
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the pool statistics attribute. The second column displays the logStatistics() label. The third column displays the description of the attribute.

    * - :ref:`Pool Statistics Class <poolstatisticsclass>` Attribute
      - ``logStatistics()`` Label
      - Description
    * - ``thin``
      - thin mode
      - Indicates whether the driver is in Thin or Thick mode.
    * - ``gatheredDate``
      - gathered at
      - The time the statistics were taken.
    * - ``upTime``
      - up time (milliseconds)
      - The number of milliseconds since this pool was created.
    * - ``upTimeSinceReset``
      - up time from last reset (milliseconds)
      - The number of milliseconds since the statistics were initialized or reset.
    * - ``connectionRequests``
      - connection requests
      - The number of ``getConnection()`` requests made to this pool.
    * - ``requestsEnqueued``
      - requests enqueued
      - The number of ``getConnection()`` requests that were added to this pool’s queue (waiting for the application to return an in-use connection to the pool) because every connection in this pool was already being used.
    * - ``requestsDequeued``
      - requests dequeued
      - The number of ``getConnection()`` requests that were dequeued when a connection in this pool became available for use.
    * - ``failedRequests``
      - requests failed
      - The number of getConnection() requests that failed due to an Oracle Database error. Does not include :attr:`~oracledb.queueMax` or :attr:`~oracledb.queueTimeout` errors.
    * - ``rejectedRequests``
      - requests exceeding queueMax
      - The number of getConnection() requests rejected because the number of connections in the pool queue exceeded the :attr:`~oracledb.queueMax` limit.
    * - ``requestTimeouts``
      - requests exceeding queueTimeout
      - The number of queued getConnection() requests that were timed out from the pool queue because they exceeded the :attr:`~oracledb.queueTimeout` time.
    * - ``currentQueueLength``
      - current queue length
      - The current number of ``getConnection()`` requests that are waiting in the pool queue.
    * - ``maximumQueueLength``
      - maximum queue length
      - The maximum number of ``getConnection()`` requests that were ever waiting in the pool queue at one time.
    * - ``timeInQueue``
      - sum of time in queue (milliseconds)
      - The sum of the time (milliseconds) that dequeued requests spent in the pool queue.
    * - ``minimumTimeInQueue``
      - minimum time in queue (milliseconds)
      - The minimum time (milliseconds) that any dequeued request spent in the pool queue.
    * - ``maximumTimeInQueue``
      - maximum time in queue (milliseconds)
      - The maximum time (milliseconds) that any dequeued request spent in the pool queue.
    * - ``averageTimeInQueue``
      - average time in queue (milliseconds)
      - The average time (milliseconds) that dequeued requests spent in the pool queue.
    * - ``connectionsInUse``
      - :attr:`pool connections in use <pool.connectionsInUse>`
      - The number of connections from this pool that ``getConnection()`` returned successfully to the application and have not yet been released back to the pool.
    * - ``connectionsOpen``
      - :attr:`pool connections open <pool.connectionsOpen>`
      - The number of idle or in-use connections to the database that the pool is currently managing.
    * - ``connectString``
      - :attr:`~pool.connectString`
      - The connection string that is used to connect to the Oracle Database instance.
    * - ``edition``
      - :attr:`~pool.edition`
      - The edition name used.
    * - ``events``
      - :attr:`~pool.events`
      - Denotes whether the Oracle Client events mode is enabled or not.
    * - ``externalAuth``
      - :attr:`~pool.externalAuth`
      - Denotes whether connections are established using external authentication or not.
    * - ``homogeneous``
      - :attr:`~pool.homogeneous`
      - Identifies whether the connections in the pool all have the same credentials (a ‘homogenous’ pool), or whether different credentials can be used (a ‘heterogeneous’ pool).
    * - ``poolAlias``
      - :attr:`~pool.poolAlias`
      - The alias of this pool in the connection pool cache.
    * - ``poolIncrement``
      - :attr:`~pool.poolIncrement`
      - The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
    * - ``poolMax``
      - :attr:`~pool.poolMax`
      - The maximum number of connections that can be open in the connection pool.
    * - ``poolMaxPerShard``
      - :attr:`~pool.poolMaxPerShard`
      - The maximum number of connections in the pool that can be used for any given shard in a sharded database.
    * - ``poolMin``
      - :attr:`~pool.poolMin`
      - The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
    * - ``poolPingInterval``
      - :attr:`poolPingInterval (seconds) <pool.poolPingInterval>`
      - The maximum number of seconds that a connection can remain idle in a connection pool before node-oracledb pings the database prior to returning that connection to the application.
    * - ``poolPingTimeout``
      - :attr:`poolPingTimeout (milliseconds) <pool.poolPingTimeout>`
      - The number of milliseconds that a connection should wait for a response from :meth:`connection.ping()`.
    * - ``poolTimeout``
      - :attr:`poolTimeout (seconds) <pool.poolTimeout>`
      - The time (in seconds) after which the pool terminates idle connections (unused in the pool).
    * - ``queueMax``
      - :attr:`~pool.queueMax`
      - The maximum number of pending :meth:`pool.getConnection()` calls that can be queued.
    * - ``queueTimeout``
      - :attr:`queueTimeout (milliseconds) <pool.queueTimeout>`
      - The time (in milliseconds) that a connection request should wait in the queue before the request is terminated.
    * - ``sessionCallback``
      - :attr:`~pool.sessionCallback`
      - The Node.js or PL/SQL function that is invoked by :meth:`pool.getConnection()` when the connection is brand new.
    * - ``sodaMetaDataCache``
      - :attr:`~pool.sodaMetaDataCache`
      - Determines whether the pool has a metadata cache enabled for SODA collection access.
    * - ``stmtCacheSize``
      - :attr:`~pool.stmtCacheSize`
      - The number of statements to be cached in the statement cache of each connection.
    * - ``user``
      - :attr:`~pool.user`
      - The database username for connections in the pool.
    * - ``threadPoolSize``
      - UV_THREADPOOL_SIZE
      - The value of :ref:`process.env.UV_THREADPOOL_SIZE <numberofthreads>` which is the number of worker threads for this process. Note this shows the value of the variable, however if this variable was set after the thread pool started, the thread pool will still be the default size of 4.

        This attribute only affects the node-oracledb Thick mode.

.. _connpoolpinging:

Connection Pool Pinging
-----------------------

When a connection is aquired from a pool with ``getConnection()``,
node-oracledb does some internal checks to validate if the about-to-be-returned
connection is usable.  If it is not usable, node-oracledb can replace it with a
different connection before returning this to the application.

Connections may become unusable for various reasons including network dropouts,
database instance failures, session termination from the database `resource
manager <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
2BEF5482-CF97-4A85-BD90-9195E41E74EF>`__ or user resource profile `IDLE_TIME
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__, or from a DBA issuing an ``ALTER
SYSTEM KILL SESSION`` command.

By default, idle connections in the pool are unaware of these events. So, a
``getConnection()`` call could return an unusable connection to the application
and errors would only occur when it is later used.  The internal pool
validation checks help provide tolerance against this situation so that
statement execution using a connection is more likely to succeed.

Each time ``getConnection()`` is called, a lightweight connection validity
check occurs. (In node-oracledb Thick mode, this requires Oracle Client library
version 12.2 or later).  The lightweight check allows node-oracledb to detect
and replace connections that have become unusable due to some network errors.

An additional internal check performed by ``getConnection()`` can be configured
during pool creation.  This extra check helps detect errors such as the
connection having exceeded the user profile resource limits, or from an
explicit session closure from a DBA.  This extra check performs a
:ref:`round-trip <roundtrips>` ping to the database which impacts performance.
So, it is not done for each ``getConnection()`` call by default.

The frequency of pinging can be controlled with the
:attr:`oracledb.poolPingInterval` property or during :ref:`pool creation
<createpoolpoolattrspoolpinginterval>` to meet your quality of service
requirements.

The default :attr:`~oracledb.poolPingInterval` value is 60 seconds, which is
suitable for most active applications. Possible values are:

.. list-table-with-summary::  ``poolPingInterval`` Value
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 40
    :summary: The first column displays the poolPingInterval value. The second column displays the behavior of a pool getConnection() call.

    * - ``poolPingInterval`` Value
      - Behavior of a Pool ``getConnection()`` Call
    * - ``n`` < ``0``
      - Never checks for connection validity
    * - ``n`` = ``0``
      - Always checks for connection validity
    * - ``n`` > ``0``
      - Checks validity if the connection has been idle in the pool (not “checked out” to the application by ``getConnection()``) for at least ``n`` seconds

When ``getConnection()`` is called to return a pooled connection, and
the connection has been idle in the pool (not “checked out” to the
application by ``getConnection()``) for the specified
``poolPingInterval`` time, then an internal “ping” will be performed
first. If the ping detects the connection is invalid then node-oracledb
internally drops the unusable connection and obtains another from the
pool. This second connection may also need a ping. This ping-and-release
process may be repeated until:

-  an existing connection that does not qualify for pinging is obtained.
   The ``getConnection()`` call returns this to the application. Note
   that since a ping may not have been performed, the connection is not
   guaranteed to be usable.
-  a new, usable connection is opened. This is returned to the
   application.
-  a number of unsuccessful attempts to find a valid connection have
   been made, after which an error is returned to the application.

Pools in active use may never have connections idle longer than
``poolPingInterval``, so pinging often only occurs for infrequently
accessed connection pools.

Because a ping may not occur every time a connection is returned from
:meth:`pool.getConnection()`, and also it is possible for network outages
to occur after ``getConnection()`` is called, applications should continue
to use appropriate statement execution error checking.

For ultimate scalability, disable explicit pool pinging by setting
``poolPingInterval`` to a negative value, and make sure the firewall, database
resource manager, or user profile are not expiring idle connections. See
:ref:`Preventing Premature Connection Closing <connectionpremclose>`.  When
using node-oracledb Thick mode, use use Oracle client 12.2 (or later)
libraries.

In all cases, when a bad connection is released back to the pool with
:meth:`connection.close()`, the connection is automatically destroyed.
This allows a valid connection to the database to be opened by some
subsequent ``getConnection()`` call.

Explicit pings can be performed at any time with :meth:`connection.ping()`.

The time to wait for a response from :meth:`connection.ping()` can be
controlled with the :attr:`oracledb.poolPingTimeout` property or with the
:ref:`poolPingTimeout <createpoolpoolattrspoolpingtimeout>` property during
:ref:`pool creation <createpoolpoolattrspoolpingtimeout>`.

The default :attr:`~oracledb.poolPingTimeout` value is *5000* milliseconds.
The behavior of a pool ``getConnection()`` call differs based on the value
specified in the ``poolPingTimeout`` property as detailed below.

.. list-table-with-summary:: ``poolPingTimeout`` Value
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 40
    :summary: The first column displays the poolPingTimeout value. The second column displays the behavior of a pool getConnection() call.

    * - ``poolPingTimeout`` Value
      - Behavior of a Pool ``getConnection()`` Call
    * - ``n`` < ``0``
      - Returns the error ``NJS-007: invalid value for "poolPingTimeout" in parameter 1`` if the :ref:`poolPingTimeout <createpoolpoolattrspoolpingtimeout>` property in :meth:`oracledb.createPool()` is set to a negative value.

        Returns the error ``NJS-004: invalid value for property "poolPingTimeout"`` if :attr:`oracledb.poolPingTimeout` is set to a negative value.
    * - ``n`` = ``0``
      - Waits until :meth:`connection.ping()` succeeds with a response or fails with an error.
    * - ``n`` > ``0``
      - Waits for :meth:`connection.ping()` to respond by ``n`` milliseconds.

        If :meth:`~connection.ping()` does not respond by ``n`` milliseconds, then the connection is forcefully closed.

.. _connpooltagging:

Connection Tagging and Session State
------------------------------------

Applications can set “session” state in each connection. For all
practical purposes, connections are synonymous with sessions. Examples
of session state are :ref:`NLS <nls>` settings from ALTER SESSION
statements. Pooled connections will retain their session state after
they have been released back to the pool with ``connection.close()``.
However, because pools can grow, or connections in the pool can be
recreated, there is no guarantee a subsequent ``pool.getConnection()``
call will return a database connection that has any particular state.

The :meth:`oracledb.createPool()` option attribute
:ref:`sessionCallback <createpoolpoolattrssessioncallback>` can be
used to set session state efficiently so that connections have a known
session state. The ``sessionCallback`` can be a Node.js function that
will be called whenever ``pool.getConnection()`` will return a newly
created database connection that has not been used before. It is also
called when connection tagging is being used and the requested tag is
not identical to the tag in the connection returned by the pool. It is
called before ``pool.getConnection()`` returns in these two cases. It
will not be called in other cases. Using a callback saves the cost of
setting session state if a previous user of a connection has already set
it. The caller of ``pool.getConnection()`` can always assume the correct
state is set. The ``sessionCallback`` can also be a PL/SQL procedure.

Connection tagging and ``sessionCallback`` were introduced in
node-oracledb 3.1.

There are three common scenarios for ``sessionCallback``:

-  When all connections in the pool should have the same state use a
   simple :ref:`Node.js Session Callback <sessionfixupnode>` without
   tagging.

-  When connections in the pool require different state for different
   users use a :ref:`Node.js Session Tagging Callback <sessiontaggingnode>`.

-  With :ref:`DRCP <drcp>`, use a :ref:`PL/SQL Session Tagging
   Callback <sessiontaggingplsql>`.

.. _sessionfixuptagging:

Connection Tagging
++++++++++++++++++

Connection tagging is used when connections in a pool should have differing
session states. In order to retrieve a connection with a desired state, the
``tag`` attribute in :meth:`~pool.getConnection()` needs to be set.

.. note::

    In this release, connection tagging is only supported in the node-oracledb
    Thick mode. See :ref:`enablingthick`.

Pooled connections can be tagged to record their session state by
setting the property :attr:`connection.tag` to a user
chosen string that represents the state you have set in the connection.
A ``pool.getConnection({tag: 'mytag'})`` call can request a connection
that has the specified tag. If no available connections with that tag
exist in the pool, an untagged connection or a newly created connection
will be returned. If the optional ``getConnection()`` attribute
``matchAnyTag`` is *true*, then a connection that has a different tag
may be returned.

The :ref:`sessionCallback <createpoolpoolattrssessioncallback>`
function is invoked before ``pool.getConnection()`` returns if the
requested tag is not identical to the actual tag of the pooled
connection. The callback can compare the requested tag with the current
actual tag in ``connection.tag``. Any desired state change can be made
to the connection and ``connection.tag`` can be updated to record the
change. The best practice recommendation is to set the tag in the
callback function but, if required, a tag can be set anytime prior to
closing the connection. To clear a connection’s tag set
``connection.tag`` to an empty string.

You would use tagging where you want ``pool.getConnection()`` to return
a connection which has one of several different states. If all
connections should have the same state then you can simply set
``sessionCallback`` and not use tagging. Also, it may not be worthwhile
using a large number of different tags, or using tagging where
connections are being :ref:`dropped <connectionclose>` and recreated
frequently since the chance of ``pool.getConnection()`` returning an
already initialized connection with the requested tag could be low, so
most ``pool.getConnection()`` calls would return a connection needing
its session reset, and tag management will just add overhead.

When node-oracledb is using Oracle Client libraries 12.2 or later, then
node-oracledb uses ‘multi-property tags’ and the tag string must be of
the form of one or more “name=value” pairs separated by a semi-colon,
for example ``"loc=uk;lang=cy"``. The Oracle `session
pool <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F9662FFB
-EAEF-495C-96FC-49C6D1D9625C>`__ used by node-oracledb has various heuristics
to determine which connection is returned to the application. Refer to the
`multi-property tags documentation <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__.
The callback function can parse the requested multi-property tag and
compare it with the connection’s actual properties in
:attr:`connection.tag` to determine what exact state to
set and what value to update ``connection.tag`` to.

.. _sessionfixupnode:

Node.js Session Callback
++++++++++++++++++++++++

When all connections in the pool should have the same state, a simple
callback can be used.

This example sets two NLS settings in each pooled connection. They are
only set the very first time connections are established to the
database. The ``requestedTag`` parameter is ignored because it is only
valid when tagging is being used:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
    connection.execute(
        `alter session set nls_date_format = 'YYYY-MM-DD' nls_language = AMERICAN`,
        callbackFn);
    }

    try {
        const pool = await oracledb.createPool({
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            sessionCallback: initSession
        });
        . . .
    }

Note that a single ALTER SESSION statement is used to set multiple
properties, avoiding :ref:`round-trips <roundtrips>` of repeated
``execute()`` calls. If you need to execute multiple SQL statements,
then use an anonymous PL/SQL block for the same reason:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
        connection.clientId = "Chris";
        connection.execute(
            `begin
                execute immediate 'alter session set nls_date_format = ''YYYY-MM-DD'' nls_language = AMERICAN';
                insert into user_log (id, ts) values (sys_context('userenv', 'client_identifier'), systimestamp);
                commit;
             end;`,
            callbackFn);
    }

See `sessionfixup.js <https://github.com/oracle/node-oracledb/tree/main
/examples/sessionfixup.js>`__ for a runnable example.

.. _sessiontaggingnode:

Node.js Session Tagging Callback
++++++++++++++++++++++++++++++++

When connections in the pool require different state for different users
and you are not using DRCP, then use a JavaScript callback with tagging.

This example Node.js callback function ensures the connection contains
valid settings for an application-specific “USER_TZ=X” property where X
is a valid Oracle timezone:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
        const tagParts = requestedTag.split('=');
        if (tagParts[0] != 'USER_TZ') {
            callbackFn(new Error('Error: Only property USER_TZ is supported'));
            return;
        }

        connection.execute(
            `ALTER SESSION SET TIME_ZONE = '${tagParts[1]}'`,
            (err) => {
                // Record the connection's new state and return
                connection.tag = requestedTag;
                callbackFn(err);
            }
        );
    }

    try {
        await oracledb.createPool({
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            sessionCallback: initSession
        });

        // Get a connection with a given tag (and corresponding session state) from the pool
        const connection = await oracledb.getConnection({poolAlias: 'default', tag: "USER_TZ=UTC" });

        . . . // Use the connection

        // The connection will be returned to the pool with the tag value of connection.tag
        await connection.close(); // always release the connection back to the pool

        . . .

The ``initSession()`` session callback function is only invoked by
``getConnection()`` if the node-oracledb connection pool cannot find a
connection with the requested tag. The session callback function adjusts
the connection state and records the matching tag.

Other parts of the application may request connections with different
tags. Eventually the pool would contain connections with various
different states (and equivalent tags). Each ``getConnection()`` call
will attempt to return a connection which already has the requested tag.
If a matching free connection cannot be found, the pool may grow or the
session state from another connection is cleared. Then ``initSession()``
is called so that the desired connection state can be set.

For runnable examples, see `sessiontagging1.js <https://github.com/oracle/
node-oracledb/tree/main/examples/sessiontagging1.js>`__ and
`sessiontagging2.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sessiontagging2.js>`__.

.. _sessiontaggingplsql:

PL/SQL Session Tagging Callback
+++++++++++++++++++++++++++++++

.. note::

    In this release, PL/SQL callbacks are only supported in node-oracledb
    Thick mode. See :ref:`enablingthick`.

When using :ref:`DRCP <drcp>`, tagging is most efficient when using a
PL/SQL callback.

When node-oracledb is using Oracle Client libraries 12.2 or later,
``sessionCallback`` can be a string containing the name of a PL/SQL
procedure that is called when the requested tag does not match the
actual tag in the connection. When the application uses :ref:`DRCP
connections <drcp>`, a PL/SQL callback can avoid the
:ref:`round-trip <roundtrips>` calls that a Node.js function would require
to set session state. For non-DRCP connections, the PL/SQL callback will
require a round-trip from the application.

After a PL/SQL callback completes and ``pool.getConnection()`` returns,
:attr:`connection.tag` will have the same property values
as the requested tag. The property order may be different. For example
you may request “USER_TZ=UTC;LANGUAGE=FRENCH” but ``connection.tag`` may
be “LANGUAGE=FRENCH;USER_TZ=UTC”. When ``matchAnyTag`` is *true*, then
various heuristics are used to determine which connection in the pool to
use. See the `multi-property tags documentation <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__.
Additional properties may be present in ``connection.tag``.

There is no direct way for Node.js to know if the PL/SQL procedure was
called or what session state it changed. After ``pool.getConnection()``
returns, care must be taken to set ``connection.tag`` to an appropriate
value.

A sample PL/SQL callback procedure looks like:

.. code-block:: sql

   CREATE OR REPLACE PACKAGE myPackage AS
     TYPE property_t IS TABLE OF VARCHAR2(64) INDEX BY VARCHAR2(64);
     PROCEDURE buildTab(
       tag          IN  VARCHAR2,
       propertyTab  OUT property_t
     );
     PROCEDURE myPlsqlCallback (
       requestedTag IN  VARCHAR2,
       actualTag    IN  VARCHAR2
     );
   END;
   /

   CREATE OR REPLACE PACKAGE BODY myPackage AS

     -- Parse the "property=value" pairs in the tag
     PROCEDURE buildTab(tag IN VARCHAR2, propertyTab OUT property_t) IS
       property  VARCHAR2(64);
       propertyName  VARCHAR2(64);
       propertyValue VARCHAR2(64);
       propertyEndPos NUMBER := 1;
       propertyStartPos NUMBER := 1;
       propertyNameEndPos NUMBER := 1;
     begin
       WHILE (LENGTH(tag) > propertyEndPos)
       LOOP
         propertyEndPos := INSTR(tag, ';', propertyStartPos);
         IF (propertyEndPos = 0) THEN
           propertyEndPos := LENGTH(tag) + 1;
         END IF;
         propertyNameEndPos := INSTR(tag, '=', propertyStartPos);
         propertyName := SUBSTR(tag, propertyStartPos,
                      propertyNameEndPos - propertyStartPos);
         propertyValue := SUBSTR(tag, propertyNameEndPos + 1,
                       propertyEndPos - propertyNameEndPos - 1);
         propertyTab(propertyName) := propertyValue;
         propertyStartPos := propertyEndPos + 1;
       END LOOP;
     END;

     PROCEDURE myPlsqlCallback (
       requestedTag IN VARCHAR2,
       actualTag IN VARCHAR2
     ) IS
       reqPropTab property_t;
       actPropTab property_t;
       propertyName VARCHAR2(64);
     BEGIN
       buildTab(requestedTag, reqPropTab);
       buildTab(actualTag, actPropTab);

       -- Iterate over requested properties to set state when it's not
       -- currently set, or not set to the desired value
       propertyName := reqPropTab.FIRST;
       WHILE (propertyName IS NOT NULL)
       LOOP
         IF ((NOT actPropTab.exists(propertyName)) OR
            (actPropTab(propertyName) != reqPropTab(propertyName))) THEN
           IF (propertyName = 'SDTZ') THEN
             EXECUTE IMMEDIATE
               'ALTER SESSION SET TIME_ZONE=''' || reqPropTab(propertyName) || '''';
           ELSE
             RAISE_APPLICATION_ERROR(-20001,'Unexpected session setting requested');
           END IF;
         END IF;
         propertyName := reqPropTab.NEXT(propertyName);
       END LOOP;
       -- Could iterate over other actual properties to set any to a default state
     END;

   END myPackage;
   /

This could be used in your application like:

.. code-block:: javascript

    const sessionTag = "SDTZ=UTC";

    try {
        const pool = await oracledb.createPool({
                     user: 'hr',
                     password: mypw,  // mypw contains the hr schema password
                     connectString: 'localhost/FREEPDB1',
                     sessionCallback: "myPackage.myPlsqlCallback"
                    });
        . . .

        const connection = await pool.getConnection({tag: sessionTag});

        . . . // The value of connection.tag will be sessionTag
             // Use connection.

        await connection.close();
    }

.. _connpoolproxy:

Heterogeneous and Homogeneous Connection Pools
----------------------------------------------

By default, connection pools are ‘homogeneous’ meaning that all
connections use the same database credentials. Both node-oracledb Thin and
Thick modes support homogeneous pools.

Creating Heterogeneous Pools
++++++++++++++++++++++++++++

The node-oracledb Thick mode additionally supports heterogeneous pools,
allowing different user names and passwords to be passed each time a
connection is acquired from the pool with :meth:`pool.getConnection()`.

To create a heterogeneous pool, set the :meth:`~oracledb.createPool`
parameter, :ref:`homogeneous <createpoolpoolattrshomogeneous>`, to *false*.

When a heterogeneous pool is created by setting
:ref:`homogeneous <createpoolpoolattrshomogeneous>` to *false* and no
credentials supplied during pool creation, then a user name and password
may be passed to ``pool.getConnection()``:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        connectString : "localhost/FREEPDB1",  // no user name or password
        homogeneous   : false,
        . . .  // other pool options such as poolMax
    });

    const connection = await pool.getConnection({
        user     : "hr",
        password : mypw,  // mypw contains the hr schema password
    });

    . . . // use connection

    await connection.close();

The ``connectString`` is required during pool creation since the pool is
created for one database instance.

Different user names may be used each time ``pool.getConnection()`` is
called.

When applications want to use connection pools but are not able to use
:attr:`connection.clientId` to distinguish application users from
database schema owners then a ‘heterogeneous’ connection pool might be an
option.

To use heterogeneous pools with the :ref:`connection pool
cache <connpoolcache>`, the alias should be explicitly stated, even
if it is the default pool:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        poolAlias: "default",
        user     : "hr",
        password : mypw,  // mypw contains the hr schema password
    });

For heterogeneous pools, the number of connections initially created is
zero even if a larger value is specified for :attr:`~oracledb.poolMin`.
The pool increment is always 1, regardless of the value of
:ref:`poolIncrement <createpoolpoolattrspoolincrement>`. Once the
number of open connections exceeds ``poolMin`` and connections are idle
for more than the :attr:`~oracledb.poolTimeout` seconds, then
the number of open connections does not fall below ``poolMin``.

.. _proxyauth:

Connecting Using Proxy Authentication
=====================================

Proxy authentication allows a user (the "session user") to connect to Oracle
Database using the credentials of a "proxy user". Statements will run as the
session user. Proxy authentication is generally used in three-tier
applications where one user owns the schema while multiple end-users access
the data. For more information about proxy authentication, see the `Oracle
documentation <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
D77D0D4A-7483-423A-9767-CBB5854A15CC>`__.

An alternative to using proxy users is to set :attr:`connection.clientId`
after connecting and use its value in statements and in the database, for
example for :ref:`monitoring <endtoendtracing>`.

Pool proxy authentication requires a heterogeneous pool.

To grant access, typically a DBA would execute:

.. code-block:: sql

    ALTER USER sessionuser GRANT CONNECT THROUGH proxyuser;

For example, to allow a user called ``MYPROXYUSER`` to access the schema
of ``HR``:

::

    SQL> CONNECT system

    SQL> ALTER USER hr GRANT CONNECT THROUGH myproxyuser;

    SQL> CONNECT myproxyuser[hr]/myproxyuserpassword

    SQL> SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER,
      2         SYS_CONTEXT('USERENV', 'PROXY_USER')   AS PROXY_USER
      3  FROM DUAL;

    SESSION_USER         PROXY_USER
    -------------------- --------------------
    HR                   MYPROXYUSER

See the `Client Access Through a Proxy <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC>`__
section in the Oracle Call Interface manual for more details about proxy
authentication.

To use the proxy user with a node-oracledb heterogeneous connection pool
you could do:

.. code-block:: javascript

    const myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

    const pool = await oracledb.createPool({ connectString: "localhost/orclpdb1", homogeneous: false });
    const connection = await pool.getConnection({ user: 'myproxyuser[hr]', password: myproxyuserpw});

    . . . // connection has access to the HR schema objects

    await connection.close();

Other proxy cases are supported such as:

.. code-block:: javascript

    const myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

    const pool = await oracledb.createPool({
        user          : "myproxyuser",
        password      : myproxyuserpw,
        connectString : "localhost/FREEPDB1",
        homogeneous   : false,
        . . .  // other pool options such as poolMax can be used
    });

    const connection = await pool.getConnection({ user : 'hr' });  // the session user

    . . . // connection has access to the HR schema objects

    await connection.close();

.. _extauth:

Connecting Using External Authentication
========================================

External Authentication allows applications to use an external password
store (such as an `Oracle Wallet <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-E3E16C82-E174-4814-98D5-EADF1BCB3C37>`__),
the `Secure Socket Layer <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-6AD89576-526F-4D6B-A539-ADF4B840819F>`__
(SSL), or the `operating system <https://www.oracle.com/pls/topic/lookup
?ctx=dblatest&id=GUID-37BECE32-58D5-43BF-A098-97936D66968F>`__
to validate user access. One of the benefits is that database
credentials do not need to be hard coded in the application.

.. note::

    Connecting to Oracle Database using external authentication is only
    supported in node-oracledb Thick mode. See :ref:`enablingthick`.

To use external authentication, set the :attr:`oracledb.externalAuth` property
to *true*. This property can also be set in the ``connAttrs`` or ``poolAttrs``
parameters of the :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` calls, respectively.

When ``externalAuth`` is set, any subsequent connections obtained using
the :meth:`oracledb.getConnection()` or :meth:`pool.getConnection()` calls
will use external authentication. Setting this property does not affect the
operation of existing connections or pools.

For a standalone connection, you can authenticate as an externally identified
user like:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const connection = await oracledb.getConnection(config);

    . . . // connection has access to the schema objects of the externally identified user

If a user ``HR`` has been given the ``CONNECT THROUGH`` grant from the
externally identified user ``MYPROXYUSER``:

.. code-block:: sql

    ALTER USER hr GRANT CONNECT THROUGH myproxyuser;

then to specify that the session user of the connection should be
``HR``, use:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", user: "[hr]", externalAuth: true };
    const connection = await oracledb.getConnection(config);

    . . . // connection has access to the HR schema objects

For a *Pool*, you can authenticate as an externally identified user
like:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const pool = await oracledb.createPool(config);
    const connection = await pool.getConnection();

    . . . // connection has access to the schema objects of the externally identified user

    await connection.close();

If a user ``HR`` has been given the ``CONNECT THROUGH`` grant from the
externally identified user, then to specify that the session user of the
connection should be ``HR``, use:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const pool = await oracledb.createPool(config);
    const connection = await pool.getConnection({ user: "[hr]" });

    . . . // connection has access to the HR schema objects

    await connection.close();

Note this last case needs Oracle Client libraries version 18 or later.

Using ``externalAuth`` in the ``connAttrs`` parameter of a
``pool.getConnection()`` call is not possible. The connections from a
*Pool* object are always obtained in the manner in which the pool was
initially created.

For pools created with external authentication, the number of
connections initially created is zero even if a larger value is
specified for :attr:`~oracledb.poolMin`. The pool increment is
always 1, regardless of the value of
:attr:`~pool.poolIncrement`. Once the number of open
connections exceeds ``poolMin`` and connections are idle for more than
the :attr:`oracledb.poolTimeout` seconds, then the number of
open connections does not fall below ``poolMin``.

.. _tokenbasedauthentication:

Token-Based Authentication
==========================

Token-Based Authentication allows users to connect to a database by
using an encrypted authentication token without having to enter a
database username and password. The authentication token must be valid
and not expired for the connection to be successful. Users already
connected will be able to continue work after their token has expired
but they will not be able to reconnect without getting a new token.

The two authentication methods supported by node-oracledb are Open
Authorization :ref:`OAuth 2.0 <oauthtokenbasedauthentication>` and Oracle
Cloud Infrastructure (OCI) Identity and Access Management
:ref:`IAM <iamtokenbasedauthentication>`.

Token-based authentication can be used for both standalone connections
and connection pools.

.. _oauthtokenbasedauthentication:

OAuth 2.0 Token-Based Authentication
------------------------------------

Oracle Cloud Infrastructure (OCI) users can be centrally managed in a
Microsoft Azure Active Directory (Azure AD) service. Open Authorization
(OAuth 2.0) token-based authentication allows users to authenticate to
Oracle Database using Azure AD OAuth 2.0 tokens. Your Oracle Database
must be registered with Azure AD. Both Thin and Thick modes of the
node-oracledb driver support OAuth 2.0 token-based authentication.

See `Authenticating and Authorizing Microsoft Azure Active Directory
Users for Oracle Autonomous Databases <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-60AAC16E-5274-463D-9F29-4826F25D5585>`__ for
more information.

When using node-oracledb in Thick mode, Oracle Client libraries 19.15 (or
later), or 21.7 (or later) are needed.

.. _oauthtokengeneration:

OAuth 2.0 Token Generation
++++++++++++++++++++++++++

Authentication tokens can be obtained in several ways. For example, you
can use a curl command against the Azure Active Directory API such as::

    curl -X POST -H 'Content-Type: application/x-www-form-urlencoded'
    https://login.microsoftonline.com/[<TENANT_ID>]/oauth2/v2.0/token
    -d 'client_id = <APP_ID>'
    -d 'scope = <SCOPES>'
    -d 'username = <USER_NAME>'
    -d 'password = <PASSWORD>'
    -d 'grant_type = password'
    -d 'client_secret = <SECRET_KEY>'

Substitute your own values as appropriate for each argument.

This returns a JSON response containing an ``access_token`` attribute.
See `Microsoft identity platform and OAuth 2.0 authorization code
flow <https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-
oauth2-auth-code-flow>`__ for more details. This attribute can be passed as
the ``oracledb.getConnection()`` attribute
:ref:`accessToken <getconnectiondbattrsaccesstoken>` or as the
``oracledb.createPool()`` attribute
:ref:`accessToken <createpoolpoolattrsaccesstoken>`.

Alternatively, authentication tokens can be generated by calling the
Azure Active Directory REST API, for example:

.. code-block:: javascript

    function getOauthToken() {
        const requestParams = {
            client_id     : <CLIENT_ID>,
            client_secret : <CLIENT_SECRET>,
            grant_type    : 'client_credentials',
            scope         : <SCOPES>,
        };
        const tenantId = <TENANT_ID>;
        const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        return new Promise(function(resolve, reject) {
            request.post({
                url       : url,
                body      : queryString.stringify(requestParams),
                headers   : { 'Content-Type': 'application/x-www-form-urlencoded' }
            }, function(err, response, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body).access_token);
                }
            });
        });
    }

Substitute your own values as appropriate for each argument. The use of
``getOauthToken()`` is shown in subsequent examples.

Alternatively, OAuth 2.0 authentication tokens can be generated in the
node-oracledb driver using the Azure Software Development Kit (SDK). This was
introduced in node-oracledb 6.3. To use the Azure SDK, you must install the
`Microsoft Authentication Library for Node (msal-node) <https://www.npmjs.com/
package/@azure/msal-node>`__ package which can be done with the following
command::

    npm install @azure/msal-node


Authentication tokens generated by the Azure SDK can be read by your
application. For example:

.. code-block:: javascript

    async function getToken(accessTokenConfig) {
        ... // Azure-specific authentication types
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. The use of ``getToken()`` and ``accessTokenConfig`` is shown in
subsequent examples.

.. _oauthstandalone:

OAuth 2.0 Standalone Connections
++++++++++++++++++++++++++++++++

Standalone connections can be created using OAuth2 token-based
authentication, for example:

.. code-block:: javascript

    let accessTokenStr;  // the token string. In this app it is also the token "cache"

    async function tokenCallback(refresh) {
        if (refresh || !accessTokenStr) {
            accessTokenStr = await getOauthToken(); // getOauthToken() was shown earlier
        }
        return accessTokenStr;
    }

    async function init() {
        try {
            await oracledb.getConnection({
                accessToken   : tokenCallback,    // the callback returning the token
                externalAuth  : true,             // must specify external authentication
                connectString : connect_string    // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

In this example, the global variable ``accessTokenStr`` is used to
“cache” the access token string so any subsequent callback invocation
will not necessarily have to incur the expense of externally getting a
token. For example, if the application opens two connections for the
same user, the token acquired for the first connection can be reused
without needing to make a second REST call.

The ``getConnection()`` function’s
:ref:`accessToken <getconnectiondbattrsaccesstoken>` attribute in this
example is set to the callback function that returns an OAuth 2.0 token
used by node-oracledb for authentication. This function
``tokenCallback()`` will be invoked when ``getConnection()`` is called.
If the returned token is found to have expired, then ``tokenCallback()``
will be called a second time. If the second invocation of
``tokenCallback()`` also returns an expired token, then the connection
will fail.

The ``refresh`` parameter is set internally by the node-oracledb driver
depending on the status and validity of the authentication token provided by
the application. The value of the ``refresh`` parameter will be different
every time the callback is invoked:

-  When ``refresh`` is *true*, the token is known to have expired so the
   application must get a new token. This is then stored in the global
   variable ``accessTokenStr`` and returned.

-  When ``refresh`` is *false*, the application can return the token
   stored in ``accessTokenStr``, if it is set. But if it is not set
   (meaning there is no token cached), then the application externally
   acquires a token, stores it in ``accessTokenStr``, and returns it.

If you set the
:ref:`accessTokenConfig <getconnectiondbattrsaccesstokenconfig>` property in
addition to the :ref:`accessToken <getconnectiondbattrsaccesstoken>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
during standalone connection creation, then you can use the Azure SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig); // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function init() {
        try {
            await oracledb.getConnection({
                accessToken   : callbackfn,        // the callback returning the token
                accessTokenConfig : {
                                        ...        // Azure-specific parameters to be set
                                                   // when using Azure SDK
                                    }
                externalAuth  : true,              // must specify external authentication
                connectString : '...'              // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. The callback and ``refresh`` parameter descriptions are detailed
in the example above.

.. _oauthpool:

OAuth 2.0 Connection Pooling
++++++++++++++++++++++++++++

Pooled connections can be created using OAuth 2.0 token-based
authentication, for example:

.. code-block:: javascript

    let accessTokenStr;  // The token string. In this app it is also the token "cache"

    async function tokenCallback(refresh) {
        if (refresh || !accessTokenStr) {
            accessTokenStr = await getOauthToken(); // getOauthToken() was shown earlier
        }
        return accessToken;
    }

    async function init() {
        try {
            await oracledb.createPool({
                accessToken   : tokenCallback,        // the callback returning the token
                externalAuth  : true,                 // must specify external authentication
                homogeneous   : true,                 // must use an homogeneous pool
                connectString : '...'                 // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See :ref:`OAuth 2.0 Standalone Connections <oauthstandalone>` for a
description of the callback and ``refresh`` parameter. With connection
pools, the :ref:`accessToken <createpoolpoolattrsaccesstoken>`
attribute sets a callback function which will be invoked at the time the
pool is created (even if ``poolMin`` is 0). It is also called when the
pool needs to expand (causing new connections to be created) and the
current token has expired.

If you set the
:ref:`accessTokenConfig <createpoolpoolattrsaccesstokenconfig>` property
in addition to the :ref:`accessToken <createpoolpoolattrsaccesstoken>`,
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
during connection pool creation, then you can use the Azure SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig);  // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function init() {
        try {
            await oracledb.createPool({
                accessToken   : tokenCallback,        // the callback returning the token
                accessTokenConfig : {
                                        ...           // Azure-specific parameters to be set
                                                      // when using Azure SDK
                                    }
                externalAuth  : true,                 // must specify external authentication
                homogeneous   : true,                 // must use an homogeneous pool
                connectString : '...'                 // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. See :ref:`OAuth 2.0 Standalone Connections <oauthstandalone>` for a
description of the callback and ``refresh`` parameter.

.. _oauthconnectstring:

OAuth 2.0 Connection Strings
++++++++++++++++++++++++++++

Applications built with node-oracledb 5.5, or later, should use the
connection or pool creation parameters described earlier. However, if
you cannot use them, you can use OAuth 2.0 Token Authentication by
configuring Oracle Net options.

.. note::

    In this release, OAuth 2.0 connection strings are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

This requires Oracle Client libraries 19.15 (or later), or 21.7 (or later).

Save the generated access token to a file and set the connect descriptor
``TOKEN_LOCATION`` option to the directory containing the token file.
The connect descriptor parameter ``TOKEN_AUTH`` must be set to
``OAUTH``, the ``PROTOCOL`` value must be ``TCPS``, the
``SSL_SERVER_DN_MATCH`` value should be ``ON``, and the parameter
``SSL_SERVER_CERT_DN`` should be set. For example, your
:ref:`tnsnames.ora <tnsnames>` file might contain:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OAUTH)
          (TOKEN_LOCATION="/opt/oracle/token")
          ))

You can alternatively set ``TOKEN_AUTH`` and ``TOKEN_LOCATION`` in a
:ref:`sqlnet.ora <tnsadmin>` file. The ``TOKEN_AUTH`` and
``TOKEN_LOCATION`` values in a connection string take precedence over
the ``sqlnet.ora`` settings.

See `Oracle Net Services documentation <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=NETRF>`__ for more information.

.. _iamtokenbasedauthentication:

IAM Token-Based Authentication
------------------------------

Token-based authentication allows Oracle Cloud Infrastructure users to
authenticate to Oracle Database with Oracle Identity Access Management
(IAM) tokens. Both Thin and Thick modes of the node-oracledb driver support
IAM token-based authentication.

When using node-oracledb in Thick mode, Oracle Client libraries 19.14 (or
later), or 21.5 (or later) are needed.

See `Configuring the Oracle Autonomous Database for IAM
Integration <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
4E206209-4E3B-4387-9364-BDCFB4E16E2E>`__ for more information.

.. _iamtokengeneration:

IAM Token Generation
++++++++++++++++++++

Authentication tokens can be obtained in several ways. For example you
can use the Oracle Cloud Infrastructure command line interface (OCI CLI)
command run externally to Node.js:

::

    oci iam db-token get

On Linux a folder ``.oci/db-token`` will be created in your home
directory. It will contain the token and private key files needed by
node-oracledb.

See `Working with the Command Line Interface <https://docs.oracle.com/en-us/
iaas/Content/API/Concepts/cliconcepts.htm>`__ for more information on the OCI
CLI.

Alternatively, IAM authentication tokens can be generated in the node-oracledb
driver using the Oracle Cloud Infrastructure (OCI) SDK. This was introduced in
node-oracledb 6.3. To use the OCI SDK, you must install the `oci-sdk package
<https://www.npmjs.com/package/oci-sdk>`__ which can be done with the
following command::

    npm install oci-sdk

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.

.. _iamtokenextraction:

IAM Token and Private Key Extraction
++++++++++++++++++++++++++++++++++++

Token and private key files created externally can be read by Node.js
applications, for example like:

.. code-block:: javascript

    function getIAMToken() {
        const tokenPath = '/home/cjones/.oci/db-token/token';
        const privateKeyPath = '/home/cjones/.oci/db-token/oci_db_key.pem';

        let token = '';
        let privateKey = '';
        try {
            // Read the token file
            token = fs.readFileSync(tokenPath, 'utf8');
            // Read the private key file
            const privateKeyFileContents = fs.readFileSync(privateKeyPath, 'utf-8');
            privateKeyFileContents.split(/\r?\n/).forEach(line => {
                if (line != '-----BEGIN PRIVATE KEY-----' &&
                    line != '-----END PRIVATE KEY-----')
                privateKey = privateKey.concat(line);
            });
        } catch (err) {
            console.error(err);
        } finally {
            const tokenBasedAuthData = {
                token       : token,
                privateKey  : privateKey
            };
            return tokenBasedAuthData;
        }
    }

The token and key can be used during subsequent authentication.

Token and private key values generated by the OCI SDK can be read by your
application. For example:

.. code-block:: javascript

    async function getToken(accessTokenConfig) {
        ... // OCI-specific authentication details
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
The use of ``getToken()`` and ``accessTokenConfig`` is shown in subsequent
examples.

.. _iamstandalone:

IAM Standalone Connections
++++++++++++++++++++++++++

Standalone connections can be created in the node-oracledb Thin and Thick
modes using IAM token-based authentication.

.. code-block:: javascript

    let accessTokenObj;  // the token object. In this app it is also the token "cache"

    function tokenCallback(refresh) {
        if (refresh || !accessTokenObj) {
            accessTokenObj = getIAMToken();     // getIAMToken() was shown earlier
        }
        return accessTokenObj;
    }

    async function init() {
        try {
            await oracledb.getConnection({
                accessToken    : tokenCallback,  // the callback returns the token object
                externalAuth   : true,           // must specify external authentication
                connectString  : '...'           // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

In this example, the global object ``accessTokenObj`` is used to “cache”
the IAM access token and private key (using the attributes ``token`` and
``privateKey``) so any subsequent callback invocation will not
necessarily have to incur the expense of externally getting them. For
example, if the application opens two connections for the same user, the
token and private key acquired for the first connection can be reused
without needing to make a second REST call.

The ``getConnection()`` function’s
:ref:`accessToken <getconnectiondbattrsaccesstoken>` attribute in this
example is set to the callback function that returns an IAM token and
private key used by node-oracledb for authentication. This function
``tokenCallback()`` will be invoked when ``getConnection()`` is called.
If the returned token is found to have expired, then ``tokenCallback()``
will be called a second time. If the second invocation of
``tokenCallback()`` also returns an expired token, then the connection
will fail.

The ``refresh`` parameter is set internally by the node-oracledb driver
depending on the status and validity of the authentication token provided by
the application. The value of the ``refresh`` parameter will be different
every time the callback is invoked:

-  When ``refresh`` is *true*, the token is known to have expired so the
   application must get a new token and private key. These are then
   stored in the global object ``accessTokenObj`` and returned.

-  When ``refresh`` is *false*, the application can return the token and
   private key stored in ``accessTokenObj``, if it is set. But if it is
   not set (meaning there is no token or key cached), then the
   application externally acquires a token and private key, stores them
   in ``accessTokenObj``, and returns it.

If you set the
:ref:`accessTokenConfig <getconnectiondbattrsaccesstokenconfig>` property in
addition to the :ref:`accessToken <getconnectiondbattrsaccesstoken>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
during standalone connection creation, then you can use the OCI SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig); // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function init() {
        try {
            await oracledb.getConnection({
                accessToken   : callbackfn,        // the callback returning the token
                accessTokenConfig : {
                                        ...        // OCI-specific parameters to be set
                                                   // when using OCI SDK
                                    }
                externalAuth  : true,              // must specify external authentication
                connectString : '...'              // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
The callback and ``refresh`` parameter descriptions are detailed in the
example above.

.. _iampool:

IAM Connection Pooling
++++++++++++++++++++++

Pooled connections can be created using IAM token-based authentication,
for example:

.. code-block:: javascript

    let accessTokenObj;  // The token string. In this app it is also the token "cache"

    function tokenCallback(refresh) {
        if (refresh || !accessTokenObj) {
            accessTokenObj = getIAMToken();      // getIAMToken() was shown earlier
        }
        return accessToken;
    }

    async function init() {
        try {
            await oracledb.createPool({
                accessToken   : tokenCallback,     // the callback returning the token
                externalAuth  : true,              // must specify external authentication
                homogeneous   : true,              // must use an homogeneous pool
                connectString : connect_string     // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See :ref:`IAM Standalone Connections <iamstandalone>` for a description of
the callback and ``refresh`` parameter. With connection pools, the
:ref:`accessToken <createpoolpoolattrsaccesstoken>` attribute sets a
callback function which will be invoked at the time the pool is created
(even if ``poolMin`` is 0). It is also called when the pool needs to
expand (causing new connections to be created) and the current token has
expired.

If you set the
:ref:`accessTokenConfig <createpoolpoolattrsaccesstokenconfig>` property
in addition to the :ref:`accessToken <createpoolpoolattrsaccesstoken>`,
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
during connection pool creation, then you can use the OCI SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig);
        }
        return accessTokenData;
    }

    async function init() {
        try {
            await oracledb.createPool({
                accessToken   : tokenCallback,        // the callback returning the token
                accessTokenConfig : {
                                        ...           // OCI-specific parameters to be set
                                                      // when using Azure SDK
                                    }
                externalAuth  : true,                 // must specify external authentication
                homogeneous   : true,                 // must use an homogeneous pool
                connectString : '...'                 // Oracle Autonomous Database connection string
            });
        } catch (err) {
            console.error(err);
        }
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
See :ref:`IAM Standalone Connections <iamstandalone>` for a description of
the callback and ``refresh`` parameter.

.. _iamconnectstring:

IAM Connection Strings
++++++++++++++++++++++

Applications built with node-oracledb 5.4, or later, should use the
connection or pool creation parameters described earlier. However, if
you cannot use them, you can use IAM Token Authentication by configuring
Oracle Net options.

.. note::

    In this release, IAM connection strings are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

This requires Oracle Client libraries 19.14 (or later), or 21.5 (or later).

Save the generated access token to a file and set the connect descriptor
``TOKEN_LOCATION`` option to the directory containing the token file.
The connect descriptor parameter ``TOKEN_AUTH`` must be set to
``OCI_TOKEN``, the ``PROTOCOL`` value must be ``TCPS``, the
``SSL_SERVER_DN_MATCH`` value should be ``ON``, and the parameter
``SSL_SERVER_CERT_DN`` should be set. For example, if the token and
private key are in the default location used by the `OCI CLI <https://
docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm>`__,
your :ref:`tnsnames.ora <tnsnames>` file might contain:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OCI_TOKEN)
          ))

This reads the IAM token and private key from the default location, for
example ``~/.oci/db-token/`` on Linux.

If the token and private key files are not in the default location then
their directory must be specified with the ``TOKEN_LOCATION`` parameter.
For example in a ``tnsnames.ora`` file:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OCI_TOKEN)
          (TOKEN_LOCATION="/opt/oracle/token")
          ))

You can alternatively set ``TOKEN_AUTH`` and ``TOKEN_LOCATION`` in a
:ref:`sqlnet.ora <tnsadmin>` file. The ``TOKEN_AUTH`` and
``TOKEN_LOCATION`` values in a connection string take precedence over
the ``sqlnet.ora`` settings.

See `Oracle Net Services documentation <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=NETRF>`__ for more information.

.. _drcp:

Database Resident Connection Pooling (DRCP)
===========================================

`Database Resident Connection Pooling <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-015CA8C1-2386-4626-855D-CC546DDC1086>`__
(DRCP) enables database resource sharing for applications which use a large
number of connections that run in multiple client processes or run on multiple
middle-tier application servers. DRCP reduces the overall number of
connections that a database must handle. DRCP support is available in both
Thin and :ref:`Thick <enablingthick>` modes.

DRCP is generally used only when the database host does not have enough
memory to keep all connections open concurrently. For example, if your
application runs as 10 Node.js processes each with a connection pool
having ``poolMax`` of 50, then the database host must be able to have 10
\* 50 = 500 database server processes open at the same time. If the
database host does not have enough memory for these 500 server
processes, then DRCP may be a solution because a smaller pool of server
processes will be shared between all the Node.js connections.

DRCP is useful for applications which share the same database
credentials, have similar session settings (for example date format
settings or PL/SQL package state), and where the application gets a
database connection, works on it for a relatively short duration, and
then releases it.

The `Oracle DRCP documentation <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-015CA8C1-2386-4626-855D-CC546DDC1086>`__
has more details, including when to use, and when not to use DRCP.

To use DRCP in node-oracledb:

1. The DRCP pool must be started in the database, for example:

   ``SQL> EXECUTE DBMS_CONNECTION_POOL.START_POOL();``

2. The :attr:`oracledb.connectionClass` property should be set by the
   node-oracledb application. If it is set, then the connection class
   specified in this property is used in both standalone and pooled
   connections.

   You can also :ref:`specify the connection class in a connection string
   <cclasspurity>` by setting the ``POOL_CONNECTION_CLASS`` parameter. If this
   parameter is set, then this connection class is used in both standalone
   and pooled connections.

   If both the :attr:`oracledb.connectionClass` property and the
   ``POOL_CONNECTION_CLASS`` connection string parameter are set, then the
   ``POOL_CONNECTION_CLASS`` parameter has the highest priority and overrides
   the default or application specified values.

   If :attr:`oracledb.connectionClass` and ``POOL_CONNECTION_CLASS``
   connection string parameter are not set, then:

   - For standalone connections, the session request is sent to the shared
     connection class in DRCP.

   - For pooled connections, the pool generates a unique connection class if
     a previously generated connection class does not exist. This connection
     class is used when acquiring connections from the pool. The node-oracledb
     Thin mode generates a connection class with the prefix "NJS" while the
     Thick mode generates a connection class with the prefix "OCI".

   If the connection class is not set, the pooled server session memory will
   not be reused optimally, and the statistic views will record large values
   for ``NUM_MISSES``.

3. The ``pool.createPool()`` or ``oracledb.getConnection()`` property
   ``connectString`` (or its alias ``connectionString``) must specify to
   use a pooled server, either by the Easy Connect syntax like
   :ref:`myhost/sales:POOLED <easyconnect>`, or by using a
   :ref:`tnsnames.ora <tnsnames>` alias for a connection that contains
   ``(SERVER=POOLED)``.

For efficiency, it is recommended that DRCP connections should be used
with node-oracledb’s local :ref:`connection pool <poolclass>`.

.. _cclasspurity:

**Setting the Connection Class and Purity in the Connection String**

Using node-oracledb Thin mode with Oracle Database 21c or later, you can
specify the connection class and pool purity in an
:ref:`Easy Connect String <easyconnect>` or a
:ref:`Full Connect Descriptor string <embedtns>`. For node-oracledb Thick
mode, you require Oracle Database 21c (or later) and Oracle Client 19c (or
later).

The connection class can be specified in a connection string by setting the
``POOL_CONNECTION_CLASS`` parameter. The value for ``POOL_CONNECTION_CLASS``
can be any string conforming to connection class semantics and is
case-sensitive.

The pool purity specifies whether the node-oracledb application must use a new
session or reuse a pooled session. You can specify the pool purity in a
connection string by setting the ``POOL_PURITY`` parameter. The valid values
for ``POOL_PURITY`` are *SELF* and *NEW*. These values are not case-sensitive.
The value *NEW* indicates that the application must use a new session. The
value *SELF* allows the application to reuse both the pooled server process
and session memory, giving maximum benefit from DRCP. See the Oracle
documentation on `benefiting from scalability <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-661BB906-74D2-4C5D-9C7E-2798F76501B3>`__.
If this parameter is not defined in the connect string, then by default the
pool purity is *NEW* for standalone connections and *SELF* for pooled
connections.

An example of setting the connection class and pool purity in an Easy Connect
string is shown below::

    dsn = "localhost/orclpdb:pooled?pool_connection_class=MYAPP&pool_purity=self"

An example of setting the connection class and pool purity in an Full Connect
Descriptor string is shown below::

    db_alias =
        (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(PORT=1522)(HOST=abc.oraclecloud.com))
          (CONNECT_DATA=(SERVICE_NAME=cdb1_pdb1.regress.rdbms.dev.us.oracle.com)(SERVER=POOLED)
          (POOL_CONNECTION_CLASS=cclassname)(POOL_PURITY=SELF)))

**Monitoring DRCP**

There are a number of Oracle Database ``V$`` views that can be used to
monitor DRCP. These are discussed in the Oracle documentation and in the
Oracle technical paper `Extreme Oracle Database Connection Scalability with
Database Resident Connection Pooling (DRCP) <https://www.oracle.com/docs/tech/
drcp-technical-brief.pdf>`__. This paper also gives more detail on configuring
DRCP.

.. _implicitpool:

Implicit Connection Pooling
===========================

`Implicit connection pooling <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-A9D74994-D81A-47BF-BAF2-E4E1A354CA99>`__ is useful for
applications that cause excess database server load due to the number of
:ref:`standalone connections <standaloneconnection>` opened. When these
applications cannot be rewritten to use
:ref:`node-oracledb connection pooling <connpooling>`, then implicit
connection pooling may be an option to reduce the load on the database system.

Implicit connection pooling allows application connections to share pooled
servers in :ref:`DRCP <drcp>` or Oracle Connection Manager in Traffic Director
Mode's (CMAN-TDM) `Proxy Resident Connection Pooling (PRCP)
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E0032017-03B1-
4F14-AF9B-BCC87C982DA8>`__. Applications do not need to be modified. The
feature is enabled by adding a ``POOL_BOUNDARY`` parameter to the
application's :ref:`connection string <connectionstrings>`. Applications do
not need to explicitly acquire, or release, connections to be able use a DRCP
or PRCP pool.

Implicit connection pooling is available in node-oracledb Thin and
:ref:`Thick <enablingthick>` modes. It requires Oracle Database
23ai. Node-oracledb Thick mode additionally requires Oracle Client 23ai
libraries. The Thin mode works with implicit connection pooling from
node-oracledb 6.4 onwards.

With implicit connection pooling, connections are internally acquired from the
DRCP or PRCP pool when they are actually used by the application to do database
work. They are internally released back to pool when not in use. This may
occur between the application's explicit :meth:`oracledb.getConnection()` call
and :meth:`connection.close()` (or the application's equivalent connection
release at end-of-scope). The internal connection release can be controlled by
the value of the ``POOL_BOUNDARY`` connection string parameter, which can be
either:

- *STATEMENT*: If this boundary value is specified, then the connection is
  released back to the DRCP or PRCP pool when the connection is implicitly
  stateless. A connection is implicitly stateless when all open cursors in a
  session have been fetched through to completion, and there are no active
  transactions, no temporary tables, and no temporary LOBs.

- *TRANSACTION*: If this boundary value is specified, then the connection is
  released back to the DRCP or PRCP pool when either one of the methods
  :meth:`connection.commit()` or :meth:`connection.rollback()` are
  called. It is recommended to not set the
  :ref:`autoCommit <propexecautocommit>` property to *true* when using
  implicit connection pooling. If you do set this attribute to *true*, then
  you will be unable to:

  - Fetch any data that requires multiple :ref:`round-trips <roundtrips>` to
    the database
  - Run queries that fetch :ref:`LOB <lobhandling>` and
    :ref:`JSON <jsondatatype>` data

Inline with DRCP and PRCP best practices regarding session sharing across
differing applications, you should add a connection string
``POOL_CONNECTION_CLASS`` parameter, using the same value for all applications
that are alike.

The DRCP and PRCP "purity" used by Implicit Connection Pooling defaults to
SELF, which allows reuse of the server process session memory for best
performance. Adding the connection string parameter ``POOL_PURITY=NEW`` will
change this and cause each use of a connection to recreate the session memory.

.. _useimplicitconnpool:

**Configuring Implicit Connection Pooling**

To use implicit connection pooling in node-oracledb with DRCP:

1. Enable DRCP in the database. For example in SQL*Plus::

    SQL> EXECUTE DBMS_CONNECTION_POOL.START_POOL();

2. Specify the server type as *pooled* and also set the ``POOL_BOUNDARY``
   attribute to either *STATEMENT* or *TRANSACTION* in:

   - The ``connectString`` property of :meth:`oracledb.getConnection()` or
     :meth:`oracledb.createPool()` in the
     :ref:`Easy Connect string <easyconnect>`. For example:

     .. code-block:: javascript

        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // mypw contains the hr schema password
            connectString : "mydbmachine.example.com:1521/orclpdb1:pooled?pool_boundary=statement"
        });

     In the above example, implicit connection pooling is set to use statement
     boundary to release the connections back to the DRCP or PRCP pool.

   - Or the ``CONNECT_DATA`` section of the
     :ref:`Connect Descriptor string <embedtns>` used in an Oracle Network
     configuration file such as :ref:`tnsnames.ora <tnsadmin>`. For example,
     to use implicit connection pooling with the *transaction* boundary::

        tnsalias = (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=mymachine.example.com)
                    (PORT=1521))(CONNECT_DATA=(SERVICE_NAME=orcl)
                    (SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)))

     In the above example, implicit connection pooling is set to use
     transaction boundary to release the connections back to the DRCP or PRCP
     pool.

     .. note::

        Implicit connection pooling is not enabled if the application sets the
        ``POOL_BOUNDARY`` attribute to *TRANSACTION* or *STATEMENT* but does
        not set the ``SERVER=POOLED`` attribute in the connection string.

   If you specify an invalid ``POOL_BOUNDARY`` in the
   :ref:`Easy Connect string <easyconnect>` or the
   :ref:`Connect Descriptor string <embedtns>`, then the following error is
   returned::

    ORA-24545: invalid value of POOL_BOUNDARY specified in connect string

3. Set the connection class in:

   - The ``connectString`` property of :meth:`oracledb.getConnection()` or
     :meth:`oracledb.createPool()` in the
     :ref:`Easy Connect string <easyconnect>`. For example, to use a class
     name 'myapp':

     .. code-block:: javascript

        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // mypw contains the hr schema password
            connectString : "mydbmachine.example.com:1521/orclpdb1:pooled?pool_boundary=statement&pool_connection_class=myapp"
        });

   - Or the ``CONNECT_DATA`` section of the :ref:`Connect Descriptor string
     <embedtns>`. For example, to use a class name 'myapp'::

        tnsalias = (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=mymachine.example.com)
                    (PORT=1521))(CONNECT_DATA=(SERVICE_NAME=orcl)
                    (SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)
                    (POOL_CONNECTION_CLASS=myapp)))

   Use the same connection class name for application processes of the same
   type where you want session memory to be reused for connections.

   The pool purity can also optionally be changed by adding ``POOL_PURITY=NEW``
   to the connection string or descriptor.

Similar steps can be used with PRCP. For general information on PRCP, see the
technical brief `CMAN-TDM — An Oracle Database connection proxy for scalable
and highly available applications <https://download.oracle.com/
ocomdocs/global/CMAN_TDM_Oracle_DB_Connection_Proxy_for_scalable_apps.pdf>`__.

**Implicit Pooling Notes**

You should thoroughly test your application when using implicit connection
pooling to ensure that the internal reuse of database servers does not cause
any problems. For example, any session state such as the connection `session
id and serial number <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__ will vary throughout the
lifetime of the application connection because different servers may be used
at different times. Another example is when using a statement boundary of
*transaction*. In this scenario, any commit can invalidate open cursors.

It is recommended to use node-oracledb's local :ref:`connpooling` where
possible instead of implicit connection pooling. This gives multi-user
applications more control over pooled server reuse.

.. _privconn:

Privileged Connections
======================

Database privileges such as ``SYSDBA`` or ``SYSOPER`` can be associated with
the user when creating standalone and pooled connections. You can use one of
the :ref:`Privileged Connection Constants <oracledbconstantsprivilege>` as the
database privilege for the user.

For :ref:`standalone connections <standaloneconnection>`, you must set the
:ref:`privilege <getconnectiondbattrsprivilege>` property in
:meth:`oracledb.getConnection()` as shown in the example below:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "sys",
        password      : "secret",
        connectString : "localhost/orclpdb1",
        privilege     : oracledb.SYSDBA
    });

    console.log("I have power");

For :ref:`pooled connections <connpooling>` with node-oracledb Thin mode, you
must set the :ref:`privilege <createpoolpoolattrsprivilege>`,
:ref:`user <createpoolpoolattrsuser>`, and
:ref:`password <createpoolpoolattrspassword>` properties in
:meth:`oracledb.createPool()`. For example:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        user          : "sys",
        password      : "secret",
        connectString : "localhost/orclpdb1",
        privilege     : oracledb.SYSDBA
        poolMin       : 2,
        poolMax       : 10
    });

    const connection = await pool.getConnection();

The ability to specify database privileges with pooled connections in Thin
mode was introduced in node-oracledb 6.5.1.

For node-oracledb Thick mode, privileged connections can only be created with
a :ref:`heterogeneous pool <connpoolproxy>`. You must set the
:ref:`homogeneous <createpoolpoolattrshomogeneous>` property to *false* in
:meth:`oracledb.createPool()` to use a heterogeneous pool. You can then
specify the :ref:`privilege <getconnectiondbattrsprivilege>`,
:ref:`user <getconnectiondbattrsuser>`, and
:ref:`password <getconnectiondbattrspassword>` properties in
:meth:`pool.getConnection()`. For example:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        connectString : "localhost/orclpdb1",
        homogeneous   : false,
        poolMax       : 10
    });

    const connection = await pool.getConnection({
        user          : "sys",
        password      : "secret",
        privilege     : oracledb.SYSDBA
    })

If you create a homogeneous pool with an invalid value specified in the
:ref:`privilege <createpoolpoolattrsprivilege>` property of
:meth:`oracledb.createPool()` in both node-oracledb Thin and Thick modes, then
the following error is raised::

    NJS-007: invalid value for "privilege" in parameter 1

However, any valid ``privilege`` property value is ignored in node-oracledb
Thick mode during homogeneous pool creation.

Note that if node-oracledb Thick mode is using the Oracle Client libraries
located in the Oracle Database installation, that is on the same machine as
the database and is not using Oracle Instant Client, then operating system
privileges may be used for authentication. In this case the password
value is ignored. For example on Linux, membership of the operating
system `dba <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-0A789F28-169A-43D6-9E48-AAE20D7B0C44>`__ group allows ``SYSDBA``
connections.

Administrative privileges can allow access to a database instance even
when the database is not open. Control of these privileges is totally
outside of the database itself. Care must be taken with authentication
to ensure security. See the `Database Administrator’s
Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
C48021EF-6AEA-427F-95B2-37EFCFEA2400>`__ for information.

.. _securenetwork:

Securely Encrypting Network Traffic to Oracle Database
======================================================

You can `encrypt <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-7F12066A-2BA1-476C-809B-BB95A3F727CF>`__ the data transferred between Oracle
Database and node-oracledb so that unauthorized parties are not able to view
plain text values as the data passes over the network.

Both node-oracledb Thin and Thick modes support :ref:`TLS <connectionadb>`.
Refer to the `Oracle Database Security Guide <https://www.oracle.com/pls/topic
/lookup?ctx=dblatest&id=GUID-41040F53-D7A6-48FA-A92A-0C23118BC8A0>`__ for more
configuration information.

.. _nne:

Native Network Encryption
-------------------------

With Oracle Database's `native network encryption <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-7F12066A-2BA1-476C-809B-BB95A3F727CF>`__,
the client and database server negotiate a key using Diffie-Hellman key
exchange. There is protection against man-in-the-middle attacks.

.. note::

    Oracle native network encryption is only supported in node-oracledb Thick
    mode. See :ref:`enablingthick`.

Native network encryption can be configured by editing Oracle Net’s
optional `sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__ configuration file. The file
on either the database server and/or on each node-oracledb ‘client’ machine
can be configured. Parameters control whether data integrity checking and
encryption is required or just allowed, and which algorithms the client and
server should consider for use.

As an example, to ensure all connections to the database are checked for
integrity and are also encrypted, create or edit the Oracle Database
``$ORACLE_HOME/network/admin/sqlnet.ora`` file. Set the checksum
negotiation to always validate a checksum and set the checksum type to
your desired value. The network encryption settings can similarly be
set. For example, to use the SHA512 checksum and AES256 encryption use::

    SQLNET.CRYPTO_CHECKSUM_SERVER = required
    SQLNET.CRYPTO_CHECKSUM_TYPES_SERVER = (SHA512)
    SQLNET.ENCRYPTION_SERVER = required
    SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)

If you definitely know that the database server enforces integrity and
encryption, then you do not need to configure node-oracledb separately.
However you can also, or alternatively, do so depending on your business
needs. Create a file ``sqlnet.ora`` on your client machine and locate it with
other :ref:`Optional Oracle Net Configuration <tnsadmin>`:

::

    SQLNET.CRYPTO_CHECKSUM_CLIENT = required
    SQLNET.CRYPTO_CHECKSUM_TYPES_CLIENT = (SHA512)
    SQLNET.ENCRYPTION_CLIENT = required
    SQLNET.ENCRYPTION_TYPES_CLIENT = (AES256)

The client and server sides can negotiate the protocols used if the
settings indicate more than one value is accepted.

Note these are example settings only. You must review your security
requirements and read the documentation for your Oracle version. In
particular, review the available algorithms for security and performance.

The ``NETWORK_SERVICE_BANNER`` column of the database view
`V$SESSION_CONNECT_INFO <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__
can be used to verify the encryption status of a connection. For example with
SQL*Plus::

    SQL> SELECT network_service_banner FROM v$session_connect_info;

If the connection is encrypted, then this query prints an output that includes
the available encryption service, the crypto-checksumming service, and the
algorithms in use, such as::

    NETWORK_SERVICE_BANNER
    -------------------------------------------------------------------------------------
    TCP/IP NT Protocol Adapter for Linux: Version 19.0.0.0.0 - Production
    Encryption service for Linux: Version 19.0.1.0.0 - Production
    AES256 Encryption service adapter for Linux: Version 19.0.1.0.0 - Production
    Crypto-checksumming service for Linux: Version 19.0.1.0.0 - Production
    SHA256 Crypto-checksumming service adapter for Linux: Version 19.0.1.0.0 - Production

If the connection is unencrypted, then the query will only print the
available encryption and crypto-checksumming service messages. For example::

    NETWORK_SERVICE_BANNER
    -------------------------------------------------------------------------------------
    TCP/IP NT Protocol Adapter for Linux: Version 19.0.0.0.0 - Production
    Encryption service for Linux: Version 19.0.1.0.0 - Production
    Crypto-checksumming service for Linux: Version 19.0.1.0.0 - Production

For more information about Oracle Data Network Encryption and Integrity,
and for information about configuring TLS network encryption, refer to
the `Oracle Database Security Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=DBSEG>`__. This manual also contains information about
other important security features that Oracle Database provides, such
Transparent Data Encryption of data-at-rest in the database.

.. _changingpassword:

Changing Passwords and Connecting with an Expired Password
==========================================================

Changing Passwords
------------------

Database passwords can be changed with :meth:`connection.changePassword()`.
For example:

.. code-block:: javascript

    const currentpw = ...  // the current password for the hr schema
    const newpw = ...      // the new hr schema password

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : currentpw,
        connectString : "localhost/orclpdb1"
    });

    await connection.changePassword("hr", currentpw, newpw);

Only DBAs or users with the ALTER USER privilege can change the
password of another user. In this case, the old password value is
ignored and can be an empty string:

.. code-block:: javascript

    const newpw = ... // the new password

    const connection = await oracledb.getConnection({
        user          : "system",  // a privileged user
        password      : mypw,      // mypw contains the system schema password
        connectString : "localhost/orclpdb1"
    });

    await connection.changePassword('hr', '', newpw);

Connecting with an Expired Password
-----------------------------------

When creating a standalone (non-pooled) connection, the user’s password
can be changed at the time of connection. This is most useful when the
user’s password has expired, because it allows a user to connect without
requiring a DBA to reset their password.

Both the current and new passwords must be given when connecting. For
example:

.. code-block:: javascript

    const oldpw = ...  // the hr schema's old password
    const newpw = ...  // the new password

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : oldpw,
        newPassword   : newpw,
        connectString : "localhost/orclpdb1"
    });

.. _connectionha:

Connections and High Availability
=================================

To make highly available applications, use the latest versions of Oracle
node-oracledb and Oracle Database.  If you are using node-oracledb Thick mode,
then also use the latest Oracle Client libraries which have improved
implementations to make connections efficient and available. In addition,
features like :ref:`Connection Pool Pinging <connpoolpinging>`, :ref:`Fast
Application Notification (FAN) <connectionfan>`, :ref:`Application Continuity
<appcontinuity>`, and `Oracle Net Services
<https://www.oracle.com/pls/topic/lookup?ctx= dblatest&id=NETRF>`__ settings
can all help high availability, often without the application being aware of
any issue. Some of these features are only supported in node-oracledb
:ref:`Thick <enablingthick>` mode.

For application high availability, use a :ref:`connection
pool <connpooling>`. Pools provide immediately available connections.
Also the internal pool implementation supports a number of Oracle
Database high availability features for planned and unplanned database
instance downtime. Use a :ref:`fixed size pool <conpoolsizing>` to avoid
connection storms.

Configuring TCP timeouts can help avoid application hangs if there is a
network failure. :ref:`FAN <connectionfan>` is also useful.

Oracle Net options may be useful for high availability and performance
tuning. Connection establishment timeouts can be
:ref:`set <dbcalltimeouts>`. The database’s ``listener.ora`` file can have
`RATE_LIMIT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
F302BF91-64F2-4CE8-A3C7-9FDB5BA6DCF8>`__ and
`QUEUESIZE <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-FF87387C-1779-4CC3-932A-79BB01391C28>`__ parameters that can help
handle connection storms. In the bigger picture, Oracle Net can be used to
configure database service settings, such as for failover using
:ref:`Oracle RAC <connectionrac>` or a standby database.

:ref:`Database Resident Connection Pooling (DRCP) <drcp>` may be useful to
reduce load on a database host. It can also help reduce connection time
when a number of Node.js processes are used to scale up an application.

Finally, applications should always check for execution errors, and
perform appropriate application-specific recovery.

.. _connectionpremclose:

Preventing Premature Connection Closing
---------------------------------------

When connections are idle, external events may disconnect them from the
database. Unnecessarily having to re-establish connections can impact
scalability, cause connection storms, or lead to application errors when
invalid connections are attempted to be used.

There are three components to a node-oracledb connection:

1. The memory structure in node-oracledb that is returned by a
   ``getConnection()`` call. It may be a standalone connection or stored
   in a connection pool.

2. The underlying network connection between the database and the node-oracledb
   Thin mode network handling code or Oracle Client libraries.

3. A server process, or thread, on the database host to handle database
   processing.

Node-oracledb connections may become unusable due to network dropouts,
database instance failures, exceeding user profile resource limits, or
by explicit session closure of the server process from a DBA. By
default, idle connections (the memory structures) in connection pools
are unaware of these events. A subsequent ``pool.getConnection()`` call
could successfully return a “connection” to the application that will
not be usable. An error would only occur when later calling functions
like ``connection.execute()``. Similarly, using a standalone connection
where the network has dropped out, or the database instance is
unavailable, will return an error.

To avoid the overhead of connection re-creation, disable any firewall
that is killing idle connections. Also disable the database `resource
manager <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
2BEF5482-CF97-4A85-BD90-9195E41E74EF>`__ and any user resource profile
`IDLE_TIME <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__ setting so they do not
terminate sessions. These issues can be hidden by node-oracledb’s automatic
connection re-establishment features so it is recommended to use
`AWR <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
56AEF38E-9400-427B-A818-EDEC145F7ACD>`__ to check the connection rate,
and then fix underlying causes.

You can use an 'expire time' setting to prevent firewalls from terminating idle
connections and to adjust keepalive timeouts.  The general recommendation is to
use a value that is slightly less than half of the termination period.  In
node-oracledb Thin mode you can set the value in the connection string or with
:ref:`expireTime <getconnectiondbattrsexpiretime>` when connecting.  This
setting can also aid detection of a terminated remote database server.

With node-oracledb Thick mode, when using Oracle Client 19c, `EXPIRE_TIME
<https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-6140611A-83FC-4C9C-B31F-A41FC2A5B12D>`__ can be
used in :ref:`tnsnames.ora <tnsnames>` connect descriptors or in :ref:`Easy
Connect strings <easyconnect>`. With Oracle Client 21c the setting can
alternatively be in the application’s :ref:`sqlnet.ora <tnsadmin>` file.  In
older versions of Oracle Client, a ``tnsnames.ora`` connect descriptor option
`ENABLE=BROKEN <https://www.
oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7A18022A-E40D-4880-B3CE-
7EE9864756CA>`__ can be used instead of ``EXPIRE_TIME``.

If the network or the database server processes used by node-oracledb
connections cannot be prevented from becoming unusable, tune :ref:`Connection
Pool Pinging <connpoolpinging>`. Another case where this internal
pinging is helpful is during development, where a laptop may go offline
for an extended time.

.. _connectionfan:

Fast Application Notification (FAN)
-----------------------------------

Users of `Oracle Database FAN <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-EB0E1525-D3B3-469C-BE22-A569C76864A6>`__
must connect to a FAN-enabled database service. The application should
have :attr:`oracledb.events` is set to *true*. This value can also be
changed via :ref:`Oracle Client Configuration <oraaccess>`.

.. note::

        In this release, FAN is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

FAN support is useful for planned and unplanned outages. It provides
immediate notification to node-oracledb following outages related to the
database, computers, and networks. Without FAN, node-oracledb can hang
until a TCP timeout occurs and a network error is returned, which might
be several minutes.

FAN allows node-oracledb to provide high availability features without
the application being aware of an outage. Unused, idle connections in a
connection pool will be automatically cleaned up. A future
``pool.getConnection()`` call will establish a fresh connection to a
surviving database instance without the application being aware of any
service disruption.

To handle errors that affect active connections, you can add application
logic to re-connect (this will connect to a surviving database instance)
and replay application logic without having to return an error to the
application user. Alternatively, use :ref:`Application
Continuity <appcontinuity>`.

FAN benefits users of Oracle Database’s clustering technology (:ref:`Oracle
RAC <connectionrac>`) because connections to surviving database
instances can be immediately made. Users of Oracle’s Data Guard with a
broker will get FAN events generated when the standby database goes
online. Standalone databases will send FAN events when the database
restarts.

For a more information on FAN see the `technical paper on Fast
Application Notification <https://www.oracle.com/technetwork/database/options
/clustering/applicationcontinuity/learnmore/fastapplicationnotification12c-
2538999.pdf>`__.

.. _connectionrlb:

Runtime Load Balancing (RLB)
----------------------------

:ref:`Oracle Database RAC <connectionrac>` users with `Oracle Database (RLB)
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-25F85237-702B
-4609-ACE2-1454EBC8284B>`__ advisory events configured should use
node-oracledb :ref:`Connection Pooling <connpooling>` and make sure
:attr:`oracledb.events` is *true*. The events mode can also be
changed via :ref:`Oracle Client Configuration <oraaccess>`.

.. note::

        In this release, RLB is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

RLB allows optimal use of database resources by balancing database
requests across RAC instances.

For a more information on RLB, see the `technical paper on Fast Application
Notification <https://www.oracle.com/technetwork/database/options/clustering/
applicationcontinuity/learnmore/fastapplicationnotification12c-2538999.pdf>`__.

.. _appcontinuity:

Application Continuity
----------------------

Node-oracledb OLTP applications can take advantage of continuous
availability with the Oracle Database features Application Continuity (AC)
and Transparent Application Continuity (TAC). These help make unplanned
database service downtime transparent to applications.

.. note::

    In this release, Oracle AC and TAC functionalities are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

See the technical papers `Application Checklist for Continuous Service for MAA
Solutions <https://www.oracle.com/a/tech/docs/application-checklist-for-
continuous-availability-for-maa.pdf>`__, `Continuous Availability Application
Continuity for the Oracle Database <https://www.oracle.com/technetwork/
database/options/clustering/applicationcontinuity/applicationcontinuity
formaa-6348196.pdf>`__, and `Continuous Availability Best Practices for
Applications Using Autonomous Database - Dedicated <https://www.oracle.com
/technetwork/database/options/clustering/applicationcontinuity/continuous-
service-for-apps-on-atpd-5486113.pdf>`__.

When AC or TAC are configured on the database service, they are transparently
available to node-oracledb applications.

.. _dbcalltimeouts:

Database Call Timeouts
----------------------

Limiting the time to open new connections
+++++++++++++++++++++++++++++++++++++++++

To limit the amount of time taken to establish new connections to Oracle
Database:

- In node-oracledb Thin mode: You can use the connection attributes
  :ref:`connectTimeout <getconnectiondbattrsconntimeout>` or
  :ref:`transportConnectTimeout <getconnectiondbattrstransportconntimeout>`, or
  use the `CONNECT_TIMEOUT <https://www.
  oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F20C5DC5-C2FC-4145-9E4E-
  345CCB8148C7>`__ timeout parameter in a :ref:`connection string
  <easyconnect>`.

- In node-oracledb Thick mode: You can use `SQLNET.OUTBOUND_CONNECT_TIMEOUT
  <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-0857C817-675F
  -4CF0-BFBB-C3667F119176>`__ in a :ref:`sqlnet.ora <tnsadmin>` file or
  `CONNECT_TIMEOUT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
  GUID-F20C5DC5-C2FC-4145-9E4E-345CCB8148C7>`__ in a
  :ref:`connection string <easyconnect>`. When node-oracledb Thick mode uses
  Oracle Client libraries 19c or later, timeouts can be passed in
  :ref:`Easy Connect strings <easyconnect>`, for example to timeout after
  15 seconds: ``"mydbmachine.example.com/orclpdb1?connect_timeout=15"``.

When using a connection pool, these values affect the time taken to establish
each connection stored in the pool. The :attr:`~oracledb.queueTimeout` and
:attr:`~oracledb.queueMax` settings control higher-level pool behavior.

Limiting the time taken to execute statements
+++++++++++++++++++++++++++++++++++++++++++++

To limit the amount of time taken to execute statements on connections:

- In node-oracledb Thin mode: You can use :attr:`connection.callTimeout` which
  is described below.
- In node-oracledb Thick mode: You can use Oracle Net settings like
  `SQLNET.RECV_TIMEOUT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
  id=GUID-4A19D81A-75F0-448E-B271-24E5187B5909>`__ and `SQLNET.SEND_TIMEOUT
  <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-48547756-9C0B
  -4D14-BE85-E7ADDD1A3A66>`__ in a ``sqlnet.ora`` file. Or you can use the
  :attr:`connection.callTimeout` attribute which is available when
  node-oracledb uses Oracle Client libraries version 18, or later. The
  necessary out-of-band break setting is automatically configured when using
  Oracle Client 19 and Oracle Database 19, or later. With older Oracle
  versions on systems that drop (or in-line) out-of-band breaks, you may need
  to add `DISABLE_OOB=ON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
  &id=GUID-42E939DC-EF37-49A0-B4F0-14158F0E55FD>`__ to a ``sqlnet.ora`` file.

The :attr:`connection.callTimeout` attribute is a millisecond timeout for
executing database calls on a connection. The ``connection.callTimeout``
period is on each individual :ref:`round-trip <roundtrips>` between
node-oracledb and Oracle Database. Each node-oracledb method or operation
may require zero or more round-trips to Oracle Database. The ``callTimeout``
value applies to each round-trip individually, not to the sum of all
round-trips. Time spent processing in node-oracledb before or after the
completion of each round-trip is not counted.

-  If the time from the start of any one round-trip to the completion of
   that same round-trip exceeds ``callTimeout`` milliseconds, then the
   operation is halted and an error is returned.

-  In the case where a node-oracledb operation requires more than one
   round-trip and each round-trip takes less than ``callTimeout``
   milliseconds, then no timeout will occur, even if the sum of all
   round-trip calls exceeds ``callTimeout``.

-  If no round-trip is required, the operation will never be
   interrupted.

After a timeout occurs, node-oracledb attempts to clean up the internal
connection state. The cleanup is allowed to take another ``callTimeout``
milliseconds.

If the cleanup was successful, a *DPI-1067* error will be returned and
the application can continue to use the connection.

For small values of ``callTimeout``, the connection cleanup may not
complete successfully within the additional ``callTimeout`` period. In
this case a *DPI-1080* error is returned and the connection will no
longer be usable. The application should then close the connection.

.. _connectionrac:

Connecting to Oracle Real Application Clusters (RAC)
====================================================

`Oracle Real Application Clusters (RAC) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-D04AA2A7-2E68-4C5C-BD6E-36C62427B98E>`__
allow a single Oracle Database to be run across multiple servers. This
maximizes availability and enables horizontal scalability.

The Thin and Thick modes of node-oracledb can connect to Oracle RAC by using
a standard RAC connection string. Best practice is to use a :ref:`Connection
Pool <connpooling>` with :ref:`events <createpoolpoolattrsevents>`
enabled. See the section :ref:`Connections and High
Availability <connectionha>`.

Also see the technical papers `Application Checklist for Continuous
Service for MAA Solutions <https://www.oracle.com/a/tech/docs/application-
checklist-for-continuous-availability-for-maa.pdf>`__
and `Continuous Availability Application Continuity for the Oracle
Database <https://www.oracle.com/technetwork/database/options/clustering/
applicationcontinuity/applicationcontinuityformaa-6348196.pdf>`__.

.. _connectionadb:

Connecting to Oracle Cloud Autonomous Databases
===============================================

Node.js applications can connect to Oracle Autonomous Database (ADB) in Oracle
Cloud using one-way TLS (Transport Layer Security) or mutual TLS
(mTLS). One-way TLS and mTLS provide enhanced security for authentication and
encryption.

A database username and password are still required for your application
connections. If you need to create a new database schema so you do not login
as the privileged ADMIN user, refer to the relevant Oracle Cloud documentation,
for example see `Create Database Users <https://docs.oracle.com/en/cloud/paas/
autonomous-database/adbdu/managing-database-users.html#GUID-5B94EA60-554A-4BA4
-96A3-1D5A3ED5878D>`__ in the Oracle Autonomous Database manual.

When using node-oracledb Thin mode, Node.js flags can be used to set the
minimum TLS version used to connect to Oracle Database. For example, ``node
--tls-min-v1.3 examples/select1.js``.

.. _connectionadbtls:

One-way TLS Connection to Oracle Autonomous Database
----------------------------------------------------

With one-way TLS, node-oracledb applications can connect to Oracle ADB
without using a wallet. Both Thin and Thick modes of the node-oracledb
driver support one-way TLS. Applications that use the node-oracledb Thick
mode can connect to the Oracle ADB through one-way TLS only when using Oracle
Client library versions 19.14 (or later) or 21.5 (or later).

To enable one-way TLS for an ADB instance, complete the following steps in an
Oracle Cloud console in the **Autonomous Database Information** section of the
ADB instance details:

1. Click the **Edit** link next to *Access Control List* to update the Access
   Control List (ACL). The **Edit Access Control List** dialog box is displayed.

2. In the **Edit Access Control List** dialog box, select the type of address
   list entries and the corresponding values. You can include the required IP
   addresses, hostnames, or Virtual Cloud Networks (VCNs).  The ACL limits
   access to only the IP addresses or VCNs that have been defined and blocks
   all other incoming traffic.

3. Navigate back to the ADB instance details page and click the **Edit** link
   next to *Mutual TLS (mTLS) Authentication*. The **Edit Mutual TLS
   Authentication** is displayed.

4. In the **Edit Mutual TLS Authentication** dialog box, deselect the
   **Require mutual TLS (mTLS) authentication** check box to disable the mTLS
   requirement on Oracle ADB and click **Save Changes**.

5. Navigate back to the ADB instance details page and click **DB Connection**
   on the top of the page. A **Database Connection** dialog box is displayed.

6. In the Database Connection dialog box, select TLS from the **Connection
   Strings** drop-down list.

7. Copy the appropriate Connection String of the database instance used by
   your application.

Applications can connect to your Oracle ADB instance using the database
credentials and the copied connect descriptor. For example, to connect to the
Oracle ADB instance:

For example:

.. code-block:: javascript

    const cs = `(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
                (host=abc.oraclecloud.com))(connect_data=(service_name=xyz.adb.oraclecloud.com))
                (security=(ssl_server_dn_match=yes)))`;

    connection = await oracledb.getConnection({
        user: "scott",
        password: mypw,  // mypw contains the scott schema password
        connectString: cs
    });

You can download the ADB connection wallet using the **DB Connection** button
and extract the ``tnsnames.ora`` file, or create one yourself if you prefer to
keep connection strings out of application code. See :ref:`tnsnames` for
details on adding connection strings to a Net Service Name in a
``tnsnames.ora`` file.

.. _connectionadbmtls:

Mutual TLS connections to Oracle Cloud Autonomous Database
----------------------------------------------------------

To enable connections from node-oracledb to Oracle Autonomous Database in
Oracle Cloud using mutual TLS (mTLS), a wallet needs to be downloaded from the cloud
console. mTLS is sometimes called Two-way TLS.

Install the Wallet and Network Configuration Files
++++++++++++++++++++++++++++++++++++++++++++++++++

From the Oracle Cloud console for the database, download the wallet zip
file using the **DB Connection** button. The zip contains the wallet and
network configuration files. When downloading the zip, the cloud console
will ask you to create a wallet password. This password is used by
node-oracledb in Thin mode, but not in Thick mode.

Note: Keep the wallet files in a secure location and share them only with
authorized users.

In the examples used in the sections that follow, consider that you have
created a database called CJDB1 with the Always Free services from the
`Oracle Cloud Free Tier <https://www.oracle.com//cloud/free/>`__, then you
might decide to use the connection string called ``cjdb1_high`` in the
``tnsnames.ora`` file.

**In node-oracledb Thin Mode**

For node-oracledb in Thin mode, only two files from the zip are needed:

- ``tnsnames.ora`` - Maps net service names used for application connection
  strings to your database services.
- ``ewallet.pem`` - Enables SSL/TLS connections in Thin mode. Keep this file
  secure.

If you do not have a PEM file, see :ref:`createpem`.

Unzip the wallet zip file and move the required files to a location such as
``/opt/OracleCloud/MYDB``.

You can establish a connection to the database by using your database
credentials and setting the ``connectString`` parameter to the desired network
alias from the ``tnsnames.ora`` file. The ``configDir`` parameter indicates
the directory containing ``tnsnames.ora``. The ``walletLocation`` parameter is
the directory containing the PEM file. In this example, the files are in the
same directory. The ``walletPassword`` parameter should be set to the password
created in the cloud console when downloading the wallet. For example, to
connect as the ADMIN user using the ``cjdb1_high`` connection string:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp
    });

Instead of storing and reading the content from the ``ewallet.pem`` file which
is specified in the ``walletLocation`` property, you can use the
:ref:`walletContent <getconnectiondbattrswalletcontent>` property to directly
specify the security credentials required to establish a mutual TLS connection
to Oracle Database. This property was introduced in node-oracledb 6.6 and can
be used with the :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` methods. The value of this property takes
precedence and overrides the ``walletLocation`` property value of
:meth:`oracledb.getConnection()`, or the ``WALLET_LOCATION`` parameter
in the connection string.

**In node-oracledb Thick Mode**

For node-oracledb in Thick mode, only these files from the zip are needed:

-  ``tnsnames.ora`` - Maps net service names used for application
   connection strings to your database services.
-  ``sqlnet.ora`` - Configures Oracle Network settings.
-  ``cwallet.sso`` - Enables SSL/TLS connections in Thick mode. Keep this file
   secure.

Unzip the wallet zip file. There are two options for placing the required
files:

-  Move the three files to the ``network/admin`` directory of the client
   libraries used by your application. For example if you are using
   Instant Client 19c and it is in ``$HOME/instantclient_19_11``, then
   you would put the wallet files in
   ``$HOME/instantclient_19_11/network/admin/``.

   Connection can be made using your database credentials and setting the
   ``connectString`` parameter to the desired network alias from the
   ``tnsnames.ora`` file. For example, to connect as the ADMIN user using
   the ``cjdb1_high`` network service name:

   .. code-block:: javascript

        connection = await oracledb.getConnection({
            user: "admin",
            password: mypw, // mypw contains the admin schema password
            connectString: "cjdb1_high"
        });

-  Alternatively, move them the three files to any accessible directory, for
   example ``/opt/OracleCloud/MYDB``.

   Then edit ``sqlnet.ora`` and change the wallet location directory to
   the directory containing the ``cwallet.sso`` file. For example:

   ::

      WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="/opt/OracleCloud/MYDB")))
      SSL_SERVER_DN_MATCH=yes

   Since the ``tnsnames.ora`` and ``sqlnet.ora`` files are not in the
   default location, your application needs to indicate where they are,
   either with the :ref:`configDir <odbinitoracleclientattrsopts>`
   parameter to :meth:`~oracledb.initOracleClient()`, or
   using the ``TNS_ADMIN`` environment variable. See :ref:`Optional Oracle
   Net Configuration <tnsadmin>`. Neither of these settings are
   needed, and you do not need to edit ``sqlnet.ora``, if you have put
   all the files in the ``network/admin`` directory.

  For example, to connect as the ADMIN user using the ``cjdb1_high`` network
  service name:

  .. code-block:: javascript

        const oracledb = require('oracledb');

        oracledb.initOracleClient({configDir: '/opt/OracleCloud/MYDB'});
        connection = await oracledb.getConnection({
            user: "admin",
            password: mpw,
            connectString: "cjdb1_high"
        });

In node-oracle Thick mode, to create mTLS connections in one Node.js process
to two or more Oracle Autonomous Databases, move each ``cwallet.sso`` file to
its own directory. For each connection use different connection string
``WALLET_LOCATION`` parameters to specify the directory of each ``cwallet.sso``
file. It is recommended to use Oracle Client libraries 19.17 (or later) when
using :ref:`multiple wallets <connmultiwallets>`.

If you need to create a new database schema so you do not login as the
privileged ADMIN user, refer to the relevant Oracle Cloud documentation,
for example see `Create Database Users <https://docs.oracle.com/en/cloud/
paas/autonomous-database/adbdu/managing-database-users.html#GUID-5B94EA60-
554A-4BA4-96A3-1D5A3ED5878D>`__ in the Oracle Autonomous Transaction
Processing Dedicated Deployments manual.

Access Through a Proxy
++++++++++++++++++++++

If you are behind a firewall, you can tunnel TLS/SSL connections via a
proxy using `HTTPS_PROXY <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-C672E92D-CE32-4759-9931-92D7960850F7>`__
in the connect descriptor. Successful connection depends on specific
proxy configurations. Oracle does not recommend doing this when
performance is critical.

**In node-oracledb Thin Mode**

The proxy settings can be passed during connection creation:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp,
        httpsProxy: 'myproxy.example.com',
        httpsProxyPort: 80
    });

Alternatively, edit ``tnsnames.ora`` and add an ``HTTPS_PROXY`` proxy name and
``HTTPS_PROXY_PORT`` port to the connect descriptor address list of any service
name you plan to use, for example::

    cjdb1_high = (description=
        (address=
        (https_proxy=myproxy.example.com)(https_proxy_port=80)
        (protocol=tcps)(port=1522)(host= . . . )))

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp,
    });

**In node-oracledb Thick Mode**

Edit ``sqlnet.ora`` and add a line::

    SQLNET.USE_HTTPS_PROXY=on

Edit ``tnsnames.ora`` and add an ``HTTPS_PROXY`` proxy name and
``HTTPS_PROXY_PORT`` port to the connect descriptor address list of any
service name you plan to use, for example::

    cjdb1_high = (description=
      (address=(https_proxy=myproxy.example.com)(https_proxy_port=80)
      (protocol=tcps)(port=1522)(host=  . . .

Using the Easy Connect Syntax with Autonomous Database
++++++++++++++++++++++++++++++++++++++++++++++++++++++

You can optionally use the :ref:`Easy Connect <easyconnect>` syntax to connect
to Oracle Autonomous Database.  When using node-oracledb Thick mode this
requires using Oracle Client libraries 19c or later.

The mapping from a cloud ``tnsnames.ora`` entry to an Easy Connect Plus
string is::

    protocol://host:port/service_name?wallet_location=/my/dir&retry_count=N&retry_delay=N

For example, if your ``tnsnames.ora`` file had an entry::

    cjjson_high = (description=(retry_count=20)(retry_delay=3)
        (address=(protocol=tcps)(port=1522)
        (host=efg.oraclecloud.com))
        (connect_data=(service_name=abc_cjjson_high.adb.oraclecloud.com))
        (security=(ssl_server_cert_dn="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")))

Then your applications can connect using the connection string:

.. code-block:: javascript

    cs = "tcps://efg.oraclecloud.com:1522/abc_cjjson_high.adb.oraclecloud.com?wallet_location=/Users/cjones/Cloud/CJJSON&retry_count=20&retry_delay=3"
    connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,
        connectString : cs
    });

The ``walletLocation`` parameter needs to be set to the directory
containing the ``cwallet.sso`` or ``ewallet.pem`` file from the wallet zip.
The other wallet files, including ``tnsnames.ora``, are not needed when you
use the Easy Connect Plus syntax.

You can optionally add other Easy Connect parameters to the connection
string, for example:

.. code-block:: javascript

    cs = cs + "&https_proxy=myproxy.example.com&https_proxy_port=80"

With node-oracledb Thin mode, the wallet password needs to be passed as a
connection parameter.

.. _createpem:

Creating a PEM File for node-oracledb Thin Mode
+++++++++++++++++++++++++++++++++++++++++++++++

For mutual TLS in node-oracledb Thin mode, the certificate must be Privacy
Enhanced Mail (PEM) format. If you are using Oracle Autonomous Database and
your wallet zip file does not already include a PEM file, then you can convert
the PKCS12 ``ewallet.p12`` file to PEM format using third party tools. For
example, using OpenSSL::

    openssl pkcs12 -in ewallet.p12 -out wallet.pem

Once the PEM file has been created, you can use it by passing its directory
location as the ``walletLocation`` property to
:meth:`oracledb.getconnection()` or :meth:`oracledb.createPool()`. Instead of
storing and reading the content from the ``ewallet.pem`` file which is
specified in the ``walletLocation`` property, you can use the
``walletContent`` property to directly specify the security credentials
required to establish a mutual TLS connection to Oracle Database. The
``walletContent`` property was introduced in node-oracledb 6.6 and can be used
with :meth:`~oracledb.getConnection()` and :meth:`~oracledb.createPool()`. The
value of this property takes precedence and overrides the ``walletLocation``
value set in :meth:`~oracledb.getConnection()` or
:meth:`~oracledb.createPool()`, or the ``WALLET_LOCATION`` parameter in the
connection string. The :meth:`~oracledb.getConnection()` and
:meth:`~oracledb.createPool()` methods also accept a ``walletPassword``
property, which can be the passphrase that was specified when the above
openSSL command was run. See :ref:`connectionadbmtls`.

.. _connmultiwallets:

Connecting using Multiple Wallets
=================================

You can make multiple connections with different wallets in one Node.js
process.

**In node-oracledb Thin mode**

To use multiple wallets in node-oracledb Thin mode, pass the different
connection strings, wallet locations, and wallet password (if required) in each
:meth:`oracledb.getConnection()` call or when creating a :ref:`connection pool
<connpooling>`:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "user_name",
        password: userpw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: walletpw
    });

The ``configDir`` parameter is the directory containing the :ref:`tnsnames.ora
<tnsadmin>` file. The ``walletLocation`` parameter is the directory
containing the ``ewallet.pem`` file. If you are using Oracle Autonomous
Database, both of these paths are typically the same directory where the
``wallet.zip`` file was extracted.

**In node-oracledb Thick mode**

To use multiple wallets in node-oracledb Thick mode, a TCPS connection string
containing the ``MY_WALLET_DIRECTORY`` option needs to be created::

    ocidbdemo_high = (description=(retry_count=1)(retry_delay=3)
    (address=(protocol=tcps)(port=1522)(host=efg.oraclecloud.com))
    (connect_data=(service_name=abc_ocidbdemo_high.adb.oraclecloud.com))
    (security=(ssl_server_cert_dn="CN=ijk.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
    (my_wallet_directory="/home/user1/Wallet_OCIDBDemo")))

.. note::

    Use Oracle Client libraries 19.17, or later, or use Oracle Client 21c.
    They contain important bug fixes for using multiple wallets in the one
    process.

.. _configurationprovider:

Connecting Using Centralized Configuration Providers
====================================================

Centralized Configuration Providers enable you to centrally store and manage
the configuration information of your application in a single location on the
cloud. These providers allow you to separately store the configuration
information from the code of your application. The configuration information
stored in these providers include connect descriptor, wallet, and database
credential (user name and password) details. The database password and wallet
can be stored separately in a secure vault service offered by the cloud
providers. Also, you can store properties specific to node-oracledb in
centralized configuration providers.

Node-oracledb can securely look up the configuration information stored in the
following configuration providers:

- :ref:`Microsoft Azure App Configuration <azureappconfig>`
- :ref:`Oracle Cloud Infrastructure (OCI) Object Storage <ociobjstorage>`

Using the configuration information from these providers, node-oracledb can
connect to Oracle Database. The centralized configuration provider support is
available from node-oracledb 6.6 onwards in both Thin and Thick modes.

The configuration from these providers can be used to create both
:ref:`standalone connections <standaloneconnection>` and
:ref:`connection pools <connpooling>`. For node-oracledb to be able to
retrieve the Oracle Database connection information from a configuration
provider, you must define the connection string in a specific format in the
``connectString`` property of the :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` methods. The connection string for these
configuration providers must begin with ``config-<azure>`` or
``config-<ociobject>``, contain the URL of the Azure App Configuration or the
OCI Object Storage endpoints, and authentication details.

.. _azureappconfig:

Azure App Configuration Provider
--------------------------------

`Azure App Configuration <https://learn.microsoft.com/en-us/azure/azure-app-
configuration/overview>`__ is a cloud-based service provided by Microsoft
Azure that enables the central management of your application's configuration
information. Your application must be registered with `Microsoft Entra ID
<https://www.microsoft.com/en-in/security/business/identity-access/microsoft
-entra-id>`__ (formerly Microsoft Azure Active Directory) and must have the
required authorization permissions to access the Azure App Configuration
provider.

To use node-oracledb to retrieve the configuration information from Azure App
Configuration, you must install certain Microsoft Azure libraries which
include `Azure App Configuration <https://www.npmjs.com/package/@azure/app-
configuration>`__ and `Azure Identity <https://www.npmjs.com/package/@azure/
identity>`__. Optionally, you must install `Azure Key Vault <https://www.
npmjs.com/package/@azure/keyvault-secrets>`__ which is required only if a
password or wallet is stored in the vault. For installation instructions of
these libraries, see :ref:`azuremodules`.

Configuration information is stored as key-value pairs in Azure App
Configuration. You must add the connect descriptor as a key under a prefix
based on the requirements of your application. Optionally, you can add the
database user name, password, wallet location and node-oracledb specific
properties as keys. The database password and wallet can be stored securely as
a secret using `Azure Key Vault <https://learn.microsoft.com/en-us/azure/
key-vault/general/overview>`__. In Azure App Configuration, you can add the
following keys under a prefix:

- <prefix>connect_descriptor (required)
- <prefix>user (optional)
- <prefix>password (optional)
- <prefix>wallet_location (optional) - only node-oracledb Thin mode
- <prefix>node-oracledb (optional)

The key ending with:

- ``connect_descriptor`` stores the :ref:`connect descriptor <embedtns>`
  as the value.
- ``user`` stores the database user name as the value.
- ``password`` stores the reference to the Azure Key Vault and Secret as
  the value.
- ``wallet_location`` stores the reference to the Azure Key Vault and Secret
  that contains the wallet as the value. This can only be used in
  node-oracledb Thin mode.
- ``node-oracledb`` stores the values of the node-oracledb specific
  properties. The properties that can be stored in Azure App Configuration
  include ``poolMin``, ``poolMax``, ``poolIncrement``, ``poolTimeout``,
  ``poolPingInterval``, ``poolPingTimeout``, ``stmtCacheSize``,
  ``prefetchRows``, and ``lobPrefetch``.

See `Oracle Net Service Administrator’s Guide <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-DBCA9021-F3E1-4B30-8F17-A98900299D73>`__ for
more information.

You must use a connection string containing the configuration provider values
in node-oracledb to access the information stored in Azure App Configuration.
The ``connectString`` property of :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` should be a URL such as::

    config-azure://<appconfigname>[?key=<prefix>&label=<value>&<option1>=<value1>&<option2>=<value2>…]

The parameters of the connection string are detailed in the table below.

.. list-table-with-summary:: Connection String Parameters for Azure App Configuration
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 15 25
    :name: _connection_string_for_azure_app
    :summary: The first row displays the name of the connection string parameter. The second row displays whether the connection string parameter is required or optional. The third row displays the description of the connection string parameter.

    * - Parameter
      - Required or Optional
      - Description
    * - ``config-azure``
      - Required
      - Indicates that the configuration provider is Azure App Configuration.
    * - ``<appconfigname>``
      - Required
      - The URL of the App configuration endpoint.
    * - ``key=<prefix>``
      - Optional
      - A key prefix to identify the connection. You can organize configuration information under a prefix as per application requirements.
    * - ``label=<value>``
      - Optional
      - The Azure App Configuration label name.
    * - ``<options>=<values>``
      - Optional
      - The Azure authentication method and corresponding authentication parameters to use when connecting to the Azure App Configuration provider. Each authentication method requires specific parameters to be set which is detailed in the :ref:`Azure Authentication Methods and Their Values <_azure_authentication_methods_and_values>` table.

        You can specify one of the following authentication methods:

        - **Default Azure Credential**: The authentication to Azure App Configuration is done as a service principal (using either a client secret or client certificate) or as a managed identity depending on which parameters are set. This authentication method also supports reading the parameters as environment variables. This is the default authentication method.
        - **Service Principal with Client Secret**: The authentication to Azure App Configuration is done using the client secret.
        - **Service Principal with Client Certificate**: The authentication to Azure App Configuration is done using the client certificate.
        - **Managed Identity**: The authentication to Azure App Configuration is done using managed identity or managed user identity credentials.

Depending on the specified authentication method, you must also set the
corresponding authentication parameters in the ``option=value`` syntax of the
connection string. The different authentication methods and their
corresponding option values are listed in the table below.

.. list-table-with-summary:: Azure Authentication Methods and Their Values
    :header-rows: 1
    :class: wy-table-responsive
    :name: _azure_authentication_methods_and_values
    :summary: The first row displays the authentication method. The second row displays the authentication option values. The third row displays the required parameters for the specified option value. The fourth row displays the optional parameters for the specified option value.

    * - Authentication Method
      - Authentication Option Values
      - Required Parameters for This Option Value
      - Optional Parameters for This Option Value
    * - Default Azure Credential
      - AZURE_DEFAULT (also used when the Authentication method is not set)
      - No required parameters for this option value
      - AZURE_CLIENT_ID

        AZURE_CLIENT_SECRET

        AZURE_CLIENT_CERTIFICATE_PATH

        AZURE_TENANT_ID

        AZURE_MANAGED_IDENTITY_CLIENT_ID
    * - Service Principal with client secret
      - AZURE_SERVICE_PRINCIPAL
      - AZURE_CLIENT_ID

        AZURE_CLIENT_SECRET

        AZURE_TENANT_ID
      - No optional parameters for this option value
    * - Service Principal with client certificate
      - AZURE_SERVICE_PRINCIPAL
      - AZURE_CLIENT_ID

        AZURE_CLIENT_CERTIFICATE_PATH

        AZURE_TENANT_ID
      - No optional parameters for this option value
    * - Managed Identity
      - AZURE_MANAGED_IDENTITY
      - AZURE_MANAGED_IDENTITY_CLIENT_ID - required only if user assigned
      - No optional parameters for this option value

Note that the Azure service principal with client certificate overrides Azure
service principal with client secret.

See `Authentication Parameters for Azure App Configuration Store <https://www.
oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1EECAD82-6CE5-4F4F-A844-
C75C7AA1F907>`__ for more information.

.. _exampleazureappconfig:

Using node-oracledb and Azure App Configuration
+++++++++++++++++++++++++++++++++++++++++++++++

Consider the following table which lists sample configuration information defined
in Azure App Configuration as key-value pairs. Note that the key-value pairs
are defined under the same prefix ``test/`` as an example.

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 30 70
    :name: _azure_app_configuration_keys_and_values
    :summary: The first row displays the name of the key defined in Azure App Configuration. The second row displays the value of the key defined in Azure App Configuration.

    * - Azure App Configuration Key
      - Value
    * - test/connect_descriptor
      - (description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb1_pdb1)))
    * - test/user
      - scott
    * - test/password
      - {"uri":"https://mykeyvault.vault.azure.net/secrets/passwordsalescrm"}
    * - test/wallet_location
      - {"uri":"https://mykeyvault.vault.azure.net/secrets/walletsalescrm"}
    * - test/node-oracledb
      - {"stmtCacheSize":30, "prefetchRows":2, "poolMin":2, "poolMax":10}

**Standalone Connections with Azure App Configuration**

:ref:`Standalone connections <standaloneconnection>` can be created with the
configuration information defined in Azure App Configuration. Using the
connection string URL below, you can access the information that is stored
in :ref:`Azure App Configuration <_azure_app_configuration_keys_and_values>`.

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-azure://aznetnamingappconfig.azconfig.io/?key=test/&azure_client_id=123-456&azure_client_secret=MYSECRET&azure_tenant_id=789-123"
    });

    const result = await connection.execute(`SELECT 1 FROM dual`);
    console.log(result.rows[0][0]);

Substitute your own values in the connection string to access your Azure App
Configuration service.

Node-oracledb retrieves the necessary connection information from Azure App
Configuration and uses the values of the keys to create a standalone
connection to Oracle Database. For example, the values of the node-oracledb
connection properties will be the key values that were defined in the sample
configuration information in this
:ref:`table <_azure_app_configuration_keys_and_values>`:

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 40 60
    :name: _standalone_connection_properties_used
    :summary: The first row displays the name of the node-oracledb connection property. The second row displays the value of the connection property.

    * - Node-oracledb Connection Property
      - Value
    * - ``connectString``
      - "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb1_pdb1)))"
    * - ``user``
      - "scott"
    * - ``password``
      - "manager" (value of secret in URI - for demo purposes)
    * - ``walletContent``
      - <PEM wallet content> (value of secret in URI - for demo purposes)

        This value can only be used in node-oracledb Thin mode.
    * - ``stmtCacheSize``
      - 30
    * - ``prefetchRows``
      - 2

**Connection Pools with Azure App Configuration**

:ref:`Connection pools <connpooling>` can be created with the configuration
information defined in Azure App Configuration. Using the connection string
URL below, you can access the information that is stored in
:ref:`Azure App Configuration <_azure_app_configuration_keys_and_values>`.

.. code-block:: javascript

    await oracledb.createPool({
        connectString : "config-azure://aznetnamingappconfig.azconfig.io/?key=test/&azure_client_id=123-456&azure_client_secret=MYSECRET&azure_tenant_id=789-123"
    });

    const connection = await oracledb.getConnection();
    const result = await connection.execute(`SELECT 1 FROM dual`);
    console.log(result.rows[0][0]);

Substitute your own values in the connection string to access your Azure App
Configuration service.

Node-oracledb retrieves the necessary connection information from Azure App
Configuration and uses the values of the keys to create a connection pool to
Oracle Database. For example, the values of the node-oracledb connection
properties will be the key values that were defined in the
sample configuration information in this
:ref:`table <_azure_app_configuration_keys_and_values>`:

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 40 60
    :name: _connection_pool_properties_used
    :summary: The first row displays the name of the node-oracledb connection property. The second row displays the value of the connection property.

    * - Node-oracledb Connection Property
      - Value
    * - ``connectString``
      - "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb1_pdb1)))"
    * - ``user``
      - "scott"
    * - ``password``
      - "manager" (value of secret in URI - for demo purposes)
    * - ``walletContent``
      - <PEM wallet content> (value of secret in URI - for demo purposes)

        This value can only be used in node-oracledb Thin mode.
    * - ``stmtCacheSize``
      - 30
    * - ``prefetchRows``
      - 2
    * - ``poolMin``
      - 2
    * - ``poolMax``
      - 10

**Precedence of Properties**

If you have defined the values of ``user`` and ``password`` in both the
application and Azure App Configuration, then the values defined in the
application will have the higher precedence.

If you are using Thin mode and have defined the node-oracledb specific
properties in both the application and in Azure App Configuration, then the
values defined in the configuration provider will have the higher precedence.
If you have defined the ``walletContent`` property in the application and the
``wallet_location`` key in Azure App Configuration, then the value defined in
the configuration provider will have the higher precedence.

If you are using Thick mode and have defined the node-oracledb properties in
an ``oraaccess.xml`` file, Azure App Configuration, and the application, then
the order of precedence from highest to lowest will be as follows:

- ``oraaccess.xml`` file
- Azure App Configuration
- Application

.. _conninfocacheazure:

Azure App Configuration Information Caching
+++++++++++++++++++++++++++++++++++++++++++

Node-oracledb caches configuration information from Azure App Configuration by
default. This allows you to reuse the cached configuration information which
significantly reduces the number of round-trips to this configuration
provider.

You can use the :attr:`oracledb.configProviderCacheTimeout` property to set
the amount of time for node-oracledb to cache the configuration retrieved from
Azure App Configuration. Once the cache expires, node-oracledb refreshes the
cache when configuration information from this configuration provider is
required.

.. _ociobjstorage:

OCI Object Storage Configuration Provider
-----------------------------------------

`Object Storage <https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/
objectstorageoverview.htm>`__ is a cloud-based service provided by Oracle
Cloud Infrastructure (OCI) that enables the centralized storage and management
of your application's configuration information. Ensure that you have the
necessary authorization permissions to access OCI Object Storage.

To use node-oracledb to retrieve the configuration information from OCI Object
Storage, you must install certain OCI libraries which include `OCI Node.js
Client for Common Utilities <https://www.npmjs.com/package/oci-common>`__ and
`OCI Node.js Client for ObjectStorage Service <https://www.npmjs.com/package/
oci-objectstorage>`__. Optionally, you must install `OCI Node.js Client for
Secrets Service <https://www.npmjs.com/package/oci-secrets>`__ which is
required only if a password is stored in the vault. For installation
instructions of these libraries, see :ref:`ocimodules`.

Configuration information is stored as a JSON file in OCI Object Storage. You
must add the connect descriptor in the JSON file. Optionally, you can add the
database user name, password, wallet location, and node-oracledb specific
properties in the JSON file. The database password and wallet can also be
stored securely as a secret using `OCI Vault <https://docs.oracle.com/en-us/
iaas/Content/KeyManagement/Tasks/managingsecrets.htm>`__. In OCI Object
Storage, you can add the following sub-objects in the JSON file:

- connect_descriptor (required)
- user (optional)
- password (optional)
- wallet_location (optional) - only node-oracledb Thin mode
- node-oracledb (optional)

Each sub-object is detailed below:

- ``connect_descriptor`` is used to specify the :ref:`connect descriptor <embedtns>`
  value.
- ``user`` is used to specify the database user name as the value.
- ``password`` is used to specify the reference to OCI Vault and secret as
  the value.
- ``wallet_location`` is used to specify the reference to the OCI Vault and
  secret that contains the wallet as the value. This can only be used in
  node-oracledb Thin mode.
- ``node-oracledb`` is used to specify the values of the node-oracledb specific
  properties. The properties that can be stored in OCI Object Storage include
  ``poolMin``, ``poolMax``, ``poolIncrement``, ``poolTimeout``,
  ``poolPingInterval``, ``poolPingTimeout``, ``stmtCacheSize``,
  ``prefetchRows``, and ``lobPrefetch``.

See `Oracle Net Service Administrator’s Guide <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-B43EA22D-5593-40B3-87FC-C70D6DAF780E>`__.

You must use a connection string containing the configuration provider values
in node-oracledb to access the information stored in OCI Object Storage. The
``connectString`` property of :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` should be a URL such as::

    config-ociobject://<objectstorage-name>/n/<namespaceName>/b/<bucketName>/o/
    <objectName>[/c/<networkServiceName>][?<option1>=<value1>&<option2>=<value2>...]

The parameters of the connection string are detailed in the table below.

.. list-table-with-summary:: Connection String Parameters for OCI Object Storage
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 15 25
    :name: _connection_string_for_oci_object_storage
    :summary: The first row displays the name of the connection string parameter. The second row displays whether the connection string parameter is required or optional. The third row displays the description of the connection string parameter.

    * - Parameter
      - Required or Optional
      - Description
    * - ``config-ociobject``
      - Required
      - Indicates that the configuration provider is OCI Object Storage.
    * - ``<server-name>``
      - Required
      - The URL of OCI Object Storage endpoint.
    * - ``<namespaceName>``
      - Required
      - The OCI Object Storage namespace where the JSON file is stored.
    * - ``<bucketName>``
      - Required
      - The OCI Object Storage bucket name where the JSON file is stored.
    * - ``<objectName>``
      - Required
      - The JSON file name.
    * - ``<networkServiceName>``
      - Optional
      - The network service name or alias if the JSON file contains one or more network service names.
    * - ``<options>`` and ``<values>``
      - Optional
      - The OCI Object Storage authentication method and corresponding authentication parameters to use when connecting to OCI Object Storage. Each authentication method requires specific parameters to be set which is detailed in the :ref:`table <_oci_authentication_methods>` below.

        You can specify one of the following authentication methods in the connection string to access OCI Object Storage:

        - **OCI API Key**: The authentication to OCI is done using API key-related values. This is the default authentication method.
        - **OCI Instance Principal**: The authentication to OCI is done using VM instance credentials running on OCI.
        - **OCI Resource Principal**: The authentication to OCI is done using OCI resource principals.

        See `OCI Authentication Methods <https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm>`__ for more information.

Depending on the specified authentication method, you must also set the
corresponding authentication parameters in the ``option=value`` syntax of the
connection string. The different authentication methods and their
corresponding option values are listed in the table below.

.. list-table-with-summary:: OCI Authentication Methods and Their Values
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 10 10 10 10
    :name: _oci_authentication_methods
    :summary: The first row displays the authentication method. The second row displays the authentication option values. The third row displays the required parameters for the specified option value. The fourth row displays the optional parameters for the specified option value.

    * - Authentication Method
      - Authentication Option Values
      - Optional Configuration
      - Optional Parameters
    * - API Key-Based Authentication
      - OCI_DEFAULT (also used when the Authentication method is not set)
      - (~/.oci/config),
        (~/.oraclebmc/config), or
        environment variable OCI_CONFIG_FILE
      - OCI_PROFILE

        OCI_TENANCY

        OCI_USER

        OCI_FINGERPRINT

        OCI_KEY_FILE

        OCI_PROFILE_PATH
    * - Instance Principal Authentication
      - OCI_INSTANCE_PRINCIPAL
      - No optional configuration for this option value
      - No optional parameters for this option value
    * - Resource Principal Authentication
      - OCI_RESOURCE_PRINCIPAL
      - No optional configuration for this option value
      - No optional parameters for this option value

See `Authentication Parameters for OCI Object Storage <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-EB94F084-0F3F-47B5-AD77-D111070F7E8D>`__
for more information.

.. _exampleociobjstorage:

Using node-oracledb and OCI Object Storage
++++++++++++++++++++++++++++++++++++++++++

Consider the following sample configuration information is defined in a JSON
file which is stored in OCI Object Storage::

    {
        "connect_descriptor": "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
                (host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb_pdb1))
                (security=(ssl_server_dn_match=yes)))",

        "user": "scott",
        "password": {
            "type": "ocivault",
            "value": "ocid1.vaultsecret.my-secret-id"
        },
        "wallet_location": {
            "type": "ocivault",
            "value": "ocid1.vaultwallet.my-wallet-id"
        },
        "node-oracledb": {
            "stmtCacheSize": 30,
            "prefetchRows": 2,
            "poolMin": 2,
            "poolMax": 10
        }
    }

**Standalone Connections with OCI Object Storage**

:ref:`Standalone connections <standaloneconnection>` can be created with the
configuration information defined in the JSON file that is stored in OCI
Object Storage. Using the connection string URL below, you can access the
information defined in the :ref:`JSON file <exampleociobjstorage>` above.

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-ociobject://abc.oraclecloud.com/n/abcnamespace/b/abcbucket/o/abcobject?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

    const result = await connection.execute(`SELECT 1 FROM dual`);
    console.log(result.rows[0][0]);

Substitute your own values in the connection string to access your OCI Object
Storage service.

Node-oracledb retrieves the necessary connection information from OCI Object
Storage and uses the values defined in the JSON file to create a standalone
connection to Oracle Database. For example, the values of the node-oracledb
connection properties will be the values that were defined in the
:ref:`sample JSON file <exampleociobjstorage>`:

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 40 60
    :name: _standalone_connection_properties_used_oci_object_storage
    :summary: The first row displays the name of the node-oracledb connection property. The second row displays the value of the connection property.

    * - node-oracledb Connection Property
      - Value
    * - ``connectString``
      - "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb1_pdb1)))"
    * - ``user``
      - "scott"
    * - ``password``
      - "manager" (value of secret in URI - for demo purposes)
    * - ``walletContent``
      - <PEM wallet content> (value of secret in URI - for demo purposes)

        This value can only be used in node-oracledb Thin mode.
    * - ``stmtCacheSize``
      - 30
    * - ``prefetchRows``
      - 2

**Connection Pools with OCI Object Storage**

:ref:`Connection pools <connpooling>` can be created with the configuration
information defined in the JSON file stored in OCI Object Storage. Using the
connection string URL below, you can access the information defined in the
:ref:`JSON file <exampleociobjstorage>` above.

.. code-block:: javascript

    await oracledb.createPool({
        connectString : "config-ociobject://abc.oraclecloud.com/n/abcnamespace/b/abcbucket/o/abcobject?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

    const connection = await oracledb.getConnection();
    const result = await connection.execute(`SELECT 1 FROM dual`);
    console.log(result.rows[0][0]);

Substitute your own values in the connection string to access your OCI Object
Storage service.

Node-oracledb retrieves the necessary connection information from OCI Object
Storage and uses the values defined in the JSON file to create a connection
pool to Oracle Database. For example, the values of the node-oracledb
connection properties will be the values that were defined in the
:ref:`sample JSON file <exampleociobjstorage>`:

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 40 60
    :name: _connection_pool_properties_used_oci_object_storage
    :summary: The first row displays the name of the node-oracledb connection property. The second row displays the value of the connection property.

    * - node-oracledb Connection Property
      - Value
    * - ``connectString``
      - "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=cdb1_pdb1)))"
    * - ``user``
      - "scott"
    * - ``password``
      - "manager" (value of secret in URI - for demo purposes)
    * - ``walletContent``
      - <PEM wallet content> (value of secret in URI - for demo purposes)

        This value can only be used in node-oracledb Thin mode.
    * - ``stmtCacheSize``
      - 30
    * - ``prefetchRows``
      - 2
    * - ``poolMin``
      - 2
    * - ``poolMax``
      - 10

**Precedence of Properties**

If you have defined the values of ``user`` and ``password`` in both the
application and OCI Object Storage, then the values defined in the application
will have the higher precedence.

If you are using Thin mode and have defined the node-oracledb specific
properties in both the application and in OCI Object Storage, then the values
defined in the configuration provider will have the higher precedence. If you
have defined the ``walletContent`` property in the application and the
``wallet_location`` key in Azure App Configuration, then the value defined in
the configuration provider will have the higher precedence.

If you are using Thick mode and have defined these node-oracledb properties in
an ``oraaccess.xml`` file, OCI Object Storage, and the application, then the order
precedence from highest to lowest will be as follows:

- ``oraaccess.xml`` file
- OCI Object Storage
- Application

.. _conninfocacheoci:

OCI Object Storage Configuration Information Caching
++++++++++++++++++++++++++++++++++++++++++++++++++++

Node-oracledb caches configuration information from OCI Object Storage by
default. This allows you to reuse the cached configuration information which
significantly reduces the number of round-trips to this configuration
provider.

You can use the :attr:`oracledb.configProviderCacheTimeout` property to set
the amount of time for node-oracledb to cache the configuration retrieved from
OCI Object Storage. Once the cache expires, node-oracledb refreshes the cache
when configuration information from this configuration provider is required.

.. _sharding:

Connecting to Oracle Globally Distributed Database
==================================================

`Oracle Globally Distributed Database <https://www.oracle.com/database/
distributed-database/>`__ is a feature of Oracle Database that lets you
automatically distribute and replicate data across a pool of Oracle databases
that share no hardware or software. It was previously known as Oracle
Sharding. It allows a database table to be split so that each database
contains a table with the same columns but a different subset of rows. These
tables are known as sharded tables. From the perspective of an application, a
sharded table in Oracle Globally Distributed Database looks like a single
table: the distribution of data across those shards is completely transparent
to the application.

Sharding is configured in Oracle Database, see the `Oracle Globally
Distributed Database <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
SHARD>`__ manual. It requires Oracle Database and Oracle Client libraries
12.2, or later.

.. note::

    In this release, Oracle Globally Distributed Database is only supported in
    the node-oracledb Thick mode. See :ref:`enablingthick`.

When a connection is opened in node-oracledb using
:meth:`oracledb.getConnection()`, the
:ref:`shardingKey <getconnectiondbattrsshardingkey>` and
:ref:`superShardingKey <getconnectiondbattrssupershardingkey>`
properties can be used to route the connection directly to a given
shard. A sharding key is always required. A super sharding key is
additionally required when using composite sharding, which is when data
has been partitioned by a list or range (the super sharding key), and
then further partitioned by a sharding key.

When creating a :ref:`connection pool <poolclass>`, the property
:attr:`~oracledb.poolMaxPerShard` can be set. This is used to balance
connections in the pool equally across shards. It requires Oracle Client
libraries 18.3 or later.

When connected to a shard, queries only returns data from that shard.
For queries that need to access data from multiple shards, connections
can be established to the coordinator shard catalog database. In this
case, no shard key or super shard key is used.

The sharding and super sharding key properties are arrays of values, that is
multiple values can be used. Array key values may be of type String (mapping
to VARCHAR2 sharding keys), Number (NUMBER), Date (DATE), or Buffer (RAW).
Multiple types may be used in each array. Sharding keys of TIMESTAMP type
are not supported by node-oracledb.

Examples to Connect to a Globally Distributed Database Based on the Sharding Key Type
-------------------------------------------------------------------------------------

The examples listed in this section show how to establish connections to an
Oracle Globally Distributed Database based on the sharding key type.

**VARCHAR2**

If sharding has been configured on a single VARCHAR2 column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_name_pk PRIMARY KEY(cust_name))
        PARTITION BY CONSISTENT HASH (cust_name)
        PARTITIONS AUTO TABLESPACE SET ts1;

then a direct connection to a shard can be made by passing a single sharding
key:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : ["SCOTT"]
    });

**NUMBER**

If sharding has been configured on a single NUMBER column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_id_pk PRIMARY KEY(cust_id))
        PARTITION BY CONSISTENT HASH (cust_id)
        PARTITIONS AUTO TABLESPACE SET ts1;

then a direct connection to a shard can be made by passing a single sharding
key:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [110]
    });

**Multiple Keys**

If database shards have been partitioned with multiple keys such as:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER NOT NULL,
        cust_name VARCHAR2(30) NOT NULL,
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_pk PRIMARY KEY(cust_id, cust_name));
        PARTITION BY CONSISTENT HASH (cust_id, cust_name)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard can be established by specifying
multiple keys, for example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [70, "SCOTT"]
    });

**DATE**

If the sharding key is a DATE column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT signup_date_pk PRIMARY KEY(signup_date))
        PARTITION BY CONSISTENT HASH (signup_date)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard needs a Date key that is in the
session time zone. For example if the session time zone is set to UTC
(see :ref:`Fetching Dates and Timestamps <datehandling>`) then Dates must
also be in UTC:

.. code-block:: javascript

    key = new Date ("2019-11-30Z");   // when session time zone is UTC
    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [key]
    });

**RAW**

If the sharding key is a RAW column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_code_pk PRIMARY KEY(cust_code))
        PARTITION BY CONSISTENT HASH (cust_code)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard could be established by:

.. code-block:: javascript

    const data = [0x00, 0x01, 0x02];
    const key = Buffer.from(data);
    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [key]
    });

**Composite Sharding**

If composite sharding (requires both sharding key and super sharding key) was
in use, for example:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER NOT NULL,
        cust_name VARCHAR2(30) NOT NULL,
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        PARTITIONSET BY LIST (class)
        PARTITION BY CONSISTENT HASH (cust_name)
        PARTITIONS AUTO (PARTITIONSET gold VALUES ('gold') TABLESPACE SET ts1,
        PARTITIONSET silver VALUES ('silver') TABLESPACE SET ts2);
    )

then direct connection to a shard can be established by specifying a
super sharding key and sharding key, for example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user            : "hr",
        password        : mypw,  // mypw contains the hr schema password
        connectString   : "localhost/orclpdb1",
        superShardingKey: ["gold"]
        shardingKey     : ["SCOTT"],
    });
