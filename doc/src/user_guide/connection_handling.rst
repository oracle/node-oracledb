.. _connectionhandling:

*****************************
Connecting to Oracle Database
*****************************

Connections between node-oracledb and Oracle Database are used for executing
:ref:`SQL <sqlexecution>`, :ref:`PL/SQL <plsqlexecution>`, and for
:ref:`SODA <sodaoverview>`.

By default, node-oracledb runs in a 'Thin' mode which connects directly to
Oracle Database. This mode does not need Oracle Client libraries. However, when
node-oracledb uses these libraries, then the driver is said to be in 'Thick'
mode and has :ref:`additional functionality <featuresummary>`. See
:ref:`enablingthick`.

Connections can be either:

- :ref:`Standalone <standaloneconnection>`: These connections are useful when
  the application needs a single connection to a database. Connections are
  created by calling :meth:`oracledb.getConnection()`.

- :ref:`Pooled <connpooling>`: These connections are important for performance
  when applications frequently connect and disconnect from the database. Oracle
  high availability features in the pool implementation mean that small pools
  can also be useful for applications that want a few connections available for
  infrequent use. Pools are created with :meth:`oracledb.createPool()` at
  application initialization time, and then :meth:`pool.getConnection()` can be
  called to obtain a connection from a pool.

Many connection behaviors can be controlled by node-oracledb options.
Other settings can be configured in :ref:`Oracle Net files <tnsadmin>` or
in :ref:`connection strings <easyconnect>`. These include :ref:`limiting the
amount of time <dbcalltimeouts>` that opening a connection can take,
or enabling :ref:`network encryption <securenetwork>`.

.. _standaloneconnection:

Standalone Connections
======================

Standalone connections are database connections that do not use a node-oracledb
connection pool. They are useful for applications that use a single connection
to a database. You can create connections by calling
:meth:`oracledb.getConnection()` and passing:

- A database username
- The database password for that user
- A :ref:`connect string <connectionstrings>`

Node-oracledb also supports :ref:`external authentication <extauth>` and
:ref:`token-based authentication <tokenbasedauthentication>` so passwords do
not need to be in the application.

An example passing credentials is:

.. code-block:: javascript

    const oracledb = require('oracledb');

    async function run() {
        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // contains the hr schema password
            connectString : "localhost/FREEPDB1"
        });

        const result = await connection.execute(`SELECT city FROM locations`);
        console.log("Result is:", result.rows);

        await connection.close();   // Always close connections
    }

    run();

Connections must be released with :meth:`connection.close()` when they are no
longer needed. Make sure to release connections in all code paths including in
error handlers.

.. note::

        If you do not explicitly close a connection, you may experience a short
        delay when the application terminates.  This is due to the timing
        behavior of Node.js garbage collection which needs to free the
        connection reference.

.. _connectionstrings:

Oracle Net Services Connection Strings
======================================

The ``connectString`` property of :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` is the Oracle Database Oracle Net Services
Connection String (commonly abbreviated as "connection string") that
identifies which database service to connect to. The ``connectString`` value
can be one of Oracle Database's naming methods:

-  An Oracle :ref:`Easy Connect <easyconnect>` string
-  A :ref:`Connect Descriptor <embedtns>` string
-  A :ref:`TNS Alias <tnsnames>` from a local :ref:`tnsnames.ora <tnsadmin>`
   file or external naming service
-  A :ref:`Configuration Provider URL <configproviderurl>`
-  The SID of a local Oracle Database instance

If a connect string is not specified, the empty string “” is used which
indicates to connect to the local, default database.

The ``connectionString`` property is an alias for ``connectString``. Use
only one of the properties.

.. note::

        Creating a connection in node-oracledb Thin mode always requires a
        connection string, or the database host name and service name, to be
        specified. Bequeath connections cannot be made.  The Thin mode does not
        reference Oracle environment variables such as ``ORACLE_SID``,
        ``TWO_TASK``, or ``LOCAL``.

.. _easyconnect:

Easy Connect Syntax for Connection Strings
------------------------------------------

An `Easy Connect <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-8C85D289-6AF3-41BC-848B-BF39D32648BA>`__ string is often the simplest
connection string to use when creating connections and pools. For example, to
connect to the Oracle Database service ``orclpdb1`` that is running on the
host ``mydbmachine.example.com`` with the default Oracle Database port 1521,
use:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });

If the database is using a non-default port, for example 1984, the port
must be given:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com:1984/orclpdb1"
    });

The Easy Connect syntax has been extended in recent versions of Oracle
Database client since its introduction in Oracle 10g. Check the Easy Connect
Naming method in `Oracle Net Service Administrator’s Guide <https://www.oracle
.com/pls/topic/lookup?ctx=dblatest&id=GUID-B0437826-43C1-49EC-A94D-
B650B6A4A6EE>`__ for the syntax in your version of the Oracle Client
libraries. The Easy Connect syntax supports Oracle Database service names. It
cannot be used with the older System Identifiers (SID).

In node-oracledb Thin mode, any unknown Easy Connect options are ignored and
are not passed to the database. See :ref:`Connection String Differences
<diffconnstr>` for more information.

If you are using node-oracledb Thick mode with Oracle Client 19c (or later),
the latest `Easy Connect <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-8C85D289-6AF3-41BC-848B-BF39D32648BA>`__ syntax allows the
use of multiple hosts or ports, along with optional entries for the wallet
location, the distinguished name of the database server, and even lets some
network configuration options be set. Oracle's `Technical Paper on Easy
Connect Plus Syntax <https://download.oracle.com/ocomdocs/global/Oracle-Net-
Easy-Connect-Plus.pdf>`__ discusses the syntax. The Easy Connect syntax
means that :ref:`tnsnames.ora <tnsadmin>` or :ref:`sqlnet.ora <tnsadmin>`
files are not needed for some further common connection scenarios.

For example, if a firewall terminates idle connections every five minutes, you
may decide it is more efficient to keep connections alive instead of having the
overhead of recreation. Your connection string could be
``"mydbmachine.example.com/orclpdb1?expire_time=2"`` to send packets every two
minutes with the `EXPIRE_TIME <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-6140611A-83FC-4C9C-B31F-A41FC2A5B12D>`__ feature. The general
recommendation for ``EXPIRE_TIME`` is to use a value that is slightly less
than half of the termination period.

Another common use case for Easy Connect is to limit the amount of time
required to open a connection. For example, to return an error after 15 seconds
if a connection cannot be established to the database, use
``"mydbmachine.example.com/orclpdb1?connect_timeout=15"``.

.. _embedtns:

Connect Descriptors
-------------------

Connect Descriptors can be embedded directly in node-oracledb applications.
For example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=orcl)))"
    });

.. _tnsnames:

TNS Aliases for Connection Strings
----------------------------------

:ref:`Connect Descriptors <embedtns>` are commonly stored in optional
:ref:`tnsnames.ora configuration files <tnsadmin>` and associated with
a TNS Alias. This alias can be used directly in the ``connectString``
parameter of :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()`. For example, given a file
``/opt/oracle/config/tnsnames.ora`` with the following content::

    sales =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = orcl)
        )
      )

You can connect in node-oracledb Thin mode by passing the TNS Alias "sales"
(case insensitive) as the ``connectString`` value using the following code:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "sales"
        configDir     : "/opt/oracle/config"
    });

See :ref:`Optional Oracle Net Configuration <tnsadmin>` for more options on how
node-oracledb locates the ``tnsnames.ora`` files. Note that in node-oracledb
Thick mode, the configuration file must be in a default location or be set
during initialization, not at connection time.

TNS Aliases may also be defined in a directory server.

For general information on ``tnsnames.ora`` files, see the Oracle Net
documentation on `tnsnames.ora <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA>`__.

.. note::

        When using node-oracledb in Thin mode, the ``tnsnames.ora`` file will
        not be automatically located. The file's directory must be explicitly
        specified when connecting.

You can retrieve the TNS Aliases that are defined in the
:ref:`tnsnames.ora <tnsadmin>` file using
:meth:`oracledb.getNetworkServiceNames()`. The directory that contains the
``tnsnames.ora`` file can be specified in the ``configDir`` property of
:meth:`~oracledb.getNetworkServiceNames()`. For example, if the
``tnsnames.ora`` file is stored in the ``/opt/oracle/config`` directory and
contains the following TNS Aliases::

    sales =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = ORCL)
        )
      )

    finance =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mydbmachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = ORCLPDB1)
        )
      )

To retrieve the TNS Aliases from the above ``tnsnames.ora`` file, you can use:

.. code-block:: javascript

    const serviceNames = await oracledb.getNetworkServiceNames("/opt/oracle/config");
    console.log(serviceNames);

This prints ``['sales', 'finance']`` as the output.

.. _configproviderurl:

Centralized Configuration Provider URL Connection Strings
---------------------------------------------------------

A :ref:`Centralized Configuration Provider <configurationprovider>` URL
connection string allows node-oracledb configuration information to be stored
centrally in :ref:`OCI Object Storage <ociobjstorage>`,
:ref:`OCI Vault <ocivault>`, :ref:`local file <fileconfigprovider>`,
:ref:`Azure App Configuration <azureappconfig>`, or in a
:ref:`Azure Key Vault <azurekeyvault>`. Using a provider URL, node-oracledb
will access the information stored in the configuration provider
and use it to connect to Oracle Database.

The database connect descriptor and any database credentials stored in a
configuration provider will be used by any language driver that accesses the
configuration. Other driver-specific sections can exist. Node-oracledb will
use the settings that are in a section with the prefix "njs", and will ignore
other sections.

The Centralized Configuration Provider URL must begin with
"config-<configuration-provider>://" where the configuration-provider value
can be set to *ociobject*, *ocivault*, *file*, *azure*, or *azurevault*
depending on the location of your configuration information.

For example, consider the following connection configuration stored in
:ref:`OCI Object Storage <ociobjstorage>`:

.. code-block:: json

    {
      "connect_descriptor": "localhost/orclpdb",
      "user": "scott",
      "njs": {
        "poolMin": 2,
        "poolMax": 10,
        "prefetchRows": 2
        "stmtCacheSize": 30
      }
    }

You could use this to create a connection pool by specifying the
``connectString`` connection string parameter as shown below:

.. code-block:: javascript

    const pool = await oracledb.createPool({
      connectString : "config-ociobject://abc.oraclecloud.com/n/abcnamespace/b/abcbucket/o/abcobject?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

    const connection = await pool.getConnection();

The pool will be created using the pool properties defined in the
configuration provider.

See :ref:`configurationprovider` for more information.

.. _notjdbc:

JDBC and Oracle SQL Developer Connection Strings
------------------------------------------------

The node-oracledb connection string syntax is different from Java JDBC and
the common Oracle SQL Developer syntax. If these JDBC connection strings
reference a service name like::

    jdbc:oracle:thin:@hostname:port/service_name

for example::

    jdbc:oracle:thin:@mydbmachine.example.com:1521/orclpdb1

then use Oracle’s Easy Connect syntax in node-oracledb:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com:1521/orclpdb1"
    });

You may need to remove JDBC-specific parameters from the connection string and
use node-oracledb alternatives.

Alternatively, if a JDBC connection string uses an old-style Oracle
system identifier `SID <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&i
d=GUID-8BB8140D-63ED-454E-AAC3-1964F80D102D>`__, and there is no service name
available::

    jdbc:oracle:thin:@hostname:port:sid

for example::

    jdbc:oracle:thin:@mydbmachine.example.com:1521:orcl

then either :ref:`embed the Connect Descriptor <embedtns>`:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SID=ORCL)))"
    });

or create a :ref:`Net Service Name <tnsnames>`::

    # tnsnames.ora

    finance =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = mydbmachine.example.com)(PORT = 1521))
        (CONNECT_DATA =
          (SID = ORCL)
        )
      )

This can be referenced in node-oracledb:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "finance"
    });

.. _configurationprovider:

Centralized Configuration Providers
===================================

`Centralized Configuration Providers <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-E5D6E5D9-654C-4A11-90F8-2A79C58ABD38>`__ allow the
storage and management of database connection credentials and application
configuration information in a central location. These providers allow you to
separately store configuration information from the code of your application.
The information that can be stored includes the connect descriptor, database
credentials, wallet, and node-oracledb specific properties such as connection
pool settings. Node-oracledb can use the centrally stored information to
connect to Oracle Database with :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()`.

The following configuration providers are supported by node-oracledb:

- :ref:`File Provider <fileconfigprovider>`
- :ref:`Oracle Cloud Infrastructure (OCI) Object Storage <ociobjstorage>`
- :ref:`Oracle Cloud Infrastructure (OCI) Vault <ocivault>`
- :ref:`Microsoft Azure App Configuration <azureappconfig>`
- :ref:`Microsoft Azure Key Vault <azurekeyvault>`

.. _configurationinformation:

**Configuration Information Stored in Centralized Configuration Providers**

The configuration information can be stored in the above-mentioned
configuration providers by using specific keys which are listed in the table
below.

.. list-table-with-summary:: Configuration Information Stored in Configuration Providers
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 10 33 12
    :name: _configuration_information
    :summary: The first column displays the name of the key. The second column displays the description of the key. The third column displays whether the key is required or optional.

    * - Key
      - Description
      - Required or Optional
    * - ``user``
      - The database user name.
      - Optional
    * - ``password``
      - .. _passwordparams:

        The password of the database user.

        For :ref:`OCI Object Storage <ociobjstorage>`, :ref:`OCI Vault <ocivault>`, :ref:`Azure Key Vault <azurekeyvault>`, and :ref:`File <fileconfigprovider>` configuration providers, the value is an object which contains the following parameters:

        - ``type``: The possible values of this required parameter are *ocivault*, *azurevault*, *base64*, and *text*.

        - ``value``: The values of this required parameter dependent on the ``type`` parameter. The possible values are OCID of the secret when ``type`` is *ocivault*, Azure Key Vault URI when ``type`` is *azurevault*, and Base64 Encoded password when ``type`` is *base64*.

        - ``authentication``: The possible values of this optional parameter are dependent on the configuration provider and include the authentication method and optional authentication parameters.

        For :ref:`Azure App Configuration <azureappconfig>`, the password is the reference to the Azure Key Vault and Secret.

        .. warning::

            Storing passwords of type *base64* or *text* in the JSON file for File, OCI Object Storage, and Azure App Configuration  configuration providers should only ever be used in development or test environments. It can be used with Azure Vault and OCI Vault configuration providers.
      - Optional
    * - ``connect_descriptor``
      - The database :ref:`connect descriptor <embedtns>`.
      - Required
    * - ``wallet_location``
      - The reference to the wallet.

        For :ref:`OCI Object Storage <ociobjstorage>`, :ref:`OCI Vault <ocivault>`, :ref:`Azure Key Vault <azurekeyvault>`, and :ref:`File <fileconfigprovider>` configuration providers, the value is an object itself and contains the same parameters that are listed in the :ref:`password <passwordparams>` parameter. This can only be used in node-oracledb Thin mode.

        For :ref:`Azure App Configuration <azureappconfig>`, this parameter is the reference to the Azure Key Vault and Secret that contains the wallet as the value.
      - Optional
    * - ``njs``
      - The node-oracledb specific properties. The properties that can be stored in OCI Object Storage include ``poolMin``, ``poolMax``, ``poolIncrement``, ``poolTimeout``, ``poolPingInterval``, ``poolPingTimeout``, ``stmtCacheSize``, ``prefetchRows``, and ``lobPrefetch``.
      - Optional

**Precedence of Properties**

Defining attributes in multiple places is not recommended. However, if you
have defined the values of ``user`` and ``password`` in both the
application and the configuration provider, then the values defined in the
application will have the higher precedence.

If you are using Thin mode and have defined the node-oracledb specific
properties in both the application and the configuration provider, then the
values defined in the configuration provider will have the higher precedence.
If you have defined the ``walletContent`` property in the application and the
``wallet_location`` key in the configuration provider, then the value defined
in the configuration provider will have the higher precedence.

If you are using Thick mode and have defined the node-oracledb properties in
an ``oraaccess.xml`` file (see :ref:`Optional Oracle Client Configuration
File <optconfigfiles>`), the configuration provider, and the application, then
the values defined in the ``oraaccess.xml`` file will have the highest
precedence followed by the configuration provider and then the application.

.. _fileconfigprovider:

Using a File Centralized Configuration Provider
-----------------------------------------------

The File Centralized Configuration Provider enables the storage and management
of Oracle Database connection information using local files. This
configuration provider support is available from node-oracledb 6.9 onwards.

To use a File Centralized Configuration Provider, you must:

1. Store the connection information in a JSON file on your local file system.
   See :ref:`Connection Information for File Configuration Provider
   <fileconfigparams>`.

2. :ref:`Use a File configuration provider connection string URL
   <connstringfile>` in the ``connectString`` property of connection and pool
   creation methods.

Note that node-oracledb caches configurations by default, see
:ref:`conncaching`.

.. _fileconfigparams:

**Connection Information for File Configuration Provider**

The connection information stored in a JSON file must contain at least a
``connect_descriptor`` key to specify the database connection string.
Optionally, you can store the database user name, password, wallet location,
and node-oracledb properties. For details on the information that can be
stored in this configuration provider, see :ref:`_configuration_information`.

.. _examplefileconfigprovider:

An example of a JSON file that can be used with File Centralized Configuration
Provider is:

.. code-block:: json

    {
        "connect_descriptor": "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
                (host=adb.region.oraclecloud.com))(connect_data=(service_name=dbsvcname))
                (security=(ssl_server_dn_match=yes)))",

        "user": "scott",
        "password": {
          "type": "base64",
          "value": "dGlnZXI="
        }
        "njs": {
            "stmtCacheSize": 30,
            "prefetchRows": 2,
            "poolMin": 2,
            "poolMax": 10
        }
    }

This encodes the password as base64. See :ref:`ociobjstorage` for other
password examples.

.. _connstringfile:

**File Centralized Configuration Provider connectString Syntax**

The ``connectString`` parameter for :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` calls should use a connection string URL in the
format::

    config-file://<filePath>?[alias=]

For example, if you have the above JSON file stored in
``/opt/oracle/my-config1.json``, you can connect to Oracle Database using:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-file:///opt/oracle/my-config1.json"
    });

The parameters of the connection string URL format are detailed in the table
below.

.. list-table-with-summary:: Connection String Parameters for File Configuration Provider
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 25 15
    :name: _connection_string_for_file_configuration_provider
    :summary: The first column displays the name of the connection string parameter. The second column displays the description of the connection string parameter.

    * - Parameter
      - Description
      - Required or Optional
    * - config-file
      - Indicates that the centralized configuration provider is a file in your local system.
      - Required
    * - <filePath>
      - The file path and name of the JSON file that contains the configuration information.
      - Required
    * - alias
      - The connection alias name used to identify a specific configuration.
      - Optional

Multiple alias names can be defined in a JSON file as shown below:

.. code-block:: json

    {
        "production": {
            "connect_descriptor": "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
              (host=adb.region.oraclecloud.com))(connect_data=(service_name=dbsvcname))
              (security=(ssl_server_dn_match=yes)))"
        },
        "testing": {
            "connect_descriptor": "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
              (host=adb.region.oraclecloud.com))(connect_data=(service_name=dbsvcname))
              (security=(ssl_server_dn_match=yes)))",
            "user": "scott",
            "password": {
              "type": "base64",
              "value": "dGlnZXI="
            }
        }
    }

If you have this configuration stored in a JSON file in
``/opt/oracle/my-config2.json``, you can connect to Oracle Database using:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-file:///opt/oracle/my-config2.json?alias=production"
    });

.. _ociobjstorage:

Using an OCI Object Storage Centralized Configuration Provider
--------------------------------------------------------------

The Oracle Cloud Infrastructure (OCI) `Object Storage configuration provider
<https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/
objectstorageoverview.htm>`__ enables the storage and management of Oracle
Database connection information as JSON in `OCI Object Storage <https://docs.
oracle.com/en-us/iaas/Content/Object/Concepts/objectstorageoverview.htm>`__.
This configuration provider support was introduced in node-oracledb 6.6.

To use an OCI Object Storage Centralized Configuration Provider, you must:

1. Upload a JSON file that contains the connection information into an OCI
   Object Storage Bucket. See :ref:`Connection Information for OCI Object
   Storage Centralized Configuration Provider <ociconfigparams>`.

   Also, see `Uploading an Object Storage Object to a Bucket <https://docs.
   oracle.com/en-us/iaas/Content/Object/Tasks/managingobjects_topic-To_upload_
   objects_to_a_bucket.htm>`__ and the `Oracle Database Net Services
   Administrator’s Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
   &id=GUID-B43EA22D-5593-40B3-87FC-C70D6DAF780E>`__ for the steps.

2. Install the required OCI modules. See :ref:`ocimodules`.

3. Load the :ref:`ociobject <ociobjectplugin>` plugin in your application using
   ``require('oracledb/plugins/configProviders/ociobject')``.

4. :ref:`Use an OCI Object Storage connection string URL <connstringoci>`
   in the ``connectString`` property of connection and pool creation methods.

Note that node-oracledb caches configurations by default, see
:ref:`conncaching`.

.. _ociconfigparams:

**Connection Information for OCI Object Storage Configuration Provider**

The connection information stored in a JSON file must contain a
``connect_descriptor`` key. Optionally, you can specify the database user
name, password, wallet location, and node-oracledb properties. The database
password can also be stored securely using `OCI Vault <https://docs.oracle.com
/en-us/iaas/Content/KeyManagement/Tasks/managingsecrets.htm>`__. For details
on the information that can be stored in this configuration provider, see
:ref:`_configuration_information`.

.. _exampleociobjstorage:

An example of a JSON file that can be used with OCI Object Centralized Storage
Configuration Provider is:

.. code-block:: json

    {
        "connect_descriptor": "(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
                (host=adb.region.oraclecloud.com))(connect_data=(service_name=dbsvcname))
                (security=(ssl_server_dn_match=yes)))",

        "user": "scott",
        "password": {
            "type": "ocivault",
            "value": "ocid1.vaultsecret.my-secret-id"
        },
        "wallet_location": {
            "type": "ocivault",
            "value": "ocid1.vaultwallet.my-wallet-id"
        },
        "njs": {
            "stmtCacheSize": 30,
            "prefetchRows": 2,
            "poolMin": 2,
            "poolMax": 10
        }
    }

.. _connstringoci:

**OCI Object Storage Centralized Configuration Provider connectString Syntax**

The ``connectString`` parameter for :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` calls should use a connection string URL in the
format::

    config-ociobject://<objectstorage-name>/n/<namespaceName>/b/<bucketName>/o/
    <objectName>[?key=<networkServiceName>&<option1>=<value1>&<option2>=<value2>...]

For example, a connection string to access OCI Object Storage and connect to
Oracle Database is:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-ociobject://abc.oraclecloud.com/n/abcnamespace/b/abcbucket/o/abcobject?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

The parameters of the connection string URL format are detailed in the table
below.

.. list-table-with-summary:: Connection String Parameters for OCI Object Storage
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 25 15
    :name: _connection_string_for_oci_object_storage
    :summary: The first row displays the name of the connection string parameter. The second row displays the description of the connection string parameter. The third row displays whether the connection string parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - config-ociobject
      - Indicates that the configuration provider is OCI Object Storage.
      - Required
    * - <objectstorage-name>
      - The URL of OCI Object Storage endpoint.
      - Required
    * - <namespaceName>
      - The OCI Object Storage namespace where the JSON file is stored.
      - Required
    * - <bucketName>
      - The OCI Object Storage bucket name where the JSON file is stored.
      - Required
    * - <objectName>
      - The JSON file name.
      - Required
    * - key=<networkServiceName>
      - The network service name or alias if the JSON file contains one or more network service names.
      - Optional
    * - <options> and <values>
      - .. _authmethodsociobject:

        The authentication method and corresponding authentication parameters to access the OCI Object Storage configuration provider. See `OCI Authentication Methods <https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm>`__ for more information. Depending on the specified authentication method, you must also set the corresponding authentication parameters in the connection string. You can specify one of the following authentication methods:

        - **API Key-based Authentication**: The authentication to OCI is done using API key-related values. This is the default authentication method. Note that this method is used when no authentication value is set or by setting the option value to *OCI_DEFAULT*. The optional authentication parameters that can be set for this method include *OCI_PROFILE*, *OCI_TENANCY*, *OCI_USER*, *OCI_FINGERPRINT*, *OCI_KEY_FILE*, and *OCI_PROFILE_PATH*. These authentication parameters can also be set in an OCI Authentication Configuration file which can be stored in a default location *~/.oci/config*, or in location *~/.oraclebmc/config*, or in the location specified by the OCI_CONFIG_FILE environment variable.

        - **Instance Principal Authentication**: The authentication to OCI is done using VM instance credentials running on OCI. To use this method, set the option value to *OCI_INSTANCE_PRINCIPAL*. There are no optional authentication parameters that can be set for this method.

        - **Resource Principal Authentication**: The authentication to OCI is done using OCI resource principals. To use this method, you must set the option value to *OCI_RESOURCE_PRINCIPAL*. There are no optional authentication parameters that can be set for this method.

        See `Authentication Parameters for OCI Object Storage <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-EB94F084-0F3F-47B5-AD77-D111070F7E8D>`__ for more information.
      - Optional

.. _ocivault:

Using an OCI Vault Centralized Configuration Provider
-----------------------------------------------------

`Oracle Cloud Infrastructure (OCI) Vault Centralized Configuration Provider
<https://docs.oracle.com/en-us/iaas/Content/KeyManagement/home.htm>`__ enables
the storage and management of Oracle Database connection information as JSON
objects. This Centralized Configuration Provider support is available from
node-oracledb 6.9 onwards.

To use an OCI Vault Centralized Configuration Provider, you must:

1. Enter and save the connection information as a secret in OCI Vault by using
   the Manual secret generation method. The connection information must be
   entered as a JSON object. See :ref:`Connection Information for OCI Vault
   Centralized Configuration Provider <ocivaultparams>`.

   Also, see `Creating a Secret in OCI Vault <https://docs.oracle.com/en-us/
   iaas/Content/KeyManagement/Tasks/managingsecrets_topic-To_create_a_new_
   secret.htm>`__ for the steps.

2. Install the required OCI modules. See :ref:`ocivaultmodules`.

3. Load the :ref:`ocivault <ocivaultplugin>` plugin in your application using
   ``require('oracledb/plugins/configProviders/ocivault')``.

4. :ref:`Use an OCI Vault connection string URL <connstringocivault>` in the
   ``connectString`` property of connection and pool creation methods.

Note that node-oracledb caches configurations by default. See
:ref:`conncaching`.

.. _ocivaultparams:

**Connection Information for OCI Vault Configuration Provider**

The JSON object must contain a ``connect_descriptor`` key. Optionally, you can
specify the database user name, password, wallet location, and node-oracledb
properties. For details on the information that can be stored in this
Centralized Configuration Provider, see :ref:`_configuration_information`.

