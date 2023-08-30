
.. _oracledbclass:

*******************
API: Oracledb Class
*******************

The *Oracledb* object is the factory class for *Pool* and *Connection*
objects.

The *Oracledb* object is instantiated by loading node-oracledb:

.. code-block:: javascript

    const oracledb = require("oracledb");

Internally, the add-on creates the *Oracledb* object as a singleton.
Reloading it in the same Node.js process creates a new pointer to the
same object.

.. _oracledbconstants:

Oracledb Constants
==================

These constants are defined in the ``oracledb`` module. Usage is
described later in this document.

The numeric values for the constants are shown to aid debugging. They
may change in future, so use the constant names in applications.

.. _oracledbconstantsoutformat:

Query ``outFormat`` Constants
-----------------------------

Constants for the query result :attr:`~oracledb.outFormat` option:

.. list-table-with-summary::  Query outFormat Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the query outformat
     constant. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.OUT_FORMAT_ARRAY``
      - 4001
      - Fetch each row as array of column values.

        .. versionadded:: 4.0
    * - ``oracledb.OUT_FORMAT_OBJECT``
      - 4002
      - Fetch each row as an object.

        .. versionadded:: 4.0

The previous constants ``oracledb.ARRAY`` and ``oracledb.OBJECT`` are
deprecated but still usable.

.. _oracledbconstantsdbtype:

Oracle Database Type Objects
----------------------------

These database type objects indicate the Oracle Database type in
:ref:`metaData <execmetadata>`, :ref:`DbObject <dbobjectclass>`
types, and in the :attr:`lob <lob.type>` ``type`` property. Some
database type objects can also be used for:

- the :ref:`execute() bindParams\ type <executebindparamtype>` and the
  :ref:`executeMany() bindDefs <executemanyoptbinddefs>` ``type``
  properties
- the :meth:`~connection.createLob()` ``type`` parameter
- :attr:`~oracledb.fetchAsBuffer`, :attr:`~oracledb.fetchAsString`,
  :ref:`fetchInfo <propexecfetchinfo>`, and :attr:`~oracledb.fetchTypeHandler`

Note that the Oracle Database Type constants were changed to database type
objects in node-oracledb 6.0. When comparing fetch types, ensure that you
are using the database type object name instead of the database type number.
For example, use ``result.metadata[0].fetchType == oracledb.DB_TYPE_VARCHAR``
instead of ``result.metadata[0].fetchType == 2001``.

.. list-table-with-summary::  Oracle Database Type Objects
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the Oracle Database type object. The second column displays the value of the database type object. The third column displays the database data type.

    * - DbType Object
      - Value
      - Database Data Type
    * - ``oracledb.DB_TYPE_BFILE``
      - 2020
      - BFILE
    * - ``oracledb.DB_TYPE_BINARY_DOUBLE``
      - 2008
      - BINARY_DOUBLE
    * - ``oracledb.DB_TYPE_BINARY_FLOAT``
      - 2007
      - BINARY_FLOAT
    * - ``oracledb.DB_TYPE_BINARY_INTEGER``
      - 2009
      - BINARY_INTEGER, PLS_INTEGER, SMALLINT, etc.
    * - ``oracledb.DB_TYPE_BLOB``
      - 2019
      - BLOB
    * - ``oracledb.DB_TYPE_BOOLEAN``
      - 2022
      - PL/SQL BOOLEAN
    * - ``oracledb.DB_TYPE_CHAR``
      - 2003
      - CHAR
    * - ``oracledb.DB_TYPE_CLOB``
      - 2017
      - CLOB
    * - ``oracledb.DB_TYPE_CURSOR``
      - 2021
      - SYS_REFCURSOR, Nested Cursors
    * - ``oracledb.DB_TYPE_DATE``
      - 2011
      - DATE
    * - ``oracledb.DB_TYPE_INTERVAL_DS``
      - 2015
      - INTERVAL DAY TO SECOND
    * - ``oracledb.DB_TYPE_INTERVAL_YM``
      - 2016
      - INTERVAL YEAR TO MONTH
    * - ``oracledb.DB_TYPE_JSON``
      - 2027
      - JSON

        .. versionadded:: 5.1
    * - ``oracledb.DB_TYPE_LONG``
      - 2024
      - LONG
    * - ``oracledb.DB_TYPE_LONG_NVARCHAR``
      - 2031
      - LONG
    * - ``oracledb.DB_TYPE_LONG_RAW``
      - 2025
      - LONG RAW
    * - ``oracledb.DB_TYPE_NCHAR``
      - 2004
      - NCHAR
    * - ``oracledb.DB_TYPE_NCLOB``
      - 2018
      - NCLOB
    * - ``oracledb.DB_TYPE_NUMBER``
      - 2010
      - NUMBER or FLOAT
    * - ``oracledb.DB_TYPE_NVARCHAR``
      - 2002
      - NVARCHAR
    * - ``oracledb.DB_TYPE_OBJECT``
      - 2023
      - OBJECT
    * - ``oracledb.DB_TYPE_RAW``
      - 2006
      - RAW
    * - ``oracledb.DB_TYPE_ROWID``
      - 2005
      - ROWID
    * - ``oracledb.DB_TYPE_TIMESTAMP``
      - 2012
      - TIMESTAMP
    * - ``oracledb.DB_TYPE_TIMESTAMP_LTZ``
      - 2014
      - TIMESTAMP WITH LOCAL TIME ZONE
    * - ``oracledb.DB_TYPE_TIMESTAMP_TZ``
      - 2013
      - TIMESTAMP WITH TIME ZONE
    * - ``oracledb.DB_TYPE_VARCHAR``
      - 2001
      - VARCHAR2

Note that the values for these constants changed in node-oracledb 4.0.

.. _oracledbconstantsnodbtype:

Node-oracledb Type Constants
----------------------------

From node-oracledb 4.0, these constant values changed and became aliases
for common :ref:`Oracle Database Type Constants <oracledbconstantsdbtype>`.

.. list-table-with-summary::  Node-oracledb Type Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 10 30
    :summary: The first column displays the name of the node-oracledb Type
     constant. The second column displays the value of the constant. The
     third column displays the DB_TYPE equivalent of the constant.
     The fourth column displays the relevant notes specific to the constant.

    * - Constant Name
      - Value
      - ``DbType`` Object Equivalent
      - Notes
    * - ``oracledb.BLOB``
      - 2019
      - ``oracledb.DB_TYPE_BLOB``
      -
    * - ``oracledb.BUFFER``
      - 2006
      - ``oracledb.DB_TYPE_RAW``
      -
    * - ``oracledb.CLOB``
      - 2017
      - ``oracledb.DB_TYPE_CLOB``
      -
    * - ``oracledb.CURSOR``
      - 2021
      - ``oracledb.DB_TYPE_CURSOR``
      -
    * - ``oracledb.DATE``
      - 2014
      - ``oracledb.DB_TYPE_TIMESTAMP_LTZ``
      -
    * - ``oracledb.DEFAULT``
      - 0
      - NA
      - Used with ``fetchInfo`` to reset the fetch type to the database type.
    * - ``oracledb.NUMBER``
      - 2010
      - ``oracledb.DB_TYPE_NUMBER``
      -
    * - ``oracledb.NCLOB``
      - 2018
      - ``oracledb.DB_TYPE_NCLOB``
      - .. versionadded:: 4.2
    * - ``oracledb.STRING``
      - 2001
      - ``oracledb.DB_TYPE_VARCHAR``
      -

.. _oracledbconstantsbinddir:

Execute Bind Direction Constants
--------------------------------

Constants for the ``dir`` property of ``execute()``
:ref:`bindParams <executebindParams>`,
:meth:`connection.queryStream()` and ``executeMany()``
:ref:`bindDefs <executemanyoptbinddefs>`.

These specify whether data values bound to SQL or PL/SQL bind parameters
are passed into, or out from, the database:

.. list-table-with-summary::  Execute Bind Direction Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the Execute Bind Direction
     constant. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.BIND_IN``
      - 3001
      - Direction for IN binds.
    * - ``oracledb.BIND_INOUT``
      - 3002
      - Direction for IN OUT binds.
    * - ``oracledb.BIND_OUT``
      - 3003
      - Direction for OUT binds.

.. _oracledbconstantsprivilege:

Privileged Connection Constants
-------------------------------

Constants for :meth:`~oracledb.getConnection()`
:ref:`privilege <getconnectiondbattrsprivilege>` properties.

These specify what privilege should be used by the connection that is
being established.

.. list-table-with-summary::  Privileged Connection Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the Privileged
     Connection constant. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SYSASM``
      - 32768
      - SYSASM privileges
    * - ``oracledb.SYSBACKUP``
      - 131072
      - SYSBACKUP privileges
    * - ``oracledb.SYSDBA``
      - 2
      - SYSDBA privileges
    * - ``oracledb.SYSDG``
      - 262144
      - SYSDG privileges
    * - ``oracledb.SYSKM``
      - 524288
      - SYSKM privileges
    * - ``oracledb.SYSOPER``
      - 4
      - SYSOPER privileges
    * - ``oracledb.SYSPRELIM``
      - 8
      - Preliminary privilege required when starting up a database with :meth:`connection.startup()`.

        .. versionadded:: 5.0
    * - ``oracledb.SYSRAC``
      - 1048576
      - SYSRAC privileges

.. _oracledbconstantsstmttype:

SQL Statement Type Constants
----------------------------

Constants for :meth:`connection.getStatementInfo()` properties.

.. list-table-with-summary::  SQL Statement Type Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the SQL Statement Type
     constant. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.STMT_TYPE_ALTER``
      - 7
      - ALTER
    * - ``oracledb.STMT_TYPE_BEGIN``
      - 8
      - BEGIN
    * - ``oracledb.STMT_TYPE_CALL``
      - 10
      - CALL
    * - ``oracledb.STMT_TYPE_COMMIT``
      - 21
      - COMMIT
    * - ``oracledb.STMT_TYPE_CREATE``
      - 5
      - CREATE
    * - ``oracledb.STMT_TYPE_DECLARE``
      - 9
      - DECLARE
    * - ``oracledb.STMT_TYPE_DELETE``
      - 3
      - DELETE
    * - ``oracledb.STMT_TYPE_DROP``
      - 6
      - DROP
    * - ``oracledb.STMT_TYPE_EXPLAIN_PLAN``
      - 15
      - EXPLAIN_PLAN
    * - ``oracledb.STMT_TYPE_INSERT``
      - 4
      - INSERT
    * - ``oracledb.STMT_TYPE_MERGE``
      - 16
      - MERGE
    * - ``oracledb.STMT_TYPE_ROLLBACK``
      - 17
      - ROLLBACK
    * - ``oracledb.STMT_TYPE_SELECT``
      - 1
      - SELECT
    * - ``oracledb.STMT_TYPE_UNKNOWN``
      - 0
      - UNKNOWN
    * - ``oracledb.STMT_TYPE_UPDATE``
      - 2
      - UPDATE

.. _oracledbconstantssubscription:

Subscription Constants
----------------------

Constants for the Continuous Query Notification (CQN)
:ref:`message.type <consubscribeoptcallback>`.

.. list-table-with-summary::  Subscription Constants for the CQN ``message.type`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     message.type property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SUBSCR_EVENT_TYPE_AQ``
      - 100
      - Advanced Queuing notifications are being used.
    * - ``oracledb.SUBSCR_EVENT_TYPE_DEREG``
      - 5
      -  A subscription has been closed or the timeout value has been reached.
    * - ``oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE``
      - 6
      - Object-level notifications are being used (Database Change Notification).
    * - ``oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE``
      - 7
      - Query-level notifications are being used (Continuous Query Notification).
    * - ``oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN``
      - 2
      - The database is being shut down.
    * - ``oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN_ANY``
      - 3
      - An instance of Oracle Real Application Clusters (RAC) is being shut down.
    * - ``oracledb.SUBSCR_EVENT_TYPE_STARTUP``
      - 1
      - The database is being started up.

Constant for the CQN :ref:`groupingClass <consubscribeoptgroupingclass>`.

.. list-table-with-summary::  Subscription Constant for the CQN ``groupingClass`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     groupingClass property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SUBSCR_GROUPING_CLASS_TIME``
      - 1
      - Group notifications by time into a single notification


Constants for the CQN :ref:`groupingType <consubscribeoptgroupingtype>`.

