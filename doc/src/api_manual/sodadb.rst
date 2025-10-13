.. _sodadatabaseclass:

***********************
API: SodaDatabase Class
***********************

The SodaDatabase class is the top level object for node-oracledb SODA
operations. A ‘SODA database’ is an abstraction, allowing access to SODA
collections in that ‘SODA database’, which then allow access to
documents in those collections.

.. note::

    In this release, SODA is only supported in node-oracledb Thick mode. See
    :ref:`enablingthick`.

SODA can be used with Oracle Database 18.3 and above, when node-oracledb
uses Oracle Client 18.5 or Oracle Client 19.3, or later. The SODA bulk
insert methods :meth:`sodaCollection.insertMany()`
and :meth:`sodaCollection.insertManyAndGet()` are in Preview status.

A SODA database is equivalent to an Oracle Database user, see `Overview
of SODA <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
BE42F8D3-B86B-43B4-B2A3-5760A4DF79FB>`__
in the Introduction to SODA manual.

A SODA database object is created by calling
:meth:`connection.getSodaDatabase()`.

See :ref:`Simple Oracle Document Access (SODA) <sodaoverview>` for more
information.

.. _sodadatabasemethods:

SodaDatabase Methods
====================

.. method:: sodaDatabase.createCollection()

    .. versionadded:: 3.0

    **Promise**::

        promise = createCollection(String collectionName [, Object options]);

    Creates a SODA collection of the given name. If you try to create a
    collection, and a collection with the same name already exists, then
    that existing collection is opened without error.

    Optional metadata allows collection customization. If metadata is not
    supplied, a default collection will be created.

    By default, ``createCollection()`` first attempts to create the Oracle
    Database table used internally to store the collection. If the table
    exists already, it will attempt to use it as the table underlying the
    collection. Most users will use this default behavior.

    If the optional ``mode`` parameter is
    :ref:`oracledb.SODA_COLL_MAP_MODE <oracledbconstantssoda>`, SODA will
    attempt to use a pre-existing table as the table underlying the
    collection.

    If :attr:`oracledb.autoCommit` is *true*, and ``createCollection()``
    succeeds, then any open transaction on the connection is committed. Note
    SODA operations do not commit an open transaction the way that SQL always
    does for DDL statements.

    Performance of repeated ``createCollection()`` calls can be improved by
    enabling the SODA :ref:`metadata cache <sodamdcache>`.

    The parameters of the ``sodaDatabase.createCollection()`` method are:

    .. _createcoll:

    .. list-table-with-summary:: sodaDatabase.createCollection() Parameters
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
        * - ``collectionName``
          - String
          - The name of the collection to be created.
        * - ``options``
          - Object
          - The options that specify the collection. See :ref:`sodadbcreatecollectionoptions` for information on the properties that can be set.

    The following properties can be set for the ``options`` parameter.

    .. _sodadbcreatecollectionoptions:

    .. list-table-with-summary:: createCollection(): ``options`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the property. The second column
         displays the data type of the parameter. The third column displays
         the description of the parameter.

        * - Property
          - Data Type
          - Description
        * - ``metaData``
          - Object
          - Metadata specifying various details about the collection, such as its database storage, whether it should track version and time stamp document components, how such components are generated, and what document types are.

            If undefined or null, then a default collection metadata description will be used. The default metadata specifies that the collection contains only JSON documents, and is recommend for most SODA users.

            For more discussion see :ref:`SODA Client-Assigned Keys and Collection Metadata <sodaclientkeys>`. Also see `SODA Collection Metadata Components <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-49EFF3D3-9FAB-4DA6-BDE2-2650383566A3>`__.
        * - ``mode``
          - Number
          - If ``mode`` is :ref:`oracledb.SODA_COLL_MAP_MODE <oracledbconstantssoda>`, the collection will be stored in an externally, previously created table. A future ``sodaCollection.drop()`` will not drop the collection table. It will simply unmap it, making it inaccessible to SODA operations.

            Most users will leave ``mode`` undefined.

    **Callback**:

    If you are using the callback programming style::

        createCollection(String collectionName [, Object options], function(Error error, SodaCollection collection){});

    See :ref:`createcoll` for information on the ``collectionName`` and
    ``options`` parameters.

    The parameters of the callback function
    ``function(Error error, SodaCollection collection)`` are:

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
          - If ``createCollection()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - SodaCollection ``collection``
          - The :ref:`SodaCollection <sodacollectionclass>` containing zero or more SODA documents, depending whether it is a new or existing collection.

.. method:: sodaDatabase.createDocument()

    .. versionadded:: 3.0

    ::

        sodaDatabase.createDocument(String content [, Object options])
        sodaDatabase.createDocument(Buffer content [, Object options])
        sodaDatabase.createDocument(Object content [, Object options])

    A synchronous method that constructs a proto
    :ref:`SodaDocument <sodadocumentclass>` object usable for SODA insert and
    replace methods. SodaDocument attributes like ``createdOn`` will not be
    defined, and neither will attributes valid in ``options`` but not
    specified. The document will not be stored in the database until an
    insert or replace method is called.

    You only need to call ``createDocument()`` if your collection requires
    client-assigned keys or has non-JSON content, otherwise you can pass
    your JSON content directly to the SODA insert and replace methods.

    **Example**

    .. code-block:: javascript

       myDoc = soda.createDocument({name: "Chris", city: "Melbourne"}, {key: "123"}); // assuming client-assigned keys
       newDoc = await collection.insertOneAndGet(myDoc);
       console.log("The key of the new document is: ", newDoc.key);  // 123

    The parameters of the ``sodaDatabase.createDocument()`` method are:

    .. _createdocument:

    .. list-table-with-summary:: sodaDatabase.createDocument() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the parameter. The second column
         displays the data type of the parameter. The third column displays the
         description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``content``
          - String, Buffer, or Object
          - The document content.

            When a Buffer is used, and if the collection ``mediaType`` is (or will be) ‘application/json’ (which is the default media type), then the JSON must be encoded in UTF-8, UTF-16LE or UTF-16BE otherwise you will get a SODA error on a subsequent write operation.
        * - ``options``
          - Object
          - See :ref:`sodadbcreatedocumentoptions` for information on the properties that can be set.

    The following properties can be set for the ``options`` parameter.

    .. _sodadbcreatedocumentoptions:

    .. list-table-with-summary:: createDocument(): ``options`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the parameter. The second column
         displays the data type of the parameter. The third column displays
         the description of the parameter.

        * - Property
          - Data Type
          - Description
        * - ``key``
          - String
          - Must be supplied if the document in intended to be inserted into a collection with client-assigned keys. It should be undefined, otherwise.
        * - ``mediaType``
          - String
          - If the document has non-JSON content, then ``mediaType`` should be set to the desired media type. Using a MIME type is recommended.

            The default is ‘application/json’.

