.. _aq:

****************************
Oracle Advanced Queuing (AQ)
****************************

Oracle Advanced Queuing allows applications to use producer-consumer
message passing. Queuing is highly configurable and scalable, providing
a great way to distribute workloads. Messages can be queued by multiple
producers. Different consumers can filter messages. Messages can also be
transformed or propagated to queues in other databases. Oracle AQ is
available in all editions of the database, and has interfaces in many
languages, allowing different applications to communicate. For more
details about AQ and its options, refer to the `Oracle Advanced Queuing
User’s Guide <https://www.oracle.com/pls/topic/lookup?ctx=
dblatest&id=ADQUE>`__.

Node-oracledb APIs for AQ were introduced in node-oracledb 4.0. With
earlier versions, use AQ’s PL/SQL interface.

Oracle Advanced Queues are represented in node-oracledb by several
classes. A single top level :ref:`AqQueue object <aqqueueclass>` in
node-oracledb contains :attr:`aqQueue.deqOptions` and
:attr:`aqQueue.enqOptions` object properties which can be used
to change queue behavior. A single AqQueue object can be used for
enqueuing, or dequeuing, or both at the same time.

Messages are enqueued by passing them to an enqueue method directly, or
by wrapping them in a :meth:`JavaScript object <aqQueue.enqOne()>`. Dequeued
messages are returned as an :ref:`AqMessage object <aqmessageclass>`.

The following examples show how to enqueue and dequeue messages in
node-oracledb. Before using a queue in node-oracledb, it must be created
in the database using the DBMS_AQADM PL/SQL package. For these examples,
create a new Oracle user ``demoqueue`` with permission to create and use
queues. Connect in SQL*Plus as SYSDBA and run:

.. code:: sql

   CREATE USER demoqueue IDENTIFIED BY &password;
   ALTER USER demoqueue DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
   GRANT CONNECT, RESOURCE TO demoqueue;
   GRANT AQ_ADMINISTRATOR_ROLE, AQ_USER_ROLE TO demoqueue;
   GRANT EXECUTE ON DBMS_AQ TO demoqueue;

When you have finished testing, remove the DEMOQUEUE schema.

.. _aqrawexample:

Sending Simple AQ Messages
==========================

To create a queue for simple messaging, use SQL*Plus to connect as the
new DEMOQUEUE user and run:

.. code:: sql

   -- Create and start a queue
   BEGIN
     DBMS_AQADM.CREATE_QUEUE_TABLE(
       QUEUE_TABLE        =>  'DEMOQUEUE.DEMO_RAW_QUEUE_TAB',
       QUEUE_PAYLOAD_TYPE =>  'RAW');

     DBMS_AQADM.CREATE_QUEUE(
       QUEUE_NAME         =>  'DEMOQUEUE.DEMO_RAW_QUEUE',
       QUEUE_TABLE        =>  'DEMOQUEUE.DEMO_RAW_QUEUE_TAB');

     DBMS_AQADM.START_QUEUE(
       QUEUE_NAME         => 'DEMOQUEUE.DEMO_RAW_QUEUE');
   END;
   /

To enqueue a single, simple message, run:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   await queue.enqOne("This is my message");
   await connection.commit();

Messages can be passed directly to ``enqOne()`` as shown above.
Alternatively they can be the ``payload`` property of a JavaScript
object passed to ``enqOne()``, as shown in :ref:`Changing AQ
options <aqoptions>`.

To dequeue a message, run:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   const msg = await queue.deqOne();
   await connection.commit();
   console.log(msg.payload.toString());

By default, ``deqOne()`` will wait until a message is available.

The variable ``msg`` is returned as an :ref:`AqMessage
object <aqmessageclass>` which contains the message payload and other
metadata. String messages are encoded as UTF-8 Buffers. This example
displays ``This is my message``.

See `examples/aqraw.js <https://github.com/oracle/node-oracledb/tree/main/
examples/aqraw.js>`__ for a runnable example.

.. _aqobjexample:

Sending Oracle Database Object AQ Messages
==========================================

You can use AQ to send Database Object payloads by using :ref:`DbObject
Class <dbobjectclass>` objects as the message.

The message in this example is an object containing a name and address.
To create a payload type and to start a queue, connect as the new
``demoqueue`` user and run:

