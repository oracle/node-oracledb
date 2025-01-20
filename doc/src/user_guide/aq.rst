.. _aq:

************************************************************
Using Oracle Transactional Event Queues and Advanced Queuing
************************************************************

`Oracle Transactional Event Queues and Advanced Queuing <https://www.oracle.
com/pls/topic/lookup?ctx=dblatest&id=ADQUE>`__ are highly configurable and
scalable messaging features of Oracle Database, providing a great way to
distribute workloads. They allow applications to use producer-consumer message
passing. Messages can be queued by multiple producers. Different consumers can
filter messages. Messages can also be transformed or propagated to queues in
other databases. Oracle Transactional Event Queues (TxEventQ) and Advanced
Queuing (AQ) "Classic" queues have interfaces in many languages, allowing
different applications to communicate. Both TxEventQ and AQ queues support
sending and receiving of various payloads, such as RAW values, JSON, JMS, and
objects. TxEventQ queues use a highly optimized implementation of Advanced
Queuing. They were previously called AQ Sharded Queues.

.. note::

    In this release, TxEventQ and AQ classic queues are only supported in
    node-oracledb Thick mode. See :ref:`enablingthick`.

The same node-oracledb APIs are used for TxEventQ and AQ classic queues and
were introduced in node-oracledb 4.0. With earlier versions, use AQ’s PL/SQL
interface.

Both TxEventQ and AQ classic queues are represented in node-oracledb by
several classes. A single top level :ref:`AqQueue object <aqqueueclass>` in
node-oracledb contains :attr:`aqQueue.deqOptions` and
:attr:`aqQueue.enqOptions` object properties which can be used
to change queue behavior. TxEventQ queues do not support the
``transformation`` attribute of :attr:`aqQueue.enqOptions` and
:attr:`aqQueue.deqOptions` properties, and
:ref:`Recipient Lists <aqrecipientlists>`. A single AqQueue object can be
used for enqueuing, or dequeuing, or both at the same time.

Messages are enqueued by passing them to an enqueue method directly, or
by wrapping them in a :meth:`JavaScript object <aqQueue.enqOne()>`. Dequeued
messages are returned as an :ref:`AqMessage object <aqmessageclass>`.

There are differences in the payload types supported by TxEventQ and AQ
classic queues as detailed below.

**Classic Advanced Queuing (AQ) Support**

- RAW, named Oracle objects, and JMS payloads are supported.

- The JSON payload requires Oracle Client libraries 21c (or later) and Oracle
  Database 21c (or later).

There are examples of AQ Classic Queues in the `GitHub examples
<https://github.com/oracle/node-oracledb/tree/main/examples>`__ directory.

**Transactional Event Queue (TxEventQ) Support**

- RAW and named Oracle object payloads are supported for single and array
  message enqueuing and dequeuing when using Oracle Client 19c (or later) and
  connected to Oracle Database 19c (or later).

- JMS payloads are supported for single and array message enqueuing and
  dequeuing when using Oracle Client 19c (or later) and Oracle Database 23ai.

- JSON payloads are supported for single message enqueuing and dequeuing when
  using Oracle Client libraries 21c (or later) and Oracle Database 21c (or
  later). Array enqueuing and dequeuing is not supported for JSON payloads.

Before using a queue in node-oracledb, it must be created in the database
using the DBMS_AQADM PL/SQL package. For these examples,
create a new Oracle user ``demoqueue`` with permission to create and use
queues. Connect in SQL*Plus as SYSDBA and run:

.. code-block:: sql

    CREATE USER demoqueue IDENTIFIED BY &password;
    ALTER USER demoqueue DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
    GRANT CONNECT, RESOURCE TO demoqueue;
    GRANT AQ_ADMINISTRATOR_ROLE, AQ_USER_ROLE TO demoqueue;
    GRANT EXECUTE ON DBMS_AQ TO demoqueue;

When you have finished testing, remove the DEMOQUEUE schema.

.. _aqrawexample:

Sending Simple AQ Messages
==========================

You can use TxEventQ and classic AQ queues to send RAW payloads by using a
String or Buffer as the message.

Before enqueuing and dequeuing messages, you need to create and start queues
in Oracle Database. For example, to create a queue for simple messaging, use
SQL*Plus to connect as the new DEMOQUEUE user and run:

.. code-block:: sql

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

