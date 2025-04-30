.. _migrate:

**********************************************
Upgrading to the Latest node-oracledb Releases
**********************************************

.. _upgradev67v68:

Upgrading from node-oracledb 6.7 to 6.8
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the new :ref:`intervalymclass` and :ref:`intervaldsclass`, you can
  fetch, insert, and update `INTERVAL YEAR TO MONTH <https://www.oracle.com/
  pls/topic/lookup?ctx=dblatest&id=GUID-7690645A-0EE3-46CA-90DE-
  C96DF5A01F8F>`__ and `INTERVAL DAY TO SECOND <https://www.oracle.com/pls/
  topic/lookup?ctx=dblatest&id=GUID-7690645A-0EE3-46CA-90DE-C96DF5A01F8F>`__
  database column types respectively. See :ref:`intervaltype`.

- Using the :ref:`oracledbsparsevector`, you can fetch, insert, and update
  Oracle Database 23.7 SPARSE vectors which store only the non-zero values
  physically. See :ref:`sparsevectors`.

- With Cloud Native Authentication, you can use:

  - Node-oracledb's :ref:`extensionOci <extensionociplugin>` plugin to
    automatically generate tokens using `OCI SDK <https://www.npmjs.com/
    package/oci-sdk>`__ when authenticating with Oracle Cloud Infrastructure
    (OCI) Identity and Access Management (IAM) token-based authentication. See
    :ref:`cloudnativeauthoauth`.

  - Node-oracledb's :ref:`extensionAzure <extensionazureplugin>` plugin to
    automatically generate tokens using `Microsoft Authentication Library for
    Node (msal-node) <https://www.npmjs.com/package/@azure/msal-node>`__ when
    authenticating with OAuth 2.0 token-based authentication. See
    :ref:`cloudnativeauthoauth`.

- The new :meth:`oracledb.registerProcessConfigurationHook()` method registers
  extension modules (:ref:`plugins <extendingnodeoracledb>`).

- The new :attr:`connection.maxIdentifierLength` property returns the maximum
  identifier length allowed by the database.

- The new :meth:`dbObject.copy` method creates deep copies of database
  objects.

- With the new :attr:`oracledb.dbObjectTypeHandler` property, you can now
  specify a user function when using :ref:`DbObjects <dbobjectclass>` to
  modify its properties before it is returned to the application.

- You can now pass BigInt values in :ref:`DbObjects <dbobjectclass>`.

- In node-oracledb Thin mode, you can now perform :ref:`external
  authentication using Transport Layer Security (TLS) <tlsextauth>` protocol.

- In node-oracledb Thin mode, you can now enable :ref:`Advanced Network
  Compression <networkcompression>` support using the new properties
  ``networkCompression`` and ``networkCompressionThreshold`` in
  :meth:`oracledb.createPool()` and :meth:`oracledb.getConnection()`.

- You can now enable a connection optimization feature which uses Server Name
  Indication (SNI) extension of the TLS protocol in node-oracledb Thin mode
  by using the property ``useSNI`` in
  :ref:`oracledb.createPool() <createpoolpoolattrsusesni>` or
  :ref:`oracledb.getConnection() <getconnectiondbattrsusesni>`.

- In node-oracledb Thin mode, you can now set the property
  :attr:`~oracledb.edition` when connecting to Oracle Database.

.. _upgradev66v67:

Upgrading from node-oracledb 6.6 to 6.7
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Using the new :meth:`oracledb.getNetworkServiceNames()` method, you can
  fetch the list of TNS Aliases from the ``tnsnames.ora`` file.

- With :ref:`Centralized Configuration Providers <configurationprovider>`, you
  can now:

  - Connect to Oracle Database using wallets stored in Azure Key Vault and OCI
    vault.

  - :ref:`Cache the configuration information <conncaching>` retrieved from
    Azure App Configuration and OCI Object Storage centralized configuration
    providers.

- In node-oracledb Thin mode, you can use the attributes
  :attr:`oracledb.driverName`, :attr:`oracledb.machine`,
  :attr:`oracledb.osUser`, :attr:`oracledb.program`, and
  :attr:`oracledb.terminal` to set information about the driver name, machine
  name, operating system user, program name, and terminal name respectively.

