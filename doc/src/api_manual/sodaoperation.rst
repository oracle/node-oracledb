.. _sodaoperationclass:

************************
API: SodaOperation Class
************************

You can chain together SodaOperation methods to specify read or write
operations against a collection.

.. note::

    In this release, SODA is only supported in node-oracledb Thick mode. See
    :ref:`enablingthick`.

SODA can be used with Oracle Database 18.3 and above, when node-oracledb
uses Oracle Client 18.5 or Oracle Client 19.3, or later.

:ref:`Non-terminal SodaOperation methods <sodaoperationclassnonterm>` return
the same object on which they are invoked, allowing them to be chained
together.

A :ref:`terminal SodaOperation method <sodaoperationclassterm>` always appears
at the end of a method chain to execute the operation.

A SodaOperation object is an internal object. You should not directly
modify its properties.

.. _sodaoperationclassnonterm:

Non-terminal SodaOperation Methods
==================================

Non-terminal SodaOperation methods are chained together to set criteria
that documents must satisfy. At the end of the chain, a single terminal
method specifies the operation to be performed on the matching
documents.

When a non-terminal method is repeated, the last one overrides the
earlier one. For example if ``find().key("a").key("b")...`` was used,
then only documents with the key “b” are matched. If
``find().keys(["a","b"]).key("c")...`` is used, then only the document
with the key “c” is matched.

.. method:: sodaOperation.fetchArraySize()

    .. versionadded:: 5.0

    .. code-block:: javascript

        fetchArraySize(Number size)

    Sets the size of an internal buffer used for fetching
    documents from a collection with the terminal SodaOperation methods
    :meth:`~sodaOperation.getCursor()` and
    :meth:`~sodaOperation.getDocuments()`. Changing
    ``size`` may affect performance but does not affect how many documents
    are returned.

    If ``fetchArraySize()`` is not used, the size defaults to the current
    value of :attr:`oracledb.fetchArraySize`.

    For node-oracledb examples, see :ref:`SODA Query-by-Example Searches for
    JSON Documents <sodaqbesearches>`.

    It requires Oracle Client 19.5 or later, and Oracle Database 18.3 or later.

.. method:: sodaOperation.filter()

    .. versionadded:: 3.0

    .. code-block:: javascript

        filter(Object filterSpec)

    Sets a filter specification for the operation, allowing for complex
    document queries and ordering of JSON documents. Filter specifications
    can include comparisons, regular expressions, logical, and spatial
    operators, among others. See `Overview of SODA Filter Specifications
    (QBEs) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    CB09C4E3-BBB1-40DC-88A8-8417821B0FBE>`__ and `SODA Filter Specifications
    (Reference) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    8DDB51EB-D80F-4476-9ABF-D6860C6214D1>`__.

    For node-oracledb examples, see :ref:`SODA Query-by-Example Searches for JSON
    Documents <sodaqbesearches>`.

.. method:: sodaOperation.hint()

    .. versionadded:: 5.2

    .. code-block:: javascript

        hint(String hint)

    The ``hint()`` value can be used to pass an Oracle hint to :ref:`terminal
    SodaOperation Methods <sodaoperationclassterm>`. It is string in the
    same format as a `SQL
    hint <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    C558F7CF-446E-4078-B045-0B3BB026CB3C>`__
    but without any comment characters, for example ``hint("MONITOR")``.
    Pass only the hint ``"MONITOR"`` (turn on monitoring) or
    ``"NO_MONITOR"`` (turn off monitoring). See the Oracle Database SQL
    Tuning Guide documentation `MONITOR and NO_MONITOR
    Hints <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    19E0F73C-A959-41E4-A168-91E436DEE1F1>`__ and `Monitoring Database
    Operations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
    -C941CE9D-97E1-42F8-91ED-4949B2B710BF>`__ for more information.

    It requires Oracle Client 21.3 or higher (or Oracle Client 19 from
    19.11).

.. method:: sodaOperation.key()

    .. versionadded:: 3.0

    .. code-block:: javascript

        key(String value)

    Sets the key value to be used to match a document for the operation. Any
    previous calls made to this method or :meth:`~sodaOperation.keys()`
    will be ignored.

    SODA document keys are unique.