The default payload type is RAW and it is not necessary to explicitly
specify the :ref:`payloadType <getqueueoptions>` attribute in
:meth:`connection.getQueue()`. To get a queue of RAW payload type using this
default setting::

    connection.getQueue(queueName);

You can also explicitly set the :ref:`payloadType <getqueueoptions>`
attribute to ``oracledb.DB_TYPE_RAW`` in :meth:`connection.getQueue()`::

    connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_RAW });

To create a Transactional Event Queue for RAW payloads:

.. code-block:: sql

    BEGIN
        DBMS_AQADM.CREATE_SHARDED_QUEUE('RAW_SHQ', QUEUE_PAYLOAD_TYPE=>'RAW');
        DBMS_AQADM.START_QUEUE('RAW_SHQ');
    END;
    /

To enqueue a single, simple message, run:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    // Getting a queue of RAW payload type
    const queue = await connection.getQueue(queueName);
    const msg = await queue.enqOne("This is my message");
    await connection.commit();

The variable ``msg`` will be an :ref:`AqMessage object <aqmessageclass>`. It
contains information about the message that was sent such as payload,
correlation, delay, deliveryMode, msgId, priority, and
:ref:`other metadata <aqmessageclass>`.

Messages can be passed directly to ``enqOne()`` as shown above.
Alternatively, they can be the ``payload`` property of a JavaScript
object passed to ``enqOne()``, as shown in :ref:`Changing AQ
options <aqoptions>`.

To dequeue a message, run:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const msg = await queue.deqOne();
    await connection.commit();
    console.log(msg.payload.toString());

By default, ``deqOne()`` will wait until a message is available.

The variable ``msg`` will be an :ref:`AqMessage object <aqmessageclass>`. It
contains information about the dequeued message such as payload, correlation,
delay, deliveryMode, msgId, priority, and
:ref:`other metadata <aqmessageclass>`. String messages are encoded as UTF-8
Buffers. This example displays ``This is my message``.

See `examples/aqraw.js <https://github.com/oracle/node-oracledb/tree/main/
examples/aqraw.js>`__ for a runnable example.

Each enqueued message sent using :meth:`queue.enqOne() <aqQueue.enqOne()>`
or retrieved using :meth:`queue.deqOne() <aqQueue.deqOne()>` is uniquely
identified by an internally generated
:ref:`message identifier <aqmessageclass>` (``msgId``). The ``msgId``
attribute is of type Buffer. For example, to view the ``msgId`` of an enqueued
message:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const msg = await queue.enqOne("This is my message");
    console.log(msg.msgId.toString("hex"));
    await connection.commit();

This will print an identifier like::

    01ecb9cb8737a12de063ba60466437c7

Similarly, you can view the ``msgId`` of a dequeued message, for example:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const msg = await queue.deqOne();
    await connection.commit();
    console.log(msg.msgId.toString("hex"));

This will print an identifier like::

    01ecb9cb8737a12de063ba60466437b6

.. _aqjsonexample:

Sending Oracle Database JSON AQ Messages
========================================

Starting from Oracle Database 21c, Transactional Event Queues (TxEventQ) and
classic Advanced Queuing (AQ) support JSON payloads. To use this payload type,
Oracle Client libraries must also be version 21 or later.

You can use TxEventQ and classic AQ to send JSON payloads by using a
JavaScript object as the message.

Before enqueuing and dequeuing messages, you need to create and start queues
in Oracle Database. For example, to create a queue suitable for sending JSON
messages, use SQL*Plus to connect as the new ``DEMOQUEUE`` user and run:

.. code-block:: sql

    -- Create and start a queue
    BEGIN
        DBMS_AQADM.CREATE_QUEUE_TABLE(
            QUEUE_TABLE        =>  'DEMOQUEUE.DEMO_JSON_QUEUE_TAB',
            QUEUE_PAYLOAD_TYPE =>  'JSON');

        DBMS_AQADM.CREATE_QUEUE(
            QUEUE_NAME         =>  'DEMOQUEUE.DEMO_JSON_QUEUE',
            QUEUE_TABLE        =>  'DEMOQUEUE.DEMO_JSON_QUEUE_TAB');

        DBMS_AQADM.START_QUEUE(
            QUEUE_NAME         => 'DEMOQUEUE.DEMO_JSON_QUEUE');
    END;
    /

