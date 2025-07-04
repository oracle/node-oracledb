.. _transactionmgt:

*********************
Managing Transactions
*********************

A database transaction is a grouping of SQL statements that make a logical
data change to the database. When the :meth:`connection.execute()` and
:meth:`connection.executeMany()` methods execute SQL statements such as INSERT
or UPDATE, a transaction is started or continued. By default,
`Data Manipulation Language (DML) <https://www.oracle.com/pls/topic/lookup?ctx
=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements such as
INSERT, UPDATE, and DELETE are not committed. You can explicitly commit or
roll back the transaction using the :meth:`connection.commit()` and
:meth:`connection.rollback()` methods. For example, to commit a new row:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });
    const result = await connection.execute(
        `INSERT INTO mytable (name) VALUES ('John')`);
    connection.commit();

When a connection is released, any ongoing transaction will be rolled
back. Therefore if a released, pooled connection is re-used by a
subsequent :meth:`pool.getConnection()` call (or
:meth:`oracledb.getConnection()` call that uses a
pool), then any DML statements performed on the obtained connection are
always in a new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

When `Data Definition Language (DDL) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-FD9A8CB4-6B9A-44E5-B114-EFB8DA76FC88>`__
statements such as CREATE are executed, Oracle Database will always perform a
commit.

.. _autocommit:

Autocommitting Transactions
---------------------------

An alternative way to commit is to set the :attr:`oracledb.autoCommit`
property to *true*. With this setting, a commit occurs at the end of each
:meth:`connection.execute()` or :meth:`connection.executeMany()` call. Unlike
an explicit :meth:`connection.commit()` call, this does not require an
additional :ref:`round-trip <roundtrips>` to the database, so it is more
efficient when used appropriately. For example:

.. code-block:: javascript

    oracledb.autocommit = true;

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });
    const result = await connection.execute(
        `INSERT INTO mytable (name) VALUES ('John')`);

For maximum efficiency, set :attr:`~oracledb.autoCommit` to *true* for the
last :meth:`~connection.execute()` or :meth:`~connection.executeMany()` call
of a transaction in preference to using an additional, explicit
:meth:`connection.commit()` call.

When :meth:`connection.executeMany()` is used with the
:ref:`batchErrors <executemanyoptbatcherrors>` option, then the
:attr:`oracledb.autoCommit` property will be ignored if there are data errors.
See :ref:`Handling Data Errors <handlingbatcherrors>`.

.. warning::

    Overuse of the autocommit property can impact database performance. It can
    also destroy relational data consistency when related changes made to
    multiple tables are committed independently, causing table data to be out
    of sync.

Note that irrespective of the :attr:`~oracledb.autoCommit` value, Oracle
Database will always commit an open transaction when a `DDL
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD9A8CB4-
6B9A-44E5-B114-EFB8DA76FC88>`__ statement is executed.

.. _distributedtxns:

Distributed Transactions
------------------------

For information on distributed transactions, see the chapter :ref:`twopc`.
