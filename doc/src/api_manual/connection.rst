.. _connectionclass:

*********************
API: Connection Class
*********************

A *Connection* object is obtained by a *Pool* class
:meth:`~pool.getConnection()` or *Oracledb* class
:meth:`~oracledb.getConnection()` call.

The connection is used to access an Oracle database.

.. _connectionproperties:

Connection Properties
=====================

The properties of a *Connection* object are listed below.

.. attribute:: connection.action

    This write-only property is a string and it identifies the `action
    <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-624A4771
    -58C5-4E2B-8131-E3389F58A0D6>`__ attribute for end-to-end application
    tracing.

    Displaying a Connection object will show a value of ``null`` for this
    attribute. See :ref:`End-to-end Tracing, Mid-tier Authentication, and
    Auditing <endtoend>`.

.. attribute:: connection.callTimeout

    .. versionadded:: 3.0

    This read/write property is a number which sets the maximum number of
    milliseconds that each underlying :ref:`round-trip <roundtrips>` between
    node-oracledb and Oracle Database may take on a connection. Each
    node-oracledb method or operation may make zero or more round-trips. The
    ``callTimeout`` value applies to each round-trip individually, not to the
    sum of all round-trips. Time spent processing in node-oracledb before or
    after the completion of each round-trip is not counted.

    The ``callTimeout`` setting has no effect when using IPC connections,
    that is, when node-oracledb is running on the same host as the Oracle
    Database Network listener.

    See :ref:`Database Call Timeouts <dbcalltimeouts>` for more information
    about limiting statement execution time, and also about limiting the
    time taken to open new connections.

    The default is 0, meaning that there is no timeout.

    An exception will occur if node-oracledb Thick mode is not using Oracle
    Client library version 18.1 or later.

.. attribute:: connection.clientId

    This write-only property is a string that indicates the `client
    identifier <https://www.oracle.com/pls/topic/lookup?ctx=dblatest
    &id=GUID-8A9F1295-4360-4AC6-99A4-050C5C82E0B0>`__
    for end-to-end application tracing, use with mid-tier authentication,
    and with `Virtual Private Databases <https://www.oracle.com/pls/topic/
    lookup?ctx=dblatest&id=GUID-4F37BAE5-CA2E-42AC-9CDF-EC9181671FFE>`__.

    Displaying ``Connection.clientId`` will show a value of ``null``. See
    :ref:`End-to-end Tracing, Mid-tier Authentication, and Auditing <endtoend>`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: connection.clientInfo

    .. versionadded:: 4.1

    This write-only property is a string that includes the client information
    for end-to-end application tracing.

    Displaying ``Connection.clientInfo`` will show a value of ``null``. See
    :ref:`End-to-end Tracing, Mid-tier Authentication, and Auditing <endtoend>`.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: connection.currentSchema

    .. versionadded:: 4.0

    This read/write property is a string. After setting ``currentSchema``, SQL
    statements using unqualified references to schema objects will resolve to
    objects in the specified schema.

    This setting does not change the session user or the current user, nor
    does it give the session user any additional system or object privileges
    for the session.

    The value of ``currentSchema`` will be empty until it has been
    explicitly set.

    This property is an efficient alternative to
    `ALTER SESSION SET CURRENT_SCHEMA <https://www.oracle.com/pls/topic/lookup?
    ctx=dblatest&id=GUID-DC7B8CDD-4F89-40CC-875F-F70F673711D4>`__.

.. attribute:: connection.dbDomain

    .. versionadded:: 6.3

    This read-only property is a string that specifies the Oracle Database
    domain name associated with the connection. This property returns the
    same value as the SQL expression::

        SELECT UPPER(VALUE) FROM V$PARAMETER WHERE NAME = 'db_domain';

    The above SQL expression returns NULL if the domain name is not specified.
    The ``dbDomain`` property returns an empty string in this case.

.. attribute:: connection.dbName

    .. versionadded:: 6.3

    This read-only property is a string that specifies the name of the Oracle
    Database associated with the connection. This property returns the same
    value as the SQL expression::

        SELECT UPPER(NAME) FROM V$DATABASE;

.. attribute:: connection.dbOp

    .. versionadded:: 4.1

    This write-only property is a string that includes the database operation
    information for end-to-end application tracing.

    Displaying ``Connection.dbOp`` will show
    a value of ``null``. See :ref:`End-to-end Tracing, Mid-tier Authentication,
    and Auditing <endtoend>`.

    It is available from Oracle 12c onwards.

.. attribute:: connection.ecid

    .. versionadded:: 5.3

    This write-only property is a string that sets the execution context
    identifier.

    The value is available in the ``ECID`` column of the ``V$SESSION`` view.
    It is also shown in audit logs.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

.. attribute:: connection.instanceName

    .. versionadded:: 6.1

    This read-only attribute specifies the Oracle Database instance name
    associated with the connection. It returns the same value as the SQL expression
    ``sys_context('userenv', 'instance_name')``.

.. attribute:: connection.maxOpenCursors

    .. versionadded:: 6.3

    This read-only property is a number that indicates the maximum number of
    SQL statements that can be concurrently opened in one connection. This
    value can be specified in the `server parameter file
    <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4590634E-
    85B1-4BA8-8293-FE9960D4E2C2>`__ using the
    `open_cursors <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
    GUID-FAFD1247-06E5-4E64-917F-AEBD4703CF40>`__ parameter. This property
    returns the same value as the SQL expression::

        SELECT VALUE FROM V$PARAMETER WHERE NAME = 'open_cursors';

    This property requires Oracle Database 12.1 or later.

.. attribute:: connection.module

    This write-only property is a string and it is the `module
    <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-
    624A4771-58C5-4E2B-8131-E3389F58A0D6>`__ attribute for end-to-end
    application tracing.

    Displaying ``Connection.module`` will show a value of ``null``. See
    :ref:`End-to-end Tracing, Mid-tier Authentication, and Auditing
    <endtoend>`.

