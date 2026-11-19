.. _endusersecuritycontextclass:

*********************************
API: EndUserSecurityContext Class
*********************************

The EndUserSecurityContext class represents Deep Data Security context
information that node-oracledb can set on a connection. It allows applications
to create an end-user security context containing either only the
database-access token (single-token), or both the database-access token and an
end-user identity (two-token).

With Oracle AI Database 26ai version 23.26.4 or later, you can set an end-user
security context containing only the database-access token on a connection.
For Oracle AI Database versions earlier than 23.26.4, a security context
containing both the database-access token and an end-user identity can be set
on a connection.

The end-user identity in the security context can be an end-user token from an
external Identity and Access Management (IAM) system or the name of a local
database user. The security context information can also include data roles
and application-provided attributes used by Oracle Database to authorize
access to protected data.

.. versionadded:: 7.0

.. note::

    In this release, Deep Data Security is only supported in node-oracledb
    Thin mode.

See :ref:`deepdatasecurity`.

The EndUserSecurityContext object is created by using:

.. code-block:: javascript

    const security_context = new oracledb.EndUserSecurityContext(options);

The parameters of the ``EndUserSecurityContext`` object are:

.. _endusersecuritycontextattrs:

.. parameters-table::  EndUserSecurityContext Parameters
    :name: _endusersecuritycontext_params

    * - ``options``
      - Object
      - The ``options`` parameter contains the properties necessary to define an end-user security context for a connection. See :ref:`EndUserSecurityContext options Parameters Attributes <endusersecuritycontextopts>` for information.

The properties of the ``options`` parameter are:

.. _endusersecuritycontextopts:

.. list-table-with-summary::  EndUserSecurityContext ``options`` Parameter Properties
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :name: _end_user_security_context_parameters
    :summary: The first column displays the property. The second column displays the data type of the property. The third column displays the description of the property.

    * - Property
      - Data Type
      - Description
    * - ``databaseAccessToken``
      - String
      - A required, non-empty token issued by an external Identity and Access Management (IAM) system such as Oracle Cloud Infrastructure (OCI) IAM or Microsoft Entra ID, with an audience accepted by Oracle Database.

        Applications are responsible for acquiring the database-access token. It may be obtained through an OAuth Authorization Code, On-Behalf-Of (OBO), or Client Credentials flow, provided that the token has an audience accepted by Oracle Database.

        This database-access token can be specified alone or with an end-user identity. Oracle AI Database 26ai version 23.26.4 or later is required when setting a security context containing only this token on a connection. Setting only a database-access token on an earlier database version raises the ``NJS-203`` error.
    * - ``endUserToken``
      - String
      - An optional token that identifies an end-user managed by an external IAM system. When this property is specified with ``databaseAccessToken``, it creates a two-token security context containing both the database-access token and the end-user token, which node-oracledb sends to Oracle Database.

        This property should not be set when ``endUserName`` or ``key`` is specified.
    * - ``endUserName``
      - String
      - The name of a local database user created in Oracle Database that has the ``CREATE END USER SECURITY CONTEXT`` database privilege set.

        This property should not be set when ``endUserToken`` is specified.
    * - ``key``
      - String
      - An optional lookup identifier that the database maps to stored context attributes. This property may be specified with ``endUserName`` and should not be set when ``endUserToken`` is specified.
    * - ``dataRoles``
      - Array
      - The names of data roles granted to the application. These data roles are created with a ``CREATE DATA ROLE`` statement in the database and granted to an application identity created with ``CREATE APPLICATION IDENTITY`` statement in the database.

        For external IAM systems, these data roles are mapped to roles managed in your IAM system.

        For local database users, these data roles can be used to distinguish sessions for the same local user.
    * - ``attributes``
      - Object
      - Attribute name-value pairs provided by the application for an END USER CONTEXT declared in the database.

        The name-value pairs for each context must conform to the JSON schema of that END USER CONTEXT. These pairs are associated with fully qualified END USER CONTEXT names, using the format ``{schema}.{name}``, where ``schema`` is the database schema in which the context is declared and ``name`` is the name of the END USER CONTEXT. The database does not recognize unqualified END USER CONTEXT names. The attribute values can be referenced at runtime by authorization policies, for example in data grant predicates, and application logic.
