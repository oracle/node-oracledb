.. _sodaoverview:

************************************
Simple Oracle Document Access (SODA)
************************************

Oracle Database Simple Oracle Document Access (SODA) documents can be
inserted, queried, and retrieved from Oracle Database through
NoSQL-style APIs. By default, documents are JSON strings but can be
nearly any kind, including video, image, sound, and other binary
content. Create, read, update and delete operations can be performed via
document key lookups, or by query-by-example (QBE) pattern-matching.

SODA internally uses a SQL schema to store documents but you do not need
to know SQL or how the documents are stored. However, optional access
via SQL does allow use of advanced Oracle Database functionality such as
analytics for reporting. Applications that access a mixture of SODA
objects and relational objects (or access SODA objects via SQL) are
supported. Because SODA APIs internally use SQL, tuning the :ref:`Statement
Cache <stmtcache>` can be beneficial.

Oracle SODA implementations are also available in
`Python <https://cx-oracle.readthedocs.org/en/latest/index.html>`__,
`Java <https://docs.oracle.com/en/database/oracle/simple-oracle-document-
access/java/adsda/index.html>`__,
`PL/SQL <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADSDP>`__,
`Oracle Call Interface <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-23206C89-891E-43D7-827C-5C6367AD62FD>`__ and via
`REST <https://docs.oracle.com/en/database/oracle/simple-oracle-document-
access/rest/index.html>`__. The `Simple Oracle Document Access
<https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/
index.html>`__ homepage contains much information relevant to using SODA.

Node-oracledb SODA Objects
==========================

Node-oracledb uses the following objects for SODA:

-  :ref:`SodaDatabase <sodadatabaseclass>`: The top level object for
   node-oracledb SODA operations. This is acquired from an Oracle
   Database connection. A ‘SODA database’ is an abstraction, allowing
   access to SODA collections in that ‘SODA database’, which then allow
   access to documents in those collections. A SODA database is
   analogous to an Oracle Database user or schema. A collection is
   analogous to a table. A document is analogous to a table row with one
   column for a unique document key, a column for the document content,
   and other columns for various document attributes.

-  :ref:`SodaCollection <sodacollectionclass>`: Represents a collection of
   SODA documents. By default, collections allow JSON documents to be
   stored. This is recommended for most SODA users. However optional
   metadata can set various details about a collection, such as its
   database storage, whether it should track version and time stamp
   document components, how such components are generated, and what
   document types are supported. See :ref:`Collection
   Metadata <sodaclientkeys>` for more information. By default, the
   name of the Oracle Database table storing a collection is the same as
   the collection name. Note: do not use SQL to drop the database table,
   since SODA metadata will not be correctly removed. Use the
   :meth:`sodaCollection.drop()` method instead.

-  :ref:`SodaDocument <sodadocumentclass>`: Represents a document.
   Typically the document content will be JSON. The document has
   properties including the content, a key, timestamps, and the media
   type. By default, document keys are automatically generated. See
   :ref:`SodaDocument Class <sodadocumentclass>` for the forms of
   SodaDocument.

-  :ref:`SodaDocumentCursor <sodadocumentcursorclass>`: A cursor object
   representing the result of the
   :meth:`~sodaOperation.getCursor()` method from a
   :meth:`sodaCollection.find()` operation. It can be iterated over to
   access each SodaDocument.

-  :ref:`SodaOperation <sodaoperationclass>`: An internal object used with
   :meth:`sodaCollection.find()` to perform read and write operations
   on documents. Chained methods set properties on a SodaOperation
   object which is then used by a terminal method to find, count,
   replace, or remove documents. This is an internal object that should
   not be directly accessed.

Committing SODA Work
====================

The general recommendation for SODA applications is to turn on
:attr:`oracledb.autoCommit` globally:

.. code-block:: javascript

  oracledb.autoCommit = true;

If your SODA document write operations are mostly independent of each
other, this removes the overhead of application transaction management
and the need for explicit :meth:`connection.commit()` calls.

When deciding how to commit transactions, beware of transactional
consistency and performance requirements. If you are using individual
SODA calls to insert or update a large number of documents with
individual calls, you should turn ``autoCommit`` off and issue a single,
explicit :meth:`connection.commit()` after all documents have
been processed. Also consider using :meth:`sodaCollection.insertMany()` or
:meth:`sodaCollection.insertManyAndGet()` which have performance benefits.

