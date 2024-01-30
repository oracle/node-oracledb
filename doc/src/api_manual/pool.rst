.. _poolclass:

***************
API: Pool Class
***************

A connection *Pool* object is created by calling the
:meth:`oracledb.createPool()` method.

The *Pool* object obtains connections to the Oracle database using the
``getConnection()`` method to “check them out” from the pool. The
node-oracledb Thick mode internally uses `Oracle Call Interface Session
Pooling <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
F9662FFB-EAEF-495C-96FC-49C6D1D9625C>`__.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling the
``close()`` method on the Pool object.

See :ref:`Connection Pooling <connpooling>` for more information.

.. _poolproperties:

Pool Properties
===============

The *Pool* object properties may be read to determine the current
values.

.. attribute:: pool.connectionsInUse

    This read-only property is a number which specifies the number of
    currently active connections in the connection pool, that is,
    the number of connections currently “checked out” using
    ``pool.getConnection()``.

.. attribute:: pool.connectionsOpen

    This read-only property is a number which specifies the current
    number of connections in the pool that are connected through
    to the database. This number is the sum of connections in use by the
    application, and connections idle in the pool.

    It may be less than ``poolMin`` if connections have been dropped, for
    example with ``await connection.close({drop: true})``, or if network
    problems have caused connections to become unusable.

.. attribute:: pool.connectString

    This read-only property is a string which specifies the connection string
    used to connect to the Oracle Database Instance.

    See :ref:`connectString <createpoolpoolattrsconnectstring>` parameter of
    :meth:`oracledb.createPool()`.

.. attribute:: pool.edition

    This read-only property is a string which identifies the edition name
    used.

    See :ref:`edition <createpoolpoolattrsedition>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.edition`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: pool.events

    This read-only property is a boolean which denotes whether the Oracle
    Client events mode is enabled or not.

    See :ref:`events <createpoolpoolattrsevents>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.events`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: pool.externalAuth

    This read-only property is a boolean which denotes whether connections
    are established using external authentication or not.

    See :ref:`externalAuth <createpoolpoolattrsexternalauth>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.externalAuth`.

.. attribute:: pool.enableStatistics

    This read-only property is a boolean which identifies whether pool usage
    statistics are being recorded.

    See :ref:`enableStatistics <createpoolpoolattrsstats>` parameter of
    :meth:`oracledb.createPool()`.

.. attribute:: pool.homogeneous

    This read-only property is a boolean which identifies whether the
    connections in the pool all have the same credentials (a
    ‘homogenous’ pool), or whether different credentials can be used (a
    ‘heterogeneous’ pool).

    See :ref:`homogeneous <createpoolpoolattrshomogeneous>` parameter of
    :meth:`oracledb.createPool()`.

.. attribute:: pool.poolAlias

    This read-only property is a number which specifies the alias of this
    pool in the :ref:`connection pool cache <connpoolcache>`. An alias cannot
    be changed once the pool has been created. This property will be
    undefined for the second and subsequent pools that were created without
    an explicit alias specified.

    See :ref:`poolAlias <createpoolpoolattrspoolalias>` parameter of
    :meth:`oracledb.createPool()`.

.. attribute:: pool.poolIncrement

    This read-only property is a number which specifies the number of
    connections that are opened whenever a connection request
    exceeds the number of currently open connections.

    See :ref:`poolIncrement <createpoolpoolattrspoolincrement>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.poolIncrement`.

.. attribute:: pool.poolMax

    This read-only property is a number which specifies the maximum number
    of connections that can be open in the connection pool.

    See :ref:`poolMax <createpoolpoolattrspoolmax>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.poolMax`.

.. attribute:: pool.poolMaxPerShard

    This read-only property is a number which sets the maximum number of
    connections in the pool that can be used for any given shard in a sharded
    database. This lets connections in the pool be balanced across the
    shards.

    See :ref:`poolMaxPerShard <createpoolpoolattrspoolmaxpershard>` parameter
    of :meth:`oracledb.createPool()` and :attr:`oracledb.poolMaxPerShard`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: pool.poolMin

    This read-only property is a number which specifies the minimum number
    of connections a connection pool maintains, even when there is no
    activity to the target database.

    See :ref:`poolMin <createpoolpoolattrspoolmin>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.poolMin`.