.. list-table-with-summary::  Subscription Constants for the CQN ``groupingType`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     groupingType property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SUBSCR_GROUPING_TYPE_LAST``
      - 2
      - The last notification in the group is sent.
    * - ``oracledb.SUBSCR_GROUPING_TYPE_SUMMARY``
      - 1
      - A summary of the grouped notifications is sent.

Constants for the CQN :ref:`qos <consubscribeoptqos>` Quality of Service.

.. list-table-with-summary::  Subscription Constants for the CQN ``qos`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the qos
     property. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SUBSCR_QOS_BEST_EFFORT``
      - 16
      - When best effort filtering for query result set changes is acceptable. False positive notifications may be received. This behavior may be suitable for caching applications.
    * - ``oracledb.SUBSCR_QOS_DEREG_NFY``
      - 2
      - The subscription will be automatically unregistered as soon as the first notification is received.
    * - ``oracledb.SUBSCR_QOS_QUERY``
      - 8
      - CQN will be used instead of Database Change Notification. This means that notifications are only sent if the result set of the registered query changes. By default no false positive notifications are generated. Use ``oracledb.SUBSCR_QOS_BEST_EFFORT`` if this is not needed.
    * - ``oracledb.SUBSCR_QOS_RELIABLE``
      - 1
      - Notifications are not lost in the event of database failure.
    * - ``oracledb.SUBSCR_QOS_ROWIDS``
      - 4
      - Notifications include the ROWIDs of the rows that were affected.

Constants for the CQN :ref:`namespace <consubscribeoptnamespace>`.

.. list-table-with-summary::  Subscription Constants for the CQN ``namespace`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     namespace property. The second column displays the value of the constant.
     The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SUBSCR_NAMESPACE_AQ``
      - 1
      - For Advanced Queuing notifications.
    * - ``oracledb.SUBSCR_NAMESPACE_DBCHANGE``
      - 2
      - For Continuous Query Notifications.

.. _oracledbconstantsaq:

Advanced Queuing Constants
--------------------------

Refer to `Advanced Queuing
documentation <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADQUE>`__
for more details about attributes.

Constants for :ref:`AqDeqOptions Class <aqdeqoptionsclass>` ``mode``.

.. list-table-with-summary::  Constants for the AqDeqOptions Class ``mode`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     mode property. The second column displays the value of the constant.
     The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_DEQ_MODE_BROWSE``
      - 1
      - Read a message without acquiring a lock.
    * - ``oracledb.AQ_DEQ_MODE_LOCKED``
      - 2
      - Read and obtain write lock on message.
    * - ``oracledb.AQ_DEQ_MODE_REMOVE``
      - 3
      - Read the message and delete it.
    * - ``oracledb.AQ_DEQ_MODE_REMOVE_NO_DATA``
      - 4
      - Delete message without returning payload.

Constants for :ref:`AqDeqOptions Class <aqdeqoptionsclass>`
``navigation``.

.. list-table-with-summary::  Constants for the AqDeqOptions Class ``navigation`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     navigation property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_DEQ_NAV_FIRST_MSG``
      - 1
      - Get the message at the head of queue.
    * - ``oracledb.AQ_DEQ_NAV_NEXT_TRANSACTION``
      - 2
      - Get the first message of next transaction group.
    * - ``oracledb.AQ_DEQ_NAV_NEXT_MSG``
      - 3
      - Get the next message in the queue.

Constants for :ref:`AqDeqOptions Class <aqdeqoptionsclass>` ``wait``.

.. list-table-with-summary::  Constants for the AqDeqOptions Class ``wait`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the wait
     property. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_DEQ_NO_WAIT``
      - 0
      - Do not wait if no message is available.
    * - ``oracledb.AQ_DEQ_WAIT_FOREVER``
      - 4294967295
      - Wait forever if no message is available.

Constants for :ref:`AqEnqOptions Class <aqenqoptionsclass>`
``deliveryMode``.

.. list-table-with-summary::  Constants for the AqDeqOptions Class ``deliveryMode`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     deliveryMode property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_MSG_DELIV_MODE_PERSISTENT``
      - 1
      - Messages are persistent.
    * - ``oracledb.AQ_MSG_DELIV_MODE_BUFFERED``
      - 2
      - Messages are buffered.
    * - ``oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED``
      - 3
      - Messages are either persistent or buffered.

Constants for :ref:`AqMessage Class <aqmessageclass>` ``state``.

.. list-table-with-summary::  Constants for the AqMessage Class ``state`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     state property. The second column displays the value of the constant.
     The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_MSG_STATE_READY``
      - 0
      - Consumers can dequeue messages that are in the READY state.
    * - ``oracledb.AQ_MSG_STATE_WAITING``
      - 1
      - Message is hidden for a given retry delay interval.
    * - ``oracledb.AQ_MSG_STATE_PROCESSED``
      - 2
      - All intended consumers have successfully dequeued the message.
    * - ``oracledb.AQ_MSG_STATE_EXPIRED``
      - 3
      - One or more consumers did not dequeue the message before the expiration time.

Constants for :ref:`AqEnqOptions Class <aqenqoptionsclass>` and
:ref:`AqDeqOptions Class <aqdeqoptionsclass>` ``visibility``.

.. list-table-with-summary::  Constants for the AqEnqOptions Class and AqDeqOptions Class ``visibility`` Property
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     visibility property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.AQ_VISIBILITY_IMMEDIATE``
      - 1
      - The message is not part of the current transaction. It constitutes a transaction on its own.
    * - ``oracledb.AQ_VISIBILITY_ON_COMMIT``
      - 2
      - The message is part of the current transaction.

.. _oracledbconstantscqn:

Continuous Query Notification (CQN) Constants
---------------------------------------------

Constants for the Continuous Query Notification (CQN)
``connection.subscribe()`` option
:ref:`operations <consubscribeoptoperations>`, and for the
notification message :ref:`operation <consubscribeoptcallback>`
properties.

.. list-table-with-summary::  Constants for the connection.subscribe() option
     ``operations`` and notification message ``operation`` Properties.
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     operations property. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.CQN_OPCODE_ALL_OPS``
      - 0
      - Default. Used to request notification of all operations.
    * - ``oracledb.CQN_OPCODE_ALL_ROWS``
      - 1
      - Indicates that row information is not available. This occurs if qos quality of service flags do not specify the desire for ROWIDs, or if grouping has taken place and summary notifications are being sent.
    * - ``oracledb.CQN_OPCODE_ALTER``
      - 16
      - Set if the table was altered in the notifying transaction.
    * - ``oracledb.CQN_OPCODE_DELETE``
      - 8
      - Set if the notifying transaction included deletes on the table.
    * - ``oracledb.CQN_OPCODE_DROP``
      - 32
      - Set if the table was dropped in the notifying transaction.
    * - ``oracledb.CQN_OPCODE_INSERT``
      - 2
      - Set if the notifying transaction included inserts on the table.
    * - ``oracledb.CQN_OPCODE_UPDATE``
      - 4
      - Set if the notifying transaction included updates on the table.

.. _oracledbconstantspool:

Pool Status Constants
---------------------

Constants for the connection :attr:`pool.status` read-only attribute.

.. list-table-with-summary::  Constants for the connection ``pool.status`` Attribute
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the constant for the
     pool.status attribute. The second column displays the value of the
     constant. The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.POOL_STATUS_CLOSED``
      - 6002
      - The connection pool has been closed.
    * - ``oracledb.POOL_STATUS_DRAINING``
      - 6001
      - The connection pool is being drained of in-use connections and will be force closed soon.
    * - ``oracledb.POOL_STATUS_OPEN``
      - 6000
      - The connection pool is open.
    * - ``oracledb.POOL_STATUS_RECONFIGURING``
      - 6003
      - A :meth:`pool.reconfigure()` call is processing.

.. _oracledbconstantssoda:

Simple Oracle Document Access (SODA) Constants
----------------------------------------------

.. list-table-with-summary::  SODA Constant
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the SODA constant. The
     second column displays the value of the constant. The third column
     displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SODA_COLL_MAP_MODE``
      - 5001
      - Indicate :meth:`sodaDatabase.createCollection()` should use an externally created table to store the collection.

.. _oracledbconstantsshutdown:

Database Shutdown Constants
---------------------------

Constants for shutting down the Oracle Database with
:meth:`oracledb.shutdown()` and :meth:`connection.shutdown()`.

.. versionadded:: 5.0

.. list-table-with-summary::  Database Shutdown Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the database shutdown
     constant. The second column displays the value of the constant. The
     third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.SHUTDOWN_MODE_ABORT``
      - 4
      - All uncommitted transactions are terminated and not rolled back. This is the fastest way to shut down the database, but the next database start up may require instance recovery.
    * - ``oracledb.SHUTDOWN_MODE_DEFAULT``
      - 0
      - Further connections to the database are prohibited. Wait for users to disconnect from the database.
    * - ``oracledb.SHUTDOWN_MODE_FINAL``
      - 5
      - Used with a second :meth:`connection.shutdown()` to conclude the database shut down steps.
    * - ``oracledb.SHUTDOWN_MODE_IMMEDIATE``
      - 3
      - All uncommitted transactions are terminated and rolled back and all connections to the database are closed immediately.
    * - ``oracledb.SHUTDOWN_MODE_TRANSACTIONAL``
      - 1
      - Further connections to the database are prohibited and no new transactions are allowed to be started. Wait for active transactions to complete.
    * - ``oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL``
      - 2
      - Behaves the same way as ``SHUTDOWN_MODE_TRANSACTIONAL``, but only waits for local transactions to complete.

.. _oracledbconstantstpc:

Two-Phase Commit Constants
--------------------------
.. versionadded:: 5.3

Constants for two-phase commit (TPC) functions
:meth:`connection.tpcBegin()` and :meth:`connection.tpcEnd()`.

.. list-table-with-summary::  Two-Phase Commit Constants
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 10 30
    :summary: The first column displays the name of the two-phase commit
     constant name. The second column displays the value of the constant.
     The third column displays the description of the constant.

    * - Constant Name
      - Value
      - Description
    * - ``oracledb.TPC_BEGIN_JOIN``
      - 2
      - Join an existing two-phase commit (TPC) transaction.
    * - ``oracledb.TPC_BEGIN_NEW``
      - 1
      - Create a new TPC transaction.
    * - ``oracledb.TPC_BEGIN_RESUME``
      - 4
      - Resume an existing TPC transaction.
    * - ``oracledb.TPC_BEGIN_PROMOTE``
      - 8
      - Promote a local transaction to a TPC transaction.
    * - ``oracledb.TPC_END_NORMAL``
      - 0
      - End the TPC transaction participation normally.
    * - ``oracledb.TPC_END_SUSPEND``
      - 1048576
      - Suspend the TPC transaction.

.. _oracledbproperties:

Oracledb Properties
===================

The properties of the *Oracledb* object are used for setting up
configuration parameters for deployment.

If required, these properties can be overridden for the *Pool* or
*Connection* objects.

These properties may be read or modified. If a property is modified,
only subsequent invocations of the ``createPool()`` or
``getConnection()`` methods will be affected. Objects that exist before
a property is modified are not altered.

Invalid values, or combinations of values, for pool configuration
properties can result in the error *ORA-24413: Invalid number of
sessions specified*.

Each of the configuration properties is described below.

.. attribute:: oracledb.autoCommit

    This property is a boolean value. If this property is *true*, then the
    transaction in the current connection is automatically committed at the
    end of statement execution.

    The default value is *false*.

    This property may be overridden in an :ref:`execute() <executeoptions>`
    call.

    When using an external transaction manager with :ref:`two-phase
    commits <twopc>`, ``autoCommit`` should be *false*.

    Note prior to node-oracledb 0.5 this property was called
    ``isAutoCommit``.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.autoCommit = false;

