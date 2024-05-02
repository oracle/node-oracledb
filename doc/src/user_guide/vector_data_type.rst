.. _vectors:

*****************
Using Vector Data
*****************

Oracle Database 23ai introduced a new data type VECTOR for artificial
intelligence and machine learning search operations. The vector data type
is a homogeneous array of 8-bit signed integers, 32-bit floating-point
numbers, or 64-bit floating-point numbers. With the vector data type, you
can define the number of dimensions for the data and the storage format
for each dimension value in the vector.

To create a table with three columns for vector data, for example:

.. code-block:: sql

    CREATE TABLE vecTable (
        VCOL32 VECTOR(3, FLOAT32),
        VCOL64 VECTOR(3,FLOAT64),
        VCOL8 VECTOR(3, INT8)
    )

In this example, each column can store vector data of three dimensions where
each dimension value is of the specified storage format. This example is used
in subsequent sections.

You can also create vector columns without specifying the number of dimensions
or their storage format. For example:

.. code-block:: sql

    CREATE TABLE vecTable (
        dataVec VECTOR
    )

.. _insertvector:

Inserting Vectors
=================

With node-oracledb, vector data can be inserted using TypedArrays as bind
values.

.. code-block:: javascript

    // 32-bit floating-point TypedArray
    const float32arr = new Float32Array([1.1, 2.9, 3.14]);

    // 64-bit floating-point TypedArray
    const float64arr = new Float64Array([7.7, 8.8, 9.9]);

    // 8-bit signed integer TypedArray
    const int8arr = new Int8Array([126, 125, -23]);

    await connection.execute(
        `INSERT INTO vecTable (VCOL32, VCOL64, VCOL8)
         VALUES (:vec32, :vec64, :vec8)`,
        { vec32: float32arr, vec64: float64arr, vec8: int8arr }
    );

To insert TypeArrays in vector columns that are defined without a specific
dimension or storage format, you should set the ``type`` attribute to
``oracledb.DB_TYPE_VECTOR`` as shown below:

.. code-block:: javascript

    // JavaScript array
    const arr = [1.1, 2.9, 3.14];

    await connection.execute(
        `INSERT INTO vecTable (dataVec) VALUES (:vec)`,
        { vec: { type: oracledb.DB_TYPE_VECTOR, val: arr} }
    );

.. _fetchvector:

Fetching Vectors
================

With node-oracledb, vector columns are fetched as TypedArrays of signed
integer (8-bit), float (32-bit), or double (64-bit) depending on whether the
VECTOR column in Oracle Database contains INT8, FLOAT32, or FLOAT64 data. To
query a VECTOR column, for example:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT VCOL32, VCOL64, VCOL8 FROM vecTable`
    );
    const vec32 = result.rows[0].VCOL32;
    const vec64 = result.rows[0].VCOL64;
    const vec8 = result.rows[0].VCOL8;
    console.log('Returned Array Type:', vec32.constructor);
    console.log('Returned Array:', vec32);
    console.log('Returned Array Type:', vec64.constructor);
    console.log('Returned Array:', vec64);
    console.log('Returned Array Type:', vec8.constructor);
    console.log('Returned Array:', vec8);

This prints an output such as::

    Returned Array type: [Function: Float32Array]
    Returned Array: Float32Array(3) [
        1.100000023841858,
        2.190000057220459,
        3.140000104904175
    ]
    Returned Array type: [Function: Float64Array]
    Returned Array: Float64Array(3) [
        7.7,
        8.8,
        9.9
    ]
    Returned Array type: [Function: Int8Array]
    Returned Array: Int8Array(3) [
        126,
        125,
        -23
    ]

The minor discrepancies between the input and output values of the Float32
TypedArray are due to the side effects of the floating-point operations in
JavaScript.

The :ref:`vectorDimensions <execmetadata>` and
:ref:`vectorFormat <execmetadata>` attributes in the metadata returned by a
query contains the number of dimensions of the vector column and the storage
format of each dimension value in the vector column respectively. To fetch
these attributes, you can use:

.. code-block:: javascript

    const vecDimensions = result.metadata[0].vectorDimensions;
    const vecStorageFormat = result.metadata[0].vectorFormat;
    console.log('Vector dimensions for the VCOL32 column:', vecDimensions);
    console.log('Vector storage format for the VCOL32 column:', vecStorageFormat);

This prints an ouput such as::

    Vector dimensions for the VCOL32 column: 3
    Vector storage format for the VCOL32 column: 2

This output indicates that the ``VCOL32`` column in vecTable is a
3-dimensional FLOAT32 vector.

Using a :ref:`fetch type handler <fetchtypehandler>`, you can convert the
vector data that was fetched to a JavaScript array, if required. Consider the
following example which converts a TypedArray to a Javascript array.

.. code-block:: javascript

    oracledb.fetchTypeHandler = function(metadata) {
        if (metadata.dbType === oracledb.DB_TYPE_VECTOR) {
            const myConverter = (v) => {
                if (v !== null) {
                    return Array.from(v);
                }
                return v;
            };
            return {converter: myConverter};
        }
    };

The fetch type handler is called once for each column in the SELECT query. For
each vector column, the converter will be called in Node.js for each of those
values. Using it in a query:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT VCOL32, VCOL64, VCOL8 FROM vecTable`
    );
    console.log(result.rows[0]);

This prints an output such as::

    {
      VCOL32: [ 1.100000023841858, 2.190000057220459, 3.140000104904175 ],
      VCOL64: [ 7.7, 8.8, 9.9 ],
      VCOL8: [ 126, 125, -23 ]
    }

This shows that the converter function converts the TypedArrays to JavaScript
arrays.

See `vectortype1.js <https://github.com/oracle/node-oracledb/tree/
main/examples/vectortype1.js>`__ and `vectortype2.js <https://github.com/
oracle/node-oracledb/tree/main/examples/vectortype2.js>`__ for runnable
examples.