.. attribute:: pool.poolPingInterval

    This read-only property is a number which specifies the maximum number
    of seconds that a connection can remain idle in a connection pool
    (not “checked out” to the application by ``getConnection()``) before
    node-oracledb pings the database prior to returning that connection to
    the application.

    See :ref:`poolPingInterval <createpoolpoolattrspoolpinginterval>`
    parameter of :meth:`oracledb.createPool()` and
    :attr:`oracledb.poolPingInterval`.

.. attribute:: pool.poolPingTimeout

    .. versionadded:: 6.4

    This read-only property is a number which specifies the maximum number
    of milliseconds that a connection should wait for a response from
    :meth:`connection.ping()`.

    See :ref:`poolPingTimeout <createpoolpoolattrspoolpingtimeout>`
    parameter of :meth:`oracledb.createPool()` and
    :attr:`oracledb.poolPingTimeout`.

.. attribute:: pool.poolTimeout

    This read-only property is a number which specifies the time (in seconds)
    after which the pool terminates idle connections (unused in the pool). The
    number of connections does not drop below poolMin.

    See :ref:`poolTimeout <createpoolpoolattrspooltimeout>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.poolTimeout`.

.. attribute:: pool.queueMax

    .. versionadded:: 5.0

    This read-only property is a number which specifies the maximum number
    of pending ``pool.getConnection()`` calls that can be
    :ref:`queued <connpoolqueue>`.

    See :ref:`queueMax <createpoolpoolattrsqueuemax>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.queueMax`.

.. attribute:: pool.queueRequests

    .. desupported:: 3.0

    See :ref:`Connection Pool Queue <connpoolqueue>` for more information.

.. attribute:: pool.queueTimeout

    This read-only property is a number which identifies the time
    (in milliseconds) that a connection request should wait in the
    queue before the request is terminated.

    See :ref:`queueTimeout <createpoolpoolattrsqueuetimeout>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.queueTimeout`.

.. attribute:: pool.sessionCallback

    This read-only property can be a function or string. The Node.js or
    PL/SQL function that is invoked by ``pool.getConnection()`` when the
    connection is brand new.

    See :ref:`sessionCallback <createpoolpoolattrssessioncallback>` parameter
    of :meth:`oracledb.createPool()`.

    Also, see :ref:`Connection Tagging and Session State <connpooltagging>`.

.. attribute:: pool.sodaMetaDataCache

    This read-only property is a boolean which determines whether the pool
    has a metadata cache enabled for SODA collection access.

    See :ref:`sodaMetaDataCache <createpoolpoolattrssodamdcache>` parameter of
    :meth:`oracledb.createPool()`.

    Also, see :ref:`Using the SODA Metadata Cache <sodamdcache>`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: pool.status

    This read-only property is a number and can be one of the
    :ref:`oracledb.POOL_STATUS_OPEN <oracledbconstantspool>`,
    :ref:`POOL_STATUS_DRAINING <oracledbconstantspool>`, or
    :ref:`POOL_STATUS_CLOSED <oracledbconstantspool>` constants indicating
    whether the pool is open, being drained of in-use connections, or has
    been closed.

    See :ref:`Connection Pool Closing and Draining <conpooldraining>`.

.. attribute:: pool.stmtCacheSize

    This read-only property is a number which identifies the number of
    statements to be cached in the :ref:`statement
    cache <stmtcache>` of each connection.

    See :ref:`stmtCacheSize <createpoolpoolattrsstmtcachesize>` parameter of
    :meth:`oracledb.createPool()` and :attr:`oracledb.stmtCacheSize`.

