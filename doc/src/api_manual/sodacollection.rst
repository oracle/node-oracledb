.. _sodacollectionclass:

*************************
API: SodaCollection Class
*************************

SODA can be used with Oracle Database 18.3 and above, when node-oracledb
uses Oracle Client 18.5 or Oracle Client 19.3, or later. The SODA bulk
insert methods :meth:`sodaCollection.insertMany()` and
:meth:`sodaCollection.insertManyAndGet()`
are in Preview status.

.. note::

    In this release, SODA is only supported in the node-oracledb Thick mode.
    See :ref:`enablingthick`.

.. _sodacollectionproperties:

SodaCollection Properties
=========================

Each SodaCollection object contains read-only properties:

.. attribute:: sodaCollection.metaData

    .. versionadded:: 3.0

    This read-only property is an object which contains the metaData of the
    current collection. See :ref:`SODA Client-Assigned Keys and
    Collection Metadata <sodaclientkeys>`.

    Its type was changed to Object in node-oracledb 4.0.

.. attribute:: sodaCollection.name

    .. versionadded:: 3.0

    This read-only property is a string which specifies the name of the
    current collection.

.. _sodacollectionmethods:

SodaCollection Methods
======================

.. method:: sodaCollection.createIndex()

    .. versionadded:: 3.0

    **Promise**::

        promise = createIndex(Object indexSpec);

    Creates an index on a SODA collection, to improve the performance of
    SODA query-by-examples (QBE) or enable text searches. An index is
    defined by a specification, which is a JSON object that specifies how
    particular QBE patterns are to be indexed for quicker matching.

    Note that a commit should be performed before attempting to create an
    index.

    Different index types can be used:

    - B-tree: used to speed up query-by-example (QBE)
      :meth:`sodaOperation.filter()` searches.
    - JSON search: required for text searches using the ``$contains``
      operator in QBEs. Also improves QBE filter operation performance.
      Note a B-tree index will perform better for non-text searches.
    - GeoSpatial: for speeding up QBEs that do GeoJSON queries.

    If :attr:`oracledb.autoCommit` is *true*, and ``createIndex()`` succeeds,
    then any open user transaction is committed.
    Note SODA DDL operations do not commit an open transaction the way that
    SQL always does for DDL statements.

    See `Overview of SODA
    Indexing <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    4848E6A0-58A7-44FD-8D6D-A033D0CCF9CB>`__.

    As an example, if a collection has these documents::

        {"name": "Chris"}
        {"name": "Venkat"}
        {"name": "Srinath"}

    Then a B-tree index could be created with:

    .. code-block:: javascript

        indexSpec = {name: "myIndex", fields: [{path: "name"}]};
        await collection.createIndex(indexSpec);

    This index would improve the performance of QBEs like:

    .. code-block:: javascript

        d = await collection.find().filter({name: "Venkat"}).getOne();

    The parameters of the ``sodaCollection.createIndex()`` method are:

    .. _sodacollcreateindexparams:

    .. list-table-with-summary:: sodaCollection.createIndex() Parameters
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
        * - ``indexSpec``
          - Object
          - An object with fields as shown in the `SODA Index Specifications (Reference) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C>`__ manual.

    **Callback**:

    If you are using the callback programming style::

        createIndex(Object indexSpec, function(Error error){});

    See :ref:`sodacollcreateindexparams` for information on the parameters.

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
          - If ``createIndex()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.