- In node-oracledb Thick mode, the new ``regId`` property of the
  :ref:`message object parameter <messageparam>` in the CQN subscription
  :ref:`callback <consubscribeoptcallback>` function returns a unique
  identifier during registration.

.. _upgradev65v66:

Upgrading from node-oracledb 6.5 to 6.6
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the new :ref:`BINARY <binaryvectors>` vector format, the value
  of each vector dimension can be represented as a single bit (0 or 1).

- You can retrieve configuration information from two
  :ref:`Centralized Configuration Providers <configurationprovider>`,
  :ref:`Microsoft Azure App Configuration <azureappconfig>` and
  :ref:`Oracle Cloud Infrastructure (OCI) Object Storage <ociobjstorage>`
  and connect to Oracle Database.

- You can use the new :ref:`oracledb.DB_TYPE_BFILE <oracledbconstantsdbtype>`
  constant to represent Oracle Database 23ai data type
  :ref:`BFILE <insertbfile>`.

- In node-oracledb Thin mode, you can directly specify the security
  credentials in the ``walletContent`` property of
  :ref:`oracledb.createPool() <createpoolpoolattrswalletcontent>` and
  :ref:`oracledb.getConnection() <getconnectiondbattrswalletcontent>`.

- You can now process :ref:`tnsnames.ora <tnsadmin>` files containing ``IFILE``
  directives.

- You can now use :ref:`Two-Phase Commits <twopc>` in node-oracledb Thin mode.

.. _upgradev64v65:

Upgrading from node-oracledb 6.4 to 6.5
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- The new :ref:`oracledb.JsonId <jsonid>` class represents JSON ID values
  returned by SODA in Oracle Database 23ai and later in the ``_id`` attribute
  of documents stored in native collections.

- You can now pass BigInt values as binds to :meth:`connection.execute()` and
  :meth:`connection.executeMany()`.

- With the new :ref:`oracledb.DB_TYPE_VECTOR <oracledbconstantsdbtype>`
  constant, you can now represent Oracle Database 23ai data type
  :ref:`VECTOR <vectors>` with the ``vectorDimensions`` and ``vectorFormat``
  :ref:`metadata <execmetadata>` information attributes.

- In node-oracledb Thin mode, a subset of pool creation properties can be
  changed without restarting the pool or application using the
  :meth:`pool.reconfigure()` method.

- In node-oracledb Thin mode, you can now use Oracle Database 23ai's
  :ref:`Implicit Connection Pooling <implicitpool>` feature with Database
  Resident Connection Pooling (DRCP) and Proxy Resident Connection Pooling
  (PRCP).

.. _upgradev63v64:

Upgrading from node-oracledb 6.3 to 6.4
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- By setting the new :attr:`oracledb.future.oldJsonColumnAsObj` property to
  *true*, you can fetch the BLOB columns which have the the
  ``IS JSON FORMAT OSON`` constraint enabled in the same way as
  :ref:`columns of type JSON <json21fetch>`. See
  :ref:`osontype` for more information. In a future version of
  node-oracledb, the setting of this attribute will no longer be required
  since this will become the default behavior.

- With the new :meth:`connection.encodeOSON()` and
  :meth:`connection.decodeOSON()` methods, you can fetch and insert into
  columns which have the ``IS JSON FORMAT OSON`` constraint enabled.

- The new metadata information attribute ``isOson`` indicates whether the
  fetched column contains binary encoded OSON data.

- The :meth:`lob.getData()` now accepts the ``offset`` and ``amount`` as input
  parameters.

- The :meth:`connection.execute()` now accepts an object as an input
  parameter. The object is returned from the third-party
  `sql-template-tag <https://www.npmjs.com/package/sql-template-
  tag#oracledb>`__ module and exposes ``statement`` and ``values`` properties
  to retrieve SQL string and bind values.

- The new :meth:`dbObject.toMap()` method returns a map object for the
  collection types indexed by PLS_INTEGER.

- Using the new :attr:`oracledb.poolPingTimeout` and
  :attr:`pool.poolPingTimeout` properties, you can now limit the
  :meth:`connection.ping()` call time.