.. attribute:: pool.thin

    .. versionadded:: 6.0

    This read-only attribute is a boolean that identifies the node-oracledb
    mode in which the pool was created. If the value is *true*, it indicates
    that the pool was created in node-oracledb Thin mode. If the value is
    *false*, it indicates that the pool was created in node-oracledb Thick
    mode.

    The default value is *true*.

    See :attr:`oracledb.thin`.

.. attribute:: pool.user

    This read-only property is a string which specifies the database username
    for connections in the pool.

    See :ref:`user <createpoolpoolattrsuser>` parameter of
    :meth:`oracledb.createPool()`.

.. _poolmethods:

Pool Methods
============

.. method:: pool.close()

    .. versionadded:: 1.9

    **Promise**::

        promise = close([Number drainTime]);

    Closes connections in the pool and terminates the connection
    pool.

    If a ``drainTime`` is not given, then any open connections should be
    released with :meth:`connection.close()` before
    ``pool.close()`` is called, otherwise the pool close will fail and the
    pool will remain open.

    If a ``drainTime`` is specified, then any new ``pool.getConnection()``
    calls will fail. If connections are in use by the application, they can
    continue to be used for the specified number of seconds, after which the
    pool and all open connections are forcibly closed. Prior to this time
    limit, if there are no connections currently “checked out” from the pool
    with ``getConnection()``, then the pool and any connections that are
    idle in the pool are immediately closed. Non-zero ``drainTime`` values
    are strongly recommended so applications have the opportunity to
    gracefully finish database operations. A ``drainTime`` of 0 may be used
    to close a pool and its connections immediately.

    In network configurations that drop (or in-line) out-of-band breaks,
    forced pool termination may hang unless you have
    `DISABLE_OOB=ON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
    =GUID-42E939DC-EF37-49A0-B4F0-14158F0E55FD>`__
    in a ``sqlnet.ora`` file, see :ref:`Optional Oracle Net
    Configuration <tnsadmin>`.

    When the pool is closed, it will be removed from the :ref:`connection pool
    cache <connpoolcache>`.

    If ``pool.close()`` is called while the pool is already closed,
    draining, or :meth:`reconfiguring <pool.reconfigure()>`, then an error
    will be thrown.

    This method has replaced the obsolete equivalent alias ``pool.terminate()``
    which will be removed in a future version of node-oracledb.

    The parameters of the ``pool.close()`` method are:

    .. _poolcloseparams:

    .. list-table-with-summary:: pool.close() Parameters
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
        * - ``drainTime``
          - Number
          - The number of seconds before the pool and connections are force closed.

            If ``drainTime`` is 0, the pool and its connections are closed immediately.

            .. versionadded:: 3.0

    **Callback**:

    If you are using the callback programming style::

        close([Number drainTime,] function(Error error){});

    See :ref:`poolcloseparams` for information on the ``drainTime`` parameter.

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
          - If ``close()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: pool.getConnection()

    **Promise**::

        promise = getConnection([Object poolAttrs]);

    Obtains a connection from the connection pool.

    If a previously opened connection is available in the pool, that
    connection is returned. If all connections in the pool are in use, a new
    connection is created and returned to the caller, as long as the number
    of connections does not exceed the specified maximum for the pool. If
    the pool is at its maximum limit, the ``getConnection()`` call results
    in an error, such as *ORA-24418: Cannot open further sessions*.

    By default pools are created with :ref:`homogeneous
    <createpoolpoolattrshomogeneous>` set to *true*. The
    user name and password are supplied when the pool is created. Each time
    ``pool.getConnection()`` is called, a connection for that user is
    returned:

    .. code-block:: javascript

        const connection = await pool.getConnection();

    If a heterogeneous pool was created by setting
    :ref:`homogeneous <createpoolpoolattrshomogeneous>` to *false* during
    creation and credentials were omitted, then the user name and password
    may be used in ``pool.getConnection()`` like:

    .. code-block:: javascript

        const connection = await pool.getConnection(
        {
             user     : 'hr',
             password : mypw,  // mypw contains the hr schema password
        }
        );,

    In this case, different user names may be used each time
    ``pool.getConnection()`` is called. Proxy users may also be specified.

    See :ref:`Connection Handling <connectionhandling>` for more information
    on connections.

    See :ref:`Heterogeneous Connection Pools and Pool Proxy
    Authentication <connpoolproxy>` for more information on heterogeneous
    pools.

    The parameters of the ``pool.getConnection()`` method are:

    .. _poolgetconnectionparams:

    .. list-table-with-summary:: pool.getConnection() Parameters
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
        * - ``poolAttrs``
          - Object
          - This parameter can contain a ``tag`` property when :ref:`connection tagging <connpooltagging>` is in use. It can also contain :ref:`shardingKey <getconnectiondbattrsshardingkey>` and :ref:`superShardingKey <getconnectiondbattrssupershardingkey>` properties, when using :ref:`database sharding <sharding>`.

            When getting connections from heterogeneous pools, this parameter can contain ``user`` (or ``username``) and ``password`` properties for true heterogeneous pool usage, or it can contain a ``user`` property when a pool proxy user is desired.

            See :ref:`Connection Attributes <getconnectiondbattrsconnattrs>` for information on these attributes.

    **Callback**:

    If you are using the callback programming style::

        getConnection([Object poolAttrs,] function(Error error, Connection connection){});

    See :ref:`poolgetconnectionparams` for information on the parameters.

    The parameters of the callback function
    ``function(Error error, Connection connection)`` are:

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
          - If ``getConnection()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Connection ``connection``
          - The newly created connection. If ``getConnection()`` fails, ``connection`` will be NULL. See :ref:`Connection class <connectionclass>` for more details.