Using :meth:`connection.getQueue()`, you can get the queue by setting the
:ref:`payloadType <getqueueoptions>` attribute to ``oracledb.DB_TYPE_JSON`` as
shown below.

To enqueue a single JSON AQ message, run:

.. code-block:: javascript

    const queueName = "DEMO_JSON_QUEUE";
    // Getting a queue of JSON payload type
    const queue = await connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON });
    const myData = {
        empName: "Scott",
        empCity: "Redwood"
    };
    const msg = await queue.enqOne({
        payload: myData
    });
    await connection.commit();

The variable ``msg`` will be an :ref:`AqMessage object <aqmessageclass>`. It
contains information about the message that was sent such as payload,
correlation, delay, deliveryMode, msgId, priority, and
:ref:`other metadata <aqmessageclass>`.

To dequeue a JSON AQ message, run:

.. code-block:: javascript

    const queueName = "DEMO_JSON_QUEUE";
    const queue = await connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON });
    const msg = await queue.deqOne();
    await connection.commit();
    console.log("empName ", msg.payload.empName);
    console.log("empCity ", msg.payload.empCity);

By default, ``deqOne()`` will wait until a message is available.

This prints::

    empName Scott
    empCity Redwood

Each enqueued message sent using :meth:`queue.enqOne() <aqQueue.enqOne()>`
or retrieved using :meth:`queue.deqOne() <aqQueue.deqOne()>` is uniquely
identified by an internally generated
:ref:`message identifier <aqmessageclass>` (``msgId``). The ``msgId``
attribute is of type Buffer. For example, to view the ``msgId`` of an enqueued
message:

.. code-block:: javascript

    const queue = await connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON });
    const myData = {
        empName: "Scott",
        empCity: "Redwood"
    };
    const msg = await queue.enqOne({
        payload: myData
    });
    console.log(msg.msgId.toString("hex"));
    await connection.commit();

This will print an identifier like::

    01fbb9cb8737a12de063ba60466437c7

Similarly, you can view the ``msgId`` of a dequeued message, for example:

.. code-block:: javascript

    const queue = await connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON });
    const msg = await queue.deqOne();
    console.log(msg.msgId.toString("hex");)

This will print an identifier like::

    01dfb9cb8737a12de063ba60466437b6

.. _aqobjexample:

Sending Oracle Database Object AQ Messages
==========================================

You can use AQ to send Database Object payloads by using :ref:`DbObject
Class <dbobjectclass>` objects as the message.

Before enqueuing and dequeuing messages, you need to create database object
types, and create and start queues in Oracle Database. For example, connect
as the new ``demoqueue`` user and run:

.. code-block:: sql

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

In the :ref:`RAW <aqrawexample>` and :ref:`JSON <aqjsonexample>` examples, the
``QUEUE_PAYLOAD_TYPE`` was ‘RAW’ and ‘JSON’ respectively. Here, the Oracle
Database object type name ``DEMOQUEUE.USER_ADDRESS_TYPE`` is used.

Using :meth:`connection.getQueue()`, you can get the queue of object payloads
by setting the :ref:`payloadType <getqueueoptions>` attribute to the name
of an Oracle Database object type as shown below, or a
:ref:`DbObject Class <dbobjectclass>` earlier acquired from
:meth:`connection.getDbObjectClass()`.

In node-oracledb, a queue is initialized for an Oracle Database object type:

.. code-block:: javascript

    const queueName = "ADDR_QUEUE";
    // Getting a queue of Oracle Database object type
    const queue = await connection.getQueue(queueName, {payloadType: "DEMOQUEUE.USER_ADDRESS_TYPE"});

For efficiency, it is recommended to use a fully qualified name for the
type.

A :ref:`DbObject <dbobjectclass>` for the message is created and queued:

.. code-block:: javascript

    const message = new queue.payloadTypeClass(
        {
            NAME: "scott",
            ADDRESS: "The Kennel"
        }
    );
    const msg = await queue.enqOne(message);
    await connection.commit();

The variable ``msg`` will be an :ref:`AqMessage object <aqmessageclass>`. It
contains information about the message that was sent such as payload,
correlation, delay, deliveryMode, msgId, priority, and
:ref:`other metadata <aqmessageclass>`.

Dequeuing objects is done with:

.. code-block:: javascript

    const queue = await connection.getQueue(queueName, {payloadType: "DEMOQUEUE.USER_ADDRESS_TYPE"});
    const msg = await queue.deqOne();
    await connection.commit();