.. attribute:: connection.oracleServerVersion

    .. versionadded:: 1.3

    This read-only property gives a numeric representation of the Oracle
    database version which is useful in comparisons. For version
    *a.b.c.d.e*, this property gives the number:
    ``(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e``

    Note if you connect to Oracle Database 18, or later, then the version
    will only be accurate if node-oracledb is also using Oracle Database 18,
    or later, client libraries. Otherwise it will show the base release such
    as 1800000000 instead of 1803000000.

.. attribute:: connection.oracleServerVersionString

    .. versionadded:: 2.2

    This read-only property gives a string representation of the Oracle
    database version which is useful for display.

    Note if you connect to Oracle Database 18, or later, then the version
    will only be accurate if node-oracledb is also using Oracle Database 18,
    or later, client libraries. Otherwise it will show the base release such
    as “18.0.0.0.0” instead of “18.3.0.0.0”.

.. attribute:: connection.serviceName

    .. versionadded:: 6.3

    This read-only property is a string that identifies the Oracle Database
    service name associated with the connection. This property returns the
    same value as the SQL expression::

        SELECT UPPER(SYS_CONTEXT('USERENV', 'SERVICE_NAME')) FROM DUAL;

.. attribute:: connection.stmtCacheSize

    This read-only property is a number that identifies the number of
    statements to be cached in the :ref:`statement cache <stmtcache>` of the
    connection. The default value is the ``stmtCacheSize`` property in effect
    in the *Pool* object when the connection is created in the pool.

.. attribute:: connection.tag

    .. versionadded:: 3.1

    This read/write property is a string. Applications can set the tag property
    on pooled connections to indicate the ‘session state’ that a connection
    has. The tag will be retained when the connection is released to the pool.
    A subsequent ``pool.getConnection()`` can request a connection that has a
    given :ref:`tag <getconnectiondbattrstag>`. It is up to the application
    to set any desired session state and set ``connection.tag`` prior to
    closing the connection.

    The tag property is not used for standalone connections.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    When node-oracledb Thick mode is using Oracle Client libraries 12.2 or
    later, the tag must be a `multi-property tag <https://www.oracle.com/pls/
    topic/lookup?ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__
    with name=value pairs like “k1=v1;k2=v2”.

    An empty string represents not having a tag set.

    See :ref:`Connection Tagging and Session State <connpooltagging>`.

    **Getting the tag**

    After a ``pool.getConnection()`` requests a :ref:`tagged
    connection <getconnectiondbattrstag>`:

    -  When no :ref:`sessionCallback <createpoolpoolattrssessioncallback>`
       is in use, then ``connection.tag`` will contain the actual tag of the
       connection.

    -  When a Node.js ``sessionCallback`` function is used, then
       ``connection.tag`` will be set to the value of the connection’s
       actual tag prior to invoking the callback. The callback can then set
       connection state and alter ``connection.tag``, as desired, before the
       connection is returned from ``pool.getConnection()``.

    -  When a PL/SQL ``sessionCallback`` procedure is used, then after
       ``pool.getConnection()`` returns, ``connection.tag`` contains a tag
       with the same property values as the tag that was requested. The
       properties may be in a different order. If ``matchAnyTag`` is *true*,
       then ``connection.tag`` may contain other properties in addition to
       the requested properties. Code after each ``pool.getConnection()``
       call mirroring the PL/SQL code may be needed so ``connection.tag``
       can be set to a value representing the session state changed in the
       PL/SQL procedure.

    **Setting the tag**

    A tag can be set anytime prior to closing the connection. If a Node.js
    ``sessionCallback`` function is being used, the best practice
    recommendation is to set the tag in the callback function.

    To clear a connection’s tag, set ``connection.tag = ""``.

.. attribute:: connection.thin

    .. versionadded:: 6.0

    This read-only attribute is a boolean that identifies the node-oracledb
    mode in which the connection was established. If the value is *true*, then
    it indicates that the connection was established in
    :ref:`node-oracledb Thin mode <thinarch>`. If the value is *false*,
    then it indicates that the connection was established in
    :ref:`node-oracledb Thick mode <thickarch>`.

    The default value is *true*.

.. attribute:: connection.tpcInternalName

    .. versionadded:: 5.3

    This read/write attribute is a string that specifies the internal name
    that is used by the connection when logging two-phase commit transactions.

.. attribute:: connection.tpcExternalName

    .. versionadded:: 5.3

    This read/write attribute is a string that specifies the external name
    that is used by the connection when logging two-phase commit transactions.

.. attribute:: connection.transactionInProgress

    .. versionadded:: 6.3

    This read-only property is a boolean that indicates whether a transaction
    is currently in progress in the connection. If the value is *True*, then it
    indicates that the specified connection has an active transaction. If the
    value is *False*, then the specified connection does not have an active
    transaction.

.. attribute:: connection.warning

    .. versionadded:: 6.3

    This read-only property provides an :ref:`error <errorobj>` object that
    gives information about any database warnings (such as password being in
    the grace period) that were generated during
    :meth:`connection establishment <oracledb.getConnection()>` (both
    standalone connections and pooled connections). This attribute is present
    if a warning is thrown by the database but the operation is otherwise
    completed successfully. The connection will be usable despite the warning.

    For :ref:`standalone connections <standaloneconnection>`, the error object
    returned by ``connection.warning`` will be present for the lifetime of the
    connection.

    For :ref:`pooled connections <connpooling>`, the error object returned by
    ``connection.warning`` will be cleared when a connection is released to
    the pool using :meth:`connection.close()`.

    In node-oracledb Thick mode, warnings may be generated during pool
    creation itself. These warnings will be placed on the new connections
    created by the pool, provided no warnings were generated by the individual
    connection creations, in which case those connection warnings will be
    returned.

.. _connectionmethods:

Connection Methods
==================

.. method:: connection.break()

    **Promise**::

        promise = break();

    Stops the currently running operation on the connection.

    If there is no operation in progress or the operation has completed by
    the time the break is issued, the ``break()`` is effectively a no-op.

    If the running asynchronous operation is interrupted, its callback will
    return an error.

    In network configurations that drop (or in-line) out-of-band breaks,
    ``break()`` may hang unless you have
    `DISABLE_OOB=ON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
    =GUID-42E939DC-EF37-49A0-B4F0-14158F0E55FD>`__ in a ``sqlnet.ora`` file,
    see :ref:`Optional Oracle Net Configuration <tnsadmin>`.

    .. note::

        Connections can receive out-of-band (OOB) break messages from the
        Oracle Database only in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    If you use ``break()`` with :ref:`DRCP connections <drcp>`, it is
    currently recommended to drop the connection when releasing it back to
    the pool ``await connection.close({drop: true})``. See Oracle bug
    29116892.

    **Callback**:

    If you are using the callback programming style::

        break(function(Error error){});

    The parameter of the callback function is:

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
          - If ``break()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.changePassword()

    .. versionadded:: 2.2

    **Promise**::

        promise = changePassword(String user, String oldPassword, String newPassword);

    Changes the password of the specified user.

    Only users with the ALTER USER privilege can change passwords of other
    users.

    See :ref:`Changing Passwords and Connecting with an Expired
    Password <changingpassword>`.

    The parameters of the ``connection.changePassword()`` method are:

    .. _changepassword:

    .. list-table-with-summary:: connection.changePassword() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The
         second column displays the data type of the parameter. The third
         column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``User``
          - String
          - The name of the user whose password is to be changed.
        * - ``oldPassword``
          - String
          - The current password of the currently connected user.

            If ``changePassword()`` is being used by a DBA to change the password of another user, the value of ``oldPassword`` is ignored and can be an empty string.
        * - ``newPassword``
          - String
          - The new password of the user whose password is to be changed.

    **Callback**:

    If you are using the callback programming style::

        changePassword(String user, String oldPassword, String newPassword, function(Error error){});

    See :ref:`changepassword` for information on the ``user``, ``oldPassword``, and
    ``newPassword`` parameters.

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
          - If ``changePassword()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.close()

    .. versionadded:: 1.9

    **Promise**::

        promise = close([Object options]);

    Releases a connection.

    Calling ``close()`` as soon as a connection is no longer required is
    strongly encouraged for system efficiency. Calling ``close()`` for
    pooled connections is required to prevent the pool running out of
    connections.

    When a connection is released, any ongoing transaction on the connection
    is rolled back.

    If an error occurs on a pooled connection and that error is known to
    make the connection unusable, then ``close()`` will drop that connection
    from the connection pool so a future pooled ``getConnection()`` call
    that grows the pool will create a new, valid connection.

    This method replaces the obsolete equivalent alias
    ``connection.release()`` which will be removed in a future version of
    node-oracledb.

    The parameters of the ``connection.close()`` method are:

    .. _connectionclose:

    .. list-table-with-summary:: connection.close() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The
         second column displays the data type of the parameter. The third
         column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``options``
          - Object
          - This parameter only affects pooled connections. The only valid option attribute is `drop`.

            For pooled connections, if `drop` is *false*, then the connection is returned to the pool for reuse.  If `drop` is *true*, the connection will be completely dropped from the connection pool, for example::

                await connection.close({drop: true});

            The default is *false*.

    **Callback**:

    If you are using the callback programming style::

        close([Object options, ] function(Error error){});

    See :ref:`connectionclose` for information on the ``options`` parameter.

    The parameter of the callback function ``function(Error error)`` is:

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

.. method:: connection.commit()

    **Promise**::

        promise = commit();

    Commits the current transaction in progress on the connection.

    **Callback**:

    If you are using the callback programming style::

        commit(function(Error error){});

    The parameter of the callback function ``function(Error error)`` is:

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
          - If ``commit()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.createLob()

    **Promise**::

        promise = createLob(Number type);

    Creates a :ref:`Lob <lobclass>` as an Oracle `temporary LOB
    <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7B3D15D3-A182
    -4ED1-A265-8EE15E793C46>`__.
    The LOB is initially empty. Data can be streamed to the LOB, which can
    then be passed into PL/SQL blocks, or inserted into the database.

    When no longer required, Lobs created with ``createLob()`` should be
    closed with :meth:`lob.destroy()` because Oracle Database
    resources are held open if temporary LOBs are not closed.

    Open temporary LOB usage can be monitored using the view
    `V$TEMPORARY_LOBS <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id
    =GUID-4E9360AA-C610-4341-AAD3-9DCDF82CF085>`__.

    LOBs created with ``createLob()`` can be bound for IN, IN OUT and OUT
    binds.

    See :ref:`Working with CLOB, NCLOB, BLOB and BFILE Data <lobhandling>` and
    :ref:`LOB Bind Parameters <lobbinds>` for more information.

    The parameters of the ``connection.createLob()`` method are:

    .. _connectioncreatelob:

    .. list-table-with-summary:: connection.createLob() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The
         second column displays the data type of the parameter. The third
         column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``type``
          - Number
          - One of the constants :ref:`oracledb.CLOB <oracledbconstantsnodbtype>`, :ref:`oracledb.BLOB <oracledbconstantsnodbtype>`, :ref:`oracledb.NCLOB <oracledbconstantsnodbtype>`, or :ref:`oracledb.BFILE <oracledbconstantsnodbtype>` (or equivalent ``DB_TYPE_*`` constants).

    **Callback**:

    If you are using the callback programming style::

        createLob(Number type, function(Error error, Lob lob){});

    See :ref:`connectioncreatelob` for information on the ``type`` parameter.

    The parameter of the callback function ``function(Error error)`` is:

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
          - If ``createLob()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.decodeOSON()

    .. versionadded:: 6.4

    .. code-block:: javascript

        decodeOSON(Buffer buf);

    This synchronous method decodes an OSON Buffer and returns a Javascript
    value. This method is useful for fetching BLOB columns that have the check
    constraint ``IS JSON FORMAT OSON`` enabled.

    The parameters of the ``connection.decodeOSON()`` are:

    .. list-table-with-summary:: connection.decodeOSON() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``buf``
          - Buffer
          - The OSON buffer that is to be decoded.

    See :ref:`osontype` for an example.

.. method:: connection.encodeOSON()

    .. versionadded:: 6.4

    .. code-block:: javascript

        encodeOSON(Any value);

    This synchronous method encodes a JavaScript value to OSON bytes and
    returns a Buffer. This method is useful for inserting OSON bytes directly
    into BLOB columns that have the check constraint ``IS JSON FORMAT OSON``
    enabled.

    The parameters of the ``connection.encodeOSON()`` are:

    .. list-table-with-summary:: connection.encodeOSON() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 20
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``value``
          - Any
          - The JavaScript value that is to be encoded into OSON bytes. The JavaScript value can be any value supported by `JSON <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FBC22D72-AA64-4B0A-92A2-837B32902E2C>`__.

    See :ref:`osontype` for an example.

.. method:: connection.execute()

    **Promise**::

        promise = execute(String sql [, Object bindParams [, Object options]]);
        promise = execute(Object sql [, Object options]);

    Executes a single SQL statement, PL/SQL statement, or the SQL statement
    in the object that was returned by the ``sql`` function of the third-party
    `sql-template-tag <https://www.npmjs.com/package/sql-template-tag#
    oracledb>`__ module. See :ref:`SQL Execution <sqlexecution>` for examples.

    The statement to be executed may contain :ref:`IN binds <inbind>`,
    :ref:`OUT or IN OUT <outbind>` bind values or variables, which are bound
    using either an object or an array.

    The parameters of the ``connection.execute()`` method are:

    .. _connectionexecute:

    .. list-table-with-summary:: connection.execute() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The
         second column displays the data type of the parameter. The third
         column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``sql``
          - String or Object
          - .. _executesqlparam:

            This function parameter can either be a string or an object.

            If the parameter is a string, then it is the SQL statement that is executed. The statement may contain bind parameters.

            If the parameter is an object, then it is the object that is returned from the ``sql`` function of the third-party `sql-template-tag <https://www.npmjs.com/package/sql-template-tag#oracledb>`__ module. This object exposes the SQL statement and values properties to retrieve the SQL string and bind values. See :ref:`example <executeobj>`. If the object returned by the ``sql`` function contains a SQL statement with a ``RETURNING INTO`` clause, then :meth:`connection.execute()` will not work and an error will be thrown.

            .. versionchanged:: 6.4

                The ability to accept an object (returned from the ``sql`` function of the third-party ``sql-template-tag`` module) as an input parameter was added to :meth:`connection.execute()`.
        * - ``bindParams``
          - Object or Array
          - .. _executebindParams:

            This function parameter is needed if there are bind parameters in the SQL statement. It can be either an object that associates values or JavaScript variables to the statement’s bind variables by name, or an array of values or JavaScript variables that associate to the statement’s bind variables by their relative positions. See :ref:`Bind Parameters for Prepared Statements <bind>` for more details on binding.

            If a bind value is an object it may have the properties listed in :ref:`executebindparamsproperties`.
        * - ``options``
          - Object
          - .. _executeoptions:

            This is an optional parameter to ``execute()`` that may be used to control statement execution. See :ref:`executeoptionsparams` for detailed information on its properties.

    **execute(): bindParams Parameter Properties**

    The properties of the ``bindParams`` parameter are:

    .. _executebindparamsproperties:

    .. list-table-with-summary:: execute(): ``bindParams`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the bind property. The second
         column displays the description of the property.

        * - Bind Property
          - Description
        * - ``dir``
          - .. _executebindparamdir:

            The direction of the bind, indicating whether data is being passed into, or out from, the database. The value can be one of the :ref:`Execute Bind Direction Constants <oracledbconstantsbinddir>` ``oracledb.BIND_IN``, ``oracledb.BIND_INOUT``, or ``oracledb.BIND_OUT``. The default is ``oracledb.BIND_IN``.
        * - ``maxArraySize``
          - .. _executebindparammaxarraysize:

            The number of array elements to be allocated for a PL/SQL Collection INDEX BY associative array OUT or IN OUT array bind variable. For IN binds, the value of ``maxArraySize`` is ignored. See :ref:`PL/SQL Collection Associative Arrays
            <plsqlindexbybinds>`.
        * - ``maxSize``
          - .. _executebindparammaxsize:

            The maximum number of bytes that OUT or IN OUT bind variable values of type String or Buffer can use to get data. The default value is *200*. The maximum limit depends on the database type, see below. When binding IN OUT, then ``maxSize`` refers to the size of the returned value: the input value can be smaller or bigger. For IN binds, ``maxSize`` is ignored.

            The limit for ``maxSize`` when binding a value that is returned as a Buffer is 2000 bytes. For Strings, the limit is 4000 bytes unless you are using Oracle Database 12 or later, and the database initialization parameter ``MAX_STRING_SIZE`` has a value of ``EXTENDED``. In this case the limit is 32767 bytes.

            When binding Oracle LOBs as ``oracledb.STRING``, ``oracledb.DB_TYPE_NVARCHAR`` or ``oracledb.BUFFER``, the data cannot be greater than 1 GB. See :ref:`LOB Bind Parameters <lobbinds>`. For larger data, use the :ref:`Lob Class <lobclass>`.

            Similarly, when binding LONG as ``oracledb.STRING`` and LONG RAW as ``oracledb.BUFFER``, data cannot be greater than 1 GB.

            When binding to get a UROWID value from the database, note that UROWIDs can take up to 5267 bytes when fetched from the database so ``maxSize`` should be set to at least this value.
        * - ``type``
          - .. _executebindparamtype:

            The ``type`` indicates to the database how data should be handled.

            If ``type`` is not set for IN or IN OUT binds its value will be derived from the type of the input data. It is recommended to explicitly set the type because null data will be assumed to be ``oracledb.STRING``. With OUT binds, ``type`` defaults to ``oracledb.STRING``.

            Commonly, ``type`` is set to a :ref:`node-oracledb Type Constant <oracledbconstantsnodbtype>` that matches the JavaScript type. Node-oracledb and the underlying Oracle Client libraries then do a mapping to, or from, the actual database data type. Since Oracle Database does not provide actual database type information prior to binding, some special cases need ``type`` set explicitly to avoid data conversion issues. For example, binding a String to an NVARCHAR needs ``type`` set to ``oracledb.DB_TYPE_NVARCHAR``.

            For each JavaScript and database type combination, the ``type`` property can be one of the values in the :ref:`executebindparamtypevalues` table. For example, if you are inserting data from a String into an Oracle Database CHAR column, then set ``type`` to ``oracledb.DB_TYPE_CHAR``.

            This table does not cover implicit data type conversions that will take place in Oracle libraries. In particular many Oracle types will allow JavaScript values to be bound as ``oracledb.STRING``. For example, you can bind the string “1234” to insert into a NUMBER column. Another example is that the string “31-01-2019” can be bound for insert into a DATE column (if the :ref:`NLS_DATE_FORMAT <environmentvariables>` is “DD-MM-YYYY”).

            Similarly when binding a JavaScript Date, ``type`` can be set to ``oracledb.DATE`` for all date and timestamp database types. This bind type is the default for Date IN and IN OUT binds. Using the date or timestamp type constant corresponding to the database type may be preferred when binding in node-oracledb 4.2. This reduces type conversions and it may be useful in cases such as when calling overloaded PL/SQL procedures, or to ensure the correct index is used by a query.
        * - ``val``
          - .. _executebindparamval:

            The input value or variable to be used for an IN or IN OUT bind variable.

    **execute(): Type Property Values**

    The values of the ``type`` property are listed in the table below:

    .. _executebindparamtypevalues:

    .. list-table-with-summary:: execute(): ``type`` Property Values
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 20 30
        :summary: The first column displays the Node.js Type. The second
         column displays the Database type. The third column displays the
         Bind type value. The fourth column displays the notes.

        * - Node.js Type
          - Database Type
          - Bind ``type`` Value
          - Notes
        * - String
          - VARCHAR2
          - ``oracledb.STRING`` or ``oracledb.DB_TYPE_VARCHAR``
          - Default ``type`` for String IN and IN OUT binds
        * - String
          - CHAR
          - ``oracledb.DB_TYPE_CHAR``
          - This combination is supported from node-oracledb 4.2.
        * - String
          - NVARCHAR
          - ``oracledb.DB_TYPE_NVARCHAR``
          - This combination is supported from node-oracledb 4.2.
        * - String
          - NCHAR
          - ``oracledb.DB_TYPE_NCHAR``
          - This combination is supported from node-oracledb 4.2.
        * - String
          - LONG
          - ``oracledb.STRING`` or ``oracledb.DB_TYPE_VARCHAR``
          - Not available for PL/SQL binds.
        * - Number
          - NUMBER
          - ``oracledb.NUMBER`` or ``oracledb.DB_TYPE_NUMBER``
          - Default ``type`` for Number IN and IN OUT binds.
        * - Number
          - BINARY_DOUBLE
          - ``oracledb.DB_TYPE_BINARY_DOUBLE``
          - This combination is supported from node-oracledb 4.2.
        * - Number
          - BINARY_FLOAT
          - ``oracledb.DB_TYPE_BINARY_FLOAT``
          - This combination is supported from node-oracledb 4.2.
        * - Number
          - BINARY_INTEGER
          - ``oracledb.DB_TYPE_BINARY_INTEGER``
          - This combination is supported from node-oracledb 4.2. Only supported for PL/SQL binds.
        * - BigInt
          - NUMBER
          - ``oracledb.DB_TYPE_NUMBER``
          - This combination is supported from node-oracledb 6.5.
        * - Date
          - DATE
          - ``oracledb.DB_TYPE_DATE``
          - This combination is supported from node-oracledb 4.2. It is not the default for Date IN and IN OUT binds.
        * - Date
          - TIMESTAMP
          - ``oracledb.DB_TYPE_TIMESTAMP``
          - This combination is supported from node-oracledb 4.2.
        * - Date
          - TIMESTAMP WITH TIMEZONE
          - ``oracledb.DB_TYPE_TIMESTAMP_TZ``
          - This combination is supported from node-oracledb 4.2.
        * - Date
          - TIMESTAMP WITH LOCAL TIME ZONE
          - ``oracledb.DATE`` or ``oracledb.DB_TYPE_TIMESTAMP_LTZ``
          - Default ``type`` for Date IN and IN OUT binds.
        * - Buffer
          - RAW
          - ``oracledb.BUFFER`` or ``oracledb.DB_TYPE_RAW``
          - Default ``type`` for Buffer IN and IN OUT binds.
        * - Buffer
          - LONG RAW
          - ``oracledb.BUFFER`` or ``oracledb.DB_TYPE_RAW``
          - Not available for PL/SQL binds.
        * - Lob
          - CLOB
          - ``oracledb.CLOB`` or ``oracledb.DB_TYPE_CLOB``
          - Default ``type`` for CLOB Lob IN and IN OUT binds. Binding a String as ``oracledb.DB_TYPE_VARCHAR`` will generally be preferred.
        * - Lob
          - BLOB
          - ``oracledb.BLOB`` or ``oracledb.DB_TYPE_BLOB``
          - Default ``type`` for BLOB Lob IN and IN OUT binds. Binding a Buffer as ``oracledb.DB_TYPE_RAW`` will generally be preferred.
        * - Lob
          - NCLOB
          - ``oracledb.NCLOB`` or ``oracledb.DB_TYPE_NCLOB``
          - This combination is supported from node-oracledb 4.2. Binding a String with ``type`` of ``oracledb.DB_TYPE_NVARCHAR`` will generally be preferred.
        * - String
          - ROWID
          - ``oracledb.STRING`` or ``oracledb.DB_TYPE_VARCHAR``
          -
        * - String
          - UROWID
          - ``oracledb.STRING`` or ``oracledb.DB_TYPE_VARCHAR``
          -
        * - Object
          - JSON
          - ``oracledb.DB_TYPE_JSON``
          - See :ref:`Oracle Database JSON Data Type <jsondatatype>`.
        * - String
          - XMLType
          - ``oracledb.STRING`` or ``oracledb.DB_TYPE_VARCHAR``
          - Size is limited to the maximum database VARCHAR length.
        * - Boolean
          - BOOLEAN
          - ``oracledb.DB_TYPE_BOOLEAN``
          - This combination is supported from node-oracledb 4.2. Only supported for PL/SQL binds.
        * - ResultSet
          - CURSOR
          - ``oracledb.CURSOR`` or ``oracledb.DB_TYPE_CURSOR``
          - Only supported for OUT binds.
        * - DbObject
          - Named type or collection
          - A string with the name of the Oracle Database object or collection, or a :ref:`DbObject <dbobjectclass>`.
          - This combination is supported from node-oracledb 4.0.

    When binding LONG, LONG RAW, CLOB, NCLOB, and BLOB database types using
    string or buffer bind types, then data is limited to a maximum size of 1
    GB.

    Binding Oracle Database INTERVAL types or BFILE not supported.

    **execute(): Options Parameter Properties**

    The properties of the ``options`` parameter are:

    .. _executeoptionsparams:

    .. list-table-with-summary:: execute(): ``options`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 5 10 35
        :summary: The first column displays the property. The second column
         displays the data type of the property. The third column displays
         the description of the property.

        * - Property
          - Data Type
          - Description
        * - ``autoCommit``
          - Boolean
          - .. _propexecautocommit:

            Overrides :attr:`oracledb.autoCommit`.
        * - ``dbObjectAsPojo``
          - Boolean
          - .. _propexecobjpojo:

            Overrides :attr:`oracledb.dbObjectAsPojo`.
        * - ``extendedMetaData``
          - Boolean
          - .. _propexecextendedmetadata:

            Overrides :attr:`oracledb.extendedMetaData`.

            .. desupported:: 6.0

            Extended metadata is now always returned.
        * - ``fetchArraySize``
          - Number
          - .. _propexecfetcharraysize:

            Overrides :attr:`oracledb.fetchArraySize`.
        * - ``fetchInfo``
          - Object
          - .. _propexecfetchinfo:

            Object defining how query column data should be represented in JavaScript. It can be used in conjunction with, or instead of, the global settings :attr:`~oracledb.fetchAsString` and :attr:`~oracledb.fetchAsBuffer`.

            For example::

                fetchInfo: {
                // return the date as a string
                "HIRE_DATE":    { type: oracledb.STRING },
                // override fetchAsString or fetchAsBuffer
                "HIRE_DETAILS": { type: oracledb.DEFAULT }
                }

            Each column is specified by name, using Oracle’s standard naming convention.

            The ``type`` property can be set to one of:

             - :ref:`oracledb.STRING <oracledbconstantsnodbtype>` for number, date and raw columns in a query to indicate they should be returned as Strings instead of their native format. For CLOB and NCLOB columns, data will be returned as Strings instead of :ref:`Lob <lobclass>` instances.
               Raw columns returned as strings will be returned as hex-encoded strings. The maximum length of a string created by type mapping number and date columns is 200 bytes. If a database column that is already being fetched as type ``oracledb.STRING`` is specified in ``fetchInfo``, then the actual database metadata will be used to determine the maximum length.

             - :ref:`oracledb.BUFFER <oracledbconstantsnodbtype>` for a BLOB column, each BLOB item will be returned as a Buffer instead of a :ref:`Lob <lobclass>` instance.

             -  :ref:`oracledb.DEFAULT <oracledbconstantsnodbtype>` overrides any global mapping given by :attr:`~oracledb.fetchAsString` or :attr:`~oracledb.fetchAsBuffer`. The column data is returned in default format for the type.

            Strings and Buffers created for LOB columns will generally be limited by Node.js and V8 memory restrictions.

            See :ref:`Query Result Type Mapping <typemap>` for more information on query type mapping.

            .. deprecated:: 6.0
              Use :ref:`fetchTypeHandler <fetchtypehandler>` functionality instead.
        * - ``fetchTypeHandler``
          - Function
          - .. _propexecfetchtypehandler:

            Overrides :attr:`oracledb.fetchTypeHandler`.

            .. versionadded:: 6.0
        * - ``keepInStmtCache``
          - Boolean
          - .. _propexeckeepinstmtcache:

            When ``keepInStmtCache`` is *true*, and statement caching is enabled, then the statement will be added to the cache if it is not already present. This helps the performance of re-executed statements. See :ref:`Statement Caching <stmtcache>`.

            The default value is *true*.

            .. versionadded:: 5.3

            In earlier versions, statements were always added to the statement cache, if caching was enabled.
        * - ``maxRows``
          - Number
          - .. _propexecmaxrows:

            Overrides :attr:`oracledb.maxRows`.
        * - ``outFormat``
          - Number
          - .. _propexecoutformat:

            Overrides :attr:`oracledb.outFormat`.
        * - ``prefetchRows``
          - Number
          - .. _propexecprefetchrows:

            Overrides :attr:`oracledb.prefetchRows`.

            This attribute is not used in node-oracledb version 2, 3 or 4.
        * - ``resultSet``
          - Boolean
          - .. _propexecresultset:

            Determines whether query results, :ref:`Implicit Results <implicitresults>`, and :ref:`nested cursors <nestedcursors>` should be returned as :ref:`ResultSet <resultsetclass>` objects or directly.

            The default is *false*.

    **Callback**:

    If you are using the callback programming style::

        execute(String sql [, Object bindParams [, Object options]], function(Error error, Object result){});

    See :ref:`connectionexecute` for information on the ``sql``,
    ``bindParams``, and ``options`` parameters.

    The parameters of the callback function
    ``function(Error error, Object result)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
         The second column displays the description.

        * - Callback Function Parameter
          - Description
        * - Error ``error``
          - If ``execute()`` succeeds, error is NULL. If an ``error`` occurs, then error contains the :ref:`error message <errorobj>`.
        * - Object ``result``
          - The :ref:`result <resultobject>` contains any fetched rows, the values of any OUT and IN OUT bind variables, and the number of rows affected by the execution of `DML <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements.

            This parameter can be omitted for `DDL <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD9A8CB4-6B9A-44E5-B114-EFB8DA76FC88>`__ and `DML <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements where the application only checks ``error`` for success or failure. See :ref:`resultobject` for information on its properties.

    **execute() callback: result Object Properties**

    The properties of ``result`` object from the ``execute()`` callback are
    described below.

    .. _resultobject:

    .. list-table-with-summary:: execute() callback: ``result`` Object Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the property. The second column
         displays the description of the property.

        * - Property
          - Description
        * - ``implicitResults``
          - .. _execimplicitresults:

            This property will be defined if the executed statement returned Implicit Results. Depending on the value of :ref:`resultSet <propexecresultset>` it will either be an array, each element containing an array of rows from one query, or an array of :ref:`ResultSets <resultsethandling>` each corresponding to a query.

            See :ref:`Implicit Results <implicitresults>` for examples.

            .. versionadded:: 4.0

            Implicit Results requires Oracle Database 12.1 or later, and Oracle Client 12.1 or later.
        * - ``lastRowid``
          - .. _execlastrowid:

            This read-only property is a string that identifies the ROWID of a row affected by an INSERT, UPDATE, DELETE, or MERGE statement. For other statements, or if no row was affected, it is not set.

            If more than one row was affected, only the ROWID of the last row is returned. To get all ROWIDs of multiple rows see :ref:`DML RETURNING Bind Parameters <dmlreturn>`.

            .. versionadded:: 4.2
        * - ``metaData``
          - .. _execmetadata:

            This read-only property is an array. For ``SELECT`` statements, this contains an array of objects describing details of columns for the select list. For non queries, this property is undefined.

            Each column’s ``name`` is always given. If the column is a :ref:`nested cursor <nestedcursors>`, then the column’s object will also contain a ``metaData`` attribute which is an array describing each column in the nested query.

            Extended metadata is now always returned and includes the following information:

            - ``annotations``: The `annotations <https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/annotations_clause.html#GUID-1AC16117-BBB6-4435-8794-2B99F8F68052>`__ object associated with the fetched column. If the column has no associated annotations, this property value is `undefined`. Annotations are supported from Oracle Database 23ai onwards. If node-oracledb Thick mode is used, Oracle Client 23ai is also required.

            - ``byteSize``: The database byte size. This is only set for ``oracledb.DB_TYPE_VARCHAR``, ``oracledb.DB_TYPE_CHAR`` and ``oracledb.DB_TYPE_RAW`` column types.
            - ``dbType``: one of the :ref:`Oracle Database Type Constant <oracledbconstantsdbtype>` values.
            - ``dbTypeClass``: The class associated with the database type. This is only set if the database type is an object type.
            - ``dbTypeName``: The name of the database type, such as “NUMBER” or “VARCHAR2”. For object types, this will be the object name.
            - ``domainName``: The name of the `SQL domain <https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/create-domain.html#GUID-17D3A9C6-D993-4E94-BF6B-CACA56581F41>`__ associated with the fetched column. If the column does not have a SQL domain, this property value is `undefined`. SQL domains are supported from Oracle Database 23ai onwards. If node-oracledb Thick mode is used, Oracle Client 23ai is also required.

            - ``domainSchema``: The schema name of the `SQL domain <https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/create-domain.html#GUID-17D3A9C6-D993-4E94-BF6B-CACA56581F41>`__ associated with the fetched column. If the column does not have a SQL domain, this property value is `undefined`. SQL domains are supported from Oracle Database 23ai onwards. If node-oracledb Thick mode is used, Oracle Client 23ai is also required.

            - ``fetchType``: One of the :ref:`Node-oracledb Type Constant <oracledbconstantsnodbtype>` values.
            - ``isJson``: Indicates if the column is known to contain JSON data. This will be ``true`` for JSON columns (from Oracle Database 21c) and for LOB and VARCHAR2 columns where "IS JSON" constraint is enabled (from Oracle Database 19c). This property will be ``false`` for all the other columns. It will also be ``false`` for any column when Oracle Client 18c or earlier is used in Thick mode or the Oracle Database version is earlier than 19c.
            - ``isOson``: Indicates if the column is known to contain binary encoded OSON data. This attribute will be ``true`` in Thin mode and while using Oracle Client version 21c (or later) in Thick mode when the "IS JSON FORMAT OSON" check constraint is enabled on BLOB and RAW columns. It will be set to ``false`` for all other columns. It will also be set to ``false`` for any column when the Thick mode uses Oracle Client versions earlier than 21c. Note that the "IS JSON FORMAT OSON" check constraint is available from Oracle Database 19c onwards.
            - ``name``: The column name follows Oracle’s standard name-casing rules. It will commonly be uppercase, since most applications create tables using unquoted, case-insensitive names.
            - ``nullable``: Indicates whether ``NULL`` values are permitted for this column.
            - ``precision``: Set only for ``oracledb.DB_TYPE_NUMBER``, ``oracledb.DB_TYPE_TIMESTAMP``, ``oracledb.DB_TYPE_TIMESTAMP_TZ``, and ``oracledb.DB_TYPE_TIMESTAMP_LTZ`` columns.
            - ``scale``: Set only for ``oracledb.DB_TYPE_NUMBER`` columns.
            - ``vectorDimensions``: The number of dimensions of the VECTOR column. If the column is not a VECTOR column or allows for any number of dimensions, then the value of this property is *undefined*.
            - ``vectorFormat``: The storage format of each dimension value in the VECTOR column. If the column is not a VECTOR column or allows for any storage format, then the value of this property is *undefined*.

            .. versionchanged:: 6.5

                The ``vectorDimensions`` and ``vectorFormat`` information attributes were added.

            .. versionchanged:: 6.4

                The ``isOson`` information attribute was added.

            .. versionchanged:: 6.3

                The ``annotations``, ``domainName``, ``domainSchema``, and ``isJson`` information attributes were added.

            For numeric columns: when ``precision`` is ``0``, then the column is simply a NUMBER. If ``precision`` is nonzero and ``scale`` is ``-127``, then the column is a FLOAT. Otherwise, it is a NUMBER(precision, scale).

            Metadata for ResultSets and REF CURSORS is available in a :attr:`ResultSet property <resultset.metaData>`. For Lobs, a :attr:`Lob type property <lob.type>` also indicates whether the object is a BLOB or CLOB.

            To get query metadata without fetching rows, use a :ref:`ResultSet <resultsetclass>`. Access :attr:`resultset.metaData` and then close the ResultSet. Do not call ``getRow()`` or ``getRows()``. Preferably use a query clause such as ``WHERE 1 = 0`` so the database does minimal work.

            If you wish to change the case of ``name``, then use a column alias in your query. For example, the query ``select mycol from mytab`` will return the ``name`` as ‘MYCOL’. However, executing ``select mycol as "myCol" from mytab`` will return the name ‘myCol’.

            See :ref:`Query Column Metadata <querymeta>` for examples.
        * - ``outBinds``
          - .. _execoutbinds:

            This array or object property contains the output values of OUT and IN OUT binds.

            If :ref:`bindParams <executebindParams>` is passed as an array, then ``outBinds`` is returned as an array. If ``bindParams`` is passed as an object, then ``outBinds`` is returned as an object. If there are no OUT or IN OUT binds, the value is undefined.
        * - ``resultSet``
          - .. _execresultset:

            This property is an object. For ``SELECT`` statements, when the :ref:`resultSet <executeoptions>` option is *true*, use the ``resultSet`` object to fetch rows. See :ref:`ResultSet Class <resultsetclass>` and :ref:`Fetching Rows with ResultSets <resultsethandling>`.

            When using this option, :meth:`resultSet.close()` must be called when the ResultSet is no longer needed. This is true whether or not rows have been fetched from the ResultSet.
        * - ``rows``
          - .. _execrows:

            This property is an array. For ``SELECT`` statements using :ref:`direct fetches <fetchingrows>`, ``rows`` contains an array of fetched rows. It will be NULL if there is an error or the SQL statement was not a SELECT statement. By default, the rows are in an array of column value arrays, but this can be changed to arrays of objects by setting :attr:`oracledb.outFormat` to ``oracledb.OUT_FORMAT_OBJECT``. If a single row is fetched, then ``rows`` is an array that contains one single row.

            The number of rows returned is limited by :attr:`oracledb.maxRows` or the :ref:`maxRows <propexecmaxrows>` option in an ``execute()`` call. If ``maxRows`` is 0, then the number of rows is limited by Node.js memory constraints.

            If the query contains :ref:`nested cursors <nestedcursors>`, then each nested cursor is returned as an array of rows fetched from that cursor. The number of rows returned for each cursor is limited by ``maxRows``.
        * - ``rowsAffected``
          - .. _execrowsaffected:

            This property is a number. For `DML <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D>`__ statements this contains the number of rows affected, for example the number of rows inserted. For non-DML statements such as queries and PL/SQL statements, ``rowsAffected`` is undefined.

            Due to Node.js type limitations, the largest value shown will be 232 - 1, even if more rows were affected. Larger values will wrap.
        * - ``warning``
          - .. _execwarning:

            This property provides an :ref:`error <errorobj>` object that gives information about any database warnings (such as PL/SQL compilation warnings) that were generated during the last call to :meth:`connection.execute()`.

            See :ref:`plsqlcompwarnings` for more information.

            .. versionadded:: 6.3

.. method:: connection.executeMany()

    .. versionadded:: 2.2

    **Promise**::

        promise = executeMany(String sql, Array binds [, Object options]);
        promise = executeMany(String sql, Number numIterations [, Object options]);

    Allows sets of data values to be bound to one DML or PL/SQL
    statement for execution. It is like calling :meth:`connection.execute()`
    multiple times but requires fewer :ref:`round-trips <roundtrips>`. This is
    an efficient way to handle batch changes, for example when inserting or
    updating multiple rows. The method cannot be used for queries.

    The ``executeMany()`` method supports IN, IN OUT and OUT binds for most
    data types except :ref:`PL/SQL Collection Associative
    Arrays <plsqlindexbybinds>`.

    The version of this function which accepts a number of iterations should
    be used when no bind parameters are required or when all bind parameters
    are OUT binds.

    When ``executeMany()`` is used for PL/SQL code that returns OUT binds it
    will have the same performance characteristics as repeated calls to
    ``execute()``.

    See :ref:`Batch Statement Execution and Bulk Loading <batchexecution>` for
    more information.

    The parameters of the ``connection.executeMany()`` method are:

    .. _executemanyparam:

    .. list-table-with-summary:: connection.executeMany() Parameters
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
        * - ``sql``
          - String
          - .. _executemanysqlparam:

            The SQL or PL/SQL statement that ``executeMany()`` executes. The statement should contain bind variable names.
        * - ``binds``
          - Array
          - .. _executemanybinds:

            The ``binds`` parameter contains the values or variables to be bound to the executed statement. It must be an array of arrays (for ‘bind by position’) or an array of objects whose keys match the bind variable names in the SQL statement (for ‘bind by name’). Each sub-array or sub-object should contain values for the bind variables used in the SQL statement. At least one such record must be specified.

            If a record contains fewer values than expected, NULL values will be used. For bind by position, empty values can be specified using syntax like ``[a,,c,d]``.

            By default, the direction of binds is ``oracledb.BIND_IN``. The first data record determines the number of bind variables, each bind variable’s data type, and its name (when binding by name). If a variable in the first record contains a null, this value is ignored and a subsequent record is used to determine that variable’s characteristics.

            If all values in all records for a particular bind variable are null, the type of that bind is ``oracledb.STRING`` with a maximum size of 1.

            The maximum sizes of strings and buffers are determined by scanning all records unless a :ref:`bindDefs <executemanyoptbinddefs>` property is used. This property explicitly specifies the characteristics of each bind variable.
        * - options
          - Object
          - .. _executemanyoptions:

            The ``options`` parameter is optional. It can contain the properties detailed in :ref:`optionsexecutemany`.

    **executeMany(): options Parameter Properties**

    The properties of the ``options`` parameter are:

    .. _optionsexecutemany:

    .. list-table-with-summary:: executeMany(): ``options`` Parameter Properties
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
        * - ``autoCommit``
          - Boolean
          - .. _executemanyoptautocommit:

            This optional property overrides :attr:`oracledb.autoCommit`. Note :ref:`batchErrors <executemanyoptbatcherrors>` can affect
            autocommit mode.
        * - ``batchErrors``
          - Boolean
          - .. _executemanyoptbatcherrors:

            This optional property allows invalid data records to be rejected while still letting valid data be processed. It can only be set to *true* for INSERT, UPDATE, DELETE or MERGE statements.

            When *false*, the ``executeMany()`` call will stop when the first error occurs. The callback :ref:`error object <errorobj>` will be set.

            When ``batchErrors`` is *true*, processing will continue even if there are data errors. The ``executeMany()`` callback error parameter is not set. Instead, a property (also called ``batchErrors``) will be returned in the callback ``result`` parameter. The property holds an array of :ref:`Error objects <errorobj>`. Each Error ``offset`` indicates the row number of a data record that could not be processed. All other valid data records will be processed and a transaction will be started but not committed, even if ``autoCommit`` is *true*. The application can examine the errors, take action, and explicitly commit or rollback as desired.

            In node-oracledb 4.2, the maximum ``offset`` value was changed from (2^16)-1 to (2^32)-1.

            Note that some classes of error will always return via the ``executeMany()`` callback error object, not as batch errors. No transaction is created in this case.

            The default value is *false*.

            See :ref:`Handling Data Errors with executeMany() <handlingbatcherrors>` for examples.
        * - ``bindDefs``
          - Object
          - .. _executemanyoptbinddefs:

            The bindDefs object defines the bind variable types, sizes and directions. This object is optional in some cases but it is more efficient to set it.

            It should be an array or an object, depending on the structure of the :ref:`binds parameter <executemanybinds>`.

            Each value in the ``bindDefs`` array or object should be an object containing the keys ``dir``, ``maxSize``, and ``type`` for one bind variable, similar to how :ref:`execute() bind parameters <executebindparams>` are identified. See :ref:`executemanybinddef` for information on the bindDefs object property.
        * - ``dmlRowCounts``
          - Boolean
          - .. _executemanyoptdmlrowcounts:

            When *true*, this optional property enables output of the number of rows affected by each input data record. It can only be set *true* for INSERT, UPDATE, DELETE or MERGE statements.

            The default value is *false*.

            This feature works when node-oracledb is using version 12, or later, of the Oracle Client library, and using Oracle Database 12, or later.
        * - ``keepInStmtCache``
          - Boolean
          - .. _executemanyoptkeepinstmtcache:

            When ``keepInStmtCache`` is *true*, and statement caching is enabled, then the statement will be added to the cache if it is not already present. This helps the performance of re-executed statements. See :ref:`Statement Caching <stmtcache>`.

            The default value is *true*.

            .. versionadded:: 5.3

            In earlier versions, statements were always added to the statement cache, if caching was enabled.

    **executeMany(): bindDefs Object Properties**

    The properties of the ``bindDefs`` object are:

    .. _executemanybinddef:

    .. list-table-with-summary::  executeMany(): ``bindDefs`` Object Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the BindDef property. The second
         column displays the description.

        * - BindDef Property
          - Description
        * - ``dir``
          - The direction of the bind. One of the :ref:`Execute Bind Direction Constants <oracledbconstantsbinddir>` ``oracledb.BIND_IN``, ``oracledb.BIND_INOUT``, or ``oracledb.BIND_OUT``. The default is ``oracledb.BIND_IN``.
        * - ``maxSize``
          - Required for Strings and Buffers. Ignored for other types. Specifies the maximum number of bytes allocated when processing each value of this bind variable.

            When data is being passed into the database, ``maxSize`` should be at least the size of the longest value. When data is being returned from the database, ``maxSize`` should be the size of the longest value. If ``maxSize`` is too small, ``executeMany()`` will throw an error that is not handled by :ref:`batchErrors <executemanyoptbatcherrors>`.
        * - ``type``
          - Specifies the mapping between the node-oracledb and database data type. See the ``execute()`` :ref:`type <executebindparamtype>` table.

    **Callback**:

    If you are using the continuation passing style::

        executeMany(String sql, Array binds [, Object options], function(Error error, Object result) {});
        executeMany(String sql, Number numIterations [, Object options], function(Error error, Object result) {});

    See :ref:`optionsexecutemany` for information on the ``sql``, ``binds``,
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
          - If ``executeMany()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the error message.
        * - Object ``result``
          - The result object may contain the properties detailed in :ref:`resultobjproperties`.

    **executeMany(): result Object Properties**

    The properties of the ``result`` object are:

    .. _resultobjproperties:

    .. list-table-with-summary:: executeMany(): ``result`` Object Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the property. The second column
         displays the data type of the property. The third column displays
         the description of the property.

        * - Property
          - Data Type
          - Description
        * - ``batchErrors``
          - Array
          - .. _execmanybatcherrors:

            This property is an array of :ref:`error objects <errorobj>` that were reported during execution. The ``offset`` property of each error object corresponds to the 0-based index of the ``executeMany()`` :ref:`binds parameter <executemanybinds>` array,
            indicating which record could not be processed.

            It will be present only if :ref:`batchErrors <executemanyoptbatcherrors>` was *true* in the :ref:`executeMany() options <executemanyoptions>` parameter and there are data errors to report. Some classes of execution error will always return via the ``executeMany()`` callback error object, not in ``batchErrors``.
        * - ``dmlRowCounts``
          - Array
          - .. _execmanydmlrowscounts:

            This is an array of integers identifying the number of rows affected by each record of the :ref:`binds parameter
            <executemanybinds>`.

            It is present only if :ref:`dmlRowCounts <executemanyoptdmlrowcounts>` was *true* in the :ref:`executeMany() options <executemanyoptions>` parameter and a DML statement was executed.
        * - ``outBinds``
          - Object
          - .. _execmanyoutbinds:

            This contains the value of any returned IN OUT or OUT binds. It is an array of arrays, or an array of objects, depending on the :ref:`binds parameters <executemanybinds>` structure. The length of the array will correspond to the length of the array passed as the :ref:`binds parameter <executemanybinds>`.

            It will be present only if there is at least one OUT bind variable identified.
        * - ``rowsAffected``
          - Number
          - .. _execmanyrowsaffected:

            This is an integer identifying the total number of database rows affected by the processing of all records of the :ref:`binds parameter <executemanybinds>`.

            It is only present if a DML statement was executed.

            Due to Node.js type limitations, the largest value shown will be 232 - 1, even if more rows were affected. Larger values will wrap.
        * - ``warning``
          - Object
          - .. _execmanywarning:

            This property provides an :ref:`error <errorobj>` object that gives information about any database warnings (such as PL/SQL compilation warnings) that were generated during the last call to :meth:`connection.executeMany()`.

            See :ref:`plsqlcompwarnings` for more information.

            .. versionadded:: 6.4

.. method:: connection.getDbObjectClass()

    .. versionadded:: 4.0

    **Promise**::

        promise = getDbObjectClass(String className)

    Returns a :ref:`DbObject <dbobjectclass>` prototype object representing
    the named Oracle Database object or collection.

    When the definition of a type changes in the database, such as might
    occur in a development environment, you should fully close connections
    to clear the object caches used by node-oracledb and the Oracle Client
    libraries. For example, when using a pool you could use
    :ref:`await connection.close({drop: true}) <connectionclose>`, or
    restart the pool. Then ``getDbObjectClass()`` can be called again to get
    the updated type information.

    See :ref:`Oracle Database Objects and Collections <objects>`.

    The parameters of the ``connection.getDbObjectClass()`` method are:

    .. _getdbobjectparams:

    .. list-table-with-summary:: connection.getDbObjectClass() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 12 45
        :summary: The first column displays the parameter. The second column
         displays the data type of the parameter. The third column displays
         the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``className``
          - String
          - The name of the Oracle object or collection.

    **Callback**:

    If you are using the callback programming style::

        getDbObjectClass(String className, function(error, DbObject obj) {})

    See :ref:`getdbobjectparams` for information on the parameters.

    The parameters of the callback function
    ``function(Error error, DbObject obj)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
         The second column displays the description.

        * - Callback Function Parameter
          - Description
        * - Error ``error``
          - If ``getDbObjectClass()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - DbObject ``obj``
          - A :ref:`DbObject <dbobjectclass>` representing an Oracle Database object or collection.

.. method:: connection.getQueue()

    **Promise**::

        promise = getQueue(String name [, Object options])

    This method returns an :ref:`AqQueue Class <aqqueueclass>` object.

    This method returns a queue for enqueuing and dequeuing :ref:`Oracle Advanced
    Queuing (AQ) <aq>` messages.

    .. note::

        This method is only supported in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    The parameters of the ``connection.getQueue()`` method are:

    .. _getqueueparams:

    .. list-table-with-summary:: connection.getQueue() Parameters
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
        * - ``name``
          - String
          - The name of the Advanced Queue to use. This queue should have been created previously, for example with the ``DBMS_AQADM.CREATE_QUEUE()`` function.

            If the Advanced Queue does not exist in the database, an error will occur when the queue is attempted to be used.
        * - ``options``
          - Object
          - This optional argument can be used to specify the payload type. If the argument is not passed, then the database queue must be a RAW queue. See :ref:`getqueueoptions` for information on the attributes.

    **getQueue(): options Parameter Attributes**

    The ``options`` object has the following attributes:

    .. _getqueueoptions:

    .. list-table-with-summary:: getQueue(): ``options`` Parameter Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the attribute name. The second
         column displays the description of the attribute.

        * - Attribute Name
          - Description
        * - ``payloadType``
          - - For :ref:`simple string or stream of bytes (RAW) messages <aqrawexample>`, it is not necessary to explicitly specify this attribute. This is the default setting for the payload type. For example::

                connection.getQueue(queueName)

              will have RAW messages as the default ``payloadType`` setting.

              Or you can also explicitly set this attribute to ``oracledb.DB_TYPE_RAW``. For example::

                connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_RAW })
            - For :ref:`JSON messages <aqjsonexample>`, set this attribute to ``oracledb.DB_TYPE_JSON``. For example::

                connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON })
            - For :ref:`Database object messages <aqobjexample>`, set this attribute to the name of an Oracle Database object type, or a :ref:`DbObject Class <dbobjectclass>` earlier acquired from :meth:`connection.getDbObjectClass()`. If the name of an object type is used, it is recommended that a fully qualified name be used. For example, if the Oracle Database object type name is ``DEMOQUEUE.USER_ADDRESS_TYPE``::

                connection.getQueue(queueName, {payloadType: "DEMOQUEUE.USER_ADDRESS_TYPE"});

            .. versionchanged:: 6.1

                Previously, the default value was RAW and you did not have to set this attribute for RAW messages. Also, only the name of an Oracle Database object type, or a :ref:`DbObject Class <dbobjectclass>` could be specified in the this attribute. Now, you can also explicitly specify ``oracledb.DB_TYPE_RAW`` for RAW messages and ``oracledb.DB_TYPE_JSON`` for JSON messages in this attribute.

    **Callback**:

    If you are using the continuation passing style::

        getQueue(String name, [Object options,] function(Error error, AqQueue queue){})

    See :ref:`getqueueparams` for information on the ``name`` and ``options``
    parameters.

    The parameters of the callback function
    ``function(Error error, AqQueue queue)`` are:

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
          - If ``queue()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.getSodaDatabase()

    .. versionadded:: 3.0

    .. code-block:: javascript

        getSodaDatabase();

    This synchronous method returns a :ref:`SodaDatabase <sodadatabaseclass>`.

    Returns a parent SodaDatabase object for use with Simple Oracle Document
    Access (SODA).

    .. note::

        This method is only supported in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    SODA can be used with Oracle Database 18.3 and above, when node-oracledb
    uses Oracle Client 18.5 or Oracle Client 19.3, or later. The SODA bulk
    insert methods :meth:`sodaCollection.insertMany()` and
    :meth:`sodaCollection.insertManyAndGet()` are in Preview status.

    See :ref:`Simple Oracle Document Access (SODA) <sodaoverview>` for more
    information about using SODA in node-oracledb.

