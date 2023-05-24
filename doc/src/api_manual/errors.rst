.. _errorobj:

***********
API: Errors
***********

See :ref:`exceptions` for usage information.

.. _properror:

Error Properties
================

The *Error* object contains ``code``, ``errorNum``, ``message``, ``offset``,
and ``stack`` properties.

.. attribute:: error.code

    .. versionadded:: 6.0

    This property is a string that represents the error code, which is the
    error prefix followed by the error number, for example ``ORA-01017``,
    ``DPI-1080``, and ``NJS-500``.

.. attribute:: error.errorNum

    This property is a number which represents the Oracle error number. This
    value is undefined for non-Oracle errors and for messages prefixed with
    NJS or DPI.

.. attribute:: error.message

    This property is a string which represents the text of the error message.

    The error may be a standard Oracle message with a prefix like ORA or
    PLS. Alternatively, it may be a node-oracledb specific error prefixed
    with NJS or DPI.

    A single line error message may look like this::

        ORA-01017: invalid username/password; logon denied

    A multi-line error message may look like this::

        ORA-06550: line 1, column 7:
        PLS-00201: identifier 'TESTPRC' must be declared
        ORA-06550: line 1, column 7:
        PL/SQL: Statement ignored

.. attribute:: error.offset

    This property is a number and it is the character offset into the SQL text
    that resulted in the Oracle error. The value may be ``0`` in non-SQL
    contexts. This value is undefined for non-Oracle errors and for messages
    prefixed with NJS or DPI.

    When :ref:`batchErrors <executemanyoptbatcherrors>` mode in
    :meth:`connection.executeMany()` returns an array of Error objects
    in the callback result parameter, each ``offset`` property is a 0-based
    index corresponding to the ``executeMany()`` :ref:`binds
    parameter <executemanybinds>` array, indicating which record could
    not be processed. See :ref:`Handling Data Errors <handlingbatcherrors>`.
    In node-oracledb 4.2, the maximum ``offset`` value was changed from
    (2^16)-1 to (2^32)-1.

.. attribute:: error.stack

    This property is a string. When using Promises or Async/Await, the *Error*
    object includes a stack trace, for example::

        Error: ORA-00942: table or view does not exist
        at async Object.myDoQuery (/Users/cjones/db.js:5:20)
        at async run (/Users/cjones/test.js:51:14)}

    The stack trace displays only the application backtrace and not the
    driver's internal frames or functions.

    See :ref:`stacktrace` to understand how to increase the number of stack
    frames displayed in a trace.
