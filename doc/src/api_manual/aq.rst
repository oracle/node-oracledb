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

The AqQueue class was added in node-oracledb 4.0.

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
        :widths: 10 40
        :summary: The first column displays the attribute name. The second
         column displays the description of the attribute.

        * - Attribute Name
          - Description
        * - ``condition``
          - A String that defines the condition that must be satisfied in order for a message to be dequeued.
        * - ``consumerName``
          - A String that defines the name of the consumer that is dequeuing messages.
        * - ``correlation``
          - A String that defines the correlation to use when dequeuing.
        * - ``mode``
          - An integer value that defines the mode to use for dequeuing messages. It can be one of the following constants: :ref:`oracledb.AQ_DEQ_MODE_BROWSE <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_LOCKED <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_REMOVE <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_MODE_REMOVE_NO_DATA <oracledbconstantsaq>`.
        * - ``msgId``
          - A Buffer containing a unique identifier specifying the message to be dequeued.
        * - ``navigation``
          - An integer value that defines the position in the queue of the message that is to be dequeued. It can be one of the following constants: :ref:`oracledb.AQ_DEQ_NAV_FIRST_MSG <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_NAV_NEXT_TRANSACTION <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_NAV_NEXT_MSG <oracledbconstantsaq>`.
        * - ``transformation``
          - A String that defines the transformation that will take place on messages when they are dequeued.
        * - ``visibility``
          - An integer value that defines whether the dequeue occurs in the current transaction or as a separate transaction. It can be one of the following constants: :ref:`oracledb.AQ_VISIBILITY_IMMEDIATE <oracledbconstantsaq>`, :ref:`oracledb.AQ_VISIBILITY_ON_COMMIT <oracledbconstantsaq>`.
        * - ``wait``
          - An integer defining the number of seconds to wait for a message matching the search criteria to become available. It can alternatively be one of the following constants: :ref:`oracledb.AQ_DEQ_NO_WAIT <oracledbconstantsaq>`, :ref:`oracledb.AQ_DEQ_WAIT_FOREVER <oracledbconstantsaq>`.

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
          - Defines the delivery mode when enqueuing messages. It can be one of the following constants: :ref:`oracledb.AQ_MSG_DELIV_MODE_PERSISTENT <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_DELIV_MODE_BUFFERED <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED <oracledbconstantsaq>`.
        * - ``transformation``
          - String
          - Defines the transformation that will take place when messages are enqueued.
        * - ``visibility``
          - Integer
          - Defines whether the enqueue occurs in the current transaction or as a separate transaction. It can be one of the following constants: :ref:`oracledb.AQ_VISIBILITY_IMMEDIATE <oracledbconstantsaq>`, :ref:`oracledb.AQ_VISIBILITY_ON_COMMIT <oracledbconstantsaq>`.

    See `Oracle Advanced Queuing Documentation <https://www.oracle.com/pls/
    topic/lookup?ctx=dblatest&id=ADQUE>`__ for more information about
    attributes.

.. attribute:: aqQueue.payloadType

    This read-only property is a number and is one of the
    :ref:`oracledb.DB_TYPE_RAW <oracledbconstantsdbtype>` or
    :ref:`oracledb.DB_TYPE_OBJECT <oracledbconstantsdbtype>` constants.

.. attribute:: aqQueue.payloadTypeClass

    This read-only property is the :ref:`DbObject Class <dbobjectclass>`
    corresponding to the payload type specified when the queue was created.

    This is defined only if ``payloadType`` has the value
    ``oracledb.DB_TYPE_OBJECT``.

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

    Dequeued messages are returned as AqMessage objects. Note AqMessage
    objects are not used for enqueuing.

    .. _aqmessageclass:

    .. list-table-with-summary::  AqMessage Class Attributes
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 40
        :summary: The first column displays the attribute name. The second
         column displays the description of the attribute.

        * - Attribute Name
          - Description
        * - ``correlation``
          - A String containing the correlation that was used during enqueue.
        * - ``delay``
          - An integer containing the number of seconds the message was delayed before it could be dequeued.
        * - ``deliveryMode``
          - An integer containing the delivery mode the messages was enqueued with.
        * - ``exceptionQueue``
          - A String containing the name of the exception queue defined when the message was enqueued.
        * - ``expiration``
          - The number of seconds until expiration defined when the message was enqueued.
        * - ``msgId``
          - A Buffer containing the unique identifier of the message.
        * - ``numAttempts``
          - An integer containing the number of attempts that were made to dequeue the message.
        * - ``originalMsgId``
          - A Buffer containing the unique identifier of the message in the last queue that generated it.
        * - ``payload``
          - A Buffer or DbObject containing the payload of the message, depending on the value of ``queue.payloadType``. Note that enqueued Strings are returned as UTF-8 encoded Buffers.
        * - ``priority``
          - An integer containing the priority of the message when it was enqueued.
        * - ``state``
          - An integer representing the state of the message. It is one of the following constants: :ref:`oracledb.AQ_MSG_STATE_READY <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_STATE_WAITING <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_STATE_PROCESSED <oracledbconstantsaq>`, :ref:`oracledb.AQ_MSG_STATE_EXPIRED <oracledbconstantsaq>`.

    See `Oracle Advanced Queuing
    Documentation <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADQUE>`__
    for more information about attributes.

.. method:: aqQueue.enqMany()

    **Promise**::

        promise = enqMany();

    Enqueues multiple messages to an :ref:`Oracle Advanced Queue <aq>`.

    .. warning::

      Calling ``enqMany()`` in parallel on different connections
      acquired from the same pool may fail due to Oracle bug 29928074. Ensure
      that ``enqMany()`` is not run in parallel, use :ref:`standalone
      connections <connectionhandling>`, or make multiple calls to
      ``enqOne()``. The ``deqMany()`` method is not affected.

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
          - The number of seconds the message is available to be dequeued before it expires.
        * - ``payload``
          - String, Buffer, :ref:`DbObject <dbobjectclass>`
          - The actual message to be queued. This property must be specified.
        * - ``priority``
          - Integer
          - An integer priority of the message.
        * - ``recipients``
          - Array of strings
          - An array of strings where each string is a recipients name.

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
