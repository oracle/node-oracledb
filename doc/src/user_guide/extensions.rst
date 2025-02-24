.. _extendingnodeoracledb:

***********************
Extending node-oracledb
***********************

.. versionadded:: 6.8

You can extend the functionalities of node-oracledb by using plugins. The
plugins provided by node-oracledb are listed in this section.

.. _extensionociplugin:

Oracle Cloud Infrastructure (OCI) Cloud Native Authentication Plugin
====================================================================

Node-oracledb's ``extensionOci`` plugin enables token generation using `OCI
Software Development Kit (SDK) <https://www.npmjs.com/package/oci-sdk>`__ when
authenticating with IAM token-based authentication.

The ``extensionOci`` plugin is available as part of the `plugins/tokens
<https://github.com/oracle/node-oracledb/tree/main/plugins/tokens/
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
========================================

Node-oracledb's ``extensionAzure`` plugin enables token generation using `Azure
Software Development Kit (SDK) <https://www.npmjs.com/~azure-sdk>`__ when
authenticating with OAuth 2.0 token-based authentication.

The ``extensionAzure`` plugin implementation is available as part of the
`plugins/tokens <https://github.com/oracle/node-oracledb/tree/main/plugins/
tokens/extensionAzure/index.js>`__ directory in the node-oracledb package.
This plugin requires the minimum Node.js version supported by Azure SDK.

Adding this plugin to your code defines and registers a built-in hook function
that generates OAuth 2.0 tokens. This function is internally invoked when the
``tokenAuthConfigAzure`` property is specified in the
:meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()`.

See :ref:`cloudnativeauthoauth` for more information.