.. method:: sodaCollection.drop()

    .. versionadded:: 3.0

    **Promise**::

        promise = drop();

    Drops the current collection.

    An error such as *ORA-40626* will be returned and the collection will
    not be dropped if there are uncommitted writes to the collection in the
    current transaction.

    If the collection was created with mode
    :ref:`oracledb.SODA_COLL_MAP_MODE <oracledbconstantssoda>`, then
    ``drop()`` will not physically delete the database storage containing
    the collection, and won’t drop SODA indexes. Instead it will simply
    unmap the collection, making it inaccessible to SODA operations.

    If :attr:`oracledb.autoCommit` is true, and ``drop()`` succeeds,
    then any open user transaction is committed. Note
    SODA operations do not commit an open transaction the way that SQL
    always does for DDL statements.

    If the collection was created with custom metadata changing the key
    assignment method to SEQUENCE, the ``drop()`` method will not delete the
    underlying Oracle sequence. This is in case it was created outside SODA.
    To drop the sequence, use the SQL command DROP SEQUENCE after ``drop()``
    has completed.

    Note you should never use SQL DROP TABLE command on the database table
    underlying a collection. This will not clean up SODA’s metadata. If you
    do accidentally execute DROP SQL, you should cleanup the metadata with
    ``drop()`` or execute the SQL statement:
    ``SELECT DBMS_SODA.DROP_COLLECTION('myCollection') FROM DUAL;``.

    **Callback**:

    If you are using the callback programming style::

        drop(function(Error error, Object result){});

    .. _sodacolldropcallback:

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
          - If ``drop()`` succeeds, ``error`` is NULL. It is not an error if the collection does not exist. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - The ``result`` object contains one attribute::

              Boolean dropped

            If the drop operation succeeded, ``dropped`` will be *true*. If no collection was found, ``dropped`` will be *false*.

.. method:: sodaCollection.dropIndex()

    .. versionadded:: 3.0

    **Promise**::

        promise = dropIndex(String indexName [, Object options]);

    Drops the specified index.

    If :attr:`oracledb.autoCommit` is *true*, and ``dropIndex()`` succeeds,
    then any open user transaction is committed.
    Note SODA operations do not commit an open transaction the way that SQL
    always does for DDL statements.

    The parameters of the ``sodaCollection.dropIndex()`` method are:

    .. _sodacolldropindexparams:

    .. list-table-with-summary:: sodaCollection.dropIndex() Parameters
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
        * - ``indexName``
          - String
          - Name of the index to be dropped.
        * - ``options``
          - Object
          - The ``options`` parameter can have the following attribute::

              Boolean force

            Setting ``force`` to *true* forces dropping of a JSON Search index or Spatial index if the underlying Oracle Database domain index does not permit normal dropping. See `DROP INDEX <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F60F75DF-2866-4F93-BB7F-8FCE64BF67B6>`__.

    **Callback**:

    If you are using the callback programming style::

        dropIndex(String indexName [, Object options], function(Error error, Object result){});

    See :ref:`sodacolldropindexparams` for information on the ``indexName``
    and ``options`` parameters.

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
          - If ``dropIndex()`` succeeds, ``error`` is NULL. It is not an error if the index does not exist. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - If dropping the index succeeded, ``dropped`` will be *true*. If no index was found, ``dropped`` will be *false*.

.. method:: sodaCollection.find()

    .. versionadded:: 3.0

    .. code-block:: javascript

        find()

    The synchronous ``find()`` method is used to locate and order a set of
    SODA documents for retrieval, replacement, or removal. It creates and
    returns a :ref:`SodaOperation <sodaoperationclass>` object which is used
    via method chaining with non-terminal and terminal methods described
    below. Note that SodaOperation is an internal object whose attributes
    should not be accessed directly.

    Returns a :ref:`SodaOperation <sodaoperationclass>` object.

    **Example**

    .. code-block:: javascript

        documents = await collection.find().filter({"address.city": "Melbourne", "salary": {"$gt": 500000}}).getDocuments();

    See :ref:`Simple Oracle Document Access (SODA) <sodaoverview>` for more
    examples.

.. _sodaoperationclass:

SodaOperation Class
===================

You can chain together SodaOperation methods to specify read or write
operations against a collection.

Non-terminal SodaOperation methods return the same object on which they
are invoked, allowing them to be chained together.

A terminal SodaOperation method always appears at the end of a method
chain to execute the operation.

A SodaOperation object is an internal object. You should not directly
modify its properties.

.. _sodaoperationclassnonterm:

Non-terminal SodaOperation Methods
----------------------------------

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
    to. The value of ``n`` must be greater than 0. The limit is applied to
    documents that match the other SodaOperation criteria. The ``limit()``
    method only applies to SodaOperation read operations like
    ``getCursor()`` and ``getDocuments()``. If a filter ``$orderby`` is not
    used, the document order is internally defined.

    The ``limit()`` method cannot be used in conjunction with
    :meth:`~sodaOperation.count()`.

