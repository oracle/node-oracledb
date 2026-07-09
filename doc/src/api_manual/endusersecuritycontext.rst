.. _endusersecuritycontextclass:

*********************************
API: EndUserSecurityContext Class
*********************************

The EndUserSecurityContext class is used to define the end user security
context information for an end user.

.. versionadded:: 7.0

.. note::

    In this release, Deep Data Security is only supported in node-oracledb
    Thin mode.

See :ref:`deepdatasecurity`.

The EndUserSecurityContext object is created by using:

.. code-block:: javascript

    const security_context = new oracledb.EndUserSecurityContext(options);

The parameters of the ``EndUserSecurityContext`` method are:

.. _endusersecuritycontextattrs:

.. list-table-with-summary::  EndUserSecurityContext Parameters
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the parameter. The second column displays the data type of the parameter. The third column displays the description of the attribute.

    * - Parameter
      - Data Type
      - Description
    * - ``options``
      - Object
      - The ``options`` parameter contains the attributes necessary to define an end user security context for a connection. See :ref:`EndUserSecurityContext options Parameters Attributes <endusersecuritycontextopts>` for information.

The properties of the ``options`` parameter are:

.. _endusersecuritycontextopts:

.. list-table-with-summary::  EndUserSecurityContext ``options`` Parameter Attributes
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :name: _end_user_security_context_parameters
    :summary: The first column displays the attribute. The second column displays the description of the attribute. The third column displays whether the attribute is required or optional.

    * - Attribute
      - Data Type
      - Description
    * - ``databaseAccessToken``
      - String
      - A security token issued by an external Identity and Access Management (IAM) system such as Oracle Cloud Infrastructure (OCI) IAM or Microsoft Entra ID that authorizes an application to access Oracle Database. This can either be an On-Behalf-Of (OBO) token or a Client Credentials token.

        An OBO token is obtained from an IAM using the end-user token as an assertion. This access token can only be used when ``endUserToken`` is specified.

        A Client Credentials token is obtained from an IAM using the application's token. This access token can be used when either ``endUserToken`` or ``endUserName`` is specified.
    * - ``endUserToken``
      - String
      - The unique identification of an end-user managed by an external IAM system. This contains the end-user token issued by IAM systems after user authentication.

        This attribute should not be set when ``endUserName`` or ``key`` is specified.
    * - ``endUserName``
      - String
      - The unique identification of an end-user managed by Oracle Database. This contains the name of a local database user created in Oracle Database that has the ``CREATE END USER SECURITY CONTEXT`` database privilege set.

        This attribute should not be set when ``endUserToken`` is specified.
    * - ``key``
      - String
      - An optional lookup identifier that the database maps to stored context attributes. This attribute may be specified with ``endUserName`` and should not be set when ``endUserToken`` is specified.
    * - ``dataRoles``
      - Array
      - The names of data roles granted to the application. These data roles are created with a ``CREATE DATA ROLE`` statement in the database and granted to application identity created with ``CREATE APPLICATION IDENTITY`` statement in the database.

        For external IAM systems, these data roles are mapped to roles managed in your IAM system.

        For local database users, these data roles can be used to distinguish sessions for the same local user.
    * - ``attributes``
      - Object
      - Attribute name-value pairs provided by the application for an END USER CONTEXT declared in the database.

        The name-value pairs for each context must conform to the JSON schema of that END USER CONTEXT. These pairs are associated with fully qualified END USER CONTEXT names, using the format ``{schema}.{name}``, where ``schema`` is the database schema in which the context is declared and ``name`` is the name of the END USER CONTEXT. The database does not recognize unqualified END USER CONTEXT names. The attribute values can be referenced at runtime by authorization policies, for example in data grant predicates, and application logic.
