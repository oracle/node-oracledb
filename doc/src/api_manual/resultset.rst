.. _resultsetclass:

********************
API: ResultSet Class
********************

ResultSets allow query results to fetched from the database one at a
time, or in groups of rows. ResultSets should be used where the number
of query rows cannot be predicted and may be larger than Node.js can
handle in a single array.

ResultSets can optionally be converted to Readable Streams. Also, from
node-oracledb 5.5, the ResultSet class implements the
``asyncIterator()`` symbol to support asynchronous iteration.

A *ResultSet* object is obtained by setting ``resultSet: true`` in the
``options`` parameter of the *Connection* :meth:`~connection.execute()`
method when executing a query. A *ResultSet* is also returned to
node-oracledb when binding as type
:ref:`oracledb.CURSOR <oracledbconstantsnodbtype>` to a PL/SQL REF
CURSOR “out” bind parameter.

See :ref:`Fetching Rows with Result Sets <resultsethandling>` for more
information on ResultSets.

.. _resultsetproperties:

ResultSet Properties
====================

The properties of a *ResultSet* object are listed below.

.. attribute:: resultset.metaData

    This read-only property is an array which contains an array of objects
    with metadata about the query or REF CURSOR columns.

    The :attr:`~oracledb.extendedMetaData` property and the ``execute()``
    option :ref:`extendedMetaData <propexecextendedmetadata>` are ignored.
    Extended metadata is now always returned.

    See :ref:`result.metaData <execmetadata>` for the available attributes.

.. _resultsetmethods:

ResultSet Methods
=================

.. method:: resultset.close()

    **Promise**::

        promise = close();

    Closes a ResultSet. Applications should always call this at the end of
    fetch or when no more rows are needed. It should also be called if no
    rows are ever going to be fetched from the ResultSet.

    **Callback**:

    If you are using the callback programming style::

        close(function(Error error){});

.. method:: resultset.getRow()

    **Promise**::

        promise = getRow();

    Fetches one row of the ResultSet as an object or an array of
    column values, depending on the value of
    :attr:`~oracledb.outFormat`.

    At the end of fetching, the ResultSet should be freed by calling
    :meth:`resultset.close()`.

    For tuning, adjust the values of the ``connection.execute()`` options
    :ref:`fetchArraySize <propexecfetcharraysize>` and
    :ref:`prefetchRows <propexecprefetchrows>`. Both values must be set at
    the time the ResultSet is obtained from the database. Setting them
    afterwards has no effect. See :ref:`Tuning Fetch
    Performance <rowfetching>` for more information about tuning.

    **Callback**:

    If you are using the callback programming style::

        getRow(function(Error error, Object row){});

.. method:: resultset.getRows()

    **Promise**::

        promise = getRows([Number numRows]);

    Fetches ``numRows`` rows from the ResultSet. The return
    value is an object or an array of column values, depending on the value
    of :attr:`oracledb.outFormat`. Successive calls can be made to
    fetch all rows.

    At the end of fetching, the ResultSet should be freed by calling
    :meth:`resultset.close()`.

    If no argument is passed, or ``numRows`` is zero, then all rows are
    fetched. Technically this fetches all remaining rows from the ResultSet
    if other calls to :meth:`resultset.getRow()` or ``getRows(numRows)``
    previously occurred. Using ``getRows()`` to fetch all rows is convenient
    for small ResultSets returned as bind variables, see :ref:`REF CURSOR Bind
    Parameters <refcursors>`. For normal queries known to return a small
    number of rows, it is easier to *not* use a ResultSet.

    Different values of ``numRows`` may alter the time needed for fetching
    data from Oracle Database. The
    :ref:`prefetchRows <propexecprefetchrows>` value will also have an
    effect. When ``numRows`` is zero, or no argument is passed to
    ``getRows()``, then the value of
    :ref:`fetchArraySize <propexecfetcharraysize>` can be used for tuning.
    Both ``prefetchRows`` and ``fetchArraySize`` must be set at the time the
    ResultSet is obtained from the database. Setting them afterwards has no
    effect. See :ref:`Tuning Fetch Performance <rowfetching>` for more
    information about tuning.

    In node-oracledb version 5.2 the ``numRows`` parameter was made
    optional, and support for the value 0 was added.

    **Callback**:

    If you are using the callback programming style::

        getRows([Number numRows,] function(Error error, Array rows){});

.. method:: resultset.toQueryStream()

    .. versionadded:: 1.9

    .. code-block:: javascript

        toQueryStream();

    This synchronous method converts a ResultSet into a `Readable Stream
    <https://nodejs.org/api/stream.html>`__.

    It can be used to make ResultSets from top-level queries or from REF
    CURSOR bind variables streamable. To make top-level queries streamable,
    the alternative :meth:`connection.queryStream()` method
    may be easier to use.

    To change the behavior of ``toQueryStream()``, such as setting the
    :ref:`query output Format <queryoutputformats>` or the internal buffer
    sizes for performance, adjust global attributes such as
    :attr:`oracledb.outFormat`, :attr:`oracledb.fetchArraySize`, and
    :attr:`oracledb.prefetchRows` before calling
    :meth:`~connection.execute()`.

    See :ref:`Query Streaming <streamingresults>` for more information.

    Support for Node.js 8’s Stream ``destroy()`` method was added in
    node-oracledb 2.1.