The JSON object syntax for OCI Vault Centralized Configuration Provider is
the same as the syntax for OCI Object Storage.
See :ref:`OCI Object Storage <exampleociobjstorage>` example.

.. _connstringocivault:

**OCI Vault Centralized Configuration Provider connectString Syntax**

The ``connectString`` parameter for :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` calls should use a connection string URL in the
format::

    config-ocivault://<ocidvault>?[<option1>=<value1>&<option2>=<value2>...]

For example, a connection string to access OCI Vault and connect to Oracle
Database is:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-ocivault://ocid1.vaultsecret.oc1?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

The parameters of the connection string URL format are detailed in the table
below.

.. list-table-with-summary:: Connection String Parameters for OCI Vault
    :header-rows: 1
    :class: wy-table-responsive
    :widths: 15 25 15
    :name: _connection_string_for_oci_vault
    :summary: The first row displays the name of the connection string parameter. The second row displays the description of the connection string parameter. The third row displays whether the connection string parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - config-ocivault
      - Indicates that the configuration provider is OCI Vault.
      - Required
    * - <ocidvault>
      - The OCI vault identifier.
      - Required
    * - <options> and <values>
      - The authentication method and corresponding authentication parameters to access the OCI Vault configuration provider.

        The same authentication methods used in OCI Object Storage are used in OCI Vault. See :ref:`Authentication methods in OCI Object Storage <authmethodsociobject>`.
      - Optional

.. _azureappconfig:

Using an Azure App Centralized Configuration Provider
-----------------------------------------------------

`Azure App Configuration <https://learn.microsoft.com/en-us/azure/azure-app-
configuration/overview>`__ is a cloud-based service provided by Microsoft
Azure. It can be used for storage and management of Oracle Database connection
information as key-value pairs. This configuration provider support was
introduced in node-oracledb 6.6.

To use node-oracledb with Azure App Configuration, you must:

1. Enter and save your configuration information in your Azure App
   Configuration Provider as key-value pairs. See
   :ref:`Connection Information for Azure App Centralized Configuration
   Provider <azureconfigparams>`.

2. Install the required Azure Application modules. See :ref:`azuremodules`.

3. Load the :ref:`azure <azureplugin>` plugin in your application using
   ``require('oracledb/plugins/configProviders/azure')``.

4. :ref:`Use an Azure App Configuration connection string URL
   <connstringazure>` in the ``connectString`` parameter of connection and
   pool creation methods.

Note that node-oracledb caches configurations by default, see
:ref:`conncaching`.

.. _azureconfigparams:

**Connection Information for Azure App Configuration Provider**

Key-value pairs for stored connection information can be added using the
Configuration explorer page of your Azure App Configuration. See `Create a
key-value in Azure App Configuration <https://learn.microsoft.com/
en-us/azure/azure-app-configuration/quickstart-azure-app-configuration-create?
tabs=azure-portal#create-a-key-value>`__ for more information. Also, see the
`Oracle Net Service Administrator’s Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-FCCF1C8D-E4E9-4061-BEE5-5F21654BAC18>`__.

You can organize the key-value pairs under a prefix based on your
application's needs. For example, if you have two applications, Sales and
Human Resources, then you can store the relevant configuration information
under the prefix *sales* and the prefix *hr*.

The key-value pairs must contain the key ``connect_descriptor`` which
specifies the database connect descriptor. This can be set using a prefix as
"<prefix>/connect_descriptor", for example, *sales/connect_descriptor*.

You can additionally store the database user name using a key such as
"<prefix>/user", and store the password using "<prefix>/password". For example,
*sales/user* and *sales/password*. The database password can also be stored
securely using `Azure Key Vault <https://learn.microsoft.com/en-us
/azure/key-vault/general/overview>`__.

Optional node-oracledb properties can be set using a key such as
"<prefix>/njs/<key name>", for example *sales/node-oracledb/poolMin*. This is
similar to how `Oracle Call Interface <https://www.oracle.com/pls/topic/lookup
?ctx=dblatest&id=LNOCI>`__ settings use keys like "<prefix>/oci/<key name>" as
shown in `Oracle Database Net Services Administrator’s Guide
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-97E22A68-6FE3-
4FE9-98A9-90E5BF83E9EC>`__.

For details on the information that can be stored in this configuration
provider, see :ref:`_configuration_information`.

.. _exampleazureappconfig:

The following table shows sample configuration information defined using the
Configuration explorer page of your Azure App Configuration provider. The
example uses the prefix ``test/``.

.. list-table-with-summary::
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 30 70
    :name: _azure_app_configuration_keys_and_values
    :summary: The first row displays the name of the key defined in Azure App Configuration. The second row displays the value of the key defined in Azure App Configuration.

    * - Sample Azure App Configuration Key
      - Sample Value
    * - test/connect_descriptor
      - (description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.region.oraclecloud.com))(connect_data=(service_name=orcldb_svc1)))
    * - test/user
      - scott
    * - test/password
      - {"uri":"https://mykeyvault.vault.azure.net/secrets/passwordsalescrm"}
    * - test/wallet_location
      - {"uri":"https://mykeyvault.vault.azure.net/secrets/walletsalescrm"}
    * - test/njs
      - {"stmtCacheSize":30, "prefetchRows":2, "poolMin":2, "poolMax":10}

.. _connstringazure:

**Azure App Centralized Configuration Provider connectString Syntax**

You must define a connection string URL in a specific format in the
``connectString`` property of :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` to access the information stored in Azure App
Configuration. The syntax is::

    config-azure://<appconfigname>[?key=<prefix>&label=<value>&<option1>=<value1>&<option2>=<value2>…]

For example, a connection string to access the Azure App Configuration
provider and connect to Oracle Database is:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-azure://aznetnamingappconfig.azconfig.io/?key=test/&azure_client_id=123-456&azure_client_secret=MYSECRET&azure_tenant_id=789-123"
    });

The parameters of the connection string URL format are detailed in the table
below.

.. list-table-with-summary:: Connection String Parameters for Azure App Centralized Configuration
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 30 10
    :name: _connection_string_for_azure_app
    :summary: The first row displays the name of the connection string parameter. The second row displays the description of the connection string parameter. The third row displays whether the connection string parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - config-azure
      - Indicates that the configuration provider is Azure App Configuration.
      - Required
    * - <appconfigname>
      - The URL of the App configuration endpoint.
      - Required
    * - key=<prefix>
      - A key prefix to identify the connection. You can organize configuration information under a prefix as per application requirements.
      - Optional
    * - label=<value>
      - The Azure App Configuration label name.
      - Optional
    * - <options>=<values>
      - .. _authmethodsazureapp:

        The authentication method and its corresponding authentication parameters to access the Azure App Configuration provider. Depending on the specified authentication method, you must also set the corresponding authentication parameters in the connection string. You can specify one of the following authentication methods:

        - **Default Azure Credential**: The authentication to Azure App Configuration is done as a service principal (using either a client secret or client certificate) or as a managed identity depending on which parameters are set. This authentication method also supports reading the parameters as environment variables. This is the default authentication method. This method is used when no authentication value is set or by setting the option value to *AZURE_DEFAULT*. The optional parameters that can be set for this option include *AZURE_CLIENT_ID*, *AZURE_CLIENT_SECRET*, *AZURE_CLIENT_CERTIFICATE_PATH*, *AZURE_TENANT_ID*, and *AZURE_MANAGED_IDENTITY_CLIENT_ID*.

        - **Service Principal with Client Secret**: The authentication to Azure App Configuration is done using the client secret. To use this method, you must set the option value to *AZURE_SERVICE_PRINCIPAL*. The required parameters that must be set for this option include *AZURE_CLIENT_ID*, *AZURE_CLIENT_SECRET*, and *AZURE_TENANT_ID*.

        - **Service Principal with Client Certificate**: The authentication to Azure App Configuration is done using the client certificate. To use this method, you must set the option value to *AZURE_SERVICE_PRINCIPAL*. The required parameters that must be set for this option are *AZURE_CLIENT_ID*, *AZURE_CLIENT_CERTIFICATE_PATH*, and *AZURE_TENANT_ID*.

        - **Managed Identity**: The authentication to Azure App Configuration is done using managed identity or managed user identity credentials. To use this method, you must set the option value to *AZURE_MANAGED_IDENTITY*. If you want to use a user-assigned managed identity for authentication, then you must specify the required parameter *AZURE_MANAGED_IDENTITY_CLIENT_ID*.

        Note that the Azure service principal with client certificate overrides Azure service principal with client secret.

        See `Authentication Parameters for Azure App Configuration Store <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1EECAD82-6CE5-4F4F-A844-C75C7AA1F907>`__ for more information.
      - Optional

.. _azurekeyvault:

Using an Azure Key Vault Centralized Configuration Provider
-----------------------------------------------------------

`Azure Key Vault <https://learn.microsoft.com/en-us/azure/key-vault/>`__ is a
cloud-based service provided by Microsoft Azure. It can be used for storage
and management of Oracle Database connection information as a JSON object.
This configuration provider support is available from node-oracledb 6.9
onwards.

To use node-oracledb with Azure Key Vault, you must:

1. Enter and save the connection information as a secret in your Azure Key
   Vault. The connection information must be stored as a JSON object. See
   :ref:`Connection Information for Azure Key Vault Centralized Configuration
   Provider <azurekeyvaultparams>`.

   For information on creating a secret, see `Create a secret in Azure Key
   Vault <https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-
   create-portal>`__.

2. Install the required Azure Application modules. See
   :ref:`azurevaultmodules`.

3. Load the :ref:`azurevault <azurevaultplugin>` plugin in your application
   using ``require('oracledb/plugins/configProviders/azurevault')``.

4. :ref:`Use an Azure Key Vault connection string URL <connstringazurevault>`
   in the ``connectString`` parameter of connection and pool creation methods.

Note that node-oracledb caches configurations by default, see
:ref:`conncaching`.

.. _azurekeyvaultparams:

**Connection Information for Azure Key Vault Configuration Provider**

The JSON object must contain a ``connect_descriptor`` key. Optionally, you can
specify the database user name, password, wallet location, and node-oracledb
properties. For details on the information that can be stored in this
configuration provider, see :ref:`_configuration_information`.

.. _exampleazurekeyvault:

The JSON object syntax for Azure Key Vault configuration provider is same as
the syntax for OCI Object Storage, see the :ref:`OCI Object Storage
<exampleociobjstorage>` example.

.. _connstringazurevault:

**Azure Key Vault Configuration Provider connectString Syntax**

You must define a connection string URL in a specific format in the
``connectString`` property of :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` to access the information stored in Azure Key
Vault. The syntax is::

    config-azurevault://<azure key vault url>?[<option1>=<value1>&<option2>=<value2>...]

For example, a connection string to access Azure Key Vault and connect to
Oracle Database is:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        connectString : "config-azurevault://https://abc.vault.azure.net/secrets/azurevaultjson?azure_client_id=123-456&azure_client_secret=MYSECRET&azure_tenant_id=789-123"
    });

The parameters of the connection string URL format are detailed in the table
below.

.. list-table-with-summary:: Connection String Parameters for Azure Key Vault
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 30 10
    :name: _connection_string_for_azure_key_vault
    :summary: The first row displays the name of the connection string parameter. The second row displays the description of the connection string parameter. The third row displays whether the connection string parameter is required or optional.

    * - Parameter
      - Description
      - Required or Optional
    * - config-azurevault
      - Indicates that the configuration provider is Azure Key Vault.
      - Required
    * - <azure secret url>
      - The unique identifier of a specific secret stored in Azure Key Vault.
      - Required
    * - <options>=<values>
      - The authentication method and its corresponding authentication parameters to access the Azure Key Vault Configuration provider.

        The same authentication methods used in Azure App Configuration provider are also used in Azure Key Vault. See :ref:`Authentication Methods in Azure App Configuration <authmethodsazureapp>`.
      - Optional

.. _conncaching:

Caching Configuration Information
---------------------------------

Node-oracledb caches configurations obtained from centralized configuration
providers. This allows you to reuse the cached configuration information which
significantly reduces the number of round-trips to the configuration provider.

You can use the :attr:`oracledb.configProviderCacheTimeout` property to
specify the number of seconds that node-oracledb should keep the information
cached. The default time is *86,400* seconds (24 hours). Once the cache
expires, node-oracledb refreshes the cache when configuration information from
the configuration provider is required.

.. _numberofthreads:

Connections, Threads, and Parallelism
=====================================

To scale and optimize your applications, it is useful to understand how
connections interact with Node.js.

.. _workerthreads:

Connections and Worker Threads
------------------------------

Node.js has four background worker threads by default (not to be confused with
the newer user space `worker_threads <https://nodejs.org/api/worker_threads.
html>`_ module). If you are using node-oracledb Thick mode and open more than
four :ref:`standalone connections <connectionhandling>` or pooled connections,
such as by increasing :attr:`pool.poolMax`, then you must increase the number
of worker threads available to node-oracledb.

.. note::

    This section on Worker thread pool sizing applies only to node-oracledb
    Thick mode. Changing ``UV_THREADPOOL_SIZE`` is not needed for node-oracledb
    when using Thin mode.

A worker thread pool that is too small can cause a decrease in
application performance,
`deadlocks <https://github.com/oracle/node-oracledb/issues/603#issuecomment-
277017313>`__, or failure in connection requests with the error
*NJS-040: connection request timeout* or *NJS-076: connection request
rejected*.

A Node.js worker thread is used by each node-oracledb Thick mode connection to
execute a database statement. Each thread will wait until all :ref:`round-trips
<roundtrips>` between node-oracledb and the database for the statement are
complete.  When an application handles a sustained number of user requests, and
database operations take some time to execute or the network is slow, then all
available threads may be held in use. This prevents other connections from
beginning work and stops Node.js from handling more user load.

The thread pool size should be equal to, or greater than, the maximum
number of connections. If the application does database and non-database
work concurrently, then additional threads could also be required for
optimal throughput.

Increase the thread pool size by setting the environment variable
`UV_THREADPOOL_SIZE <https://docs.libuv.org/en/v1.x/threadpool.html>`__
before starting Node.js. For example, on Linux your ``package.json`` may
have a script like::

    "scripts": {
        "start": "export UV_THREADPOOL_SIZE=10 && node index.js"
    },
    . . .

Or, on Windows::

    "scripts": {
        "start": "SET UV_THREADPOOL_SIZE=10 && node index.js"
    },
    . . .

With these, you can start your application with ``npm start``. This will
allow up to 10 connections to be actively excuting SQL statements in
parallel.

On non-Windows platforms, the value can also be set inside the
application. It must be set prior to any asynchronous Node.js call that
uses the thread pool::

    // !! First file executed.  Non-Windows only !!

    process.env.UV_THREADPOOL_SIZE = 10

    // ... rest of code

If you set ``UV_THREADPOOL_SIZE`` too late in the application, or try to
set it this way on Windows, then the setting will be ignored and the
default thread pool size of 4 will still be used. Note that
:meth:`pool.getStatistics()` and :meth:`pool.logStatistics()` can only give
the value of the variable, not the actual size of the thread pool created.
On Linux you can use ``pstack`` to see how many threads are actually
running. Node.js will create a small number of threads in addition to
the expected number of worker threads.

The `libuv <https://github.com/libuv/libuv>`__ library used by Node.js
12.5 and earlier limits the number of threads to 128. In Node.js 12.6
onward the limit is 1024. You should restrict the maximum number of
connections opened in an application,
that is, :ref:`poolMax <createpoolpoolattrspoolmax>`, to a value lower
than ``UV_THREADPOOL_SIZE``. If you have multiple pools, make sure the
sum of all ``poolMax`` values is no larger than ``UV_THREADPOOL_SIZE``.

.. _parallelism:

Parallelism on Each Connection
------------------------------

Oracle Database can only execute operations one at a time on each
connection. Examples of operations include ``connection.execute()``,
``connection.executeMany()``, ``connection.queryStream()``,
``connection.getDbObjectClass()``, ``connection.commit()``,
``connection.close()``, :ref:`SODA <sodaoverview>` calls, and streaming
from :ref:`Lobs <lobclass>`. Multiple connections may be in concurrent
use, but each connection can only do one thing at a time. Code will not
run faster when parallel database operations are attempted using a
single connection.

From node-oracledb 5.2, node-oracledb function calls that use a single
connection for concurrent database access will be queued in the
JavaScript layer of node-oracledb. In earlier node-oracledb versions,
locking occurred in the Oracle Client libraries, which meant many
threads could be blocked.

It is recommended to structure your code to avoid parallel operations on
a single connection. For example, avoid using ``Promise.all()`` on a
single connection. Similarly, instead of using ``async.parallel()`` or
``async.each()`` which call each of their items in parallel, use
``async.series()`` or ``async.eachSeries()``. If you want to repeat a
number of INSERT or UPDATE statements, then use
:meth:`connection.executeMany()`.

To rewrite code that uses ``Promise.all()`` you could, for example, use
a basic ``for`` loop with ``async/await`` to iterate through each
action:

.. code-block:: javascript

    async function myfunc() {
        const stmts = [
            `INSERT INTO ADRESSES (ADDRESS_ID, CITY) VALUES (94065, 'Redwood Shores')`,
            `INSERT INTO EMPLOYEES (ADDRESS_ID, EMPLOYEE_NAME) VALUES (94065, 'Jones')`
        ];

        for (const s of stmts) {
            await connection.execute(s);
        }
    }

If you use ESlint for code validation, and it warns about `await in
loops <https://eslint.org/docs/rules/no-await-in-loop>`__ for code that
is using a single connection, then disable the ``no-await-in-loop`` rule
for these cases.

Another alternative rewrite for ``Promise.all()`` is to wrap the SQL
statements in a single PL/SQL block.

Note that using functions like ``Promise.all()`` to fetch rows from
:ref:`nested cursor result sets <nestedcursors>` can result in
inconsistent data.

During development, you can set :attr:`oracledb.errorOnConcurrentExecute`
to *true* to help identify application code that executes concurrent
database operations on a single connection. Such uses may be logic
errors such as missing ``await`` keywords that could lead to unexpected
results. When ``errorOnConcurrentExecute`` is set to *true*, an error
will be thrown so you can identify offending code. Setting
``errorOnConcurrentExecute`` is not recommended for production use in
case it generates errors during normal operation. For example
third-party code such as a framework may naturally use ``Promise.all()``
in its generic code. Or your application may be coded under the
assumption that node-oracledb will do any necessary serialization. Note
the use of ``errorOnConcurrentExecute`` will not affect parallel use of
multiple connections, which may all be in use concurrently, and each of
which can be doing a single operation.

.. _appcontext:

Application Contexts
====================

An application context stores user-specific information on the database that
can enable or prevent a user from accessing data. See `About Application
Contexts <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
6745DB10-F540-45D7-9761-9E8F342F1435>`__ in the Oracle Database documentation.
Node-oracledb supports application contexts from version 6.9 onwards.

An application context has a namespace and a key-value pair. The namespace
*CLIENTCONTEXT* is reserved for use with client session-based application
contexts. Single or multiple application context values can be set when
connecting to the database by using the
:ref:`appContext <getconnectiondbattrsappcontext>` property in
:meth:`oracledb.getConnection()` in both node-oracledb Thin and Thick modes.
You must use an array of arrays to set this property value where each array
element contains string values for the application context ``namespace``,
``name``, and ``value``. For example:

.. code-block:: javascript

    const APP_CTX_NAMESPACE = 'CLIENTCONTEXT';

    const APP_CTX_ENTRIES = [
      [ APP_CTX_NAMESPACE, 'ATTR1', 'VALUE1' ],
      [ APP_CTX_NAMESPACE, 'ATTR2', 'VALUE2' ],
      [ APP_CTX_NAMESPACE, 'ATTR3', 'VALUE3' ],
    ];

    const connection = await oracledb.getConnection({
      user: "hr",
      password: mypw, // contains the hr schema password
      connectString: "mydbmachine.example.com/orclpdb1",
      appContext: APP_CTX_ENTRIES
    });

Application context values set during connection creation can be directly
queried in your applications.

.. code-block:: javascript

    for (const entry of APP_CTX_ENTRIES) {
      const result = await connection.execute(
        `SELECT sys_context(:1, :2) FROM dual`,
        [entry[0], entry[1]] // The bind value with namespace and name
      );
      console.log('The appcontext value is:', result.rows[0][0]);
    }

This query prints::

    The appcontext value is: VALUE1
    The appcontext value is: VALUE2
    The appcontext value is: VALUE3

See `appcontext.js <https://github.com/oracle/node-oracledb/tree/main/
examples/appcontext.js>`__ for a runnable example.

In Thin mode, you can set the application context for pooled connections by
using the :ref:`appContext <createpoolpoolattrsappcontext>` property in
:meth:`oracledb.createPool()`.

You can use application contexts to set up restrictive policies that are
automatically applied to any query executed. See `Oracle Virtual Private
Database (VPD) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
06022729-9210-4895-BF04-6177713C65A7>`__ in the Oracle Database documentation.

Note that :ref:`Database Resident Connection Pooling (DRCP) <drcp>` does not
support setting or working with application contexts. You also cannot set
application contexts with application-side connection pools in Thick mode.
The application context setting is ignored in these cases.

.. _pooled-connections:
.. _connpooling:

Connection Pooling
==================

Connection pooling significantly improves application performance and
scalability, allows resource sharing, and lets applications use advanced
Oracle High Availability features.

The pooling solutions available to node-oracledb applications are:

- :ref:`Driver Connection Pools <driverconnpool>`: These pools are managed by
  the driver layer. They provide readily available database connections that
  can be shared by multiple users and are quick for applications to obtain.
  They help make applications scalable and highly available. They are created
  with :meth:`oracledb.createPool()`.

  The main use case is for applications that hold connections for relatively
  short durations while doing database work, and that acquire and release
  connections back to the pool as needed to do those database operations.
  Using a driver pool is recommended for applications that need to support
  multiple users. High availability benefits also make driver pools useful for
  single-user applications that do infrequent database operations.

- :ref:`drcp`: The pooling of server processes on the database host so they
  can be shared between application connections. This reduces the number of
  server processes that the database host needs to manage.

  DRCP is useful if there are large number of application connections,
  typically from having multiple application processes, and those applications
  do frequent connection acquire and release calls as needed to do database
  operations.  It is recommended to use DRCP in conjunction with a driver
  connection pool, since this reduces the number of re-authentications and
  session memory re-allocations.

- `Proxy Resident Connection Pooling (PRCP)
  <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E0032017-03B1-
  4F14-AF9B-BCC87C982DA8>`__: Connection pooling is handled by a dedicated
  mid-tier connection proxy, `CMAN-TDM <https://download.oracle.com/
  ocomdocs/global/CMAN_TDM_Oracle_DB_Connection_Proxy_for_scalable_
  apps.pdf>`__.

  This is useful for applications taking advantage of CMAN-TDM.

- :ref:`implicitpool`: This can add pooling benefits to applications that
  connect when they start, and only close the connection when the application
  terminates — but relatively infrequently do database work. It makes use of
  DRCP or PRCP, but instead of relying on the application to explicitly acquire
  and release connections, Implicit Connection Pooling automatically detects
  when applications are not performing database work. It then allows the
  associated database server process to be used by another connection that
  needs to do a database operation. Implicit Connection Pooling is available
  from Oracle Database 23ai onwards.

  Implicit Connection Pooling is useful for legacy applications or third-party
  code that cannot be updated to use a driver connection pool.

Node-oracledb :ref:`driver connection pools <driverconnpool>` are the first
choice for performance, scalability, and high availability. If your database
is under memory pressure from having too many applications opening too many
connections, then consider either :ref:`DRCP <drcp>` or :ref:`Implicit
Connection Pooling <implicitpool>`, depending on your application’s
connection life-cycle. If you are utilizing CMAN-TDM, then using `PRCP
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
E0032017-03B1-4F14-AF9B-BCC87C982DA8>`__ can be considered.

.. _driverconnpool:

Driver Connection Pooling
-------------------------

Node-oracledb's driver connection pooling lets applications create and
maintain a pool of open connections to the database. Connection pooling is
available in both Thin and :ref:`Thick <enablingthick>` modes. Connection
pooling is important for performance and scalability when applications need to
handle a large number of users who do database work for short periods of time
but have relatively long periods when the connections are not needed. The high
availability features of pools also make small pools useful for applications
that want a few connections available for infrequent use and requires them to
be immediately usable when acquired. Applications that would benefit from
connection pooling but are too difficult to modify from the use of
:ref:`standalone connections <standaloneconnection>` can take advantage of
:ref:`implicitpool`.

Each node-oracledb process can use one or more connection pools. Each pool can
contain zero or more connections. In addition to providing an immediately
available set of connections, pools provide :ref:`dead connection detection
<connpoolpinging>` and transparently handle Oracle Database :ref:`High
Availability events <connectionha>`. This helps shield applications during
planned maintenance and from unplanned failures.