.. attribute:: oracledb.connectionClass

    The user-chosen Connection class value is a string which defines a
    logical name for connections. Most single purpose applications should set
    ``connectionClass`` when using a connection pool or DRCP.

    When a pooled session has a connection class, the session is not shared
    with users with a different connection class.

    The connection class value is similarly used by :ref:`Database Resident
    Connection Pooling (DRCP) <drcp>` to allow or disallow sharing of
    sessions.

    For example, where two different kinds of users share one pool, you
    might set ``connectionClass`` to ‘HRPOOL’ for connections that access a
    Human Resources system, and it might be set to ‘OEPOOL’ for users of an
    Order Entry system. Users will only be given sessions of the appropriate
    class, allowing maximal reuse of resources in each case, and preventing
    any session information leaking between the two systems.

    If ``connectionClass`` is set for a non-pooled connection, the driver
    name is not recorded in ``V$`` views. See :ref:`End-to-end Tracing,
    Mid-tier Authentication, and Auditing <endtoend>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.connectionClass = 'HRPOOL';

.. attribute:: oracledb.dbObjectAsPojo

    This property is a boolean which specifies whether :ref:`Oracle Database
    named objects or collections <objects>` that are queried should be
    returned to the application as “plain old JavaScript objects” or kept as
    database-backed objects. This option also applies to output ``BIND_OUT``
    :ref:`bind variables <bind>`.

    Note that LOBs in objects will be represented as :ref:`Lob <lobclass>`
    instances and will not be String or Buffer, regardless of any
    ``fetchAsString``, ``fetchAsBuffer``, or ``fetchInfo`` setting.

    The default value for ``dbObjectAsPojo`` is *false*.

    Setting ``dbObjectAsPojo`` to *true* can avoid overhead if object
    attributes are repeatedly accessed. It also allows applications to close
    connections before any attributes are accessed unless LOBs are involved.
    Regardless of the value, the interface to access objects is the same.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.dbObjectAsPojo = false;

.. attribute:: oracledb.edition

    .. versionadded:: 2.2

    This property is a string that sets the name used for Edition-Based
    Redefinition by connections.

    See :ref:`Edition-Based Redefinition <ebr>` for more information.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.edition = 'ed_2';

.. attribute:: oracledb.errorOnConcurrentExecute

    .. versionadded:: 5.2

    This property is a boolean that can be set to throw an error if
    concurrent operations are attempted on a single connection.

    The default value for ``errorOnConcurrentExecute`` is *false*.

    Each Oracle connection can only interact with the database for one
    operation at a time. Attempting to do more than one operation
    concurrently may be a sign of an incorrectly coded application, for
    example an ``await`` may be missing. Examples of operations that cannot
    be executed in parallel on a single connection include
    ``connection.execute()``, ``connection.executeMany()``,
    ``connection.queryStream()``, ``connection.getDbObjectClass()``,
    ``connection.commit()``, ``connection.close()``,
    :ref:`SODA <sodaoverview>` calls, and streaming from :ref:`Lobs
    <lobclass>`.

    The value of this property does not affect using multiple connections.
    These may all be in use concurrently, and each can be doing one
    operation.

    Leaving ``errorOnConcurrentExecute`` set to *false* is recommended for
    production applications. This will avoid unexpected errors. Some
    frameworks may execute concurrent statements on a connection by design.
    Also some application modules may have the expectation that
    node-oracledb will handle any necessary connection usage serialization.

    For more discussion, see `Parallelism on Each Connection <parallelism>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.errorOnConcurrentExecute = false;

.. attribute:: oracledb.events

    .. versionadded:: 2.2

    This property is a boolean that determines whether Oracle Client events
    mode should be enabled.

    The default value for ``events`` is *false*.

    This property can be overridden in the
    :ref:`oracledb.createPool() <createpoolpoolattrsevents>` call and when
    getting a standalone connection from
    :ref:`oracledb.getConnection() <getconnectiondbattrsevents>`.

    Events mode is required for
    :meth:`Continuous Query Notification <connection.subscribe()>`,
    :ref:`Fast Application Notification (FAN) <connectionfan>` and
    :ref:`Runtime Load Balancing (RLB) <connectionrlb>`.

    In node-oracledb 4.0.0 and 4.0.1, the default value for ``events`` was
    *true*.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.events = false;

.. attribute:: oracledb.extendedMetaData

    .. desupported:: 6.0

    Extended metadata is now always returned

    .. versionadded:: 1.10

    This property is a boolean that determines whether additional metadata is
    available for queries and for REF CURSORs returned from PL/SQL blocks.

    The default value for ``extendedMetaData`` is *false*. With this value,
    the :ref:`result.metaData <execmetadata>` and :attr:`resultSet.metaData`
    objects only include column names.

    If ``extendedMetaData`` is *true* then ``metaData`` will contain
    additional attributes. These are listed in :ref:`Result Object
    Properties <execmetadata>`.

    This property may be overridden in an :ref:`execute() <executeoptions>`
    call.

.. attribute:: oracledb.externalAuth

    This property is a boolean value. If this property is *true* in
    node-oracledb Thick mode, then connections are established using external
    authentication. See :ref:`External Authentication <extauth>` for more
    information.

    In node-oracledb Thin mode, when token-based authentication is required,
    this property must be set to *true*. In all the other cases where this
    property is set to *true*, an error is thrown.

    The default value is *false*.

    The ``user`` (or ``username``) and ``password`` properties should not be
    set when ``externalAuth`` is *true*.

    This property can be overridden in the
    :meth:`oracledb.createPool()` call and when getting a
    standalone connection from :meth:`oracledb.getConnection()`.

    Note prior to node-oracledb 0.5 this property was called
    ``isExternalAuth``.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.externalAuth = false;

.. attribute:: oracledb.fetchArraySize

    .. versionadded:: 2.0

    This property is a number that sets the size of an internal buffer used
    for fetching query rows from Oracle Database. Changing it may affect
    query performance but does not affect how many rows are returned to the
    application.

    The default value is *100*.

    The property is used during the default :ref:`direct
    fetches <fetchingrows>`, during ResultSet :meth:`resultset.getRow()`
    calls, and for :meth:`connection.queryStream()`. It is used for
    :meth:`resultset.getRows()` when no argument (or the value 0) is passed
    to ``getRows()``.

    Increasing this value reduces the number of :ref:`round-trips
    <roundtrips>` to the database but increases memory usage
    for each data fetch. For queries that return a large number of rows,
    higher values of ``fetchArraySize`` may give better performance. For
    queries that only return a few rows, reduce the value of
    ``fetchArraySize`` to minimize the amount of memory management during
    data fetches. JavaScript memory fragmentation may occur in some cases,
    see :ref:`Fetching Rows with Direct Fetches <fetchingrows>`.

    For direct fetches (those using ``execute()`` option
    :ref:`resultSet: false <propexecresultset>`), the internal buffer size
    will be based on the lesser of :attr:`oracledb.maxRows` and
    ``fetchArraySize``.

    This property can be overridden by the ``execute()`` option
    :ref:`fetchArraySize <propexecfetcharraysize>`.

    See :ref:`Tuning Fetch Performance <rowfetching>` for more information.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.fetchArraySize = 100;