.. method:: connection.getStatementInfo()

    .. versionadded:: 2.2

    **Promise**::

        promise = getStatementInfo(String sql);

    Parses a SQL statement and returns information about it. This is most
    useful for finding column names of queries, and for finding the names of
    :ref:`bind variables <bind>` used.

    This method performs a :ref:`round-trip <roundtrips>` to the database, so
    unnecessary calls should be avoided.

    The information is provided by lower level APIs that have some
    limitations. Some uncommon statements will return the statement type as
    ``oracledb.STMT_TYPE_UNKNOWN``. DDL statements are not parsed, so syntax
    errors in them will not be reported. The direction and types of bind
    variables cannot be determined.

    The statement is always added to the :ref:`statement cache <stmtcache>`.
    This improves performance if ``getStatementInfo()`` is repeatedly called
    with the same statement, or if the statement is used in an
    :meth:`connection.execute()` call or similar.

    The parameters of the ``connection.getStatementInfo()`` method are:

    .. _getstmtinfo:

    .. list-table-with-summary:: connection.getStatementInfo() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 15 40
        :summary: The first column displays the parameter. The second column
         displays the data type of the parameter. The third column displays
         the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``sql``
          - String
          - The SQL statement to parse.

    **Callback**:

    If you are using the callback programming style::

        getStatementInfo(String sql, function(Error error, Object information){});

    See :ref:`getstmtinfo` for information on the ``sql`` parameter.

    The parameters of the callback function
    ``function(Error error, Object information)`` are:

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
          - If ``getStatementInfo()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Object ``information``
          - Depending on the statement type, the information object may contain:

            - ``bindNames``: An array of strings corresponding to the unique names of the bind variables used in the SQL statement.
            - ``metaData``: Contains properties equivalent to those given by ``execute()`` :ref:`metaData <execmetadata>`. This property exists only for queries.
            - ``statementType``: An integer corresponding to one of the :ref:`SQL Statement Type Constants <oracledbconstantsstmttype>`.