By default, ``deqOne()`` will wait until a message is available.

The message can be printed:

.. code-block:: javascript

    const o = msg.payload;
    console.log(o);

See `examples/aqobject.js <https://github.com/oracle/node-oracledb/tree/main/
examples/aqobject.js>`__ for a runnable example.

Each enqueued message sent using :meth:`queue.enqOne() <aqQueue.enqOne()>`
or retrieved using :meth:`queue.deqOne() <aqQueue.deqOne()>` is uniquely
identified by an internally generated
:ref:`message identifier <aqmessageclass>` (``msgId``). The ``msgId``
attribute is of type Buffer. For example, to view the ``msgId`` of an enqueued
message:

.. code-block:: javascript

    const msg = await queue.enqOne(message);
    console.log(msg.msgId.toString("hex"));

This will print an identifier like::

    01ecb9cb8737a12de063ba60466437c7

Similarly, you can view the ``msgId`` of a dequeued message, for example:

.. code-block:: javascript

    const msg = await queue.deqOne();
    console.log(msg.msgId.toString("hex"));

This will print an identifier like::

    01ecb9cb8737a12de063ba60466437b6

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

.. code-block:: javascript

    const message = {
        expiration: 5,
        payload: "This is my message"
    };

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const msg = await queue.enqOne(message);
    await connection.commit();

For RAW queues, the ``payload`` value can be a String or Buffer. For JSON
queues, the ``payload`` value should be a JavaScript object. For object
queues, the ``payload`` value should be a :ref:`DbObject <dbobjectclass>`
object.

To change the enqueue behavior of a queue, alter the
:attr:`aqQueue.enqOptions` attributes. For example to make a
message buffered, and not persistent:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    queue.enqOptions.deliveryMode = oracledb.AQ_MSG_DELIV_MODE_BUFFERED;
    await queue.enqOne(message);
    await connection.commit();

To send a message immediately without requiring a commit, you can change
the queue’s message visibility:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    queue.enqOptions.visibility = oracledb.AQ_VISIBILITY_IMMEDIATE;
    await queue.enqOne(message);

To change the queue behavior when dequeuing, alter the
:attr:`~aqQueue.deqOptions` attributes. For example, to change
the visibility of the message (so no explicit commit is required after
dequeuing a message) and to continue without blocking if the queue is
empty:

.. code-block:: javascript

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
array of messages.

Multiple messages can be dequeued in one call with
:meth:`queue.deqMany() <aqQueue.deqMany()>`. This method takes a
``maxMessages`` parameter indicating the maximum number of messages that
should be dequeued in one call. Depending on the queue options, zero or
more messages up to the limit will be dequeued.

**Using RAW Payloads**

To enqueue multiple messages, run:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const messages = [
        "Message 1",
        "Message 2",
        "Message 3",
        "Message 4"
    ];
    const msgs = await queue.enqMany(messages);
    await connection.commit();

The variable ``msgs`` will be an array of
:ref:`AqMessage objects <aqmessageclass>`. It contains information about the
messages that were sent such as payload, correlation, delay, deliveryMode,
msgId, priority, and :ref:`other metadata <aqmessageclass>`.

.. _advnote:

.. warning::

    Calling ``enqMany()`` in parallel on different connections acquired
    from the same pool may cause a problem with older versions of Oracle
    (see Oracle bug 29928074). Ensure that ``enqMany()`` is not run in
    parallel. Instead, use :ref:`standalone connections <connectionhandling>`
    or make multiple calls to ``enqOne()``. The ``deqMany()`` method is not
    affected.

To dequeue multiple messages, run:

.. code-block:: javascript

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

Each enqueued message sent using :meth:`queue.enqMany() <aqQueue.enqMany()>`
or dequeued message retrieved using :meth:`queue.deqMany() <aqQueue.deqMany()>`
is uniquely identified by an internally generated message identifier
(``msgId``). The ``msgId`` is of type Buffer. For example, to view the message
identifier of a multiple enqueued message:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";
    const queue = await connection.getQueue(queueName);
    const messages = [
        "Message 1",
        "Message 2",
        "Message 3",
        "Message 4"
    ];
    const msgs = await queue.enqMany(messages);
    for (let i = 0; i < msgs.length; i++) {
        console.log (i, "msgId: ", msgs[i].msgId.toString("hex"));
    }
    await connection.commit();

