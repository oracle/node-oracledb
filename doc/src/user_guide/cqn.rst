.. _cqn:

***********************************
Continuous Query Notification (CQN)
***********************************

`Continuous Query Notification (CQN) <https://www.oracle.com/pls/topic/
lookup?ctx=dblatest&id=GUID-373BAF72-3E63-42FE-8BEA-8A2AEFBF1C35>`__
lets node-oracledb applications subscribe to receive notification when
changed data is committed to the database, regardless of the user or the
application that made the change. For example your application may be
interested in knowing if a table used for lookup data has changed so
that the application can update a local cache of that table. CQN can
invoke a JavaScript method, which can perform the action.

CQN is suitable for infrequently modified tables. It is recommended to
avoid frequent subscription and unsubscription.

By default, CQN requires the database to be able to connect back to the
node-oracledb application for notifications to be received. This
typically means that the machine running node-oracledb needs a fixed IP
address. Note ``connection.subscribe()`` does not verify that this
reverse connection is possible. If there is any problem sending a
notification, then the callback method will not be invoked. The
configuration options can include an
:ref:`ipAddress <consubscribeoptipaddress>` and
:ref:`port <consubscribeoptport>` on which to listen for
notifications, otherwise the database chooses values.

Alternatively, when using Oracle Database and Oracle client libraries
19.4, or later, subscriptions can set the optional
:ref:`clientInitiated <consubscribeoptclientinitiated>` property to
*true*. This makes CQN internally use the same approach as normal
connections to the database, and does not require the database to be
able to connect back to the application. Since client initiated CQN
notifications do not need additional network configuration, they have
ease-of-use and security advantages.

To register interest in database changes, the connection must be created
with :attr:`oracledb.events` mode *true*. Then the
:meth:`connection.subscribe()` method is passed an
arbitrary name and an :ref:`options <consubscribeoptions>` object that
controls notification. In particular ``options`` contains a valid SQL
query and a JavaScript callback:

.. code:: javascript

   const connection = await oracledb.getConnection({
       user          : "hr",
       password      : mypw,  // mypw contains the hr schema password
       connectString : "localhost/XEPDB1",
       events        : true
   });

   function myCallback(message) {
       console.log(message);
   }

   const options = {
       sql      : `SELECT * FROM mytable`,  // query of interest
       callback : myCallback                // method called by notifications
       clientInitiated : true               // For Oracle DB & Client 19.4 or later
   };

   await connection.subscribe('mysub', options);

In this example, whenever a change to ``mytable`` is committed then
``myCallback()`` is invoked. The callback
:ref:`message <consubscribeoptcallback>` parameter contains
information about the notification.

CQN notification behavior is widely configurable by the subscription
:ref:`options <consubscribeoptions>`. Choices include specifying what
types of SQL should trigger a notification, whether notifications should
survive database loss, and control over unsubscription. You can also
choose whether notification messages will include ROWIDs of affected
rows.

The ``connection.subscribe()`` method may be called multiple times with
the same ``name``. In this case, the second and subsequent invocations
ignore all ``options`` properties other than
:ref:`sql <consubscribeoptsql>` and
:ref:`binds <consubscribeoptbinds>`. Instead, the new SQL statement is
registered to the same subscription, and the same JavaScript
notification callback is used. For performance reasons this can be
preferable to creating a new subscription for each query.

You can view information about registrations by querying views such
``USER_CHANGE_NOTIFICATION_REGS`` table. The ``REGID`` column can be
matched with the value contained in :ref:`regid <consubscribecallback>`
from the ``connection.subscribe()`` callback parameter. In the database view
``USER_SUBSCR_REGISTRATIONS``, the ``REG_ID`` column can be matched.

When notifications are no longer required, the subscription name can be
passed to :meth:`connection.unsubscribe()`.

By default, object-level (previously known as Database Change
Notification) occurs and the JavaScript notification method is invoked
whenever a database transaction is committed that changes an object the
query references, regardless of whether the actual query result changed.
However if the subscription option :ref:`qos <consubscribeoptqos>` is
:ref:`oracledb.SUBSCR_QOS_QUERY <oracledbconstantssubscription>` then
query-level notification occurs. In this mode, the database notifies the
application whenever a transaction changes the result of the registered
query and commits. For example:

.. code:: javascript

   const options = {
       sql      : `SELECT * FROM mytable WHERE key > 100`,  // query of interest
       callback : myCallback,                               // method called by notifications
       qos      : oracledb.SUBSCR_QOS_QUERY                 // CQN
   };

In this example, if a new ``key`` of 10 was inserted then no
notification would be generated. If a key wth ``200`` was inserted, then
a notification would occur.

Before using CQN, users must have appropriate permissions, for example:

.. code:: sql

   SQL> CONNECT system

   SQL> GRANT CHANGE NOTIFICATION TO hr;

Below is an example of CQN that uses object-level notification and
grouped notifications in batches at 10 second intervals. After 60
seconds, the notification callback is unregistered and no more
notifications will occur. The quality of service flags indicate ROWIDs
should be returned in the callback:

.. code:: javascript

   let interval = setInterval(function() {
       console.log("waiting...");
   }, 5000);

   function myCallback(message)
   {
       console.log("Message type:", message.type);
       if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
           clearInterval(interval);
           console.log("Deregistration has taken place...");
           return;
       }
       console.log("Message database name:", message.dbName);
       console.log("Message transaction id:", message.txId);
       for (const table of message.tables) {
           console.log("--> Table Name:", table.name);
           console.log("--> Table Operation:", table.operation);
           if (table.rows) {
               for (const row of table.rows) {
                   console.log("--> --> Row Rowid:", row.rowid);
                   console.log("--> --> Row Operation:", row.operation);
                   console.log(Array(61).join("-"));
               }
           }
           console.log(Array(61).join("="));
       }
   }

   const options = {
       sql           : `SELECT * FROM mytable`,
       callback      : myCallback,
       timeout       : 60,
       qos           : oracledb.SUBSCR_QOS_ROWIDS,
       groupingClass : oracledb.SUBSCR_GROUPING_CLASS_TIME,
       groupingValue : 10,
       groupingType  : oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
   };

   try {
       // This is Node 8 syntax, but can be changed to callbacks

       const connection = await oracledb.getConnection({
         user          : "hr",
         password      : mypw,  // mypw contains the hr schema password
         connectString : "localhost/XEPDB1",
         events        : true
       });

       await connection.subscribe('mysub', options);
       console.log("Subscription created...");

   } catch (err) {
       console.error(err);
       clearInterval(interval);
   }

If two new rows were inserted into the table and then committed, output
might be like::

   Message type: 6
   Message database name: orcl
   Message transaction id: <Buffer 06 00 21 00 f5 0a 00 00>
   --> Table Name: CJ.MYTABLE
   --> Table Operation: 2
   --> --> Row Rowid: AAAVH6AAMAAAAHjAAW
   --> --> Row Operation: 2
   ------------------------------------------------------------
   --> --> Row Rowid: AAAVH6AAMAAAAHjAAX
   --> --> Row Operation: 2
   ------------------------------------------------------------

Here, the message type 6 corresponds to
:ref:`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE <oracledbconstantssubscription>`
and the row operations of 2 correspond to
:ref:`oracledb.CQN_OPCODE_INSERT <oracledbconstantscqn>`.

There are runnable examples in the GitHub
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
directory.