.. method:: pool.getStatistics()

    .. versionadded:: 5.2

    .. code-block:: javascript

        getStatistics();

    Returns a :ref:`PoolStatistics object <poolstatisticsclass>` containing
    pool queue statistics, pool settings, and related environment variables.
    The object is described in :ref:`Connection Pool
    Monitoring <connpoolmonitor>`. Note that this is a synchronous
    method.

    Recording of statistics must have previously been enabled with
    :ref:`enableStatistics <createpoolpoolattrsstats>` during pool
    creation or with :meth:`pool.reconfigure()`. If the
    pool is open, but ``enableStatistics`` is *false*, then null will be
    returned.

    If ``getStatistics()`` is called while the pool is closed, draining, or
    :meth:`reconfiguring <pool.reconfigure()>`, then an error will be thrown.

.. method:: pool.logStatistics()

    .. versionadded:: 5.2

    .. code-block:: javascript

        logStatistics();

    Displays pool queue statistics, pool settings, and related environment
    variables to the console. Recording of statistics must have previously
    been enabled with :ref:`enableStatistics <createpoolpoolattrsstats>`
    during pool creation or with :meth:`pool.reconfigure()`. Note that this
    is a synchronous method.

    An error will be thrown if ``logStatistics()`` is called while the pool
    is closed, draining, :meth:`reconfiguring <pool.reconfigure()>`, or when
    ``enableStatistics`` is *false*.

    See :ref:`Connection Pool Monitoring <connpoolmonitor>`.

    The obsolete function ``_logStats()`` can still be used, but it will be
    removed in a future version of node-oracledb.

