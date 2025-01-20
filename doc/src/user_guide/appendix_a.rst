.. _appendixa:

**************************************************
Appendix A: The node-oracledb Thin and Thick Modes
**************************************************

By default, node-oracledb runs in a 'Thin' mode which connects directly to
Oracle Database. This mode does not need Oracle Client libraries. However, when
the driver does use these libraries to communicate to Oracle Database, then
node-oracledb is said to be in 'Thick' mode and has :ref:`additional
functionality <featuresummary>` available. See :ref:`thickarch` for the
architecture diagram.

This section lists the :ref:`Oracle Database features <featuresummary>`
that are supported by node-oracledb Thin and Thick modes and the notable
:ref:`differences <modediff>` between the two modes.

.. _featuresummary:

Oracle Database Features Supported by node-oracledb
===================================================

The following table summarizes the Oracle Database features supported by
node-oracledb Thin and Thick modes. For more details see :ref:`modediff`.

.. list-table-with-summary:: Features Supported in node-oracledb Thin and Thick Modes
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the Oracle feature. The second column indicates whether the feature is supported in the node-oracledb Thin mode. The third column indicates whether the feature is supported in the node-oracledb Thick mode.

    * - Oracle Feature
      - node-oracledb Thin Mode
      - node-oracledb Thick Mode
    * - Oracle Client version
      - Not applicable
      - Release 11.2 and later
    * - Oracle Database version
      - Release 12.1 and later
      - Release 9.2 and later depending on the Oracle Client library version
    * - Oracle Client/Database version interoperability
      - Not applicable - Connects directly to database version 12.1 and later
      - Yes
    * - Natively written in JavaScript
      - Yes
      - No - Uses a C library called Oracle Database Programming Interface for C (ODPI-C) which internally calls Oracle Call Interface (OCI), the native C interface for Oracle Database
    * - Thin mode
      - Yes - Direct Oracle Network calls
      - No - Uses Oracle Client libraries
    * - Standalone connections (see :ref:`standaloneconnection`)
      - Yes
      - Yes
    * - Connection pooling - Heterogeneous and Homogeneous (see :ref:`Connection pooling <connpooling>`)
      - Homogeneous only
      - Yes
    * - Connection pool draining (see :ref:`Connection draining <conpooldraining>`)
      - Yes
      - Yes
    * - Connection pool session state callback (:ref:`sessionfixupnode`)
      - Yes - JavaScript functions but not PL/SQL functions
      - Yes
    * - Connection pool session tagging (see :ref:`connpooltagging`)
      - No
      - Yes
    * - Proxy connections (see :ref:`proxyauth`)
      - Yes
      - Yes
    * - Set the current schema using an attribute
      - Yes
      - Yes
    * - External authentication (see :ref:`extauth`)
      - No
      - Yes
    * - Connection mode privileges (see :ref:`oracledbconstantsprivilege`)
      - Yes
      - Yes
    * - Preliminary connections
      - No
      - Yes
    * - Real Application Clusters (RAC) (see :ref:`connectionrac`)
      - Yes
      - Yes
    * - Oracle Globally Distributed Database - previously known as Oracle Sharded Databases (see :ref:`sharding`)
      - No
      - Yes - No TIMESTAMP support
    * - Connection Pool Connection Load Balancing (CLB)
      - Yes
      - Yes
    * - Connection Pool Runtime Load Balancing (RLB) (see :ref:`connectionrlb`)
      - No
      - Yes
    * - Oracle Cloud Infrastructure (OCI) Identity and Access Management (IAM) Tokens (see :ref:`iamtokenbasedauthentication`)
      - Yes
      - Yes - In connection string with appropriate Oracle Client
    * - Open Authorization (OAuth 2.0) (see :ref:`oauthtokenbasedauthentication`)
      - Yes
      - Yes
    * - Kerberos, Radius, and Public Key Infrastructure (PKI) authentication services
      - No
      - Yes
    * - Oracle Database Native Network Encryption and Checksumming (see :ref:`nne`)
      - No
      - Yes
    * - Connection pinging API (see :meth:`connection.ping()`)
      - Yes
      - Yes
    * - Oracle Net Services ``tnsnames.ora`` file (see :ref:`tnsadmin`)
      - Yes
      - Yes
    * - Oracle Net Services ``sqlnet.ora`` file (see :ref:`tnsadmin`)
      - No - A few values can be set in Easy Connect string
      - Yes
    * - Oracle Client library configuration file ``oraaccess.xml`` (see :ref:`oraaccess`)
      - No
      - Yes
    * - Easy Connect connection strings (see :ref:`easyconnect`)
      - Yes - Unknown settings are ignored and not passed to Oracle Database
      - Yes
    * - Oracle Cloud Database connectivity (see :ref:`connectionadb`)
      - Yes
      - Yes
    * - One-way TLS connections (see :ref:`connectionadbtls`)
      - Yes
      - Yes
    * - Mutual TLS (mTLS) connections (see :ref:`connectionadbmtls`)
      - Yes - Needs a PEM format wallet
      - Yes
    * - Oracle Database Dedicated Servers, Shared Servers, and Database Resident Connection Pooling (DRCP) (see :ref:`drcp`)
      - Yes
      - Yes
    * - Oracle Database 23ai Implicit connection pooling for DRCP and PRCP (see :ref:`implicitpool`)
      - Yes
      - Yes
    * - Multitenant Databases
      - Yes
      - Yes
    * - CMAN and CMAN-TDM connectivity
      - Yes
      - Yes
    * - Bequeath connections
      - No
      - Yes
    * - Lightweight Directory Access Protocol (LDAP) connections
      - No
      - Yes
    * - Socket Secure (SOCKS) Proxy connections
      - No
      - No
    * - Password changing (see :meth:`connection.changePassword()`)
      - Yes
      - Yes
    * - Statement break/reset (see :meth:`connection.break()`)
      - Yes - Out-of-Band (OOB) Connection Breaks not supported
      - Yes
    * - Edition Based Redefinition (EBR) (see :ref:`ebr`)
      - Yes
      - Yes
    * - SQL execution (see :ref:`sqlexecution`)
      - Yes
      - Yes
    * - PL/SQL execution (see :ref:`plsqlexecution`)
      - Yes - For scalar types and collection types using array interface
      - Yes
    * - Bind variables for data binding (see :ref:`bind`)
      - Yes
      - Yes
    * - Array DML binding for bulk DML and PL/SQL (also called executeMany()) (see :ref:`batchexecution`)
      - Yes
      - Yes
    * - SQL and PL/SQL type and collections (see :ref:`fetchobjects`)
      - Yes
      - Yes
    * - Query column metadata (see :ref:`querymeta`)
      - Yes
      - Yes
    * - Client character set support (see :ref:`charset`)
      - UTF-8
      - UTF-8
    * - Oracle Globalization support (see :ref:`nls`)
      - No - All Oracle NLS environment variables are ignored
      - Yes - Oracle NLS environment variables are respected except the character set in ``NLS_LANG``
    * - Statement caching (see :ref:`stmtcache`)
      - Yes
      - Yes
    * - Row prefetching on first query execute (see :attr:`oracledb.prefetchRows`)
      - Yes
      - Yes
    * - Array fetching for queries (see :attr:`oracledb.fetchArraySize`)
      - Yes
      - Yes
    * - Client Result Caching (CRC) (see :ref:`clientresultcache`)
      - No
      - Yes
    * - In-band notifications
      - Yes
      - Yes
    * - Continuous Query Notification (CQN) (see :ref:`cqn`)
      - No
      - Yes
    * - Oracle Transactional Event Queue (TxEventQ) and classic Advanced Queuing (AQ) (see :ref:`aq`)
      - No
      - Yes
    * - Call timeouts (see :attr:`connection.callTimeout`)
      - Yes
      - Yes
    * - Oracle Database startup and shutdown (see :ref:`startupshutdown`)
      - No
      - Yes
    * - Transaction management (see :ref:`transactionmgt`)
      - Yes - Property :attr:`~oracledb.autoCommit` is false
      - Yes
    * - Automatic Diagnostic Repository (ADR)
      - No
      - Yes
    * - Events mode for notifications
      - No
      - Yes
    * - Fast Application Notification (FAN) (see :ref:`connectionfan`)
      - No
      - Yes
    * - Transparent Application Failover (TAF)
      - No
      - Yes - No callback
    * - Transaction Guard (TG)
      - No
      - Yes
    * - Data Guard (DG) and Active Data Guard (ADG)
      - Yes
      - Yes
    * - Application Continuity (AC) and Transparent Application Continuity (TAC) (see :ref:`appcontinuity`)
      - No
      - Yes
    * - End-to-end monitoring and tracing attributes (see :ref:`tracingsql`)
      - Yes
      - Yes
    * - Java Debug Wire Protocol for debugging PL/SQL (see :ref:`jdwp`)
      - Yes - Using the connection parameter ``debugJdwp`` or the ``ORA_DEBUG_JDWP`` environment variable
      - Yes - Using the the ``ORA_DEBUG_JDWP`` environment variable
    * - Feature tracking
      - No
      - Yes
    * - Two-phase Commit (TPC) (see :ref:`twopc`)
      - Yes
      - Yes
    * - REF CURSORs (see :ref:`refcursors`)
      - Yes
      - Yes
    * - Nested Cursors (see :ref:`nestedcursors`)
      - Yes
      - Yes
    * - Pipelined table functions (see :ref:`pipelined table functions <pipelinedfunction>`)
      - Yes
      - Yes
    * - Implicit Result Sets (see :ref:`implicitresults`)
      - Yes
      - Yes
    * - Application Contexts
      - No
      - No
    * - Persistent and Temporary LOBs
      - Yes
      - Yes
    * - LOB prefetching
      - No
      - No - Does have LOB length prefetch
    * - LOB locator operations such as trim (see :ref:`lobclass`)
      - Yes - Only read and write operations supported
      - Yes - Only read operations supported
    * - INTERVAL DAY TO SECOND data type (see :ref:`oracledbconstantsdbtype`)
      - No
      - No
    * - INTERVAL YEAR TO MONTH data type (see :ref:`oracledbconstantsdbtype`)
      - No
      - No
    * - Simple Oracle Document Access (SODA) (see :ref:`SODA <sodaoverview>`)
      - No
      - Yes
    * - Oracle Database 12c JSON (as BLOB) (see :ref:`json12ctype`)
      - Yes
      - Yes
    * - Oracle Database 21c JSON data type (see :ref:`json21ctype`)
      - Yes
      - Yes
    * - Oracle Database 23ai JSON-Relational Duality Views (see :ref:`jsondualityviews`)
      - Yes
      - Yes
    * - Oracle Database 23ai BOOLEAN data type (see :ref:`oracledbconstantsdbtype`)
      - Yes
      - Yes
    * - ROWID, UROWID data types (see :ref:`oracledbconstantsdbtype`)
      - Yes
      - Yes
    * - XMLType data type (see :ref:`xmltype`)
      - Yes
      - Yes - May need to fetch as CLOB
    * - BFILE data type
      - Yes
      - Yes
    * - TIMESTAMP WITH TIME ZONE data type (see :ref:`oracledbconstantsdbtype`)
      - Yes
      - Yes
    * - NCHAR, NVARCHAR2, NCLOB data types (see :ref:`oracledbconstantsdbtype`)
      - Yes
      - Yes
    * - Oracle Database 23c VECTOR data type (see :ref:`oracledbconstantsdbtype`)
      - Yes
      - Yes
    * - Bind PL/SQL Boolean
      - Yes
      - Yes
    * - Parallel Queries
      - No
      - Yes
    * - Async/Await, Promises, Callbacks and Streams
      - Yes
      - Yes
    * - OS Authentication
      - No
      - Yes
    * - Batch Errors
      - Yes
      - Yes
    * - Database objects (see :ref:`objects`)
      - Yes
      - Yes
    * - Restricted Rowid
      - No
      - Yes

