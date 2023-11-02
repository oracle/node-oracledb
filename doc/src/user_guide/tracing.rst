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

- Node-oracledb in Thick mode can dump a trace of SQL statements executed. See
  :ref:`tracingsql`.

- Node-oracledb in Thin and Thick modes can trace bind data values used in
  statements executed. See :ref:`tracingbind`.

- In some Oracle Network errors, connection identifiers can be used to
  identify a connection in the trace and logs. See :ref:`connectionid`.

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

Applications should set the properties because they can greatly help
troubleshooting. They can help identify and resolve unnecessary database
resource usage, or improper access.

The ``clientId`` property can also be used by applications that do their
own mid-tier authentication but connect to the database using the one
database schema. By setting ``clientId`` to the application’s
authenticated user name, the database is aware of who the actual end user is.
This can, for example, be used by Oracle `Virtual Private
Database <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
4F37BAE5-CA2E-42AC-9CDF-EC9181671FFE>`__ policies to automatically restrict
data access by that user.

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

    SQL> SELECT username, client_identifier, client_info, action, module FROM v$session WHERE username = 'HR';

    USERNAME   CLIENT_IDENTIFIER    CLIENT_INFO            ACTION               MODULE
    ---------- -------------------- ---------------------- -------------------- --------------------
    HR         Chris                My demo application    Query departments    End-to-end example

The value of :attr:`connection.dbOp` will be shown in the ``DBOP_NAME`` column of
the ``V$SQL_MONITOR`` table::

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
in the same debugger environment. You can enable PL/SQL debugging in the
node-oracledb modes as follows:

- If you are using node-oracledb Thick mode, set the ``ORA_DEBUG_JDWP``
  environment variable to `host=hostname;port=portnum` indicating where the
  PL/SQL debugger is running. Then run the application.

- In node-oracledb Thin mode, you can additionally set the connection
  parameter ``debugJdwp`` during connection. This variable defaults to the
  value of the ``ORA_DEBUG_JDWP`` environment variable.

See `DBMS_DEBUG_JDWP <https://docs.oracle.com/en/database/oracle/oracle-
database/19/arpls/DBMS_DEBUG_JDWP.html>`_ and `Debugging PL/SQL from ASP.NET
and Visual Studio <http://cshay.blogspot.com/2006/10/debugging-plsql-from-
aspnet-and-visual.html>`_.

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

.. _dbviews:

Database Views
--------------

This section shows some sample column values for database views.

``V$SESSION_CONNECT_INFO``
++++++++++++++++++++++++++

The following table lists sample values for some `V$SESSION_CONNECT_INFO
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__
columns for the node-oracledb Thin and Thick modes:

.. list-table-with-summary:: Sample V$SESSION_CONNECT_INFO column values
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 10 10
    :name: V$SESSION_CONNECT_INFO
    :summary: The first column is the name of V$SESSION_CONNECT_INFO view's column. The second column lists a sample node-oracledb Thick mode value. The third column list a sample node-oracledb Thin mode value.

    * - Column
      - Thick Value
      - Thin Value
    * - CLIENT_OCI_LIBRARY
      - The Oracle Client or Instant Client type, such as "Full Instant Client"
      - "Unknown"
    * - CLIENT_VERSION
      - The Oracle Client library version number (for example, 19.3.0.0.0)
      - "6.0.0.0.0" (the node-oracledb version number with an extra .0.0)
    * - CLIENT_DRIVER
      - "node-oracledb thk : 6.0.0"
      - "node-oracledb thn : 6.0.0"

``V$SESSION``
+++++++++++++

The following table list sample values for columns with differences in
`V$SESSION <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
28E2DC75-E157-4C0A-94AB-117C205789B9>`__.

.. list-table-with-summary:: Sample V$SESSION column values
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 10 10
    :name: V$SESSION_COLUMN_VALUES
    :summary: The first column is the name of the column. The second column lists a sample node-oracledb Thick mode value. The third column lists a sample node-oracledb Thin mode value.

    * - Column
      - Thick value
      - Thin value
    * - TERMINAL
      - similar to `ttys001`
      - the string "unknown"
    * - PROGRAM
      - similar to `node@myuser-mac2 (TNS V1-V3)`
      - defaults to binary name
    * - MODULE
      - similar to `node@myuser-mac2 (TNS V1-V3)`
      - defaults to binary name

.. _vsessconinfo:

Finding the node-oracledb Mode
==============================

You can find the current mode of the node-oracledb driver using the boolean
attribute :attr:`oracledb.thin`. The boolean attributes
:attr:`connection.thin` and :attr:`pool.thin` can be used to show the current
mode of a node-oracledb connection or pool, respectively. The node-oracledb
version can be shown with :attr:`oracledb.version`.

The information can also be seen in the Oracle Database data dictionary table
``V$SESSION_CONNECT_INFO``:

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
