.. _xmltype:

******************
Using XMLType Data
******************

Oracle XMLType columns are fetched as strings by default in node-oracledb Thin
and Thick modes. Note that in Thick mode, you may need to use the
``XMLTYPE.GETCLOBVAL()`` function as detailed below.

The examples below demonstrate using ``XMLType`` data with node-oracledb. The
following table will be used in these examples:

.. code-block:: sql

    CREATE TABLE xwarehouses(
        warehouse_id NUMBER,
        warehouse_spec XMLTYPE
    );

Inserting XML
=============

To insert into an ``XMLType`` column, you can directly insert a string
containing the XML or use a temporary LOB, depending on the data
length. For example:

.. code-block:: javascript

    const myxml =
        `<Warehouse>
         <WarehouseId>1</WarehouseId>
         <WarehouseName>Melbourne, Australia</WarehouseName>
         <Building>Owned</Building>
         <Area>2020</Area>
         <Docks>1</Docks>
         <DockType>Rear load</DockType>
         <WaterAccess>false</WaterAccess>
         <RailAccess>N</RailAccess>
         <Parking>Garage</Parking>
         <VClearance>20</VClearance>
         </Warehouse>`;

    const result = await connection.execute(
     `INSERT INTO xwarehouses (warehouse_id, warehouse_spec) VALUES (:id, XMLType(:bv))`,
     { id: 1, bv: myxml }
    );

Fetching XML
============

Fetching XML data can be done directly in node-oracledb Thin mode. This also
works in Thick mode for values that are shorter than the `maximum allowed
length of a VARCHAR2 column <https://docs.oracle.com/pls/topic/lookup?ctx=
dblatest&id=GUID-D424D23B-0933-425F-BC69-9C0E6724693C>`__:

.. code-block:: javascript

    myxmldata = await connection.execute(`SELECT warehouse_spec FROM xwarehouses
                        WHERE warehouse_id = :id`, [1]);
    console.log(myxmldata);

In Thick mode, for values that exceed the `maximum allowed length of a
VARCHAR2 column <https://docs.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-D424D23B-0933-425F-BC69-9C0E6724693C>`__, a CLOB must be returned by using
the ``XMLTYPE.GETCLOBVAL()`` function:

.. code-block:: javascript

    myxmldata = connection.execute(`SELECT XMLTYPE.GETCLOBVAL(warehouse_spec)
                                    AS mycontent FROM xwarehouses
                                    WHERE warehouse_id = :id`, [1]);
    console.log(myxmldata);

The CLOB can be fetched in node-oracledb as a String or :ref:`Lob <lobclass>`.
LOB handling is as discussed in the section :ref:`Working with CLOB, NCLOB and
BLOB Data <lobhandling>`.