This will print identifiers such as::

    0  msgId:  01ecb9cb8738a12de063ba60466437c7
    1  msgId:  01ecb9cb8739a12de063ba60466437c7
    2  msgId:  01ecb9cb873aa12de063ba60466437c7
    3  msgId:  01ecb9cb873ba12de063ba60466437c7

Similarly, you can view the ``msgId`` of a multiple dequeued message, for
example:

.. code-block:: javascript

    const queue = await connection.getQueue(queueName);
    const msgs = await queue.deqMany(5);
    for (let i = 0; i < msgs.length; i++) {
        console.log (i, "msgId: ", msgs[i].msgId.toString("hex"));
    }
    await connection.commit();

This will print identifiers such as::

    0  msgId:  01ecb9cb8738a12de063ba60466437e9
    1  msgId:  01ecb9cb8739a12de063ba60466437e9
    2  msgId:  01ecb9cb873aa12de063ba60466437e9
    3  msgId:  01ecb9cb873ba12de063ba60466437e9

**Using JSON Payloads**

To enqueue multiple JSON messages, run:

.. code-block:: javascript

    const queueName = "DEMO_JSON_QUEUE";
    const queue = await connection.getQueue (queueName, { payloadType: oracledb.DB_TYPE_JSON });
    const empList = [
        {payload: { empName: "Employee #1", empId: 101 }},
        {payload: { empName: "Employee #2", empId: 102 }},
        {payload: { empName: "Employee #3", empId: 103 }}
    ];
    await queue.enqMany (empList);
    await connection.commit();

See the :ref:`advisory note <advnote>` about using :meth:`~aqQueue.enqMany()`.

To dequeue multiple JSON messages, run:

.. code-block:: javascript

    const queue = await connection.getQueue(queueName, { payloadType: oracledb.DB_TYPE_JSON });
    Object.assign(queue.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue.deqMany(5); // get at most 5 messages
    console.log ( "msgs received : " + msgs.length );
    for ( let i = 0; i < msgs.length; i ++ ) {
        console.log ( i + ". empName : " + msgs[i].payload.empName);
        console.log ( i + ". empId : " + msgs[i].payload.empId);
    }

By default, ``deqMany()`` will wait until a message is available.

This prints::

    msgs received : 3
    1. empName : Employee #1
    2. empId : 101
    3. empName : Employee #2
    4. empId : 102
    5. empName : Employee #3
    6. empId : 103

Transactional event queues do not support array enqueuing and dequeuing for
JSON payloads.

.. _aqnotifications:

Advanced Queuing Notifications
==============================

The :meth:`connection.subscribe()` method can be used to
register interest in a queue, allowing a callback to be invoked when
there are messages to dequeue. To subscribe to a queue, pass its name to
``subscribe()`` and set the :ref:`namespace <consubscribeoptnamespace>`
option to ``oracledb.SUBSCR_NAMESPACE_AQ``:

For example:

.. code-block:: javascript

    const queueName = "DEMO_RAW_QUEUE";

    const subscrOptions = {
        namespace: oracledb.SUBSCR_NAMESPACE_AQ,
        callback: ProcessAqMessage
    };

    async function ProcessAqMessage(message) {
        const connection = await oracledb.getConnection();  // get connection from a pool
        const queue = await connection.getQueue(queueName);
        const msg = await queue.deqOne();
        console.log(msg.payload.toString());
        console.log(message.msgId.toString("hex")); // prints the msgId of the message
        console.log(msg.msgId.toString("hex")); // prints the same msgId as above
        await connection.close();
    }

    const connection = await oracledb.getConnection();  // get connection from a pool
    await connection.subscribe(queueName, subscrOptions);
    await connection.close();

    await connection.unsubscribe(queueName); // unsubscribes from a queue

See :ref:`Continuous Query Notification (CQN) <cqn>` for more information
about subscriptions and notifications.

AQ notifications require the same configuration as CQN. Specifically the
database must be able to connect back to node-oracledb.

.. _aqrecipientlists:

Recipient Lists
===============

AQ Classic Queues support Recipient Lists. A list of recipient names can be
associated with a message at the time a message is enqueued. This allows a
limited set of recipients to dequeue each message. The recipient list
associated with the message overrides the queue subscriber list, if there is
one. The recipient names need not be in the subscriber list but can be, if
desired.

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