In node-oracledb Thick mode, the pool implementation uses Oracle's `session
pool technology <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
F9662FFB-EAEF-495C-96FC-49C6D1D9625C>`__ which supports additional Oracle
Database features for example some advanced :ref:`high availability
<connectionha>` features.

Creating a Connection Pool
++++++++++++++++++++++++++

A driver connection pool is created by calling :meth:`oracledb.createPool()`.
Generally, applications will create a pool once as part of initialization.
Various pool settings can be specified as described in
:meth:`~oracledb.createPool()`.

For example, to create a pool that initially contains one connection but can
grow up to five connections:

.. code-block:: javascript

    const pool = await oracledb.createPool({
      user          : "hr",
      password      : mypw,  // mypw contains the hr schema password
      connectString : "localhost/FREEPDB1",
      poolIncrement: 1,
      poolMin: 1,
      poolMax: 5
    });

Note that in node-oracledb Thick mode, the number of
:ref:`worker threads <workerthreads>` should be sized correctly before
creating a pool.

The default value of :attr:`~oracledb.poolMin` is *0*, meaning no connections
are created when :meth:`oracledb.createPool()` is called. This means the
credentials and connection string are not validated when the pool is created,
and so problems such as invalid passwords will not return an error.
Credentials will be validated when a connection is later created, for example
with :meth:`pool.getConnection()`. Validation will occur when
:meth:`~oracledb.createPool()` is called if :attr:`~oracledb.poolMin` is
greater or equal to *1*, since this creates one or more connections when the
pool is started.

During runtime, some pool properties can be changed with
:meth:`pool.reconfigure()`.

A connection pool should be started during application initialization,
for example before the web server is started:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ...  // set mypw to the hr schema password

    // Start a connection pool (which becomes the default pool) and start the webserver
    async function init() {
        try {

            await oracledb.createPool({
                user          : "hr",
                password      : mypw,               // mypw contains the hr schema password
                connectString : "localhost/FREEPDB1",
                poolIncrement : 0,
                poolMax       : 4,
                poolMin       : 4
            });

            const server = http.createServer();
            server.on('error', (err) => {
                console.log('HTTP server problem: ' + err);
            });
            server.on('request', (request, response) => {
                handleRequest(request, response);
            });
            await server.listen(3000);

            console.log("Server is running");

        } catch (err) {
            console.error("init() error: " + err.message);
        }
    }

Each web request will invoke ``handleRequest()``. In it, a connection
can be obtained from the pool and used:

.. code-block:: javascript

    async function handleRequest(request, response) {

        response.writeHead(200, {"Content-Type": "text/html"});
        response.write("<!DOCTYPE html><html><head><title>My App</title></head><body>");

        let connection;
        try {

            connection = await oracledb.getConnection();  // get a connection from the default pool
            const result = await connection.execute(`SELECT * FROM locations`);

            displayResults(response, result);  // do something with the results

        } catch (err) {
            response.write("<p>Error: " + text + "</p>");
        } finally {
            if (connection) {
                try {
                    await connection.close();  // always release the connection back to the pool
                } catch (err) {
                    console.error(err);
                }
            }
        }

        response.write("</body></html>");
        response.end();

    }

See `webapp.js <https://github.com/oracle/node-oracledb/tree/main/examples/
webapp.js>`__ for a runnable example.

Getting Connections From a Pool
+++++++++++++++++++++++++++++++

After a pool has been created, your application can get a connection from it
by calling :meth:`pool.getConnection()`:

.. code-block:: javascript

    const connection = await pool.getConnection();

If all connections in a pool are being used, then
subsequent ``getConnection()`` calls will be put in
a :ref:`queue <connpoolqueue>` until a connection is available.

Each connection in a pool should be used for a given unit of work, such as a
transaction or a set of sequentially executed statements. Statements should be
:ref:`executed sequentially, not in parallel <numberofthreads>` on each
connection. For example:

.. code-block:: javascript

    const oracledb = require('oracledb');

    const mypw = ...  // set mypw to the hr schema password

    async function run() {
        try {
            await oracledb.createPool({
                user          : "hr",
                password      : mypw  // mypw contains the hr schema password
                connectString : "localhost/FREEPDB1"
            });

            let connection;
            try {
                // get connection from the pool and use it
                connection = await oracledb.getConnection();
                result = await connection.execute(`SELECT last_name FROM employees`);
                console.log("Result is:", result);
            } catch (err) {
                throw (err);
            } finally {
                if (connection) {
                    try {
                        await connection.close(); // Put the connection back in the pool
                    } catch (err) {
                        throw (err);
                    }
                }
            }
        } catch (err) {
            console.error(err.message);
        } finally {
            await oracledb.getPool().close(0);
        }
    }

    run();

Closing a Connection Pool
+++++++++++++++++++++++++

After an application finishes using a connection pool, it should release all
connections and terminate the connection pool by calling the
:meth:`pool.close()` method:

.. code-block:: javascript

    await pool.close();

Ensure that all the connections in all code paths including error handlers
are released back to the pool.

When a connection is released back to its pool, any ongoing transaction
will be :ref:`rolled back <transactionmgt>` however it will retain session
state, such as :ref:`NLS <nls>` settings from ALTER SESSION statements.
See :ref:`Connection Tagging and Session State <connpooltagging>` for more
information.

Connections can also be :ref:`dropped completely from the
pool <connectionclose>`.

.. _conpoolsizing:

Connection Pool Sizing
----------------------

The main characteristics of a connection pool are determined by its
attributes :attr:`~pool.poolMin`, :attr:`~pool.poolMax`,
:attr:`~pool.poolIncrement`, and :attr:`~pool.poolTimeout`.

.. note::

    Note in node-oracledb Thick mode, the number of worker threads should be
    sized correctly before creating a pool. See :ref:`Connections and Worker
    Threads <workerthreads>`

Setting ``poolMin`` causes the specified number of connections to be
established to the database during pool creation. This allows subsequent
``pool.getConnection()`` calls to return quickly for an initial set of
users. An appropriate ``poolMax`` value avoids overloading the database
by limiting the maximum number of connections ever opened.

Pool expansion happens when :meth:`pool.getConnection()`
is called and both the following are true:

-  all the currently established connections in the pool are “checked
   out” of the pool by previous ``pool.getConnection()`` calls

-  the number of those currently established connections is less than
   the pool’s ``poolMax`` setting

Pool shrinkage happens when the application returns connections to the pool,
and they are then unused for more than :attr:`~oracledb.poolTimeout`
seconds. Any excess connections above ``poolMin`` will be closed. When
node-oracledb Thick mode is using using Oracle Client 19 or earlier, this pool
shrinkage is only initiated when the pool is accessed, so a pool in a
completely idle application will not shrink.

For pools created with :ref:`External Authentication <extauth>`, with
:ref:`homogeneous <createpoolpoolattrshomogeneous>` set to *false*, or
when using :ref:`Database Resident Connection Pooling (DRCP) <drcp>`, then
the number of connections initially created is zero even if a larger
value is specified for ``poolMin``. Also in these cases the pool
increment is always 1, regardless of the value of
:ref:`poolIncrement <createpoolpoolattrspoolincrement>`. Once the
number of open connections exceeds ``poolMin`` then the number of open
connections does not fall below ``poolMin``.

The Oracle Real-World Performance Group’s recommendation is to use fixed
size connection pools. The values of ``poolMin`` and ``poolMax`` should
be the same. This avoids connection storms which can decrease
throughput. See `Guideline for Preventing Connection Storms: Use Static
Pools <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7DFBA826
-7CC0-4D16-B19C-31D168069B54>`__, which contains more details about sizing of
pools. Having a fixed size will guarantee that the database can handle the
upper pool size. For example, if a pool needs to grow but the database
resources are limited, then ``pool.getConnection()`` may return errors such
as `ORA-28547 <https://docs.oracle.com/error-help/db/ora-28547/>`__. With a
fixed pool size, this class of error will occur when the pool is created,
allowing you to change the size before users access the application. With a
dynamically growing pool, the error may occur much later after the pool has
been in use for some time.

The Real-World Performance Group also recommends keeping pool sizes
small, as this may perform better than larger pools. Use
:meth:`pool.getStatistics()` or :meth:`pool.logStatistics()` to monitor pool
usage. The pool attributes should be adjusted to handle the desired workload
within the bounds of resources available to Node.js and the database.

When the values of ``poolMin`` and ``poolMax`` are the same, ``poolIncrement``
can be set greater than zero. (In Thick mode this needs Oracle Client 18c or
later).  This value changes how a :ref:`homogeneous pool
<createpoolpoolattrshomogeneous>` grows when the number of :attr:`connections
established <pool.connectionsOpen>` has become lower than ``poolMin``, for
example if network issues have caused connections to become unusable and they
have been dropped from the pool. Setting ``poolIncrement`` greater than 1 in
this scenario means the next ``pool.getConnection()`` call that needs to grow
the pool will initiate the creation of multiple connections. That
``pool.getConnection()`` call will not return until the extra connections have
been created, so there is an initial time cost. However it can allow subsequent
connection requests to be immediately satisfied. In this growth scenario, a
``poolIncrement`` of 0 is treated as 1.

The optional pool creation property
:ref:`maxLifetimeSession <createpoolpoolattrsmaxlifetimesession>` also allows
pools to shrink. This property bounds the total length of time that a
connection can exist in a pool after first being created. It is mostly used
for defensive programming to mitigate against unforeseeable problems that may
occur with connections. If a connection was created ``maxLifetimeSession`` or
longer seconds ago, then it will be a candidate for being closed.

In node-oracledb Thick mode, Oracle Client libraries 12.1, or later, are
needed to use
:ref:`maxLifetimeSession <createpoolpoolattrsmaxlifetimesession>`. Note that
when using node-oracledb in Thick mode with Oracle Client libraries prior to
21c, pool shrinkage is only initiated when the pool is accessed. So, pools in
fully dormant applications will not shrink until the application is next used.

If both :ref:`poolTimeout <createpoolpoolattrspooltimeout>` and
:ref:`maxLifetimeSession <createpoolpoolattrsmaxlifetimesession>` properties
are set on a pooled connection, the connection will be terminated if either
the idle timeout happens or the ``maxLifeTimeSession`` setting is exceeded.
In this case, if connections are idle for more than
:ref:`poolTimeout <createpoolpoolattrspooltimeout>`, they are dropped only
when doing so will ensure that :attr:`pool.connectionsOpen` is more than or
equal to the :attr:`~pool.poolMin` setting. If the connection lifetime
exceeds :ref:`maxLifetimeSession <createpoolpoolattrsmaxlifetimesession>`
seconds, it is dropped and a new connection is created in the pool.

Connection pool health can be impacted by firewalls, `resource manager <https:
//www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2BEF5482-CF97-4A85-BD90
-9195E41E74EF>`__, or user profile `IDLE_TIME <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__
values. For best efficiency, ensure these do not expire idle connections since
this will require connections to be recreated which will impact performance
and scalability. See :ref:`Preventing Premature Connection Closing
<connectionpremclose>`.

.. _conpooldraining:

Connection Pool Closing and Draining
------------------------------------

Closing a connection pool allows database resources to be freed. If
Node.js is killed without :meth:`pool.close()` being called
successfully, then some time may pass before the unused database-side of
connections are automatically cleaned up in the database.

When ``pool.close()`` is called with no parameter, the pool will be
closed only if all connections have been released to the pool with
``connection.close()``. Otherwise an error is returned and the pool will
not be closed.

An optional ``drainTime`` parameter can be used to force the pool closed
even if connections are in use. This lets the pool be ‘drained’ of
connections. The ``drainTime`` indicates how many seconds the pool is
allowed to remain active before it and its connections are terminated.
For example, to give active connections 10 seconds to complete their
work before being terminated:

.. code-block:: javascript

    await pool.close(10);

When a pool has been closed with a specified ``drainTime``, then any new
``pool.getConnection()`` calls will fail. If connections are currently
in use by the application, they can continue to be used for the
specified number of seconds, after which the pool and all open
connections are forcibly closed. Prior to this time limit, if there are
no connections currently “checked out” from the pool with
``getConnection()``, then the pool and its connections are immediately
closed.

In network configurations that drop (or in-line) out-of-band breaks,
forced pool termination may hang unless you have `DISABLE_OOB=ON
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-42E939DC-
EF37-49A0-B4F0-14158F0E55FD>`__
in a `sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__ file, see
:ref:`Optional Oracle Net Configuration <tnsadmin>`.

Non-zero ``drainTime`` values are recommended so that applications have the
opportunity to gracefully finish database operations. However, pools can
be forcibly closed by specifying a zero drain time:

.. code-block:: javascript

    await pool.close(0);

Closing the pool would commonly be one of the last stages of a Node.js
application. A typical closing routine look likes:

.. code-block:: javascript

    // Close the default connection pool with 10 seconds draining, and exit
    async function closePoolAndExit() {
        console.log("\nTerminating");
        try {
            await oracledb.getPool().close(10);
            process.exit(0);
        } catch(err) {
            console.error(err.message);
            process.exit(1);
        }
    }

It is helpful to invoke ``closePoolAndExit()`` if Node.js is sent a
signal or interrupted:

.. code-block:: javascript

    // Close the pool cleanly if Node.js is interrupted
    process
        .once('SIGTERM', closePoolAndExit)
        .once('SIGINT',  closePoolAndExit);

If ``pool.close()`` is called while a :meth:`pool.reconfigure()` is taking
place, then an error will be thrown.

.. _connpoolcache:

Connection Pool Caching
-----------------------

When pools are created, they can be given a named alias. The alias can
later be used to retrieve the related pool object for use. This
facilitates sharing pools across modules and simplifies getting
connections.

Pools are added to the cache by using a
:ref:`poolAlias <createpoolpoolattrspoolalias>` property in the
:ref:`poolAttrs <createpoolpoolattrs>` object:

.. code-block:: javascript

    async function init() {
    try {
        await oracledb.createPool({ // no need to store the returned pool
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            poolAlias: 'hrpool'
        });

        // do stuff
        . . .

        // get the pool from the cache and use it
        const pool = oracledb.getPool('hrpool');
        . . .
    }

There can be multiple pools in the cache if each pool is created with a
unique alias.

If a pool is created without providing a pool alias:

-  If no other pool in the cache already has the alias of ‘default’,
   then the new pool will be cached using the
   :attr:`pool.poolAlias` ‘default’.

   This pool is used by default in methods that utilize the connection
   pool cache.

-  If an existing pool in the cache already has the alias ‘default’,
   then :attr:`pool.poolAlias` of the new pool will
   be undefined and the pool will be not stored in the pool cache. The
   application must retain a variable for subsequent pool use:
   ``const pool = await oracledb.createPool({   . . . })``.

Methods that can affect or use the connection pool cache include:

- :meth:`oracledb.createPool()`: Can add a pool to the cache.
- :meth:`oracledb.getPool()`: Retrieves a pool from the cache.
- :meth:`oracledb.getConnection()`: Can use a pool in the cache to retrieve
  connections.
- :meth:`pool.close()`: Automatically removes a pool from the cache.

Using the Default Pool
++++++++++++++++++++++

Assuming the connection pool cache is empty, the following will create a
new pool and cache it using the pool alias ‘default’:

.. code-block:: javascript

    async function init() {
        try {
            await oracledb.createPool({
                user: 'hr',
                password: mypw,  // mypw contains the hr schema password
                connectString: 'localhost/FREEPDB1'
            });

            . . .
    }

If you are using callbacks, note that ``createPool()`` is not
synchronous.

Connections can be returned by using the shortcut to
:meth:`oracledb.getConnection()` that returns a
connection from a pool:

.. code-block:: javascript

    const connection = await oracledb.getConnection();

    . . . // Use connection from the previously created 'default' pool

    await connection.close(); // always release the connection back to the pool

The default pool can also be retrieved using :meth:`oracledb.getPool()`
without passing the ``poolAlias`` parameter:

.. code-block:: javascript

    const pool = oracledb.getPool();
    console.log(pool.poolAlias); // 'default'
    const connection = await pool.getConnection();

    . . . // Use connection

    await connection.close();

Using Multiple Pools
++++++++++++++++++++

If the application needs to use more than one pool at a time, unique
pool aliases can be used when creating the pools:

.. code-block:: javascript

    await oracledb.createPool({
        user: 'hr',
        password: myhrpw,  // myhrpw contains the hr schema password
        connectString: 'localhost/FREEPDB1',
        poolAlias: 'hrpool'
    });

    await oracledb.createPool({
        user: 'sh',
        password: myshpw,  // myshpw contains the sh schema password
        connectString: 'localhost/FREEPDB1',
        poolAlias: 'shpool'
    });

    . . .

To get a connection from a pool, pass the pool alias:

.. code-block:: javascript

    const connection = await oracledb.getConnection('hrpool');

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

From node-oracledb 3.1.0 you can alternatively pass the alias as an
attribute of the options:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'hrpool' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

The presence of the ``poolAlias`` attribute indicates the previously
created connection pool should be used instead of creating a standalone
connection. This syntax is useful when you want to pass other attributes
to a pooled ``getConnection()`` call, such as for :ref:`proxy
connections <connpoolproxy>` or with :ref:`connection
tagging <connpooltagging>`:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'hrpool', tag: 'loc=cn;p=1' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

To use the default pool in this way you must explicitly pass the alias
``default``:

.. code-block:: javascript

    const connection = await oracledb.getConnection({ poolAlias: 'default', tag: 'loc=cn;p=1' });

    . . . // Use connection from the pool

    await connection.close(); // always release the connection back to the pool

A specific pool can be retrieved from the cache by passing its pool
alias to :meth:`oracledb.getPool()`:

.. code-block:: javascript

    const pool = oracledb.getPool('hrpool');
    const connection = await pool.getConnection();

    . . . // Use connection from the pool

    await connection.close();

.. _connpoolqueue:

Connection Pool Queue
---------------------

The number of users that can concurrently do database operations is
limited by the number of connections in the pool. The maximum number of
connections is :attr:`~oracledb.poolMax`. Node-oracledb queues
any additional ``pool.getConnection()`` requests to prevent users from
immediately getting an error that the database is not available. The
connection pool queue allows applications to gracefully handle more
users than there are connections in the pool, and to handle connection
load spikes without having to set ``poolMax`` too large for general
operation.

If the application has called :meth:`pool.getConnection()` (or
:meth:`oracledb.getConnection()` calls that use a pool) enough times so that
all connections in the pool are in use, and further ``getConnection()`` calls
are made, then each of those new ``getConnection()`` requests will be queued
and will not return until an in-use connection is released back to the pool
with :meth:`connection.close()`. If, instead, ``poolMax`` has not been reached,
then the additional connection requests can be immediately satisfied and are
not queued.

The amount of time that a queued request will wait for a free connection
can be configured with :attr:`~oracledb.queueTimeout`. When
connections are timed out of the queue, the ``pool.getConnection()``
call returns the error *NJS-040: connection request timeout* to the
application.

If more than :attr:`oracledb.queueMax` pending
connection requests are in the queue, then ``pool.getConnection()``
calls will immediately return an error *NJS-076: connection request
rejected. Pool queue length queueMax reached* and will not be queued.
Use this to protect against connection request storms. The setting helps
applications return errors early when many connections are requested
concurrently. This avoids connection requests blocking (for up to
:attr:`~oracledb.queueTimeout` seconds) while waiting an
available pooled connection. It lets you see when the pool is too small.

You may also experience *NJS-040* or *NJS-076* errors if your application is
not correctly closing connections, or if are using node-oracledb Thick mode and
:ref:`UV_THREADPOOL_SIZE <numberofthreads>` is too small.

.. _connpoolmonitor:

Connection Pool Monitoring
--------------------------

Connection pool usage should be monitored to choose the appropriate
settings for your workload. If the current settings are non optimal,
then :meth:`pool.reconfigure()` can be called to alter
the configuration.

Pool attributes :attr:`~pool.connectionsInUse` and
:attr:`~pool.connectionsOpen` always provide basic
information about an active pool:

.. code-block:: javascript

    const pool = await oracledb.createPool(...);

    . . .

    console.log(pool.connectionsOpen);   // how big the pool actually is
    console.log(pool.connectionsInUse);  // how many of those connections are held by the application

Statistics are calculated from the time the pool was created, or since
:meth:`pool.reconfigure()` was used to reset the statistics.

The recording of :ref:`pool queue <connpoolqueue>` statistics, pool
settings, and related environment variables can be enabled by setting
``enableStatistics`` to *true* when using :meth:`oracledb.createPool()` or
:meth:`pool.reconfigure()`.

To enable recording of statistics when creating the pool:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        enableStatistics : true,   // default is false
        user             : "hr",
        password         : mypw,   // mypw contains the hr schema password
        connectString    : "localhost/FREEPDB1"
    });
    . . .

Statistics can alternatively be enabled on a running pool with:

.. code-block:: javascript

    await pool.reconfigure({ enableStatistics: true });

Applications can then get the current statistics by calling
:meth:`pool.getStatistics()` which returns a
:ref:`PoolStatistics Class <poolstatisticsclass>` object. Attributes of
the object can be accessed individually for your tracing requirements.
The complete statistics can be printed by calling
:meth:`poolstatistics.logStatistics()`.

.. code-block:: javascript

    const poolstatistics = pool.getStatistics();

    console.log(poolstatistics.currentQueueLength);  // print one attribute
    poolstatistics.logStatistics();                  // print all statistics to the console

Alternatively the statistics can be printed directly by calling
:meth:`pool.logStatistics()`.

.. code-block:: javascript

    pool.logStatistics();    // print all statistics to the console

The output of :meth:`poolstatistics.logStatistics()` and
:meth:`pool.logStatistics()` is identical.

For efficiency, the minimum, maximum, average, and sum of times in the
pool queue are calculated when requests are removed from the queue. They
include times for connection requests that were dequeued when a pool
connection became available, and also for connection requests that timed
out. They do not include times for connection requests still waiting in
the queue.

The sum of ‘requests failed’, ‘requests exceeding queueMax’, and
‘requests exceeding queueTimeout’ is the number of
``pool.getConnection()`` calls that failed.

The :ref:`PoolStatistics object <poolstatisticsclass>` and ``logStatistics()``
function record the following:

.. _poolstats:

.. list-table-with-summary:: PoolStatistics Class Attribute and Equivalent ``logStatistics()`` Label
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the pool statistics attribute. The second column displays the logStatistics() label. The third column displays the description of the attribute.

    * - :ref:`Pool Statistics Class <poolstatisticsclass>` Attribute
      - ``logStatistics()`` Label
      - Description
    * - ``thin``
      - thin mode
      - Indicates whether the driver is in Thin or Thick mode.
    * - ``gatheredDate``
      - gathered at
      - The time the statistics were taken.
    * - ``upTime``
      - up time (milliseconds)
      - The number of milliseconds since this pool was created.
    * - ``upTimeSinceReset``
      - up time from last reset (milliseconds)
      - The number of milliseconds since the statistics were initialized or reset.
    * - ``connectionRequests``
      - connection requests
      - The number of ``getConnection()`` requests made to this pool.
    * - ``requestsEnqueued``
      - requests enqueued
      - The number of ``getConnection()`` requests that were added to this pool’s queue (waiting for the application to return an in-use connection to the pool) because every connection in this pool was already being used.
    * - ``requestsDequeued``
      - requests dequeued
      - The number of ``getConnection()`` requests that were dequeued when a connection in this pool became available for use.
    * - ``failedRequests``
      - requests failed
      - The number of getConnection() requests that failed due to an Oracle Database error. Does not include :attr:`~oracledb.queueMax` or :attr:`~oracledb.queueTimeout` errors.
    * - ``rejectedRequests``
      - requests exceeding queueMax
      - The number of getConnection() requests rejected because the number of connections in the pool queue exceeded the :attr:`~oracledb.queueMax` limit.
    * - ``requestTimeouts``
      - requests exceeding queueTimeout
      - The number of queued getConnection() requests that were timed out from the pool queue because they exceeded the :attr:`~oracledb.queueTimeout` time.
    * - ``currentQueueLength``
      - current queue length
      - The current number of ``getConnection()`` requests that are waiting in the pool queue.
    * - ``maximumQueueLength``
      - maximum queue length
      - The maximum number of ``getConnection()`` requests that were ever waiting in the pool queue at one time.
    * - ``timeInQueue``
      - sum of time in queue (milliseconds)
      - The sum of the time (milliseconds) that dequeued requests spent in the pool queue.
    * - ``minimumTimeInQueue``
      - minimum time in queue (milliseconds)
      - The minimum time (milliseconds) that any dequeued request spent in the pool queue.
    * - ``maximumTimeInQueue``
      - maximum time in queue (milliseconds)
      - The maximum time (milliseconds) that any dequeued request spent in the pool queue.
    * - ``averageTimeInQueue``
      - average time in queue (milliseconds)
      - The average time (milliseconds) that dequeued requests spent in the pool queue.
    * - ``connectionsInUse``
      - :attr:`pool connections in use <pool.connectionsInUse>`
      - The number of connections from this pool that ``getConnection()`` returned successfully to the application and have not yet been released back to the pool.
    * - ``connectionsOpen``
      - :attr:`pool connections open <pool.connectionsOpen>`
      - The number of idle or in-use connections to the database that the pool is currently managing.
    * - ``connectString``
      - :attr:`~pool.connectString`
      - The connection string that is used to connect to the Oracle Database instance.
    * - ``edition``
      - :attr:`~pool.edition`
      - The edition name used.
    * - ``events``
      - :attr:`~pool.events`
      - Denotes whether the Oracle Client events mode is enabled or not.
    * - ``externalAuth``
      - :attr:`~pool.externalAuth`
      - Denotes whether connections are established using external authentication or not.
    * - ``homogeneous``
      - :attr:`~pool.homogeneous`
      - Identifies whether the connections in the pool all have the same credentials (a ‘homogenous’ pool), or whether different credentials can be used (a ‘heterogeneous’ pool).
    * - ``poolAlias``
      - :attr:`~pool.poolAlias`
      - The alias of this pool in the connection pool cache.
    * - ``poolIncrement``
      - :attr:`~pool.poolIncrement`
      - The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
    * - ``poolMax``
      - :attr:`~pool.poolMax`
      - The maximum number of connections that can be open in the connection pool.
    * - ``poolMaxPerShard``
      - :attr:`~pool.poolMaxPerShard`
      - The maximum number of connections in the pool that can be used for any given shard in a sharded database.
    * - ``poolMin``
      - :attr:`~pool.poolMin`
      - The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
    * - ``poolPingInterval``
      - :attr:`poolPingInterval (seconds) <pool.poolPingInterval>`
      - The maximum number of seconds that a connection can remain idle in a connection pool before node-oracledb pings the database prior to returning that connection to the application.
    * - ``poolPingTimeout``
      - :attr:`poolPingTimeout (milliseconds) <pool.poolPingTimeout>`
      - The number of milliseconds that a connection should wait for a response from :meth:`connection.ping()`.
    * - ``poolTimeout``
      - :attr:`poolTimeout (seconds) <pool.poolTimeout>`
      - The time (in seconds) after which the pool terminates idle connections (unused in the pool).
    * - ``maxLifetimeSession``
      - :attr:`maxLifetimeSession (seconds) <pool.maxLifetimeSession>`
      - The time (in seconds) that a pooled connection can exist in a pool after first being created.
    * - ``queueMax``
      - :attr:`~pool.queueMax`
      - The maximum number of pending :meth:`pool.getConnection()` calls that can be queued.
    * - ``queueTimeout``
      - :attr:`queueTimeout (milliseconds) <pool.queueTimeout>`
      - The time (in milliseconds) that a connection request should wait in the queue before the request is terminated.
    * - ``sessionCallback``
      - :attr:`~pool.sessionCallback`
      - The Node.js or PL/SQL function that is invoked by :meth:`pool.getConnection()` when the connection is brand new.
    * - ``sodaMetaDataCache``
      - :attr:`~pool.sodaMetaDataCache`
      - Determines whether the pool has a metadata cache enabled for SODA collection access.
    * - ``stmtCacheSize``
      - :attr:`~pool.stmtCacheSize`
      - The number of statements to be cached in the statement cache of each connection.
    * - ``user``
      - :attr:`~pool.user`
      - The database username for connections in the pool.
    * - ``threadPoolSize``
      - UV_THREADPOOL_SIZE
      - The value of :ref:`process.env.UV_THREADPOOL_SIZE <numberofthreads>` which is the number of worker threads for this process. Note this shows the value of the variable, however if this variable was set after the thread pool started, the thread pool will still be the default size of 4.

        This attribute only affects the node-oracledb Thick mode.

.. _connpoolpinging:

Connection Pool Pinging
-----------------------

