.. _endtoend:

*********************************************************
End-to-end Tracing, Mid-tier Authentication, and Auditing
*********************************************************

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
authenticated user name, the database is aware of who the actual end
user is. This can, for example, be used by Oracle `Virtual Private
Database <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
89DB0C3C-A36F-4254-8C82-020F5F6DE31F>`__ policies to automatically restrict
data access by that user.

The attributes are set on a :attr:`connection <oracledb.connectionClass>`
object and sent to the database on the next :ref:`round-trip <roundtrips>` from
node-oracledb, for example, with ``execute()``:

.. code:: javascript

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

While the connection is open the attribute values can be seen, for
example with SQL*Plus::

  SQL> SELECT username, client_identifier, client_info, action, module FROM v$session WHERE username = 'HR';

  USERNAME   CLIENT_IDENTIFIER    CLIENT_INFO            ACTION               MODULE
  ---------- -------------------- ---------------------- -------------------- --------------------
  HR         Chris                My demo application    Query departments    End-to-end example

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
dblatest&id=GUID-988EA930-BDFE-4205-A806-E54F05333562>`__,
however these cause explicit :ref:`round-trips <roundtrips>`, reducing
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

.. _drivernameview:

The Add-on Name
===============

The Oracle Database ``V$SESSION_CONNECT_INFO`` view shows the version of
node-oracledb in use. This allows DBAs to verify that applications are
using the desired add-on version. For example, a DBA might see::

  SQL> SELECT UNIQUE sid, client_driver
       FROM v$session_connect_info
       WHERE client_driver LIKE 'node-oracledb%'
       ORDER BY sid;

         SID CLIENT_DRIVER
  ---------- ------------------------------
          16 node-oracledb : 5.0.0
          33 node-oracledb : 5.0.0

The :meth:`oracledb.initOracleClient()` attribute ``driverName`` can be used
to override the value that will be shown in the ``CLIENT_DRIVER`` column.

Note if :attr:`oracledb.connectionClass` is set for a
non-pooled connection, the ``CLIENT_DRIVER`` value will not be set for
that connection.