- Using the new :ref:`warning <execmanywarning>` property of the
  :ref:`result object <resultobject>` in :meth:`connection.executeMany()`,
  your application can manually check for database warnings such as
  :ref:`plsqlcompwarnings`.

- In node-oracledb Thick mode, the
  :ref:`SodaDocumentCursor class <sodadocumentcursorclass>` now supports
  asynchronous iteration.

.. _upgradev62v63:

Upgrading from node-oracledb 6.2 to 6.3
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Using the new :ref:`warning <execwarning>` property of the
  :ref:`result object <resultobject>` in :meth:`connection.execute()`, your
  application can manually check for database warnings such as
  :ref:`plsqlcompwarnings`.

- The new :attr:`connection.warning` property can be used to check for
  warnings that are generated during connection such as the password being in
  the grace period.

- By setting the new :attr:`oracledb.future.oldJsonColumnAsObj` property to
  *true*, you can fetch the VARCHAR2 and LOB columns which contain JSON in the
  same way as :ref:`columns of type JSON <json21fetch>`. See
  :ref:`json12ctype` for more information. In a future version of
  node-oracledb, the setting of this attribute will no longer be required
  since this will become the default behavior.

- With the new :ref:`oracledb.DB_TYPE_XMLTYPE <oracledbconstantsdbtype>`
  constant, you can now represent data of type ``SYS.XMLTYPE`` in the
  ``fetchType`` and ``dbType`` :ref:`metadata <execmetadata>` information
  attributes.

- node-oracledb now supports using Azure and Oracle Cloud Infrastructure (OCI)
  Software Development Kits (SDKs) to generate
  :ref:`authentication tokens <tokenbasedauthentication>`.

- With the new connection properties :attr:`connection.dbDomain`,
  :attr:`connection.dbName`, :attr:`connection.maxOpenCursors`,
  :attr:`connection.serviceName` and :attr:`connection.transactionInProgress`,
  you can identify the database domain name, database instance name, maximum
  number of cursors that can be opened per connection, database service name,
  and status of any ongoing transactions on the connection respectively.

- The new :ref:`metadata <execmetadata>` information attribute ``isJson``
  indicates whether the fetched column contains JSON data.

- The new :ref:`metadata <execmetadata>` information attributes
  ``annotations``, ``domainName``, and ``domainSchema`` identifies the
  `annotations <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
  GUID-1AC16117-BBB6-4435-8794-2B99F8F68052>`__ object, the name of the
  `data use case domain <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
  id=GUID-17D3A9C6-D993-4E94-BF6B-CACA56581F41>`_, and the schema name of the
  `data use case domain <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
  id=GUID-17D3A9C6-D993-4E94-BF6B-CACA56581F41>`__ associated with the fetched
  column. Annotations and data use case domains are supported from Oracle
  Database 23ai onwards. For node-oracledb Thick mode, Oracle Client 23ai is
  also required.

- In node-oracledb Thin mode, ``SYS.XMLTYPE`` data can now be
  :ref:`fetched as strings <xmltype>`.

.. _upgradev61v62:

Upgrading from node-oracledb 6.1 to 6.2
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the new :ref:`SODA <sodaoverview>` features in node-oracledb Thick
  mode:

  - You can now fetch all the current indexes from a SODA collection using the
    new :meth:`sodaCollection.listIndexes()` method.

  - You can disable modification of SODA documents by other connections using
    the new :meth:`sodaOperation.lock()` method.

- Using the new :ref:`binaryDir <odbinitoracleclientattrsopts>` property in
  node-oracledb Thick mode, you can now specify the directory that is added to
  the start of the default search path used by
  :meth:`~oracledb.initOracleClient()` to load the
  :ref:`Thick mode <enablingthick>` binary module.

- Using the new :attr:`~dbObject.packageName` property in
  :ref:`DbObject class <dbobjectclass>`, you can identify the name of the
  package if the type refers to a PL/SQL type.

.. _upgradev60v61:

Upgrading from node-oracledb 6.0 to 6.1
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the new :ref:`Advanced Queuing (AQ) <aq>` features in node-oracledb
  Thick mode:

  - You can now enqueue and dequeue AQ messages as :ref:`JSON <aqjsonexample>`.

  - The :meth:`queue.enqOne() <aqQueue.enqOne()>` and
    :meth:`queue.enqMany() <aqQueue.enqMany()>` methods now return a
    :ref:`message object <aqmessageclass>` with which you can view the unique
    identifier of each message.

- With the new :attr:`connection.instanceName` property, you can identify the
  Oracle Database instance name associated with a connection.

.. _upgradev55v60:

Upgrading from node-oracledb 5.5 to 6.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- To use node-oracledb 6.0, you need Node.js 14.6 or later versions. Update
  your Node.js version, if necessary.

- With node-oracledb 6.0, connections to Oracle Database can be established
  in one of the two modes:

   - **Thin mode**: By default, node-oracledb operates in this mode and
     connects directly to Oracle Database. This mode does not require Oracle
     Client libraries.
   - **Thick mode**: When Oracle Client libraries are used, then node-oracledb
     is in Thick mode. You must call :meth:`oracledb.initOracleClient`
     to enable Thick mode. See :ref:`enablingthick`.

- Review the updated :ref:`node-oracledb installation instructions
  <installation>` and :ref:`initialization options <initnodeoracledb>`.

- The Oracle Database features supported by the node-oracledb Thin and Thick
  modes and the notable differences between these two modes are detailed
  :ref:`here <appendixa>`.

- If your application currently uses Thick mode, and you want to use the Thin
  mode, see :ref:`changingthick`.

- Note that the Oracle Database Type constants were changed to database type
  objects in node-oracledb 6.0. When comparing fetch types, ensure that you
  are using the database type object name instead of the the database type
  number. For example, use
  ``result.metadata[0].fetchType == oracledb.DB_TYPE_VARCHAR`` instead of
  ``result.metadata[0].fetchType == 2001``.

- Oracle Database DATE and TIMESTAMP types are now returned as JavaScript date
  types in the application's timezone. These database types are no longer
  fetched or bound as TIMESTAMP WITH LOCAL TIME ZONE. The connection session
  time zone does not impact these database types. There is no change to the
  handling of TIMESTAMP WITH TIMEZONE and TIMESTAMP WITH LOCAL TIMEZONE types.

- The execution option attribute ``fetchInfo`` was deprecated. You can use the
  :ref:`fetchtypehandler` functionality instead which has introduced a new
  :attr:`oracledb.fetchTypeHandler` and equivalent execution option which allows
  you to alter the queried data before it is returned to the application.

- The previously deprecated Token-Based Authentication ``accessTokenCallback``
  attribute has been removed. Use
  :ref:`accessToken <createpoolpoolattrsaccesstoken>` instead.

- Extended metadata is now always returned for queries. The
  ``oracledb.extendedMetaData`` and equivalent
  :ref:`execution attribute <propexecextendedmetadata>` values are
  ignored.

- The node-oracledb Thin and Thick modes may return different errors in some
  scenarios. See :ref:`exceptions`.

- The node-oracledb Thick mode uses Oracle Database's National Language Support
  (NLS) functionality to assist in globalizing applications. The node-oracledb
  Thin mode uses Node.js localization functions. See :ref:`nls`.

.. _changingthick:

Changing Applications to Use node-oracledb Thin Mode
----------------------------------------------------

Changing an existing application that currently uses :ref:`Thick mode
<thickarch>` to use Thin mode may require a few changes as detailed below.

1. Review :ref:`featuresummary` and :ref:`modediff` to ensure that all the
   features required for your application are supported by the Thin mode.

   The node-oracledb Thin and Thick modes can both connect to on-premises
   databases and Oracle Cloud databases. However, the node-oracledb Thin mode
   does not support some of the advanced Oracle Database features such as
   Application Continuity (AC), Advanced Queuing (AQ), Continuous Query
   Notification (CQN), SODA, and Sharding.

2. If you are upgrading from node-oracledb 5.5, then review
   :ref:`upgradev55v60`.

3. Remove all calls to :meth:`oracledb.initOracleClient()` from the
   application since this enables the node-oracledb Thick mode.

