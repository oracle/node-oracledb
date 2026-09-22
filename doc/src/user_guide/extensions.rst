.. _extendingnodeoracledb:

***********************
Extending node-oracledb
***********************

.. versionadded:: 6.8

You can extend the functionalities of node-oracledb by using plugins. The
plugins provided by node-oracledb are listed in this section.

.. _cloudnativeauthplugins:

Cloud Native Authentication Plugins
===================================

.. versionadded:: 6.8

Node-oracledb provides pre-supplied plugins for cloud native authentication
which are listed in this section. These plugins enable token generation using
the Software Development Kit (SDK) of the respective token-authentication
method.

The cloud native authentication token plugin implementation is available in
the `plugins/token <https://github.com/oracle/node-oracledb/tree/main/plugins/
token>`__ directory of the node-oracledb package.

To load these node-oracledb plugins in your application, use
``require('oracledb/plugins/token/<name of plugin>')``, for example:

.. code-block:: javascript

    require('oracledb/plugins/token/extensionOci');

.. _extensionociplugin:

Oracle Cloud Infrastructure (OCI) Cloud Native Authentication Plugin
--------------------------------------------------------------------

Node-oracledb's ``extensionOci`` plugin enables token generation using `OCI
Software Development Kit (SDK) <https://www.npmjs.com/package/oci-sdk>`__ when
authenticating with IAM token-based authentication.

The ``extensionOci`` plugin is available as part of the `plugins/token
<https://github.com/oracle/node-oracledb/tree/main/plugins/token/
extensionOci/index.js>`__ directory in the node-oracledb package. This plugin
requires the `minimum Node.js version <https://docs.oracle.com/en-us/iaas/
Content/API/SDKDocs/typescriptsdk.htm#Versions_Supported>`__ supported by OCI
SDK.

Adding this plugin to your code defines and registers a built-in hook function
that generates IAM tokens. This function is internally invoked when the
``tokenAuthConfigOci`` property is specified in the
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.

See :ref:`cloudnativeauthoci` for more information.

.. _extensionazureplugin:

Azure Cloud Native Authentication Plugin
----------------------------------------

Node-oracledb's ``extensionAzure`` plugin enables token generation using `Azure
Software Development Kit (SDK) <https://www.npmjs.com/~azure-sdk>`__ when
authenticating with OAuth 2.0 token-based authentication.

The ``extensionAzure`` plugin implementation is available as part of the
`plugins/token <https://github.com/oracle/node-oracledb/tree/main/plugins/
token/extensionAzure/index.js>`__ directory in the node-oracledb package.
This plugin requires the minimum Node.js version supported by Azure SDK.

Adding this plugin to your code defines and registers a built-in hook function
that generates OAuth 2.0 tokens. This function is internally invoked when the
``tokenAuthConfigAzure`` property is specified in the
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.

See :ref:`cloudnativeauthoauth` for more information.

.. _endusersecurityproviderplugin:

End-User Security Provider Plugin
---------------------------------

.. versionadded:: 26.0.0

Node-oracledb's ``endUserSecurityProvider`` plugin can be used with Oracle
Deep Data Security to create and apply end-user security contexts for database
operations.

The ``endUserSecurityProvider`` plugin implementation is available in the
`plugins/token/endUserSecurityProvider <https://github.com/oracle/
node-oracledb/tree/main/plugins/token/endUserSecurityProvider/index.js>`__
directory of the node-oracledb package.

Adding this plugin to your code defines and registers a built-in process
configuration hook that creates an end-user security context provider. This
provider is configured when the ``endUserSecParams`` property is specified in
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.
Request-specific metadata is supplied with
:meth:`securityContextProvider.runWithContext()`, and the generated end-user
security context is applied only to database operations executed within that
callback.

See :ref:`endusersecuritycontextcreationplugin` for more information.

.. _configproviderplugins:

Centralized Configuration Provider Plugins
==========================================

.. versionadded:: 6.9

Node-oracledb provides pre-supplied plugins for centralized configuration
providers which are listed in this section. These plugins provide access to
database connection credentials and application configuration information
stored in a centralized configuration provider.

The centralized configuration provider plugin implementation is available in
the `plugins/configProviders <https://github.com/oracle/node-oracledb/tree/
main/plugins/configProviders>`__ directory of the node-oracledb package.

To load these node-oracledb plugins in your application, use
``require('oracledb/plugins/configProviders/<name of plugin>')``, for example:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ociobject');

.. _ociobjectplugin:

OCI Object Storage Centralized Configuration Provider Plugin
------------------------------------------------------------

.. versionadded:: 6.9

``ociobject`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Oracle Cloud Infrastructure (OCI) Object Storage <ociobjstorage>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-ociobject``, see :ref:`OCI Object Storage connection strings
<connstringoci>`.

To load the ``ociobject`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ociobject');

See :ref:`ociobjstorage` for more information.

.. _ocivaultplugin:

OCI Vault Centralized Configuration Provider Plugin
---------------------------------------------------

.. versionadded:: 6.9

``ocivault`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Oracle Cloud Infrastructure (OCI) Vault <ocivault>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-ocivault``, see :ref:`OCI Vault connection strings
<connstringocivault>`.

To load the ``ocivault`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ocivault');

See :ref:`ocivault` for more information.

.. _azureplugin:

Microsoft Azure App Centralized Configuration Provider Plugin
-------------------------------------------------------------

.. versionadded:: 6.9

``azure`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Azure App Configuration <azureappconfig>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-azure``, see :ref:`Azure App Configuration connection strings
<connstringazure>`.

To load the ``azure`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/azure');

See :ref:`azureappconfig` for more information.

.. _azurevaultplugin:

Microsoft Azure Key Vault Centralized Configuration Provider Plugin
-------------------------------------------------------------------

.. versionadded:: 6.9

``azurevault`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Azure Key Vault <azurekeyvault>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-azurevault``, see :ref:`Azure Key Vault connection strings
<connstringazurevault>`.

To load the ``azurevault`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/azurevault');

See :ref:`azurekeyvault` for more information.

.. _awss3plugin:

Amazon Simple Storage Service (S3) Centralized Configuration Provider Plugin
----------------------------------------------------------------------------

.. versionadded:: 7.0

``awss3`` is a plugin that can be loaded in your application to provide access
to configuration information stored in :ref:`AWS S3 <awss3>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-awss3``, see :ref:`Amazon S3 connection strings
<connstringawss3>`.

To load the ``awss3`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/awss3');

See :ref:`awss3` for more information.

.. _awssecretsmanagerplugin:

AWS Secrets Manager Centralized Configuration Provider Plugin
-------------------------------------------------------------

.. versionadded:: 7.0

``awssecretsmanager`` is a plugin that can be loaded in your application to
provide access to configuration information stored in
:ref:`AWS Secrets Manager <awssecretsmanager>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-awssecretsmanager``, see :ref:`AWS Secrets Manager connection
strings <connstringawssecretsmanager>`.

To load the ``awssecretsmanager`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/awssecretsmanager');

See :ref:`awssecretsmanager` for more information.

.. _googlecloudstorageplugin:

Google Cloud Storage Centralized Configuration Provider Plugin
--------------------------------------------------------------

.. versionadded:: 26.0.0

``gcpstorage`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Google Cloud Storage <googlecloudstorage>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-gcpstorage``, see :ref:`Google Cloud Storage connection
strings <connstringgcs>`.

To load the ``gcpstorage`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/gcpstorage');

See :ref:`googlecloudstorage` for more information.

.. _vectorsdkplugin:

Vector SDK Plugin
=================

.. versionadded:: 26.0.0

Node-oracledb provides a pre-supplied Vector SDK plugin that provides a
high-level interface for `Oracle AI Vector Search <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=VECSE-GUID-746EAA47-9ADA-4A77-82BB-
64E8EF5309BE>`__ workflows in Node.js applications. This plugin provides APIs
for creating vector stores, storing documents and embeddings, searching by
vector or text, creating vector indexes, and managing embedding models in
Oracle Database.

The ``vectorsdk`` plugin implementation is available in the `plugins/vectorsdk
<https://github.com/oracle/node-oracledb/tree/main/plugins/vectorsdk>`__
directory of the node-oracledb package. The Vector SDK requires Oracle Database
23.4 or later.

To load the ``vectorsdk`` plugin, use:

.. code-block:: javascript

   const { OracleVecDB } = require('oracledb/plugins/vectorsdk');

Loading this ``vectorsdk`` plugin returns the ``OracleVecDB`` class which is
used for creating and using a database-backed vector store. This class
supports creating vector tables, adding supplied vectors, generating
embeddings from text, searching by vector or text, creating vector indexes,
deleting documents, and dropping vector tables. Also, the plugin returns the
following functions:

.. list-table-with-summary:: Vector SDK Helper Functions
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 10 40
    :name:  _vector_sdk_helper_functions
    :summary: The first column displays the function name. The second column displays the description of the function.

    * - Function
      - Description
    * - ``loadModel()``
      - A function that loads an embedding model into Oracle Database.
    * - ``dropModel()``
      - A function that drops an embedding model from Oracle Database.
    * - ``describeModel()``
      - A function that returns metadata for a loaded embedding model. This function requires Oracle Database 26.2 or later.
    * - ``listModels()``
      - A function that lists models in the current schema. This function requires Oracle Database 26.2 or later.
    * - ``getIndexBuildStatus()``
      - A function that returns vector index build status information for a table. This function requires Oracle Database 26.2 or later.

For information on using the Vector SDK, see the subsequent sections.

.. _vectorsdk:

Using the Vector SDK Plugin
---------------------------

To use the ``vectorsdk`` plugin in your application, load the required APIs in
your code:

.. code-block:: javascript

    const {
      OracleVecDB,
      loadModel,
      dropModel,
      describeModel,
      listModels,
      getIndexBuildStatus
    } = require('oracledb/plugins/vectorsdk');

Most Vector SDK operations use ``OracleVecDB``, which represents a vector store
backed by an Oracle Database table. The other provided functions manage embedding
models or report vector index build status. See
:ref:`_vector_sdk_helper_functions` for more information.

After loading the ``vectorsdk`` plugin, you can:

- :ref:`Create an OracleVecDB instance <createvectorstore>` to configure the
  vector store.

- :ref:`Create the Oracle Database table <vecsdkcreatevectortable>` for the
  vector store, if needed.

- :ref:`Add supplied vectors <vecsdkaddvectors>`.

- :ref:`Generate embeddings from text <vecsdkgenerateandaddembeddings>`, if
  needed.

- :ref:`Search by vector or by text <vecsdksearch>`.

- :ref:`Create a vector index <vecsdkcreatevectorindex>`, if needed.

- :ref:`Manage embedding models <vecsdkmanagemodels>`, if needed.

These are detailed in the subsequent sections.

For information on using the Oracle Database ``VECTOR`` data type directly with
node-oracledb, see :ref:`vectors`.

.. _createvectorstore:

Creating a Vector Store
+++++++++++++++++++++++

A vector store is an ``OracleVecDB`` instance that contains the configuration
used by the Vector SDK for vector table, document, embedding, and search
operations. This configuration includes the database source,
table name, vector column definition, and distance metric.

Create an ``OracleVecDB`` instance to configure how the Vector SDK connects to
the database, which table and columns it uses, and how vector searches are
performed. For example:

.. code-block:: javascript

    const oracledb = require('oracledb');
    const {OracleVecDB} = require('oracledb/plugins/vectorsdk');

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // contains the hr schema password
        connectString : "localhost/FREEPDB1"
    });

    const vectorStore = new OracleVecDB({
        dbSource: connection,
        tableName: 'MY_VECTOR_TABLE',
        vector: {
          dimensions: 3,
          storageFormat: 'FLOAT32',
          storageType: 'DENSE'
        },
        vectorDistanceType: 'COSINE'
    });

For information on the properties of the ``OracleVecDB`` class, see
:ref:`_oraclevecdb_properties`.

Note that creating an ``OracleVecDB`` instance does not create any database
objects. It only sets this configuration in your application. To create the
Oracle Database table used by the vector store, see
:ref:`vecsdkcreatevectortable`.

The ``OracleVecDB`` constructor takes an ``options`` parameter that configures
the vector store. You can configure the following properties in the
``options`` parameter:

.. list-table-with-summary:: ``OracleVecDB`` Class Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 25 15
    :name:  _oraclevecdb_properties
    :summary: The first column displays the name of the property. The second column displays the description of the property. The third column displays whether the property is required or not.

    * - Property
      - Description
      - Required or Optional
    * - ``columns``
      - .. _vecdbcolumns:

        Custom names and comments for the generated table columns.

        See :ref:`columnconfiguration` for more information.
      - Optional
    * - ``dbSource``
      - .. _vecdbsource:

        Controls how the Vector SDK gets a database connection for each
        operation. It can be a node-oracledb ``Connection`` or ``Pool`` managed
        by the application, or a provider function that returns a promise
        resolving to either one. The provider is invoked once per operation.

        See :ref:`dbsourceconfiguration` for more information.
      - Required
    * - ``description``
      - .. _vecdbdescription:

        A comment for a table created by the SDK. It must be a non-empty string when specified.

        See :ref:`descriptionconfiguration` for more information.
      - Optional
    * - ``vectorDistanceType``
      - .. _vecdbvectordistancetype:

        The distance metric used by searches and indexes.

        The possible values are *COSINE*, *EUCLIDEAN*, *EUCLIDEAN_SQUARED*, *L2_SQUARED*, *MANHATTAN*, *DOT*, *HAMMING*, and *JACCARD*. Note that *JACCARD* can only be used with BINARY vectors.

        The default value is *COSINE*.

        For BINARY vectors, the default value is *HAMMING*.

        See :ref:`distancemetricsconfiguration` for more information.
      - Optional
    * - ``modelParams``
      - .. _vecdbmodelparams:

        Database-side embedding model parameters. This is required for text-based operations such as ``addDocuments()``, ``generateEmbeddings()``, ``insertWithEmbeddings()``, and ``search()`` when using search by text.

        See :ref:`modelparamsconfiguration` for more information.
      - Optional
    * - ``quoteIdentifiers``
      - .. _vecdbquoteid:

        Determines whether the configured identifiers are quoted.

        Set it to *true* to quote identifiers and preserve their values exactly.

        The default value is *false*.

        See :ref:`identifierquotingconfiguration` for more information.
      - Optional
    * - ``tableName``
      - .. _vecdbtablename:

        A string containing a simple table name, or an object with ``schema`` and ``name`` properties of a schema-qualified table.

        A string always represents one identifier. Use the object form to qualify a table with a schema.
      - Required
    * - ``vector``
      - .. _vecdbvector:

        The vector-column configuration.

        See :ref:`vectorconfiguration` for more information.
      - Required

