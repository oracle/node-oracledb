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

    In this release, SODA is only supported in node-oracledb Thick mode. See
    :ref:`enablingthick`.

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

    Creates an index on a SODA collection, to improve the performance of SODA
    query-by-examples (QBE) or enable text searches. See :ref:`sodaindexes`
    for information on indexing.

    Note that a commit should be performed before attempting to create an
    index.

    If :attr:`oracledb.autoCommit` is *true*, and ``createIndex()`` succeeds,
    then any open user transaction is committed.
    Note SODA DDL operations do not commit an open transaction the way that
    SQL always does for DDL statements.

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

    See :ref:`sodaindexes` for more information.

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

    See :ref:`sodaindexes` for an example.

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

.. method:: sodaCollection.listIndexes()

    .. versionadded:: 6.2

    **Promise:**::

        promise = listIndexes();

    Retrieves all the indexes from a SODA collection. This method returns an
    array of objects that contains the index specifications.

    This method requires Oracle Client 21.3 or later (or Oracle Client 19 from
    19.13).

    **Callback:**

    If you are using the callback programming style::

        listIndexes(function(Error error, Array listIndexes){});

    The parameters of the callback function
    ``function(Error error, Array listIndexes)`` are:

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
          - If ``listIndexes()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Array ``listIndexes``
          - An array of objects, each containing the index specifications of the SODA collection.

    See :ref:`Retrieving All Index Specifications <listindexes>` for an example.

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