.. method:: sodaDatabase.getCollectionNames()

    .. versionadded:: 3.0

    **Promise**::

        promise = getCollectionNames([Object options]);

    Gets an array of collection names in alphabetical order.

    If :attr:`oracledb.autoCommit` is *true*, and ``getCollectionNames()``
    succeeds, then any open transaction on the connection is committed.

    The parameters of the ``sodaDatabase.getCollectionNames()`` method are:

    .. _getcollectionnames:

    .. list-table-with-summary:: sodaDatabase.getCollectionNames() Parameters
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
        * - ``options``
          - Object
          - If ``options`` is undefined, then all collection names will be returned. Otherwise, it can have the attributes listed in :ref:`getcollectionnamesoptions`.

    .. _getcollectionnamesoptions:

    .. list-table-with-summary:: getcollectionnames(): ``options`` Parameter Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the attribute. The
         second column displays the data type of the attribute. The third
         column displays the description of the attribute.

        * - Attribute
          - Data Type
          - Description
        * - ``limit``
          - Number
          - Limits the number of names returned. If limit is 0 or undefined, then all collection names are returned.
        * - ``startsWith``
          - String
          - Returns names that start with the given string, and all subsequent names, in alphabetic order.

            For example, if collections with names “cat”, “dog”, and “zebra” exist, then using ``startsWith`` of “d” will return “dog” and “zebra”. If ``startsWith`` is an empty string or undefined, all collection names are returned, subject to the value of ``limit``.

    **Callback**:

    If you are using the callback programming style::

        getCollectionNames([Object options,] function(Error error, Array collectionNames){});

    See :ref:`getcollectionnames` for information on the ``options`` parameter.

    The parameters of the callback function
    ``function(Error error, Array collectionNames)`` are:

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
          - If ``getCollectionNames()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Array ``collectionNames``
          - An array of Strings, each containing the name of a SODA collection in this SODA database. The array is in alphabetical order.

.. method:: sodaDatabase.openCollection()

    .. versionadded:: 3.0

    **Promise**::

        promise = openCollection(String collectionName);

    Opens an existing :ref:`SodaCollection <sodacollectionclass>` of the given
    name. The collection can then be used to access documents.

    If the requested collection does not exist, it is not an error. Instead,
    the returned collection value will be undefined.

    If :attr:`oracledb.autoCommit` is *true*, and ``openCollection()``
    succeeds, then any open transaction on the connection is committed.

    Performance of repeated ``openCollection()`` calls can be improved by
    enabling the SODA :ref:`metadata cache <sodamdcache>`.

    The parameters of the ``sodaDatabase.openCollection()`` method are:

    .. _opencoll:

    .. list-table-with-summary:: sodaDatabase.openCollection() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 40
        :width: 100%
        :summary: The first column displays the parameter. The second column
         displays the data type of the parameter. The third column displays
         the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``collectionName``
          - String
          - The name of the collection to open.

    **Callback**:

    If you are using the callback programming style::

        openCollection(String collectionName, function(Error error, SodaCollection collection){});

    See :ref:`opencoll` for information on the ``collectionName`` parameter.

    The parameters of the callback function
    ``function(Error error, SodaCollection collection)`` are:

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
          - If ``openCollection()`` succeeds, ``error`` is NULL. It is not an error if the requested collection does not exist. If an error occurs, then ``error`` contains the error message.
        * - SodaCollection ``collection``
          - The requested collection, if one is found. Otherwise it will be undefined.