.. _modediff:

Differences between the node-oracledb Thin and Thick Modes
==========================================================

This section details the differences between the node-oracledb Thin and Thick
modes. Also, see the summary feature comparison table in :ref:`featuresummary`.

Connection Handling Differences between Thin and Thick Modes
------------------------------------------------------------

Node-oracledb can create connections in either the Thin mode or the Thick
mode. However, only one of these modes can be used in each Node.js process.

Oracle Client Library Loading
+++++++++++++++++++++++++++++

- By default, node-oracledb runs in a 'Thin' mode which connects directly to
  Oracle Database. This mode does not need Oracle Client libraries. See
  :ref:`thinarch`.

- If :func:`oracledb.initOracleClient()` is called in your application before
  any standalone connections or pool is created, then the node-oracledb mode
  changes to :ref:`Thick mode <enablingthick>`. Calling the
  ``initOracleClient()`` method immediately loads Oracle Client libraries.
  Some :ref:`additional functionality <featuresummary>` is available when
  node-oracledb uses the Oracle Client libraries. See :ref:`thickarch`.

Unclosed Standalone Connections
+++++++++++++++++++++++++++++++

In node-oracedb Thin mode, an unclosed standalone connection takes several
seconds to terminate after the query results are printed. This does not
occur if :meth:`connection.close()` is explicitly called. The node-oracledb
Thick mode does not use event handlers to manage its connections and does not
run into this issue. However, the Thick mode does not close connections until
garbage collection occurs or it may not close the connection if the process
terminates before garbage collection occurs. It is recommended to explicitly
close standalone connections using :meth:`connection.close()` in both the Thin
and Thick modes.