.. method:: connection.isHealthy()

    .. versionadded:: 5.4

    .. code-block:: javascript

        isHealthy()

    This synchronous function returns a boolean indicating the health status
    of a connection.

    Connections may become unusable in several cases, such as if the network
    socket is broken, if an Oracle error indicates the connection is
    unusable or after receiving a planned down notification from the
    database.

    This function is best used before starting a new database request on an
    existing standalone connection. Pooled connections internally perform
    this check before returning a connection to the application.

    If this function returns false, the connection should be closed by the
    application and a new connection should be established instead.

    This function performs a local check. To fully check a connection’s
    health, use :meth:`connection.ping()` which performs a round-trip
    to the database.

.. method:: connection.ping()

    .. versionadded:: 2.2

    **Promise**::

        promise = ping();

    Checks that a connection is currently usable and the network
    to the database is valid. This call can be useful for system health
    checks. A ping only confirms that a single connection is usable at the
    time of the ping.

    Pinging does not replace error checking during statement execution,
    since network or database failure may occur in the interval between
    ``ping()`` and ``execute()`` calls.

    Pinging requires a :ref:`round-trip <roundtrips>` to the database. So,
    unnecessary ``ping()`` calls should be avoided.

    If ``ping()`` returns an error, the application should close the
    connection.

    **Callback**:

    If you are using the callback programming style::

        ping(function(Error error){});

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
          - If ``ping()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.queryStream()

    .. versionadded:: 1.8

    ::

        queryStream(String sql [, Object bindParams, [Object options]]);

    This synchronous method will return a `Readable
    Stream <https://nodejs.org/api/stream.html>`__ for queries.

    This function provides query streaming support. The parameters are the
    same as :meth:`connection.execute()` except a callback is not used.
    Instead this function returns a stream used to fetch data.

    Each row is returned as a ``data`` event. Query metadata is available
    via a ``metadata`` event. The ``end`` event indicates the end of the
    query results. After the ``end`` event has been received, the Stream
    `destroy() <https://nodejs.org/api/stream.html#stream_readable_destroy_error>`__
    function should be called to clean up resources properly. Any further
    end-of-fetch logic, in particular the connection release, should be in
    the ``close`` event. Alternatively the Stream
    `destroy() <https://nodejs.org/api/stream.html#stream_readable_destroy_error>`__
    method can be used to terminate a stream early.

    For tuning, adjust the values of the options
    :ref:`fetchArraySize <propexecfetcharraysize>` and
    :ref:`prefetchRows <propexecprefetchrows>`, see :ref:`Tuning Fetch
    Performance <rowfetching>`.

    See :ref:`Query Streaming <streamingresults>` for more information.

    Support for Node.js version 8 Stream ``destroy()`` method was added in
    node-oracledb 2.1.

    See :meth:`~connection.execute()`.