When a connection is aquired from a pool with ``getConnection()``,
node-oracledb does some internal checks to validate if the about-to-be-returned
connection is usable.  If it is not usable, node-oracledb can replace it with a
different connection before returning this to the application.

Connections may become unusable for various reasons including network dropouts,
database instance failures, session termination from the database `resource
manager <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
2BEF5482-CF97-4A85-BD90-9195E41E74EF>`__ or user resource profile `IDLE_TIME
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__, or from a DBA issuing an ``ALTER
SYSTEM KILL SESSION`` command.

By default, idle connections in the pool are unaware of these events. So, a
``getConnection()`` call could return an unusable connection to the application
and errors would only occur when it is later used.  The internal pool
validation checks help provide tolerance against this situation so that
statement execution using a connection is more likely to succeed.

Each time ``getConnection()`` is called, a lightweight connection validity
check occurs. (In node-oracledb Thick mode, this requires Oracle Client library
version 12.2 or later).  The lightweight check allows node-oracledb to detect
and replace connections that have become unusable due to some network errors.

An additional internal check performed by ``getConnection()`` can be configured
during pool creation.  This extra check helps detect errors such as the
connection having exceeded the user profile resource limits, or from an
explicit session closure from a DBA.  This extra check performs a
:ref:`round-trip <roundtrips>` ping to the database which impacts performance.
So, it is not done for each ``getConnection()`` call by default.

The frequency of pinging can be controlled with the
:attr:`oracledb.poolPingInterval` property or during :ref:`pool creation
<createpoolpoolattrspoolpinginterval>` to meet your quality of service
requirements.

The default :attr:`~oracledb.poolPingInterval` value is 60 seconds, which is
suitable for most active applications. Possible values are:

.. list-table-with-summary::  ``poolPingInterval`` Value
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 40
    :summary: The first column displays the poolPingInterval value. The second column displays the behavior of a pool getConnection() call.

    * - ``poolPingInterval`` Value
      - Behavior of a Pool ``getConnection()`` Call
    * - ``n`` < ``0``
      - Never checks for connection validity
    * - ``n`` = ``0``
      - Always checks for connection validity
    * - ``n`` > ``0``
      - Checks validity if the connection has been idle in the pool (not “checked out” to the application by ``getConnection()``) for at least ``n`` seconds

When ``getConnection()`` is called to return a pooled connection, and
the connection has been idle in the pool (not “checked out” to the
application by ``getConnection()``) for the specified
``poolPingInterval`` time, then an internal “ping” will be performed
first. If the ping detects the connection is invalid then node-oracledb
internally drops the unusable connection and obtains another from the
pool. This second connection may also need a ping. This ping-and-release
process may be repeated until:

-  an existing connection that does not qualify for pinging is obtained.
   The ``getConnection()`` call returns this to the application. Note
   that since a ping may not have been performed, the connection is not
   guaranteed to be usable.
-  a new, usable connection is opened. This is returned to the
   application.
-  a number of unsuccessful attempts to find a valid connection have
   been made, after which an error is returned to the application.

Pools in active use may never have connections idle longer than
``poolPingInterval``, so pinging often only occurs for infrequently
accessed connection pools.

Because a ping may not occur every time a connection is returned from
:meth:`pool.getConnection()`, and also it is possible for network outages
to occur after ``getConnection()`` is called, applications should continue
to use appropriate statement execution error checking.

For ultimate scalability, disable explicit pool pinging by setting
``poolPingInterval`` to a negative value, and make sure the firewall, database
resource manager, or user profile are not expiring idle connections. See
:ref:`Preventing Premature Connection Closing <connectionpremclose>`.  When
using node-oracledb Thick mode, use use Oracle client 12.2 (or later)
libraries.

In all cases, when a bad connection is released back to the pool with
:meth:`connection.close()`, the connection is automatically destroyed.
This allows a valid connection to the database to be opened by some
subsequent ``getConnection()`` call.

Explicit pings can be performed at any time with :meth:`connection.ping()`.

The time to wait for a response from :meth:`connection.ping()` can be
controlled with the :attr:`oracledb.poolPingTimeout` property or with the
:ref:`poolPingTimeout <createpoolpoolattrspoolpingtimeout>` property during
:ref:`pool creation <createpoolpoolattrspoolpingtimeout>`.

The default :attr:`~oracledb.poolPingTimeout` value is *5000* milliseconds.
The behavior of a pool ``getConnection()`` call differs based on the value
specified in the ``poolPingTimeout`` property as detailed below.

.. list-table-with-summary:: ``poolPingTimeout`` Value
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 15 40
    :summary: The first column displays the poolPingTimeout value. The second column displays the behavior of a pool getConnection() call.

    * - ``poolPingTimeout`` Value
      - Behavior of a Pool ``getConnection()`` Call
    * - ``n`` < ``0``
      - Returns the error ``NJS-007: invalid value for "poolPingTimeout" in parameter 1`` if the :ref:`poolPingTimeout <createpoolpoolattrspoolpingtimeout>` property in :meth:`oracledb.createPool()` is set to a negative value.

        Returns the error ``NJS-004: invalid value for property "poolPingTimeout"`` if :attr:`oracledb.poolPingTimeout` is set to a negative value.
    * - ``n`` = ``0``
      - Waits until :meth:`connection.ping()` succeeds with a response or fails with an error.
    * - ``n`` > ``0``
      - Waits for :meth:`connection.ping()` to respond by ``n`` milliseconds.

        If :meth:`~connection.ping()` does not respond by ``n`` milliseconds, then the connection is forcefully closed.

.. _connpooltagging:

Connection Tagging and Session State
------------------------------------

Applications can set “session” state in each connection. For all
practical purposes, connections are synonymous with sessions. Examples
of session state are :ref:`NLS <nls>` settings from ALTER SESSION
statements. Pooled connections will retain their session state after
they have been released back to the pool with ``connection.close()``.
However, because pools can grow, or connections in the pool can be
recreated, there is no guarantee a subsequent ``pool.getConnection()``
call will return a database connection that has any particular state.

The :meth:`oracledb.createPool()` option attribute
:ref:`sessionCallback <createpoolpoolattrssessioncallback>` can be
used to set session state efficiently so that connections have a known
session state. The ``sessionCallback`` can be a Node.js function that
will be called whenever ``pool.getConnection()`` will return a newly
created database connection that has not been used before. It is also
called when connection tagging is being used and the requested tag is
not identical to the tag in the connection returned by the pool. It is
called before ``pool.getConnection()`` returns in these two cases. It
will not be called in other cases. Using a callback saves the cost of
setting session state if a previous user of a connection has already set
it. The caller of ``pool.getConnection()`` can always assume the correct
state is set. The ``sessionCallback`` can also be a PL/SQL procedure.

Connection tagging and ``sessionCallback`` were introduced in
node-oracledb 3.1.

There are three common scenarios for ``sessionCallback``:

-  When all connections in the pool should have the same state use a
   simple :ref:`Node.js Session Callback <sessionfixupnode>` without
   tagging.

-  When connections in the pool require different state for different
   users use a :ref:`Node.js Session Tagging Callback <sessiontaggingnode>`.

-  With :ref:`DRCP <drcp>`, use a :ref:`PL/SQL Session Tagging
   Callback <sessiontaggingplsql>`.

.. _sessionfixuptagging:

Connection Tagging
++++++++++++++++++

Connection tagging is used when connections in a pool should have differing
session states. In order to retrieve a connection with a desired state, the
``tag`` attribute in :meth:`~pool.getConnection()` needs to be set.

.. note::

    In this release, connection tagging is only supported in the node-oracledb
    Thick mode. See :ref:`enablingthick`.

Pooled connections can be tagged to record their session state by
setting the property :attr:`connection.tag` to a user
chosen string that represents the state you have set in the connection.
A ``pool.getConnection({tag: 'mytag'})`` call can request a connection
that has the specified tag. If no available connections with that tag
exist in the pool, an untagged connection or a newly created connection
will be returned. If the optional ``getConnection()`` attribute
``matchAnyTag`` is *true*, then a connection that has a different tag
may be returned.

The :ref:`sessionCallback <createpoolpoolattrssessioncallback>`
function is invoked before ``pool.getConnection()`` returns if the
requested tag is not identical to the actual tag of the pooled
connection. The callback can compare the requested tag with the current
actual tag in ``connection.tag``. Any desired state change can be made
to the connection and ``connection.tag`` can be updated to record the
change. The best practice recommendation is to set the tag in the
callback function but, if required, a tag can be set anytime prior to
closing the connection. To clear a connection’s tag set
``connection.tag`` to an empty string.

You would use tagging where you want ``pool.getConnection()`` to return
a connection which has one of several different states. If all
connections should have the same state then you can simply set
``sessionCallback`` and not use tagging. Also, it may not be worthwhile
using a large number of different tags, or using tagging where
connections are being :ref:`dropped <connectionclose>` and recreated
frequently since the chance of ``pool.getConnection()`` returning an
already initialized connection with the requested tag could be low, so
most ``pool.getConnection()`` calls would return a connection needing
its session reset, and tag management will just add overhead.

When node-oracledb is using Oracle Client libraries 12.2 or later, then
node-oracledb uses ‘multi-property tags’ and the tag string must be of
the form of one or more “name=value” pairs separated by a semi-colon,
for example ``"loc=uk;lang=cy"``. The Oracle `session
pool <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F9662FFB
-EAEF-495C-96FC-49C6D1D9625C>`__ used by node-oracledb has various heuristics
to determine which connection is returned to the application. Refer to the
`multi-property tags documentation <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__.
The callback function can parse the requested multi-property tag and
compare it with the connection’s actual properties in
:attr:`connection.tag` to determine what exact state to
set and what value to update ``connection.tag`` to.

.. _sessionfixupnode:

Node.js Session Callback
++++++++++++++++++++++++

When all connections in the pool should have the same state, a simple
callback can be used.

This example sets two NLS settings in each pooled connection. They are
only set the very first time connections are established to the
database. The ``requestedTag`` parameter is ignored because it is only
valid when tagging is being used:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
    connection.execute(
        `alter session set nls_date_format = 'YYYY-MM-DD' nls_language = AMERICAN`,
        callbackFn);
    }

    try {
        const pool = await oracledb.createPool({
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            sessionCallback: initSession
        });
        . . .
    }

Note that a single ALTER SESSION statement is used to set multiple
properties, avoiding :ref:`round-trips <roundtrips>` of repeated
``execute()`` calls. If you need to execute multiple SQL statements,
then use an anonymous PL/SQL block for the same reason:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
        connection.clientId = "Chris";
        connection.execute(
            `begin
                execute immediate 'alter session set nls_date_format = ''YYYY-MM-DD'' nls_language = AMERICAN';
                insert into user_log (id, ts) values (sys_context('userenv', 'client_identifier'), systimestamp);
                commit;
             end;`,
            callbackFn);
    }

See `sessionfixup.js <https://github.com/oracle/node-oracledb/tree/main
/examples/sessionfixup.js>`__ for a runnable example.

.. _sessiontaggingnode:

Node.js Session Tagging Callback
++++++++++++++++++++++++++++++++

When connections in the pool require different state for different users
and you are not using DRCP, then use a JavaScript callback with tagging.

This example Node.js callback function ensures the connection contains
valid settings for an application-specific “USER_TZ=X” property where X
is a valid Oracle timezone:

.. code-block:: javascript

    function initSession(connection, requestedTag, callbackFn) {
        const tagParts = requestedTag.split('=');
        if (tagParts[0] != 'USER_TZ') {
            callbackFn(new Error('Error: Only property USER_TZ is supported'));
            return;
        }

        connection.execute(
            `ALTER SESSION SET TIME_ZONE = '${tagParts[1]}'`,
            (err) => {
                // Record the connection's new state and return
                connection.tag = requestedTag;
                callbackFn(err);
            }
        );
    }

    try {
        await oracledb.createPool({
            user: 'hr',
            password: mypw,  // mypw contains the hr schema password
            connectString: 'localhost/FREEPDB1',
            sessionCallback: initSession
        });

        // Get a connection with a given tag (and corresponding session state) from the pool
        const connection = await oracledb.getConnection({poolAlias: 'default', tag: "USER_TZ=UTC" });

        . . . // Use the connection

        // The connection will be returned to the pool with the tag value of connection.tag
        await connection.close(); // always release the connection back to the pool

        . . .

The ``initSession()`` session callback function is only invoked by
``getConnection()`` if the node-oracledb connection pool cannot find a
connection with the requested tag. The session callback function adjusts
the connection state and records the matching tag.

Other parts of the application may request connections with different
tags. Eventually the pool would contain connections with various
different states (and equivalent tags). Each ``getConnection()`` call
will attempt to return a connection which already has the requested tag.
If a matching free connection cannot be found, the pool may grow or the
session state from another connection is cleared. Then ``initSession()``
is called so that the desired connection state can be set.

For runnable examples, see `sessiontagging1.js <https://github.com/oracle/
node-oracledb/tree/main/examples/sessiontagging1.js>`__ and
`sessiontagging2.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sessiontagging2.js>`__.

.. _sessiontaggingplsql:

PL/SQL Session Tagging Callback
+++++++++++++++++++++++++++++++

.. note::

    In this release, PL/SQL callbacks are only supported in node-oracledb
    Thick mode. See :ref:`enablingthick`.

When using :ref:`DRCP <drcp>`, tagging is most efficient when using a
PL/SQL callback.

When node-oracledb is using Oracle Client libraries 12.2 or later,
``sessionCallback`` can be a string containing the name of a PL/SQL
procedure that is called when the requested tag does not match the
actual tag in the connection. When the application uses :ref:`DRCP
connections <drcp>`, a PL/SQL callback can avoid the
:ref:`round-trip <roundtrips>` calls that a Node.js function would require
to set session state. For non-DRCP connections, the PL/SQL callback will
require a round-trip from the application.

After a PL/SQL callback completes and ``pool.getConnection()`` returns,
:attr:`connection.tag` will have the same property values
as the requested tag. The property order may be different. For example
you may request “USER_TZ=UTC;LANGUAGE=FRENCH” but ``connection.tag`` may
be “LANGUAGE=FRENCH;USER_TZ=UTC”. When ``matchAnyTag`` is *true*, then
various heuristics are used to determine which connection in the pool to
use. See the `multi-property tags documentation <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__.
Additional properties may be present in ``connection.tag``.

There is no direct way for Node.js to know if the PL/SQL procedure was
called or what session state it changed. After ``pool.getConnection()``
returns, care must be taken to set ``connection.tag`` to an appropriate
value.

A sample PL/SQL callback procedure looks like:

.. code-block:: sql

   CREATE OR REPLACE PACKAGE myPackage AS
     TYPE property_t IS TABLE OF VARCHAR2(64) INDEX BY VARCHAR2(64);
     PROCEDURE buildTab(
       tag          IN  VARCHAR2,
       propertyTab  OUT property_t
     );
     PROCEDURE myPlsqlCallback (
       requestedTag IN  VARCHAR2,
       actualTag    IN  VARCHAR2
     );
   END;
   /

   CREATE OR REPLACE PACKAGE BODY myPackage AS

     -- Parse the "property=value" pairs in the tag
     PROCEDURE buildTab(tag IN VARCHAR2, propertyTab OUT property_t) IS
       property  VARCHAR2(64);
       propertyName  VARCHAR2(64);
       propertyValue VARCHAR2(64);
       propertyEndPos NUMBER := 1;
       propertyStartPos NUMBER := 1;
       propertyNameEndPos NUMBER := 1;
     begin
       WHILE (LENGTH(tag) > propertyEndPos)
       LOOP
         propertyEndPos := INSTR(tag, ';', propertyStartPos);
         IF (propertyEndPos = 0) THEN
           propertyEndPos := LENGTH(tag) + 1;
         END IF;
         propertyNameEndPos := INSTR(tag, '=', propertyStartPos);
         propertyName := SUBSTR(tag, propertyStartPos,
                      propertyNameEndPos - propertyStartPos);
         propertyValue := SUBSTR(tag, propertyNameEndPos + 1,
                       propertyEndPos - propertyNameEndPos - 1);
         propertyTab(propertyName) := propertyValue;
         propertyStartPos := propertyEndPos + 1;
       END LOOP;
     END;

     PROCEDURE myPlsqlCallback (
       requestedTag IN VARCHAR2,
       actualTag IN VARCHAR2
     ) IS
       reqPropTab property_t;
       actPropTab property_t;
       propertyName VARCHAR2(64);
     BEGIN
       buildTab(requestedTag, reqPropTab);
       buildTab(actualTag, actPropTab);

       -- Iterate over requested properties to set state when it's not
       -- currently set, or not set to the desired value
       propertyName := reqPropTab.FIRST;
       WHILE (propertyName IS NOT NULL)
       LOOP
         IF ((NOT actPropTab.exists(propertyName)) OR
            (actPropTab(propertyName) != reqPropTab(propertyName))) THEN
           IF (propertyName = 'SDTZ') THEN
             EXECUTE IMMEDIATE
               'ALTER SESSION SET TIME_ZONE=''' || reqPropTab(propertyName) || '''';
           ELSE
             RAISE_APPLICATION_ERROR(-20001,'Unexpected session setting requested');
           END IF;
         END IF;
         propertyName := reqPropTab.NEXT(propertyName);
       END LOOP;
       -- Could iterate over other actual properties to set any to a default state
     END;

   END myPackage;
   /

This could be used in your application like:

.. code-block:: javascript

    const sessionTag = "SDTZ=UTC";

    try {
        const pool = await oracledb.createPool({
                     user: 'hr',
                     password: mypw,  // mypw contains the hr schema password
                     connectString: 'localhost/FREEPDB1',
                     sessionCallback: "myPackage.myPlsqlCallback"
                    });
        . . .

        const connection = await pool.getConnection({tag: sessionTag});

        . . . // The value of connection.tag will be sessionTag
             // Use connection.

        await connection.close();
    }

.. _connpoolproxy:

Heterogeneous and Homogeneous Connection Pools
----------------------------------------------

By default, connection pools are ‘homogeneous’ meaning that all
connections use the same database credentials. Both node-oracledb Thin and
Thick modes support homogeneous pools.

Creating Heterogeneous Pools
++++++++++++++++++++++++++++

The node-oracledb Thick mode additionally supports heterogeneous pools,
allowing different user names and passwords to be passed each time a
connection is acquired from the pool with :meth:`pool.getConnection()`.

To create a heterogeneous pool, set the :meth:`~oracledb.createPool`
parameter, :ref:`homogeneous <createpoolpoolattrshomogeneous>`, to *false*.

When a heterogeneous pool is created by setting
:ref:`homogeneous <createpoolpoolattrshomogeneous>` to *false* and no
credentials supplied during pool creation, then a user name and password
may be passed to ``pool.getConnection()``:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        connectString : "localhost/FREEPDB1",  // no user name or password
        homogeneous   : false,
        . . .  // other pool options such as poolMax
    });

    const connection = await pool.getConnection({
        user     : "hr",
        password : mypw,  // mypw contains the hr schema password
    });

    . . . // use connection

    await connection.close();

The ``connectString`` is required during pool creation since the pool is
created for one database instance.

Different user names may be used each time ``pool.getConnection()`` is
called.

When applications want to use connection pools but are not able to use
:attr:`connection.clientId` to distinguish application users from
database schema owners then a ‘heterogeneous’ connection pool might be an
option.

To use heterogeneous pools with the :ref:`connection pool
cache <connpoolcache>`, the alias should be explicitly stated, even
if it is the default pool:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        poolAlias: "default",
        user     : "hr",
        password : mypw,  // mypw contains the hr schema password
    });

For heterogeneous pools, the number of connections initially created is
zero even if a larger value is specified for :attr:`~oracledb.poolMin`.
The pool increment is always 1, regardless of the value of
:ref:`poolIncrement <createpoolpoolattrspoolincrement>`. Once the
number of open connections exceeds ``poolMin`` and connections are idle
for more than the :attr:`~oracledb.poolTimeout` seconds, then
the number of open connections does not fall below ``poolMin``.

.. _connectionhook:

Connection Hook Functions
=========================

Node-oracledb supports centralized configuration provider and process
configuration hook functions that can be used to customize connection
logic.

.. _configproviderhookfn:

Using Centralized Configuration Provider Hook Functions
-------------------------------------------------------

The :meth:`oracledb.registerConfigurationProviderHook()` method registers the
:ref:`centralized configuration provider <configproviderplugins>` extension
modules that were loaded in your code. When this method is called, it
registers a user hook function that will be called internally by node-oracledb
prior to connection or pool creation. The hook function will be invoked when
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()` are called
with the ``connectString`` property prefixed with a specified configuration
provider. Your hook function can retrieve the connection information, which
node-oracledb can subsequently use to complete the connection or pool
creation.

Pre-supplied node-oracledb plugins such as :ref:`OCI Object Storage
(ociobject) <ociobjectplugin>`, :ref:`OCI Vault (ocivault) <ocivaultplugin>`,
:ref:`Azure App Configuration (azure) <azureplugin>`, and
:ref:`Azure Key Vault (azurevault) <azurevaultplugin>` make use of
:meth:`oracledb.registerConfigurationProviderHook()`. These plugins use the
information found in a connection method's ``connectString`` property which
allows node-oracledb to access the required information from the configuration
provider, and connect to Oracle Database with this information. For the
complete plugin implementation, see the respective folders of the
configuration providers in the `plugins/configProviders <https://github.com/
oracle/node-oracledb/tree/main/plugins/configProviders>`__ directory of the
node-oracledb package. Also, you can define your own plugins for centralized
configuration providers and register it using
:meth:`oracledb.registerConfigurationProviderHook()`, similar to how the
pre-supplied node-oracledb plugins are registered.

Once you define the plugin and register it using
:meth:`oracledb.registerConfigurationProviderHook`, you can connect to Oracle
Database using the information stored in the configuration provider, for
example, with OCI Vault:

.. code-block:: javascript

    // Load the ocivault plugin
    require('oracledb/plugins/configProviders/ocivault');

    // Use an OCI vault connection string
    const connection = await oracledb.getConnection({
        connectString : "config-ocivault://ocid1.vaultsecret.oc1?oci_tenancy=abc123&oci_user=ociuser1&oci_fingerprint=ab:14:ba:13&oci_key_file=ociabc/ocikeyabc.pem"
    });

For more information on the centralized configuration providers supported by
node-oracledb, see :ref:`configurationprovider`.

.. _processconfighookfns:

Using Process Configuration Hook Functions
------------------------------------------

The :meth:`oracledb.registerProcessConfigurationHook()` method registers
extension modules that were added to your code. When this method is called, it
registers a user hook function that will be called internally by node-oracledb
prior to connection or pool creation. The hook function will be called when
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()` are called.
Your hook function accepts a copy of the parameters that will be used to create
the standalone or pool connections. The function can access and modify them in
any way necessary to allow node-oracledb to subsequently complete the
connection or pool creation request.

Pre-supplied node-oracledb plugins such as :ref:`extensionOci
<extensionociplugin>` and :ref:`extensionAzure <extensionazureplugin>` make
use of :meth:`oracledb.registerProcessConfigurationHook()`. The
:ref:`extensionOci <extensionociplugin>` uses the information found in a
connection method's ``tokenAuthConfigOci`` property and modifies the
``accessToken`` property with a function that will acquire the authentication
token needed to complete a connection. The key code section showing
registering of a hook function is:

.. code-block:: javascript

    function hookFn(options) {
      if (options.tokenAuthConfigOci) {
        options.accessToken = async function callbackFn(refresh, config) {
          return await getToken(config);
        };
        options.accessTokenConfig = options.tokenAuthConfigOci;
      }
    }
    oracledb.registerProcessConfigurationHook(hookFn);

Your code can then try to connection, for example:

.. code-block:: javascript

    await oracledb.getConnection({
          tokenAuthConfigOci: {
            authType: ...,           // OCI-specific parameters to be set when
            profile: ...,            // using extensionOci plugin with authType
            configFileLocation: ...  // configFileBasedAuthentication
          }
          externalAuth: true,        // must specify external authentication
          connectString: ...         // Oracle Autonomous Database connection string
        });

.. _proxyauth:

Connecting Using Proxy Authentication
=====================================

Proxy authentication allows a user (the "session user") to connect to Oracle
Database using the credentials of a "proxy user". Statements will run as the
session user. Proxy authentication is generally used in three-tier
applications where one user owns the schema while multiple end-users access
the data. For more information about proxy authentication, see the `Oracle
documentation <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
D77D0D4A-7483-423A-9767-CBB5854A15CC>`__.

An alternative to using proxy users is to set :attr:`connection.clientId`
after connecting and use its value in statements and in the database, for
example for :ref:`monitoring <endtoendtracing>`.

Pool proxy authentication requires a heterogeneous pool.

To grant access, typically a DBA would execute:

.. code-block:: sql

    ALTER USER sessionuser GRANT CONNECT THROUGH proxyuser;

For example, to allow a user called ``MYPROXYUSER`` to access the schema
of ``HR``:

::

    SQL> CONNECT system

    SQL> ALTER USER hr GRANT CONNECT THROUGH myproxyuser;

    SQL> CONNECT myproxyuser[hr]/myproxyuserpassword

    SQL> SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER,
      2         SYS_CONTEXT('USERENV', 'PROXY_USER')   AS PROXY_USER
      3  FROM DUAL;

    SESSION_USER         PROXY_USER
    -------------------- --------------------
    HR                   MYPROXYUSER

See the `Client Access Through a Proxy <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC>`__
section in the Oracle Call Interface manual for more details about proxy
authentication.

To use the proxy user with a node-oracledb heterogeneous connection pool
you could do:

.. code-block:: javascript

    const myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

    const pool = await oracledb.createPool({ connectString: "localhost/orclpdb1", homogeneous: false });
    const connection = await pool.getConnection({ user: 'myproxyuser[hr]', password: myproxyuserpw});

    . . . // connection has access to the HR schema objects

    await connection.close();

Other proxy cases are supported such as:

.. code-block:: javascript

    const myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

    const pool = await oracledb.createPool({
        user          : "myproxyuser",
        password      : myproxyuserpw,
        connectString : "localhost/FREEPDB1",
        homogeneous   : false,
        . . .  // other pool options such as poolMax can be used
    });

    const connection = await pool.getConnection({ user : 'hr' });  // the session user

    . . . // connection has access to the HR schema objects

    await connection.close();

.. _extauth:

Connecting Using External Authentication
========================================

External Authentication allows applications to use an external password
store (such as an `Oracle Wallet <https://www.oracle.com/pls/topic/lookup?
ctx=dblatest&id=GUID-E3E16C82-E174-4814-98D5-EADF1BCB3C37>`__),
the `Transport Layer Security (TLS) or Secure Socket Layer (SSL)
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-6AD89576-526F-
4D6B-A539-ADF4B840819F>`__, or the `operating system <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-37BECE32-58D5-43BF-A098-97936D66968F>`__
to validate user access. With an external password store, your application can
use an Oracle Wallet to authenticate users. External Authentication using TLS
authenticates users with Public Key Infrastructure (PKI) certificates. With
operating system authentication, user authentication can be performed if the
user has an operating system account on their machine recognized by Oracle
Database. One of the benefits of using external authentication is that
database credentials do not need to be hard coded in the application.

.. note::

    Connecting to Oracle Database using external authentication with an Oracle
    Wallet, TLS, or the operating system is supported in node-oracledb Thick
    mode. See :ref:`enablingthick`.

    Node-oracledb Thin mode only supports external authentication with TLS.
    See :ref:`tlsextauth` for more information.

**In node-oracledb Thick Mode**

To use external authentication, set the :attr:`oracledb.externalAuth` property
to *true*. This property can also be set in the ``connAttrs`` or ``poolAttrs``
parameters of the :meth:`oracledb.getConnection()` or
:meth:`oracledb.createPool()` calls, respectively.

When ``externalAuth`` is set, any subsequent connections obtained using
the :meth:`oracledb.getConnection()` or :meth:`pool.getConnection()` calls
will use external authentication. Setting this property does not affect the
operation of existing connections or pools.

For a standalone connection, you can authenticate as an externally identified
user like:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const connection = await oracledb.getConnection(config);

    . . . // connection has access to the schema objects of the externally identified user

If a user ``HR`` has been given the ``CONNECT THROUGH`` grant from the
externally identified user ``MYPROXYUSER``:

.. code-block:: sql

    ALTER USER hr GRANT CONNECT THROUGH myproxyuser;

then to specify that the session user of the connection should be
``HR``, use:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", user: "[hr]", externalAuth: true };
    const connection = await oracledb.getConnection(config);

    . . . // connection has access to the HR schema objects

For a *Pool*, you can authenticate as an externally identified user
like:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const pool = await oracledb.createPool(config);
    const connection = await pool.getConnection();

    . . . // connection has access to the schema objects of the externally identified user

    await connection.close();

If a user ``HR`` has been given the ``CONNECT THROUGH`` grant from the
externally identified user, then to specify that the session user of the
connection should be ``HR``, use:

.. code-block:: javascript

    const config = { connectString: "localhost/orclpdb1", externalAuth: true };
    const pool = await oracledb.createPool(config);
    const connection = await pool.getConnection({ user: "[hr]" });

    . . . // connection has access to the HR schema objects

    await connection.close();

Note this last case needs Oracle Client libraries version 18 or later.

Using ``externalAuth`` in the ``connAttrs`` parameter of a
``pool.getConnection()`` call is not possible. The connections from a
*Pool* object are always obtained in the manner in which the pool was
initially created.

For pools created with external authentication, the number of
connections initially created is zero even if a larger value is
specified for :attr:`~oracledb.poolMin`. The pool increment is
always 1, regardless of the value of
:attr:`~pool.poolIncrement`. Once the number of open
connections exceeds ``poolMin`` and connections are idle for more than
the :attr:`oracledb.poolTimeout` seconds, then the number of
open connections does not fall below ``poolMin``.

.. _tlsextauth:

External Authentication Using TLS
---------------------------------

External authentication with Transport Layer Security (TLS) uses `Public Key
Infrastructure (PKI) certificates <https://www.oracle.com/pls/topic/lookup?ctx
=dblatest&id=GUID-6AD89576-526F-4D6B-A539-ADF4B840819F>`__ to authenticate
users. This authentication method can be used in both node-oracledb Thin and
Thick modes.

To use TLS external authentication, you must set the
:attr:`oracledb.externalAuth` property to *true*. This property can also be
set in the ``externalAuth`` parameter of the :meth:`oracledb.getConnection()`
or :meth:`oracledb.createPool()` calls. TLS external authentication can only
be done for connections that are configured to use the *TCPS* protocol.

For a standalone connection, you can use TLS authentication to authenticate
the user as shown in the example below:

.. code-block:: javascript

    const config = { connectString: "tcps://localhost/orclpdb1", externalAuth: true };
    const connection = await oracledb.getConnection(config);

Note that TLS external authentication will not be enabled if you are using
token-based authentication (that is, the ``accessToken`` property is set in
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`).

