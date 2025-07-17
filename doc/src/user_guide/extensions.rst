.. _extendingnodeoracledb:

***********************
Extending node-oracledb
***********************

.. versionadded:: 6.8

You can extend the functionalities of node-oracledb by using plugins. The
plugins provided by node-oracledb are listed in this section.

.. _cloudnativeauthplugins:

Cloud Native Authentication Plugins
===================================

.. versionadded:: 6.8

Node-oracledb provides pre-supplied plugins for cloud native authentication
which are listed in this section. These plugins enable token generation using
the Software Development Kit (SDK) of the respective token-authentication
method.

The cloud native authentication token plugin implementation is available in
the `plugins/token <https://github.com/oracle/node-oracledb/tree/main/plugins/
token>`__ directory of the node-oracledb package.

To load these node-oracledb plugins in your application, use
``require('oracledb/plugins/token/<name of plugin>')``, for example:

.. code-block:: javascript

    require('oracledb/plugins/token/extensionOci');

.. _extensionociplugin:

Oracle Cloud Infrastructure (OCI) Cloud Native Authentication Plugin
--------------------------------------------------------------------

Node-oracledb's ``extensionOci`` plugin enables token generation using `OCI
Software Development Kit (SDK) <https://www.npmjs.com/package/oci-sdk>`__ when
authenticating with IAM token-based authentication.

The ``extensionOci`` plugin is available as part of the `plugins/token
<https://github.com/oracle/node-oracledb/tree/main/plugins/token/
extensionOci/index.js>`__ directory in the node-oracledb package. This plugin
requires the `minimum Node.js version <https://docs.oracle.com/en-us/iaas/
Content/API/SDKDocs/typescriptsdk.htm#Versions_Supported>`__ supported by OCI
SDK.

Adding this plugin to your code defines and registers a built-in hook function
that generates IAM tokens. This function is internally invoked when the
``tokenAuthConfigOci`` property is specified in the
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.

See :ref:`cloudnativeauthoci` for more information.

.. _extensionazureplugin:

Azure Cloud Native Authentication Plugin
----------------------------------------

Node-oracledb's ``extensionAzure`` plugin enables token generation using `Azure
Software Development Kit (SDK) <https://www.npmjs.com/~azure-sdk>`__ when
authenticating with OAuth 2.0 token-based authentication.

The ``extensionAzure`` plugin implementation is available as part of the
`plugins/token <https://github.com/oracle/node-oracledb/tree/main/plugins/
token/extensionAzure/index.js>`__ directory in the node-oracledb package.
This plugin requires the minimum Node.js version supported by Azure SDK.

Adding this plugin to your code defines and registers a built-in hook function
that generates OAuth 2.0 tokens. This function is internally invoked when the
``tokenAuthConfigAzure`` property is specified in the
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.

See :ref:`cloudnativeauthoauth` for more information.

.. _configproviderplugins:

Centralized Configuration Provider Plugins
==========================================

.. versionadded:: 6.9

Node-oracledb provides pre-supplied plugins for centralized configuration
providers which are listed in this section. These plugins provide access to
database connection credentials and application configuration information
stored in a centralized configuration provider.

The centralized configuration provider plugin implementation is available in
the `plugins/configProviders <https://github.com/oracle/node-oracledb/tree/
main/plugins/configProviders>`__ directory of the node-oracledb package.

To load these node-oracledb plugins in your application, use
``require('oracledb/plugins/configProviders/<name of plugin>')``, for example:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ociobject');

.. _ociobjectplugin:

OCI Object Storage Centralized Configuration Provider Plugin
------------------------------------------------------------

.. versionadded:: 6.9

``ociobject`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Oracle Cloud Infrastructure (OCI) Object Storage <ociobjstorage>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-ociobject``, see :ref:`OCI Object Storage connection strings
<connstringoci>`.

To load the ``ociobject`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ociobject');

See :ref:`ociobjstorage` for more information.

.. _ocivaultplugin:

OCI Vault Centralized Configuration Provider Plugin
---------------------------------------------------

.. versionadded:: 6.9

``ocivault`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Oracle Cloud Infrastructure (OCI) Vault <ocivault>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-ocivault``, see :ref:`OCI Vault connection strings
<connstringocivault>`.

To load the ``ocivault`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/ocivault');

See :ref:`ocivault` for more information.

.. _azureplugin:

Microsoft Azure App Centralized Configuration Provider Plugin
-------------------------------------------------------------

.. versionadded:: 6.9

``azure`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Azure App Configuration <azureappconfig>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-azure``, see :ref:`Azure App Configuration connection strings
<connstringazure>`.

To load the ``azure`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/azure');

See :ref:`azureappconfig` for more information.

.. _azurevaultplugin:

Microsoft Azure Key Vault Centralized Configuration Provider Plugin
-------------------------------------------------------------------

.. versionadded:: 6.9

``azurevault`` is a plugin that can be loaded in your application to provide
access to configuration information stored in
:ref:`Azure Key Vault <azurekeyvault>`.

This plugin is implemented as a :ref:`centralized configuration provider hook
function <configproviderhookfn>` to handle connection strings which have the
prefix ``config-azurevault``, see :ref:`Azure Key Vault connection strings
<connstringazurevault>`.

To load the ``azurevault`` plugin in your application, use:

.. code-block:: javascript

    require('oracledb/plugins/configProviders/azurevault');

See :ref:`azurekeyvault` for more information.