.. method:: connection.rollback()

    **Promise**::

        promise = rollback();

    Rolls back the current transaction in progress on the
    connection.

    **Callback**:

    If you are using the continuation passing style::

        rollback(function(Error error){});

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
          - If ``rollback()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.shutdown()

    .. versionadded:: 5.0

    **Promise**::

        promise = shutdown([Number shutdownMode])

    Shuts down a database instance. This is the flexible version of
    :meth:`oracledb.shutdown()`, allowing more control over behavior.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    This method must be called twice. The first call blocks new connections.
    SQL statements such as await ``ALTER DATABASE CLOSE NORMAL`` and
    ``ALTER DATABASE DISMOUNT`` can then be used to close and unmount the
    database instance. Alternatively database administration can be
    performed. Finally, a second call
    ``connection.shutdown(oracledb.SHUTDOWN_MODE_FINAL)`` is required to
    fully close the database instance.

    If the initial ``connection.shutdown()``
    :ref:`shutdownMode <conshutdownmode>` mode
    ``oracledb.SHUTDOWN_MODE_ABORT`` is used, then ``connection.shutdown()``
    does not need to be called a second time.

    See :ref:`Database Start Up and Shut Down <startupshutdown>`.

    The parameters of the ``connection.shutdown()`` method are:

    .. _conshutdownmode:

    .. list-table-with-summary:: connection.shutdown() Parameters
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
        * - ``shutdownMode``
          - Number
          - One of the constants :ref:`oracledb.SHUTDOWN_MODE_ABORT <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_DEFAULT <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_FINAL <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_IMMEDIATE <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL <oracledbconstantsshutdown>`, or :ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL <oracledbconstantsshutdown>`.

            If ``oracledb.SHUTDOWN_MODE_ABORT`` is used, then ``connection.shutdown()`` does not need to be called a second time.

            Only the second invocation of ``connection.shutdown()`` should use ``oracledb.SHUTDOWN_MODE_FINAL``.

    **Callback**:

    If you are using the callback programming style::

        shutdown([Number shutdownMode,] function(Error error) {});

    See :ref:`conshutdownmode` for information on the parameters.

    The parameters of the callback function ``function(Error error)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter. The
         second column displays the description of the parameter.

        * - Callback Function Parameter
          - Description
        * - Error ``error``
          - If ``shutdown()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.subscribe()

    .. versionadded:: 2.3

    **Promise**::

        promise = subscribe(String name, Object options);

    Register a JavaScript callback method to be invoked when data is changed
    in the database by any committed transaction, or when there are Advanced
    Queuing messages to be dequeued.

    For notification to work, the connection must be created with
    :attr:`oracledb.events` mode *true*.

    The database must be able to connect to the node-oracledb machine for
    notifications to be received. Typically this means that the machine
    running node-oracledb needs a fixed IP address. If there is any problem
    sending a notification, then the callback method will not be invoked.

    The ``connection.subscribe()`` method may be called multiple times with
    the same ``name``, as long as the same connection is used. In this case,
    the second and subsequent invocations ignore all ``options`` properties
    other than :ref:`sql <consubscribeoptsql>` and
    :ref:`binds <consubscribeoptbinds>`. Instead, the new SQL statement is
    registered to the same subscription, and the same JavaScript
    notification callback is used. For performance reasons this can be
    preferable to creating a new subscription for each query.

    See :ref:`Continuous Query Notification (CQN) <cqn>` and :ref:`Advanced Queuing
    Notifications <aqnotifications>` for more information.

    AQ notifications were added in node-oracledb 4.0

    The parameters of the ``connection.subscribe()`` method are:

    .. _subscribeparams:

    .. list-table-with-summary:: connection.subscribe() Parameters
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
        * - ``name``
          - String
          - .. _consubscribename:

            For Continuous Query Notification this is an arbitrary name given to the subscription. For Advanced Queuing notifications this must be the queue name.
        * - ``options``
          - Object
          - .. _consubscribeoptions:

            The options that control the subscription. See :ref:`subscribeoptions` for the properties that can be set.

    **subscribe(): options Parameter Properties**

    The properties of the ``options`` parameter are:

    .. _subscribeoptions:

    .. list-table-with-summary:: subscribe(): ``options`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the property. The second column displays the description of the property.

        * - Property
          - Data Type
          - Description
        * - ``binds``
          - Array or Object
          - .. _consubscribeoptbinds:

            An array (bind by position) or object (bind by name) containing the bind values to use in the :ref:`sql <consubscribeoptsql>` property.
        * - ``callback``
          - function
          - .. _consubscribeoptcallback:

            The notification callback that will be called whenever notifications are sent by the database. It accepts one parameter which contains details of the notification. The syntax of the callback function is::

                function callback(Object message)

            The ``message`` parameter contains information about the notification. See :ref:`messageparam` for information about the properties.
        * - ``clientInitiated``
          - Boolean
          - .. _consubscribeoptclientinitiated:

            This property enables CQN “client initiated” connections which internally use the same approach as normal connections to the database, and do not require the database to be able to connect back to the application. Since client initiated connections do not need additional network configuration, they have ease-of-use and security advantages.

            The default is *false*.

            .. versionadded:: 4.2

            It is available when Oracle Database and the Oracle Client libraries are version 19.4 or higher.
        * - ``groupingClass``
          - Number
          - .. _consubscribeoptgroupingclass:

            An integer mask which currently, if set, can only contain the value :ref:`oracledb.SUBSCR_GROUPING_CLASS_TIME <oracledbconstantssubscription>`. If this value is set then notifications are grouped by time into a single notification.
        * - ``groupingType``
          - Number
          - .. _consubscribeoptgroupingtype:

            Either :ref:`oracledb.SUBSCR_GROUPING_TYPE_SUMMARY <oracledbconstantssubscription>` (the default) indicating notifications should be grouped in a summary, or :ref:`oracledb.SUBSCR_GROUPING_TYPE_LAST <oracledbconstantssubscription>` indicating the last notification in the group should be sent.
        * - ``groupingValue``
          - Number
          - .. _consubscribeoptgroupingvalue:

            If ``groupingClass`` contains :ref:`oracledb.SUBSCR_GROUPING_CLASS_TIME <oracledbconstantssubscription>` then `groupingValue`` can be used to set the number of seconds over which notifications will be grouped together, invoking ``callback`` once. If ``groupingClass`` is not set, then ``groupingValue`` is ignored.
        * - ``ipAddress``
          - String
          - .. _consubscribeoptipaddress:

            A string containing an IPv4 or IPv6 address on which the subscription should listen to receive notifications. If not specified, then the Oracle Client library will select an IP address.
        * - ``namespace``
          - Number
          - .. _consubscribeoptnamespace:

            One of the :ref:`oracledb.SUBSCR_NAMESPACE_AQ <oracledbconstantssubscription>` or :ref:`oracledb.SUBSCR_NAMESPACE_DBCHANGE <oracledbconstantssubscription>` (the default) constants.

            You can use ``oracledb.SUBSCR_NAMESPACE_AQ`` to get notifications that Advanced Queuing messages are available to be dequeued, see :ref:`Advanced Queuing Notifications <aqnotifications>`.
        * - ``operations``
          - Number
          - .. _consubscribeoptoperations:

            An integer mask containing one or more of the operation type :ref:`oracledb.CQN_OPCODE_* <oracledbconstantscqn>` constants to indicate what types of database change should generation notifications.
        * - ``port``
          - Number
          - .. _consubscribeoptport:

            The port number on which the subscription should listen to receive notifications. If not specified, then the Oracle Client library will select a port number.
        * - ``qos``
          - Number
          - .. _consubscribeoptqos:

            An integer mask containing one or more of the quality of service :ref:`oracledb.SUBSCR_QOS_* <oracledbconstantssubscription>` constants.
        * - ``sql``
          - String
          - .. _consubscribeoptsql:

            The SQL query string to use for notifications.
        * - ``timeout``
          - Number
          - .. _consubscribeopttimeout:

            The number of seconds the subscription should remain active. Once this length of time has been reached, the subscription is automatically unregistered and a deregistration notification is sent.

    **subscribe(): message Parameter Properties**

    The ``message`` parameter in the notification callback is an object
    containing the following properties:

    .. _messageparam:

    .. list-table-with-summary:: ``message`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the property. The second column displays the description of the property.

        * - Property
          - Description
        * - ``dbName``
          - The name of the database which sent a notification. This property is only defined for CQN. It is not defined when ``type`` is :ref:`oracledb.SUBSCR_EVENT_TYPE_DEREG <oracledbconstantssubscription>`.
        * - ``queueName``
          - The name of the Advanced Queue. Undefined for CQN.

            .. versionadded:: 4.0
        * - ``queries``
          - An array of objects specifying the queries which were affected by the Query Change notification. This is only defined if the ``type`` key is the value :ref:`oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE <oracledbconstantssubscription>`.

            It contains the ``table`` key which is an array of objects identical to the objects created for Database Change Notification (see the ``tables`` property below).
        * - ``registered``
          - A boolean indicating whether the subscription is registered with the database. Will be *false* if ``type`` is :ref:`oracledb.SUBSCR_EVENT_TYPE_DEREG <oracledbconstantssubscription>` or if the subscription was created with the :ref:`qos <consubscribeoptqos>` property set to :ref:`oracledb.SUBSCR_QOS_DEREG_NFY <oracledbconstantssubscription>`.
        * - ``tables``
          - An array of objects specifying the tables which were affected by the notification. This is only defined if ``type`` is :ref:`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE <oracledbconstantssubscription>`.
            It contains the following properties:

            - ``name`` - The name of the table which was modified in some way.
            - ``operation`` - An integer mask composed of one or more values of the following constants:

              -  :ref:`oracledb.CQN_OPCODE_ALL_ROWS <oracledbconstantscqn>` - if row information is not available. This occurs if the :ref:`qos <consubscribeoptqos>` quality of service flags do not specify the desire for ROWIDs or if grouping has taken place and summary notifications are being sent. This may also be set when too many rows are returned.
              -  :ref:`oracledb.CQN_OPCODE_ALTER <oracledbconstantscqn>` - if the table was altered in the notifying transaction.
              -  :ref:`oracledb.CQN_OPCODE_DELETE <oracledbconstantscqn>` - if the notifying transaction included deletes on the table.
              -  :ref:`oracledb.CQN_OPCODE_DROP <oracledbconstantscqn>` - if the table was dropped in the notifying transaction.
              -  :ref:`oracledb.CQN_OPCODE_INSERT <oracledbconstantscqn>` - if the notifying transaction included inserts on the table.
              -  :ref:`oracledb.CQN_OPCODE_UPDATE <oracledbconstantscqn>` - if the notifying transaction included updates on the table.

            -  ``rows`` - An array of objects specifying the rows which were changed. This will only be defined if the :ref:`qos <consubscribeoptqos>` quality of service used when creating the subscription indicated the desire for ROWIDs and no summary grouping took place.
               It contains the following properties:

               -  operation: An integer which is one of :ref:`oracledb.CQN_OPCODE_INSERT <oracledbconstantscqn>`, :ref:`oracledb.CQN_OPCODE_UPDATE <oracledbconstantscqn>`, :ref:`oracledb.CQN_OPCODE_DELETE <oracledbconstantscqn>` as described earlier.
               -  rowid: A string containing the ROWID of the row that was affected

        * - ``txId``
          - A buffer containing the identifier of the CQN transaction which spawned the notification.

        * - ``type``
          - The type of notification sent. This will be the value of one of the following constants:

            -  :ref:`oracledb.SUBSCR_EVENT_TYPE_AQ <oracledbconstantssubscription>` - One or more Advanced Queuing messages are available to be dequeued.
            -  :ref:`oracledb.SUBSCR_EVENT_TYPE_DEREG <oracledbconstantssubscription>` - the subscription has been closed or the timeout value has been reached.
            -  :ref:`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE <oracledbconstantssubscription>` - object-level notifications are being used (Database Change Notification).
            -  :ref:`oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE <oracledbconstantssubscription>` - query-level notifications are being used (Continuous Query Notification).

    **Callback**:

    If you are using the continuation passing style::

        subscribe(String name, Object options, function(Error error, Object result){});

    See :ref:`subscribeparams` for information on the ``name`` and ``options``
    parameters.

    The parameters of the callback function
    ``function(Error error, Object result)`` are:

    .. _consubscribecallback:

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
          - If ``subscribe()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Object ``result``
          - For :ref:`CQN <cqn>` ``oracledb.SUBSCR_NAMESPACE_DBCHANGE`` subscriptions this contains a single property ``regId`` corresponding the value of ``REGID`` in the database view ``USER_CHANGE_NOTIFICATION_REGS`` or the value of ``REG_ID`` in ``USER_SUBSCR_REGISTRATIONS``. For :ref:`AQ <aq>` ``oracledb.SUBSCR_NAMESPACE_AQ`` subscriptions, ``regId`` is undefined. Due to Node.js type limitations, the largest ``regId`` shown will be 232 - 1. Larger values will wrap.

            .. versionadded:: 4.0