If you are not autocommitting, and one of the SODA operations in your
transaction fails, then previous uncommitted operations will not be
rolled back. Your application should explicitly roll back the
transaction with :meth:`connection.rollback()` to prevent
any later commits from committing a partial transaction.

Note:

-  SODA DDL operations do not commit an open transaction the way that
   SQL always does for DDL statements.
-  When :attr:`oracledb.autoCommit` is *true*,
   most SODA methods will issue a commit before successful return.
-  SODA provides optimistic locking, see :meth:`sodaOperation.version()`.
-  When mixing SODA and relational access, any commit or rollback on the
   connection will affect all work.

.. _sodarequirements:

Node-oracledb SODA Requirements
===============================

SODA is available to Node.js applications using Oracle Database 18.3 and
above, when node-oracledb uses Oracle Client 18.5 or Oracle Client 19.3,
or later. The SODA bulk insert methods :meth:`sodaCollection.insertMany()`
and :meth:`sodaCollection.insertManyAndGet()` are in Preview status.

To execute SODA operations, Oracle Database users require the SODA_APP
role granted to them by a DBA:

.. code-block:: sql

  GRANT SODA_APP TO hr;

The ``CREATE TABLE`` system privilege is also needed. Advanced users who
are using Oracle sequences for keys will also need the
``CREATE SEQUENCE`` privilege.

*Note*: if you are using Oracle Database 21 (or later) and you create
*new* collections, then you need to do one of the following:

-  Use Oracle Client libraries 21 (or later).

-  Or, explicitly use :ref:`collection metadata <sodaclientkeys>` when
   creating collections and set the data storage type to BLOB, for
   example::

    {
      "keyColumn":
      {
        "name":"ID"
      },
      "contentColumn":
      {
        "name": "JSON_DOCUMENT",
        "sqlType": "BLOB"
      },
      "versionColumn":
      {
        "name": "VERSION",
        "method": "UUID"
      },
      "lastModifiedColumn":
      {
        "name": "LAST_MODIFIED"
      },
      "creationTimeColumn":
      {
        "name": "CREATED_ON"
      }
    }

-  Or, set the database initialization parameter
   `compatible <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
   -A2E90F08-BC9F-4688-A9D0-4A948DD3F7A9>`__ to 19 or lower.

Otherwise you may get errors such as *ORA-40842: unsupported value JSON
in the metadata for the field sqlType* or *ORA-40659: Data type does not
match the specification in the collection metadata*.

If you use Oracle Client libraries 19 with Oracle Database 21 and
accidently create a collection with unusable metadata, then you can drop
the collection by running a command like
``SELECT DBMS_SODA.DROP_COLLECTION('myCollection') FROM DUAL;`` in
SQL*Plus.

.. _creatingsodacollections:

Creating and Dropping SODA Collections
======================================

The following examples use Node.js 8’s
:ref:`async/await <asyncawaitoverview>` syntax, however callbacks can also
be used. There are runnable examples in the GitHub
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
directory.

Collections can be created like:

.. code-block:: javascript

  oracledb.autoCommit = true;

  try {
    const soda = connection.getSodaDatabase();
    const collection = await soda.createCollection("mycollection");
    const indexSpec = { "name": "CITY_IDX",
                        "fields": [ {
                            "path": "address.city",
                            "datatype": "string",
                            "order": "asc" } ] };
    await collection.createIndex(indexSpec);
  } catch(err) {
    console.error(err);
  }

This example creates a collection that, by default, allows JSON
documents to be stored. A non-unique B-tree index is created on the
``address.city`` path to improve search performance.

If the collection name passed to
:meth:`sodaDatabase.createCollection()` already exists, it
will simply be opened. Alternatively you can open a known, existing
collection with :meth:`sodaDatabase.openCollection()`.

Collections will be visible as tables in your Oracle Database schema. Do
not use DROP TABLE to drop these database tables, since SODA metadata
will not be correctly removed. Use the :meth:`sodaCollection.drop()`
method instead. If you accidentally execute DROP SQL, you should call
``sodaCollection.drop()`` or execute the SQL statement
``SELECT DBMS_SODA.DROP_COLLECTION('myCollection') FROM dual;``