.. code:: sql

   -- For the data we want to queue
   CREATE OR REPLACE TYPE USER_ADDRESS_TYPE AS OBJECT (
      NAME        VARCHAR2(10),
      ADDRESS     VARCHAR2(50)
   );
   /

   -- Create and start a queue
   BEGIN
    DBMS_AQADM.CREATE_QUEUE_TABLE(
      QUEUE_TABLE        =>  'DEMOQUEUE.ADDR_QUEUE_TAB',
      QUEUE_PAYLOAD_TYPE =>  'DEMOQUEUE.USER_ADDRESS_TYPE');

    DBMS_AQADM.CREATE_QUEUE(
      QUEUE_NAME         =>  'DEMOQUEUE.ADDR_QUEUE',
      QUEUE_TABLE        =>  'DEMOQUEUE.ADDR_QUEUE_TAB');

    DBMS_AQADM.START_QUEUE(
      QUEUE_NAME         => 'DEMOQUEUE.ADDR_QUEUE',
      ENQUEUE            => TRUE);
   END;
   /

In the :ref:`previous section <aqrawexample>` the ``QUEUE_PAYLOAD_TYPE``
was ‘RAW’ but here the Oracle Database object type name
``DEMOQUEUE.USER_ADDRESS_TYPE`` is used.

In node-oracledb, a queue is initialized for that type:

.. code:: javascript

   const queueName = "ADDR_QUEUE";
   const queue = await connection.getQueue(queueName, {payloadType: "DEMOQUEUE.USER_ADDRESS_TYPE"});

For efficiency, it is recommended to use a fully qualified name for the
type.

A :ref:`DbObject <dbobjectclass>` for the message is created and queued:

.. code:: javascript

   const message = new queue.payloadTypeClass(
     {
       NAME: "scott",
       ADDRESS: "The Kennel"
     }
   );
   await queue.enqOne(message);
   await connection.commit();

Dequeuing objects is done with:

.. code:: javascript

   const queue = await connection.getQueue(queueName, {payloadType: "DEMOQUEUE.USER_ADDRESS_TYPE"});
   const msg = await queue.deqOne();
   await connection.commit();

By default, ``deqOne()`` will wait until a message is available.

The message can be printed:

.. code:: javascript

   const o = msg.payload;
   console.log(o);

See `examples/aqobject.js <https://github.com/oracle/node-oracledb/tree/main/
examples/aqobject.js>`__ for a runnable example.

.. _aqoptions:

Changing AQ options
===================

The :ref:`AqQueue <aqqueueclass>` object created by calling
:meth:`connection.getQueue()` contains :attr:`~aqQueue.enqOptions` and
:attr:`~aqQueue.deqOptions` attribute objects that can be configured. These
options can be changed before each enqueue or dequeue call.

Messages that are enqueued can also contain properties, such as an
expiration. Instead of passing a message String, Buffer or DbObject
directly to ``enqOne()``, a ``payload`` property of a
:meth:`JavaScript object <aqQueue.enqOne()>` is set to the message.
Other object properties control the message behavior. For example, to expire
a message after five seconds if it has not been dequeued:

.. code:: javascript

   const message = {
        expiration: 5,
        payload: "This is my message"
   };

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   await queue.enqOne(message);
   await connection.commit();

For RAW queues the ``payload`` value can be a String or Buffer. For
object queues ``payload`` can be a :ref:`DbObject <dbobjectclass>` object.

To change the enqueue behavior of a queue, alter the
:attr:`aqQueue.enqOptions` attributes. For example to make a
message buffered, and not persistent:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   queue.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;
   await queue.enqOne(message);
   await connection.commit();

To send a message immediately without requiring a commit, you can change
the queue’s message visibility:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
   await queue.enqOne(message);

To change the queue behavior when dequeuing, alter the
:attr:`~aqQueue.deqOptions` attributes. For example, to change
the visibility of the message (so no explicit commit is required after
dequeuing a message) and to continue without blocking if the queue is
empty:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   queue.deqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
   queue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
   await msg = queue.deqOne();

To change multiple properties at once, you can also use syntax like::

   Object.assign(queue.deqOptions,
                 {
                   mode: oracledb.AQ_DEQ_MODE_BROWSE,
                   visibility: oracledb.AQ_VISIBILITY_IMMEDIATE,
                   wait: 10
                 });