.. method:: connection.startup()

    .. versionadded:: 5.0

    **Promise**::

        promise = startup([Object options]);

    Starts up a database instance. This is the flexible version of
    :meth:`oracledb.startup()`, allowing more control over
    behavior.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    The connection must be a standalone connection, not a pooled connection.

    This function starts the database in an unmounted state. SQL statements
    such as ``ALTER DATABASE MOUNT`` and ``ALTER DATABASE OPEN`` can then be
    executed to completely open the database instance. Database recovery
    commands could also be executed at this time.

    The connection used must have the
    :ref:`privilege <getconnectiondbattrsprivilege>` set to
    :ref:`oracledb.SYSPRELIM <oracledbconstantsprivilege>`, along with
    either :ref:`oracledb.SYSDBA <oracledbconstantsprivilege>` or
    :ref:`oracledb.SYSOPER <oracledbconstantsprivilege>`. For example
    ``oracledb.SYSDBA | oracledb.SYSPRELIM``.

    See :ref:`Database Start Up and Shut Down <startupshutdown>`.

    The parameters of the ``connection.startup()`` method are:

    .. _constartupparams:

    .. list-table-with-summary:: connection.startup() Parameters
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
          - See :ref:`startupoptions` for information on the properties.

    The following properties can be set using the connection.startup()
    ``options`` parameter:

    .. _startupoptions:

    .. list-table-with-summary:: startup(): ``options`` Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the property. The second column
         displays the description of the property.

        * - Property
          - Description
        * - ``force``
          - Shuts down a running database using :ref:`oracledb.SHUTDOWN_MODE_ABORT <oracledbconstantsshutdown>` before restarting the database instance. The next database start up may require instance recovery.

            The default for ``force`` is *false*.
        * - ``pfile``
          - After the database is started, access is restricted to users who have the CREATE_SESSION and RESTRICTED SESSION privileges.

            The default is *false*.
        * - ``restrict``
          - The path and filename for a local text file containing `Oracle Database initialization parameters <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8BAD86FC-27C5-4103-8151-AC5BADF274E3>`__.

            If ``pfile`` is not set, then the database server-side parameter file is used.

    **Callback**:

    If you are using the callback programming style::

        startup ([Object options,] function(Error error) {});

    See :ref:`constartupparams` for information on the ``options`` parameter.

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
          - If ``startup()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcBegin()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcBegin(Object xid [, Number flag [, Number transactionTimeout]]);

    Explicitly begins a new two-phase commit (TPC) transaction using the
    specified transaction identifier (XID). The XID is made up of a format
    identifier, a transaction identifier, and a branch identifier.

    See :ref:`Two-Phase Commits (TPC) <twopc>`.

    The parameters of the ``connection.tpcBegin()`` method are:

    .. _tpcbegin:

    .. list-table-with-summary:: connection.tpcBegin() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier (XID). It should be an object with the following three attributes:

            - ``Number formatId`` - the XID format.
            - ``String | Buffer globalTransactionId`` - the global transaction identifier of the XID.
            - ``String | Buffer branchQualifier`` - the branch identifier of the XID.
        * - ``flag``
          - Number
          - One of the constants :ref:`oracledb.TPC_BEGIN_JOIN <oracledbconstantstpc>`, :ref:`oracledb.TPC_BEGIN_NEW <oracledbconstantstpc>`, :ref:`oracledb.TPC_BEGIN_PROMOTE <oracledbconstantstpc>`, or :ref:`oracledb.TPC_BEGIN_RESUME <oracledbconstantstpc>`.

            The default is ``oracledb.TPC_BEGIN_NEW``.

            The flag ``oracledb.TPC_BEGIN_RESUME`` can be used to resume a transaction previously suspended by
            :meth:`connection.tpcEnd()`.

        * - ``transactionTimeout``
          - Number
          - When ``flag`` is ``oracledb.TPC_BEGIN_RESUME`` or ``oracledb.TPC_BEGIN_JOIN``, the ``transactionTimeout`` value is the number of seconds to wait for a transaction to become available.

            When ``flag`` is ``oracledb.TPC_BEGIN_NEW``, the ``transactionTimeout`` value is the number of seconds the transaction can be inactive before it is automatically terminated by the system. A transaction is inactive between the time it is detached with ``tpcEnd()`` and the time it is resumed with ``tpcBegin()``.

            The default value is *60 seconds*.

    **Callback**:

    If you are using the callback programming style::

        tpcBegin(Object xid, [Number flag, [Number transactionTimeout, ]] function(Error error){});

    See :ref:`tpcbegin` for information on the ``xid``, ``flag``, and
    ``transactionTimeout`` parameters.

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
          - If ``tpcBegin()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcCommit()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcCommit([Object xid,] [Boolean onePhase]);

    Commits the transaction previously prepared with
    :meth:`connection.tpcPrepare()`.

    If ``xid`` is not passed then the ``onePhase`` parameter value is
    ignored and ``tpcCommit()`` has the same behavior as a regular
    ``connection.commit()`` call.

    Note: When using an external transaction manager with two-phase commits,
    :attr:`autocommitting <oracledb.autoCommit>` should be disabled.

    The parameters of the ``connection.tpcCommit()`` method are:

    .. _tpccommit:

    .. list-table-with-summary:: connection.tpcCommit() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier previously passed to :meth:`~connection.tpcBegin()` when starting the transaction branch.
        * - ``onePhase``
          - Boolean
          - If ``onePhase`` is *true*, a single-phase commit is performed. The default is *false*.

    **Callback**:

    If you are using the callback programming style::

        tpcCommit([Object xid,] [Boolean onePhase,] function(Error error){});

    See :ref:`tpccommit` for information on the ``xid`` and ``onePhase`` parameters.

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
          - If ``tpcCommit()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcEnd()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcEnd([Object xid] [, Number flag]);

    Detaches a two-phase commit transaction from the connection when an
    application needs to end or suspend work on a transaction branch. The
    transaction becomes inactive at the end of this call but the branch
    still exists.

    If ``xid`` is not passed, the transaction identifier used by the
    previous ``connection.tpcBegin()`` call is used.

    The parameters of the ``connection.tpcEnd()`` method are:

    .. _tpcend:

    .. list-table-with-summary:: connection.changePassword() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier previously passed to :meth:`~connection.tpcBegin()` when starting the transaction branch.
        * - ``flag``
          - Number
          - One of the constants :ref:`oracledb.TPC_END_NORMAL <oracledbconstantstpc>` or :ref:`oracledb.TPC_END_SUSPEND <oracledbconstantstpc>`.

            The default is ``oracledb.TPC_END_NORMAL``.

            If the flag is ``oracledb.TPC_END_SUSPEND`` then the transaction may be resumed later by calling :meth:`~connection.tpcBegin()` with the flag ``oracledb.TPC_BEGIN_RESUME``.

    **Callback**:

    If you are using the callback programming style::

        tpcEnd([Object xid,] [Number flag,] function(Error error){});

    See :ref:`tpcend` for information on the ``xid`` and ``flag`` parameters.

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
          - If ``tpcEnd()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcForget()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcForget(Object xid);

    Causes the database to forget a heuristically completed two-phase commit
    transaction.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    The parameters of the ``connection.tpcForget()`` method are:

    .. _tpcforget:

    .. list-table-with-summary:: connection.tpcForget() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier previously passed to :meth:`~connection.tpcBegin()` when starting the transaction branch.

    **Callback**:

    If you are using the callback programming style::

        tpcForget(Object xid, function(Error error){});

    See :ref:`tpcforget` for information on the ``xid`` parameter.

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
          - If ``tpcForget()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcPrepare()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcPrepare([Object xid]);

    Prepares a two-phase commit transaction for commit.

    Returns a boolean indicating the transaction requires a commit.

    After calling this function, no further activity should take place on
    this connection until either
    :meth:`connection.tpcCommit()` or
    :meth:`connection.tpcRollback()` have been called.

    If ``xid`` is not passed, the transaction identifier used by the
    previous ``connection.tpcBegin()`` call is used.

    **Example**

    .. code-block:: javascript

        const commitNeeded = await connection.tpcPrepare(xid);

    The parameters of the ``connection.tpcPrepare()`` method are:

    .. _tpcprepare:

    .. list-table-with-summary:: connection.tpcPrepare() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier previously passed to :meth:`~connection.tpcBegin()` when starting the transaction branch.

    **Callback**:

    If you are using the callback programming style::

        tpcPrepare([Object xid,] function(Error error, Boolean commitNeeded){});

    See :ref:`tpcprepare` for information on the ``xid`` parameter.

    The parameters of the callback function
    ``function(Error error, Boolean commitNeeded)`` are:

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
          - If ``tpcPrepare()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Boolean ``commitNeeded``
          - If *true*, the branch was prepared and needs to be committed. Read-only branches will set this to *false* as there is no commit needed for the branch.

