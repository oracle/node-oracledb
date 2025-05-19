.. _intervaltype:

*******************
Using INTERVAL Data
*******************

Oracle Database supports two INTERVAL data types that store time durations -
INTERVAL YEAR TO MONTH and INTERVAL DAY TO SECOND. For more information on
these data types, see `Oracle Interval Types <https://www.oracle.com/pls/topic
/lookup?ctx=dblatest&id=GUID-7690645A-0EE3-46CA-90DE-C96DF5A01F8F>`__.

Node-oracledb does not support using INTERVAL data types in
:ref:`Oracle Database Objects <dbobjectclass>`.

.. _intervalyeartomonth:

Using INTERVAL YEAR TO MONTH Data
=================================

The INTERVAL YEAR TO MONTH data type stores a period of time using years and
months.

To create a table with a column for INTERVAL YEAR TO MONTH data, for example:

.. code-block:: sql

    CREATE TABLE TableIntervalYM (IntervalCol INTERVAL YEAR TO MONTH);

.. _insertintervalyeartomonth:

Inserting INTERVAL YEAR TO MONTH
--------------------------------

You must create an IntervalYM object using :ref:`intervalymclass` to insert
into an INTERVAL YEAR TO MONTH column. For example:

.. code-block:: javascript

    const interval = new oracledb.IntervalYM();

This creates an Oracledb IntervalYM object with ``years`` and ``months``
attributes set to *0*. You can also create an IntervalYM object with zero
intervals using:

.. code-block:: javascript

    const interval = oracledb.IntervalYM({});

You can define the optional ``years`` and ``months`` attributes in the
IntervalYM class. For example, to create an Oracledb IntervalYM cobject with
only the ``years`` attribute set to *2*:

.. code-block:: javascript

    const interval = new oracledb.IntervalYM({ years: 2 });

An example of creating an IntervalYM object with ``years`` and ``months``
attributes set to *1* and *6* respectively is shown below. This example is
used in subsequent sections.

.. code-block:: javascript

    const interval = new oracledb.IntervalYM({ years: 1, months: 6 });

If you specify non-integer values in the attributes of IntervalYM object, then
the ``NJS-007`` error is raised.

You can insert IntervalYM objects into an INTERVAL YEAR TO MONTH column by
binding as ``oracledb.DB_TYPE_INTERVAL_YM``, for example:

.. code-block:: javascript

    await connection.execute(
        `INSERT INTO TableIntervalYM VALUES (:bv)`,
        { bv: { val: interval, type: oracledb.DB_TYPE_INTERVAL_YM }
    );

.. _fetchintervalyeartomonth:

Fetching INTERVAL YEAR TO MONTH
-------------------------------

To query an INTERVAL YEAR TO MONTH column, you can use:

.. code-block:: javascript

    const result = await connection.execute(`SELECT * FROM TableIntervalYM`);
    console.log(result.rows[0][0]);

This query prints::

    IntervalYM { years: 1, months: 6 }

.. _intervaldaytosecond:

Using INTERVAL DAY TO SECOND Data
=================================

The INTERVAL DAY TO SECOND data type stores a period of time using days,
hours, minutes, seconds, and fractional seconds.

To create a table with a column for INTERVAL DAY TO SECOND data, for example:

.. code-block:: sql

    CREATE TABLE TableIntervalDS (IntervalDSCol INTERVAL DAY TO SECOND);

.. _insertintervaldaytosecond:

Inserting INTERVAL DAY TO SECOND
--------------------------------

You must create an IntervalDS object using :ref:`intervaldsclass` to insert
into an INTERVAL DAY TO SECOND column. For example:

.. code-block:: javascript

    const interval = oracledb.IntervalDS();

This creates an Oracledb IntervalDS object with ``days``, ``hours``,
``minutes``, ``seconds``, and ``fseconds`` (fractional seconds) attributes set
to *0*. You can also create an IntervalDS object with zero intervals using:

.. code-block:: javascript

    const interval = oracledb.IntervalDS({});

You can define the optional ``days``, ``hours``, ``minutes``, ``seconds``, and
``fseconds`` attributes in the IntervalDS object. An example to create an
Oracledb IntervalDS object with the ``days`` and ``seconds`` attributes set to
*2* and *40* respectively is shown below.

.. code-block:: javascript

    const data = new oracledb.IntervalDS({ days: 2, seconds: 40 });

The above example is used in subsequent sections.

If you specify non-integer values in the attributes of IntervalDS object, then
the ``NJS-007`` error is raised.

You can insert IntervalDS objects into an INTERVAL DAY TO SECOND column by
binding as ``oracledb.DB_TYPE_INTERVAL_DS``, for example:

.. code-block:: javascript

    await connection.execute(
        `INSERT INTO TableIntervalDS VALUES (:bv)`,
        { bv: { val: data, type: oracledb.DB_TYPE_INTERVAL_DS }
    );

.. _fetchintervaldaytosecond:

Fetching INTERVAL DAY TO SECOND
-------------------------------

To query an INTERVAL DAY TO SECOND column, you can use:

.. code-block:: javascript

    const result = await connection.execute(`SELECT * FROM TableIntervalDS`);
    console.log(result.rows[0][0]);

This query prints::

    IntervalDS { days: 2, hours: 0, minutes: 0, seconds: 40, fseconds: 0 }
