.. _aqqueueclass:

******************
API: AqQueue Class
******************

An AqQueue object is created by
:meth:`connection.getQueue()`. It is used for enqueuing and
dequeuing Oracle Advanced Queuing messages. Each AqQueue can be used for
enqueuing, dequeuing, or for both.

.. note::

    In this release, Oracle Advanced Queuing (AQ) is only supported in the
    node-oracledb Thick mode. See :ref:`enablingthick`.

See :ref:`Oracle Advanced Queuing (AQ) <aq>` for usage.

.. versionadded:: 4.0

.. _aqqueueproperties:

AqQueue Properties
==================

.. attribute:: aqQueue.name

    This read-only property is a string containing the name of the queue
    specified in the :meth:`connection.getQueue()` call.

.. attribute:: aqQueue.deqOptions

    This property is an object specifying the Advanced Queuing options to use
    when dequeuing messages. Attributes can be set before each
    :meth:`queue.deqOne() <aqQueue.deqOne()>` or
    :meth:`queue.deqMany() <aqQueue.deqMany()>`, see :ref:`Changing AQ
    options <aqoptions>`.

    When a :meth:`queue is created <connection.getQueue()>`, the
    ``queue.deqOptions`` property is an :ref:`AqDeqOptions object
    <aqdeqoptionsclass>`. AqDeqOptions objects cannot be created
    independently.

    .. _aqdeqoptionsclass:

    .. list-table-with-summary::  AqDeqOptions Class Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the attribute name. The second
         column displays the data type of the attribute. The third column
         displays the description of the attribute.

        * - Attribute Name
          - Data Type
          - Description
        * - ``condition``
          - String
          - The condition that must be satisfied in order for a message to be dequeued. The condition is a boolean expression similar to the WHERE clause of a SQL query. The boolean expression can include conditions on message properties, user data properties, and PL/SQL or SQL functions.
        * - ``consumerName``
          - String
          - The name of the consumer that is dequeuing messages. Only messages matching the consumer name will be accessed. If the queue is not set up for multiple consumers, then this attribute should not be set.
        * - ``correlation``
          - String
          - The correlation to use when dequeuing. Special pattern-matching characters, such as the percent sign (%) and the underscore (_), can be used. If multiple messages satisfy the pattern, the order of dequeuing is indeterminate.
        * - ``mode``
          - Integer
          - The mode to use for dequeuing messages. It can be one of the following constants: :ref:`oracledb.AQ_DEQ_MODE_BROWSE <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_LOCKED <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_REMOVE <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_REMOVE_NO_DATA <oracledbconstantsaq>`.
        * - ``msgId``
          - Buffer
          - A unique identifier specifying the message to be dequeued.
        * - ``navigation``
          - Integer
          - The position in the queue of the message that is to be dequeued. It can be one of the following constants: :ref:`oracledb.AQ_DEQ_NAV_FIRST_MSG <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_NAV_NEXT_TRANSACTION <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_NAV_NEXT_MSG <oracledbconstantsaq>`.
        * - ``transformation``
          - String
          - The transformation that will take place on messages when they are dequeued. The transformation must be created using dbms_transform.

            This attribute is not supported in Transactional Event Queues (TxEventQ).
        * - ``visibility``
          - Integer
          - Defines whether the dequeue occurs in the current transaction or as a separate transaction. It can be one of the following constants: :ref:`oracledb.AQ_VISIBILITY_IMMEDIATE <oracledbconstantsaq>`, :ref:`oracledb.AQ_VISIBILITY_ON_COMMIT <oracledbconstantsaq>`.
        * - ``wait``
          - Integer
          - The number of seconds to wait for a message matching the search criteria to become available. It can alternatively be one of the following constants: :ref:`oracledb.AQ_DEQ_NO_WAIT <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_WAIT_FOREVER <oracledbconstantsaq>`.

    See `Oracle Advanced Queuing Documentation <https://www.oracle.com/pls
    /topic/lookup?ctx=dblatest&id=ADQUE>`__ for more information about
    attributes.