In an ``OracleVecDB`` instance, the configured table and column identifiers
are validated before use. This includes the ``tableName`` value, the vector
column name, and any custom column names specified in ``columns``. Do not
include double quotation marks in configured identifier values such as
``tableName``, the vector ``column``, or column names specified in
``columns``. When ``quoteIdentifiers`` is set to *true*, the Vector SDK adds
quotation marks when it uses these identifiers in SQL statements.

The following example shows an ``OracleVecDB`` instance that configures all
the properties described above:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      dbSource: connection,
      tableName: 'DOCUMENT_VECTORS',
      vector: {
        column: 'DOC_EMBEDDING',
        dimensions: 384,
        storageFormat: 'FLOAT32',
        storageType: 'DENSE'
      },
      columns: {
        rowid: 'ROW_ID',
        id: 'DOCUMENT_ID',
        content: {
          name: 'DOCUMENT_TEXT',
          annotation: 'Source document text'
        },
        metadata: {
          name: 'DOCUMENT_METADATA',
          annotation: 'Document metadata'
        }
      },
      description: 'Embeddings for product documentation',
      modelParams: {
        provider: 'database',
        model: 'DOC_EMBED_MODEL'
      },
      vectorDistanceType: 'COSINE',
      quoteIdentifiers: true
    });

.. _dbsourceconfiguration:

Database Source Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Set the ``dbSource`` property to specify how the Vector SDK gets a database
connection for each operation. The value can be a node-oracledb
``Connection``, a node-oracledb ``Pool``, or a provider function that returns
a promise resolving to either one.

When ``dbSource`` is a provider function, the Vector SDK invokes it at the
start of every operation and awaits the promise it returns. The promise must
resolve to a ``Connection`` or ``Pool`` that is ready for use.

The provider resolves a database source that is managed by the application.
Invoking the provider does not imply that it creates a new source. It can
return the same source for multiple operations or return another source
according to the application's requirements. The Vector SDK does not store a
returned source for use by later operations.

For example, an application can cache pools by credentials so that repeated
operations using the same credentials resolve to the same pool:

.. code-block:: javascript

    const poolCache = new Map();

    async function getDbSource() {
      // "credentials" contains database credentials managed by the application.
      // "getCredentialCacheKey()" is defined by the application using an
      // identifier that it manages, and returns a stable key that identifies
      // the credential set without exposing sensitive values such as passwords.
      const cacheKey = getCredentialCacheKey(credentials);

      let pool = poolCache.get(cacheKey);
      if (pool === undefined) {
        pool = await oracledb.createPool({
          user: credentials.user,
          password: credentials.password,
          connectString: credentials.connectString
        });

        poolCache.set(cacheKey, pool);
      }

      return pool;
    }

    const vectorStore = new OracleVecDB({
      dbSource: getDbSource,
      tableName: 'documents',
      vector: {
        dimensions: 384
      }
    });

In this example, the application manages the database credentials and the pool
cache. It implements ``getCredentialCacheKey()`` to associate each group of
credentials with its pool without placing sensitive values in the cache key.
When the Vector SDK invokes the provider, the provider uses this key to return
the cached pool or to create and cache one if none exists. The application
is responsible for closing the pools when they are no longer needed. If
concurrent provider invocations can occur before a pool is available, the
application should coordinate pool creation so that the invocations resolve to
the same pool. For example, the application may use a pool manager or cache
the pool creation promise.

The application owns every ``Connection`` or ``Pool`` supplied through
``dbSource`` and remains responsible for its lifecycle. The Vector SDK does
not create, cache, replace, or close these sources. It also does not create a
``Connection`` or ``Pool`` from connection attributes or pool configuration;
the application must create and manage the database source.

When the source is a ``Pool``, the Vector SDK acquires a connection for the
operation and releases that connection when the operation completes, returning
it to the pool. The application remains responsible for closing the pool.

When the source is a ``Connection``, the Vector SDK uses it without closing
it. The application must close the connection when it is no longer needed.

Applications that always use the same ``Connection`` or ``Pool`` should
normally pass it directly as ``dbSource``. Provider functions are intended for
applications that resolve their database source through an external resource
manager.

See :ref:`vectorsdktransactions` for transaction behavior with connections and
pools.

.. _vectorconfiguration:

Vector Configuration
^^^^^^^^^^^^^^^^^^^^

Set the :ref:`vector <vecdbvector>` property in an ``OracleVecDB`` instance to
define the Oracle Database ``VECTOR`` column used by the vector store. This
configuration sets the vector dimensions, vector column name, element format,
and storage representation.

You can configure the ``vector`` property with the following values:

.. list-table-with-summary:: ``vector`` Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 25 15
    :name:  _vector_object_properties
    :summary: The first column displays the name of the property. The second column displays the description of the property. The third column displays whether the property is required or not.

    * - Property
      - Description
      - Required or Optional
    * - ``column``
      - .. _vecdbvectorcolumn:

        The vector column name.

        This property can be a string containing the vector column name, or an object with the following optional properties:

        - ``name``:  Overrides the default database column name for the vector column. If not specified, the default database column name is used.
        - ``annotation``: Adds a comment to the vector column.

        The default value is *embedding*.
      - Optional
    * - ``dimensions``
      - .. _vecdbvectordimensions:

        A positive integer specifying the number of dimensions in each vector.

        For BINARY vectors, this property must be a multiple of eight. See :ref:`binaryvectors` for more information.
      - Required
    * - ``storageFormat``
      - .. _vecdbvectorstorageformat:

        The element format. The possible values are `FLOAT32`, `FLOAT64`, `INT8`, `BINARY`, or `*`.

        Values supplied for a `*` format column are converted to `FLOAT64`.

        The default value is *FLOAT32*.
      - Optional
    * - ``storageType``
      - .. _vecdbvectorstoragetype:

        The storage representation. The possible values are `DENSE` or `SPARSE`.

        The default value is *DENSE*.

        BINARY format cannot be combined with the SPARSE storage type. See :ref:`binaryvectors` and :ref:`sparsevectors` for more information.
      - Optional

An example of creating a vector store with a 384-dimensional ``FLOAT32``
vector column named ``DOC_EMBEDDING`` is shown below:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      vector: {
        column: 'DOC_EMBEDDING',
        dimensions: 384,
        storageFormat: 'FLOAT32',
        storageType: 'DENSE'
      }
    });