See :ref:`SODA Client-Assigned Keys and Collection
Metadata <sodaclientkeys>` for how to create a collection with custom
metadata.

.. _accessingsodadocuments:

Creating and Accessing SODA documents
=====================================

To insert a document into an opened collection, a JavaScript object that
is the document content can be used directly. In the following example,
it is the object myContent:

.. code-block:: javascript

  try {
    const myContent = {name: "Sally", address: {city: "Melbourne"}};
    const newDoc = await collection.insertOneAndGet(myContent);
    // a system generated key is created by default
    console.log("The key of the new SODA document is: ", newDoc.key);
  } catch(err) {
    console.error(err);
  }

See :meth:`sodaCollection.insertOne()` for more
information.

For many users, passing your document content directly to the
:meth:`sodaCollection.insertOne()`,
:meth:`sodaCollection.insertOneAndGet()`, :meth:`sodaCollection.save()`,
:meth:`sodaCollection.saveAndGet()`, :meth:`sodaOperation.replaceOne()`,
:meth:`sodaOperation.replaceOneAndGet()`,
:meth:`sodaCollection.insertMany()`, or
:meth:`sodaCollection.insertManyAndGet()` methods will be
fine. System generated values for the key and other document components
will be added to the stored SODA document. For cases where you want to
insert Buffers or Strings, or when you need more control over the
SodaDocument, such as to use a client-assigned key, then you can call
the :meth:`sodaDatabase.createDocument()` method
and pass its result to an insert or replace method, for example:

.. code-block:: javascript

  try {
    myContent = {name: "Sally", address: {city: "Melbourne"}};
    newDoc = soda.createDocument(myContent, {key: "123"});
    await collection.insertOne(myContent);
  } catch(err) {
    console.error(err);
  }

Note: to use client-assigned keys, collections must be created with
custom metadata, see :ref:`SODA Client-Assigned Keys and Collection
Metadata <sodaclientkeys>`.

Collections with client-assigned keys can be used for ‘upsert’
operations using :meth:`sodaCollection.save()` and
:meth:`sodaCollection.saveAndGet()`. These methods
are similar to the insertion methods, however if an existing document
with the same key already exists in the collection, it is replaced.

To extract documents from a collection, the
:meth:`~sodaCollection.find()` method can be used to build a
:ref:`SodaOperation <sodaoperationclass>` object specifying the keys of
desired documents, or searches can be performed on JSON documents using
query-by-example (QBE) methods. Each document has a unique key. If the
key for a document is “k1”, the document can be fetched like:

.. code-block:: javascript

  const myKey = "k1";
  try {
    const soda = connection.getSodaDatabase();
    const collection = await soda.openCollection("mycollection");
    const doc = await collection.find().key(myKey).getOne(); // A SodaDocument
    const content = doc.getContent();  // A JavaScript object
    console.log("Name: " + content.name); // Sally
    console.log("Lives in: " + content.address.city);  // Melbourne
  } catch(err) {
    console.error(err);
  }

The content of queried SodaDocument objects is only accessible via one
of the accessor methods :meth:`~sodaDocument.getContent()`,
:meth:`~sodaDocument.getContentAsBuffer()` or
:meth:`~sodaDocument.getContentAsString()`. Which one to
use depends on the media type, and how you want to use it in the
application. By default, the media type is ‘application/json’.

The :meth:`SodaCollection.find()` method creates a SodaOperation object
used with method chaining to specify desired properties of documents
that a terminal method like :meth:`~sodaOperation.getOne()`
or :meth:`~sodaOperation.remove()` then applies to.

Other examples of chained read and write operations include:

-  To see if a document exists:

   .. code-block:: javascript

    c = await col.find().key("k1").getOne();
    if (c) then { . . .}

-  To return a cursor that can be iterated over to get documents with
   keys “k1” and “k2”:

   .. code-block:: javascript

    docCursor = await collection.find().keys(["k1", "k2"]).getCursor();
    let myDocument;
    while ((myDocument = await docCursor.getNext())) {
      console.log(myDocument.getContent());
    }
    docCursor.close();

