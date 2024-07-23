.. _vectors:

*****************
Using VECTOR Data
*****************

Oracle Database 23ai introduced a new data type `VECTOR <https://docs.oracle.
com/en/database/oracle/oracle-database/23/vecse/overview-ai-vector-search.
html>`__ for artificial intelligence and machine learning search operations.
The VECTOR data type is a homogeneous array of 8-bit signed integers, 8-bit
unsigned integers, 32-bit floating-point numbers, or 64-bit floating-point
numbers.

With the VECTOR data type, you can define the number of dimensions for the
data and the storage format for each dimension value in the vector. The
possible storage formats include:

- **int8** for 8-bit signed integers
- **binary** for 8-bit unsigned integers
- **float32** for 32-bit floating-point numbers
- **float64** for 64-bit floating point numbers

You can also create vector columns without specifying the number of dimensions
or their storage format. For example:

.. code-block:: sql

    CREATE TABLE vecTable (
        dataVec VECTOR
    )

Using FLOAT32, FLOAT64, and INT8 Vectors
========================================

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

.. _insertvector:

Inserting FLOAT32, FLOAT64, and INT8 Vectors
--------------------------------------------

With node-oracledb, vector data of types INT8, FLOAT32, and FLOAT64 can be
inserted using TypedArrays or JavaScript arrays as bind values. To insert
using TypedArrays:

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

To insert data in vector columns that are defined without a specific
dimension or storage format, you should set the ``type`` attribute to
``oracledb.DB_TYPE_VECTOR``. The following example uses a JavaScript
array to insert vector data:

.. code-block:: javascript

    // JavaScript array
    const arr = [1.1, 2.9, 3.14];

    await connection.execute(
        `INSERT INTO vecTable (dataVec) VALUES (:vec)`,
        { vec: { type: oracledb.DB_TYPE_VECTOR, val: arr} }
    );

.. _fetchvector:

Fetching FLOAT32, FLOAT64, and INT8 Vectors
-------------------------------------------

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

This prints the following output::

    Vector dimensions for the VCOL32 column: 3
    Vector storage format for the VCOL32 column: 2

This output indicates that the ``VCOL32`` column in vecTable is a
3-dimensional FLOAT32 vector.

.. _fetchtypehandlervector:

Using a :ref:`fetch type handler <fetchtypehandler>`, you can convert the
vector data that was fetched to a JavaScript array, if required. Consider the
following example which converts a TypedArray to a JavaScript array.

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

.. _binaryvectors:

Using BINARY Vectors
====================

In addition to INT8, FLOAT32, and FLOAT64 formats, you can also use a
BINARY format to define vectors. The BINARY format represents each dimension
value as a binary value (0 or 1). Binary vectors require less memory storage.
For example, a 16 dimensional vector with BINARY format requires only 2 bytes of
storage while a 16 dimensional vector with INT8 format requires 16 bytes of
storage. The BINARY vector support was introduced in node-oracledb 6.6.

Binary vectors are represented as 8-bit unsigned integers. For the BINARY
format, you must define the number of dimensions as a multiple of 8. To create
a table with one column for vector data:

.. code-block:: sql

    CREATE TABLE vecBinaryTable (
        VCOLB VECTOR(16, BINARY)
    )

In this example, the ``VCOLB`` column can store vector data of 16 dimensions
where each dimension value is represented as a single bit. Note that the
number of dimensions 16 is a multiple of 8. This example is used in the
subsequent sections.

If you specify a vector dimension that is not a multiple of 8, then you will
get an error.

.. _insertbinaryvector:

Inserting BINARY Vectors
------------------------

With node-oracledb, vector data of type binary can be inserted using
TypedArrays as bind values. The length of 8-bit unsigner integer arrays must
be equal to the number of dimensions divided by 8. For example, if the number
of dimensions for a vector column is 24, then the length of the array must be
3. The values in these arrays can range from 0 to 255. For example:

.. code-block:: javascript

    // 8-bit unsigned integer TypedArray for representing binary vectors
    const uInt8Arr = new Uint8Array([240, 200]);

    await connection.execute(
        `INSERT INTO vecBinaryTable (VCOLB) VALUES (:vecb)`,
        { vecb: uInt8Arr }
    );

In the above example, the length of ``uInt8Arr`` is 2 since the number of
dimensions defined for the vector column ``VCOLB`` is 16.

Vector data of format BINARY cannot be inserted using JavaScript arrays as
bind values and will return an error.

.. _fetchbinaryvector:

Fetching BINARY Vectors
-----------------------

With node-oracledb, vector columns are fetched as TypedArrays of unsigned
integers (8-bit) if the VECTOR column in Oracle Database contains
BINARY data. To query a VECTOR column:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT VCOLB FROM vecBinaryTable`
    );
    const vecb = result.rows[0].VCOLB;
    console.log('Returned Array Type:', vecb.constructor);
    console.log('Returned Array:', vecb);

This prints an output such as::

    Returned Array type: [Function: Uint8Array]
    Returned Array: Uint8Array(2) [
        240,
        200
    ]

The :ref:`vectorDimensions <execmetadata>` and
:ref:`vectorFormat <execmetadata>` attributes in the metadata returned by a
query contains the number of dimensions of the vector column and the storage
format of each dimension value in the vector column respectively. To fetch
these attributes, you can use:

.. code-block:: javascript

    const vecDimensions = result.metadata[0].vectorDimensions;
    const vecStorageFormat = result.metadata[0].vectorFormat;
    console.log('Vector dimensions for the VCOLB column:', vecDimensions);
    console.log('Vector storage format for the VCOLB column:', vecStorageFormat);

This prints the following output::

    Vector dimensions for the VCOLB column: 16
    Vector storage format for the VCOLB column: 5

This output indicates that the ``VCOLB`` column in vecBinaryTable is a
16-dimensional BINARY vector.

Using the fetch type handler shown in this
:ref:`section <fetchtypehandlervector>`, you can convert the vector data that
was fetched to a JavaScript array.

See `vectortype1.js <https://github.com/oracle/node-oracledb/tree/
main/examples/vectortype1.js>`__ and `vectortype2.js <https://github.com/
oracle/node-oracledb/tree/main/examples/vectortype2.js>`__ for runnable
examples.