.. method:: sodaOperation.skip()

    .. versionadded:: 3.0

    .. code-block:: javascript

        skip(Number n)

    Sets the number of documents that will be skipped before the terminal
    method is applied. The value of ``n`` must be greater or equal to 0. The
    skip applies to documents that match the other SodaOperation criteria.

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
------------------------------

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

.. method:: sodaCollection.getDataGuide()

    .. versionadded:: 3.0

    **Promise**::

        promise = getDataGuide();

    Infers the schema of a collection of JSON documents at the current time.
    A `JSON data guide <https://www.oracle.com/pls/topic/lookup?ctx=db
    latest&id=GUID-219FC30E-89A7-4189-BC36-7B961A24067C>`__
    shows details like the JSON property names, data types and lengths. It
    is useful for exploring the schema of a collection. The data guide is
    represented as JSON content in a :ref:`SodaDocument <sodadocumentclass>`.

    This method is supported for JSON-only collections which have a
    :meth:`JSON Search index <sodaCollection.createIndex()>` where the
    “dataguide” option is “on”. An error will be returned if a data guide
    cannot be created.

    A data guide is a best effort heuristic and should not be used as a
    schema to validate new JSON documents. The data guide is always
    additive, and does not update itself when documents are deleted. There
    are some limits such as the maximum number of children under one node,
    and the maximum length of a path.

    If :attr:`oracledb.autoCommit` is *true*, and ``getDataGuide()``
    succeeds, then any open user transaction is committed.

    **Callback**:

    If you are using the callback programming style::

        getDataGuide(function(Error error, SodaDocument document){});

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
          - If ``getDataGuide()`` succeeds, ``error`` is NULL. It is not an error if no document is replaced. If an error occurs, then ``error`` contains the error message.
        * - SodaDocument ``document``
          - The SodaDocument containing JSON content which can be accessed from the document as normal with :meth:`sodaDocument.getContents()`, :meth:`sodaDocument.getContentAsString()`, or :meth:`sodaDocument.getContentAsBuffer()`.

.. method:: sodaCollection.insertMany()

    .. versionadded:: 4.0

    **Promise**::

        promise = insertMany(Array newDocumentContentArray);
        promise = insertMany(Array newSodaDocumentArray);

    This is similar to :meth:`~sodaCollection.insertOne()` however it
    accepts an array of the Objects or SodaDocuments that ``insertOne()``
    accepts. When inserting multiple documents, using ``insertMany()`` is
    recommended in preference to ``insertOne()``.

    If an error occurs, the offset attribute on the :ref:`Error
    objects <errorobj>` will contain the number of documents that were
    successfully inserted. Subsequent documents in the input array will not
    be inserted.

    This method is in Preview status and should not be used in production.

    It requires Oracle Client 18.5 or higher.

    **Callback**:

    If you are using the callback programming style::

        insertMany(Array newDocumentContentArray, function(Error error){});
        insertMany(Array newSodaDocumentArray, function(Error error){});

.. method:: sodaCollection.insertManyAndGet()

    .. versionadded:: 4.0

    **Promise**::

        promise = insertManyAndGet(Array newDocumentContentArray [, Object options ]);
        promise = insertManyAndGet(Array newSodaDocumentArray [, Object options ]);

    Similar to :meth:`sodaCollection.insertMany()` but
    also returns an array of the inserted documents so system managed
    properties, such as the keys (in default collections), can be found.
    Content itself is not returned for performance reasons. When inserting
    multiple documents, using ``insertManyAndGet()`` is recommended in
    preference to ``insertOneAndGet()``.

    The ``options`` object can have one string property ``hint``. Hints are
    strings without SQL comment characters, for example
    ``{ hint: "MONITOR" }``. Use only the hint ``"MONITOR"`` (turn on
    monitoring) or ``"NO_MONITOR"`` (turn off monitoring). See the Oracle
    Database SQL Tuning Guide documentation `MONITOR and NO_MONITOR
    Hints <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    19E0F73C-A959-41E4-A168-91E436DEE1F1>`__ and `Monitoring Database
    Operations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
    -C941CE9D-97E1-42F8-91ED-4949B2B710BF>`__ for more information.

    This method is in Preview status and should not be used in production.

    It requires Oracle Client 18.5 or higher. Use of the ``hint`` property
    requires Oracle Client 21.3 or higher (or Oracle Client 19 from 19.11).

    This method accepts an options parameter from node-oracledb 5.2 onwards.

    **Callback**:

    If you are using the callback programming style::

        insertManyAndGet(Array newDocumentContentArray [, Object options ], function(Error error, Array SodaDocuments){});
        insertManyAndGet(Array newSodaDocumentArray [, Object options ], function(Error error, Array SodaDocuments){});