-  To remove the documents matching the supplied keys:

   .. code-block:: javascript

    await collection.find().keys(["k1", "k2"])).remove();

-  To remove the document with the key ‘k1’ and version ‘v1’:

   .. code-block:: javascript

    await collection.find().key("k1").version("v1").remove();

   The version field is a value that automatically changes whenever the
   document is updated. By default it is a hash of the document’s
   content. Using :meth:`~sodaOperation.version()` allows
   optimistic locking, so that the :meth:`~sodaCollection.find()`
   terminal method (which is :meth:`~sodaOperation.remove()` in this example)
   does not affect a document that someone else has already modified. If the
   requested document version is not matched, then the terminal
   operation will not impact any documents. The application can then
   query to find the latest document version and apply any desired
   change.

-  To update a document with a given key and version. The new document
   content will be the ``newContent`` object:

   .. code-block:: javascript

    newContent = {name: "Fred", address: {city: "Melbourne"}};
    await collection.find().key("k1").version("v1").replaceOne(newContent);

-  To find the new version of an updated document:

   .. code-block:: javascript

    const newContent = {name: "Fred", address: {city: "Melbourne"}};
    const updatedDoc = await collection.find().key("k1").version("v1").replaceOneAndGet(newContent);
    console.log('New version is: ' + updatedDoc.version);

-  To count all documents, no keys are needed:

   .. code-block:: javascript

    const n = collection.find().count();

-  When using :meth:`~sodaOperation.getCursor()` and
   :meth:`~sodaOperation.getDocuments()` to return a
   number of documents, performance of document retrieval can be tuned
   by setting :attr:`oracledb.fetchArraySize` or
   using the ``find()`` non-terminal
   :meth:`~sodaOperation.fetchArraySize()`. For
   example, to get all documents in a collection:

   .. code-block:: javascript

    const documents = await coll.find().fetchArraySize(500).getDocuments();

The :meth:`sodaCollection.find()` operators that return
documents produce complete SodaDocument objects that can be used for
reading document content and attributes such as the key. They can also
be used for passing to methods like
:meth:`sodaCollection.insertOne()`, :meth:`sodaCollection.insertOneAndGet()`,
:meth:`sodaCollection.save()`, :meth:`sodaCollection.saveAndGet()`,
:meth:`sodaCollection.insertMany()`,
:meth:`sodaCollection.insertManyAndGet()`,
:meth:`sodaOperation.replaceOne()`, and
:meth:`sodaOperation.replaceOneAndGet()`.

Note that for efficiency, the SodaDocuments returned from
:meth:`sodaCollection.insertOneAndGet()`,
:meth:`sodaCollection.saveAndGet()`,
:meth:`sodaOperation.replaceOneAndGet()`,
and :meth:`sodaCollection.insertManyAndGet()`
cannot be passed to SODA insert methods, since they do not contain any
document content. These SodaDocuments are useful for getting other
document components such as the key and version. If you need a complete
SodaDocument, then create a JavaScript object using the desired
attribute values, or use
:meth:`sodaDatabase.createDocument()`, or use a
SodaDocument returned by a :meth:`sodaCollection.find()`
query.

.. _sodaqbesearches:

SODA Query-by-Example Searches for JSON Documents
=================================================

JSON documents stored in SODA can easily be searched using
query-by-example (QBE) syntax with ``collection.find().filter()``.
Filtering and ordering easily allows subsets of documents to be
retrieved, replaced or removed. Filter specifications can include
comparisons, regular expressions, logical, and spatial operators, among
others. See `Overview of SODA Filter Specifications
(QBEs) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
CB09C4E3-BBB1-40DC-88A8-8417821B0FBE>`__

Some QBE examples are:

-  To find the number of documents where ‘age’ is less than 30, the city
   is San Francisco and the salary is greater than 500000:

   .. code-block:: javascript

    const n = await collection.find().filter({"age": {"$lt": 30},
                                              "address.city": "San Francisco",
                                              "salary": {"$gt": 500000}}).count();
    console.log(n);

