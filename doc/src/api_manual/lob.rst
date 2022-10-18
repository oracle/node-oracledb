.. _lobclass:

**************
API: LOB Class
**************

Lob objects can be used to access Oracle Database CLOB and BLOB data.

A Lob object implements the `Node.js
Stream <https://nodejs.org/api/stream.html>`__ interface.

See :ref:`Working with CLOB, NCLOB and BLOB Data <lobhandling>` and :ref:`LOB
Bind Parameters <lobbinds>` for more information.

.. _lobproperties:

Lob Properties
==============

The properties of a Lob object are listed below.

.. attribute:: lob.chunkSize

    This read-only property is a number which corresponds to the size used by
    the Oracle LOB layer when accessing or modifying the LOB value.

.. attribute:: lob.length

    This read-only property is a number which specifies the length of a
    queried LOB in bytes (for BLOBs) or characters (for CLOBs and NCLOBs).

.. attribute:: lob.pieceSize

    This read-only property is a number which specifies the number of bytes
    (for BLOBs) or characters (for CLOBs and NCOBs) to read for each Stream
    ``data`` event of a queried LOB.

    The default value is :attr:`chunkSize <lob.chunkSize>`.

    For efficiency, it is recommended that ``pieceSize`` be a multiple of
    ``chunkSize``.

    The property should not be reset in the middle of streaming since data
    will be lost when internal buffers are resized.

    The maximum value for ``pieceSize`` is limited to the value of UINT_MAX.

.. attribute:: lob.type

    This read-only attribute is a number that shows the type of Lob being
    used. It will have the value of one of the constants
    :ref:`oracledb.BLOB <oracledbconstantsnodbtype>`,
    :ref:`oracledb.CLOB <oracledbconstantsnodbtype>` or
    :ref:`oracledb.NCLOB <oracledbconstantsnodbtype>`. The value is
    derived from the bind type when using :ref:`LOB bind
    variables <lobbinds>`, or from the column type when a LOB is returned
    by a query.

.. _lobmethods:

Lob Methods
===========

.. method:: lob.close()

    **Note: this method is deprecated
    and**\ :meth:`lob.destroy()`\ **should be used instead.**

    **Promise**::

        promise = close();

    Explicitly closes a Lob.

    Lobs created with :meth:`connection.createLob()` should be
    explicitly closed when no longer needed. This frees resources in
    node-oracledb and in Oracle Database.

    Persistent or temporary Lobs returned from the database may also be
    closed as long as streaming is not currently happening. Note these Lobs
    are automatically closed when streamed to completion or used as the
    source for an IN OUT bind. If you try to close a Lob being used for
    streaming you will get the error *NJS-023: concurrent operations on a
    Lob are not allowed*.

    The ``lob.close()`` method emits the `Node.js
    Stream <https://nodejs.org/api/stream.html>`__ ``close`` event unless
    the Lob has already been explicitly or automatically closed.

    The connection must be open when calling ``lob.close()`` on a temporary
    LOB, such as those created by ``createLob()``.

    Once a Lob is closed, it cannot be bound.

    See :ref:`Closing Lobs <closinglobs>` for more information.

    If you are using the callback programming style:

    **Callback**::

        close(function(Error error){});

    The parameters of the callback function ``function(Error error)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
         The second column displays the description of the parameter.

        * - Callback Function Parameter
          - Description
        * - Error ``error``
          - If ``close()`` succeeds, ``error`` is NULL. If an error occurs,
            then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: lob.destroy()

    ::

        destroy([Error error]);

    This synchronous method explicitly destroys a Lob.

    Lobs created with :meth:`connection.createLob()` should be
    explicitly closed with ``lob.destroy()`` when no longer needed. This
    frees resources in node-oracledb and in Oracle Database.

    Persistent or temporary Lobs returned from the database may also be
    closed with ``lob.destroy()``. Note these Lobs are automatically closed
    when streamed to completion or used as the source for an IN OUT bind.

    The ``lob.destroy()`` method emits the `Node.js
    Stream <https://nodejs.org/api/stream.html>`__ ``close`` event.

    Once a Lob is destroyed, it cannot be used.

    See :ref:`Closing Lobs <closinglobs>` for more information.

    The parameters of the ``lob.destroy()`` method are:

    .. list-table-with-summary:: lob.destroy() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the parameter. The second column
          displays the data type of the parameter. The third column displays
          the description of the parameter.

        * - Parameter
          - Description
        * - Error ``error``
          - This optional parameter is used for the error emitted in an
            ``error`` event.

.. method:: lob.getData()

    **Promise**::

        promise = getData();

    Returns all the LOB data. CLOBs and NCLOBs will be returned as strings.
    BLOBs will be returned as a Buffer. This method is usable for LOBs up to
    1 GB in length.

    For queries returning LOB columns, it can be more efficient to use
    :attr:`~oracledb.fetchAsString`, :attr:`~oracledb.fetchAsBuffer`, or
    :ref:`fetchInfo <propexecfetchinfo>` instead of ``lob.getData()``.

    Note it is an asynchronous method and requires a round-trip to the
    database:

    .. code:: javascript

        const data = await myLob.getData();

    .. versionadded:: 4.0

    If you are using the callback programming style:

    **Callback**::

        getData(function(Error error, String data));
        getData(function(Error error, Buffer data));

    The parameters of the callback function
    ``function(Error error, String data)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
          The second column displays the description of the parameter.

        * - Callback Function Parameter
          - Description
        * - Error ``error``
          - If ``getData()`` succeeds, ``error`` is NULL. If an error occurs,
            then ``error`` contains the :ref:`error message <errorobj>`.
        * - String ``data`` or Buffer ``data``
          - The value of the LOB.