.. method:: sodaOperation.keys()

    .. versionadded:: 3.0

    .. code-block:: javascript

        keys(Array value)

    Sets the keys to be used to match multiple documents for the operation.
    Any previous calls made to this method or :meth:`sodaOperation.key()`
    will be ignored.

    SODA document keys are unique.

    A maximum of 1000 keys can be used.

.. method:: sodaOperation.limit()

    .. versionadded:: 3.0

    .. code-block:: javascript

        limit(Number n)

    Sets the maximum number of documents that a terminal method will apply
    to. The value of ``n`` must be an integer greater than 0, otherwise an
    error will be raised. The limit is applied to documents that match the
    other SodaOperation criteria. The ``limit()`` method only applies to
    SodaOperation read operations like ``getCursor()`` and ``getDocuments()``.
    If a filter ``$orderby`` is not used, the document order is internally
    defined.

    The ``limit()`` method cannot be used in conjunction with
    :meth:`~sodaOperation.count()`.

.. method:: sodaOperation.lock()

    .. versionadded:: 6.2

    .. code-block:: javascript

        lock()

    Locks the documents fetched from the collection.

    Using ``lock()`` allows for pessimistic locking, that is, only the current
    user that performed the lock can modify the documents in the collection.
    Other users can only perform operations on these documents once they are
    unlocked. The functionality of this method is equivalent to the
    ``SELECT FOR UPDATE`` clause.

    The documents can be unlocked with an explicit call to
    :meth:`~connection.commit()` or :meth:`~connection.rollback()` on the
    connection. Ensure that the :attr:`oracledb.autoCommit` is
    set to *false* for the connection. Otherwise, the documents will be
    unlocked immediately after the operation is complete.

    This method should only be used with read operations (other than
    :meth:`~sodaOperation.count()`), and should not be used in conjunction
    with non-terminal methods :meth:`~sodaOperation.skip()` and
    :meth:`~sodaOperation.limit()`.

    If this method is specified in conjunction with a write operation, then
    this method is ignored.

    This method requires Oracle Client 21.3 or later (or Oracle Client 19 from
    19.11).

.. method:: sodaOperation.skip()

    .. versionadded:: 3.0

    .. code-block:: javascript

        skip(Number n)

    Sets the number of documents that will be skipped before the terminal
    method is applied. The value of ``n`` must be an integer greater or equal
    to 0, otherwise an error will be raised. The skip applies to documents
    that match the other SodaOperation criteria.

    If a filter ``$orderby`` is not used, the document order (and hence
    which documents are skipped) is internally defined.

    The ``skip()`` method only applies to SodaOperation read operations like
    ``getDocuments()``. It cannot be used with
    :meth:`~sodaOperation.count()`.

.. method:: sodaOperation.version()

    .. versionadded:: 3.0

    .. code-block:: javascript

        version(String value)

    Sets the document version that documents must have.

    This is typically used in conjunction with a key, for example
    ``collection.find().key("k").version("v").replaceOne(doc)``.

    Using ``version()`` allows for optimistic locking, so that the
    subsequent SodaOperation terminal method does not affect a document that
    someone else has already modified. If the requested document version is
    not matched, then your terminal operation will not impact any document.
    The application can then query to find the latest document version and
    apply any desired change.

.. _sodaoperationclassterm:

Terminal SodaOperation Methods
==============================

A terminal SodaOperation method operates on the set of documents that
satisfy the criteria specified by previous non-terminal methods in the
method chain. Only one terminal method can be used in each chain.

.. method:: sodaOperation.count()

    .. versionadded:: 3.0

    **Promise**::

        promise = count();

    Finds the number of documents matching the given SodaOperation query
    criteria.

    If ``skip()`` or ``limit()`` are set, then ``count()`` will return an
    error.

    If :attr:`oracledb.autoCommit` is *true*, and ``count()`` succeeds,
    then any open transaction on the connection is committed.

    **Callback**:

    If you are using the callback programming style::

        count(function (Error error, Object result){});

    The parameters of the callback function
    ``function (Error error, Object result)`` are:

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
          - If ``count()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - The `result` object contains one attribute::

              Number count

            The number of documents matching the SodaOperation criteria.

            Due to Node.js type limitations, the largest ``count`` value will be 232 - 1, even if more rows exist. Larger values will wrap.