.. method:: connection.tpcRecover()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcRecover([Boolean asString]);

    Returns an array of pending two-phase commit transaction identifiers
    (XIDs) suitable for use with :meth:`connection.tpcCommit()`
    or :meth:`connection.tpcRollback()`.

    This function is a convenience wrapper that queries the view
    ``DBA_PENDING_TRANSACTIONS``. It requires SELECT privilege on that view.

    The parameters of the ``connection.tpcRecover`` method are:

    .. _tpcrecover:

    .. list-table-with-summary:: connection.tpcRecover() Parameters
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
        * - ``asString``
          - Boolean
          - If ``asString`` is *true*, then the ``globalTransactionId`` and ``branchQualifier`` attributes will be converted to Strings. Otherwise the values are returned as Buffers.

            The default value for ``asString`` is *true*.

    **Callback**:

    If you are using the callback programming style::

        tpcRecover([Boolean asString,] function(Error error));

    See :ref:`tpcrecover` for information on the ``asString`` parameter.

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
          - If ``tpcRecover()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.tpcRollback()

    .. versionadded:: 5.3

    **Promise**::

        promise = tpcRollback([Object xid]);

    Rolls back the specified transaction.

    If ``xid`` is not passed, the transaction associated with the connection
    is rolled back making it equivalent to ``connection.rollback()``.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    The parameters of the ``connection.tpcRollback`` method are:

    .. _tpcrollback:

    .. list-table-with-summary:: connection.tpcRollback() Parameters
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
        * - ``xid``
          - Object
          - The transaction identifier previously passed to :meth:`~connection.tpcBegin()` when starting the transaction branch.

    **Callback**:

    If you are using the callback programming style::

        tpcRollback([Object xid,] function(Error error);

    See :ref:`tpcrollback` for information on the ``xid`` parameter.

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
          - If ``tpcRollback()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: connection.unsubscribe()

    .. versionadded:: 2.3

    **Promise**::

        promise = unsubscribe(String name);

    Unregisters a :ref:`Continuous Query Notification (CQN) <cqn>` and
    :ref:`Advanced Queuing Notification <aqnotifications>` subscription
    previously created with :meth:`connection.subscribe()`.
    No further notifications will be sent. The notification callback does
    not receive a notification of the deregistration event.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    A subscription can be unregistered using a different connection to the
    initial subscription, as long as the credentials are the same.

    If the subscription :ref:`timeout <consubscribeoptions>` was reached
    and the subscription was automatically unregistered, you will get an
    error if you call ``connection.unsubscribe()``.

    The parameters of the ``connection.unsubscribe`` method are:

    .. _unsubscribe:

    .. list-table-with-summary:: connection.unsubscribe() Parameters
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
        * - ``name``
          - String
          - The name of the subscription used in :meth:`connection.subscribe()`.

    **Callback**:

    If you are using the callback programming style::

        unsubscribe(String name, function(Error error){});

    See :ref:`unsubscribe` for information on the ``name`` parameter.

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
          - If ``unsubscribe()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