See `examples/aqoptions.js <https://github.com/oracle/node-oracledb/tree/
main/examples/aqoptions.js>`__ for a runnable example.

.. _aqmultiplemessages:

Enqueuing and Dequeuing Multiple Messages
=========================================

Enqueuing multiple messages in one operation is similar to the basic
examples. However, instead of passing a single message to
:meth:`queue.enqOne() <aqQueue.enqOne()>`, the
:meth:`queue.enqMany() <aqQueue.enqMany()>` method is passed an
array of messages:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";
   const queue = await connection.getQueue(queueName);
   const messages = [
       "Message 1",
       "Message 2",
       "Message 3",
       "Message 4"
   ];
   await queue.enqMany(messages);
   await connection.commit();

Warning: see the advisory note in :meth:`~aqQueue.enqMany()` documentation.

Multiple messages can be dequeued in one call with
:meth:`queue.deqMany() <aqQueue.deqMany()>`. This method takes a
``maxMessages`` parameter indicating the maximum number of messages that
should be dequeued in one call. Depending on the queue options, zero or
more messages up to the limit will be dequeued:

.. code:: javascript

   const queue = await connection.getQueue(queueName);
   const messages = await queue.deqMany(5);
   console.log("Dequeued " + messages.length + " messages");
   for (const msg of messages) {
     console.log(msg.payload.toString());
   }
   await connection.commit();

By default, ``deqMany()`` will wait until a message is available.

Each element of the ``messages`` array is an :ref:`AqMessage
object <aqmessageclass>`, the same as returned by
:meth:`queue.deqOne() <aqQueue.deqOne()>`.

See `examples/aqmulti.js <https://github.com/oracle/node-oracledb/tree/main/
examples/aqmulti.js>`__ for a runnable example.

.. _aqnotifications:

Advanced Queuing Notifications
==============================

The :meth:`connection.subscribe()` method can be used to
register interest in a queue, allowing a callback to be invoked when
there are messages to dequeue. To subscribe to a queue, pass its name to
``subscribe()`` and set the :ref:`namespace <consubscribeoptnamespace>`
option to ``oracledb.SUBSCR_NAMESPACE_AQ``:

For example:

.. code:: javascript

   const queueName = "DEMO_RAW_QUEUE";

   const subscrOptions = {
     namespace: oracledb.SUBSCR_NAMESPACE_AQ,
     callback: ProcessAqMessages
   };

   async function ProcessAqMessages() {
     const connection = await oracledb.getConnection();  // get connection from a pool
     const queue = await connection.getQueue(queueName);
     const msg = await queue.deqOne();
     console.log(msg.payload.toString()
     await connection.close();
   }

   const connection = await oracledb.getConnection();  // get connection from a pool
   await connection.subscribe(queueName, subscrOptions);
   await connection.close();

See :ref:`Continuous Query Notification (CQN) <cqn>` for more information
about subscriptions and notifications.

AQ notifications require the same configuration as CQN. Specifically the
database must be able to connect back to node-oracledb.

.. _aqrecipientlists:

Recipient Lists
===============

A list of recipient names can be associated with a message at the time a
message is enqueued. This allows a limited set of recipients to dequeue
each message. The recipient list associated with the message overrides
the queue subscriber list, if there is one. The recipient names need not
be in the subscriber list but can be, if desired.

To dequeue a message, the ``consumerName`` attribute can be set to one
of the recipient names. The original message recipient list is not
available on dequeued messages. All recipients have to dequeue a message
before it gets removed from the queue.

Subscribing to a queue is like subscribing to a magazine: each
subscriber can dequeue all the messages placed into a specific queue,
just as each magazine subscriber has access to all its articles. Being a
recipient, however, is like getting a letter: each recipient is a
designated target of a particular message.

For example, to enqueue a message meant for “payroll” recipients::

   await queue.enqOne({
     payload: "Message 1",
     recipients: [ "payroll" ]
   });

Later, when dequeuing messages, the “payroll” recipient can be set using
the ``consumerName`` property to get the message::

   Object.assign(
     queue.deqOptions,
     { consumerName: "payroll" }
   );
   const msg = await queue.deqOne();
