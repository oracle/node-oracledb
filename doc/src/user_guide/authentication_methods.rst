.. _authenticationmethods:

**********************
Authentication Options
**********************

Authentication allows only authorized users to access Oracle Database after
successful verification of their identity. This section details the various
Oracle Database authentication options supported in node-oracledb.

The Oracle Client libraries used by node-oracledb Thick mode may support
additional authentication options that are configured independently of the
driver.

.. _dbauthentication:

Database Authentication
=======================

Database Authentication is the most basic authentication method that allows
users to connect to Oracle Database by using a valid database username and
their associated password. Oracle Database verifies the username and password
specified in the node-oracledb connection method with the information stored
in the database. See `Database Authentication of Users <https://www.oracle.com
/pls/topic/lookup?ctx=dblatest&id=GUID-1F783131-CD1C-4EA0-9300-C132651B0700>`__
for more information.

:ref:`Standalone connections <standaloneconnection>` and
:ref:`pooled connections <connpooling>` can be created in node-oracledb Thin
and Thick modes using database authentication. This can be done by specifying
the database username and the associated password in the ``user`` and
``password`` parameters of :meth:`oracledb.connect()`,
:meth:`oracledb.create_pool()`, :meth:`oracledb.connect_async()`, or
:meth:`oracledb.create_pool_async()`. An example is:

.. code-block:: javascript

    const connection = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,  // mypw contains the hr schema password
        connectString : "mydbmachine.example.com/orclpdb1"
    });

.. _proxyauth:

Proxy Authentication
====================

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

External Authentication
=======================

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

**In node-oracledb Thin mode**

In node-oracledb Thin mode, you can use external authentication combined with
proxy authentication when using a homogeneous pool. To use this, set the
``externalAuth`` property to *true* and define the proxy user in the ``user``
property of the :meth:`oracledb.createPool()`.

In the following example, ``ssl_user`` (authenticated externally through SSL)
is allowed to connect as a proxy for ``password_user``:

.. code-block:: sql

    CREATE USER password_user IDENTIFIED BY <password>;
    GRANT CONNECT TO password_user;

    CREATE USER ssl_user IDENTIFIED EXTERNALLY AS 'CN=ssl_user';
    GRANT CONNECT TO ssl_user;

    ALTER USER password_user GRANT CONNECT THROUGH ssl_user;

You can then connect to Oracle Database using:

.. code-block:: javascript

    const proxyUserConnectionAttributes = {
        walletLocation: "/opt/OracleCloud",
        connectString: "tcps://localhost:2484/FREEPDB1",
        walletPassword: wp,
        externalAuth: true,
        user: "[PASSWORD_USER]",
    };
    await oracledb.createPool(proxyUserConnectionAttributes);
    const connection = await pool.getConnection();
    await connection.close();

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

.. _mfa:

Multi-Factor Authentication
===========================

Multi-Factor authentication (MFA) requires database users to verify their
identity using more than one authentication method in order to connect to
Oracle Database. This provides an additional layer of security to access the
database, enhancing database security and reducing unauthorized access.

MFA is supported in both node-oracledb Thin and Thick modes. It is available
from Oracle Database 23.9 (or later) and Oracle Database 19c Release Update
19.28 (and future 19c Release Updates).

With MFA, the primary authentication factor used is user credential
authentication (user name and password). On successful credential
authentication, the user is then required to verify their identity using
another authentication method. Oracle Database supports the following
authentication methods that can be configured as MFA:

- :ref:`MFA Push Notifications Authentication <mfapush>`
- :ref:`MFA Certificate-based Authentication <mfacertauth>`

.. _mfapush:

MFA Push Notifications
----------------------

You can add push notifications as an additional method to verify the identity
of database users. MFA Push Notifications can be configured for use with
either the Oracle Mobile Authenticator (OMA) or Cisco Duo applications. For
more information, see `MFA Push Notifications <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-EC060ABD-BAF3-466C-9B7C-7287166B11AF>`__ in
the Oracle Database Security Guide.