.. attribute:: aqQueue.enqOptions

    This property is an object specifying the Advanced Queuing options to use
    when enqueuing messages. Attributes can be set before each
    :meth:`queue.enqOne() <aqQueue.enqOne()>` or
    :meth:`queue.enqMany() <aqQueue.enqMany()>` call to change the
    behavior of message delivery, see :ref:`Changing AQ options <aqoptions>`.

    When a :meth:`queue is created <connection.getQueue()>`, the
    ``queue.enqOptions`` property is an :ref:`AqEnqOptions object
    <aqenqoptionsclass>`. AqEnqOptions objects cannot be created
    independently.

    .. _aqenqoptionsclass:

    .. list-table-with-summary::  AqEnqOptions Class Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the attribute name. The second
         column displays the data type of the attribute. The third column
         displays the description of the attribute.

        * - Attribute Name
          - Data Type
          - Description
        * - ``deliveryMode``
          - Integer
          - The delivery mode when enqueuing messages. It can be one of the following constants: :ref:`oracledb.AQ_MSG_DELIV_MODE_PERSISTENT <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_DELIV_MODE_BUFFERED <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED <oracledbconstantsaq>`.
        * - ``transformation``
          - String
          - The transformation that will take place when messages are enqueued. The transformation must be created using dbms_transform.

            This attribute is not supported in Transactional Event Queues (TxEventQ).
        * - ``visibility``
          - Integer
          - Defines whether the enqueue occurs in the current transaction or as a separate transaction. It can be one of the following constants: :ref:`oracledb.AQ_VISIBILITY_IMMEDIATE <oracledbconstantsaq>`, :ref:`oracledb.AQ_VISIBILITY_ON_COMMIT <oracledbconstantsaq>`.

    See `Oracle Advanced Queuing Documentation <https://www.oracle.com/pls/
    topic/lookup?ctx=dblatest&id=ADQUE>`__ for more information about
    attributes.

.. attribute:: aqQueue.payloadType

    This read-only property is one of the
    :ref:`oracledb.DB_TYPE_RAW <oracledbconstantsdbtype>` or
    :ref:`oracledb.DB_TYPE_OBJECT <oracledbconstantsdbtype>`, or
    :ref:`oracledb.DB_TYPE_JSON <oracledbconstantsdbtype>` constants.

    .. versionchanged:: 6.1

        Added ``oracledb.DB_TYPE_JSON`` constant.

.. attribute:: aqQueue.payloadTypeClass

    This read-only property is the :ref:`DbObject Class <dbobjectclass>`
    corresponding to the payload type specified when the queue was created.

    This is defined only if the ``payloadType`` property has the value
    :ref:`oracledb.DB_TYPE_OBJECT <oracledbconstantsdbtype>`.

.. attribute:: aqQueue.payloadTypeName

    This read-only property is a string and it can either be the string “RAW”
    or the name of the Oracle Database object type identified when the queue
    was created.

.. _aqqueuemethods:

AqQueue Methods
===============

.. method:: aqQueue.deqMany()

    **Promise**::

        promise = deqMany(Number maxMessages);

    Dequeues up to the specified number of messages from an :ref:`Oracle Advanced
    Queue <aq>`.

    The parameters of the ``aqQueue.deqMany()`` method are:

    .. _deqmany:

    .. list-table-with-summary:: aqQueue.deqMany() Parameters
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
        * - ``maxMessages``
          - Number
          - Dequeue at most this many messages. Depending on the dequeue options, the number of messages returned will be between zero and ``maxMessages``.

    **Callback**:

    If you are using the callback programming style::

        deqMany(Number maxMessages, function(Error error, Array messages));

    See :ref:`deqmany` for information on the ``maxMessages`` parameter.

    The parameters of the callback function
    ``function(Array messages, Error error)`` are:

    .. list-table-with-summary::
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 15 30
        :summary: The first column displays the callback function parameter.
         The second column displays the description of the parameter.

        * - Callback Function Parameter
          - Description
        * - Array ``messages``
          - An array of :ref:`AqMessage objects <aqmessageclass>`.
        * - Error ``error``
          - If ``deqMany()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