-  To return all documents that have an age less than 30, an address in
   San Francisco, and a salary greater than 500000:

   .. code-block:: javascript

    const docCursor = await collection.find().filter({"age": {"$lt": 30},
                                                      "address.city": "San Francisco",
                                                      "salary": {"$gt": 500000}}).getCursor();
    let myDocument;
    while ((myDocument = await docCursor.getNext())) {
      console.log(myDocument.getContent());
    }
    docCursor.close();

-  Same as the previous example, but allowing for pagination of results
   by only getting 10 documents:

   .. code-block:: javascript

    const docCursor = await collection.find().filter({"age": {"$lt": 30},
                                                      "address.city": "San Francisco",
                                                      "salary": {"$gt": 500000}}).skip(0).limit(10).getCursor();

   To get the next 10 documents, the QBE could be repeated with the
   ``skip()`` value set to 10.

-  To get JSON documents with an “age” attribute with values greater
   than 60, and where either the name is “Max” or where tea or coffee is
   drunk.

   .. code-block:: javascript

    const filterSpec = {"$and": [{"age": {"$gt": 60} },
                          {"$or": [{"name": "Max"},
                                   {"drinks": {"$in": ["tea", "coffee"]}}]}]; };
    const docCursor = await collection.find().filter(filterSpec).getCursor();

-  The ``$orderby`` specification can be used to order any returned
   documents:

   .. code-block:: javascript

    const filterSpec = {"$query": {"salary": {$between [10000, 20000]}},
                        "$orderby": {"age": -1, "name": 2}};
    const docCursor = await collection.find().filter(filterSpec).getCursor();

   This ‘orderby abbreviated syntax’ returns documents within a
   particular salary range, sorted by descending age and ascending name.
   Sorting is done first by age and then by name, because the absolute
   value of -1 is less than the absolute value of 2 - not because -1 is
   less than 2, and not because field age appears before field name in
   the ``$orderby`` object.

   An alternate ``$orderby`` syntax allows specifying the data types and
   maximum number of string characters to be used for comparison. See
   `Overview of QBE Operator $orderby <https://www.oracle.com/pls/topic/
   lookup?ctx=dblatest&id=GUID-3B182089-9A38-45DA-B7D7-8232E13C8F83>`__.

-  Documents that contain a
   `GeoJSON <https://tools.ietf.org/html/rfc7946>`__ geometry can be
   searched. For example if the collection contained documents of the
   form:

   .. code-block:: javascript

    {"location": {"type": "Point", "coordinates": [33.7243, -118.1579]}}

   Then a Spatial QBE like the following could be used to find documents
   within a 50 km range of a specified point:

   .. code-block:: javascript

    const filterSpec = {"location" :
      {"$near" :
        {"$geometry": {"type": "Point", "coordinates": [34.0162, -118.2019]},
          "$distance" : 50,
          "$unit"     : "KM"}}};
    const docCursor = await collection.find().filter(filterSpec).getCursor();

   See `Overview of QBE Spatial Operators <https://www.oracle.com/pls/topic/
   lookup?ctx=dblatest&id=GUID-12994E27-DA98-40C7-8D4F-84341106F8D9>`__.

.. _sodatextsearches:

SODA Text Searches
==================

To perform text searches through documents, a `JSON search index
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4848E6A0-
58A7-44FD-8D6D-A033D0CCF9CB>`__ must be defined. For example:

.. code-block:: javascript

  await collection.createIndex({"name": "mySearchIdx"});

See `SODA Index Specifications (Reference) <https://www.oracle.com/pls/topic
/lookup?ctx=dblatest&id=GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C>`__
for information on SODA indexing.

Documents in the indexed collection can be searched by running a filter
(QBE) using the `$contains <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-C4C426FC-FD23-4B2E-8367-FA5F83F3F23A>`__ operator:

.. code-block:: javascript

  let documents = await collection.find().filter({item : { $contains : "books"}}).getDocuments();

This example will find all documents that have an ``item`` field
containing the string “books” (case-insensitive). For example, a
document that contained ``{item : "Books by Brothers Grimm"}`` would be
returned.

.. _sodaclientkeys:

SODA Client-Assigned Keys and Collection Metadata
=================================================

Default collections support JSON documents and use system generated
document keys. Various storage options are also configured which should
suit most users. Overriding the default configuration is possible by
passing custom metadata when a collection is created with
:meth:`sodaDatabase.createCollection()`.
Metadata specifies things such as:

-  Storage details, such as the name of the table that stores the
   collection and the names and data types of its columns.

-  The presence or absence of columns for creation time stamp,
   last-modified time stamp, and version.

-  Whether the collection can store only JSON documents.

-  Methods of document key generation, and whether document keys are
   client- assigned or generated automatically.

-  Methods of version generation.

Note that changing storage options should only be done with care.

The metadata attributes are described in `SODA Collection Metadata
Components <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-49EFF3D3-9FAB-4DA6-BDE2-2650383566A3>`__.

Collection metadata in SODA is represented as a JavaScript object.

The default collection metadata specifies that a collection stores five
components for each document: key, JSON content, version, last-modified
timestamp, and a created-on timestamp. An example of default metadata
with Oracle Database 19c is::

  {
     "schemaName": "mySchemaName",
     "tableName": "myCollectionName",
     "keyColumn":
     {
        "name": "ID",
        "sqlType": "VARCHAR2",
        "maxLength": 255,
        "assignmentMethod": "UUID"
     },
     "contentColumn":
     {
        "name": "JSON_DOCUMENT",
        "sqlType": "BLOB",
        "compress": "NONE",
        "cache": true,
        "encrypt": "NONE",
        "validation": "STANDARD"
     },
     "versionColumn":
     {
       "name": "VERSION",
       "method": "SHA256"
     },
     "lastModifiedColumn":
     {
       "name": "LAST_MODIFIED"
     },
     "creationTimeColumn":
     {
        "name": "CREATED_ON"
     },
     "readOnly": false
  }

With Oracle Database 21, default metadata might be like::

  {
     "schemaName": "mySchemaName",
     "tableName": "myCollectionName",
     "keyColumn":
     {
        "name": "ID",
        "sqlType": "VARCHAR2",
        "maxLength": 255,
        "assignmentMethod": "UUID"
     },
     "contentColumn":
     {
        "name": "JSON_DOCUMENT",
        "sqlType": "JSON",
     },
     "versionColumn":
     {
       "name": "VERSION",
       "method": "UUID"
     },
     "lastModifiedColumn":
     {
       "name": "LAST_MODIFIED"
     },
     "creationTimeColumn":
     {
        "name": "CREATED_ON"
     },
     "readOnly": false
  }

See `Overview of SODA Document Collections <https://www.oracle.com/pls/topic
/lookup?ctx=dblatest&id=GUID-C107707F-E135-493F-9112-98691C80D3E9>`__
for more information on collections and their metadata.

The following example shows how to create a collection that supports
keys supplied by the application, instead of being system generated.
Here, numeric keys will be used. The metadata used when creating the
collection will be the same as the above default metadata with the
`keyColumn <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
1938641C-B5BF-4B77-9A54-17EE06FEA94C>`__ object changed. Here the type
becomes NUMBER and the `assignment method <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-53AA7D85-80A9-4F98-994F-E3BD91769146>`__
is noted as client-assigned:

.. code-block:: javascript

  const mymetadata = { . . . };   // the default metadata shown above

  // update the keyColumn info
  mymetadata.keyColumn =
  {
     "name": "ID",
     "sqlType": "NUMBER",
     "assignmentMethod": "CLIENT"
  };

  // Set schemaName to the connected user
  mymetadata.schemaName = 'HR';

This custom metadata is then used when creating the collection:

.. code-block:: javascript

  oracledb.autoCommit = true;

  try {
    const soda = connection.getSodaDatabase();
    const collection = await soda.createCollection("mycollection", { metaData: mymetadata});
    const indexSpec = { "name": "CITY_IDX",
                        "fields": [ {
                            "path": "address.city",
                            "datatype": "string",
                            "order": "asc" } ] };
    await collection.createIndex(indexSpec);
  } catch(err) {
    console.error(err);
  }

To insert a document into the collection, a key must be supplied by the
application. Note it is set to a string:

.. code-block:: javascript

  try {
    const myContent = {name: "Sally", address: {city: "Melbourne"}};
    const newDoc = soda.createDocument(myContent, {key: "123"});
    await collection.insertOne(newDoc);
  } catch(err) {
    console.error(err);
  }

.. _sodajsondataguide:

JSON Data Guides in SODA
========================

SODA exposes Oracle Database’s `JSON data guide <https://www.oracle.com/pls
/topic/lookup?ctx=dblatest&id=GUID-219FC30E-89A7-4189-BC36-7B961A24067C>`__
feature. This lets you discover information about the structure and
content of JSON documents by giving details such as property names, data
types and data lengths. In SODA, it can be useful for exploring the
schema of a collection.

To get a data guide in SODA, the collection must be JSON-only and have a
:meth:`JSON Search index <sodacollection.createIndex()>` where the
``"dataguide"`` option is ``"on"``. Data guides are returned from
:meth:`sodaCollection.getDataGuide()` as JSON
content in a :ref:`SodaDocument <sodadocumentclass>`. The data guide is
inferred from the collection as it currently is. As a collection grows
and documents change, a new data guide may be returned each subsequent
time ``getDataGuide()`` is called.

As an example, suppose a collection was created with default settings,
meaning it can store JSON content. If the collection contained these
documents:

.. code-block:: javascript

  {"name": "max", "country": "ukraine"}
  {"name": "chris", "country": "australia"}
  {"name": "venkat" , "country": "india"}
  {"name": "anthony", "country": "canada"}

Then the following code:

.. code-block:: javascript

  const await createIndex({"name": "myIndex"});  // dataguide is "on" by default
  const doc = await sodaCollection.getDataGuide();
  const dg = doc.getContentAsString();
  console.log(dg);

Will display the data guide:

.. code-block:: javascript

  {"type":"object","properties":{
    "name":{"type":"string","o:length":8,"o:preferred_column_name":"JSON_DOCUMENT$name"},
    "country":{"type":"string","o:length":16,"o:preferred_column_name":"JSON_DOCUMENT$country"}}}

This indicates that the collection documents are JSON objects, and
currently have “name” and “country” fields. The types (“string” in this
case) and lengths of the values of these fields are listed. The
“preferred_column_name” fields can be helpful for advanced users who
want to define SQL views over JSON data. They suggest how to name the
columns of a view.

.. _sodamdcache:

Using the SODA Metadata Cache
=============================

SODA metadata can be cached to improve the performance of
:meth:`sodaDatabase.createCollection()` and
:meth:`sodaDatabase.openCollection()` by
reducing :ref:`round-trips <roundtrips>` to the database. Caching is
available when using node-oracledb 5.2 (or later) with Oracle Client
version 21.3 (or later). It is also available in Oracle Client 19 from
19.11 onwards. Note: if the metadata of a collection is changed, the
cache can get out of sync.

Caching can be enabled for pooled connections but not standalone
connections. Each pool has its own cache. Applications using standalone
connections should retain and reuse the collection returned from
:meth:`sodaDatabase.createCollection()` or
:meth:`sodaDatabase.openCollection()` wherever
possible, instead of making repeated calls to those methods.

The metadata cache can be turned on with
:ref:`sodaMetadataCache <createpoolpoolattrssodamdcache>` when
creating a connection pool:

.. code-block:: javascript

  await oracledb.createPool({
    user              : "hr",
    password          : mypw,               // mypw contains the hr schema password
    connectString     : "localhost/XEPDB1",
    sodaMetaDataCache : true
  });

If the metadata of a collection is changed externally, the cache can get
out of sync. If this happens, the cache can be cleared by calling
:meth:`pool.reconfigure({ sodaMetadataCache: false }) <pool.reconfigure()>`.
A second call to ``reconfigure()`` should then be made to re-enable the
cache.

Note the cache is not used by ``soda.createCollection()`` when
explicitly passing metadata. In this case, instead of using only
``soda.createCollection()`` and relying on its behavior of opening an
existing collection like:

.. code-block:: javascript

  const mymetadata = { . . . };
  const collection = await soda.createCollection("mycollection", mymetadata);  // open existing or create new collection
  await collection.insertOne(mycontent);

you may find it more efficient to use logic similar to:

.. code-block:: javascript

  let collection = await soda.openCollection("mycollection");
  if (!collection) {
     const mymetadata = { . . . };
      collection = await soda.createCollection("mycollection", mymetadata);
  }
  await collection.insertOne(mycontent);
