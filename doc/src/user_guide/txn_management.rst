.. _transactionmgt:

*********************
Managing Transactions
*********************

By default, `DML <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements like INSERT, UPDATE
and DELETE are not committed.

The node-oracledb add-on implements :meth:`connection.commit()` and
:meth:`connection.rollback()` methods that can be used to
explicitly control transactions.

If the :attr:`~oracledb.autoCommit` property is set to *true*, then
a commit occurs at the end of each ``execute()`` or ``executeMany()``
call. Unlike an explicit ``commit()``, this does not
require a :ref:`round-trip <roundtrips>` to the database. For maximum
efficiency, set ``autoCommit`` to *true* for the last ``execute()`` or
``executeMany()`` call of a transaction in preference to using an
additional, explicit ``commit()`` call.

When :meth:`connection.executeMany()` is used with the
:ref:`batchErrors <executemanyoptbatcherrors>` flag, ``autoCommit``
will be ignored if there are data errors. See :ref:`Handling Data
Errors <handlingbatcherrors>`.

When a connection is released, any ongoing transaction will be rolled
back. Therefore if a released, pooled connection is re-used by a
subsequent :meth:`pool.getConnection()` call (or
:meth:`oracledb.getConnection()` call that uses a
pool), then any DML statements performed on the obtained connection are
always in a new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

Support for distributed transactions is discussed in :ref:`Two-Phase Commits
(TPC) <twopc>`.

Note: Oracle Database will implicitly commit when a
`DDL <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD9A8CB4
-6B9A-44E5-B114-EFB8DA76FC88>`__ statement like CREATE is executed
irrespective of the value of ``autoCommit``.
