.. _xmltype:

******************
Using XMLType Data
******************

``XMLType`` columns queried will return Strings by default, limited
to the size of a VARCHAR2.

However, if desired, the SQL query could be changed to return a CLOB,
for example:

.. code-block:: sql

    const sql = `SELECT XMLTYPE.GETCLOBVAL(res) FROM resource_view`;

The CLOB can be fetched in node-oracledb as a String or
:ref:`Lob <lobclass>`.

To insert into an ``XMLType`` column, directly insert a string
containing the XML, or use a temporary LOB, depending on the data
length.

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

LOB handling is as discussed in the section :ref:`Working with CLOB, NCLOB and
BLOB Data <lobhandling>`.