.. attribute:: oracledb.fetchAsBuffer

    .. versionadded:: 1.13

    This property is an array of type constants that allows query columns to
    be returned as Buffers.

    Currently the only valid constant is :ref:`oracledb.BLOB
    <oracledbconstantsnodbtype>` or its equivalent
    :ref:`oracledb.DB_TYPE_BLOB <oracledbconstantsdbtype>`.

    When set, and a BLOB column is queried with :meth:`~connection.execute()`
    or :meth:`~connection.queryStream()`, then the column data is
    returned as a Buffer instead of the default :ref:`Lob <lobclass>`
    instance. Individual query columns in :meth:`~connection.execute()` or
    :meth:`~connection.queryStream()` calls can override the
    ``fetchAsBuffer`` global setting by using
    :ref:`fetchInfo <executeoptions>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.fetchAsBuffer = [ oracledb.BLOB ];

.. attribute:: oracledb.fetchAsString

    This property is an array that allows query columns to be returned as
    Strings instead of the default type.

    In node-oracledb, all columns are returned as the closest JavaScript
    type, or as :ref:`Lob <lobclass>` instances in the case of CLOB and NCLOB
    types. (See :ref:`Query Result Type Mapping <typemap>`). The
    ``fetchAsString`` property can override this default type mapping.

    The ``fetchAsString`` property should be an array of type constants. The
    valid constants are :ref:`oracledb.DATE <oracledbconstantsnodbtype>`,
    :ref:`oracledb.NUMBER <oracledbconstantsnodbtype>`,
    :ref:`oracledb.BUFFER <oracledbconstantsnodbtype>`,
    :ref:`oracledb.CLOB <oracledbconstantsnodbtype>`, and
    :ref:`oracledb.NCLOB <oracledbconstantsnodbtype>`. The equivalent
    :ref:`DB_TYPE_* <oracledbconstantsdbtype>` constants can also be used.

    When any column having one of the types is queried with
    :meth:`~connection.execute()` or :meth:`~connection.queryStream()`,
    the column data is returned as a string instead of the default
    representation. Individual query columns in :meth:`~connection.execute()`
    or :meth:`~connection.queryStream()` calls can override the
    ``fetchAsString`` global setting by using
    :ref:`fetchInfo <executeoptions>`.

    Note:

    - Specifying :ref:`oracledb.NUMBER <oracledbconstantsnodbtype>` will
      affect numeric columns. The ``fetchAsString`` property helps avoid
      situations where using JavaScript types can lead to numeric precision
      loss.
    - Specifying :ref:`oracledb.CLOB <oracledbconstantsnodbtype>` will affect
      both CLOB and NCLOB columns. Similarly, specifying :ref:`oracledb.NCLOB
      <oracledbconstantsnodbtype>` will also affect both CLOB and NCLOB
      columns. Using ``fetchAsString`` automatically fetches LOB data
      directly in query output without requiring streaming.
    - Specifying :ref:`oracledb.DATE <oracledbconstantsnodbtype>` will affect
      date and timestamp columns. Using ``fetchAsString`` can be helpful to
      avoid date conversions.

    When :ref:`oracledb.BUFFER <oracledbconstantsnodbtype>` is used for
    RAW data, Oracle returns the data as a hex-encoded string. For dates and
    numbers returned as a string, the maximum length of a string created by
    this mapping is 200 bytes. Strings created for CLOB and NCLOB columns
    will generally be limited by Node.js and V8 memory restrictions.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];

.. attribute:: oracledb.fetchTypeHandler

    .. versionadded:: 6.0

    This property is a function that allows applications to examine and modify
    queried column data before it is returned to the user. This function is
    called once for each column that is being fetched with a single object
    argument containing the following attributes:

    - ``byteSize``: The maximum size in bytes. This is only set if ``dbType``
      is ``oracledb.DB_TYPE_VARCHAR``, ``oracledb.DB_TYPE_CHAR``, or
      ``oracledb.DB_TYPE_RAW``.
    - ``dbType``: The database type, that is, one of the
      :ref:`oracledbconstantsdbtype`.
    - ``dbTypeName``: The name of the database type, such as "NUMBER" or
      "VARCHAR2".
    - ``dbTypeClass``: The class associated with the database type. This is
      only set if ``dbType`` is ``oracledb.DB_TYPE_OBJECT``.
    - ``name``: The name of the column.
    - ``nullable``: Indicates whether ``NULL`` values are permitted for this
      column.
    - ``precision``: Set only when the ``dbType`` is
      ``oracledb.DB_TYPE_NUMBER``.
    - ``scale``: Set only when the ``dbType`` is ``oracledb.DB_TYPE_NUMBER``.

    By default, this property is "undefined", that is, it is not set.

    The function is expected to return either nothing or an object containing:

    - the ``type`` attribute
    - or the :ref:`converter <converterfunc>` attribute
    - or both the ``type`` and ``converter`` attributes

    The ``converter`` function is a function which can be used with fetch
    type handlers to change the returned data. This function accepts the
    value that will be returned by :meth:`connection.execute()` for a
    particular row and column and returns the value that will actually be
    returned by ``connection.execute()``.

    This property can be overridden by the :ref:`fetchTypeHandler
    <propexecfetchtypehandler>` option in :meth:`~connection.execute()`.

    See :ref:`fetchtypehandler`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.fetchTypeHandler = function(metaData) {
        // Return number column data as strings
            if (metaData.dbType == oracledb.DB_TYPE_NUMBER) {
                return {type: oracledb.STRING};
            }
        }

.. attribute:: oracledb.lobPrefetchSize

    This property is a number and is temporarily disabled. Setting it has no
    effect. For best performance, fetch Lobs as Strings or Buffers.

    Node-oracledb internally uses Oracle *LOB Locators* to manipulate long
    object (LOB) data. LOB Prefetching allows LOB data to be returned early
    to node-oracledb when these locators are first returned. This allows for
    efficient use of resources and :ref:`round-trips <roundtrips>` between
    node-oracledb and the database.

    Prefetching of LOBs is mostly useful for small LOBs.

    The default size is 16384.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.lobPrefetchSize = 16384;

.. attribute:: oracledb.maxRows

    This property is the maximum number of rows that are fetched by a query
    with :meth:`connection.execute()` when *not* using a
    :ref:`ResultSet <resultsetclass>`. Rows beyond this limit are not fetched
    from the database. A value of 0 means there is no limit.

    For nested cursors, the limit is also applied to each cursor.

    The default value is *0*, meaning unlimited.

    This property may be overridden in an :ref:`execute() <executeoptions>`
    call.

    To improve database efficiency, SQL queries should use a row limiting
    clause like :ref:`OFFSET / FETCH <pagingdata>` or equivalent. The
    ``maxRows`` property can be used to stop badly coded queries from
    returning unexpectedly large numbers of rows.

    For queries that return a fixed, small number of rows, then set
    ``maxRows`` to that value. For example, for queries that return one row,
    set ``maxRows`` to 1.

    When the number of query rows is relatively big, or can not be
    predicted, it is recommended to use a :ref:`ResultSet <resultsetclass>`
    or :meth:`~connection.queryStream()`. This allows applications to
    process rows in smaller chunks or individually, preventing the Node.js
    memory limit being exceeded or query results being unexpectedly
    truncated by a ``maxRows`` limit.

    In version 1, the default value was *100*.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.maxRows = 0;

.. attribute:: oracledb.oracleClientVersion

    .. versionadded:: 1.3

    This read-only property gives a numeric representation of the Oracle
    Client library version which is useful in comparisons. For version
    *a.b.c.d.e*, this property gives the number:
    ``(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e``

    From node-oracledb 3.1.0, using ``oracledb.oracleClientVersion`` will
    throw a *DPI-1047* error if node-oracledb cannot load Oracle Client
    libraries. Previous versions threw this error from
    ``require('oracledb')``.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        console.log("Oracle client library version number is " + oracledb.oracleClientVersion);

.. attribute:: oracledb.oracleClientVersionString

    .. versionadded:: 2.2

    This read-only property gives a string representation of the Oracle Client
    library version which is useful for display.

    From node-oracledb 3.1.0, using ``oracledb.oracleClientVersionString``
    will throw a ``DPI-1047`` error if node-oracledb cannot load Oracle Client
    libraries. Previous versions threw this error from
    ``require('oracledb')``.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        console.log("Oracle client library version is " + oracledb.oracleClientVersionString);

.. attribute:: oracledb.outFormat

    This property is a number that identifies the format of query rows
    fetched when using :meth:`connection.execute()` or
    :meth:`connection.queryStream()`. It affects both
    :ref:`ResultSet <propexecresultset>` and non-ResultSet queries. It can
    be used for top level queries and REF CURSOR output.

    This can be either of the :ref:`Oracledb
    constants <oracledbconstantsoutformat>` ``oracledb.OUT_FORMAT_ARRAY``
    or ``oracledb.OUT_FORMAT_OBJECT``. The default value is
    ``oracledb.OUT_FORMAT_ARRAY`` which is more efficient. The older,
    equivalent constants ``oracledb.ARRAY`` and ``oracledb.OBJECT`` are
    deprecated.

    If specified as ``oracledb.OUT_FORMAT_ARRAY``, each row is fetched as an
    array of column values.

    If specified as ``oracledb.OUT_FORMAT_OBJECT``, each row is fetched as a
    JavaScript object. The object has a property for each column name, with
    the property value set to the respective column value. The property name
    follows Oracle’s standard name-casing rules. It will commonly be
    uppercase, since most applications create tables using unquoted,
    case-insensitive names.

    From node-oracledb 5.1, when duplicate column names are used in queries,
    then node-oracledb will append numeric suffixes in
    ``oracledb.OUT_FORMAT_OBJECT`` mode as necessary, so that all columns
    are represented in the JavaScript object. This was extended in
    node-oracledb 5.2 to also cover duplicate columns in nested cursors and
    REF CURSORS.

    This property may be overridden in an :ref:`execute() <executeoptions>`
    or :meth:`~connection.queryStream()` call.

    See :ref:`Query Output Formats <queryoutputformats>` for more
    information.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.outFormat = oracledb.OUT_FORMAT_ARRAY;

.. attribute:: oracledb.poolIncrement

    This property is the number of connections that are opened whenever a
    connection request exceeds the number of currently open connections.

    The default value is *1*.

    With fixed-size :ref:`homogeneous <createpoolpoolattrshomogeneous>`
    pools (where ``poolMin`` equals ``poolMax``), and when using Oracle Client
    18c (or later) for node-oracledb Thick mode, you may wish to evaluate
    setting ``poolIncrement`` greater than 1. This can expedite regrowth when
    the number of :attr:`connections established <pool.connectionsOpen>` has
    become lower than ``poolMin``, for example, when network issues cause
    connections to become unusable and get them dropped from the pool.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolIncrement = 1;

.. attribute:: oracledb.poolMax

    This property is the maximum number of connections to which a connection
    pool can grow.

    The default value is *4*.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    Importantly, if you increase ``poolMax`` you should also increase the
    number of threads available to node-oracledb. See :ref:`Connections and
    Number of Threads <numberofthreads>`.

    A fixed pool size where ``poolMin`` equals ``poolMax`` :ref:`is strongly
    recommended <conpoolsizing>`. This helps prevent connection storms
    and helps overall system stability.

    See :ref:`Connection Pooling <connpooling>` for pool sizing guidelines.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolMax = 4;

.. attribute:: oracledb.poolMaxPerShard

    .. versionadded:: 4.1

    This property sets the maximum number of connection in the pool that can
    be used for any given shard in a sharded database. This lets connections
    in the pool be balanced across the shards. A value of zero will not set
    any maximum number of sessions for each shard.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    When this property is greater than zero, and a new connection request
    would cause the number of connections to the target shard to exceed the
    limit, then that new connection request will block until a suitable
    connection has been released back to the pool. The pending connection
    request will consume one worker thread.

    See :ref:`Connecting to Sharded Databases <sharding>` for more
    information.

    .. note::

        This property can only be used in the node-oracledb Thick mode. See
        :ref:`enablingthick`.

    It is available when node-oracledb uses Oracle client libraries 18.3, or
    later.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolMaxPerShard = 0;

.. attribute:: oracledb.poolMin

    This property is a number that identifies the number of connections
    established to the database when a pool is created. Also, this is the
    minimum number of connections that a pool maintains when it shrinks, see
    :attr:`oracledb.poolTimeout`.

    The default value is *0*.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    A fixed pool size where ``poolMin`` equals ``poolMax`` :ref:`is strongly
    recommended <conpoolsizing>`. This helps prevent connection storms
    and helps overall system stability.

    For pools created with :ref:`External Authentication <extauth>`, with
    :ref:`homogeneous <createpoolpoolattrshomogeneous>` set to *false*, or
    when using :ref:`Database Resident Connection Pooling (DRCP) <drcp>`,
    then the number of connections initially created is zero even if a larger
    value is specified for ``poolMin``. Also in these cases the pool
    increment is always 1, regardless of the value of
    :ref:`poolIncrement <createpoolpoolattrspoolincrement>`. Once the
    number of open connections exceeds ``poolMin`` then the number of open
    connections does not fall below ``poolMin``.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolMin = 0;

.. attribute:: oracledb.poolPingInterval

    .. versionadded:: 1.12

    This property is a number value. When a pool :meth:`pool.getConnection()`
    is called and the connection has been idle in the pool
    for at least ``poolPingInterval`` seconds, node-oracledb internally “pings”
    the database to check the connection is alive. After a ping, an unusable
    connection is destroyed and a usable one is returned by
    ``getConnection()``. Connection pinging improves the chance a pooled
    connection is usable by the application because unusable connections are
    less likely to be returned by :meth:`oracledb.getConnection()`.

    The default ``poolPingInterval`` value is *60* seconds. Possible values
    are:

    .. list-table-with-summary::  ``poolPingInterval`` Values
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 35
        :summary: The first column displays the ``poolPingInterval`` value.
         The second column displays the behavior of a pool ``getConnection()``
         call.

        * - ``poolPingInterval`` Value
          - Behavior of a Pool ``getConnection()`` Call
        * - ``n`` < ``0``
          - Never checks for connection validity.
        * - ``n`` = ``0``
          - Always checks for connection validity. This value is not recommended for most applications because of the overhead in performing each ping.
        * - ``n`` > ``0``
          - Checks validity if the connection has been idle in the pool (not “checked out” to the application by ``getConnection()``) for at least ``n`` seconds.

    This property may be overridden when creating a connection pool using
    :meth:`oracledb.createPool()`.

    See :ref:`Connection Pool Pinging <connpoolpinging>` for more discussion.

    It was disabled when using Oracle Client 12.2 (and later) until
    node-oracledb 3.0.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolPingInterval = 60;     // seconds

.. attribute:: oracledb.poolTimeout

    This property is a number that allows the number of open connections in a
    pool to shrink to :attr:`oracledb.poolMin`.

    If the application returns connections to the pool with
    ``connection.close()``, and the connections are then unused for more
    than ``poolTimeout`` seconds, then any excess connections above
    ``poolMin`` will be closed. When using Oracle Client prior to version
    21, this pool shrinkage is only initiated when the pool is accessed.

    If ``poolTimeout`` is set to 0, then idle connections are never
    terminated.

    If you wish to change ``poolTimeout`` with
    :meth:`pool.reconfigure()`, then the initial
    ``poolTimeout`` used by ``oracledb.createPool()`` must be non-zero.

    The default value is *60*.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.poolTimeout = 60;

.. attribute:: oracledb.prefetchRows

    This property is a query tuning option to set the number of additional
    rows the underlying Oracle Client library fetches during the internal
    initial statement execution phase of a query. The prefetch size does not
    affect when, or how many, rows are returned by node-oracledb to the
    application.

    The ``prefetchRows`` attribute can be used in conjunction with
    :attr:`oracledb.fetchArraySize` to tune query performance, memory use,
    and to reduce the number of :ref:`round-trip <roundtrips>` calls needed
    to return query results, see :ref:`Tuning Fetch Performance
    <rowfetching>`.

    The ``prefetchRows`` value is ignored in some cases, such as when the
    query involves a LOB.

    If you fetch a REF CURSOR, retrieve rows from that cursor, and then pass
    it back to a PL/SQL block, you should set ``prefetchRows`` to 0 during
    the initial statement that gets the REF CURSOR. This ensures that rows
    are not internally fetched from the REF CURSOR by node-oracledb thus
    making them unavailable in the final PL/SQL code.

    The default value is *2*.

    This property may be overridden in an :meth:`connection.execute()`
    call, which is preferred usage if you need to change the value.

    This attribute is not used in node-oracledb version 2, 3 or 4. In those
    versions use only :attr:`oracledb.fetchArraySize` instead.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.prefetchRows = 2;

.. attribute:: oracledb.Promise

    **The ``oracledb.Promise`` property is no longer used in node-oracledb 5
    and has no effect.**

    Node-oracledb supports Promises on all methods. The native Promise
    library is used. See :ref:`Promises and node-oracledb <promiseoverview>`
    for a discussion of using Promises.

    **Example**

    Prior to node-oracledb 5, this property could be set to override or
    disable the Promise implementation.

    .. code-block:: javascript

        const mylib = require('myfavpromiseimplementation');
        oracledb.Promise = mylib;

    Prior to node-oracledb 5, Promises could be completely disabled by
    setting:

    .. code-block:: javascript

        oracledb.Promise = null;

.. attribute:: oracledb.queueMax

    .. versionadded:: 5.0

    This property is the maximum number of pending ``pool.getConnection()``
    calls that can be queued.

    When the number of ``pool.getConnection()`` calls that have been
    :ref:`queued <connpoolqueue>` waiting for an available connection reaches
    ``queueMax``, then any future ``pool.getConnection()`` calls will
    immediately return an error and will not be queued.

    If ``queueMax`` is -1, then the queue length is not limited.

    The default value is *500*.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.queueMax = 500;

.. attribute:: oracledb.queueRequests

    This property was removed in node-oracledb 3.0 and queuing was always
    enabled. From node-oracledb 5.0, set ``queueMax`` to 0 to disable queuing.
    See :ref:`Connection Pool Queue <connpoolqueue>` for more information.

.. attribute:: oracledb.queueTimeout

    .. versionadded:: 1.7

    This property is the number of milliseconds after which connection
    requests waiting in the connection request queue are terminated. If
    ``queueTimeout`` is 0, then queued connection requests are never
    terminated.

    If immediate timeout is desired, set related property
    :attr:`oracledb.queueMax` to 0.

    The default value is *60000*.

    This property may be overridden when
    :meth:`creating a connection pool <oracledb.createPool()>`.

    See :ref:`Connection Pool Queue <connpoolqueue>` for more information.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.queueTimeout = 3000; // 3 seconds

.. attribute:: oracledb.stmtCacheSize

    This properry is the number of statements that are cached in the
    :ref:`statementcache <stmtcache>` of each connection.

    The default value is *30*.

    This property may be overridden for specific *Pool* or *Connection*
    objects.

    In general, set the statement cache to the size of the working set of
    statements being executed by the application. Statement caching can be
    disabled by setting the size to 0.

    See :ref:`Statement Caching <stmtcache>` for examples.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        oracledb.stmtCacheSize = 30;

.. attribute:: oracledb.thin

    .. versionadded:: 6.0

    This property is a boolean that determines the node-oracledb driver mode
    which is in use. If the value is *true*, it indicates that
    :ref:`node-oracledb Thin mode <thinarch>` is in use. If the value is
    *false*, it indicates that :ref:`node-oracledb Thick mode <thickarch>` is
    in use.

    The default value is *true*.

    Immediately after node-oracledb is imported, this property is set to
    *true* indicating that node-oracledb defaults to Thin mode. If
    :meth:`oracledb.initOracleClient()` is called, then the value of this
    property is set to False indicating that Thick mode is enabled. Once the
    first standalone connection or connection pool is created, or a call to
    ``oracledb.initOracleClient()`` is made, then node-oracledb’s mode is
    fixed and the value set in :attr:`oracledb.thin` will never change for
    the lifetime of the process.

    The property :attr:`connection.thin` can be used to check a connection’s
    mode and the attribute :attr:`pool.thin` can be used to check a pool's
    mode. The value that is displayed for the ``connection.thin``,
    ``pool.thin``, and ``oracledb.thin`` attributes will be the same.

.. attribute:: oracledb.version

    This read-only property gives a numeric representation of the
    node-oracledb version. For version *x.y.z*, this property gives the
    number: ``(10000 * x) + (100 * y) + z``

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        console.log("Driver version number is " + oracledb.version);

.. attribute:: oracledb.versionString

    .. versionadded:: 2.1

    This read-only property gives a string representation of the
    node-oracledb version, including the version suffix if one is present.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        console.log("Driver version is " + oracledb.versionString);

.. attribute:: oracledb.versionSuffix

    .. versionadded:: 2.1

    This read-only property gives a string representing the version suffix
    (for example, “-dev” or “-beta”) or an empty string if no version suffix is
    present.

    **Example**

    .. code-block:: javascript

        const oracledb = require('oracledb');
        console.log("Driver version suffix is " + oracledb.versionSuffix);

.. _oracledbmethods:

Oracledb Methods
================

.. method:: oracledb.createPool()

    **Promise**::

        promise = createPool(Object poolAttrs);

    Creates a pool of connections with the specified user name,
    password and connection string. A pool is typically created once during
    application initialization.

    In node-oracledb Thick mode, ``createPool()`` internally creates an
    `Oracle Call Interface Session Pool <https://www.oracle.com/pls/topic/
    lookup?ctx=dblatest&id=GUID-F9662FFB-EAEF-495C-96FC-49C6D1D9625C>`__ for
    each Pool object.

    The default properties may be overridden by specifying new properties in
    the ``poolAttrs`` parameter.

    It is possible to add pools to the pool cache when calling
    ``createPool()``. This allows pools to later be accessed by name,
    removing the need to pass the pool object through code. See
    :ref:`Connection Pool Cache <connpoolcache>` for more details.

    A pool should be terminated with the :meth:`pool.close()`
    call.

    From node-oracledb 3.1.0, the ``createPool()`` error callback will
    return a *DPI-1047* error if node-oracledb cannot load Oracle Client
    libraries. Previous versions threw this error from
    ``require('oracledb')``.

    See :ref:`Connection Pooling <connpooling>` for more information about
    pooling.

    The parameters of the ``oracledb.createPool()`` method are:

    .. _createpoolparams:

    .. list-table-with-summary:: oracledb.createPool() Parameters
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
        * - ``poolAttrs``
          - Object
          - The ``poolAttrs`` parameter object provides connection credentials and pool-specific configuration properties, such as the maximum or minimum number of connections for the pool, or the statement cache size for the connections.

            The properties provided in the ``poolAttrs`` parameter override the default pooling properties of the *Oracledb* object. If an attribute is not set, or is null, the value of the related *Oracledb* property will be used.

            Note that the ``poolAttrs`` parameter may have configuration properties that are not used by the ``createPool()`` method. These are ignored.

            See :ref:`createpoolpoolattrs` for information on the properties of ``poolAttrs``.

    The properties of ``poolAttrs`` are:

    .. _createpoolpoolattrs:

    .. list-table-with-summary:: createPool(): ``poolAttrs`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 5 7 12 22
        :summary: The first column, Property, displays the property. The second column, Type, displays the data type of the property. The third column, Mode, displays whether the property can be used in the node-oracledb Thin mode, node-oracledb Thick mode, or both node-oracledb modes. The fourth column, Description, displays the description of the property.

        * - Property
          - Data Type
          - node-oracledb Mode
          - Description
        * - ``accessToken``
          - Function, String, Object
          - Both
          - .. _createpoolpoolattrsaccesstoken:

            For Microsoft Azure Active Directory OAuth 2.0 token-based authentication ``accessToken`` can be:

            -  a callback function returning the token as a string
            -  an object with a ``token`` attribute containing the token as a string
            -  or the token as a string

            Tokens can be obtained using various approaches. For example, using the Azure Active Directory API.

            For Oracle Cloud Infrastructure Identity and Access Management (IAM) token-based authentication ``accessToken`` can be:

            -  a callback function returning an object containing ``token`` and ``privateKey`` attributes
            -  or an object containing ``token`` and ``privateKey`` attributes

            The properties of the ``accessToken`` object are described in :ref:`accesstokenproperties`.

            If the ``accessToken`` is a callback function::

              function accessToken(boolean refresh)

            When ``accessToken`` is a callback function, it will be invoked at the time the pool is created (even if ``poolMin`` is 0). It is also called when the pool needs to expand (causing new connections to be created) and the current token has expired. The returned token is used by node-oracledb for authentication. The ``refresh`` parameter is described in :ref:`refresh`.

            When the callback is first invoked, the ``refresh`` parameter will be set to *false*. This indicates that the application can provide a token from its own application managed cache, or it can generate a new token if there is no cached value. Node-oracledb checks whether the returned token has expired. If it has expired, then the callback function will be invoked a second time with ``refresh`` set to *true*. In this case the function must externally acquire a token, optionally add it to the application’s cache, and return the token.

            For token-based authentication, the ``externalAuth`` and ``homogeneous`` pool attributes must be set to *true*. The ``user`` (or ``username``) and ``password`` attributes should not be set.

            See :ref:`Token-Based Authentication <tokenbasedauthentication>` for more information.

            .. versionadded:: 5.4

            This attribute was added to support IAM token-based authentication. In this release the attribute must be an Object. For node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) must be used for IAM token-based authentication.

            The ``accessToken`` attribute was extended to allow OAuth 2.0 token-based authentication in node-oracledb 5.5. For OAuth 2.0, the attribute should be a string, or a callback. For node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. The callback usage supports both OAuth 2.0 and IAM token-based authentication.
        * - ``accessTokenCallback``
          - Object
          - NA
          - .. _createpoolpoolattrsaccesstokencallback:

            This optional attribute is a Node.js callback function. It gets called by the connection pool if the pool needs to grow and create new connections but the current token has expired.

            The callback function must return a JavaScript object with attributes ``token`` and ``privateKey`` for IAM. See :ref:`Connection Pool Creation with Access Tokens for IAM <iampool>`.

            .. versionadded:: 5.4

            It should be used with Oracle Client libraries 19.14 (or later), or 21.5 (or later).

            .. deprecated:: 5.5

            .. desupported:: 6.0

            Use :ref:`accessToken <createpoolpoolattrsaccesstoken>` with a callback instead.
        * - ``connectString``, ``connectionString``
          - String
          - Both
          - .. _createpoolpoolattrsconnectstring:

            The Oracle database instance used by connections in the pool. The string can be an Easy Connect string, or a Net Service Name from a ``tnsnames.ora`` file, or the name of a local Oracle Database instance. See :ref:`Connection Strings
            <connectionstrings>` for examples.

            .. versionadded:: 2.1

                The alias ``connectionString``.
        * - ``walletPassword``
          - String
          - Thin
          - .. _createpoolpoolattrswalletpw:

            The password to decrypt the Privacy Enhanced Mail (PEM)-encoded private certificate, if it is encrypted.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``walletLocation``
          - String
          - Thin
          - .. _createpoolpoolattrswalletloc:

            The directory where the wallet can be found. In node-oracledb Thin mode, this must be the directory that contains the PEM-encoded wallet file.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``edition``
          - String
          - Thick
          - .. _createpoolpoolattrsedition:

            Sets the name used for :ref:`Edition-Based Redefinition <ebr>` by connections in the pool.

            This optional property overrides the :attr:`oracledb.edition` property.

            .. versionadded:: 2.2
        * - ``enableStatistics``
          - Boolean
          - Both
          - .. _createpoolpoolattrsstats:

            Recording of pool statistics can be enabled by setting ``enableStatistics`` to *true*. Statistics can be retrieved with :meth:`pool.getStatistics()`, or :meth:`pool.logStatistics()`. See :ref:`Connection Pool Monitoring <connpoolmonitor>`.

            The default value is *false*.

            .. versionadded:: 5.2

            The obsolete property ``_enableStats`` can still be used, but it will be removed in a future version of node-oracledb.
        * - ``events``
          - Boolean
          - Thick
          - .. _createpoolpoolattrsevents:

            Indicates whether Oracle Call Interface events mode should be enabled for this pool.

            This optional property overrides the :attr:`oracledb.events` property.

            .. versionadded:: 2.2
        * - ``externalAuth``
          - Boolean
          - Both
          - .. _createpoolpoolattrsexternalauth:

            Indicates whether pooled connections should be established using :ref:`External Authentication <extauth>`.

            The default is *false*.

            In Thin mode, when token-based authentication is required, this property must be set to *true*. In all the other cases where this property is set to *true*, an error is thrown.

            This optional property overrides the :attr:`oracledb.externalAuth` property.

            The ``user`` (or ``username``) and ``password`` properties should not be set when ``externalAuth`` is *true*.

            Note prior to node-oracledb 0.5 this property was called ``isExternalAuth``.
        * - ``homogeneous``
          - Boolean
          - Both
          - .. _createpoolpoolattrshomogeneous:

            Indicates whether connections in the pool all have the same credentials (a ‘homogeneous’ pool), or whether different credentials can be used (a ‘heterogeneous’ pool).

            The default is *true*.

            For the Thin mode, only homogeneous pools can be created. If this property is set to *false* in Thin mode, an error will be thrown.

            When set to *false* in Thick mode, the user name and password can be omitted from the ``connection.createPool()`` call, but will need to be given for subsequent ``pool.getConnection()`` calls. Different ``pool.getConnection()`` calls can provide different user credentials. Alternatively, when ``homogeneous`` is *false*, the user name (the ‘proxy’ user name) and password can be given, but subsequent ``pool.getConnection()`` calls can specify a different user name to access that user’s schema.

            Heterogeneous pools cannot be used with the :ref:`connection pool cache <connpoolcache>`. Applications should ensure the pool object is explicitly passed between code modules, or use a homogeneous pool and make use of :attr:`connection.clientId`.

            See :ref:`Heterogeneous Connection Pools and Pool Proxy Authentication <connpoolproxy>` for details and examples.

            .. versionadded:: 2.3
        * - ``password``
          - String
          - Both
          - .. _createpoolpoolattrspassword:

            The password of the database user used by connections in the pool. A password is also necessary if a proxy user is specified
            at pool creation.

            If ``homogeneous`` is *false*, then the password may be omitted at pool creation but given in subsequent ``pool.getConnection()`` calls.
        * - ``poolAlias``
          - String
          - Both
          - .. _createpoolpoolattrspoolalias:

            An optional property that is used to explicitly add pools to the connection pool cache. If a pool alias is provided, then the new pool will be added to the connection pool cache and the ``poolAlias`` value can then be used with methods that utilize the connection pool cache, such as :meth:`oracledb.getPool()` and :meth:`oracledb.getConnection()`.

            See :ref:`Connection Pool Cache <connpoolcache>` for details and examples.

            .. versionadded:: 1.11
        * - ``configDir``
          - String
          - Thin
          - .. _createpoolpoolattrsconfigdir:

            The directory in which the :ref:`tnsadmin` are found.

            For node-oracledb Thick mode, use the :meth:`oracledb.initOracleClient()` option :ref:`configDir <odbinitoracleclientattrsopts>` instead.

            .. versionadded:: 6.0
        * - ``sourceRoute``
          - String
          - Thin
          - .. _createpoolpoolattrssourceroute:

            Enables network routing through multiple protocol addresses. The value of this property can be ON or OFF.

            The default value is *ON*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslServerCertDN``
          - String
          - Thin
          - .. _createpoolpoolattrssslcert:

            The distinguished name (DN) that should be matched with the certificate DN. If not specified, a partial match is performed instead. A partial match matches the hostname that the client connected to against the common name (CN) of the certificate DN or the Subject Alternate Names (SAN) of the certificate.

            This value is ignored if the ``sslServerDNMatch`` property is not set to the value *True*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslServerDNMatch``
          - Boolean
          - Thin
          - .. _createpoolpoolattrssslmatch:

            Determines whether the server certificate DN should be matched in addition to the regular certificate verification that is performed.

            If the ``sslServerCertDN`` property is not provided, a partial DN match is performed instead. A partial match matches the hostname that the client connected to against the CN of the certificate DN or the SAN of the certificate.

            The default value is *True*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslAllowWeakDNMatch``
          - Boolean
          - Thin
          - .. _createpoolpoolattrssslallowweak:

            Enables the connection to use either a weaker or more secure DN matching behavior when the ``sslServerDNMatch`` property is set.

            If the value is *True*, then the ``sslServerDNMatch`` property uses a weaker DN matching behavior which only checks the server certificate (and not the listener certificate), and allows the service name to be used for partial DN matching. The DN matching for a partial match first matches the host name that the client connected to against the CN of the database server certificate DN or the SAN of the database server certificate. If this fails, then the service name is matched against the CN of the database server certificate DN.

            If the value is *False*, then the ``sslServerDNMatch`` property uses a more secure DN matching behavior which checks both the listener and server certificates, and does not allow a service name check for partial DN matching. The DN matching for a partial match matches the host name that the client connected to against the CN of the certificate DN or the SAN of the certificate. The service name is not checked in this case.

            The default value is *False*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.1
        * - ``httpsProxy``
          - String
          - Thin
          - .. _createpoolpoolattrshttpsproxy:

            The name or IP address of a proxy host to use for tunneling secure connections.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``httpsProxyPort``
          - Number
          - Thin
          - .. _createpoolpoolattrshttpsproxyport:

            The port to be used to communicate with the proxy host.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``retryCount``
          - Number
          - Thin
          - .. _createpoolpoolattrsretrycount:

            The number of times that a connection attempt should be retried before the attempt is terminated.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``retryDelay``
          - Number
          - Thin
          - .. _createpoolpoolattrsretrydelay:

            The number of seconds to wait before making a new connection attempt.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``connectTimeout``
          - Number
          - Thin
          - .. _createpoolpoolattrsconntimeout:

            The timeout duration in seconds for an application to establish an Oracle Net connection.

            There is no timeout by default.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``transportConnectTimeout``
          - Number
          - Thin
          - .. _createpoolpoolattrstransportconntimeout:

            The maximum number of seconds to wait to establish a connection to the database host.

            The default value is *60.0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``expireTime``
          - Number
          - Thin
          - .. _createpoolpoolattrsexpiretime:

            The number of minutes between the sending of keepalive probes. If this property is set to a value greater than zero, it enables the keepalive probes.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sdu``
          - Number
          - Thin
          - .. _createpoolpoolattrssdu:

            The Oracle Net Session Data Unit (SDU) packet size in bytes. The database server configuration should also set this parameter.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``connectionIdPrefix``
          - String
          - Thin
          - .. _createpoolpoolattrsprefix:

            The application specific prefix parameter that is added to the connection identifier.

            .. versionadded:: 6.0
        * - ``poolIncrement``
          - Number
          - Both
          - .. _createpoolpoolattrspoolincrement:

            The number of connections that are opened whenever a connection request exceeds the number of currently open connections.

            The default value is *1*.

            This optional property overrides the :attr:`oracledb.poolIncrement` property.
        * - ``poolMax``
          - Number
          - Both
          - .. _createpoolpoolattrspoolmax:

            The maximum number of connections to which a connection pool can grow.

            The default value is *4*.

            This optional property overrides the :attr:`oracledb.poolMax` property.

            Importantly, if you increase ``poolMax`` you should also increase the number of threads available to node-oracledb. See :ref:`Connections and Number of Threads <numberofthreads>`.

            See :ref:`Connection Pooling <connpooling>` for other pool sizing guidelines.
        * - ``poolMaxPerShard``
          - Number
          - Thick
          - .. _createpoolpoolattrspoolmaxpershard:

            Sets the maximum number of connections per shard for connection pools. This ensures that the pool is balanced towards each shard.

            This optional property overrides the :attr:`oracledb.poolMaxPerShard` property.

            .. versionadded:: 4.1
        * - ``poolMin``
          - Number
          - Both
          - .. _createpoolpoolattrspoolmin:

            The number of connections established to the database when a pool is created. Also this is the minimum number of connections that a pool maintains when it shrinks.

            The default value is *0*.

            This optional property overrides the :attr:`oracledb.poolMin` property.
        * - ``poolPingInterval``
          - Number
          - Both
          - .. _createpoolpoolattrspoolpinginterval:

            When a pool :meth:`pool.getConnection()` is called and the connection has been idle in the pool for at least ``poolPingInterval`` seconds, an internal “ping” will be performed first to check the validity of the connection.

            The default value is *60*.

            This optional property overrides the :attr:`oracledb.poolPingInterval` property.

            See :ref:`Connection Pool Pinging <connpoolpinging>` for more information.
        * - ``poolTimeout``
          - Number
          - Both
          - .. _createpoolpoolattrspooltimeout:

            The number of seconds after which idle connections (unused in the pool) may be terminated. Refer to :attr:`oracledb.poolTimeout` for details.

            The default value is *60*.

            This optional property overrides the :attr:`oracledb.poolTimeout` property.
        * - ``queueMax``
          - Number
          - Both
          - .. _createpoolpoolattrsqueuemax:

            The maximum number of pending ``pool.getConnection()`` calls that can be queued.

            When the number of ``pool.getConnection()`` calls that have been :ref:`queued <connpoolqueue>` waiting for an available connection reaches ``queueMax``, then any future ``pool.getConnection()`` calls will immediately return an error and will not be queued.

            If ``queueMax`` is -1, then the queue length is not limited.

            The default value is *500*.

            This optional property overrides the :attr:`oracledb.queueMax` property.

            .. versionadded:: 5.0
        * - ``queueRequests``
          - NA
          - NA
          - .. _createpoolpoolattrsqueuerequests:

            This property was removed in node-oracledb 3.0 and queuing was always enabled. From node-oracledb 5.0, set ``queueMax`` to 0 to disable queuing. See :ref:`Connection Pool Queue <connpoolqueue>` for more information.
        * - ``queueTimeout``
          - Number
          - Both
          - .. _createpoolpoolattrsqueuetimeout:

            The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If ``queueTimeout`` is set to 0, then queued connection requests are never terminated.

            The default value is *60000*.

            This optional property overrides the :attr:`oracledb.queueTimeout` property.
        * - ``sessionCallback``
          - String or Function
          - Both
          - .. _createpoolpoolattrssessioncallback:

            If the ``sessionCallback`` is a callback function::

              function sessionCallback(Connection connection, String requestedTag, function callback(Error error, Connection connection){})

            When ``sessionCallback`` is a Node.js function, each ``pool.getConnection()`` will select a connection from the pool and may invoke ``sessionCallback`` before returning. The ``sessionCallback`` function is called:

            -  when the pool selects a brand new, never used connection in the pool.
            -  if the pool selects a connection from the pool with a given :ref:`tag <getconnectiondbattrstag>` but that tag string value does not match the connection’s current, actual tag. The tag requested (if any) by ``pool.getConnection()`` is available in the ``requestedTag`` parameter. The actual tag in the connection selected by the pool is available in :attr:`connection.tag`.

            It will not be invoked for other ``pool.getConnection()`` calls.

            The session callback is called before ``pool.getConnection()`` returns so it can be used for logging or to efficiently set session state, such as with ALTER SESSION statements. Make sure any session state is set and ``connection.tag`` is updated in the ``sessionCallback`` function prior to it calling its own ``callback()`` function otherwise the session will not be correctly set when ``getConnection()`` returns. The connection passed into ``sessionCallback`` should be passed out through ``callback()`` so it is returned from the application’s ``pool.getConnection()`` call.

            When node-oracledb Thick mode is using Oracle Client libraries 12.2 or later, tags are `multi-property tags <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C>`__ with name=value pairs like “k1=v1;k2=v2”.

            When node-oracledb Thick mode is using Oracle Client libraries 12.2 or later, ``sessionCallback`` can be a string containing the name of a PL/SQL procedure to be called when ``pool.getConnection()`` requests a :ref:`tag <getconnectiondbattrstag>`, and that tag does not match the connection’s actual tag. When the application uses :ref:`DRCP connections <drcp>`, a PL/SQL callback can avoid the :ref:`round-trip <roundtrips>` calls that a Node.js function would require to set session state. For non-DRCP connections, the PL/SQL callback will require a round-trip from the application.

            The PL/SQL procedure declaration is:

            .. code-block:: sql

              PROCEDURE mycallback (
                desired_props IN  VARCHAR2,
                actual_props  IN  VARCHAR2
              );

            See :ref:`Connection Tagging and Session State <connpooltagging>` for more information.

            .. versionadded:: 3.1
        * - ``sodaMetaDataCache``
          - Boolean
          - Thick
          - .. _createpoolpoolattrssodamdcache:

            Indicates whether the pool’s connections should share a :ref:`cache of SODA metadata <sodamdcache>`. This improves SODA performance by reducing :ref:`round-trips <roundtrips>` to the database when opening collections. It has no effect on non-SODA operations.

            The default is *false*.

            There is no global equivalent for setting this attribute. SODA metadata caching is restricted to pooled connections only.

            Note that if the metadata of a collection is changed externally, the cache can get out of sync. If this happens, the cache can be cleared by calling ``pool.reconfigure({sodaMetadataCache: false})``. See :meth:`pool.reconfigure()`.

            A second call to ``reconfigure()`` should then be made to re-enable the cache.

            .. versionadded:: 5.2

            It requires Oracle Client 21.3 (or later). The feature is also available in Oracle Client 19c from 19.11 onward.
        * - ``stmtCacheSize``
          - Number
          - Both
          - .. _createpoolpoolattrsstmtcachesize:

            The number of statements to be cached in the :ref:`statementcache <stmtcache>` of each connection in the pool.

            This optional property overrides the :attr:`oracledb.stmtCacheSize` property.
        * - ``user``, ``username``
          - String
          - Both
          - .. _createpoolpoolattrsuser:

            The two properties are aliases for each other. Use only one of the properties.

            The database user name for connections in the pool. Can be a simple user name or a proxy of the form *alison[fred]*. See the `Client Access Through a Proxy <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC>`__ section in the Oracle Call Interface manual for more details about proxy authentication.

            If ``homogeneous`` is *false*, then the pool user name and password need to be specified only if the application wants that user to proxy the users supplied in subsequent ``pool.getConnection()`` calls.

            .. versionadded:: 5.2

                The alias ``username``.

    **createPool(): accessToken Object Properties**

    The properties of the ``accessToken`` object are:

    .. _accesstokenproperties:

    .. list-table-with-summary::  createPool(): ``accessToken`` Object Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 55
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - Attribute
          - Description
        * - ``token``
          - The database authentication token.
        * - ``privateKey``
          - The database authentication private key.

    The ``token`` and ``privateKey`` values can be obtained using various
    approaches. For example the Oracle Cloud Infrastructure Command Line
    Interface can be used.

    **createPool(): refresh Parameter**

    The ``refresh`` parameter values are:

    .. _refresh:

    .. list-table-with-summary::  createPool(): ``refresh`` Parameter Values
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - ``refresh`` Value
          - Description
        * - *false*
          - The application can return a token from an application-specific cache. If there is no cached token, the application must externally acquire one.
        * - *true*
          - The token previously passed to driver is known to be expired, the application should externally acquire a new token.

    **Callback**:

    If you are using the callback programming style::

        createPool(Object poolAttrs, function(Error error, Pool pool){});

    See :ref:`createpoolparams` for information on the ``poolAttrs``
    parameter.

    The parameters of the callback function
    ``function(Error error, Pool pool)`` are:

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
          - If ``createPool()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - Pool ``pool``
          - The newly created connection pool. If ``createPool()`` fails, ``pool`` will be NULL. If the pool will be accessed via the :ref:`pool cache <connpoolcache>`, this parameter can be omitted. See :ref:`Pool class <poolclass>` for more information.