.. method:: pool.reconfigure()

    **Promise**::

        promise = reconfigure(Object poolAttrs);

    Allows a subset of pool creation properties to be changed without
    needing to restart the pool or restart the application. Properties such
    as the maximum number of connections in the pool, or the statement cache
    size used by connections can be changed.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    Properties are optional. Unspecified properties will leave those pool
    properties unchanged. The properties are processed in two stages. After
    any size change has been processed, reconfiguration on the other
    properties is done sequentially. If an error such as an invalid value
    occurs when changing one property, then an error will be thrown but any
    already changed properties will retain their new values.

    During reconfiguration, :attr:`pool.status` will be
    :ref:`POOL_STATUS_RECONFIGURING <oracledbconstantspool>` and

    - Any ``pool.getConnection()`` call will be :ref:`queued <connpoolqueue>`
      until after the pool has been reconfigured and a connection is
      available. Queuing of these requests is subject to the queue
      :ref:`queueTimeout <createpoolpoolattrsqueuetimeout>` and
      :ref:`queueMax <createpoolpoolattrsqueuemax>` settings in effect
      when ``pool.getConnection()`` is called.

    - Closing connections with :meth:`connection.close()` will wait until
      reconfiguration is complete.

    - Trying to close the pool during reconfiguration will throw an error.

    **Example**

    .. code-block:: javascript

        await pool.reconfigure({poolMin: 5, poolMax: 10, increment: 5});

    The parameters of the ``pool.reconfigure()`` method are:

    .. _poolreconfigureparams:

    .. list-table-with-summary:: pool.reconfigure() Parameters
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
        * - ``poolAttrs``
          - Object
          - The ``oracledb.createPool()`` properties that can be changed with ``pool.reconfigure()`` are:

            - :ref:`enableStatistics <createpoolpoolattrsstats>`
            - :ref:`poolIncrement <createpoolpoolattrspoolincrement>`
            - :ref:`poolMax <createpoolpoolattrspoolmax>`
            - :ref:`poolMaxPerShard <createpoolpoolattrspoolmaxpershard>`
            - :ref:`poolMin <createpoolpoolattrspoolmin>`
            - :ref:`poolPingInterval <createpoolpoolattrspoolpinginterval>`
            - :ref:`poolTimeout <createpoolpoolattrspooltimeout>`
            - :ref:`queueMax <createpoolpoolattrsqueuemax>`
            - :ref:`queueRequests <createpoolpoolattrsqueuerequests>`
            - :ref:`queueTimeout <createpoolpoolattrsqueuetimeout>`
            - :ref:`sodaMetaDataCache <createpoolpoolattrssodamdcache>`
            - :ref:`stmtCacheSize <createpoolpoolattrsstmtcachesize>`

            A ``resetStatistics`` property can also be set to *true*. This zeros the current pool statistics, with the exception of ``queueMax`` which is set to the current queue length. Statistics are also reset when statistics recording is turned on with the ``enableStatistics`` property.

            Changing ``queueMax``, ``queueTimeout``, or resetting statistics does not affect any currently queued connection requests. If connections are not made available to currently queued requests, those queued requests will timeout based on the ``queueTimeout`` value in effect when they were originally added to the connection pool queue. If pool statistics are enabled, then these failed requests will be counted in :ref:`requestTimeouts <poolstats>` and included in the queue time statistics.

    **Callback**:

    If you are using the callback programming style::

        reconfigure(Object poolAttrs, function(Error error){});

    See :ref:`poolreconfigureparams` for information on the ``poolAttrs`` parameter.

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
          - If ``reconfigure()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: pool.setAccessToken()

    .. deprecated:: 5.5

    .. versionadded:: 5.4

    This method can be used to set an IAM access token and private key after
    pool creation. It is useful if the IAM token is known to have expired,
    and you are not using
    :ref:`accessTokenCallback <createpoolpoolattrsaccesstokencallback>`.

    It can also be useful in tests to set an expired token so that token
    expiry code paths can be tested.

    The parameters of the ``pool.setAccessToken()`` method are:

    .. _setaccesstokenparams:

    .. list-table-with-summary:: pool.setAccessToken() Parameters
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
        * - ``tokenAttrs``
          - Object
          - The ``tokenAttrs`` parameter object provides IAM token-based authentication properties.

            The properties of the ``tokenAttrs`` object are detailed in the :ref:`setaccesstokenproperties` table. Both properties must be set. The values can be obtained, for example, using the Oracle Cloud Infrastructure Command Line Interface (OCI CLI).

    The properties of the ``tokenAttrs`` parameter are:

    .. _setaccesstokenproperties:

    .. list-table-with-summary:: ``tokenAttrs`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 55
        :summary: The first column displays the name of the attribute. The
          second column displays the description of the attribute.

        * - Attribute
          - Description
        * - ``token``
          - The database authentication token string.
        * - ``privateKey``
          - The database authentication private key string.