Connections to a Local Database
+++++++++++++++++++++++++++++++

In node-oracledb Thin mode, there is no concept of a local database. Bequeath
connections cannot be made since Oracle Client libraries are not used. The
Thin mode does not de-reference environment variables such as ``ORACLE_SID``,
``TWO_TASK``, or ``LOCAL`` (the latter is specific to Windows). A connection
string, or equivalent, must always be used.

.. _sqlnetclientconfig:

Oracle Net Services and Client Configuration Files
++++++++++++++++++++++++++++++++++++++++++++++++++

In the node-oracledb Thin mode:

- The ``tnsnames.ora`` file will be read. The directory can be set using:

  - The ``TNS_ADMIN`` environment variable
  - The ``configDir`` property of the :ref:`getConnection()
    <getconnectiondbattrsconfigdir>` or :ref:`createPool()
    <createpoolpoolattrsconfigdir>` functions

  The default file locations such as
  Instant Client ``network/admin/`` subdirectory,
  ``$ORACLE_HOME/network/admin/``, or
  ``$ORACLE_BASE/homes/XYZ/network/admin/`` (in a read-only Oracle Database
  home) will not be used automatically by the Thin mode.

- Any ``sqlnet.ora`` file will not be read. Instead, pass equivalent settings
  when connecting.