.. method:: aqQueue.deqOne()

    **Promise**::

        promise = deqOne();

    Dequeues a single message from an :ref:`Oracle Advanced Queue <aq>`.
    Depending on the dequeue options, the message may also be returned as
    undefined if no message is available.

    **Callback**:

    If you are using the callback programming style::

        deqOne(function(Error error, AqMessage message));

    The parameters of the callback function
    ``function(Error error, AqMessage message)`` are:

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
          - If ``deqOne()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.
        * - AqMessage ``message``
          - The message that is dequeued. See :ref:`AqMessage Class <aqmessageclass>`.

    Dequeued messages are returned as
    :ref:`AqMessage objects <aqmessageclass>`.

    .. _aqmessageclass:

    .. list-table-with-summary::  AqMessage Class Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :name: _aqmessage_class_attributes
        :widths: 10 10 30
        :summary: The first column displays the attribute name. The second
         column displays the data type of the attribute. The third column
         displays the description of the attribute.

        * - Attribute Name
          - Data Type
          - Description
        * - ``correlation``
          - String
          - The correlation that was used during enqueue.
        * - ``delay``
          - Integer
          - The number of seconds the message was delayed before it could be dequeued.
        * - ``deliveryMode``
          - Integer
          - The delivery mode the messages was enqueued with.
        * - ``enqTime``
          - Object
          - A JavaScript Date object with a precision of seconds containing the timestamp of when the message was enqueued. The fractional seconds will be *0*. For example, 2025-04-22T13:16:48.000Z. This is a read-only attribute.

            .. versionadded:: 6.9
        * - ``exceptionQueue``
          - String
          - The name of the exception queue defined when the message was enqueued. Messages are moved if the number of unsuccessful dequeue attempts has exceeded the maximum number of retries or if the message has expired. The default value is the name of the exception queue associated with the queue table.
        * - ``expiration``
          - Integer
          - The number of seconds until expiration defined when the message was enqueued. This attribute is an offset from the ``delay`` attribute. Expiration process requires the queue monitor to be running.
        * - ``msgId``
          - Buffer
          - The unique identifier of the message.
        * - ``numAttempts``
          - Integer
          - The number of attempts that were made to dequeue the message.
        * - ``originalMsgId``
          - Buffer
          - The unique identifier of the message in the last queue that generated it.
        * - ``payload``
          - Buffer or DbObject
          - The payload of the message, depending on the value of :attr:`aqQueue.payloadType`. Note that enqueued Strings are returned as UTF-8 encoded Buffers.
        * - ``priority``
          - Integer
          - The priority of the message when it was enqueued. A smaller number indicates a higher priority. The priority can be any integer, including negative numbers.
        * - ``state``
          - Integer
          - The state of the message at the time of the dequeue. It is one of the following constants: :ref:`oracledb.AQ_MSG_STATE_READY <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_STATE_WAITING <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_STATE_PROCESSED <oracledbconstantsaq>`, or :ref:`oracledb.AQ_MSG_STATE_EXPIRED <oracledbconstantsaq>`.

    See `Oracle Advanced Queuing
    Documentation <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADQUE>`__
    for more information about attributes.

.. method:: aqQueue.enqMany()

    **Promise**::

        promise = enqMany();

    Enqueues multiple messages to an :ref:`Oracle Advanced Queue <aq>`.

    .. warning::

      Calling ``enqMany()`` in parallel on different connections acquired from
      the same pool may cause a problem with older versions of Oracle (see
      Oracle bug 29928074). Ensure that ``enqMany()`` is not run in parallel.
      Instead, use :ref:`standalone connections <connectionhandling>` or make
      multiple calls to ``enqOne()``. The ``deqMany()`` method is not affected.

    **Callback**:

    If you are using the callback programming style::

        enqMany(Array messages, function(Error error));

    The parameters of the ``aqQueue.enqMany()`` method are:

    .. _enqmany:

    .. list-table-with-summary:: aqQueue.enqMany() Parameters
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
        * - ``messages``
          - Array
          - Each element of the array must be a String, a Buffer, a :ref:`DbObject <dbobjectclass>`, or a JavaScript Object as used by :meth:`enqOne() <aqQueue.enqOne()>`.

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
          - If ``enqMany()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

    The ``aqQueue.enqMany()`` method returns an array of
    :ref:`AqMessage objects <aqmessageclass>`.

    .. versionchanged:: 6.1

        Previously, ``aqQueue.enqMany()`` did not return any value. Now, this
        method returns an array of :ref:`AqMessage objects <aqmessageclass>`.