.. method:: sodaOperation.getCursor()

    .. versionadded:: 3.0

    **Promise**::

        promise = getCursor()

    Returns a :ref:`SodaDocumentCursor <sodadocumentcursorclass>` for
    documents that match the SodaOperation query criteria. The cursor can be
    iterated over with :meth:`sodaDocumentCursor.getNext()` to access
    each :ref:`SodaDocument <sodadocumentclass>`.

    When the application has completed using the cursor it must be closed
    with :meth:`sodaDocumentCursor.close()`.

    If the number of documents is known to be small, it is recommended to
    use :meth:`sodaOperation.getDocuments()` instead.

    If :attr:`oracledb.autoCommit` is *true*, and
    ``getCursor()`` succeeds, then any open transaction on the connection is
    committed.

    **Callback**:

    If you are using the callback programming style::

        getCursor(function(Error error, SodaDocumentCursor cursor){});

    The parameters of the callback function
    ``function(Error error, SodaDocumentCursor cursor)`` are:

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
          - If ``getCursor()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - SodaDocumentCursor ``cursor``
          - A cursor that can be iterated over to access SodaDocument objects matching the SodaOperation search criteria.

.. method:: sodaOperation.getDocuments()

    .. versionadded:: 3.0

    **Promise**::

        promise = getDocuments();

    Gets an array of :ref:`SodaDocuments <sodadocumentclass>` matching the
    SodaOperation query criteria. An empty array will be returned when no
    documents match.

    Where the number of matching documents is known to be small, this API
    should be used in preference to :meth:`sodaOperation.getCursor()`.

    If :attr:`oracledb.autoCommit` is *true*, and ``getDocuments()``
    succeeds, then any open transaction on the connection is committed.

    **Callback**:

    If you are using the callback programming style::

        getDocuments(function(Error error, Array documents){});

    The parameters of the callback function
    ``function(Error error, Array documents)`` are:

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
          - If ``getDocuments()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Array ``documents``
          - An array of SodaDocuments that match the SodaOperation query criteria.

.. method:: sodaOperation.getOne()

    .. versionadded:: 3.0

    **Promise**::

        promise = getOne();

    Obtains one document matching the SodaOperation query criteria. If the
    criteria match more than one document, then only the first is returned.

    Typically ``getone()`` should be used with ``key(k)`` or
    ``key(k).version(v)`` to ensure only one document is matched.

    If :attr:`oracledb.autoCommit` is *true*, and ``getOne()`` succeeds, then
    any open transaction on the connection is committed.

    **Callback**:

    If you are using the callback programming style::

        getOne(function(Error error, SodaDocument document){});

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
          - If ``getOne()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - SodaDocument ``document``
          - One SodaDocument that matches the sodaOperation query criteria. If no document is found, then ``document`` will be undefined.

.. method:: sodaOperation.remove()

    .. versionadded:: 3.0

    **Promise**::

        promise = remove();

    Removes a set of documents matching the SodaOperation query criteria.

    Note settings from ``skip()`` and ``limit()`` non-terminals are ignored
    because they only apply to read operations.

    If :attr:`oracledb.autoCommit` is *true*, and ``remove()`` succeeds, then
    removal and any open transaction on the connection is committed.

    **Callback**:

    If you are using the callback programming style::

        remove(function(Error error, Object result){});

    The parameters of the callback function
    ``function(Error error, Object result)`` are:

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
          - If ``remove()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - The `result` object contains one attribute::

               result.count

            The number of documents removed from the collection.

            Due to Node.js type limitations, the largest ``count`` value will be 232 - 1, even if Oracle Database removed more rows. Larger values will wrap.