To add a comment to the vector column while using the default database column
name, specify ``annotation`` without ``name`` as shown in the example below:

.. code-block:: javascript

    vector: {
      dimensions: 384,
      column: {
        annotation: 'Document embedding'
      }
    }

.. _columnconfiguration:

Column Configuration
^^^^^^^^^^^^^^^^^^^^

Set the :ref:`columns <vecdbcolumns>` property in an ``OracleVecDB`` instance
to customize the table columns used by the vector store.

You can configure the following properties in the ``columns`` object:

.. list-table-with-summary:: ``columns`` Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 20 60
    :name: _columns_properties
    :summary: The first column displays the property name. The second column displays the description of the property.

    * - Property
      - Description
    * - ``rowid``
      - Internal primary key row identifier generated by Oracle Database.

        If this property is not set, the Vector SDK uses ``id`` as the database column name.
    * - ``id``
      - External document ID supplied by the application or generated by the Vector SDK.

        If this property is not set, the Vector SDK uses ``external_id`` as the database column name.
    * - ``content``
      - Document text stored with each vector embedding.

        If this property is not set, the Vector SDK uses ``text`` as the database column name.
    * - ``metadata``
      - JSON metadata associated with each document.

        If this property is not set, the Vector SDK uses ``metadata`` as the database column name.

All the properties listed in the above table can be a string containing the
column name, or an object with optional ``name`` and ``annotation`` properties.
The ``name`` property overrides the default database column name, and the
``annotation`` property adds a comment to the column. If ``name`` is omitted,
the default database column name is used.

Configured column names must be unique. The column name ``distance`` is
reserved for search results. It cannot be used for any configured table
column, including :ref:`vector column <vecdbvectorcolumn>` or columns
specified in :ref:`columns <vecdbcolumns>` of an OracleVecDB instance.

For the default database column names and database definitions used when
``createVectorTable()`` creates a table, see
:ref:`_default_vector_sdk_table_columns`.

An example of creating a vector store with custom column names is shown below:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      columns: {
        rowid: 'ROW_ID',
        id: 'DOCUMENT_ID',
        content: 'DOCUMENT_TEXT',
        metadata: 'DOCUMENT_METADATA'
      }
    });

To add a comment to the content column while using the default database column
name, specify ``annotation`` without ``name`` as shown in the example below:

.. code-block:: javascript

    columns: {
      content: {
        annotation: 'Source document text'
      }
    }

.. _descriptionconfiguration:

Table Comment Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Use the :ref:`description <vecdbdescription>` property in an OracleVecDB
instance to add a comment to a table created by the Vector SDK.

When specified, the ``description`` value must be a non-empty string.

An example of specifying table and column comments is shown below:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      description: 'Embeddings for product documentation'
    });

.. _distancemetricsconfiguration:

Distance Metrics Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Set the :ref:`vectorDistanceType <vecdbvectordistancetype>` property to specify the
distance metric used by vector searches and vector indexes. The distance metric
determines how similarity is calculated between the query vector and stored
vectors.

The supported distance metrics are *COSINE*, *EUCLIDEAN*, *EUCLIDEAN_SQUARED*,
*L2_SQUARED*, *MANHATTAN*, *DOT*, *HAMMING*, and *JACCARD*.

The default distance metric is ``COSINE``.

The *JACCARD* distance metric requires BINARY vectors. For BINARY vectors, the
default distance metric is *HAMMING*. Other supported distance metrics can be
used for exact searches on BINARY vectors.

For example:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      vectorDistanceType: 'COSINE'
    });

For more information on distance metrics, see `Vector Distance Metrics
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=VECSE-GUID-DBC136C1-7C63-4B7F-902B-2289FF375560>`__.

.. _modelparamsconfiguration:

Model Parameters Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Set the :ref:`modelParams <vecdbmodelparams>` property when the vector store
needs to generate embeddings in Oracle Database. The Vector SDK passes
``modelParams`` to Oracle Database when generating embeddings.

The ``modelParams`` parameter can identify either a model loaded into Oracle
Database or a supported remote embedding provider configured for use by Oracle
Database.

These model parameters identify the database embedding model used by
text-based operations such as ``addDocuments()``, ``generateEmbeddings()``,
``insertWithEmbeddings()``, and text-based ``search()``.

The ``modelParams`` object is passed to Oracle Database when embeddings are
generated.

For a model loaded into Oracle Database, ``modelParams`` commonly includes
``provider`` set to ``database`` and ``model`` set to the loaded model name.
For example:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      modelParams: {
        provider: 'database',
        model: 'DOC_EMBED_MODEL'
      }
    });

For a remote embedding provider, specify the provider-specific parameters
required by Oracle Database. For example, to use OpenAI:

.. code-block:: javascript

    modelParams: {
      provider: 'openai',
      credential_name: 'OPENAI_CRED',
      url: 'https://api.openai.com/v1/embeddings',
      model: 'text-embedding-3-small'
    }

For remote embedding providers, ``credential_name`` identifies the Oracle
Database credential used to authenticate with the provider, ``url`` specifies
the provider endpoint, and ``model`` specifies the embedding model to use.
The supported remote embedding providers include *cohere*, *googleai*,
*huggingface*, *ocigenai*, *openai*, *vertexai*, *mistralai*, *ollama*, and
*privateai*.

For information about loading and managing embedding models in Oracle
Database, see :ref:`vecsdkmanagemodels`.

.. _identifierquotingconfiguration:

Identifier Quoting Configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

By default, configured identifiers are unquoted Oracle Database identifiers.
The Vector SDK removes leading and trailing whitespace, validates each value
as a simple SQL name, and lets Oracle Database apply its normal
case-insensitive identifier semantics.

Set ``quoteIdentifiers`` to *true* to make the Vector SDK quote configured
identifiers. The SDK preserves each quoted identifier value exactly, including
case and leading or trailing whitespace. Empty identifiers, double quotation
marks, and null characters are not supported. Supply identifier values without
double quotation marks.

For example:

.. code-block:: javascript

    const vectorStore = new OracleVecDB({
      dbSource: connection,
      tableName: {
        schema: 'hr',
        name: 'employees'
      },
      columns: {
        content: 'JOB_DESCRIPTION',
        metadata: 'EMPLOYEE_METADATA'
      },
      vector: {
        column: 'EMPLOYEE_EMBEDDING',
        dimensions: 384
      },
      quoteIdentifiers: true
    });

This configuration uses the schema-qualified table name
``"hr"."employees"``.

.. _oraclevecdbmethods:

OracleVecDB Methods
^^^^^^^^^^^^^^^^^^^

After creating an ``OracleVecDB`` instance, you can use the following methods:

.. list-table-with-summary:: OracleVecDB Methods
    :header-rows: 1
    :class: wy-table-responsive
    :name:  _oracledbvecdb_methods
    :summary: The first column displays the method name. The second column displays the description of the method.

    * - Method
      - Description
    * - ``addDocuments()``
      - Generates embeddings for documents and adds them to the vector table.
    * - ``addVectors()``
      - Adds supplied vectors and their associated documents to the vector table.
    * - ``createVectorIndex()``
      - Creates an HNSW or IVF vector index for approximate nearest-neighbor searches.
    * - ``createVectorTable()``
      - Creates the configured vector table, if it does not already exist.
    * - ``delete()``
      - Deletes documents by external ID, or deletes all documents from the vector table.
    * - ``dropTable()``
      - Drops the configured vector table.
    * - ``generateEmbeddings()``
      - Generates vector embeddings for text values without storing them.
    * - ``insertWithEmbeddings()``
      - Inserts rows from a source table into the vector table, generating embeddings from source text values.
    * - ``search()``
      - Searches for documents by supplied vector or by text.

.. _vecsdkcreatevectortable:

Creating a Vector Table
-----------------------

To create the Oracle Database table configured in the
:ref:`OracleVecDB instance <createvectorstore>` if the table does not already
exist, use ``OracleVecDB.createVectorTable()``. For example:

.. code-block:: javascript

    const tableName = await vectorStore.createVectorTable();

The table is created using the configured table name, vector column
definition, column names, and optional table and column comments. This method
returns the SQL table identifier used by the SDK.

When ``createVectorTable()`` is called, the Vector SDK creates the following
columns by default. You can override these default column names by setting the
corresponding property in ``columns`` or by setting ``vector.column`` in the
``vector`` property.

.. list-table-with-summary:: Default Vector SDK table columns
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 20 30 20 30
    :name:  _default_vector_sdk_table_columns
    :summary: The first column displays the name of the property. The second column displays the default database column name. The third column displays the database type or definition. The fourth column displays the description of the property.

    * - Property
      - Default Database Column Name
      - Database Type or Definition
      - Description
    * - ``columns.rowid``
      - id
      - RAW(16) DEFAULT SYS_GUID() PRIMARY KEY
      - Internal primary-key row identifier generated by Oracle Database.
    * - ``columns.id``
      - external_id
      - VARCHAR2(255) UNIQUE
      - External document ID supplied by the application or generated by the Vector SDK.
    * - ``vector.column``
      - embedding
      - VECTOR with the configured dimensions, format, and storage
      - Vector embedding used for similarity searches.
    * - ``columns.content``
      - text
      - CLOB
      - Document text associated with the vector embedding.
    * - ``columns.metadata``
      - metadata
      - JSON
      - JSON metadata associated with the document.

.. _vectorinputrepresentation:

Vector Input Representations
----------------------------

The Vector SDK accepts several JavaScript representations for vector values
and converts them to the vector format configured for the vector store.

The methods ``OracleVecDB.addVectors()`` and vector-based
``OracleVecDB.search()`` accept JavaScript arrays, Float32Array, Float64Array,
and Int8Array values. The SDK converts them to the configured vector format.

For a SPARSE vector store, the SDK accepts either dense vector input, such
as a JavaScript array or supported TypedArray, or an
:ref:`oracledb.SparseVector object <oracledbsparsevector>`. When dense input
is used with a SPARSE vector store, the SDK converts it to sparse form by
storing only the non-zero values and their indices. Zero values are omitted
from the sparse representation. An ``oracledb.SparseVector`` object can only
be used with a vector store whose :ref:`vector storage <vecdbvectorstoragetype>`
value is *SPARSE*. It cannot be used with a DENSE vector store.

For INT8 vectors, input values are rounded to integers before they are stored
or searched. Each rounded value must be in the range *-128* through *127*.

For BINARY vectors, you can pass a Uint8Array containing the packed binary
representation of the vector. The Uint8Array must contain exactly
``dimensions / 8`` bytes. For example, a BINARY vector with *16* dimensions
requires a Uint8Array with 2 bytes. You can also pass a JavaScript array or
another supported TypedArray for a BINARY vector. In this case, the SDK
converts the input to packed binary form by treating positive values as *1*
and zero or negative values as *0*.

.. _vecsdkaddvectors:

Adding Supplied Vectors
-----------------------

Use ``OracleVecDB.addVectors()`` when your application already has vector
embeddings, such as embeddings generated by an external model or service.
This method stores each supplied vector with its associated document content
and metadata in the vector table. For example:

.. code-block:: javascript

    const ids = await vectorStore.addVectors(
      [
        new Float32Array([1, 0, 0]),
        new Float32Array([0, 1, 0])
      ],
      [
        {
          content: 'Oracle Database supports vector search.',
          metadata: {category: 'database', year: 2026}
        },
        {
          content: 'Node.js is a JavaScript runtime.',
          metadata: {category: 'javascript', year: 2026}
        }
      ],
      {
        ids: ['document-1', 'document-2'],
        autoCommit: true
      }
    );

The parameters of ``OracleVecDB.addVectors()`` are:

.. list-table-with-summary:: ``addVectors()`` Parameters
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :name:  _addvector_parameters
    :summary: The first column displays the name of the parameter. The second column displays the description of the parameter. The third column displays whether the parameter is required or not.

    * - Parameter
      - Description
      - Required or Optional
    * - ``vectors``
      - A non-empty array of vector values. Each vector must follow the :ref:`vector input rules <vectorinputrepresentation>`.
      - Required
    * - ``documents``
      - A non-empty array of document objects. The number of documents must match the number of vectors. Each document must contain a non-empty string ``content`` property and a plain object ``metadata`` property.
      - Required
    * - ``options``
      - An object that contains options for document IDs, upserts, and commits. See :ref:`_addvector_options`.
      - Optional

The ``options`` object can contain the following properties:

.. list-table-with-summary:: addVectors(): ``options`` Parameter Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :name:  _addvector_options
    :summary: The first column displays the property name. The second column displays the description. The third column displays whether the property is required or optional.

    * - Property
      - Description
      - Required or Optional
    * - ``autoCommit``
      - A boolean value which commits the inserted or updated rows.

        It must be set to *true* for ``addVectors()``.
      - Required
    * - ``ids``
      - An array of strings that contains external document IDs. The number of IDs must match the
        number of documents. Each ID must be a non-empty string no longer than 255 bytes. If omitted, the SDK generates UUIDs.

        The method returns the supplied or generated IDs in input order.
      - Optional
    * - ``upsert``
      - A boolean value which indicates whether to update an existing row with the same external document ID.

        When set to *true*, updates an existing row with the same external
        document ID. An upsert replaces its vector, content, and metadata while preserving its internal RAW row ID.

        If omitted or *false*, duplicate IDs produce a database constraint error.
      - Optional

.. _vecsdkgenerateandaddembeddings:

Generating and Adding Embeddings
--------------------------------

The Vector SDK can generate embeddings in Oracle Database by using the embedding
model configured with :ref:`modelParams <vecdbmodelparams>` in the OracleVecDB
instance. This lets your application pass document text to the SDK instead of
generating vector embeddings separately. See :ref:`modelparamsconfiguration`
for more information.

The methods described below use the embedding model specified by
``modelParams`` to generate vector embeddings from text. See
:ref:`vecsdkmanagemodels`.

.. _vecsdkadddocuments:

Adding Documents
++++++++++++++++