.. method:: aqQueue.enqOne()

    **Promise**::

        promise = enqOne();

    Enqueues a single message to an :ref:`Oracle Advanced Queue <aq>`. The
    message may be a String, or a Buffer, or a
    :ref:`DbObject <dbobjectclass>`. It may also be a JavaScript Object
    containing the actual message and some attributes controlling the
    behavior of the queued message.

    **Callback**:

    If you are using the callback programming style::

        enqOne(String message, function(Error error));
        enqOne(Buffer message, function(Error error));
        enqOne(DbObject message, function(Error error));
        enqOne(Object message, function(Error error));

    The parameters of the ``aqQueue.enqOne()`` method are:

    .. _enqOne:

    .. list-table-with-summary:: aqQueue.enqOne() Parameters
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
        * - ``message``
          - String, Buffer, DbObject, or Object
          -  - String: If the message is a String, it will be converted to a buffer using the UTF-8 encoding.
             - Buffer: If the message is a Buffer, it will be transferred as it is.
             - DbObject: An object of the :ref:`DbObject Class <dbobjectclass>`.
             - Object message: A JavaScript object can be used to alter the message properties. It must contain a ``payload`` property with the actual message content. It may contain other attributes as noted in the :ref:`objmsgattr` table.

    .. _objmsgattr:

    .. list-table-with-summary::  Object Message Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the message attribute. The second
         column displays the data type of the attribute. The third column
         displays the description of the attribute.

        * - Message Attribute
          - Data Type
          - Description
        * - ``correlation``
          - String
          - The correlation of the message to be enqueued.
        * - ``delay``
          - Number
          - The number of seconds to delay the message before it can be dequeued.
        * - ``exceptionQueue``
          - String
          - The name of an exception queue in which to place the message if an exception takes place.
        * - ``expiration``
          - Number
          - The number of seconds the message is available to be dequeued before it expires. This attribute is an offset from the ``delay`` attribute. Expiration processing requires the queue monitor to be running.
        * - ``payload``
          - String, Buffer, :ref:`DbObject <dbobjectclass>`, Object
          - The actual message to be queued. This property must be specified. When enqueuing, the value is checked to ensure that it conforms to the type expected by that queue.
        * - ``priority``
          - Integer
          - An integer priority of the message. A smaller number indicates a higher priority. The priority can be any integer, including negative numbers.
        * - ``recipients``
          - Array of strings
          - An array of strings where each string is a recipients name. This allows a limited set of recipients to dequeue each message. The recipients associated with the message overrides the queue subscriber list, if there is one. The recipient names need not be in the subscriber list but can be, if desired.

            To dequeue a message, the ``consumerName`` attribute can be set to one of the recipient names. The original message recipient list is not available on dequeued messages. All recipients have to dequeue a message before it gets removed from the queue.

            .. versionadded:: 5.5

    See `Oracle Advanced Queuing Documentation <https://www.oracle.com/pls/
    topic/lookup?ctx=dblatest&id=ADQUE>`__ for more information about
    attributes.

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
          - If ``enqOne()`` succeeds, ``error`` is NULL. If an error occurs, then ``error`` contains the :ref:`error message <errorobj>`.

    Enqueued messages are returned as :ref:`AqMessage objects <aqmessageclass>`.

    .. versionchanged:: 6.1

        Previously, ``aqQueue.enqOne()`` did not return any value. Now, this
        method returns an :ref:`AqMessage object <aqmessageclass>`.