For a connection pool, you can authenticate with TLS as shown in the example
below:

.. code-block:: javascript

    const config = { connectString: "tcps://localhost/orclpdb1", externalAuth: true };
    const pool = await oracledb.createPool(config);
    const connection = await pool.getConnection();

    . . . // connection has access to the schema objects of the externally identified user

    await connection.close();

In node-oracledb Thick mode, ensure that the `SQLNET.AUTHENTICATION_SERVICES
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FFDBCCFD-87EF
-43B8-84DA-113720FCC095>`__ parameter contains *TCPS* as a value in the
:ref:`sqlnet.ora <tnsadmin>` file. Note that *TCPS* is the default value of
this parameter.

Additional server side configuration is also required to enable external
authentication using TLS:

1. Create a user corresponding to the distinguished name (DN) in the
   certificate using:

   .. code-block:: sql

     CREATE USER user_name IDENTIFIED EXTERNALLY AS 'user DN on certificate';

2. Set the ``SSL_CLIENT_AUTHENTICATION`` parameter to *TRUE* in the server-side
   :ref:`sqlnet.ora <tnsadmin>` file.

.. _tokenbasedauthentication:

Token-Based Authentication
==========================

Token-Based Authentication allows users to connect to a database by
using an encrypted authentication token without having to enter a
database username and password. The authentication token must be valid
and not expired for the connection to be successful. Users already
connected will be able to continue work after their token has expired
but they will not be able to reconnect without getting a new token.

The two authentication methods supported by node-oracledb are Open
Authorization :ref:`OAuth 2.0 <oauthtokenbasedauthentication>` and Oracle
Cloud Infrastructure (OCI) Identity and Access Management
:ref:`IAM <iamtokenbasedauthentication>`.

Token-based authentication can be used for both standalone connections
and connection pools.

.. _oauthtokenbasedauthentication:

OAuth 2.0 Token-Based Authentication
------------------------------------

Oracle Cloud Infrastructure (OCI) users can be centrally managed in a
Microsoft Azure Active Directory (Azure AD) service. Open Authorization
(OAuth 2.0) token-based authentication allows users to authenticate to
Oracle Database using Azure AD OAuth 2.0 tokens. Your Oracle Database
must be registered with Azure AD. Both Thin and Thick modes of the
node-oracledb driver support OAuth 2.0 token-based authentication.

See `Authenticating and Authorizing Microsoft Azure Active Directory
Users for Oracle Autonomous Databases <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-60AAC16E-5274-463D-9F29-4826F25D5585>`__ for
more information.

When using node-oracledb in Thick mode, Oracle Client libraries 19.15 (or
later), or 21.7 (or later) are needed.

Standalone connections and pooled connections can be created in node-oracledb
Thick and Thin modes using OAuth 2.0 token-based authentication. This can be
done by using the Azure Active Directory REST API, or Azure SDK, or
node-oracledb’s Azure Cloud Native Authentication Plugin
(extensionAzure).

.. _oauthtokengeneration:

OAuth 2.0 Token Generation
++++++++++++++++++++++++++

Authentication tokens can be obtained in several ways as detailed below.

**Token Generation Using a Curl command**

For example, you can use a curl command against the Azure Active Directory API
such as::

    curl -X POST -H 'Content-Type: application/x-www-form-urlencoded'
    https://login.microsoftonline.com/[<TENANT_ID>]/oauth2/v2.0/token
    -d 'client_id = <APP_ID>'
    -d 'scope = <SCOPES>'
    -d 'username = <USER_NAME>'
    -d 'password = <PASSWORD>'
    -d 'grant_type = password'
    -d 'client_secret = <SECRET_KEY>'

Substitute your own values as appropriate for each argument.

This returns a JSON response containing an ``access_token`` attribute.
See `Microsoft identity platform and OAuth 2.0 authorization code
flow <https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-
oauth2-auth-code-flow>`__ for more details. This attribute can be passed as
the ``oracledb.getConnection()`` attribute
:ref:`accessToken <getconnectiondbattrsaccesstoken>` or as the
``oracledb.createPool()`` attribute
:ref:`accessToken <createpoolpoolattrsaccesstoken>`.

**Token Generation Using Azure Active Directory REST API**

Alternatively, authentication tokens can be generated by calling the
Azure Active Directory REST API, for example:

.. code-block:: javascript

    function getOauthToken() {
        const requestParams = {
            client_id     : <CLIENT_ID>,
            client_secret : <CLIENT_SECRET>,
            grant_type    : 'client_credentials',
            scope         : <SCOPES>,
        };
        const tenantId = <TENANT_ID>;
        const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        return new Promise(function(resolve, reject) {
            request.post({
                url       : url,
                body      : queryString.stringify(requestParams),
                headers   : { 'Content-Type': 'application/x-www-form-urlencoded' }
            }, function(err, response, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body).access_token);
                }
            });
        });
    }

Substitute your own values as appropriate for each argument. The use of
``getOauthToken()`` is shown in subsequent examples.

**Token Generation Using Azure Software Development Kit**

Alternatively, OAuth 2.0 authentication tokens can be generated in the
node-oracledb driver using the Azure Software Development Kit (SDK). This was
introduced in node-oracledb 6.3. To use the Azure SDK, you must install the
`Microsoft Authentication Library for Node (msal-node) <https://www.npmjs.com/
package/@azure/msal-node>`__ package which can be done with the following
command::

    npm install @azure/msal-node

Authentication tokens generated by the Azure SDK can be read by your
application. For example:

.. code-block:: javascript

    async function getToken(accessTokenConfig) {
        ... // Azure-specific authentication types
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. The use of ``getToken()`` and ``accessTokenConfig`` is shown in
subsequent examples.

**Token Generation Using extensionAzure Plugin**

See :ref:`cloudnativeauthoauth`.

.. _oauthstandalone:

OAuth 2.0 Standalone Connections
++++++++++++++++++++++++++++++++

Standalone connections can be created using OAuth2 token-based
authentication, for example:

.. code-block:: javascript

    let accessTokenStr;  // the token string. In this app it is also the token "cache"

    async function tokenCallback(refresh) {
        if (refresh || !accessTokenStr) {
            accessTokenStr = await getOauthToken(); // getOauthToken() was shown earlier
        }
        return accessTokenStr;
    }

    async function run() {

        await oracledb.getConnection({
            accessToken   : tokenCallback,    // the callback returning the token
            externalAuth  : true,             // must specify external authentication
            connectString : connect_string    // Oracle Autonomous Database connection string
        });
    }

In this example, the global variable ``accessTokenStr`` is used to
“cache” the access token string so any subsequent callback invocation
will not necessarily have to incur the expense of externally getting a
token. For example, if the application opens two connections for the
same user, the token acquired for the first connection can be reused
without needing to make a second REST call.

The ``getConnection()`` function’s
:ref:`accessToken <getconnectiondbattrsaccesstoken>` attribute in this
example is set to the callback function that returns an OAuth 2.0 token
used by node-oracledb for authentication. This function
``tokenCallback()`` will be invoked when ``getConnection()`` is called.
If the returned token is found to have expired, then ``tokenCallback()``
will be called a second time. If the second invocation of
``tokenCallback()`` also returns an expired token, then the connection
will fail.

The ``refresh`` parameter is set internally by the node-oracledb driver
depending on the status and validity of the authentication token provided by
the application. The value of the ``refresh`` parameter will be different
every time the callback is invoked:

-  When ``refresh`` is *true*, the token is known to have expired so the
   application must get a new token. This is then stored in the global
   variable ``accessTokenStr`` and returned.

-  When ``refresh`` is *false*, the application can return the token
   stored in ``accessTokenStr``, if it is set. But if it is not set
   (meaning there is no token cached), then the application externally
   acquires a token, stores it in ``accessTokenStr``, and returns it.

If you set the
:ref:`accessTokenConfig <getconnectiondbattrsaccesstokenconfig>` property in
addition to the :ref:`accessToken <getconnectiondbattrsaccesstoken>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
during standalone connection creation, then you can use the Azure SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig); // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function run() {
        await oracledb.getConnection({
            accessToken   : callbackfn,        // the callback returning the token
            accessTokenConfig : {
                                    ...        // Azure-specific parameters to be set
                                                   // when using Azure SDK
                                }
            externalAuth  : true,              // must specify external authentication
            connectString : '...'              // Oracle Autonomous Database connection string
        });
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. The callback and ``refresh`` parameter descriptions are detailed
in the example above.

.. _oauthpool:

OAuth 2.0 Connection Pooling
++++++++++++++++++++++++++++

Pooled connections can be created using OAuth 2.0 token-based
authentication, for example:

.. code-block:: javascript

    let accessTokenStr;  // The token string. In this app it is also the token "cache"

    async function tokenCallback(refresh) {
        if (refresh || !accessTokenStr) {
            accessTokenStr = await getOauthToken(); // getOauthToken() was shown earlier
        }
        return accessToken;
    }

    async function run() {
        await oracledb.createPool({
            accessToken   : tokenCallback,        // the callback returning the token
            externalAuth  : true,                 // must specify external authentication
            homogeneous   : true,                 // must use an homogeneous pool
            connectString : '...'                 // Oracle Autonomous Database connection string
        });
    }

See :ref:`OAuth 2.0 Standalone Connections <oauthstandalone>` for a
description of the callback and ``refresh`` parameter. With connection
pools, the :ref:`accessToken <createpoolpoolattrsaccesstoken>`
attribute sets a callback function which will be invoked at the time the
pool is created (even if ``poolMin`` is 0). It is also called when the
pool needs to expand (causing new connections to be created) and the
current token has expired.

If you set the
:ref:`accessTokenConfig <createpoolpoolattrsaccesstokenconfig>` property
in addition to the :ref:`accessToken <createpoolpoolattrsaccesstoken>`,
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
during connection pool creation, then you can use the Azure SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig);  // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function run() {
        await oracledb.createPool({
            accessToken   : tokenCallback,        // the callback returning the token
            accessTokenConfig : {
                                    ...           // Azure-specific parameters to be set
                                                      // when using Azure SDK
                                }
            externalAuth  : true,                 // must specify external authentication
            homogeneous   : true,                 // must use an homogeneous pool
            connectString : '...'                 // Oracle Autonomous Database connection string
        });
    }

See `sampleazuretokenauth.js <https://github.com/oracle/node-oracledb/tree/
main/examples/sampleazuretokenauth.js>`__ for a runnable example using the
Azure SDK. See :ref:`OAuth 2.0 Standalone Connections <oauthstandalone>` for a
description of the callback and ``refresh`` parameter.

.. _oauthconnectstring:

OAuth 2.0 Connection Strings
++++++++++++++++++++++++++++

Applications built with node-oracledb 5.5, or later, should use the
connection or pool creation parameters described earlier. However, if
you cannot use them, you can use OAuth 2.0 Token Authentication by
configuring Oracle Net options.

.. note::

    In this release, OAuth 2.0 connection strings are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

This requires Oracle Client libraries 19.15 (or later), or 21.7 (or later).

Save the generated access token to a file and set the connect descriptor
``TOKEN_LOCATION`` option to the directory containing the token file.
The connect descriptor parameter ``TOKEN_AUTH`` must be set to
``OAUTH``, the ``PROTOCOL`` value must be ``TCPS``, the
``SSL_SERVER_DN_MATCH`` value should be ``ON``, and the parameter
``SSL_SERVER_CERT_DN`` should be set. For example, your
:ref:`tnsnames.ora <tnsnames>` file might contain:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OAUTH)
          (TOKEN_LOCATION="/opt/oracle/token")
          ))

You can alternatively set ``TOKEN_AUTH`` and ``TOKEN_LOCATION`` in a
:ref:`sqlnet.ora <tnsadmin>` file. The ``TOKEN_AUTH`` and
``TOKEN_LOCATION`` values in a :ref:`connection string <connectionstrings>`
take precedence over the ``sqlnet.ora`` settings.

See `Oracle Net Services documentation <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=NETRF>`__ for more information.

.. _cloudnativeauthoauth:

Cloud Native Authentication with the extensionAzure Plugin
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

With Cloud Native Authentication, node-oracledb's
:ref:`extensionAzure <extensionazureplugin>` plugin can automatically generate
and refresh OAuth 2.0 tokens when required with the support of the `Microsoft
Authentication Library for Node (msal-node) <https://www.npmjs.com/package/
@azure/msal-node>`__. This ability was introduced in node-oracledb 6.8.

The :ref:`extensionAzure <extensionazureplugin>` plugin can be used by your
application by adding the following line to your code:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionAzure');

The plugin has a Node package dependency which needs to be installed
separately before the plugin can be used. See :ref:`azuretokenmodules`.

The above line of code defines and registers a built-in hook function that
generates OAuth 2.0 tokens. This function is internally invoked when the
``tokenAuthConfigAzure`` parameter is specified in calls to
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`. The
``tokenAuthConfigAzure`` object contains the configuration parameters needed
for token generation. This hook function sets the ``accessToken`` parameter of
the connection methods to a callback function which uses the configuration
parameters to generate OAuth 2.0 tokens.

The ``extensionAzure`` plugin is available as part of the `plugins/token
<https://github.com/oracle/node-oracledb/tree/main/plugins/token/
extensionAzure/index.js>`__ directory in the node-oracledb package.

For OAuth 2.0 token-based authentication with the ``extensionAzure`` plugin,
the ``tokenAuthConfigAzure`` connection parameter must be specified. This
parameter should be a JavaScript object containing the necessary configuration
parameters for Oracle Database authentication. See
:ref:`_get_connection_azure_properties` for information on the Azure specific
parameters. All keys and values of the Azure parameters other than
``authType`` are used by `Microsoft Authentication Library for Node (msal-node)
<https://www.npmjs.com/package/@azure/msal-node>`__ API calls in the plugin.

**Standalone Connections Using OAuth 2.0 Tokens**

When using the :ref:`extensionAzure plugin <extensionazureplugin>` to generate
OAuth 2.0 tokens, you need to set the
:ref:`tokenAuthConfigAzure <getconnectiondbattrstokenauthconfigazure>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties of
:meth:`oracledb.getConnection()`. For example:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionAzure');

    async function run() {
      await oracledb.getConnection({
        tokenAuthConfigAzure: {
          authType: ...,    // Azure-specific parameters to
          clientId: ...,    // be set when using extensionAzure
          authority: ...,   // plugin
          scopes: ...,
          clientSecret: ...
        }
        externalAuth: true, // must specify external authentication
        connectString: ...  // Oracle Autonomous Database connection string
      });
    }

For information on the Azure specific parameters, see
:ref:`_get_connection_azure_properties`.

**Connection Pools Using OAuth 2.0 Tokens**

When using the :ref:`extensionAzure plugin <extensionazureplugin>` to generate
OAuth 2.0 tokens, you need to set the
:ref:`tokenAuthConfigAzure <createpoolpoolattrstokenauthconfigazure>`,
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
in :meth:`oracledb.createPool()`. For example:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionAzure');

    async function run() {
      await oracledb.createPool({
        tokenAuthConfigAzure: {
          authType: ...,    // Azure-specific parameters to
          clientId: ...,    // be set when using extensionAzure
          authority: ...,   // plugin
          scopes: ...,
          clientSecret: ...
        }
        externalAuth: true, // must specify external authentication
        homogeneous: true,  // must use a homogeneous pool
        connectString: ...  // Oracle Autonomous Database connection string
      });
    }

For information on the Azure specific parameters, see
:ref:`_create_pool_azure_properties`.

See `azurecloudnativetoken.js <https://github.com/oracle/node-
oracledb/tree/main/examples/azurecloudnativetoken.js>`__ for a
runnable example using the :ref:`extensionAzure <extensionazureplugin>`
plugin.

.. _iamtokenbasedauthentication:

IAM Token-Based Authentication
------------------------------

Token-based authentication allows Oracle Cloud Infrastructure users to
authenticate to Oracle Database with Oracle Identity Access Management
(IAM) tokens. Both Thin and Thick modes of the node-oracledb driver support
IAM token-based authentication.

When using node-oracledb in Thick mode, Oracle Client libraries 19.14 (or
later), or 21.5 (or later) are needed.

See `Configuring the Oracle Autonomous Database for IAM
Integration <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
4E206209-4E3B-4387-9364-BDCFB4E16E2E>`__ for more information.

Standalone connections and pooled connections can be created in node-oracledb
Thick and Thin modes using IAM token-based authentication. This can be
done or by using the OCI CLI or by using OCI SDK or by using
node-oracledb’s OCI Cloud Native Authentication Plugin (extensionOci).

.. _iamtokengeneration:

IAM Token Generation
++++++++++++++++++++

Authentication tokens can be obtained in several ways.

**Token Generation Using OCI CLI**

For example, you can use the Oracle Cloud Infrastructure command line
interface (OCI CLI) command run externally to Node.js:

::

    oci iam db-token get

On Linux a folder ``.oci/db-token`` will be created in your home
directory. It will contain the token and private key files needed by
node-oracledb.

See `Working with the Command Line Interface <https://docs.oracle.com/en-us/
iaas/Content/API/Concepts/cliconcepts.htm>`__ for more information on the OCI
CLI.

**Token Generation Using OCI SDK**

Alternatively, IAM authentication tokens can be generated in the node-oracledb
driver using the Oracle Cloud Infrastructure (OCI) SDK. This was introduced in
node-oracledb 6.3. To use the OCI SDK, you must install the `oci-sdk package
<https://www.npmjs.com/package/oci-sdk>`__ which can be done with the
following command::

    npm install oci-sdk

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.

**Token Generation Using extensionOci Plugin**

See :ref:`cloudnativeauthoci`.

.. _iamtokenextraction:

IAM Token and Private Key Extraction
++++++++++++++++++++++++++++++++++++

Token and private key files created externally can be read by Node.js
applications, for example like:

.. code-block:: javascript

    function getIAMToken() {
        const tokenPath = '/home/cjones/.oci/db-token/token';
        const privateKeyPath = '/home/cjones/.oci/db-token/oci_db_key.pem';

        let token = '';
        let privateKey = '';
        try {
            // Read the token file
            token = fs.readFileSync(tokenPath, 'utf8');
            // Read the private key file
            const privateKeyFileContents = fs.readFileSync(privateKeyPath, 'utf-8');
            privateKeyFileContents.split(/\r?\n/).forEach(line => {
                if (line != '-----BEGIN PRIVATE KEY-----' &&
                    line != '-----END PRIVATE KEY-----')
                privateKey = privateKey.concat(line);
            });
        } catch (err) {
            console.error(err);
        } finally {
            const tokenBasedAuthData = {
                token       : token,
                privateKey  : privateKey
            };
            return tokenBasedAuthData;
        }
    }

The token and key can be used during subsequent authentication.

Token and private key values generated by the OCI SDK can be read by your
application. For example:

.. code-block:: javascript

    async function getToken(accessTokenConfig) {
        ... // OCI-specific authentication details
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
The use of ``getToken()`` and ``accessTokenConfig`` is shown in subsequent
examples.

.. _iamstandalone:

IAM Standalone Connections
++++++++++++++++++++++++++

Standalone connections can be created in the node-oracledb Thin and Thick
modes using IAM token-based authentication.

.. code-block:: javascript

    let accessTokenObj;  // the token object. In this app it is also the token "cache"

    function tokenCallback(refresh) {
        if (refresh || !accessTokenObj) {
            accessTokenObj = getIAMToken();     // getIAMToken() was shown earlier
        }
        return accessTokenObj;
    }

    async function run() {
        await oracledb.getConnection({
            accessToken    : tokenCallback,  // the callback returns the token object
            externalAuth   : true,           // must specify external authentication
            connectString  : '...'           // Oracle Autonomous Database connection string
        });
    }

In this example, the global object ``accessTokenObj`` is used to “cache”
the IAM access token and private key (using the attributes ``token`` and
``privateKey``) so any subsequent callback invocation will not
necessarily have to incur the expense of externally getting them. For
example, if the application opens two connections for the same user, the
token and private key acquired for the first connection can be reused
without needing to make a second REST call.

The ``getConnection()`` function’s
:ref:`accessToken <getconnectiondbattrsaccesstoken>` attribute in this
example is set to the callback function that returns an IAM token and
private key used by node-oracledb for authentication. This function
``tokenCallback()`` will be invoked when ``getConnection()`` is called.
If the returned token is found to have expired, then ``tokenCallback()``
will be called a second time. If the second invocation of
``tokenCallback()`` also returns an expired token, then the connection
will fail.

The ``refresh`` parameter is set internally by the node-oracledb driver
depending on the status and validity of the authentication token provided by
the application. The value of the ``refresh`` parameter will be different
every time the callback is invoked:

-  When ``refresh`` is *true*, the token is known to have expired so the
   application must get a new token and private key. These are then
   stored in the global object ``accessTokenObj`` and returned.

-  When ``refresh`` is *false*, the application can return the token and
   private key stored in ``accessTokenObj``, if it is set. But if it is
   not set (meaning there is no token or key cached), then the
   application externally acquires a token and private key, stores them
   in ``accessTokenObj``, and returns it.

If you set the
:ref:`accessTokenConfig <getconnectiondbattrsaccesstokenconfig>` property in
addition to the :ref:`accessToken <getconnectiondbattrsaccesstoken>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
during standalone connection creation, then you can use the OCI SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig); // getToken() was shown earlier
        }
        return accessTokenData;
    }

    async function run() {
        await oracledb.getConnection({
            accessToken   : callbackfn,        // the callback returning the token
            accessTokenConfig : {
                                    ...        // OCI-specific parameters to be set
                                                   // when using OCI SDK
                                }
            externalAuth  : true,              // must specify external authentication
            connectString : '...'              // Oracle Autonomous Database connection string
        });
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
The callback and ``refresh`` parameter descriptions are detailed in the
example above.

.. _iampool:

IAM Connection Pooling
++++++++++++++++++++++

Pooled connections can be created using IAM token-based authentication,
for example:

.. code-block:: javascript

    let accessTokenObj;  // The token string. In this app it is also the token "cache"

    function tokenCallback(refresh) {
        if (refresh || !accessTokenObj) {
            accessTokenObj = getIAMToken();      // getIAMToken() was shown earlier
        }
        return accessToken;
    }

    async function run() {
        await oracledb.createPool({
            accessToken   : tokenCallback,     // the callback returning the token
            externalAuth  : true,              // must specify external authentication
            homogeneous   : true,              // must use an homogeneous pool
            connectString : connect_string     // Oracle Autonomous Database connection string
        });
    }

See :ref:`IAM Standalone Connections <iamstandalone>` for a description of
the callback and ``refresh`` parameter. With connection pools, the
:ref:`accessToken <createpoolpoolattrsaccesstoken>` attribute sets a
callback function which will be invoked at the time the pool is created
(even if ``poolMin`` is 0). It is also called when the pool needs to
expand (causing new connections to be created) and the current token has
expired.

If you set the
:ref:`accessTokenConfig <createpoolpoolattrsaccesstokenconfig>` property
in addition to the :ref:`accessToken <createpoolpoolattrsaccesstoken>`,
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
during connection pool creation, then you can use the OCI SDK to
generate tokens in the callback method. For example:

.. code-block:: javascript

    let accessTokenData;  // The token string

    async function callbackfn(refresh, accessTokenConfig) {
        if (refresh || !accessTokenData) {
            accessTokenData = await getToken(accessTokenConfig);
        }
        return accessTokenData;
    }

    async function init() {
        await oracledb.createPool({
            accessToken   : tokenCallback,        // the callback returning the token
            accessTokenConfig : {
                                    ...           // OCI-specific parameters to be set
                                                      // when using Azure SDK
                                }
            externalAuth  : true,                 // must specify external authentication
            homogeneous   : true,                 // must use an homogeneous pool
            connectString : '...'                 // Oracle Autonomous Database connection string
        });
    }

See `sampleocitokenauth.js <https://github.com/oracle/node-oracledb/tree/main/
examples/sampleocitokenauth.js>`__ for a runnable example using the OCI SDK.
See :ref:`IAM Standalone Connections <iamstandalone>` for a description of
the callback and ``refresh`` parameter.

.. _iamconnectstring:

IAM Connection Strings
++++++++++++++++++++++

Applications built with node-oracledb 5.4, or later, should use the
connection or pool creation parameters described earlier. However, if
you cannot use them, you can use IAM Token Authentication by configuring
Oracle Net options.

.. note::

    In this release, IAM connection strings are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

This requires Oracle Client libraries 19.14 (or later), or 21.5 (or later).

Save the generated access token to a file and set the connect descriptor
``TOKEN_LOCATION`` option to the directory containing the token file.
The connect descriptor parameter ``TOKEN_AUTH`` must be set to
``OCI_TOKEN``, the ``PROTOCOL`` value must be ``TCPS``, the
``SSL_SERVER_DN_MATCH`` value should be ``ON``, and the parameter
``SSL_SERVER_CERT_DN`` should be set. For example, if the token and
private key are in the default location used by the `OCI CLI <https://
docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm>`__,
your :ref:`tnsnames.ora <tnsnames>` file might contain:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OCI_TOKEN)
          ))

This reads the IAM token and private key from the default location, for
example ``~/.oci/db-token/`` on Linux.

If the token and private key files are not in the default location then
their directory must be specified with the ``TOKEN_LOCATION`` parameter.
For example in a ``tnsnames.ora`` file:

::

  db_alias =
    (DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(PORT=1522)(HOST=abc.oraclecloud.com))
      (CONNECT_DATA=(SERVICE_NAME=db_low.adb.oraclecloud.com))
        (SECURITY=
          (SSL_SERVER_DN_MATCH=ON)
          (SSL_SERVER_CERT_DN="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
          (TOKEN_AUTH=OCI_TOKEN)
          (TOKEN_LOCATION="/opt/oracle/token")
          ))

You can alternatively set ``TOKEN_AUTH`` and ``TOKEN_LOCATION`` in a
:ref:`sqlnet.ora <tnsadmin>` file. The ``TOKEN_AUTH`` and
``TOKEN_LOCATION`` values in a :ref:`connection string <connectionstrings>`
take precedence over the ``sqlnet.ora`` settings.

See `Oracle Net Services documentation <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=NETRF>`__ for more information.

.. _cloudnativeauthoci:

Cloud Native Authentication with the extensionOci Plugin
++++++++++++++++++++++++++++++++++++++++++++++++++++++++

With Cloud Native Authentication, node-oracledb's
:ref:`extensionOci <extensionociplugin>` plugin can automatically generate and
refresh IAM tokens when required with the support of the `OCI SDK
<https://www.npmjs.com/package/oci-sdk>`__. This ability was introduced in
node-oracledb 6.8.

The :ref:`extensionOci <extensionociplugin>` plugin can be used by your
application by adding the following line to your code:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionOci');

The plugin has a Node package dependency which needs to be installed
separately before the plugin can be used. See :ref:`ocitokenmodules`.

The above line of code defines and registers a built-in hook function that
generates IAM tokens. This function is internally invoked when the
``tokenAuthConfigOci`` parameter is specified in calls to
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`. The
``tokenAuthConfigOci`` object contains the configuration parameters needed
for token generation. This hook function sets the ``accessToken`` parameter of
the connection methods to a callback function which uses the configuration
parameters to generate IAM tokens.

The ``extensionOci`` plugin is available as part of the `plugins/token
<https://github.com/oracle/node-oracledb/tree/main/plugins/token/
extensionOci/index.js>`__ directory in the node-oracledb package.

For OCI IAM token-based authentication with the :ref:`extensionOci
<extensionociplugin>` plugin, the ``tokenAuthConfigOci`` connection parameter
must be specified. This parameter should be a JavaScript object containing
the necessary configuration parameters for Oracle Database authentication. See
:ref:`_get_connection_oci_properties` for information on the OCI specific
parameters. All keys and values of the OCI parameters other than
``authType`` are used by the `OCI SDK
<https://www.npmjs.com/package/oci-sdk>`__ API calls in the plugin.

**Standalone Connections Using IAM Tokens**

When using the :ref:`extensionOci plugin <extensionociplugin>` to generate IAM
tokens, you need to set the
:ref:`tokenAuthConfigOci <getconnectiondbattrstokenauthconfigoci>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
in :meth:`oracledb.getConnection()`. For example:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionOci');

    async function run() {
      await oracledb.getConnection({
        tokenAuthConfigOci: {
          authType: ...,           // OCI-specific parameters to be set when
          profile: ...,            // using extensionOci plugin with authType
          configFileLocation: ...  // configFileBasedAuthentication
        }
        externalAuth: true,        // must specify external authentication
        connectString: ...         // Oracle Autonomous Database connection string
      });
    }

For information on the Azure specific parameters, see
:ref:`_get_connection_oci_properties`.

**Connection Pooling Using IAM Tokens**

When using the :ref:`extensionOci plugin <extensionociplugin>` to generate IAM
tokens, you need to set the
:ref:`tokenAuthConfigOci <createpoolpoolattrstokenauthconfigoci>`
:ref:`externalAuth <createpoolpoolattrsexternalauth>`,
:ref:`homogeneous <createpoolpoolattrshomogeneous>`, and
:ref:`connectString <createpoolpoolattrsconnectstring>` properties
in :meth:`oracledb.createPool()`. For example:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionOci');

    async function run() {
      await oracledb.createPool({
        tokenAuthConfigOci: {
          authType: ...,           // OCI-specific parameters to be set when
          tenancy: ...,            // using extensionOci plugin with authType
          user: ...                // simpleAuthentication
        }
        externalAuth: true,        // must specify external authentication
        connectString: ...         // Oracle Autonomous Database connection string
      });
    }

For more information on the OCI specific parameters, see
:ref:`_create_pool_oci_properties`.

See `ocicloudnativetoken.js <https://github.com/oracle/node-
oracledb/tree/main/examples/ocicloudnativetoken.js>`__ for a
runnable example using the extensionOci plugin.

.. _instanceprincipalauth:

Instance Principal Authentication
=================================

With Instance Principal Authentication, Oracle Cloud Infrastructure (OCI)
compute instances can be authorized to access services on Oracle Cloud such as
Oracle Autonomous Database (ADB). Node-oracledb applications running on such a
compute instance do not need to provide database user credentials.

Each compute instance behaves as a distinct type of Identity and Access
Management (IAM) Principal, that is, each compute instance has a unique
identity in the form of a digital certificate which is managed by OCI. When
using Instance Principal Authentication, a compute instance authenticates with
OCI IAM using this identity and obtains a short-lived token. This token is
then used to access Oracle Cloud services without storing or managing any
secrets in your application.

The example below demonstrates how to connect to Oracle Autonomous
Database using Instance Principal authentication. To enable this, use
node-oracledb's pre-supplied :ref:`extensionOci <extensionociplugin>` plugin.

**Step 1: Create an OCI Compute Instance**

An `OCI compute instance <https://docs.oracle.com/en-us/iaas/compute-cloud-at-
customer/topics/compute/compute-instances.htm>`__ is a virtual machine running
within OCI that provides compute resources for your application. This compute
instance will be used to authenticate access to Oracle Cloud services when
using Instance Principal Authentication.

To create an OCI compute instance, see the steps in `Creating an Instance
<https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/
launchinginstance.htm>`__ section of the Oracle Cloud Infrastructure
documentation.

For more information on OCI compute instances, see `Calling Services from a
Compute Instance <https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/
callingservicesfrominstances.htm>`__.

**Step 2: Install the OCI CLI on your compute instance**

The `OCI Command Line Interface (CLI) <https://docs.oracle.com/en-us/iaas/
Content/API/Concepts/cliconcepts.htm>`__ that can be used on its own or with
the Oracle Cloud console to complete OCI tasks.

To install the OCI CLI on your compute instance, see the installation
instructions in the `Installing the CLI <https://docs.oracle.com/en-us/iaas/
Content/API/SDKDocs/cliinstall.htm>`__ section of Oracle Cloud Infrastructure
documentation.

**Step 3: Create a Dynamic Group**

A Dynamic Group is used to define rules to group the compute instances that
require access.

To create a dynamic group using the Oracle Cloud console, see the steps in the
`To create a dynamic group <https://docs.oracle.com/en-us/iaas/Content/
Identity/Tasks/managingdynamicgroups.htm#>`__ section of the Oracle Cloud
Infrastructure documentation.

**Step 4: Create an IAM Policy**

An IAM Policy is used to grant a dynamic group permission to access the
required OCI services such as Oracle Autonomous Database.

To create an IAM policy using Oracle Cloud console, see the steps in the
`Create an IAM Policy <https://docs.oracle.com/en-us/iaas/application-
integration/doc/creating-iam-policy.html>`__ section of the Oracle Cloud
Infrastructure documentation.

**Step 5: Map an Instance Principal to an Oracle Database User**

You must map the Instance Principal to an Oracle Database user. For more
information, see `Accessing the Database Using an Instance Principal
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1B648FB0-BE86-
4BCE-91D0-239D287C638B>`__.

Also, make sure that external authentication is enabled on Oracle ADB and the
Oracle Database parameter ``IDENTITY_PROVIDER_TYPE`` is set to *OCI_IAM*. For
the steps, see `Enable IAM Authentication on ADB <https://docs.oracle.com/en/
cloud/paas/autonomous-database/serverless/adbsb/enable-iam-authentication
.html>`__.

**Step 6: Deploy your application on the Compute Instance**

To use Instance Principal authentication, set the
:ref:`tokenAuthConfigOci <getconnectiondbattrstokenauthconfigoci>`,
:ref:`externalAuth <getconnectiondbattrsexternalauth>`, and
:ref:`connectString <getconnectiondbattrsconnectstring>` properties
when creating a standalone connection or a connection pool. For example:

.. code-block:: javascript

    const tokenPlugin = require('oracledb/plugins/token/extensionOci');

    async function run() {
      await oracledb.getConnection({
        tokenAuthConfigOci: {
          authType: "instancePrincipal"
        }
        externalAuth: true,        // must specify external authentication
        connectString: ...         // Oracle ADB connection string
      });
    }

For information on the OCI specific parameters, see
:ref:`_get_connection_oci_properties`.

.. _drcp:

Database Resident Connection Pooling (DRCP)
===========================================

`Database Resident Connection Pooling <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-015CA8C1-2386-4626-855D-CC546DDC1086>`__
(DRCP) enables database resource sharing for applications which use a large
number of connections that run in multiple client processes or run on multiple
middle-tier application servers. DRCP reduces the overall number of
connections that a database must handle. DRCP support is available in both
Thin and :ref:`Thick <enablingthick>` modes.

DRCP is generally used only when the database host does not have enough
memory to keep all connections open concurrently. For example, if your
application runs as 10 Node.js processes each with a connection pool
having ``poolMax`` of 50, then the database host must be able to have 10
\* 50 = 500 database server processes open at the same time. If the
database host does not have enough memory for these 500 server
processes, then DRCP may be a solution because a smaller pool of server
processes will be shared between all the Node.js connections.

DRCP is useful for applications which share the same database
credentials, have similar session settings (for example date format
settings or PL/SQL package state), and where the application gets a
database connection, works on it for a relatively short duration, and
then releases it.

For efficiency, it is recommended that DRCP connections should be used
with node-oracledb’s local :ref:`connection pool <poolclass>`. Using DRCP with
:ref:`standalone connections <standaloneconnection>` is not as efficient but
does allow the database to reuse database server processes which can provide a
performance benefit for applications that cannot use a local connection pool.
In this scenario, make sure to configure enough DRCP authentication servers to
handle the connection load.

Although applications can choose whether or not to use DRCP pooled connections
at runtime, care must be taken to configure the database appropriately for the
number of expected connections, and also to stop inadvertent use of non-DRCP
connections leading to a database server resource shortage. Conversely, avoid
using DRCP connections for long-running operations.

For more information about DRCP, see the technical brief `Extreme Oracle
Database Connection Scalability with Database Resident Connection Pooling
(DRCP) <https://www.oracle.com/docs/tech/drcp-technical-brief.pdf>`__, the user
documentation `Oracle Database Concepts Guide
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
id=GUID-531EEE8A-B00A-4C03-A2ED-D45D92B3F797>`__ and `Oracle Database
Development Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-015CA8C1-2386-4626-855D-CC546DDC1086>`__. For DRCP Configuration, see
`Oracle Database Administrator's Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-82FF6896-F57E-41CF-89F7-755F3BC9C924>`__.

To use DRCP with node-oracledb, perform the following steps:

1. :ref:`Enable DRCP in the database <enablingdrcp>`.
2. :ref:`Configure the application to use DRCP pooled servers
   <configuredrcp>`.

.. _enablingdrcp:

Enabling DRCP in Oracle Database
--------------------------------

Oracle Database versions prior to 21c have a single DRCP connection pool. From
Oracle Database 21c, each pluggable database can optionally have its own pool,
or can use the container level pool. From Oracle Database 23ai, you can create
multiple pools at the pluggable, or container, database level. This
multi-pool feature is useful where different applications connect to the same
database, but there is a concern that one application's use of the pool may
impact other applications. If this is not the case, a single pool may allow
best resource sharing on the database host.

Note that DRCP is already enabled in Oracle Autonomous Database and pool
management is different to the steps below.

DRCP pools can be configured and administered by a DBA using the
``DBMS_CONNECTION_POOL`` package:

.. code-block:: sql

    EXECUTE DBMS_CONNECTION_POOL.CONFIGURE_POOL(
      pool_name => 'SYS_DEFAULT_CONNECTION_POOL',
      minsize => 4,
      maxsize => 40,
      incrsize => 2,
      session_cached_cursors => 20,
      inactivity_timeout => 300,
      max_think_time => 600,
      max_use_session => 500000,
      max_lifetime_session => 86400)

Alternatively, the method ``DBMS_CONNECTION_POOL.ALTER_PARAM()`` can
set a single parameter:

.. code-block:: sql

    EXECUTE DBMS_CONNECTION_POOL.ALTER_PARAM(
      pool_name => 'SYS_DEFAULT_CONNECTION_POOL',
      param_name => 'MAX_THINK_TIME',
      param_value => '1200')

The ``inactivity_timeout`` parameter terminates idle pooled servers, helping
optimize database resources. To avoid pooled servers permanently being held
onto by a Node.js script, the ``max_think_time`` parameter can be set. The
parameters ``num_cbrok`` and ``maxconn_cbrok`` can be used to distribute the
persistent connections from the clients across multiple brokers. This may be
needed in cases where the operating system per-process descriptor limit is
small. Some customers have found that having several connection brokers
improves performance. The ``max_use_session`` and ``max_lifetime_session``
parameters help protect against any unforeseen problems affecting server
processes. The default values will be suitable for most users. See the
`Oracle DRCP documentation <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-015CA8C1-2386-4626-855D-CC546DDC1086>`__ for details on these
parameters.

In general, if pool parameters are changed, then the pool should be restarted.
Otherwise, server processes will continue to use old settings.

You can use a ``DBMS_CONNECTION_POOL.RESTORE_DEFAULTS()`` procedure to reset
all of the values.

When DRCP is used with `Oracle RAC <https://www.oracle.com/database/real-
application-clusters/>`__, each database instance has its own connection
broker and pool of servers. Each pool has the identical configuration. For
example, all pools start with ``minsize`` server processes. A single
DBMS_CONNECTION_POOL command will alter the pool of each instance at the same
time. The pool needs to be started before connection requests begin. The
command below does this by bringing up the broker, which registers itself with
the database listener:

.. code-block:: sql

    EXECUTE DBMS_CONNECTION_POOL.START_POOL()

Once enabled this way, the pool automatically restarts when the database
instance restarts, unless explicitly stopped with the
``DBMS_CONNECTION_POOL.STOP_POOL()`` command:

.. code-block:: sql

    EXECUTE DBMS_CONNECTION_POOL.STOP_POOL()

Oracle Database 23ai allows a ``DRAINTIME`` argument to be passed to
``STOP_POOL()``, indicating that the pool will only be closed after the
specified time. This allows in-progress application work to continue. A
draintime value of *0* can be used to immediately close the pool. See the
database documentation on `DBMS_CONNECTION_POOL.STOP_POOL()
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-3FF5F327-7BE3
-4EA8-844F-29554EE00B5F>`__.

In older Oracle Database versions, the pool cannot be stopped while
connections are open.

.. _configuredrcp:

Configuring Application to Use DRCP
-----------------------------------

Application connections using DRCP should specify a user-chosen
:ref:`connection class name <drcpconnclasses>` when requesting a
:ref:`DRCP pooled server <pooledserver>`. A :ref:`'purity' <cclasspurity>` of
the connection session state can optionally be specified. See the Oracle
Database documentation on `benefiting from scalability <https://www.oracle.com
/pls/topic/lookup?ctx=dblatest&id=GUID-661BB906-74D2-4C5D-9C7E-
2798F76501B3>`__ for more information on purity and connection classes.

The best practice is to use DRCP in conjunction with a local driver
:ref:`connection pool <connpooling>` created with
:meth:`oracledb.createPool()`. The node-oracledb connection pool size does not
need to match the DRCP pool size. The limit on overall execution parallelism
is determined by the DRCP pool size. Note that when using DRCP with a
node-oracledb local connection pool in Thick mode, the local connection pool
``min`` value is ignored and the pool will be created with zero connections.

.. _pooledserver:

**Use a Pooled Server for a Connection**

To enable connections to use a pooled server, you can:

- Specify to use a pooled server in the ``connectString`` property (or its
  alias ``connectionString``) of :meth:`oracledb.createPool()` or
  :meth:`oracledb.getConnection()`. For example with the :ref:`Easy Connect
  syntax <easyconnect>`:

  .. code-block:: javascript

    const pool = await oracledb.createPool({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1:pooled"
    });

- Alternatively, add ``(SERVER=POOLED)`` to the :ref:`Connect Descriptor
  <embedtns>` such as used in an Oracle Network configuration file
  :ref:`tnsnames.ora <tnsnames>`::

    customerpool = (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)
              (HOST=dbhost.example.com)
              (PORT=1521))(CONNECT_DATA=(SERVICE_NAME=CUSTOMER)
              (SERVER=POOLED)))

.. _drcpconnclasses:

**Setting DRCP Connection Classes**

The best practice is to specify a name for a connection by using the
:attr:`oracledb.connectionClass` property. If it is set, then the connection
class specified in this property is used in both standalone and pooled
connections. This user-chosen name provides some partitioning of DRCP session
memory so reuse is limited to similar applications. It provides maximum pool
sharing if multiple application processes are started and use the same class
name. A class name also allows better DRCP usage tracking in the database. In
the database monitoring views, the class name shown will be the value
specified in the application prefixed with the user name.

To enable a connection to use a pooled server and to specify a class name, you
can use:

.. code-block:: javascript

    oracledb.connectionClass = 'HRPOOL';

    const pool = await oracledb.createPool({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1:pooled"
    });

You can also specify the connection class in a connection string by setting
the ``POOL_CONNECTION_CLASS`` parameter. If this parameter is set, then this
connection class is used in both standalone and pooled connections. See
:ref:`Setting the Connection Class and Purity in the Connection String
<cclasspurity>`.

If both the :attr:`oracledb.connectionClass` property and the
``POOL_CONNECTION_CLASS`` connection string parameter are set, then the
``POOL_CONNECTION_CLASS`` parameter has the highest priority and overrides the
default or application specified values.

If :attr:`oracledb.connectionClass` and ``POOL_CONNECTION_CLASS`` connection
string parameter are not set, then:

- For standalone connections, the session request is sent to the shared
  connection class in DRCP.

- For pooled connections, the pool generates a unique connection class if a
  previously generated connection class does not exist. This connection class
  is used when acquiring connections from the pool. The node-oracledb Thin
  mode generates a connection class with the prefix "NJS" while the Thick mode
  generates a connection class with the prefix "OCI".

If the connection class is not set, the pooled server session memory will not
be reused optimally, and the statistic views will record large values for
``NUM_MISSES``.

**Acquiring a DRCP Connection**

Once DRCP has been enabled and the driver connection pool has been created
with the appropriate connection string, then your application can get a
connection from a pool that uses DRCP by calling:

.. code-block:: javascript

    const connection = pool.getConnection();

**Closing Connections when using DRCP**

Similar to using a node-oracledb connection pool, Node.js scripts where
node-oracledb connections do not go out of scope quickly (which releases
them), or do not currently use :meth:`connection.close()` should be examined
to see if the connections can be closed earlier. This allows maximum reuse of
DRCP pooled servers by other users:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb:pooled?pool_connection_class=MYAPP&pool_purity=self"
    });

    // Do some database operations
    const connection = pool.getConnection();

    ...

    connection.close();

    // Do lots of non-database work
    . . .

    // Do some more database operations
    const connection = pool.getConnection();   // Get a new pooled server only when needed
    . . .
    connection.close();

.. _cclasspurity:

Setting DRCP Parameters in Connection Strings
---------------------------------------------

You can specify the connection class and pool purity in connection strings
when using node-oracledb Thin mode with Oracle Database 21c (or later). For
node-oracledb Thick mode, you require Oracle Database 21c (or later) and
Oracle Client 19c (or later).

DRCP allows the connection session memory to be reused or cleaned each time a
connection is acquired from the pool by specifying the pool purity. You can
specify the pool purity in node-oracledb by setting the ``POOL_PURITY``
parameter in a connection string. The valid values for ``POOL_PURITY`` are
*SELF* and *NEW*. These values are not case-sensitive. The value *NEW*
indicates that the application must use a new session. The value *SELF* allows
the application to reuse both the pooled server process and session memory,
giving maximum benefit from DRCP. By default, node-oracledb pooled connections
use *SELF* and standalone connections use *NEW*.

The connection class can be specified in a connection string by setting the
``POOL_CONNECTION_CLASS`` parameter. The value for ``POOL_CONNECTION_CLASS``
can be any string conforming to connection class semantics and is
case-sensitive.

An example of setting the connection class and pool purity in an
:ref:`Easy Connect <easyconnect>` syntax is shown below:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb:pooled?pool_connection_class=MYAPP&pool_purity=self"
    });

An example of setting the connection class and pool purity in a
:ref:`Connect Descriptor <embedtns>` is shown below::

    db_alias =
        (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(PORT=1522)(HOST=abc.oraclecloud.com))
          (CONNECT_DATA=(SERVICE_NAME=cdb1_pdb1.regress.rdbms.dev.us.oracle.com)(SERVER=POOLED)
          (POOL_CONNECTION_CLASS=cclassname)(POOL_PURITY=SELF)))

.. _monitoringdrcp:

Monitoring DRCP
---------------

Data dictionary views are available to monitor the performance of DRCP.
Database administrators can check statistics such as the number of busy and
free servers, and the number of hits and misses in the pool against the total
number of requests from clients. The views include:

- DBA_CPOOL_INFO
- V$PROCESS
- V$SESSION
- V$CPOOL_STATS
- V$CPOOL_CC_STATS
- V$CPOOL_CONN_INFO

**DBA_CPOOL_INFO View**

DBA_CPOOL_INFO displays configuration information about the DRCP pool. The
columns are equivalent to the ``dbms_connection_pool.configure_pool()``
settings described in the table of DRCP configuration options, with the
addition of a STATUS column. The status is ``ACTIVE`` if the pool has been
started and ``INACTIVE`` otherwise. Note that the pool name column is called
CONNECTION_POOL. This example checks whether the pool has been started and
finds the maximum number of pooled servers::

    SQL> SELECT connection_pool, status, maxsize FROM dba_cpool_info;

    CONNECTION_POOL              STATUS        MAXSIZE
    ---------------------------- ---------- ----------
    SYS_DEFAULT_CONNECTION_POOL  ACTIVE             40

**V$PROCESS and V$SESSION Views**

The V$SESSION view shows information about the currently active DRCP
sessions. It can also be joined with V$PROCESS through
``V$SESSION.PADDR = V$PROCESS.ADDR`` to correlate the views.

**V$CPOOL_STATS View**

The V$CPOOL_STATS view displays information about the DRCP statistics for
an instance. The V$CPOOL_STATS view can be used to assess the efficiency of
the pool settings. This example query shows an application using the pool
effectively. The low number of misses indicates that servers and sessions were
reused. The wait count shows just over 1% of requests had to wait for a pooled
server to become available::

    NUM_REQUESTS   NUM_HITS NUM_MISSES  NUM_WAITS
    ------------ ---------- ---------- ----------
           10031      99990         40       1055

If ``connectionClass`` was set (allowing pooled servers and sessions to be
reused), then NUM_MISSES will be low. If the pool maxsize is too small for
the connection load, then NUM_WAITS will be high.

**V$CPOOL_CC_STATS View**

The view V$CPOOL_CC_STATS displays information about the connection class
level statistics for the pool per instance::

    SQL> select cclass_name, num_requests, num_hits, num_misses
         from v$cpool_cc_stats;

    CCLASS_NAME                      NUM_REQUESTS   NUM_HITS NUM_MISSES
    -------------------------------- ------------ ---------- ----------
    HR.MYCLASS                             100031      99993         38

The class name columns shows the database user name appended with the
connection class name.

**V$CPOOL_CONN_INFO View**

The V$POOL_CONN_INFO view gives insight into client processes that are
connected to the connection broker, making it easier to monitor and trace
applications that are currently using pooled servers or are idle. This view
was introduced in Oracle 11gR2.

You can monitor the view V$CPOOL_CONN_INFO to, for example, identify
misconfigured machines that do not have the connection class set correctly.
This view maps the machine name to the class name. In node-oracledb Thick
mode, the class name will default to one as shown below::

    SQL> select cclass_name, machine from v$cpool_conn_info;

    CCLASS_NAME                             MACHINE
    --------------------------------------- ------------
    GK.OCI:SP:wshbIFDtb7rgQwMyuYvodA        gklinux