.. method:: sodaCollection.insertOne()

    .. versionadded:: 3.0

    **Promise**::

        promise = insertOne(Object newDocumentContent);
        promise = insertOne(SodaDocument newSodaDocument);

    Inserts a given document to the collection. The input document can be
    either a JavaScript object representing the data content, or it can be
    an existing :ref:`SodaDocument <sodadocumentclass>`.

    If :attr:`oracledb.autoCommit` is *true*, and ``insertOne()`` succeeds,
    then the new document and any open transaction on the connection is
    committed.

    The following examples are equivalent::

        newDocumentContent = {name: "Alison"};
        await sodaCollection.insertOne(newDocumentContent);

    and::

        newDocumentContent = {name: "Alison"};
        doc = sodaDatabase.createDocument(newDocumentContent);
        await sodaCollection.insertOne(doc);

    The parameters of the ``sodaCollection.insertOne()`` method are:

    .. _sodacollinsertoneparams:

    .. list-table-with-summary:: sodaCollection.insertOne() Parameters
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
          - The document to insert.

            Passed as a simple JavaScript object, the value is interpreted as JSON document content. Other document components (key, version, etc.) will be auto-generated by SODA during insert. The media type will be set to “application/json”.

            Alternatively, a :ref:`SodaDocument <sodadocumentclass>` can be passed. The ``content`` and ``mediaType`` supplied in the SodaDocument will be used. The ``key``, if set, will also be used if collection has client-assigned keys. Other components in the input SodaDocument, such as version and last-modified, will be ignored and auto-generated values will be used instead.

    **Callback**:

    If you are using the callback programming style::

        insertOne(Object newDocumentContent, function(Error error){});
        insertOne(SodaDocument newSodaDocument, function(Error error){});

    See :ref:`sodacollinsertoneparams` for information on the
    ``newDocumentContent`` or ``SodaDocument`` parameters.

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
          - If ``insertOne()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.

.. method:: sodaCollection.insertOneAndGet()

    .. versionadded:: 3.0

    **Promise**::

        promise = insertOneAndGet(Object newDocumentContent [, Object options ]);
        promise = insertOneAndGet(SodaDocument newSodaDocument [, Object options ]);

    Inserts a document in a collection similar to
    :meth:`sodaCollection.insertOne()`, but also
    returns the result document which contains all
    :ref:`SodaDocument <sodadocumentclass>` components (key, version, etc.)
    except for content. Content itself is not returned for performance
    reasons.

    If you want to insert the document again, use the original
    ``newDocumentContent`` or ``newSodaDocument``. Alternatively construct a
    new object from the returned document and add content.

    The ``options`` object can have one string property ``hint``. Hints are
    strings without SQL comment characters, for example
    ``{ hint: "MONITOR" }``. Use only the hint ``"MONITOR"`` (turn on
    monitoring) or ``"NO_MONITOR"`` (turn off monitoring). See the Oracle
    Database SQL Tuning Guide documentation `MONITOR and NO_MONITOR
    Hints <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
    -19E0F73C-A959-41E4-A168-91E436DEE1F1>`__ and `Monitoring Database
    Operations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
    -C941CE9D-97E1-42F8-91ED-4949B2B710BF>`__ for more information.

    If :attr:`oracledb.autoCommit` is *true*, and ``insertOneAndGet()``
    succeeds, then any open transaction on the connection is committed.

    This method accepts an options parameter from node-oracledb 5.2 onwards.
    Use of the ``hint`` property requires Oracle Client 21.3 or higher (or
    Oracle Client 19 from 19.11).

    The parameters of the ``sodaCollection.insertOneAndGet()`` method are:

    .. _insertoneandget:

    .. list-table-with-summary:: sodaCollection.insertOneAndGet() Parameters
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
          - The document to insert. For related documentation, see :meth:`sodaCollection.insertOne()`.

    **Callback**:

    If you are using the callback programming style::

        insertOneAndGet(Object newDocumentContent [, Object options ], function(Error error, SodaDocument document){});
        insertOneAndGet(SodaDocument newSodaDocument [, Object options ], function(Error error, SodaDocument document){});

    See :ref:`insertoneandget` for information on the ``newDocumentContent`` or
    ``newSodaDocument`` parameter.

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
          - If ``insertOne()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - SodaDocument ``document``
          - A result :ref:`SodaDocument <sodadocumentclass>` that is useful for finding the system generated key and other metadata of the newly inserted document.

            Note for performance reasons, ``document`` will not have document content and cannot itself be passed directly to SODA insert or replace methods.