Use ``addDocuments()`` to generate embeddings from document content and store
the documents and embeddings in the vector table. For example:

.. code-block:: javascript

    const ids = await vectorStore.addDocuments(
      [
        {
          content: 'Oracle Database supports vector search.',
          metadata: {category: 'database'}
        },
        {
          content: 'Node.js applications can use node-oracledb.',
          metadata: {category: 'javascript'}
        }
      ],
      {
        ids: ['document-1', 'document-2'],
        autoCommit: true
      }
    );

The method uses the same document, ID, and ``upsert`` rules as
``addVectors()`` and also requires that ``autoCommit`` be set to *true*.
See :ref:`_addvector_options` for more information on these properties.

The ``addDocuments()`` method returns IDs in input order. For large document
sets, divide the input into smaller chunks and call ``addDocuments()`` once
for each chunk.

.. _vecsdkgenerateembeddings:

Generating Embeddings Without Storing Them
++++++++++++++++++++++++++++++++++++++++++

Use ``generateEmbeddings()`` to generate embeddings for text values without
inserting rows into the vector table. Pass a non-empty array of non-empty
strings to the method. For example:

.. code-block:: javascript

    const embeddings = await vectorStore.generateEmbeddings([
      'Oracle Database supports vector search.',
      'Node.js is a JavaScript runtime.'
    ]);

The method returns one embedding for each input string, preserving input order.
For large input arrays, divide the input into smaller chunks and call
``generateEmbeddings()`` once for each chunk.

.. _insertfromsourcetable:

Inserting from a Source Table
+++++++++++++++++++++++++++++

Use ``insertWithEmbeddings()`` to read rows from another table, generate an
embedding from each row's content, and insert the results into the configured
vector table. For example:

.. code-block:: javascript

    const rowsAffected = await vectorStore.insertWithEmbeddings({
      sourceTable: {
        schema: 'My Schema',
        name: 'Source Documents'
      },
      idColumn: 'Document ID',
      contentColumn: 'Document Text',
      metadataColumn: 'Document Metadata',
      quoteSource: true,
      autoCommit: true
    });

The ``insertWithEmbeddings()`` method requires
:ref:`modelParams <vecdbmodelparams>` to be configured on the ``OracleVecDB``
instance because embeddings are generated from the source table's content
column.

The ``insertWithEmbeddings()`` method takes a single ``options`` parameter.
You can specify the following properties in the ``options`` parameter:

.. list-table-with-summary:: insertWithEmbeddings(): ``options`` Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :name:  _insertwithembeddings_parameters
    :summary: The first column displays the property name. The second column displays the description of the property. The third column displays whether the property is required or optional.

    * - Property
      - Description
      - Required or Optional
    * - ``autoCommit``
      - A boolean that indicates whether the insert operation is committed automatically.
      - Optional
    * - ``contentColumn``
      - A string that identifies the name of the source column containing text values to embed.
      - Required
    * - ``idColumn``
      - A string that identifies the name of the source column containing external document IDs.
      - Required
    * - ``metadataColumn``
      - A string that identifies the name of the source column containing document metadata.
      - Optional
    * - ``quoteSource``
      - A boolean that determines whether source table and column identifiers
        are quoted and preserved exactly. The default value is *false*.
      - Optional
    * - ``sourceTable``
      - A string containing simple source table name, or an object
        containing its ``schema`` and ``name`` properties.
      - Required

Supply raw source identifier values without double quotation marks. When
``quoteSource`` is *true*, the SDK preserves identifier values exactly,
including case and whitespace, and safely quotes them. The ``quoteSource``
option affects only the source table and source columns. The destination vector
table continues to use the ``quoteIdentifiers`` setting configured on the
``OracleVecDB`` instance.

Note that this method does not provide an upsert option.

.. _vecsdksearch:

Searching a Vector Store
------------------------

Use ``OracleVecDB.search()`` to find documents in the vector store that are
most similar to a supplied query. You can search by using a
:ref:`vector <vecsdksearchbyvector>` or :ref:`text <vecsdksearchbytext>`.

You can limit the number of results, request a target search accuracy, filter
results by document metadata, and optionally include the stored vector in each
result.

The SDK requests an approximate search. Oracle Database uses an eligible vector
index when one is available; otherwise, or when the optimizer does not use the
index, it returns exact results instead. In that case, an ``accuracy`` setting
has no effect.

The ``search()`` method takes a single ``options`` object that specifies the
query input, result count, target accuracy, metadata filter, and whether to
include vectors in the returned results.

You can specify the following properties in the ``options`` parameter:

.. list-table-with-summary:: search(): ``options`` Parameter Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :name: _search_options
    :summary: The first column displays the parameter name. The second column displays the description of the parameter. The third column displays whether the parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - ``queryBy``
      - An object containing exactly one of ``vector`` or ``text``.

        If set to ``vector``, it contains the vector used for similarity search. The value must follow the :ref:`vector input rules <vectorinputrepresentation>`. See :ref:`vecsdksearchbyvector` for more information.

        If set to ``text``, then it is a string that contains text to embed and use for similarity search. Requires ``modelParams`` to be set in the OracleVecDB instance. See :ref:`vecsdksearchbytext` for more information.
      - Required
    * - ``topK``
      - A positive integer specifying the maximum number of results.

        The default value is *5*.
      - Optional
    * - ``accuracy``
      - An integer from 1 through 100 specifying target approximate search accuracy. If omitted, Oracle Database uses its default target accuracy.
      - Optional
    * - ``filter``
      - An object that contains the metadata filter. See :ref:`vectorsdkfiltermetadata`.
      - Optional
    * - ``includeVector``
      - A boolean that determines whether to include the stored vector in each result.

        If set to *true*, it includes the stored vector in each result.

        The default value is *false*.
      - Optional

For both vector-based and text-based searches, ``search()`` returns an array
of result objects, ordered by ascending distance. Each result object contains
the ``id``, ``content``, ``metadata``, and ``distance`` properties, for
example:

.. code-block:: javascript

    [
      {
        id: 'document-1',
        content: 'Oracle Database supports vector search.',
        metadata: {category: 'database'},
        distance: 0
      }
    ]

When ``includeVector`` is *true*, each result also contains the ``vector``
property. Distance values have metric-specific meanings and should not be
compared across different metrics.

.. _vecsdksearchbyvector:

Search by Vector
++++++++++++++++

Use ``vector`` in the ``queryBy`` property of ``search()`` to search with a
vector supplied by your application. This is useful when the query embedding
has already been generated outside the Vector SDK.

.. code-block:: javascript

    const results = await vectorStore.search({
      queryBy: {
        vector: new Float32Array([1, 0, 0])
      },
      topK: 5
    });

The query vector must follow the vector input rules described in
:ref:`vectorinputrepresentation`. The SDK converts the supplied
vector to the configured vector format before running the search.

.. _vecsdksearchbytext:

Search by Text
++++++++++++++