.. method:: oracledb.getConnection()

    **Promise**::

        promise = getConnection([String poolAlias | Object connAttrs]);

    Obtains a connection from a pool in the :ref:`connection pool
    cache <connpoolcache>` or creates a new, standalone, non-pooled
    connection.

    For situations where connections are used infrequently, creating a
    standalone connection may be more efficient than creating and managing a
    connection pool. However, in most cases, Oracle recommends getting
    connections from a :meth:`connection pool <oracledb.createPool()>`.

    Note: It is recommended to explicitly close a connection. If not, you may
    experience a short delay when the application terminates. This is
    due to the timing behavior of Node.js garbage collection which needs
    to free the connection reference.

    The following table shows the various signatures that can be used when
    invoking ``getConnection`` and describes how the function will behave as
    a result.

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the signature. The second column
         displays how the function behaves based on the signature.

        * - Signature
          - Description
        * - ``oracledb.getConnection()``
          - Gets a connection from the previously created default pool. Returns a promise.
        * - ``oracledb.getConnection(callback)``
          - Gets a connection from the previously created default pool. Invokes the callback.
        * - ``oracledb.getConnection(poolAlias)``
          - Gets a connection from the previously created pool with the specified ``poolAlias``. Returns a promise.
        * - ``oracledb.getConnection(poolAlias, callback)``
          - Gets a connection from the previously created pool with the specified ``poolAlias``. Invokes the callback.
        * - ``oracledb.getConnection(connAttrs)``
          - Creates a standalone, non-pooled connection. Returns a promise.
        * - ``oracledb.getConnection(connAttrs, callback)``
          - Creates a standalone, non-pooled connection. Invokes the callback.

    Note if the application opens a number of connections, you should
    increase the number of threads available to node-oracledb. See
    :ref:`Connections and Number of Threads <numberofthreads>`.

    From node-oracledb 3.1.0, a non-pooled ``oracledb.getConnection()`` call
    will return a *DPI-1047* error if node-oracledb cannot load Oracle
    Client libraries. Previous versions threw this error from
    ``require('oracledb')``.

    See :ref:`Connection Handling <connectionhandling>` for more information
    on connections.

    The parameters of the ``oracledb.getConnection()`` method are:

    .. _getconnectiondbattrs:

    .. list-table-with-summary:: oracledb.getConnection() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the property. The second column
         displays the data type of the property. The third column displays
         the description of the property.

        * - Parameter
          - Data Type
          - Description
        * - ``poolAlias``
          - String
          - .. _getconnectionpoolalias:

            Specifies which previously created pool in the :ref:`connection pool cache <connpoolcache>` to use to obtain the connection.
        * - ``connAttrs``
          - Object
          - .. _getconnectiondbattrsconnattrs:

            The ``connAttrs`` parameter object provides connection credentials and connection-specific configuration properties.

            Any ``connAttrs`` properties that are not used by the ``getConnection()`` method are ignored.

            See :ref:`connattrsparams` for information on the properties of the ``connAttrs`` object.

    The properties of the ``connAttrs`` object are:

    .. _connattrsparams:

    .. list-table-with-summary:: getConnection(): ``connAttrs`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 5 7 12 22
        :summary: The first column, Property, displays the property. The second column, Type, displays the data type of the property. The third column, Mode, displays whether the property can be used in the node-oracledb Thin mode, node-oracledb Thick mode, or both node-oracledb modes. The fourth column, Description, displays the description of the property.

        * - Property
          - Data Type
          - node-oracledb Mode
          - Description
        * - ``accessToken``
          - Function, String, or Object
          - Both
          - .. _getconnectiondbattrsaccesstoken:

            For Microsoft Azure Active Directory OAuth 2.0 token-based authentication ``accessToken`` can be:

            -  a callback function returning the token as a string
            -  or the token as a string

            For OAuth 2.0, tokens can be obtained using various approaches. For example, using the Azure Active Directory API.

            For Oracle Cloud Infrastructure Identity and Access Management (IAM) token-based authentication ``accessToken`` can be:

            -  an object containing ``token`` and ``privateKey`` attributes
            -  or a callback function returning an object containing ``token`` and ``privateKey`` attributes

            For OCI IAM, the ``token`` and ``privateKey`` values can be obtained using various approaches. For example the Oracle Cloud Infrastructure Command Line Interface can be used.

            The properties of the ``accessToken`` object are described in :ref:`accesstokenobjproperties`.

            If the ``accessToken`` is a callback function::

              function accessToken(boolean refresh)

            When ``accessToken`` is a callback function, the returned token is used by node-oracledb for authentication. The ``refresh`` parameter is described in :ref:`getconnectionrefresh`.

            For each connection, the callback is invoked with the ``refresh`` parameter set to *false*. This indicates that the application can provide a token from its own application managed cache, or it can generate a new token if there is no cached value. Node-oracledb checks whether the returned token has expired. If it has expired, then the callback function will be invoked a second time with ``refresh`` set to *true*. In this case the function must externally acquire a token, optionally add it to the application’s cache, and return the token.

            For token-based authentication, the ``externalAuth`` connection attribute must be set to *true*. The ``user`` (or ``username``) and ``password`` attributes should not be set.

            See :ref:`Token-Based Authentication <tokenbasedauthentication>` for more information.

            The ``accessToken`` attribute was added in node-oracledb 5.4 to support IAM token-based authentication. In this release the attribute must be an Object. For node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) must be used for IAM token-based authentication.

            The ``accessToken`` attribute was extended to allow OAuth 2.0 token-based authentication in node-oracledb 5.5. For OAuth 2.0, the attribute should be a string, or a callback. For node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. The callback usage supports both OAuth 2.0 and IAM token-based authentication.
        * - ``connectString``, ``connectionString``
          - String
          - Both
          - .. _getconnectiondbattrsconnectstring:

            The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a ``tnsnames.ora`` file, or the name of a local Oracle database instance. See :ref:`Connection Strings <connectionstrings>` for examples.

            The two properties are aliases for each other. Use only one of the properties.

            .. versionadded:: 2.1

                The alias ``connectionString``.
        * - ``walletPassword``
          - String
          - Thin
          - .. _getconnectiondbattrswalletpw:

            The password to decrypt the Privacy Enhanced Mail (PEM)-encoded private certificate, if it is encrypted.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``walletLocation``
          - String
          - Thin
          - .. _getconnectiondbattrswalletloc:

            The directory where the wallet can be found. In node-oracledb Thin mode, this must be the directory that contains the PEM-encoded wallet file.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``edition``
          - String
          - Thick
          - .. _getconnectiondbattrsedition:

            Sets the name used for :ref:`Edition-Based Redefinition <ebr>` by this connection.

            This optional property overrides the :attr:`oracledb.edition` property.

            .. versionadded:: 2.2
        * - ``events``
          - Boolean
          - Thick
          - .. _getconnectiondbattrsevents:

            Determines if the standalone connection is created using Oracle Call Interface events mode.

            This optional property overrides the :attr:`oracledb.events` property.

            .. versionadded:: 2.2
        * - ``externalAuth``
          - Boolean
          - Both
          - .. _getconnectiondbattrsexternalauth:

            If this optional property is set to *true* in Thick mode, then the connection will be established using :ref:`External Authentication <extauth>`.

            In Thin mode, when token-based authentication is required, this property must be set to *true*. In all the other cases where this property is set to *true*, an error is thrown.

            This optional property overrides the :attr:`oracledb.externalAuth` property.

            The ``user`` (or ``username``) and ``password`` properties should not be set when ``externalAuth`` is *true*.

            Note prior to node-oracledb 0.5 this property was called ``isExternalAuth``.
        * - ``matchAny``
          - Boolean
          - Thick
          - .. _getconnectiondbattrsmatchany:

            Used in conjunction with :ref:`tag <getconnectiondbattrstag>` when getting a connection from a :ref:`connection pool <poolclass>`.

            Indicates that the tag in a connection returned from a connection pool may not match the requested tag.

            See :ref:`Connection Tagging and Session State <connpooltagging>`.

            .. versionadded:: 3.1
        * - ``newPassword``
          - String
          - Both
          - .. _getconnectiondbattrsnewpassword:

            The new password to use for the database user. When using ``newPassword``, the :ref:`password <getconnectiondbattrspassword>` property should be set to the current password.

            This allows passwords to be changed at the time of connection, in particular it can be used to connect when the old password has expired.

            See :ref:`Changing Passwords and Connecting with an Expired Password <changingpassword>`.

            .. versionadded:: 2.2
        * - ``poolAlias``
          - String
          - Both
          - .. _getconnectiondbattrspoolalias:

            Specifies which previously created pool in the :ref:`connection pool cache <connpoolcache>` to obtain the connection from. See :ref:`Pool Alias <getconnectionpoolalias>`.
        * - ``configDir``
          - String
          - Thin
          - .. _getconnectiondbattrsconfigdir:

            The directory in which the :ref:`tnsadmin` are found.

            For node-oracledb Thick mode, use the :meth:`oracledb.initOracleClient()` option :ref:`configDir <odbinitoracleclientattrsopts>` instead.

            .. versionadded:: 6.0
        * - ``sourceRoute``
          - String
          - Thin
          - .. _getconnectiondbattrssourceroute:

            Enables network routing through multiple protocol addresses. The value of this property can be ON or OFF.

            The default value is *ON*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslServerCertDN``
          - String
          - Thin
          - .. _getconnectiondbattrssslcert:

            The distinguished name (DN) that should be matched with the certificate DN. If not specified, a partial match is performed instead. A partial match matches the hostname that the client connected to against the common name (CN) of the certificate DN or the Subject Alternate Names (SAN) of the certificate.

            This value is ignored if the ``sslServerDNMatch`` property is not set to the value *True*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslServerDNMatch``
          - Boolean
          - Thin
          - .. _getconnectiondbattrssslmatch:

            Determines whether the server certificate DN should be matched in addition to the regular certificate verification that is performed.

            If the ``sslServerCertDN`` property is not provided, a partial DN match is performed instead. A partial match matches the hostname that the client connected to against the CN of the certificate DN or the SAN of the certificate.

            The default value is *True*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sslAllowWeakDNMatch``
          - Boolean
          - Thin
          - .. _getconnectiondbattrssslallowweak:

            Enables the connection to use either a weaker or more secure DN matching behavior when the ``sslServerDNMatch`` property is set.

            If the value is *True*, then the ``sslServerDNMatch`` property uses a weaker DN matching behavior which only checks the server certificate (and not the listener certificate), and allows the service name to be used for partial DN matching. The DN matching for a partial match first matches the host name that the client connected to against the common name (CN) of the database server certificate DN or the Subject Alternate Names (SAN) of the database server certificate. If this fails, then the service name is matched against the CN of the database server certificate DN.

            If the value is *False*, then the ``sslServerDNMatch`` property uses a more secure DN matching behavior which checks both the listener and server certificates, and does not allow a service name check for partial DN matching. The DN matching for a partial match matches the host name that the client connected to against the CN of the certificate DN or the SAN of the certificate. The service name is not checked in this case.

            The default value is *False*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.1
        * - ``httpsProxy``
          - String
          - Thin
          - .. _getconnectiondbattrshttpsproxy:

            The name or IP address of a proxy host to use for tunneling secure connections.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``httpsProxyPort``
          - Number
          - Thin
          - .. _getconnectiondbattrshttpsproxyport:

            The port to be used to communicate with the proxy host.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``debugJdwp``
          - String
          - Thin
          - .. _getconnectiondbattrsdebugjdwp:

            Specifies the host and port of the PL/SQL debugger with the format *host=<host>;port=<port>*. This allows using the Java Debug Wire Protocol (JDWP) to debug PL/SQL code called by node-oracledb.

            The default value is the value of environment variable ``ORA_DEBUG_JDWP``.

            For node-oracledb Thick mode, set the ``ORA_DEBUG_JDWP`` environment variable with the same syntax instead. See :ref:`applntracing`.

            .. versionadded:: 6.0
        * - ``retryCount``
          - Number
          - Thin
          - .. _getconnectiondbattrsretrycount:

            The number of times that a connection attempt should be retried before the attempt is terminated.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``retryDelay``
          - Number
          - Thin
          - .. _getconnectiondbattrsretrydelay:

            The number of seconds to wait before making a new connection attempt.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``connectTimeout``
          - Number
          - Thin
          - .. _getconnectiondbattrsconntimeout:

            The timeout duration in seconds for an application to establish an Oracle Net connection.

            There is no timeout by default.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``transportConnectTimeout``
          - Number
          - Thin
          - .. _getconnectiondbattrstransportconntimeout:

            The maximum number of seconds to wait to establish a connection to the database host.

            The default value is *60.0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``expireTime``
          - Number
          - Thin
          - .. _getconnectiondbattrsexpiretime:

            The number of minutes between the sending of keepalive probes. If this property is set to a value greater than zero, it enables the keepalive probes.

            The default value is *0*.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``sdu``
          - Number
          - Thin
          - .. _getconnectiondbattrssdu:

            The Oracle Net Session Data Unit (SDU) packet size in bytes. The database server configuration should also set this parameter.

            For node-oracledb Thick mode, use an :ref:`Easy Connect string <easyconnect>` or a :ref:`Connect Descriptor string <embedtns>` instead.

            .. versionadded:: 6.0
        * - ``connectionIdPrefix``
          - String
          - Thin
          - .. _getconnectiondbattrsprefix:

            The application specific prefix parameter that is added to the connection identifier.

            .. versionadded:: 6.0
        * - ``password``
          - String
          - Both
          - .. _getconnectiondbattrspassword:

            The password of the database user. A password is also necessary if a proxy user is specified.
        * - ``privilege``
          - Number
          - Both
          - .. _getconnectiondbattrsprivilege:

            The privilege to use when establishing connection to the database. This optional property should be one of the :ref:`privileged connection constants <oracledbconstantsprivilege>`. Multiple privileges may be used by when required, for example ``oracledb.SYSDBA | oracledb.SYSPRELIM``.

            See :ref:`Privileged Connections <privconn>` for more information.

            Note only non-pooled connections can be privileged.

            .. versionadded:: 2.1
        * - ``shardingKey``
          - Array
          - Thick
          - .. _getconnectiondbattrsshardingkey:

            Allows a connection to be established directly to a database shard. See :ref:`Connecting to Sharded Databases <sharding>`.

            Array values may be of String type (mapping to VARCHAR2 sharding keys), Number (NUMBER), Date (DATE), or Buffer (RAW). Multiple types may be used in the array. Sharding keys TIMESTAMP type are not supported.

            .. versionadded:: 4.1
        * - ``stmtCacheSize``
          - Number
          - Both
          - .. _getconnectiondbattrsstmtcachesize:

            The number of statements to be cached in the :ref:`statement cache <stmtcache>` of each connection. This optional property may be used to override the :attr:`oracledb.stmtCacheSize` property.
        * - ``superShardingKey``
          - Array
          - Thick
          - .. _getconnectiondbattrssupershardingkey:

            Allows a connection to be established directly to a database shard. See :ref:`Connecting to Sharded Databases <sharding>`.

            Array values may be of String type (mapping to VARCHAR2 sharding keys), Number (NUMBER), Date (DATE), or Buffer (RAW). Multiple types may be used in the array. Sharding keys TIMESTAMP type are not supported.

            .. versionadded:: 4.1
        * - ``tag``
          - String
          - Thick
          - .. _getconnectiondbattrstag:

            Used when getting a connection from a :ref:`connection pool <poolclass>`.

            Indicates the tag that a connection returned from a connection pool should have. Various heuristics determine the tag that is actually returned, see :ref:`Connection Tagging and Session State <connpooltagging>`.

            .. versionadded:: 3.1
        * - ``user``, ``username``
          - String
          - Both
          - .. _getconnectiondbattrsuser:

            The two properties are aliases for each other. Use only one of the properties.

            The database user name. Can be a simple user name or a proxy of the form *alison[fred]*. See the `Client Access Through a Proxy <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC>`__ section in the Oracle Call Interface manual for more details about proxy authentication.

            .. versionadded:: 5.2

                The alias ``username``.

    **getConnection(): accessToken Object Properties**

    The properties of the ``accessToken`` object are described below.

    .. _accesstokenobjproperties:

    .. list-table-with-summary::  getConnection(): ``accessToken`` Object Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 55
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - Attribute
          - Description
        * - ``token``
          - The database authentication token.
        * - ``privateKey``
          - The database authentication private key.

    **getConnection(): refresh Parameter**

    .. _getconnectionrefresh:

    .. list-table-with-summary::  getConnection(): ``refresh`` Parameter Values
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - ``refresh`` Value
          - Description
        * - *false*
          - The application can return a token from an application-specific cache. If there is no cached token, the application must externally acquire one.
        * - *true*
          - The token previously passed to driver is known to be expired, the application should externally acquire a new token.

    **Callback**:

    If you are using the callback programming style::

        getConnection([String poolAlias | Object connAttrs], function(Error error, Connection connection){});

    See :ref:`getconnectiondbattrs` for information on the ``poolAlias``
    and ``connAttrs`` parameters.

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
          - The newly created connection. If ``getConnection()`` fails, connection will be NULL. See :ref:`Connection class <connectionclass>` for more details.

.. method:: oracledb.getPool()

    .. code-block:: javascript

        getPool([String poolAlias]);

    Retrieves a previously created pool from the :ref:`connection pool
    cache <connpoolcache>`. Note that this is a synchronous method.

    The parameters of the ``oracledb.getPool()`` method are:

    .. _getpoolattrs:

    .. list-table-with-summary:: oracledb.getPool() Parameters
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
        * - ``alias``
          - String
          - The pool alias of the pool to retrieve from the connection pool cache. The default value is ‘default’ which will retrieve the default pool from the cache.

.. method:: oracledb.initOracleClient()

    .. versionadded:: 5.0

    .. code-block:: javascript

        initOracleClient([Object options]);

    **From node-oracledb 6.0**, this synchronous function enables node-oracledb
    Thick mode by initializing the Oracle Client library (see
    :ref:`enablingthick`). This method must be called before any standalone
    connection or pool is created. If a connection or pool is first created
    in Thin mode, then ``initOracleClient()`` will raise an exception and
    Thick mode will not be enabled. If the first call to
    ``initOracleClient()`` had an incorrect path specified, then a second
    call with the correct path will work. The ``initOracleClient()`` method
    can be called multiple times in each Node.js process as long as the
    arguments are the same each time.

    **In node-oracledb 5.5 and earlier versions**, this synchronous function
    loads and initializes the :ref:`Oracle Client libraries <architecture>`
    that are necessary for node-oracledb to communicate with Oracle Database.
    This function is optional. If used, it should be the first node-oracledb
    call made by an application. If ``initOracleClient()`` is not called, then
    the Oracle Client libraries are loaded at the time of first use in the
    application, such as when creating a connection pool. The default values
    described for :ref:`options <odbinitoracleclientattrsopts>` will be used
    in this case. If the Oracle Client libraries cannot be loaded, or they
    have already been initialized, either by a previous call to this function
    or because another function call already required the Oracle Client
    libraries, then ``initOracleClient()`` raises an exception.

    See :ref:`initnodeoracledb` for more information.

    The parameters of the ``oracledb.initOracleClient()`` method are:

    .. _odbinitoracleclientattrs:

    .. list-table-with-summary:: oracledb.initOracleClient() Parameters
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
          - The options parameter and option attributes are optional. If an attribute is set, it should be a string value. See :ref:`odbinitoracleclientattrsopts` for information on the ``options`` attributes.

    The properties of the ``options`` parameter are:

    .. _odbinitoracleclientattrsopts:

    .. list-table-with-summary::  initOracleClient(): ``options`` Parameter Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 30
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - Attribute
          - Description
        * - ``configDir``
          - This specifies the directory in which the :ref:`Optional Oracle Net Configuration <tnsadmin>` and :ref:`Optional Oracle Client Configuration <oraaccess>` files reside.

            It is equivalent to setting the Oracle environment variable ``TNS_ADMIN`` to this value. Any value in that environment variable prior to the call to ``oracledb.initOracleClient()`` is ignored. On Windows, remember to double each backslash used as a directory separator.

            If ``configDir`` is not set, Oracle’s default configuration file :ref:`search heuristics <tnsadmin>` are used.
        * - ``driverName``
          - This specifies the driver name value shown in database views, such as ``V$SESSION_CONNECT_INFO``.

            It can be used by applications to identify themselves for tracing and monitoring purposes. The convention is to separate the product name from the product version by a colon and single space characters.

            If this attribute is not specified, then the default value in node-oracledb Thick mode is like “node-oracledb thk : version”. See :ref:`Other Node-oracledb Initialization <otherinit>`.
        * - ``errorUrl``
          - This specifies the URL that is included in the node-oracledb exception message if the Oracle Client libraries cannot be loaded.

            This allows applications that use node-oracledb to refer users to application-specific installation instructions.

            If this attribute is not specified, then the :ref:`node-oracledb installation instructions <installation>` are used. See :ref:`Other Node-oracledb Initialization <otherinit>`.
        * - ``libDir``
          - This specifies the directory containing the Oracle Client libraries.

            If ``libDir`` is not specified, the default library search mechanism is used.

            If your client libraries are in a full Oracle Client or Oracle Database installation, such as `Oracle Database “XE” Express Edition <https://www.oracle.com/database/technologies/appdev/xe.html>`__, then you must have previously set environment variables like ``ORACLE_HOME`` before calling ``initOracleClient()``. On Windows, remember to double each backslash used as a directory separator. See :ref:`Locating the Oracle Client Libraries <enablingthick>`.

    On Linux, ensure a ``libclntsh.so`` file exists. On macOS ensure a
    ``libclntsh.dylib`` file exists. Node-oracledb will not directly load
    ``libclntsh.*.XX.1`` files in ``libDir``. Note other libraries used by
    ``libclntsh*`` are also required.

    On Linux, using ``libDir`` is only useful for forcing
    ``initOracleClient()`` to immediately load the Oracle Client libraries
    because those libraries still need to be in the operating system search
    path, such as from running ``ldconfig`` or set in the environment
    variable ``LD_LIBRARY_PATH``.