4. If the ``configDir`` parameter of :meth:`~oracledb.initOracleClient` had
   been used, then set the ``configDir`` attribute of any
   :meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()` calls.

5. If the application is connecting using a :ref:`TNS alias <tnsnames>` and is
   looking up that alias in a ``tnsnames.ora`` file from a "default" location
   such as the    Instant Client ``network/admin/`` subdirectory, in
   ``$ORACLE_HOME/network/admin/``, or in
   ``$ORACLE_BASE/homes/XYZ/network/admin/`` (in a read-only Oracle Database
   home), then the configuration file directory must now explicitly be set.
   See :ref:`usingconfigfiles`.

6. The node-oracledb Thin mode does not support ``sqlnet.ora`` files. Some of
   these parameters can be set as :meth:`~oracledb.getConnection()` or
   :meth:`~oracledb.createPool()` attributes, or in an Easy Connect string, or
   in the ``tnsnames.ora`` file connect descriptors.

7. If you were using node-oracledb in an ORACLE_HOME database installation
   environment, you will now need to use an explicit connection string since
   the ``ORACLE_SID`` environment variable is not used in node-oracledb Thin
   mode.

8. Remove calls to :attr:`oracledb.oracleclientVersion()` and
   :attr:`oracledb.oracleclientVersionString` which are only available in
   the node-oracledb Thick mode. Oracle Client libraries are not used
   in Thin mode.

9. Ensure that any assumptions about when connections are created in the
   connection pool are eliminated. The node-oracledb Thin mode creates
   connections in an async fashion and so :meth:`oracledb.createPool()` will
   return before any, or all, minimum number of connections are created. The
   attribute :attr:`pool.connectionsOpen` will change over time and will not
   be equal to :attr:`pool.poolMin` immediately after the pool is created. In
   node-oracledb Thick mode and earlier node-oracledb versions,
   ``oracledb.createPool()`` does not return control to the application until
   all the ``pool.poolMin`` connections were created.

10. Make any additional code changes required for :ref:`exceptions` differences,
    or :ref:`nls` differences.

11. When you are satisfied, you can optionally remove Oracle Client
    libraries. For example, by deleting your Oracle Instant Client directory.

You can find the node-oracledb mode by checking node-oracledb attributes or
querying the ``V$SESSION_CONNECT_INFO`` table, see :ref:`vsessconinfo`.

.. _upgradev54v55:

Upgrading from node-oracledb 5.4 to 5.5
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the new Oracle Advanced Queuing (AQ) :ref:`Recipient Lists
  <aqrecipientlists>`, you can now specify a list of recipients when enqueuing
  a message.

- Take advantage of the new :ref:`Open Authorization (OAuth 2.0)
  <oauthtokenbasedauthentication>` token-based authentication which allows
  users to authenticate to Oracle Database using Microsoft Azure Active
  Directory OAuth 2.0 tokens.

- The connection pool creation attribute ``accessTokenCallback`` is
  deprecated. Use :ref:`accessToken <createpoolpoolattrsaccesstoken>` instead.

- The ``pool.setAccessToken()`` method is deprecated.

.. _upgradev53v54:

Upgrading from node-oracledb 5.3 to 5.4
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- With the :meth:`connection.isHealthy()` function, you can perform a local
  connection health check.

- Take advantage of :ref:`token-based authentication
  <iamtokenbasedauthentication>` when establishing pool based connections and
  standalone connections.

- The new :attr:`~error.stack` property in Error object aids in diagnosis of
  errors.

.. _upgradev52v53:

Upgrading from node-oracledb 5.2 to 5.3
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Using the ``keepInStmtCache`` option in :ref:`execute()
  <propexeckeepinstmtcache>`, :ref:`executeMany()
  <executemanyoptkeepinstmtcache>`, and :ref:`queryStream()
  <propexeckeepinstmtcache>`, you can control whether executed statements
  should be retained in the Statement Cache.

- The connection pool statistics is encapsulated in a
  :ref:`PoolStatistics Class <poolstatisticsclass>`. The
  :meth:`poolstatistics.logStatistics()` function is added which is
  equivalent to the existing :meth:`pool.logStatistics()` function. The
  exposed pool properties are ``user``, ``connectString``, ``edition``,
  ``events``, ``externalAuth``, and ``homogeneous`` on the Pool and
  PoolStatistics classes.

- Take advantage of the :ref:`Two-Phase Commit <twopc>` feature.

.. _migratev51v52:

Upgrading from node-oracledb 5.1 to 5.2
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the dead connection detection changes and adjust any
  application error checks to look for the new error *DPI-1080*.

- Replace obsolete uses of ``_enableStats`` and ``_logStats()`` with
  the new functionality
  :ref:`enableStatistics <createpoolpoolattrsstats>`,
  :meth:`~pool.getStatistics()`, and :meth:`~pool.logStatistics()`.

.. _migratev42v50:

Upgrading from node-oracledb 4.2 to 5.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the updated installation and initialization options in the
  :ref:`node-oracledb installation
  instructions <installation>` and :ref:`Initializing Node-oracledb
  <initnodeoracledb>`, particularly
  around how node-oracledb can locate Oracle Client libraries.

- Choose a sensible value for the new *Pool*
  :attr:`~oracledb.queueMax` attribute, so that applications
  get the new error only under abnormal connection load. To allow all
  pooled connection requests to be queued (the previous behavior), set
  it to -1.

- Take advantage of the new
  :ref:`prefetchRows <propexecprefetchrows>` attribute to re-tune SQL
  queries.

- Support for custom Promises was necessarily removed due to a
  refactoring of the module’s JavaScript layer. Code should be migrated
  to use the native Node.js Promise implementation.

- The function call parameter errors *NJS-005: invalid value for
  parameter* and *NJS-009: invalid number of parameters* are now passed
  through the callback, if one is used. In earlier versions they were
  thrown without the ability for them to be caught.

.. _migratev41v42:

Upgrading from node-oracledb 4.1 to 4.2
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the updated Lob stream documentation. The best practice is to
  use the ``end`` event (for readable streams) and ``finish`` event
  (for writeable streams) instead of depending on the ``close`` event.
  Applications should migrate to the Node.js 8
  :meth:`~lob.destroy()` method instead of the deprecated
  node-oracledb :meth:`~lob.close()` method. Note that unlike
  ``close()``, the ``destroy()`` method does not take a callback
  parameter. If ``destroy()`` is given an error argument, an ``error``
  event is emitted with this error.

.. _migratev40v41:

Upgrading from node-oracledb 4.0 to 4.1
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review your application use of node-oracledb error messages since
  some have changed.

- Note that the default for :attr:`oracledb.events` has
  reverted to *false*. If you relied on it being *true*, then
  explicitly set it.

.. _migratev31v40:

Upgrading from node-oracledb 3.1 to 4.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Update Node.js, if necessary. Node-oracledb 4.0 requires

   - Node.js 8.16 or higher
   - Node.js 10.16, or higher
   - Node.js 12

- Review error handling. Some errors have changed. All exceptions are
  now passed through the error callback.

- Code that relied on numeric values for the :ref:`node-oracledb Type
  Constants <oracledbconstantsnodbtype>` and :ref:`Oracle Database Type
  Constants <oracledbconstantsdbtype>` will need updating. Use the
  constant names instead of their values.

- To view node-oracledb class information, update code to use
  ``Object.getPrototypeOf()``.

- Optionally migrate :attr:`~oracledb.outFormat` constants to the new,
  preferred names
  :ref:`OUT_FORMAT_ARRAY <oracledbconstantsoutformat>` and
  :ref:`OUT_FORMAT_OBJECT <oracledbconstantsoutformat>`.

Earlier node-oracledb Versions
==============================

Documentation about node-oracledb version 1 is
`here <https://github.com/oracle/node-oracledb/blob/node-oracledb-v1/doc/api.md>`__.

Documentation about node-oracledb version 2 is
`here <https://github.com/oracle/node-oracledb/blob/v2.3.0/doc/api.md>`__.

Documentation about node-oracledb version 3 is
`here <https://github.com/oracle/node-oracledb/blob/v3.1.2/doc/api.md>`__.

Documentation about node-oracledb version 4 is
`here <https://github.com/oracle/node-oracledb/blob/v4.2.0/doc/api.md>`__.