Use ``text`` in the ``queryBy`` property of ``search()`` to search with text
supplied by your application. The Vector SDK generates an embedding for the
query text in Oracle Database by using the model configured with
:ref:`modelParams <vecdbmodelparams>`, and then uses that embedding to search
the vector store. Text-based search requires ``modelParams`` to be configured
on the ``OracleVecDB`` instance so that the Vector SDK can generate an
embedding for the query text in Oracle Database.

For example:

.. code-block:: javascript

    const results = await vectorStore.search({
      queryBy: {
        text: 'How does Oracle Database perform vector search?'
      },
      topK: 5
    });

.. _vectorsdkfiltermetadata:

Filtering by Metadata
---------------------

Use the ``filter`` option of the ``OracleVecDB.search()`` method to restrict
search results by values stored in the metadata column. Metadata filters are
applied before the nearest vector matches are returned.

Metadata fields can be matched directly by specifying field names and values in
the ``filter`` object:

.. code-block:: javascript

    const results = await vectorStore.search({
      queryBy: {vector: [1, 0, 0]},
      filter: {
        category: 'database'
      }
    });

Multiple fields in one ``filter`` object are implicitly combined with ``AND``.
For example, the following filter matches only documents where both conditions
are true: ``category`` is ``database`` and the nested ``document.year`` value is
greater than or equal to 2024.

.. code-block:: javascript

    filter: {
      category: 'database',
      'document.year': {$gte: 2024}
    }

Use dotted field names to access nested metadata properties. Filter paths must
contain one or more identifier-like components separated by periods, such as
``tenant`` or ``document.year``. Arbitrary JSON path syntax is not accepted. An
empty top-level ``filter`` object applies no filter.

The supported comparison operators are:

.. list-table-with-summary:: Vector SDK metadata filter operators
    :header-rows: 1
    :class: wy-table-responsive
    :width: 100%
    :name: _filter_operators
    :summary: The first column displays the operator. The second column displays the operand. The third column displays description of the operator.

    * - Operator
      - Operand
      - Description
    * - ``$eq``
      - JSON scalar
      - Matches values equal to the operand.
    * - ``$ne``
      - JSON scalar
      - Matches unequal values and documents where the field is absent.
    * - ``$gt``
      - String or finite number
      - Matches values greater than the operand.
    * - ``$gte``
      - String or finite number
      - Matches values greater than or equal to the operand.
    * - ``$lt``
      - String or finite number
      - Matches values less than the operand.
    * - ``$lte``
      - String or finite number
      - Matches values less than or equal to the operand.
    * - ``$between``
      - Two values of the same supported type
      - Matches the inclusive range.
    * - ``$in``
      - Non-empty array of JSON scalars
      - Matches at least one value in the array.
    * - ``$nin``
      - Non-empty array of JSON scalars
      - Matches none of the values, including when the field is absent.
    * - ``$like``
      - String
      - Matches the specified Oracle JSON path pattern.
    * - ``$exists``
      - Boolean
      - Tests whether the field exists.

An array value is shorthand for the ``$in`` operator. Multiple operators
specified for the same metadata field are combined with ``AND``. For example,
this filter matches documents whose ``category`` is either *database* or
*javascript*:

.. code-block:: javascript

    filter: {
      category: ['database', 'javascript']
    }

Use ``$and`` and ``$or`` with non-empty arrays to create logical expressions.
For example, this filter matches documents whose ``category`` is *database*,
or documents whose ``category`` is *javascript* and whose ``year`` value is
greater than or equal to *2025*:

.. code-block:: javascript

    filter: {
      $or: [
        {category: 'database'},
        {
          $and: [
            {category: 'javascript'},
            {year: {$gte: 2025}}
          ]
        }
      ]
    }

A logical filter node must contain exactly one logical operator. A field-level
operator object and each logical-array item must be non-empty.

.. _vecsdkcreatevectorindex:

Creating a Vector Index
-----------------------

Use ``OracleVecDB.createVectorIndex()`` to create a vector index on the vector
column configured for the OracleVecDB instance. Vector indexes improve
approximate nearest-neighbor searches over large vector tables. The Vector SDK
supports Hierarchical Navigable Small World (HNSW) and Inverted File Flat (IVF)
index types. For more information on these indexes, see the `Manage the
Different Categories of Vector Indexes <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-5D9B6B92-C62C-4927-9FB2-7A4437F24A19>`__ section in
the Oracle AI Vector Search User's Guide.

Oracle Database supports only the *HAMMING* and *JACCARD* distance metrics for
vector indexes on *BINARY* vector columns.

.. note::

    The database user must have the privileges required to create a vector
    index. Creating an HNSW index also requires sufficient vector pool memory,
    configured using ``VECTOR_MEMORY_SIZE``.

For an HNSW index, set the ``type`` parameter to *HNSW* in
``createVectorIndex()`` and specify HNSW parameters. For example:

.. code-block:: javascript

    await vectorStore.createVectorIndex({
      indexName: 'DOCUMENT_VECTOR_IDX',
      type: 'HNSW',
      accuracy: 90,
      parameters: {
        neighbors: 16,
        efConstruction: 200
      }
    });

The ``createVectorIndex()`` method takes a single ``options`` object that
specifies the index name, index type, target accuracy, index-specific
parameters, parallel creation degree, partitioning scheme, and any columns
to include.

You can specify the following properties in the ``options`` parameter:

.. list-table-with-summary:: createVectorIndex(): ``options`` Parameter Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :name: _createvectorindex_options
    :summary: The first column displays the parameter name. The second column displays the description of the parameter. The third column displays whether the parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - ``indexName``
      - The index name.
      - Required
    * - ``parameters``
      - An object containing HNSW or IVF specific parameters.

        For an HNSW index, the commonly used parameters are:

        - ``neighbors``: The maximum number of connections for each vector in the graph. Values range from 2 through 2048.
        - ``efConstruction``: The maximum number of candidate vectors considered while building the index. Values range from 1 through 65535.

        For an IVF index, use ``partitions`` to specify the number of centroid partitions into which the vector space is divided.
      - Required
    * - ``type``
      - The index type. The possible values are *HNSW* or *IVF*.

        The default value is *HNSW*.
      - Optional
    * - ``accuracy``
      - An integer from 1 through 100 specifying the target accuracy.
      - Optional
    * - ``parallel``
      - A positive integer specifying the degree of parallelism used during index creation.

        The default value is *1*.
      - Optional
    * - ``partitioningScheme``
      - The partitioning scheme. The possible values are *GLOBAL* or *LOCAL*.

        The default value is *GLOBAL*.
      - Optional
    * - ``includeColumns``
      - An optional array of additional table columns to include in the index.
      - Optional

For an IVF index, set ``type`` to *IVF* in ``createVectorIndex()`` and
specify the IVF parameters:

.. code-block:: javascript

    await vectorStore.createVectorIndex({
      indexName: 'DOCUMENT_VECTOR_IVF_IDX',
      type: 'IVF',
      parameters: {
        partitions: 16
      }
    });

Checking Index Build Status
+++++++++++++++++++++++++++

Use ``getIndexBuildStatus()`` to retrieve build status information for vector
indexes on a table. Pass a node-oracledb ``Connection`` and the table name to
check. For example:

.. code-block:: javascript

    const status = await getIndexBuildStatus(
      connection,
      'DOCUMENT_VECTORS'
    );

The function returns index build status information as a JavaScript object.

.. note::

    This function requires Oracle Database 26.2 or later.

.. _vecsdkmanagemodels:

Managing Embedding Models
-------------------------

An Open Neural Network Exchange (ONNX) model is a portable machine learning
model format. In Oracle AI Vector Search workflows, an ONNX embedding model
can be loaded into Oracle Database and used to generate vector embeddings from
text.

Before you can use an ONNX embedding model in ``modelParams``, the model must
be loaded into Oracle Database. You can use the model management functions to
load, describe, list, and drop models. These functions take a node-oracledb
``Connection`` as their first argument.

Before loading a model, a database administrator must create an Oracle
directory object for the database server directory that contains the ONNX
file. The administrator must also grant the application user the required
privileges to read from that directory and to create, describe, list, or drop
models.

This section describes how to manage ONNX embedding models loaded into Oracle
Database. You do not need to use these functions when ``modelParams``
specifies to use a remote embedding provider.

.. _loadModel:

Loading a Model
+++++++++++++++

Use ``loadModel()`` to load an embedding model into Oracle Database.
Currently, this function supports only model files in ONNX format. Pass a
node-oracledb ``Connection`` as the first argument and the ``options``
parameter as the second argument. For example:

.. code-block:: javascript

    await loadModel(connection, {
      dirName: 'MODEL_DIR',
      modelFile: 'document_embedding.onnx',
      modelName: 'EMBED_MODEL'
    });

You can specify the following properties in the ``options`` parameter:

.. list-table-with-summary:: loadModel(): ``options`` Parameter Properties
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 30 10
    :summary: The first column displays the property name. The second column displays the description of the property. The third column displays whether the property is required or optional.

    * - Property
      - Description
      - Required or Optional
    * - ``dirName``
      - Oracle directory object name for the database server directory that contains the model file.
      - Required
    * - ``modelFile``
      - Name of the model file to load.
      - Required
    * - ``modelName``
      - Name to assign to the loaded model in Oracle Database.
      - Required
    * - ``modelMetadata``
      - Plain object containing metadata associated with the model.
      - Optional

.. _describeandlistmodels:

Describing and Listing Models
+++++++++++++++++++++++++++++

Use ``describeModel()`` to return information about one loaded model.
Pass a node-oracledb ``Connection`` as the first argument and the model name
as the second argument. For example:

.. code-block:: javascript

    const description = await describeModel(connection, 'EMBED_MODEL');

The function returns the parsed model description as a JavaScript object. For
example:

.. code-block:: json

    {
      "model_name": "EMBED_MODEL",
      "algorithm": "ONNX",
      "mining_function": "EMBEDDING",
      "creation_date": "2026-09-07T00:44:53.000000+01:00",
      "attributes": [
        {
          "name": "DATA",
          "value": "TEXT",
          "data_type": "VARCHAR2",
          "data_length": 32767,
          "vector_info": null
        },
        {
          "name": "ORA$ONNXTARGET",
          "value": "VECTOR",
          "data_type": "VECTOR",
          "data_length": 1593,
          "vector_info": "VECTOR(384,FLOAT32)"
        }
      ]
    }

The returned attributes and their values depend on the loaded model.

Use ``listModels()`` to return information about models in the current schema.
Pass a node-oracledb ``Connection`` as the argument. For example:

.. code-block:: javascript

    const models = await listModels(connection);
    console.log(models);

For example, the output may contain:

.. code-block:: text

    {
      models: [
        {
          model_name: 'EMBED_MODEL',
          algorithm: 'ONNX',
          mining_function: 'EMBEDDING',
          creation_date: '2026-09-07T00:44:53.000000000+01:00',
          attributes: [Array]
        },
        {
          model_name: 'EMBED_MODEL_TEST',
          algorithm: 'ONNX',
          mining_function: 'EMBEDDING',
          creation_date: '2026-09-07T00:48:05.000000000+01:00',
          attributes: [Array]
        }
      ]
    }

Each item in ``models`` has the same structure as the object returned by
``describeModel()``.

.. note::

    ``describeModel()`` and ``listModels()`` require Oracle Database 26.2 or
    later.

.. _dropmodel:

Dropping a Model
++++++++++++++++

Use ``dropModel()`` to remove an embedding model from Oracle Database. Pass a
node-oracledb ``Connection`` as the first argument and the model name as the
second argument. For example:

.. code-block:: javascript

    await dropModel(connection, 'EMBED_MODEL', true);

The optional third argument controls whether the model is forcibly dropped. If
not specified, the value defaults to *false*. On success, ``dropModel()``
completes without returning a value.

.. _vecsdkdeletingdocuments:

Deleting Documents
------------------

Use ``delete()`` to delete documents from the vector table. To delete specific
documents, pass their external document IDs in the ``ids`` array. For example:

.. code-block:: javascript

    const result = await vectorStore.delete({
      ids: ['document-1', 'document-2'],
      autoCommit: true
    });

IDs must be non-empty strings no longer than 255 bytes. The method returns an
object whose ``message`` property reports the number of deleted records.

To delete every document from the vector table, set ``deleteAll`` to *true*:

.. code-block:: javascript

    const result = await vectorStore.delete({
      deleteAll: true
    });

The ``deleteAll`` property cannot be set to *true* when the ``ids`` property
contains a non-empty array. Setting ``deleteAll`` to *true* truncates the
vector table, commits implicitly, and cannot be rolled back. If neither a
non-empty ``ids`` array nor ``deleteAll: true`` is supplied, the method
performs no operation.

Dropping a Vector Table
-----------------------

Use ``dropTable()`` to drop the Oracle Database table configured in the
``OracleVecDB`` instance, if it exists:

.. code-block:: javascript

    await vectorStore.dropTable();

By default, the dropped table is moved to the recycle bin. Pass *true* to
purge the table instead:

.. code-block:: javascript

    await vectorStore.dropTable(true);

On success, ``dropTable()`` completes without returning a value. Dropping a
table is a DDL operation and commits implicitly.

.. _vectorsdktransactions:

Transaction Management
----------------------

When calling ``addVectors()`` or ``addDocuments()``, set the ``autoCommit``
property to *true*. Calls that omit ``autoCommit`` or set it to *false*
reject before executing SQL.

The ``insertWithEmbeddings()`` and ID-based
``delete()`` methods pass their optional ``autoCommit`` value through to
node-oracledb. When these methods use a directly supplied connection and
``autoCommit`` is omitted or set to *false*, the application must explicitly
call :meth:`connection.commit()` or :meth:`connection.rollback()`.

When a pool is used, the SDK acquires a connection from the pool for each
operation and calls ``connection.close()`` when the operation completes,
returning the connection to the pool. Set ``autoCommit`` to *true* for
pool-backed write operations; otherwise, the connection is returned to the
pool before the application can commit the transaction.

Setting ``deleteAll`` to *true* truncates the vector table, commits
implicitly, and cannot be rolled back. Table and vector index DDL operations
also commit implicitly.
