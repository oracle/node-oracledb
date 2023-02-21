.. _sodadocumentcursorclass:

*****************************
API: SodaDocumentCursor Class
*****************************

A SodaDocumentCursor is used to walk through a set of SODA documents
returned from a :meth:`sodaCollection.find()`
:meth:`sodaOperation.getCursor()` method.

.. _sodadoccursormethods:

SodaDocumentCursor Methods
==========================

.. method:: sodaDocumentCursor.close()

    **Promise**::

        promise = close();

    Closes a SodaDocumentCursor. It must be called when the cursor is no
    longer required. It releases resources in node-oracledb and Oracle
    Database.

    .. versionadded:: 3.0

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
          - If ``close()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.

.. method:: sodaDocumentCursor.getNext()

    **Promise**::

        promise = getNext();

    Returns the next :ref:`SodaDocument <sodadocumentclass>` in
    the cursor returned by a :meth:`~sodaCollection.find()` terminal method
    read operation.

    If there are no more documents, the returned ``document`` parameter will
    be undefined.

    .. versionadded:: 3.0

    **Callback**:

    If you are using the callback programming style::

        getNext(function(Error error, SodaDocument document){});

    The parameters of the callback function
    ``function(Error error, SodaDocument document)`` are:

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
          - If ``getNext()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - SodaDocument ``document``
          - The next document in the cursor. If there are no more documents, then ``document`` will be undefined.