To use OMA or Cisco Duo push notifications as the secondary authentication
method, you must add certain configurations in the database. Also, the
database adminstrators must add OMA or Cisco Duo as the secondary
authentication method when creating a new database user or when altering an
existing user. For the steps to configure OMA or Cisco Duo as the MFA factor,
see the `OMA <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
AD0D7985-5A29-40D8-8D81-DE2C1DF723AC>`__ and `Cisco Duo <https://www.oracle.
com/pls/topic/lookup?ctx=dblatest&id=GUID-FCE63B9B-D165-476A-9507-
097F24D08DFB>`__ sections in the Oracle Database Security Guide.

Once a database administrator adds OMA or Cisco Duo as the secondary
authentication method for a user, they will receive an email that contains
information to download and register their device with the OMA or Cisco Duo
application respectively.

Once the device is registered, you can use OMA or Cisco Duo Push Notification
authentication as the secondary authentication factor when connecting to the
database using standalone connections or connection pools. Using a standalone
connection, for example:

.. code-block:: javascript

    connection = await oracledb.getConnection({
      user: "smith",
      password: mypw,
      connectString: "localhost/orclpdb1"
    });

The authentication begins with database credentials verification of the user.
Once the password is successfully verified, the user receives a notification on
their registered device in the OMA or Cisco Duo application to approve or deny
an Oracle Database connection attempt. If you approve the notification, the
authentication is completed and you can connect to Oracle Database.

.. _mfacertauth:

MFA Certificate-based Authentication
------------------------------------

With MFA Certificate-based authentication, you can add a Public Key
Infrastructure (PKI) certificate as an additional authentication method to
verify the identity of database users. When a PKI certificate is configured as
the second factor in MFA, the user can connect to the database using a signed
user certificate stored in their wallet or smart card.

To use certificate-based authentication as the secondary authentication
method, you must ensure that users have a signed certificate with the
Distinguished Name (DN) value matching the value specified in the
``walletLocation`` property in node-oracledb Thin mode. For node-oracledb
Thick mode, it should match the value specified in WALLET_LOCATION in the
:ref:`sqlnet.ora <tnsadmin>` file. Also, database administrators must add
certificate-based authentication as the secondary authentication method when
creating a new database user or altering an existing user. For the steps to
configure certificate-based MFA, see `MFA Certificate-based Authentication
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E3CFA8C5-1BC9-
4BDE-973D-CEF829E163BE>`__ in the Oracle Database Security Guide.

You can use certificate-based authentication to authenticate the user using
standalone connections or connection pools. Using a standalone connection in
node-oracledb Thin mode, for example:

.. code-block:: javascript

    connection = await oracledb.getConnection({
      user: "smith",
      password: mypw,
      connectString: "tcps://localhost/orclpdb1",
      walletLocation: "/opt/OracleCloud"
    });

In the above example, the authentication to connect to Oracle Database begins
with database credentials verification of the user. Once the credentials are
successfully verified, the user's Distinguished Name (DN) value, *cn=j.smith*,
in the certificate present in the wallet specified in the
``walletLocation`` property is checked with the external name in the
dictionary. If the DNs match, then the connection is created.

For node-oracledb Thick mode, the wallet location can be specified in the
``WALLET_LOCATION`` parameter in the :ref:`sqlnet.ora <tnsadmin>` file.

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

Standalone connections can be created in node-oracledb Thin and Thick modes
using IAM token-based authentication.

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
required OCI services such as Oracle Autonomous Database. If the scope is not
set, the policy should be for the specified tenancy.

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

.. _configproviderauthmethods:

Authentication Methods for Centralized Configuration Providers
==============================================================

You may need to provide authentication methods to access a centralized
configuration provider. The authentication methods for the following
centralized configuration providers are detailed in this section:

- :ref:`OCI Object Storage Centralized Configuration Provider
  <ociobjectstorageauthmethods>`

- :ref:`Azure App Centralized Configuration Provider <azureappauthmethods>`

.. _ociobjectstorageauthmethods:

OCI Object Storage and OCI Vault Configuration Provider Authentication Methods
------------------------------------------------------------------------------

An Oracle Cloud Infrastructure (OCI) authentication method can be used to
access the OCI Object Storage centralized configuration provider. The
authentication methood can be set in the ``<option>=<value>`` parameter of
an :ref:`OCI Object Storage connection string <connstringoci>`. Depending on
the specified authentication method, you must also set the corresponding
authentication parameters in the connection string.

You can specify one of the authentication methods listed below.

**API Key-based Authentication**

The authentication to OCI is done using API key-related values. This is the
default authentication method. Note that this method is used when no
authentication value is set or by setting the option value to *OCI_DEFAULT*.