.. method:: sodaOperation.replaceOne()

    .. versionadded:: 3.0

    **Promise**::

        promise = replaceOne(Object newDocumentContent);
        promise = replaceOne(SodaDocument newSodaDocument);

    Replaces a document in a collection. The input document can be either a
    JavaScript object representing the data content, or it can be an
    existing :ref:`SodaDocument <sodadocumentclass>`.

    The ``mediaType`` document component and content of the document that
    matches the SodaOperation query criteria will be replaced by the content
    and any ``mediaType`` document component of the new document. Any other
    document components will not be affected. The ``lastModified`` and
    ``version`` document components of the replaced document will be
    updated.

    The ``key()`` non-terminal must be used when using ``replaceOne()``.

    No error is reported if the operation criteria do not match any
    document.

    Note settings from ``skip()`` and ``limit()`` non-terminals are ignored
    because they only apply to read operations.

    If :attr:`oracledb.autoCommit` is *true*, and ``replaceOne()`` succeeds,
    then any open transaction on the connection is committed.

    The parameters of the ``sodaOperation.replaceOne()`` method are:

    .. _replaceone:

    .. list-table-with-summary:: sodaOperation.replaceOne() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the parameter. The second column
          displays the data type of the parameter. The third column displays
          the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``newDocumentContent`` or ``newSodaDocument``
          - Object or SodaDocument
          - The new document. See :meth:`sodaCollection.insertOne()`, which has the same semantics for the document.

    **Callback**:

    If you are using the callback programming style::

        replaceOne(Object newDocumentContent, function(Error error, Object result){});
        replaceOne(SodaDocument newSodaDocument, function(Error error, Object result){});

    See :ref:`replaceone` for information on the parameters.

    The parameters of the callback function
    ``function(Error error, Object result)`` are:

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
          - If ``replaceOne()`` succeeds, ``error`` is NULL. It is not an error if no document is replaced. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - The `result` object contains one attribute::

             result.replaced

            This attribute will be *true* if the document was successfully replaced, *false* otherwise.

.. method:: sodaOperation.replaceOneAndGet()

    .. versionadded:: 3.0

    **Promise**::

        promise = replaceOneAndGet(Object newDocumentContent);
        promise = replaceOneAndGet(SodaDocument newSodaDocument);

    Replaces a document in a collection similar to
    :meth:`sodaOperation.replaceOne()`, but also returns
    the result document which contains all :ref:`SodaDocument
    <sodadocumentclass>` components (key, version, etc.)
    except for content. Content itself is not returned for performance
    reasons. The result document has new values for components that are
    updated as part of the replace operation (such as version, last-modified
    timestamp, and media type)

    If :attr:`oracledb.autoCommit` is *true*, and ``replaceOneAndGet()``
    succeeds, then any open transaction on the connection is committed.

    The parameters of the ``sodaOperation.replaceOneAndGet()`` method are:

    .. _replaceoneandget:

    .. list-table-with-summary:: sodaOperation.replaceOneAndGet() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the parameter. The second column
          displays the data type of the parameter. The third column displays
          the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``newDocumentContent`` or ``newSodaDocument``
          - Object or SodaDocument
          - The new document. See :meth:`sodaCollection.insertOne()`, which has the same semantics for the document.

    **Callback**:

    If you are using the callback programming style::

        replaceOneAndGet(Object newDocumentContent, function(Error error, SodaDocument updatedDocument){});
        replaceOneAndGet(SodaDocument newSodaDocument, function(Error error, SodaDocument updatedDocument){});

    See :ref:`replaceoneandget` for information on the parameters.

    The parameters of the callback function
    ``function(Error error, SodaDocument updatedDocument)`` are:

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
          - If ``replaceOneAndGet()`` succeeds, ``error`` is NULL. It is not an error if no document is replaced. If an error occurs, then ``error`` contains the error message.
        * - SodaDocument ``updatedDocument``
          - The updated :ref:`SodaDocument <sodadocumentclass>` if replacement was successful, otherwise ``updatedDocument`` will be undefined.

            The ``lastModified`` and ``version`` attributes of the stored SodaDocument will be updated. The ``mediaType`` attribute and the content will be replaced. Other attributes of ``newSodaDocument`` are ignored.

            Note for performance reasons, ``updatedDocument`` will not have document content and cannot itself be passed directly to SODA insert or replace methods.
