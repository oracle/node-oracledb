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
    (for BLOBs) or characters (for CLOBs and NCLOBs) to read for each Stream
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

    .. deprecated:: 4.2

        Use :meth:`lob.destroy()` instead.

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

    **Callback**:

    If you are using the callback programming style::

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
          - If ``close()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: lob.destroy()

    .. code-block:: javascript

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
        :width: 100%
        :summary: The first column displays the parameter. The second column
          displays the data type of the parameter. The third column displays
          the description of the parameter.

        * - Parameter
          - Description
        * - Error ``error``
          - This optional parameter is used for the error emitted in an ``error`` event.

.. method:: lob.fileExists()

    .. versionadded:: 6.6

    **Promise**::

        promise = fileExists();

    Returns a boolean which indicates whether the file specified by the LOB
    exists in the directory alias or not. This method returns *true* if the
    file exists in the directory and *false* if it does not. If the directory
    that this method is trying to access does not exist, then this method
    returns an error. This method can only be used if the LOB type is BFILE.
    For all other LOB types, this method returns the ``NJS-156: operation is
    only supported on BFILE LOBs`` error.

    **Callback**:

    If you are using the callback programming style::

        fileExists(function(Error error, Boolean val));

    The parameters of the callback function
    ``function(Error error, Boolean val)`` are:

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
          - If ``fileExists()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Boolean ``val``
          - Indicates whether the file exists in the directory. This parameter will be *true* if the file exists in the directory and *false* if it does not.

.. method:: lob.getData()

    .. versionadded:: 4.0

    **Promise**::

        promise = getData(Number offset, Number amount);

    Returns a portion (or all) of the data in the LOB.

    The parameters of ``lob.getData()`` are:

    .. list-table-with-summary:: lob.getData() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``offset``
          - Number
          - For LOBs of type CLOB and NCLOB, the offset is the position from which the data is to be fetched, in `UCS-2 code points <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-42BCD57A-A380-4ED9-897F-0500A94803D1>`__. UCS-2 code points are equivalent to characters for all but supplemental characters. If supplemental characters are in the LOB, the offset and amount will have to be chosen carefully to avoid splitting a character.

            For LOBs of type BLOB and BFILE, the offset is the position of the byte from which the data is to be fetched.

            The default is *1*.

            The value of ``offset`` must be greater than or equal to *1*.

            If the ``offset`` specified in :meth:`lob.getData()` exceeds the length of the LOB, then the value *null* is returned.
        * - ``amount``
          - Number
          - For LOBs of type CLOB and NCLOB, the amount is the number of UCS-2 code points to be read from the absolute offset of the CLOB or NCLOB.

            For LOBs of type BLOB and BFILE, the amount is the number of bytes to be read from the absolute offset of the BLOB or BFILE.

            The default is the length of the LOB.

            The value of ``amount`` must be greater than *0*.

            If the ``amount`` specified in :meth:`lob.getData()` exceeds the length of the LOB, then only the data starting from the offset to the end of the LOB is returned.

            If the ``amount`` specified in :meth:`lob.getData()` is *0*, then you will get the error ``NJS-005: invalid value for parameter 2``.

    For queries returning LOB columns, it can be more efficient to use
    :attr:`~oracledb.fetchAsString`, :attr:`~oracledb.fetchAsBuffer`, or
    :ref:`fetchInfo <propexecfetchinfo>` instead of ``lob.getData()``.

    Note that it is an asynchronous method and requires a round-trip to the
    database.

    .. code-block:: javascript

        const data = await myLob.getData(offset, amount);

    .. versionchanged:: 6.4

        The ``offset`` and ``amount`` parameters were added.

    **Callback**:

    If you are using the callback programming style::

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
          - If ``getData()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - String ``data`` or Buffer ``data``
          - The value of the LOB.

.. method:: lob.getDirFileName()

    .. versionadded:: 6.6

    .. code-block:: javascript

        getDirFileName();

    This synchronous method returns an object containing the directory alias
    and file name of the LOB object. This method can only be used if the LOB
    type is BFILE. For all other LOB types, this method returns the
    ``NJS-156: operation is only supported on BFILE LOBs`` error.

.. method:: lob.setDirFileName()

    .. versionadded:: 6.6

    .. code-block:: javascript

        setDirFileName(Object dirFileName);

    This synchronous method sets the directory alias and file name of the LOB.
    This method can only be used if the LOB type is BFILE. For all other LOB
    types, this method returns the ``NJS-156: operation is only supported on
    BFILE LOBs`` error.

    The parameters of the ``lob.setDirFileName()`` method are:

    .. list-table-with-summary:: lob.setDirFileName() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``dirFileName``
          - Object
          - This parameter contains the directory alias and file name of the BFILE type LOB.

    .. versionchanged:: 7.0

        Support for this method was added in node-oracledb Thick mode.