In this example, you would examine applications on ``gklinux`` and make them
set ``connectionClass``.

When connecting to Oracle Autonomous Database on Shared Infrastructure (ADB-S),
the V$CPOOL_CONN_INFO view can be used to track the number of connection
hits and misses to show the pool efficiency.

.. _implicitpool:

Implicit Connection Pooling
===========================

`Implicit connection pooling <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-A9D74994-D81A-47BF-BAF2-E4E1A354CA99>`__ is useful for
applications that cause excess database server load due to the number of
:ref:`standalone connections <standaloneconnection>` opened. When these
applications cannot be rewritten to use
:ref:`node-oracledb connection pooling <connpooling>`, then implicit
connection pooling may be an option to reduce the load on the database system.

Implicit connection pooling allows application connections to share pooled
servers in :ref:`DRCP <drcp>` or Oracle Connection Manager in Traffic Director
Mode's (CMAN-TDM) `Proxy Resident Connection Pooling (PRCP)
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E0032017-03B1-
4F14-AF9B-BCC87C982DA8>`__. Applications do not need to be modified. The
feature is enabled by adding a ``POOL_BOUNDARY`` parameter to the
application's :ref:`connection string <connectionstrings>`. Applications do
not need to explicitly acquire, or release, connections to be able use a DRCP
or PRCP pool.

Implicit connection pooling is available in node-oracledb Thin and
:ref:`Thick <enablingthick>` modes. It requires Oracle Database
23ai. Node-oracledb Thick mode additionally requires Oracle Client 23ai
libraries. The Thin mode works with implicit connection pooling from
node-oracledb 6.4 onwards.

With implicit connection pooling, connections are internally acquired from the
DRCP or PRCP pool when they are actually used by the application to do database
work. They are internally released back to pool when not in use. This may
occur between the application's explicit :meth:`oracledb.getConnection()` call
and :meth:`connection.close()` (or the application's equivalent connection
release at end-of-scope). The internal connection release can be controlled by
the value of the ``POOL_BOUNDARY`` connection string parameter, which can be
either:

- *STATEMENT*: If this boundary value is specified, then the connection is
  released back to the DRCP or PRCP pool when the connection is implicitly
  stateless. A connection is implicitly stateless when all open cursors in a
  session have been fetched through to completion, and there are no active
  transactions, no temporary tables, and no temporary LOBs.

- *TRANSACTION*: If this boundary value is specified, then the connection is
  released back to the DRCP or PRCP pool when either one of the methods
  :meth:`connection.commit()` or :meth:`connection.rollback()` are
  called. It is recommended to not set the
  :ref:`autoCommit <propexecautocommit>` property to *true* when using
  implicit connection pooling. If you do set this attribute to *true*, then
  you will be unable to:

  - Fetch any data that requires multiple :ref:`round-trips <roundtrips>` to
    the database
  - Run queries that fetch :ref:`LOB <lobhandling>` and
    :ref:`JSON <jsondatatype>` data

Inline with DRCP and PRCP best practices regarding session sharing across
differing applications, you should add a connection string
``POOL_CONNECTION_CLASS`` parameter, using the same value for all applications
that are alike.

The DRCP and PRCP "purity" used by Implicit Connection Pooling defaults to
SELF, which allows reuse of the server process session memory for best
performance. Adding the connection string parameter ``POOL_PURITY=NEW`` will
change this and cause each use of a connection to recreate the session memory.

.. _useimplicitconnpool:

**Configuring Implicit Connection Pooling**

To use implicit connection pooling in node-oracledb with DRCP:

1. Enable DRCP in the database. For example in SQL*Plus::

    SQL> EXECUTE DBMS_CONNECTION_POOL.START_POOL();

2. Specify the server type as *pooled* and also set the ``POOL_BOUNDARY``
   attribute to either *STATEMENT* or *TRANSACTION* in:

   - The ``connectString`` property of :meth:`oracledb.getConnection()` or
     :meth:`oracledb.createPool()` in the
     :ref:`Easy Connect string <easyconnect>`. For example:

     .. code-block:: javascript

        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // mypw contains the hr schema password
            connectString : "mydbmachine.example.com:1521/orclpdb1:pooled?pool_boundary=statement"
        });

     In the above example, implicit connection pooling is set to use statement
     boundary to release the connections back to the DRCP or PRCP pool.

   - Or the ``CONNECT_DATA`` section of the
     :ref:`Connect Descriptor <embedtns>` used in an Oracle Network
     configuration file such as :ref:`tnsnames.ora <tnsadmin>`. For example,
     to use implicit connection pooling with the *transaction* boundary::

        tnsalias = (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=mymachine.example.com)
                    (PORT=1521))(CONNECT_DATA=(SERVICE_NAME=orcl)
                    (SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)))

     In the above example, implicit connection pooling is set to use
     transaction boundary to release the connections back to the DRCP or PRCP
     pool.

     .. note::

        Implicit connection pooling is not enabled if the application sets the
        ``POOL_BOUNDARY`` attribute to *TRANSACTION* or *STATEMENT* but does
        not set the ``SERVER=POOLED`` attribute in the connection string.

   If you specify an invalid ``POOL_BOUNDARY`` in the
   :ref:`Easy Connect string <easyconnect>` or the
   :ref:`Connect Descriptor <embedtns>`, then the following error is
   returned::

    ORA-24545: invalid value of POOL_BOUNDARY specified in connect string

3. Set the connection class in:

   - The ``connectString`` property of :meth:`oracledb.getConnection()` or
     :meth:`oracledb.createPool()` in the
     :ref:`Easy Connect string <easyconnect>`. For example, to use a class
     name 'myapp':

     .. code-block:: javascript

        const connection = await oracledb.getConnection({
            user          : "hr",
            password      : mypw,  // mypw contains the hr schema password
            connectString : "mydbmachine.example.com:1521/orclpdb1:pooled?pool_boundary=statement&pool_connection_class=myapp"
        });

   - Or the ``CONNECT_DATA`` section of the :ref:`Connect Descriptor
     <embedtns>`. For example, to use a class name 'myapp'::

        tnsalias = (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=mymachine.example.com)
                    (PORT=1521))(CONNECT_DATA=(SERVICE_NAME=orcl)
                    (SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)
                    (POOL_CONNECTION_CLASS=myapp)))

   Use the same connection class name for application processes of the same
   type where you want session memory to be reused for connections.

   The pool purity can also optionally be changed by adding ``POOL_PURITY=NEW``
   to the Easy Connect string or Connect Descriptor.

Similar steps can be used with PRCP. For general information on PRCP, see the
technical brief `CMAN-TDM — An Oracle Database connection proxy for scalable
and highly available applications <https://download.oracle.com/
ocomdocs/global/CMAN_TDM_Oracle_DB_Connection_Proxy_for_scalable_apps.pdf>`__.

**Implicit Pooling Notes**

You should thoroughly test your application when using implicit connection
pooling to ensure that the internal reuse of database servers does not cause
any problems. For example, any session state such as the connection `session
id and serial number <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__ will vary throughout the
lifetime of the application connection because different servers may be used
at different times. Another example is when using a statement boundary of
*transaction*. In this scenario, any commit can invalidate open cursors.

It is recommended to use node-oracledb's local :ref:`connpooling` where
possible instead of implicit connection pooling. This gives multi-user
applications more control over pooled server reuse.

.. _privconn:

Privileged Connections
======================

Database privileges such as ``SYSDBA`` or ``SYSOPER`` can be associated with
the user when creating standalone and pooled connections. You can use one of
the :ref:`Privileged Connection Constants <oracledbconstantsprivilege>` as the
database privilege for the user.

For :ref:`standalone connections <standaloneconnection>`, you must set the
:ref:`privilege <getconnectiondbattrsprivilege>` property in
:meth:`oracledb.getConnection()` as shown in the example below:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "sys",
        password      : "secret",
        connectString : "localhost/orclpdb1",
        privilege     : oracledb.SYSDBA
    });

    console.log("I have power");

For :ref:`pooled connections <connpooling>` with node-oracledb Thin mode, you
must set the :ref:`privilege <createpoolpoolattrsprivilege>`,
:ref:`user <createpoolpoolattrsuser>`, and
:ref:`password <createpoolpoolattrspassword>` properties in
:meth:`oracledb.createPool()`. For example:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        user          : "sys",
        password      : "secret",
        connectString : "localhost/orclpdb1",
        privilege     : oracledb.SYSDBA
        poolMin       : 2,
        poolMax       : 10
    });

    const connection = await pool.getConnection();

The ability to specify database privileges with pooled connections in Thin
mode was introduced in node-oracledb 6.5.1.

For node-oracledb Thick mode, privileged connections can only be created with
a :ref:`heterogeneous pool <connpoolproxy>`. You must set the
:ref:`homogeneous <createpoolpoolattrshomogeneous>` property to *false* in
:meth:`oracledb.createPool()` to use a heterogeneous pool. You can then
specify the :ref:`privilege <getconnectiondbattrsprivilege>`,
:ref:`user <getconnectiondbattrsuser>`, and
:ref:`password <getconnectiondbattrspassword>` properties in
:meth:`pool.getConnection()`. For example:

.. code-block:: javascript

    const pool = await oracledb.createPool({
        connectString : "localhost/orclpdb1",
        homogeneous   : false,
        poolMax       : 10
    });

    const connection = await pool.getConnection({
        user          : "sys",
        password      : "secret",
        privilege     : oracledb.SYSDBA
    })

If you create a homogeneous pool with an invalid value specified in the
:ref:`privilege <createpoolpoolattrsprivilege>` property of
:meth:`oracledb.createPool()` in both node-oracledb Thin and Thick modes, then
the following error is raised::

    NJS-007: invalid value for "privilege" in parameter 1

However, any valid ``privilege`` property value is ignored in node-oracledb
Thick mode during homogeneous pool creation.

Note that if node-oracledb Thick mode is using the Oracle Client libraries
located in the Oracle Database installation, that is on the same machine as
the database and is not using Oracle Instant Client, then operating system
privileges may be used for authentication. In this case the password
value is ignored. For example on Linux, membership of the operating
system `dba <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-0A789F28-169A-43D6-9E48-AAE20D7B0C44>`__ group allows ``SYSDBA``
connections.

Administrative privileges can allow access to a database instance even
when the database is not open. Control of these privileges is totally
outside of the database itself. Care must be taken with authentication
to ensure security. See the `Database Administrator’s
Guide <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
C48021EF-6AEA-427F-95B2-37EFCFEA2400>`__ for information.

.. _securenetwork:

Securely Encrypting Network Traffic to Oracle Database
======================================================

You can `encrypt <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-7F12066A-2BA1-476C-809B-BB95A3F727CF>`__ the data transferred between Oracle
Database and node-oracledb so that unauthorized parties are not able to view
plain text values as the data passes over the network.

Both node-oracledb Thin and Thick modes support :ref:`TLS <connectionadb>`.
Refer to the `Oracle Database Security Guide <https://www.oracle.com/pls/topic
/lookup?ctx=dblatest&id=GUID-41040F53-D7A6-48FA-A92A-0C23118BC8A0>`__ for more
configuration information.

.. _nne:

Native Network Encryption
-------------------------

With Oracle Database's `native network encryption <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-7F12066A-2BA1-476C-809B-BB95A3F727CF>`__,
the client and database server negotiate a key using Diffie-Hellman key
exchange. There is protection against man-in-the-middle attacks.

.. note::

    Oracle native network encryption is only supported in node-oracledb Thick
    mode. See :ref:`enablingthick`.

Native network encryption can be configured by editing Oracle Net’s
optional `sqlnet.ora <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642>`__ configuration file. The file
on either the database server and/or on each node-oracledb ‘client’ machine
can be configured. Parameters control whether data integrity checking and
encryption is required or just allowed, and which algorithms the client and
server should consider for use.

As an example, to ensure all connections to the database are checked for
integrity and are also encrypted, create or edit the Oracle Database
``$ORACLE_HOME/network/admin/sqlnet.ora`` file. Set the checksum
negotiation to always validate a checksum and set the checksum type to
your desired value. The network encryption settings can similarly be
set. For example, to use the SHA512 checksum and AES256 encryption use::

    SQLNET.CRYPTO_CHECKSUM_SERVER = required
    SQLNET.CRYPTO_CHECKSUM_TYPES_SERVER = (SHA512)
    SQLNET.ENCRYPTION_SERVER = required
    SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)

If you definitely know that the database server enforces integrity and
encryption, then you do not need to configure node-oracledb separately.
However you can also, or alternatively, do so depending on your business
needs. Create a file ``sqlnet.ora`` on your client machine and locate it with
other :ref:`Optional Oracle Net Configuration <tnsadmin>`:

::

    SQLNET.CRYPTO_CHECKSUM_CLIENT = required
    SQLNET.CRYPTO_CHECKSUM_TYPES_CLIENT = (SHA512)
    SQLNET.ENCRYPTION_CLIENT = required
    SQLNET.ENCRYPTION_TYPES_CLIENT = (AES256)

The client and server sides can negotiate the protocols used if the
settings indicate more than one value is accepted.

Note these are example settings only. You must review your security
requirements and read the documentation for your Oracle version. In
particular, review the available algorithms for security and performance.

The ``NETWORK_SERVICE_BANNER`` column of the database view
`V$SESSION_CONNECT_INFO <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE>`__
can be used to verify the encryption status of a connection. For example with
SQL*Plus::

    SQL> SELECT network_service_banner FROM v$session_connect_info;

If the connection is encrypted, then this query prints an output that includes
the available encryption service, the crypto-checksumming service, and the
algorithms in use, such as::

    NETWORK_SERVICE_BANNER
    -------------------------------------------------------------------------------------
    TCP/IP NT Protocol Adapter for Linux: Version 19.0.0.0.0 - Production
    Encryption service for Linux: Version 19.0.1.0.0 - Production
    AES256 Encryption service adapter for Linux: Version 19.0.1.0.0 - Production
    Crypto-checksumming service for Linux: Version 19.0.1.0.0 - Production
    SHA256 Crypto-checksumming service adapter for Linux: Version 19.0.1.0.0 - Production

If the connection is unencrypted, then the query will only print the
available encryption and crypto-checksumming service messages. For example::

    NETWORK_SERVICE_BANNER
    -------------------------------------------------------------------------------------
    TCP/IP NT Protocol Adapter for Linux: Version 19.0.0.0.0 - Production
    Encryption service for Linux: Version 19.0.1.0.0 - Production
    Crypto-checksumming service for Linux: Version 19.0.1.0.0 - Production

For more information about Oracle Data Network Encryption and Integrity,
and for information about configuring TLS network encryption, refer to
the `Oracle Database Security Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=DBSEG>`__. This manual also contains information about
other important security features that Oracle Database provides, such
Transparent Data Encryption of data-at-rest in the database.

.. _changingpassword:

Changing Passwords and Connecting with an Expired Password
==========================================================

Changing Passwords
------------------

Database passwords can be changed with :meth:`connection.changePassword()`.
For example:

.. code-block:: javascript

    const currentpw = ...  // the current password for the hr schema
    const newpw = ...      // the new hr schema password

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : currentpw,
        connectString : "localhost/orclpdb1"
    });

    await connection.changePassword("hr", currentpw, newpw);

Only DBAs or users with the ALTER USER privilege can change the
password of another user. In this case, the old password value is
ignored and can be an empty string:

.. code-block:: javascript

    const newpw = ... // the new password

    const connection = await oracledb.getConnection({
        user          : "system",  // a privileged user
        password      : mypw,      // mypw contains the system schema password
        connectString : "localhost/orclpdb1"
    });

    await connection.changePassword('hr', '', newpw);

Connecting with an Expired Password
-----------------------------------

When creating a standalone (non-pooled) connection, the user’s password
can be changed at the time of connection. This is most useful when the
user’s password has expired, because it allows a user to connect without
requiring a DBA to reset their password.

Both the current and new passwords must be given when connecting. For
example:

.. code-block:: javascript

    const oldpw = ...  // the hr schema's old password
    const newpw = ...  // the new password

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : oldpw,
        newPassword   : newpw,
        connectString : "localhost/orclpdb1"
    });

.. _connectionha:

Connections and High Availability
=================================

To make highly available applications, use the latest versions of Oracle
node-oracledb and Oracle Database.  If you are using node-oracledb Thick mode,
then also use the latest Oracle Client libraries which have improved
implementations to make connections efficient and available. In addition,
features like :ref:`Connection Pool Pinging <connpoolpinging>`, :ref:`Fast
Application Notification (FAN) <connectionfan>`, :ref:`Application Continuity
<appcontinuity>`, and `Oracle Net Services
<https://www.oracle.com/pls/topic/lookup?ctx= dblatest&id=NETRF>`__ settings
can all help high availability, often without the application being aware of
any issue. Some of these features are only supported in node-oracledb
:ref:`Thick <enablingthick>` mode.

For application high availability, use a :ref:`connection
pool <connpooling>`. Pools provide immediately available connections.
Also the internal pool implementation supports a number of Oracle
Database high availability features for planned and unplanned database
instance downtime. Use a :ref:`fixed size pool <conpoolsizing>` to avoid
connection storms.

Configuring TCP timeouts can help avoid application hangs if there is a
network failure. :ref:`FAN <connectionfan>` is also useful.

Oracle Net options may be useful for high availability and performance
tuning. Connection establishment timeouts can be
:ref:`set <dbcalltimeouts>`. The database’s ``listener.ora`` file can have
`RATE_LIMIT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
F302BF91-64F2-4CE8-A3C7-9FDB5BA6DCF8>`__ and
`QUEUESIZE <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-FF87387C-1779-4CC3-932A-79BB01391C28>`__ parameters that can help
handle connection storms. In the bigger picture, Oracle Net can be used to
configure database service settings, such as for failover using
:ref:`Oracle RAC <connectionrac>` or a standby database.

:ref:`Database Resident Connection Pooling (DRCP) <drcp>` may be useful to
reduce load on a database host. It can also help reduce connection time
when a number of Node.js processes are used to scale up an application.

Finally, applications should always check for execution errors, and
perform appropriate application-specific recovery.

.. _connectionpremclose:

Preventing Premature Connection Closing
---------------------------------------

When connections are idle, external events may disconnect them from the
database. Unnecessarily having to re-establish connections can impact
scalability, cause connection storms, or lead to application errors when
invalid connections are attempted to be used.

There are three components to a node-oracledb connection:

1. The memory structure in node-oracledb that is returned by a
   ``getConnection()`` call. It may be a standalone connection or stored
   in a connection pool.

2. The underlying network connection between the database and the node-oracledb
   Thin mode network handling code or Oracle Client libraries.

3. A server process, or thread, on the database host to handle database
   processing.

Node-oracledb connections may become unusable due to network dropouts,
database instance failures, exceeding user profile resource limits, or
by explicit session closure of the server process from a DBA. By
default, idle connections (the memory structures) in connection pools
are unaware of these events. A subsequent ``pool.getConnection()`` call
could successfully return a “connection” to the application that will
not be usable. An error would only occur when later calling functions
like ``connection.execute()``. Similarly, using a standalone connection
where the network has dropped out, or the database instance is
unavailable, will return an error.

To avoid the overhead of connection re-creation, disable any firewall
that is killing idle connections. Also disable the database `resource
manager <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
2BEF5482-CF97-4A85-BD90-9195E41E74EF>`__ and any user resource profile
`IDLE_TIME <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3>`__ setting so they do not
terminate sessions. These issues can be hidden by node-oracledb’s automatic
connection re-establishment features so it is recommended to use
`AWR <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
56AEF38E-9400-427B-A818-EDEC145F7ACD>`__ to check the connection rate,
and then fix underlying causes.

You can use an 'expire time' setting to prevent firewalls from terminating idle
connections and to adjust keepalive timeouts.  The general recommendation is to
use a value that is slightly less than half of the termination period.  In
node-oracledb Thin mode you can set the value in the connection string or with
:ref:`expireTime <getconnectiondbattrsexpiretime>` when connecting.  This
setting can also aid detection of a terminated remote database server.

With node-oracledb Thick mode, when using Oracle Client 19c, `EXPIRE_TIME
<https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-6140611A-83FC-4C9C-B31F-A41FC2A5B12D>`__ can be
used in :ref:`tnsnames.ora <tnsnames>` connect descriptors or in :ref:`Easy
Connect strings <easyconnect>`. With Oracle Client 21c the setting can
alternatively be in the application’s :ref:`sqlnet.ora <tnsadmin>` file.  In
older versions of Oracle Client, a ``tnsnames.ora`` connect descriptor option
`ENABLE=BROKEN <https://www.
oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7A18022A-E40D-4880-B3CE-
7EE9864756CA>`__ can be used instead of ``EXPIRE_TIME``.

If the network or the database server processes used by node-oracledb
connections cannot be prevented from becoming unusable, tune :ref:`Connection
Pool Pinging <connpoolpinging>`. Another case where this internal
pinging is helpful is during development, where a laptop may go offline
for an extended time.

.. _connectionfan:

Fast Application Notification (FAN)
-----------------------------------

Users of `Oracle Database FAN <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-EB0E1525-D3B3-469C-BE22-A569C76864A6>`__
must connect to a FAN-enabled database service. The application should
have :attr:`oracledb.events` is set to *true*. This value can also be
changed via :ref:`Oracle Client Configuration <oraaccess>`.

.. note::

        In this release, FAN is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

FAN support is useful for planned and unplanned outages. It provides
immediate notification to node-oracledb following outages related to the
database, computers, and networks. Without FAN, node-oracledb can hang
until a TCP timeout occurs and a network error is returned, which might
be several minutes.

FAN allows node-oracledb to provide high availability features without
the application being aware of an outage. Unused, idle connections in a
connection pool will be automatically cleaned up. A future
``pool.getConnection()`` call will establish a fresh connection to a
surviving database instance without the application being aware of any
service disruption.

To handle errors that affect active connections, you can add application
logic to re-connect (this will connect to a surviving database instance)
and replay application logic without having to return an error to the
application user. Alternatively, use :ref:`Application
Continuity <appcontinuity>`.

FAN benefits users of Oracle Database’s clustering technology (:ref:`Oracle
RAC <connectionrac>`) because connections to surviving database
instances can be immediately made. Users of Oracle’s Data Guard with a
broker will get FAN events generated when the standby database goes
online. Standalone databases will send FAN events when the database
restarts.

For a more information on FAN see the `technical paper on Fast
Application Notification <https://www.oracle.com/technetwork/database/options
/clustering/applicationcontinuity/learnmore/fastapplicationnotification12c-
2538999.pdf>`__.

.. _connectionrlb:

Runtime Load Balancing (RLB)
----------------------------

:ref:`Oracle Database RAC <connectionrac>` users with `Oracle Database (RLB)
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-25F85237-702B
-4609-ACE2-1454EBC8284B>`__ advisory events configured should use
node-oracledb :ref:`Connection Pooling <connpooling>` and make sure
:attr:`oracledb.events` is *true*. The events mode can also be
changed via :ref:`Oracle Client Configuration <oraaccess>`.

.. note::

        In this release, RLB is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

RLB allows optimal use of database resources by balancing database
requests across RAC instances.

For a more information on RLB, see the `technical paper on Fast Application
Notification <https://www.oracle.com/technetwork/database/options/clustering/
applicationcontinuity/learnmore/fastapplicationnotification12c-2538999.pdf>`__.

.. _appcontinuity:

Application Continuity
----------------------

Node-oracledb OLTP applications can take advantage of continuous
availability with the Oracle Database features Application Continuity (AC)
and Transparent Application Continuity (TAC). These help make unplanned
database service downtime transparent to applications.

.. note::

    In this release, Oracle AC and TAC functionalities are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

See the technical papers `Application Checklist for Continuous Service for MAA
Solutions <https://www.oracle.com/a/tech/docs/application-checklist-for-
continuous-availability-for-maa.pdf>`__, `Continuous Availability Application
Continuity for the Oracle Database <https://www.oracle.com/technetwork/
database/options/clustering/applicationcontinuity/applicationcontinuity
formaa-6348196.pdf>`__, and `Continuous Availability Best Practices for
Applications Using Autonomous Database - Dedicated <https://www.oracle.com
/technetwork/database/options/clustering/applicationcontinuity/continuous-
service-for-apps-on-atpd-5486113.pdf>`__.

When AC or TAC are configured on the database service, they are transparently
available to node-oracledb applications.

.. _tg:

Transaction Guard
-----------------

From version 6.9 onwards, node-oracledb supports `Transaction Guard
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-A675AF7B-6FF0-
460D-A6E6-C15E7C328C8F>`__ which enables Node.js applications to verify the
success or failure of the last transaction in the event of an unplanned
outage. This feature requires Oracle Database 12.1 or later. For node-oracledb
Thick mode, Oracle Client 12.1 or later is additionally required.

Using Transaction Guard helps to

- Preserve the commit outcome
- Ensure a known outcome for every transaction

See `Oracle Database Development Guide <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-6C5880E5-C45F-4858-A069-A28BB25FD1DB>`__ for more
information about using Transaction Guard.

When an error occurs during a commit, the Node.js application can acquire the
logical transaction ID (``ltxid``) from the connection and then call a
procedure to determine the outcome of the commit for this logical transaction
ID.

To use Transaction Guard in node-oracledb in a single-instance database,
perform the following steps:

1. Grant execute privileges to the database users who will be checking the
   outcome of the commit. Log in as SYSDBA and run the following command:

   .. code-block:: sql

    GRANT EXECUTE ON DBMS_APP_CONT TO <username>;

2. Create a new service by calling `DBMS_SERVICE.CREATE_SERVICE
   <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-386E183E-
   D83C-48A7-8BA3-40248CFB89F4>`__ as SYSDBA.  Replace the
   ``<service-name>``, ``<network-name>`` and ``<retention-value>`` values
   with suitable values. Note that the ``COMMIT_OUTCOME`` parameter must be
   set to *true* for Transaction Guard to function properly.

   .. code-block:: sql

       DECLARE
           t_Params dbms_service.svc_parameter_array;
       BEGIN
           t_Params('COMMIT_OUTCOME') := 'true';
           t_Params('RETENTION_TIMEOUT') := <retention-value>;
           DBMS_SERVICE.CREATE_SERVICE('<service-name>', '<network-name>', t_Params);
       END;
       /

3. Start the service by calling `DBMS_SERVICE.START_SERVICE
   <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-140B93AC-
   9021-4091-B797-7CA3AAB446FE>`__ as SYSDBA:

   .. code-block:: sql

       BEGIN
           DBMS_SERVICE.START_SERVICE('<service-name>');
       END;
       /

Ensure that the service is running by examining the output of the following
query:

.. code-block:: sql

    SELECT name, network_name FROM V$ACTIVE_SERVICES ORDER BY 1;

Refer to Oracle documentation if you are using `RAC <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=RACAD>`__ or standby databases.

**Node.js Application code requirements to use Transaction Guard**

In the Node.js application code:

- Connect to the appropriately enabled database service. If the connection is
  TAF, AC, or TAC enabled, then do not proceed with Transaction Guard.

- Check :attr:`error.isRecoverable` to confirm the error is recoverable. If
  not, do not proceed with Transaction Guard.

- Use the connection attribute :attr:`connection.ltxid` to find the
  logical transaction ID.

- Call the `DBMS_APP_CONT.GET_LTXID_OUTCOME <https://www.oracle.com/pls/topic/
  lookup?ctx=dblatest&id=GUID-03CEB530-D3A5-40B1-87C8-5BF1BB5D5D54>`__ PL/SQL
  procedure with the logical transaction ID. This returns a boolean value
  indicating if the last transaction was committed and whether the last
  call was completed successfully or not.

- Take any necessary action to re-do uncommitted work.

See `transactionguard.js <https://github.com/oracle/node-oracledb/tree/main/
examples/transactionguard.js>`__ for an example of using Transaction Guard.

.. _dbcalltimeouts:

Database Call Timeouts
----------------------

Limiting the time to open new connections
+++++++++++++++++++++++++++++++++++++++++

To limit the amount of time taken to establish new connections to Oracle
Database:

- In node-oracledb Thin mode: You can use the connection attributes
  :ref:`connectTimeout <getconnectiondbattrsconntimeout>` or
  :ref:`transportConnectTimeout <getconnectiondbattrstransportconntimeout>`, or
  use the `CONNECT_TIMEOUT <https://www.
  oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F20C5DC5-C2FC-4145-9E4E-
  345CCB8148C7>`__ timeout parameter in a :ref:`connection string
  <easyconnect>`.

- In node-oracledb Thick mode: You can use `SQLNET.OUTBOUND_CONNECT_TIMEOUT
  <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-0857C817-675F
  -4CF0-BFBB-C3667F119176>`__ in a :ref:`sqlnet.ora <tnsadmin>` file or
  `CONNECT_TIMEOUT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
  GUID-F20C5DC5-C2FC-4145-9E4E-345CCB8148C7>`__ in a
  :ref:`connection string <easyconnect>`. When node-oracledb Thick mode uses
  Oracle Client libraries 19c or later, timeouts can be passed in
  :ref:`Easy Connect strings <easyconnect>`, for example to timeout after
  15 seconds: ``"mydbmachine.example.com/orclpdb1?connect_timeout=15"``.

When using a connection pool, these values affect the time taken to establish
each connection stored in the pool. The :attr:`~oracledb.queueTimeout` and
:attr:`~oracledb.queueMax` settings control higher-level pool behavior.

Limiting the time taken to execute statements
+++++++++++++++++++++++++++++++++++++++++++++

To limit the amount of time taken to execute statements on connections:

- In node-oracledb Thin mode: You can use :attr:`connection.callTimeout` which
  is described below.
- In node-oracledb Thick mode: You can use Oracle Net settings like
  `SQLNET.RECV_TIMEOUT <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&
  id=GUID-4A19D81A-75F0-448E-B271-24E5187B5909>`__ and `SQLNET.SEND_TIMEOUT
  <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-48547756-9C0B
  -4D14-BE85-E7ADDD1A3A66>`__ in a ``sqlnet.ora`` file. Or you can use the
  :attr:`connection.callTimeout` attribute which is available when
  node-oracledb uses Oracle Client libraries version 18, or later. The
  necessary out-of-band break setting is automatically configured when using
  Oracle Client 19 and Oracle Database 19, or later. With older Oracle
  versions on systems that drop (or in-line) out-of-band breaks, you may need
  to add `DISABLE_OOB=ON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
  &id=GUID-42E939DC-EF37-49A0-B4F0-14158F0E55FD>`__ to a ``sqlnet.ora`` file.

The :attr:`connection.callTimeout` attribute is a millisecond timeout for
executing database calls on a connection. The ``connection.callTimeout``
period is on each individual :ref:`round-trip <roundtrips>` between
node-oracledb and Oracle Database. Each node-oracledb method or operation
may require zero or more round-trips to Oracle Database. The ``callTimeout``
value applies to each round-trip individually, not to the sum of all
round-trips. Time spent processing in node-oracledb before or after the
completion of each round-trip is not counted.

-  If the time from the start of any one round-trip to the completion of
   that same round-trip exceeds ``callTimeout`` milliseconds, then the
   operation is halted and an error is returned.

-  In the case where a node-oracledb operation requires more than one
   round-trip and each round-trip takes less than ``callTimeout``
   milliseconds, then no timeout will occur, even if the sum of all
   round-trip calls exceeds ``callTimeout``.

-  If no round-trip is required, the operation will never be
   interrupted.

After a timeout occurs, node-oracledb attempts to clean up the internal
connection state. The cleanup is allowed to take another ``callTimeout``
milliseconds.

If the cleanup was successful, a *DPI-1067* error will be returned and
the application can continue to use the connection.

For small values of ``callTimeout``, the connection cleanup may not
complete successfully within the additional ``callTimeout`` period. In
this case a *DPI-1080* error is returned and the connection will no
longer be usable. The application should then close the connection.

.. _connectionrac:

Connecting to Oracle Real Application Clusters (RAC)
====================================================

`Oracle Real Application Clusters (RAC) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-D04AA2A7-2E68-4C5C-BD6E-36C62427B98E>`__
allow a single Oracle Database to be run across multiple servers. This
maximizes availability and enables horizontal scalability.

The Thin and Thick modes of node-oracledb can connect to Oracle RAC by using
a standard RAC connection string. Best practice is to use a :ref:`Connection
Pool <connpooling>` with :ref:`events <createpoolpoolattrsevents>`
enabled. See the section :ref:`Connections and High
Availability <connectionha>`.

Also see the technical papers `Application Checklist for Continuous
Service for MAA Solutions <https://www.oracle.com/a/tech/docs/application-
checklist-for-continuous-availability-for-maa.pdf>`__
and `Continuous Availability Application Continuity for the Oracle
Database <https://www.oracle.com/technetwork/database/options/clustering/
applicationcontinuity/applicationcontinuityformaa-6348196.pdf>`__.

.. _connectionadb:

Connecting to Oracle Cloud Autonomous Databases
===============================================

Node.js applications can connect to Oracle Autonomous Database (ADB) in Oracle
Cloud using one-way TLS (Transport Layer Security) or mutual TLS
(mTLS). One-way TLS and mTLS provide enhanced security for authentication and
encryption.

A database username and password are still required for your application
connections. If you need to create a new database schema so you do not login
as the privileged ADMIN user, refer to the relevant Oracle Cloud documentation,
for example see `Create Database Users <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-B5846072-995B-4B81-BDCB-AF530BC42847>`__ in the
Oracle Autonomous Database manual.

When using node-oracledb Thin mode, Node.js flags can be used to set the
minimum TLS version used to connect to Oracle Database. For example, ``node
--tls-min-v1.3 examples/select1.js``.

.. _connectionadbtls:

One-way TLS Connection to Oracle Autonomous Database
----------------------------------------------------

With one-way TLS, node-oracledb applications can connect to Oracle ADB
without using a wallet. Both Thin and Thick modes of the node-oracledb
driver support one-way TLS. Applications that use the node-oracledb Thick
mode can connect to the Oracle ADB through one-way TLS only when using Oracle
Client library versions 19.14 (or later) or 21.5 (or later).

To enable one-way TLS for an ADB instance, complete the following steps in an
Oracle Cloud console in the **Autonomous Database Information** section of the
ADB instance details:

1. Click the **Edit** link next to *Access Control List* to update the Access
   Control List (ACL). The **Edit Access Control List** dialog box is displayed.

2. In the **Edit Access Control List** dialog box, select the type of address
   list entries and the corresponding values. You can include the required IP
   addresses, hostnames, or Virtual Cloud Networks (VCNs).  The ACL limits
   access to only the IP addresses or VCNs that have been defined and blocks
   all other incoming traffic.

3. Navigate back to the ADB instance details page and click the **Edit** link
   next to *Mutual TLS (mTLS) Authentication*. The **Edit Mutual TLS
   Authentication** is displayed.

4. In the **Edit Mutual TLS Authentication** dialog box, deselect the
   **Require mutual TLS (mTLS) authentication** check box to disable the mTLS
   requirement on Oracle ADB and click **Save Changes**.

5. Navigate back to the ADB instance details page and click **DB Connection**
   on the top of the page. A **Database Connection** dialog box is displayed.

6. In the Database Connection dialog box, select TLS from the **Connection
   Strings** drop-down list.

7. Copy the appropriate Connection String of the database instance used by
   your application.

Applications can connect to your Oracle ADB instance using the database
credentials and the copied :ref:`Connect Descriptor <embedtns>`. For example,
to connect to the Oracle ADB instance:

For example:

.. code-block:: javascript

    const cs = `(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)
                (host=abc.oraclecloud.com))(connect_data=(service_name=xyz.adb.oraclecloud.com))
                (security=(ssl_server_dn_match=yes)))`;

    connection = await oracledb.getConnection({
        user: "scott",
        password: mypw,  // mypw contains the scott schema password
        connectString: cs
    });

You can download the ADB connection wallet using the **DB Connection** button
and extract the ``tnsnames.ora`` file, or create one yourself if you prefer to
keep connection strings out of application code. See :ref:`tnsnames` for
details on adding connection strings to a Net Service Name in a
``tnsnames.ora`` file.

.. _connectionadbmtls:

Mutual TLS connections to Oracle Cloud Autonomous Database
----------------------------------------------------------

To enable connections from node-oracledb to Oracle Autonomous Database in
Oracle Cloud using mutual TLS (mTLS), a wallet needs to be downloaded from the cloud
console. mTLS is sometimes called Two-way TLS.

Install the Wallet and Network Configuration Files
++++++++++++++++++++++++++++++++++++++++++++++++++

From the Oracle Cloud console for the database, download the wallet zip
file using the **DB Connection** button. The zip contains the wallet and
network configuration files. When downloading the zip, the cloud console
will ask you to create a wallet password. This password is used by
node-oracledb in Thin mode, but not in Thick mode.

Note: Keep the wallet files in a secure location and share them only with
authorized users.

In the examples used in the sections that follow, consider that you have
created a database called CJDB1 with the Always Free services from the
`Oracle Cloud Free Tier <https://www.oracle.com//cloud/free/>`__, then you
might decide to use the connection string called ``cjdb1_high`` in the
``tnsnames.ora`` file.

**In node-oracledb Thin Mode**

For node-oracledb in Thin mode, only two files from the zip are needed:

- ``tnsnames.ora`` - Maps net service names used for application connection
  strings to your database services.
- ``ewallet.pem`` - Enables SSL/TLS connections in Thin mode. Keep this file
  secure.

If you do not have a PEM file, see :ref:`createpem`.

Unzip the wallet zip file and move the required files to a location such as
``/opt/OracleCloud/MYDB``.

You can establish a connection to the database by using your database
credentials and setting the ``connectString`` parameter to the desired network
alias from the ``tnsnames.ora`` file. The ``configDir`` parameter indicates
the directory containing ``tnsnames.ora``. The ``walletLocation`` parameter is
the directory containing the PEM file. In this example, the files are in the
same directory. The ``walletPassword`` parameter should be set to the password
created in the cloud console when downloading the wallet. For example, to
connect as the ADMIN user using the ``cjdb1_high`` connection string:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp
    });

Instead of storing and reading the content from the ``ewallet.pem`` file which
is specified in the ``walletLocation`` property, you can use the
:ref:`walletContent <getconnectiondbattrswalletcontent>` property to directly
specify the security credentials required to establish a mutual TLS connection
to Oracle Database. This property was introduced in node-oracledb 6.6 and can
be used with the :meth:`oracledb.getConnection()` and
:meth:`oracledb.createPool()` methods. The value of this property takes
precedence and overrides the ``walletLocation`` property value of
:meth:`oracledb.getConnection()`, or the ``WALLET_LOCATION`` parameter
in the connection string.

**In node-oracledb Thick Mode**

For node-oracledb in Thick mode, only these files from the zip are needed:

-  ``tnsnames.ora`` - Maps net service names used for application
   connection strings to your database services.
-  ``sqlnet.ora`` - Configures Oracle Network settings.
-  ``cwallet.sso`` - Enables SSL/TLS connections in Thick mode. Keep this file
   secure.

Unzip the wallet zip file. There are two options for placing the required
files:

-  Move the three files to the ``network/admin`` directory of the client
   libraries used by your application. For example if you are using
   Instant Client 19c and it is in ``$HOME/instantclient_19_11``, then
   you would put the wallet files in
   ``$HOME/instantclient_19_11/network/admin/``.

   Connection can be made using your database credentials and setting the
   ``connectString`` parameter to the desired network alias from the
   ``tnsnames.ora`` file. For example, to connect as the ADMIN user using
   the ``cjdb1_high`` network service name:

   .. code-block:: javascript

        connection = await oracledb.getConnection({
            user: "admin",
            password: mypw, // mypw contains the admin schema password
            connectString: "cjdb1_high"
        });

-  Alternatively, move them the three files to any accessible directory, for
   example ``/opt/OracleCloud/MYDB``.

   Then edit ``sqlnet.ora`` and change the wallet location directory to
   the directory containing the ``cwallet.sso`` file. For example:

   ::

      WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="/opt/OracleCloud/MYDB")))
      SSL_SERVER_DN_MATCH=yes

   Since the ``tnsnames.ora`` and ``sqlnet.ora`` files are not in the
   default location, your application needs to indicate where they are,
   either with the :ref:`configDir <odbinitoracleclientattrsopts>`
   parameter to :meth:`~oracledb.initOracleClient()`, or
   using the ``TNS_ADMIN`` environment variable. See :ref:`Optional Oracle
   Net Configuration <tnsadmin>`. Neither of these settings are
   needed, and you do not need to edit ``sqlnet.ora``, if you have put
   all the files in the ``network/admin`` directory.

  For example, to connect as the ADMIN user using the ``cjdb1_high`` network
  service name:

  .. code-block:: javascript

        const oracledb = require('oracledb');

        oracledb.initOracleClient({configDir: '/opt/OracleCloud/MYDB'});
        connection = await oracledb.getConnection({
            user: "admin",
            password: mpw,
            connectString: "cjdb1_high"
        });

In node-oracle Thick mode, to create mTLS connections in one Node.js process
to two or more Oracle Autonomous Databases, move each ``cwallet.sso`` file to
its own directory. For each connection use different connection string
``WALLET_LOCATION`` parameters to specify the directory of each ``cwallet.sso``
file. It is recommended to use Oracle Client libraries 19.17 (or later) when
using :ref:`multiple wallets <connmultiwallets>`.

If you need to create a new database schema so you do not login as the
privileged ADMIN user, refer to the relevant Oracle Cloud documentation,
for example see `Create Database Users <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-B5846072-995B-4B81-BDCB-AF530BC42847>`__ in the
Oracle Autonomous Database manual.

Access Through a Proxy
++++++++++++++++++++++

If you are behind a firewall, you can tunnel TLS/SSL connections via a
proxy using `HTTPS_PROXY <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
&id=GUID-C672E92D-CE32-4759-9931-92D7960850F7>`__
in the connect descriptor. Successful connection depends on specific
proxy configurations. Oracle does not recommend doing this when
performance is critical.

**In node-oracledb Thin Mode**

The proxy settings can be passed during connection creation:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp,
        httpsProxy: 'myproxy.example.com',
        httpsProxyPort: 80
    });

Alternatively, edit ``tnsnames.ora`` and add an ``HTTPS_PROXY`` proxy name and
``HTTPS_PROXY_PORT`` port to the :ref:`Connect Descriptor <embedtns>` address
list of any service name you plan to use, for example::

    cjdb1_high = (description=
        (address=
        (https_proxy=myproxy.example.com)(https_proxy_port=80)
        (protocol=tcps)(port=1522)(host= . . . )))

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "admin",
        password: mypw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: wp,
    });

**In node-oracledb Thick Mode**

Edit ``sqlnet.ora`` and add a line::

    SQLNET.USE_HTTPS_PROXY=on

Edit ``tnsnames.ora`` and add an ``HTTPS_PROXY`` proxy name and
``HTTPS_PROXY_PORT`` port to the :ref:`Connect Descriptor <embedtns>` address
list of any service name you plan to use, for example::

    cjdb1_high = (description=
      (address=(https_proxy=myproxy.example.com)(https_proxy_port=80)
      (protocol=tcps)(port=1522)(host=  . . .

Using the Easy Connect Syntax with Autonomous Database
++++++++++++++++++++++++++++++++++++++++++++++++++++++

You can optionally use the :ref:`Easy Connect <easyconnect>` syntax to connect
to Oracle Autonomous Database.  When using node-oracledb Thick mode this
requires using Oracle Client libraries 19c or later.

The mapping from a cloud ``tnsnames.ora`` entry to an Easy Connect string is::

    protocol://host:port/service_name?wallet_location=/my/dir&retry_count=N&retry_delay=N

For example, if your ``tnsnames.ora`` file had an entry::

    cjjson_high = (description=(retry_count=20)(retry_delay=3)
        (address=(protocol=tcps)(port=1522)
        (host=efg.oraclecloud.com))
        (connect_data=(service_name=abc_cjjson_high.adb.oraclecloud.com))
        (security=(ssl_server_cert_dn="CN=efg.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")))

Then your applications can connect using the connection string:

.. code-block:: javascript

    cs = "tcps://efg.oraclecloud.com:1522/abc_cjjson_high.adb.oraclecloud.com?wallet_location=/Users/cjones/Cloud/CJJSON&retry_count=20&retry_delay=3"
    connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,
        connectString : cs
    });

The ``walletLocation`` parameter needs to be set to the directory
containing the ``cwallet.sso`` or ``ewallet.pem`` file from the wallet zip.
The other wallet files, including ``tnsnames.ora``, are not needed when you
use the Easy Connect syntax.

You can optionally add other Easy Connect parameters to the connection
string, for example:

.. code-block:: javascript

    cs = cs + "&https_proxy=myproxy.example.com&https_proxy_port=80"

With node-oracledb Thin mode, the wallet password needs to be passed as a
connection parameter.

.. _createpem:

Creating a PEM File for node-oracledb Thin Mode
+++++++++++++++++++++++++++++++++++++++++++++++

For mutual TLS in node-oracledb Thin mode, the certificate must be Privacy
Enhanced Mail (PEM) format. If you are using Oracle Autonomous Database and
your wallet zip file does not already include a PEM file, then you can convert
the PKCS12 ``ewallet.p12`` file to PEM format using third party tools. For
example, using OpenSSL::

    openssl pkcs12 -in ewallet.p12 -out wallet.pem

Once the PEM file has been created, you can use it by passing its directory
location as the ``walletLocation`` property to
:meth:`oracledb.getconnection()` or :meth:`oracledb.createPool()`. Instead of
storing and reading the content from the ``ewallet.pem`` file which is
specified in the ``walletLocation`` property, you can use the
``walletContent`` property to directly specify the security credentials
required to establish a mutual TLS connection to Oracle Database. The
``walletContent`` property was introduced in node-oracledb 6.6 and can be used
with :meth:`~oracledb.getConnection()` and :meth:`~oracledb.createPool()`. The
value of this property takes precedence and overrides the ``walletLocation``
value set in :meth:`~oracledb.getConnection()` or
:meth:`~oracledb.createPool()`, or the ``WALLET_LOCATION`` parameter in the
connection string. The :meth:`~oracledb.getConnection()` and
:meth:`~oracledb.createPool()` methods also accept a ``walletPassword``
property, which can be the passphrase that was specified when the above
openSSL command was run. See :ref:`connectionadbmtls`.

.. _connmultiwallets:

Connecting using Multiple Wallets
=================================

You can make multiple connections with different wallets in one Node.js
process.

**In node-oracledb Thin mode**

To use multiple wallets in node-oracledb Thin mode, pass the different
connection strings, wallet locations, and wallet password (if required) in each
:meth:`oracledb.getConnection()` call or when creating a :ref:`connection pool
<connpooling>`:

.. code-block:: javascript

    connection = await oracledb.getConnection({
        user: "user_name",
        password: userpw,
        connectString: "cjdb1_high",
        configDir: "/opt/OracleCloud/MYDB",
        walletLocation: "/opt/OracleCloud/MYDB",
        walletPassword: walletpw
    });

The ``configDir`` parameter is the directory containing the :ref:`tnsnames.ora
<tnsadmin>` file. The ``walletLocation`` parameter is the directory
containing the ``ewallet.pem`` file. If you are using Oracle Autonomous
Database, both of these paths are typically the same directory where the
``wallet.zip`` file was extracted.

**In node-oracledb Thick mode**

To use multiple wallets in node-oracledb Thick mode, a TCPS connection string
containing the ``MY_WALLET_DIRECTORY`` option needs to be created::

    ocidbdemo_high = (description=(retry_count=1)(retry_delay=3)
    (address=(protocol=tcps)(port=1522)(host=efg.oraclecloud.com))
    (connect_data=(service_name=abc_ocidbdemo_high.adb.oraclecloud.com))
    (security=(ssl_server_cert_dn="CN=ijk.oraclecloud.com, O=Oracle Corporation, L=Redwood City, ST=California, C=US")
    (my_wallet_directory="/home/user1/Wallet_OCIDBDemo")))

.. note::

    Use Oracle Client libraries 19.17 or later. They contain important bug
    fixes for using multiple wallets in the one process.

.. _sharding:

Connecting to Oracle Globally Distributed Database
==================================================

`Oracle Globally Distributed Database <https://www.oracle.com/database/
distributed-database/>`__ is a feature of Oracle Database that lets you
automatically distribute and replicate data across a pool of Oracle databases
that share no hardware or software. It was previously known as Oracle
Sharding. It allows a database table to be split so that each database
contains a table with the same columns but a different subset of rows. These
tables are known as sharded tables. From the perspective of an application, a
sharded table in Oracle Globally Distributed Database looks like a single
table: the distribution of data across those shards is completely transparent
to the application.

Sharding is configured in Oracle Database, see the `Oracle Globally
Distributed Database <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
SHARD>`__ manual. It requires Oracle Database and Oracle Client libraries
12.2, or later.

.. note::

    In this release, Oracle Globally Distributed Database is only supported in
    the node-oracledb Thick mode. See :ref:`enablingthick`.

When a connection is opened in node-oracledb using
:meth:`oracledb.getConnection()`, the
:ref:`shardingKey <getconnectiondbattrsshardingkey>` and
:ref:`superShardingKey <getconnectiondbattrssupershardingkey>`
properties can be used to route the connection directly to a given
shard. A sharding key is always required. A super sharding key is
additionally required when using composite sharding, which is when data
has been partitioned by a list or range (the super sharding key), and
then further partitioned by a sharding key.

When creating a :ref:`connection pool <poolclass>`, the property
:attr:`~oracledb.poolMaxPerShard` can be set. This is used to balance
connections in the pool equally across shards. It requires Oracle Client
libraries 18.3 or later.

When connected to a shard, queries only returns data from that shard.
For queries that need to access data from multiple shards, connections
can be established to the coordinator shard catalog database. In this
case, no shard key or super shard key is used.

The sharding and super sharding key properties are arrays of values, that is
multiple values can be used. Array key values may be of type String (mapping
to VARCHAR2 sharding keys), Number (NUMBER), Date (DATE), or Buffer (RAW).
Multiple types may be used in each array. Sharding keys of TIMESTAMP type
are not supported by node-oracledb.

Examples to Connect to a Globally Distributed Database Based on the Sharding Key Type
-------------------------------------------------------------------------------------

The examples listed in this section show how to establish connections to an
Oracle Globally Distributed Database based on the sharding key type.

**VARCHAR2**

If sharding has been configured on a single VARCHAR2 column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_name_pk PRIMARY KEY(cust_name))
        PARTITION BY CONSISTENT HASH (cust_name)
        PARTITIONS AUTO TABLESPACE SET ts1;

then a direct connection to a shard can be made by passing a single sharding
key:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : ["SCOTT"]
    });

**NUMBER**

If sharding has been configured on a single NUMBER column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_id_pk PRIMARY KEY(cust_id))
        PARTITION BY CONSISTENT HASH (cust_id)
        PARTITIONS AUTO TABLESPACE SET ts1;

then a direct connection to a shard can be made by passing a single sharding
key:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [110]
    });

**Multiple Keys**

If database shards have been partitioned with multiple keys such as:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER NOT NULL,
        cust_name VARCHAR2(30) NOT NULL,
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_pk PRIMARY KEY(cust_id, cust_name));
        PARTITION BY CONSISTENT HASH (cust_id, cust_name)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard can be established by specifying
multiple keys, for example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [70, "SCOTT"]
    });

**DATE**

If the sharding key is a DATE column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT signup_date_pk PRIMARY KEY(signup_date))
        PARTITION BY CONSISTENT HASH (signup_date)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard needs a Date key that is in the
session time zone. For example if the session time zone is set to UTC
(see :ref:`Fetching Dates and Timestamps <datehandling>`) then Dates must
also be in UTC:

.. code-block:: javascript

    key = new Date ("2019-11-30Z");   // when session time zone is UTC
    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [key]
    });

**RAW**

If the sharding key is a RAW column:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER,
        cust_name VARCHAR2(30),
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        CONSTRAINT cust_code_pk PRIMARY KEY(cust_code))
        PARTITION BY CONSISTENT HASH (cust_code)
        PARTITIONS AUTO TABLESPACE SET ts1;

then direct connection to a shard could be established by:

.. code-block:: javascript

    const data = [0x00, 0x01, 0x02];
    const key = Buffer.from(data);
    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "localhost/orclpdb1",
        shardingKey   : [key]
    });

**Composite Sharding**

If composite sharding (requires both sharding key and super sharding key) was
in use, for example:

.. code-block:: sql

    CREATE SHARDED TABLE customers (
        cust_id NUMBER NOT NULL,
        cust_name VARCHAR2(30) NOT NULL,
        class VARCHAR2(10) NOT NULL,
        signup_date DATE,
        cust_code RAW(20),
        PARTITIONSET BY LIST (class)
        PARTITION BY CONSISTENT HASH (cust_name)
        PARTITIONS AUTO (PARTITIONSET gold VALUES ('gold') TABLESPACE SET ts1,
        PARTITIONSET silver VALUES ('silver') TABLESPACE SET ts2);
    )

then direct connection to a shard can be established by specifying a
super sharding key and sharding key, for example:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user            : "hr",
        password        : mypw,  // mypw contains the hr schema password
        connectString   : "localhost/orclpdb1",
        superShardingKey: ["gold"]
        shardingKey     : ["SCOTT"],
    });
