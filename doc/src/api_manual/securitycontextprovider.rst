.. _securitycontextproviderclass:

************************************
API: SecurityContextProvider Object
************************************

The SecurityContextProvider object provides helper methods for associating
request-specific metadata with asynchronous application work. It is used with
the :ref:`endUserSecurityProvider <endusersecurityproviderplugin>` plugin to
scope end-user security metadata to database operations.

.. versionadded:: 26.0.0

A SecurityContextProvider object is obtained by calling
:meth:`oracledb.getSecurityContextProvider()`:

.. code-block:: javascript

    const securityContextProvider = oracledb.getSecurityContextProvider();

See :ref:`deepdatasecurity`.

.. _securitycontextprovidermethods:

SecurityContextProvider Methods
===============================

.. method:: securityContextProvider.runWithContext()

    .. versionadded:: 26.0.0

    **Promise**::

        result = securityContextProvider.runWithContext(Object context,
                                                        Function fn,
                                                        ...args)

    Runs ``fn`` in an asynchronous scope associated with ``context``. The
    ``context`` object contains request-specific metadata used by the
    ``endUserSecurityProvider`` plugin to create an end-user security context
    for database operations executed in the callback.

    The return value is the return value of ``fn``. If ``fn`` returns a
    Promise, then ``runWithContext()`` returns that Promise.

    The parameters of ``runWithContext()`` are:

    .. parameters-table:: securityContextProvider.runWithContext() Parameters
        :name: _runwithcontext_params

        * - ``context``
          - Object
          - A non-null object containing request-specific metadata. With the
            ``endUserSecurityProvider`` plugin, this metadata can include
            properties such as ``endUserToken``, ``endUserName``,
            ``dataRoles``, ``attributes``, and ``key``.
        * - ``fn``
          - Function
          - The callback function to run in the asynchronous scope associated
            with ``context``.
        * - ``args``
          - Any
          - Optional arguments passed to ``fn``.

    Values supplied in ``context`` override any default metadata specified in
    the ``endUserSecParams`` property used when creating the connection or
    pool. The configured ``authFlow`` determines whether the provider uses
    On-Behalf-Of (OBO) or application-token authentication.

    For Microsoft Azure OBO, the
    :ref:`endUserSecurityProvider <endusersecurityproviderplugin>` plugin
    requires ``endUserToken`` as the assertion to obtain a database-access
    token. If you are using Oracle AI Database 26ai version 23.26.4 or later,
    the plugin creates the security context with only the database-access
    token. With Oracle Database versions earlier than 23.26.4, the plugin
    creates the security context with both the database-access token and the
    end-user token.

    For Azure and OCI application-token flows, a specified ``endUserToken`` is
    included in the security context regardless of the Oracle Database
    versions. Specifying ``endUserName`` creates a local database-user
    security context. If neither ``endUserToken`` nor ``endUserName`` is
    specified, the plugin creates a security context containing only the
    database-access token, which requires Oracle AI Database 26ai version
    23.26.4 or later.

    A Client Credentials token identifies the application. To include an
    end-user identity with an application token, supply ``endUserToken`` or
    ``endUserName`` according to the selected context form.

    Request metadata cannot override the configured authentication flow.

    The context does not accept an HTTP ``Authorization`` header. Applications
    and framework adapters should validate and extract the bearer token from
    that header before calling ``runWithContext()``, and pass the extracted
    value as ``endUserToken``.

    Only database operations that require the end-user security context should
    be run inside the ``runWithContext()`` callback. Unrelated asynchronous work
    should be performed outside the callback.

    For example:

    .. code-block:: javascript

        const securityContextProvider = oracledb.getSecurityContextProvider();

        const result = await securityContextProvider.runWithContext({
          endUserToken: accessToken,
          dataRoles: ["employee_reader"],
          attributes: { department: "finance" }
        }, () => connection.execute("select * from hr.employees"));

.. method:: securityContextProvider.getCurrentContext()

    .. versionadded:: 26.0.0

    ::

        context = securityContextProvider.getCurrentContext()

    Returns the metadata object associated with the current asynchronous scope,
    or *null* if no context is active.

    This method is primarily useful for framework integration code that needs to
    inspect or propagate the current request metadata.

    For example:

    .. code-block:: javascript

        const context = securityContextProvider.getCurrentContext();
        if (context) {
          console.log(context.endUserName);
        }