The optional authentication parameters that can be set for this method are
*OCI_PROFILE*, *OCI_TENANCY*, *OCI_USER*, *OCI_FINGERPRINT*, *OCI_KEY_FILE*,
and *OCI_PROFILE_PATH*. These authentication parameters can also be set in an
OCI Authentication Configuration file which can be stored in a default
location *~/.oci/config*, or in location *~/.oraclebmc/config*, or in the
location specified by the OCI_CONFIG_FILE environment variable. See
`Authentication Parameters for Oracle Cloud Infrastructure (OCI) Object
Storage <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-EB94F084
-0F3F-47B5-AD77-D111070F7E8D>`__.

**Instance Principal Authentication**

The authentication to OCI is done using VM instance credentials running on
OCI. To use this method, set the option value to *OCI_INSTANCE_PRINCIPAL*.
There are no optional authentication parameters that can be set for this
method.

**Resource Principal Authentication**

The authentication to OCI is done using OCI resource principals. To use this
method, you must set the option value to *OCI_RESOURCE_PRINCIPAL*. There are
no optional authentication parameters that can be set for this method.

For more information on these authentication methods, see `OCI Authentication
Methods <https://docs.oracle.com/en-us/iaas/Content/API/Concepts/
sdk_authentication_methods.htm>`__.

.. _azureappauthmethods:

Azure App Configuration Provider Authentication Methods
-------------------------------------------------------

A Microsoft Azure authentication method can be used to access the Azure App
centralized configuration provider. The authentication methood can be set in
the ``<option>=<value>`` parameter of an :ref:`Azure App connection string
<connstringazure>`. Depending on the specified authentication method, you must
also set the corresponding authentication parameters in the connection string.

**Default Azure Credential**

The authentication to Azure App Configuration is done as a service principal
(using either a client secret or client certificate) or as a managed identity
depending on which parameters are set. This authentication method also
supports reading the parameters as environment variables. This is the default
authentication method. This method is used when no authentication value is set
or by setting the option value to *AZURE_DEFAULT*.

The optional parameters that can be set for this option include
*AZURE_CLIENT_ID*, *AZURE_CLIENT_SECRET*, *AZURE_CLIENT_CERTIFICATE_PATH*,
*AZURE_TENANT_ID*, and *AZURE_MANAGED_IDENTITY_CLIENT_ID*. For more
information on these parameters, see `Authentication Parameters for Azure App
Configuration Store <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-1EECAD82-6CE5-4F4F-A844-C75C7AA1F907>`__.

**Service Principal with Client Secret**

The authentication to Azure App Configuration is done using the client secret.
To use this method, you must set the option value to
*AZURE_SERVICE_PRINCIPAL*. The required parameters that must be set for this
option include *AZURE_SERVICE_PRINCIPAL*, *AZURE_CLIENT_ID*,
*AZURE_CLIENT_SECRET*, and *AZURE_TENANT_ID*. For more
information on these parameters, see `Authentication Parameters for Azure App
Configuration Store <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-1EECAD82-6CE5-4F4F-A844-C75C7AA1F907>`__.

**Service Principal with Client Certificate**

The authentication to Azure App Configuration is done using the client
certificate. To use this method, you must set the option value to
*AZURE_SERVICE_PRINCIPAL*. The required parameters that must be set for this
option are *AZURE_CLIENT_ID*, *AZURE_CLIENT_CERTIFICATE_PATH*, and
*AZURE_TENANT_ID*. For more information on these parameters, see
`Authentication Parameters for Azure App Configuration Store <https://www.
oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1EECAD82-6CE5-4F4F-A844-
C75C7AA1F907>`__.

Note that the Service Principal with Client Certificate authentication method
overrides Service Principal with Client Secret authentication method.

**Managed Identity**

The authentication to Azure App Configuration is done using managed identity
or managed user identity credentials. To use this method, you must set the
option value to *AZURE_MANAGED_IDENTITY*. If you want to use a user-assigned
managed identity for authentication, then you must specify the required
parameter *AZURE_MANAGED_IDENTITY_CLIENT_ID*. For more information on these
parameters, see `Authentication Parameters for Azure App Configuration Store
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1EECAD82-6CE5-
4F4F-A844-C75C7AA1F907>`__.