- There is no support for ``oraaccess.xml`` since there are no Oracle Client
  libraries.

See :ref:`tnsadmin` and :ref:`oraaccess` for more information.

.. _diffconnstr:

Connection Strings
++++++++++++++++++

Node-oracledb Thin mode accepts :ref:` Oracle Net Services connection strings
<connectionstrings>` in the same formats as the Oracle Client libraries used by
Thick mode does, but not all Oracle Net keywords will be supported.

The following table lists the parameters that are recognized in Thin mode
either in :ref:`Easy Connect <easyconnect>` strings, or in
:ref:`Connect Descriptors <embedtns>` that are either explicitly passed, or
are in a ``tnsnames.ora`` file.  All unrecognized parameters are ignored.

.. list-table-with-summary::  Oracle Net Keywords Supported in the node-oracledb Thin Mode
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the keyword. The second column displays the equivalent connection parameter. The third column displays the notes.

    * - Oracle Net Keyword
      - Equivalent Connection Parameter
      - Description
    * - SSL_SERVER_CERT_DN
      - :ref:`sslServerCertDN <getconnectiondbattrssslcert>`
      - The distinguished name (DN) that should be matched with the server.

        **Note**: If specified, this value is used for any verification. Otherwise, the hostname will be used.
    * - SSL_SERVER_DN_MATCH
      - :ref:`sslServerDNMatch <getconnectiondbattrssslmatch>`
      - Determines whether the server certificate DN should be matched in addition to the regular certificate verification that is performed.

        **Note**: In Thin mode, parsing the parameter supports case insensitive on/yes/true values similar to the Thick mode. Any other value is treated as disabling it.
    * - WALLET_LOCATION
      - :ref:`walletLocation <getconnectiondbattrswalletloc>`
      - The directory where the wallet can be found.

        **Note**: Used in Easy Connect Strings. It is same as ``MY_WALLET_DIRECTORY`` in a connect descriptor.
    * - MY_WALLET_DIRECTORY
      - :ref:`walletLocation <getconnectiondbattrswalletloc>`
      - The directory where the wallet can be found.

        **Note**: Used by connect descriptors in the :meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()` functions.
    * - EXPIRE_TIME
      - :ref:`expireTime <getconnectiondbattrsexpiretime>`
      - The number of minutes between the sending of keepalive probes.
    * - HTTPS_PROXY
      - :ref:`httpsProxy <getconnectiondbattrshttpsproxy>`
      - The name or IP address of a proxy host to use for tunneling secure connections.
    * - HTTPS_PROXY_PORT
      - :ref:`httpsProxyPort <getconnectiondbattrshttpsproxyport>`
      - The port to be used to communicate with the proxy host.
    * - RETRY_COUNT
      - :ref:`retryCount <getconnectiondbattrsretrycount>`
      - The number of times that a connection attempt should be retried before the attempt is terminated.
    * - RETRY_DELAY
      - :ref:`retryDelay <getconnectiondbattrsretrydelay>`
      - The number of seconds to wait before making a new connection attempt.
    * - TRANSPORT_CONNECT_TIMEOUT
      - :ref:`transportConnectTimeout <getconnectiondbattrstransportconntimeout>`
      - The maximum number of seconds to wait to establish a connection to the database host.
    * - POOL_CONNECTION_CLASS
      - :attr:`cclass <oracledb.connectionClass>`
      - Defines a logical name for connections.

In node-oracledb Thick mode, the above values only work when connected to
Oracle Database 21c or later.

The ``ENABLE=BROKEN`` connect descriptor option is not supported in
node-oracledb Thin mode. Use
:ref:`expireTime <getconnectiondbattrsexpiretime>` instead.

The ``Session Data Unit (SDU)`` connect descriptor option that is used to tune
network transfers is supported in node-oracledb Thin mode and has a default
value of 8 KB. In node-oracledb Thick mode, the SDU connect descriptor option
and equivalent ``sqlnet.ora`` setting are used.

If a bare name is given as a connect string, then the node-oracledb Thin mode
will consider it as a Net Service Name and not as the minimal Easy Connect
string of a hostname. The given connect string will be looked up in a
``tnsnames.ora`` file. This is different from the node-oracledb Thick mode. If
supporting a bare name as a hostname is important to you in the node-oracledb
Thin mode, then you can alter the connection string to include a port number
such as ``hostname:1521`` or a protocol such as ``tcp://hostname``.

For multiple hosts or IP addresses, node-oracledb connects to the host name
used in the parameters of the Connection object, if available. If the
Connection object does not have the parameters, then the parameters in the
connect string are considered.

Database Resident Connection Pooling (DRCP)
+++++++++++++++++++++++++++++++++++++++++++

When using DRCP, the :attr:`oracledb.connectionClass` should be set in the
node-oracledb application. If not, then node-oracledb generates a unique
connection class for each pool. The prefix of the generated connection class
varies in the node-oracledb Thin and Thick modes. In node-oracledb Thin mode,
the prefix of the generated connection class is "NJS". For node-oracledb Thick
mode, the prefix is "OCI". See :ref:`drcp` for more information.

Transport Layer Security (TLS) Support
++++++++++++++++++++++++++++++++++++++

When connecting with mutual TLS (mTLS) also known as two-way TLS, for example to
Oracle Autonomous Database in Oracle Cloud using a wallet, the certificate must
be in the correct format.

For the node-oracledb Thin mode, the certificate must be in a Privacy
Enhanced Mail (PEM) ``ewallet.pem`` file. In node-oracledb Thick mode the
certificate must be in a ``cwallet.sso`` file. See :ref:`connectionadb` for
more information.

Native Network Encryption and Checksumming
++++++++++++++++++++++++++++++++++++++++++

The node-oracledb Thin mode does not support connections using Oracle
Database native network encryption or checksumming. You can enable
TLS instead of using native network encryption. If native network encryption
or checksumming are required, then use node-oracledb in the Thick mode. See
:ref:`nne`.

.. _pwverifier:

Password Verifier Support
+++++++++++++++++++++++++

Password verifiers help in authenticating the passwords of your user account
when you are using username and password authentication to connect your
application to Oracle Database. Password verifiers are also called password
versions. The password verifier can be 10G (case-insensitive Oracle password
verifier), 11G (SHA-1-based password verifier), and 12C (SHA-2-based SHA-512
password verifier).

The node-oracledb Thin mode supports password verifiers 11G and later. The
node-oracledb Thick mode supports password verifiers 10G and later. To view
all the password verifiers configured for the user accounts, use the following
query:

.. code-block:: sql

    SELECT USERNAME,PASSWORD_VERSIONS FROM DBA_USERS;

The ``PASSWORD_VERSIONS`` column lists all the password verifiers that exist
for the user.

If you try to connect to any supported Oracle Database with node-oracledb Thin
mode, but the user account is created only with the 10G password verifier,
then the connection will fail with the :ref:`njs116` error.

.. _pooldiff:

Connection Pooling Differences between Thin and Thick Modes
-----------------------------------------------------------

The :meth:`~oracledb.createPool()` method in the node-oracledb Thin mode
differs from the node-oracledb Thick mode in the following ways:

- Not all the parameters of the :meth:`oracledb.createPool()` method are
  applicable to both node-oracledb modes. Each mode ignores unrecognized
  parameters. The parameters that are supported in Thin mode include
  ``accessToken``, ``connectString``, ``connectionString``,
  ``enableStatistics``, ``password``, ``poolAlias``, ``poolIncrement``,
  ``poolMax``, ``poolMin``, ``poolPingInterval``, ``poolTimeout``,
  ``queueMax``, ``queueRequests``, ``queueTimeout``, ``stmtCacheSize``,
  ``user``, and ``username`` parameters.

- The node-oracledb Thin mode only supports homogeneous pools.

- The node-oracledb Thin mode creates connections in an async fashion and so
  :func:`oracledb.createPool()` returns before any or all minimum number of
  connections are created. As soon as the pool is created, the
  :attr:`pool.connectionsOpen` attribute will not be equal to
  :attr:`pool.poolMin`. The :attr:`~pool.connectionsOpen` attribute will
  increase to the minimum value over a short time as the connections are
  established. Note that this behavior may also be true of recent versions of
  the Oracle Call Interface (OCI) Session Pool used in the Thick mode.

  This improves the application start up time when compared to the
  node-oracledb Thick mode, where :func:`oracledb.createPool()` will not
  return control to the application until all ``pool.poolMin`` connections
  have been created.

  If the old default Thick mode behaviour is required, then the application
  could check if :attr:`pool.connectionsOpen` has reached :attr:`pool.poolMin`
  and then continue with application start up.

- In node-oracledb Thin mode, the ``cclass`` parameter value is not used to
  tag connections in the application connection pool. It is only used for
  :ref:`drcp`.

- In node-oracledb Thin mode, the connection pool supports all the
  :ref:`connection mode privileges <oracledbconstantsprivilege>`.

  The node-oracledb Thick mode does not support all the connection mode
  privileges.

- In node-oracledb Thin mode, :ref:`privileged connections <privconn>` can be
  created with homogeneous pools.

  The node-oracledb Thick mode can only create privileged connections with
  :ref:`heterogeneous pools <connpoolproxy>`.

- In node-oracledb Thick mode, the worker threads can be increased by setting
  the environment variable ``UV_THREADPOOL_SIZE`` before starting Node.js. This
  is not applicable to the Thin mode since it does not use threads.

.. _querymetadatadiff:

Query Metadata in Thin and Thick Modes
--------------------------------------

In node-oracledb Thin mode, :attr:`resultset.metaData` can distinguish the
ROWID and UROWID database types. The UROWID database type shows the new value
``DB_TYPE_UROWID`` and the database type ROWID uses the existing value
``DB_TYPE_ROWID``.

In node-oracledb Thick mode, the value ``DB_TYPE_ROWID`` is shown for both ROWID
and UROWID database types. In node-oracledb Thick and Thin modes, comparison with
the type ``oracledb.ROWID`` will match both ROWID and UROWID database types.

Error Handling in Thin and Thick Modes
--------------------------------------

The node-oracledb Thin and Thick modes handle some errors differently. See
:ref:`errordiff`.

Globalization in Thin and Thick Modes
-------------------------------------

All Oracle NLS environment variables, and the ``ORA_TZFILE``
environment variable, are ignored by the node-oracledb Thin mode.

The node-oracledb Thin mode can only use NCHAR, NVARCHAR2, and NCLOB data
when Oracle Database's secondary character set is AL16UTF16.

See :ref:`nls`.

Tracing in Thin and Thick Modes
-------------------------------

In the node-oracledb Thin mode, low level tracing is different because there
are no Oracle Client libraries. See :ref:`endtoend`.

Data Type Conversion in Thin and Thick Modes
--------------------------------------------

The node-oracledb Thick mode uses Oracle NLS conversion routines to convert
the data found in the database to the desired data type. The node-oracledb Thin
mode uses fixed JavaScript routines such as toString(). You can use a converter
function to modify the behavior. See :ref:`fetch type handlers
<fetchtypehandler>`.

.. _supporteddbtypes:

Supported Database Data Types in Thin and Thick Modes
-----------------------------------------------------

The node-oracledb Thin and Thick modes support different Oracle Database data
types. The following table lists the types that are supported in the
node-oracledb driver. See `Oracle Database Types <https://docs.oracle.
com/en/database/oracle/oracle-database/21/sqlrf/Data-Types.html#GUID-A3C0D836-
BADB-44E5-A5D4-265BA5968483>`__ and `PL/SQL Types <https://docs.oracle.com/en
/database/oracle/oracle-database/21/lnpls/plsql-data-types.html#GUID-391C58FD-
16AF-486C-AF28-173E309CDBA5>`__. The node-oracledb database type shown is the
common one. In some node-oracledb APIs you may use other types, for example
when binding numeric values.

.. list-table-with-summary::  Oracle Database Data Types Supported
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :summary: The first column displays the database data type. The second column displays the node-oracledb database type. The third column indicates if the type is supported in node-oracledb.

    * - Oracle Database Type
      - node-oracledb Database Type
      - Supported in node-oracledb
    * - CHAR
      - DB_TYPE_CHAR
      - Yes
    * - NCHAR
      - DB_TYPE_NCHAR
      - Yes
    * - VARCHAR2
      - DB_TYPE_VARCHAR
      - Yes
    * - NVARCHAR2
      - DB_TYPE_NVARCHAR
      - Yes
    * - NUMBER, FLOAT
      - DB_TYPE_NUMBER
      - Yes
    * - BINARY_FLOAT
      - DB_TYPE_BINARY_FLOAT
      - Yes
    * - BINARY_DOUBLE
      - DB_TYPE_BINARY_DOUBLE
      - Yes
    * - LONG
      - DB_TYPE_LONG
      - Yes
    * - DATE
      - DB_TYPE_DATE
      - Yes
    * - TIMESTAMP
      - DB_TYPE_TIMESTAMP
      - Yes
    * - TIMESTAMP WITH TIME ZONE
      - DB_TYPE_TIMESTAMP_TZ
      - Yes
    * - TIMESTAMP WITH LOCAL TIME ZONE
      - DB_TYPE_TIMESTAMP_LTZ
      - Yes
    * - INTERVAL YEAR TO MONTH
      - Not supported
      - No
    * - INTERVAL DAY TO SECOND
      - Not supported
      - No
    * - RAW
      - DB_TYPE_RAW
      - Yes
    * - LONG RAW
      - DB_TYPE_LONG_RAW
      - Yes
    * - BFILE
      - DB_TYPE_BFILE
      - Yes
    * - BLOB
      - DB_TYPE_BLOB
      - Yes
    * - CLOB
      - DB_TYPE_CLOB
      - Yes
    * - NCLOB
      - DB_TYPE_NCLOB
      - Yes
    * - JSON
      - DB_TYPE_JSON
      - Yes
    * - ROWID
      - DB_TYPE_ROWID
      - Yes
    * - UROWID
      - DB_TYPE_ROWID, DB_TYPE_UROWID
      - Yes. May show DB_TYPE_UROWID in metadata. See :ref:`Query Metadata Differences <querymetadatadiff>`.
    * - BOOLEAN (PL/SQL and SQL)
      - DB_TYPE_BOOLEAN
      - Yes
    * - PLS_INTEGER (PL/SQL)
      - DB_TYPE_BINARY_INTEGER
      - Yes
    * - BINARY_INTEGER (PL/SQL)
      - DB_TYPE_BINARY_INTEGER
      - Yes
    * - REF CURSOR (PL/SQL or nested cursor)
      - DB_TYPE_CURSOR
      - Yes
    * - REF
      - DB_TYPE_OBJECT
      - No
    * - User-defined types (object type, VARRAY, records, collections, SDO_* types)
      - DB_TYPE_OBJECT
      - Thick mode only
    * - ANYTYPE
      - DB_TYPE_OBJECT
      - Thick mode only
    * - ANYDATA
      - DB_TYPE_OBJECT
      - Thick mode only
    * - ANYDATASET
      - DB_TYPE_OBJECT
      - Thick mode only
    * - XMLType
      - DB_TYPE_XMLTYPE
      - Yes

.. _testingmode:

Testing Which Mode Is in Use
============================

To know whether the driver is in Thin or Thick Mode, you can use
:attr:`oracledb.thin`. The boolean attributes :attr:`connection.thin` and
:attr:`pool.thin` can be used to show the current mode of a node-oracledb
connection or pool, respectively.

Another method that can be used to check which mode is in use is to query
``V$SESSION_CONNECT_INFO``. See :ref:`vsessconinfo`.

.. _frameworks:

Frameworks, SQL Generators, and ORMs
====================================

The features of node-oracledb Thin mode cover the needs of common frameworks
that depend upon the Node.js API. For example, the node-oracledb Thin mode can
be used in Sequelize. To run the node-oracledb Thin mode through Sequelize,
you must not set the ``libPath`` in the dialectOptions object and must not
:meth:`~oracledb.initOracleClient`. For node-oracledb Thick mode, set the
``libPath`` in the dialectOptions object or call
:meth:`~oracledb.initOracleClient()`.
