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

        An OBO token is obtained from an IAM using the end user token as an assertion. This access token can only be used when ``endUserToken`` is specified.

        A Client Credentials token is obtained from an IAM using the application's token. This access token can be used when either the ``endUserToken``, or ``endUserName`` and ``key`` are specified.
    * - ``endUserToken``
      - String
      - The unique identification of an end user managed by an external IAM system. This contains the end user token issued by IAM systems after user authentication.

        This attribute should not be set when ``endUserName`` is specified.
    * - ``endUserName``
      - String
      - The unique identification of an end user managed by Oracle Database. This contains the name of a local database user created in Oracle Database that has the ``CREATE END USER SECURITY CONTEXT`` database privilege set.

        This attribute should not be set when ``endUserToken`` is specified.
    * - ``key``
      - String
      - The lookup identifier that the database maps to stored context attributes.
    * - ``dataRoles``
      - Array
      - The names of data roles granted to the application or local database user. These data roles are created with a ``CREATE DATA ROLE`` statement in the database.

        For external IAM systems, these data roles are mapped to roles managed in your IAM system.

        If ``endUserName`` and ``key`` are specified, then only data roles enabled by default with the application identity are used. Any data roles explicitly provided by the application are not accepted and will raise an error.
    * - ``attributes``
      - Object
      - The attribute-value pairs provided by the application that can be referenced at runtime by authorization policies (for example, in data grant predicates) and application logic.

        These attributes are contained in JSON objects conforming to a JSON schema of an END USER CONTEXT declared in the database.