.. method:: sodaCollection.save()

    .. versionadded:: 5.0

    **Promise**::

        promise = save(SodaDocument newSodaDocument);

    This method behaves like :meth:`sodaCollection.insertOne()`
    with the exception that if a document with the same
    key already exists, then it is updated instead.

    The collection must use :ref:`client-assigned keys <sodaclientkeys>`
    keys, which is why ``save()`` accepts only a
    :ref:`SodaDocument <sodadocumentclass>`, unlike ``insertOne()``. If the
    collection is not configured with client-assigned keys, then the
    behavior is exactly the same as ``sodaCollection.insertOne()``.

    It requires Oracle Client 19.9 or later, and Oracle Database 18.3 or
    later.

    **Callback**:

    If you are using the callback programming style::

        save(SodaDocument newSodaDocument, function(Error error){});

.. method:: sodaCollection.saveAndGet()

    .. versionadded:: 5.0

    **Promise**::

        promise = saveAndGet(SodaDocument newSodaDocument [, Object options ]);

    This method behaves like :meth:`sodaCollection.insertOneAndGet()` with
    the exception that if a document with the same key already exists, then
    it is updated instead.

    The collection must use :ref:`client-assigned keys <sodaclientkeys>` keys,
    which is why ``saveAndGet()`` accepts only a
    :ref:`SodaDocument <sodadocumentclass>`, unlike ``insertOneAndGet()``. If
    the collection is not configured with client-assigned keys, then the
    behavior is exactly the same as ``sodaCollection.insertOneAndGet()``.

    The ``options`` object can have one string property ``hint``. Hints are
    strings without SQL comment characters, for example
    ``{ hint: "MONITOR" }``. Use only the hint ``"MONITOR"`` (turn on
    monitoring) or ``"NO_MONITOR"`` (turn off monitoring). See the Oracle
    Database SQL Tuning Guide documentation `MONITOR and NO_MONITOR
    Hints <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    19E0F73C-A959-41E4-A168-91E436DEE1F1>`__ and `Monitoring Database
    Operations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
    -C941CE9D-97E1-42F8-91ED-4949B2B710BF>`__ for more information.

    It requires Oracle Client 19.9 or later, and Oracle Database 18.3 or
    later. Use of the ``hint`` property requires Oracle Client 21.3 or higher
    (or Oracle Client 19 from 19.11).

    This method accepts an options parameter from node-oracledb 5.2 onwards.

    **Callback**:

    If you are using the callback programming style::

        saveAndGet(SodaDocument newSodaDocument [, Object options ], function(Error error, SodaDocument document){});

.. method:: sodaCollection.truncate()

    .. versionadded:: 5.0

    **Promise**

    ::

        promise = truncate();

    Truncates a collection, removing all documents. The collection will not
    be deleted.

    It requires Oracle Client 20 or later, and Oracle Database 18.3 or later.

    **Callback**:

    If you are using the callback programming style::

       truncate(function(Error error) {});

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
          - If ``truncate()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