.. method:: oracledb.shutdown()

    .. versionadded:: 5.0

    **Promise**::

        promise = shutdown([Object connAttr [, Number shutdownMode]]);

    This is the simplified form of :meth:`connection.shutdown()` used for
    shutting down a database instance. It accepts connection credentials and
    shuts the database instance completely down.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    Internally it creates, and closes, a standalone connection using the
    :ref:`oracledb.SYSOPER <oracledbconstantsprivilege>` privilege.

    See :ref:`Database Start Up and Shut Down <startupshutdown>`.

    The parameters of the ``oracledb.shutdown()`` method are:

    .. _odbshutdownattrs:

    .. list-table-with-summary:: oracledb.shutdown() Parameters
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
        * - ``connAttr``
          - Object
          - .. _odbshutdownattrsconn:

            Connection credentials similar to :ref:`oracledb.getConnection() credentials <getconnectiondbattrsconnattrs>`. The properties ``user``, ``username`` ``password``, ``connectString``, ``connectionString``, and ``externalAuth`` may be specified.
        * - ``shutdownMode``
          - Number
          - .. _odbshutdownattrsmode:

            :ref:`oracledb.SHUTDOWN_MODE_ABORT <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_DEFAULT <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_IMMEDIATE <oracledbconstantsshutdown>`, :ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL <oracledbconstantsshutdown>`, or :ref:`oracledb.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL <oracledbconstantsshutdown>`.

            The default mode is :ref:`oracledb.SHUTDOWN_MODE_DEFAULT <oracledbconstantsshutdown>`.

    **Callback**:

    If you are using the callback programming style::

        shutdown([Object connAttr, [Number shutdownMode, ] ] function(Error error) {});

    See :ref:`odbshutdownattrs` for information on the parameters.

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
          - If ``shutdown()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: oracledb.startup()

    .. versionadded:: 5.0

    **Promise**::

        promise = startup([Object connAttrs [, Object options ]]);

    This is the simplified form of :meth:`connection.startup()` used for
    starting a database instance up. It accepts connection credentials and
    starts the database instance completely.

    .. note::

        This method is only supported in node-oracledb Thick mode. See
        :ref:`enablingthick`.

    As part of the start up process, a standalone connection using the
    :ref:`oracledb.SYSOPER <oracledbconstantsprivilege>` privilege is
    internally created and closed.

    See :ref:`Database Start Up and Shut Down <startupshutdown>`.

    The parameters of the ``oracledb.startup()`` method are:

    .. _odbstartupattrs:

    .. list-table-with-summary:: oracledb.startup() Parameters
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
        * - ``connAttr``
          - Object
          - .. _odbstartupattrsconn:

            Connection credentials similar to :ref:`oracledb.getConnection() credentials <getconnectiondbattrsconnattrs>`. The properties ``username``, ``password``, ``connectString``, ``connectionString``, and ``externalAuth`` may be specified.
        * - ``options``
          - Object
          - .. _odbstartupattrsoptions:

            The optional ``options`` object can contain one or more of the properties listed in :ref:`odbstartupattrsoptionsproperties`.

    The properties of the ``options`` property are:

    .. _odbstartupattrsoptionsproperties:

    .. list-table-with-summary::  startup(): ``options`` Parameter Properties
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the attribute. The second column
         displays the description of the attribute.

        * - Attribute
          - Data Type
          - Description
        * - ``force``
          - Boolean
          - Shuts down a running database using :ref:`oracledb.SHUTDOWN_MODE_ABORT <oracledbconstantsshutdown>` before restarting the database. The database start up may require instance recovery. The default for ``force`` is *false*.
        * - ``restrict``
          - Boolean
          - After the database is started, access is restricted to users who have the CREATE_SESSION and RESTRICTED SESSION privileges. The default is *false*.
        * - ``pfile``
          - String
          - The path and filename for a text file containing `Oracle Database initialization parameters <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8BAD86FC-27C5-4103-8151-AC5BADF274E3>`__. If ``pfile`` is not set, then the database server-side parameter file is used.

    **Callback**:

    If you are using the callback programming style::

        startup([Object connAttrs, [Object options, ] ] function(Error error) {});

    See :ref:`odbstartupattrs` for information on the ``connAttrs`` and ``options``
    parameters.

    The parameters of the callback function ``function(Error error)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
         The second column displays the description of the parameter.

        * - Callback function parameter
          - Description
        * - Error ``error``
          - If ``startup()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
