.. _frameworks:

************************************************
Appendix B: Node.js Frameworks and node-oracledb
************************************************

The features of node-oracledb Thin and Thick modes cover the needs of common
Node.js frameworks and libraries.

Sequelize
=========

Node-oracledb Thin and Thick modes can be used in `Sequelize
<https://sequelize.org/>`__.

To run node-oracledb Thin mode through Sequelize, do *not* set the ``libPath``
in the dialectOptions object and do *not* call
:meth:`~oracledb.initOracleClient`.

For node-oracledb Thick mode, set the ``libPath`` in the dialectOptions object
or call :meth:`~oracledb.initOracleClient()`.

OpenTelemetry
=============

You can use the `OpenTelemetry <https://opentelemetry.io/>`__ observability
framework with node-oracledb to generate telemetry data for Oracle Database
connections. This helps you to analyze and monitor connection metrics and
optimize them, if necessary. See :ref:`opentelemetry` for more information.

n8n
===

`n8n <https://n8n.io/>`__ is a workflow automation tool that combines AI
capabilities with business process automation. This tool uses a visual
interface that enables you to build workflows that connect applications,
databases, and APIs. The n8n project is open-source and available
on `GitHub <https://github.com/n8n-io/n8n>`__ and from `npmjs.com <https://
www.npmjs.com/package/n8n>`__.

In n8n, the fundamental building blocks of a workflow are `nodes
<https://docs.n8n.io/workflows/components/nodes/>`__. They perform a range of
operations such as triggering a workflow, fetching and sending data, and
processing and manipulating data. By connecting nodes together, you can define
the sequence of operations in a workflow and how data flows through a
workflow. A workflow is created on the workflow canvas which is the visual
editor that is used to add and connect nodes to build workflows.

The Oracle Database node is a built-in integration node in n8n that enables
you to connect and interact with Oracle Database directly within your
workflow. This node is built on top of the node-oracledb driver. This node
supports `operations <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-
nodes-base.oracledb/#operations>`__ such as inserting rows into a table,
selecting rows from a table, updating rows in a table, deleting a table or
rows, inserting or updating rows on conflict, and executing a SQL or PL/SQL
statement. See `Oracle Database node <https://docs.n8n.io/integrations/builtin
/app-nodes/n8n-nodes-base.oracledb/#oracle-database-node>`__ for more
information.

To take advantage of the Oracle Database node, you must use:

- n8n version 1.117.0 (or later). Note that n8n requires a `Node.js
  <https://nodejs.org/>`__ version between 20.19 and 24.x.

- Oracle Database 19c (or later)

- Oracle Client 19c (or later) is additionally required if you are using
  node-oracledb Thick mode or advanced Oracle Database features such as
  Transparent Application Continuity (TAC) and Sharding.

**Installing the n8n Module**

To install n8n globally through npm, use:

.. code-block:: shell

    npm install n8n -g

If you prefer using Docker, see `Docker Installation <https://docs.n8n.io/
hosting/installation/docker/>`__.

To check whether the n8n version installed is 1.117.0 or later, use:

.. code-block:: shell

    n8n --version

**Starting the n8n Server**

To start the n8n server, use:

.. code-block:: shell

    export N8N_RUNNERS_ENABLED=true
    n8n start

Once the n8n server starts, open the default page http://localhost:5678 in
your browser and set the credentials to log in to the n8n server. After
logging in successfully, the n8n workflow canvas is displayed.

**Example of Using the Oracle Database node in n8n**

To use the Oracle Database node in n8n, perform the following steps:

1. Click **Add first step...** on the workflow canvas. This opens the nodes
   panel on the right side of the canvas where you can search for the required
   node.

2. Type *Oracle Database* in the search bar of the nodes panel to search for
   the Oracle Database node.

3. Click **Oracle Database** to select the Oracle Database node. This displays
   the actions available in the configuration panel. These actions correspond
   to the operations supported by the Oracle Database node. See `operations
   <https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.oracledb
   /#operations>`__ for more information.

4. Click the **Execute SQL** action in the configuration panel. This displays
   the Parameters panel.

5. In the ``Credential to Connect with`` field, click on the pencil icon next
   to the dropdown to set the Oracle Database credentials and connection
   string. This displays the Oracle Credentials Account form. In the form:

   a. Add the username to connect to Oracle Database in the ``user`` field.

   b. Add the password associated with the username in the ``password`` field.

   c. Add the Oracle Database Oracle Database connection string in the
      ``connection string`` field.

   If the connection to the database is successful, a message ``Connection
   tested successfully`` is displayed at the top.

   Note that the details set in the Oracle Credentials Account will be
   retained across all other Oracle Database nodes that you create.

6. In the ``Statement`` field, add the following SQL statement::

      CREATE TABLE sampleTable(ID NUMBER, NAME VARCHAR2(100))

   Note that n8n automatically saves configuration changes as you enter the
   values into the fields in the Parameters panel.

   This displays the "Execute SQL" Oracle Database node on the workflow
   canvas.

7. Select the "Execute SQL" node on the workflow canvas and click the play
   icon that appears to run run this node. This opens the Output panel at
   the bottom of the workflow canvas which displays *success: true*. This
   shows that the database table was successfully created.

8. Click the **Insert rows in a table** action in the configuration panel.
   This displays the Parameters panel.

9. In the ``Values to Send`` field, enter *John* and *1* under NAME and ID
   respectively.

   This displays the "Insert rows in a table" Oracle Database node on the
   workflow canvas.

10. Select the "Insert rows in a table" node on the workflow canvas and click
    the play icon to run this node. This opens the Output panel at the bottom
    of the workflow canvas which displays *1* and *John* as the ID and NAME
    respectively. This shows that the database table was successfully inserted
    with the values.

For more information, see the blog `Oracle Database and n8n: Add Oracle
Database to your AI-powered workflows <https://medium.com/oracledevs/oracle-
database-and-n8n-add-oracle-database-to-your-ai-powered-workflows-
ed042d7ba8b7>`__.
