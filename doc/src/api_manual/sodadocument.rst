.. _sodadocumentclass:

***********************
API: SodaDocument Class
***********************

SodaDocuments represents the document for SODA read and write
operations.

SODA can be used with Oracle Database 18.3 and above, when node-oracledb
uses Oracle Client 18.5 or Oracle Client 19.3, or later. The SODA bulk
insert methods :meth:`sodaCollection.insertMany()` and
:meth:`sodaCollection.insertManyAndGet()` are in Preview status.

SodaDocument objects can be created in three ways:

-  The result of
   :meth:`sodaDatabase.createDocument()`. This
   is a proto SodaDocument object usable for SODA insert and replace
   methods. The SodaDocument will have content and media type components
   set. Attributes like ``createdOn`` will not be defined. Optional
   attributes not specified when calling ``createDocument()`` will also
   not be defined.

-  The result of a read operation from the database, such as calling
   :meth:`sodaOperation.getOne()`, or from
   :meth:`sodaDocumentCursor.getNext()` after a
   :meth:`sodaOperation.getCursor()`
   call. These return complete SodaDocument objects containing the
   document content and attributes, such as time stamps.

-  The result of
   :meth:`sodaCollection.insertOneAndGet()`,
   :meth:`sodaOperation.replaceOneAndGet()`,
   or :meth:`sodaCollection.insertManyAndGet()`
   methods. These return SodaDocuments that contain all attributes
   except the document content itself. They are useful for finding
   document attributes such as system generated keys, and versions of
   new and updated documents.

.. _sodadocumentproperties:

SodaDocument Properties
=======================

The available document properties are shown below. Document content of
queried SodaDocument objects is only accessible via one of the accessor
methods :meth:`~sodaDocument.getContent()`,
:meth:`sodaDocument.getContentAsBuffer()` or
:meth:`sodaDocument.getContentAsString()`.

Other properties of a SodaDocument object can be accessed directly. They
are read-only. The properties for default collections are listed below.

.. versionadded:: 3.0

.. attribute:: sodaDocument.createdOn

    This read-only property returns the creation time of the document as a
    string in the UTC time zone using an ISO8601 format such as
    ‘2018-07-11T01:37:50.123456Z’ or ‘2018-07-11T01:37:50.123Z’. By default,
    SODA sets this automatically.

.. attribute:: sodaDocument.key

    This read-only property is a string that returns a unique key value for
    this document. By default, SODA automatically generates the key.

.. attribute:: sodaDocument.lastModified

    This read-only property returns the last modified time of the document as
    a string in the UTC time zone using an ISO8601 format such as
    ‘2018-07-11T01:37:50.123456Z’ or ‘2018-07-11T01:37:50.123Z’. By default,
    SODA sets this automatically.

.. attribute:: sodaDocument.mediaType

    This read-only property is an arbitrary string value designating the
    content media type. The recommendation when creating documents is to use a
    MIME type for the media type. By default, collections store only JSON
    document content and this property will be ‘application/json’. This
    property will be null if the media type is unknown, which will only be in
    the rare case when a collection was created to store mixed or non-JSON
    content on top of a pre-existing database table, and that table has NULLs
    in its ``mediaType`` column.

.. attribute:: sodaDocument.version

    This read-only property is a string that returns the version of the
    document. By default, SODA automatically updates the version each time the
    document is changed.

.. _sodadocumentmethods:

SodaDocument Methods
====================

These methods return the document content stored in a SodaDocument.
Which one to call depends on the content and how you want to use it. For
example, if the document content is JSON, then any of the methods may be
called. But if the document content is binary, then only
:meth:`sodaDocument.getContentAsBuffer()` may be called.

Although documents cannot be null, content can be.

.. method:: sodaDocument.getContent()

    .. code-block:: javascript

        getContent()

    A synchronous method that returns the document content as an object. An
    exception will occur if the document content is not JSON and cannot be
    converted to an object.

    .. versionadded:: 3.0

.. method:: sodaDocument.getContentAsBuffer()

    .. code-block:: javascript

        getContentAsBuffer()

    A synchronous method that returns the document content as a Buffer.

    If the documents were originally created with
    :meth:`sodaDatabase.createDocument()`, then documents are returned as they
    were created.

    For documents fetched from the database where the collection storage is
    BLOB (which is the default), and whose ``mediaType`` is
    ‘application/json’, then the buffer returned is identical to that which
    was stored. If the storage is not BLOB, it is UTF-8 encoded.

    .. versionadded:: 3.0

.. method:: sodaDocument.getContentAsString()

    .. code-block:: javascript

        getContentAsString()

    A synchronous method that returns JSON document content as a String.

    An exception will occur if the document content cannot be converted to a
    string.

    If the document encoding is not known, UTF8 will be used.

    .. versionadded:: 3.0
