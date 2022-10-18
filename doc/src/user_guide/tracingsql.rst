.. _tracingsql:

*********************************
Tracing SQL and PL/SQL Statements
*********************************

End-to-End Tracing
==================

Applications that have implemented :ref:`End-to-end Tracing <endtoend>`
calls such as :attr:`~connection.action` and :attr:`~connection.module`,
will make it easier in database monitoring tools to identify SQL statement
execution.

Tracing Executed Statements
===========================

Database statement tracing is commonly used to identify performance
issues. Oracle Database trace files can be analyzed after statements are
executed. Tracing can be enabled in various ways at a database system or
individual session level. Refer to `Oracle Database Tuning documentation
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=TGSQL>`__.
Setting a customer identifier is recommended to make searching for
relevant log files easier::

  ALTER SESSION SET tracefile_identifier='My-identifier' SQL_TRACE=TRUE

In node-oracledb itself, the `ODPI-C tracing capability
<https://oracle.github.io/odpi/doc/user_guide/debugging.html>`__
can be used to log executed statements to the standard error stream.
Before executing Node.js, set the environment variable
``DPI_DEBUG_LEVEL`` to 16. At a Windows command prompt, this could be
done with ``set DPI_DEBUG_LEVEL=16``. On Linux, you might use::

  $ export DPI_DEBUG_LEVEL=16
  $ node myapp.js 2> log.txt

For an application that does a single query, the log file might contain
a tracing line consisting of the prefix ‘ODPI’, a thread identifier, a
timestamp, and the SQL statement executed::

  ODPI [6905309] 2017-09-13 09:02:46.140: SQL select sysdate from dual where :b = 1

Tracing Bind Values
===================

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

Other Tracing Utilities
=======================

Oracle Database has a number of tracing capabilities and controls,
including the `DBMS_MONITOR <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-951568BF-D798-4456-8478-15FEEBA0C78E>`__
package.

PL/SQL users may be interested in using `PL/Scope <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-24109CB5-7BB9-48B2-AD7A-39458AA13C0C>`__.
