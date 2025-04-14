.. _lobhandling:

***************************************
Using CLOB, NCLOB, BLOB, and BFILE Data
***************************************

Oracle Database uses LOB data types to store long objects. The CLOB type
is used for character data and the BLOB type is used for binary data.
NCLOB can hold character data in the database’s alternative `national
character set <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID
-AA8D783D-7337-4A61-BD7D-5DB580C46D9A>`__. The `BFILE <https://www.oracle.com/
pls/topic/lookup?ctx=dblatest&id=GUID-D4642C92-F343-4700-9F1F-486F82249FB8>`__
type is used for referencing a file stored on the server operating system
where Oracle Database is running, outside the database tablespace. The BFILE
LOB type was introduced in node-oracledb 6.6.

node-oracledb uses :ref:`oracledb.CLOB <oracledbconstantsdbtype>`,
:ref:`oracledb.BLOB <oracledbconstantsdbtype>`,
:ref:`oracledb.NCLOB <oracledbconstantsdbtype>`, and
:ref:`oracledb.BFILE <oracledbconstantsdbtype>` to represent CLOB, BLOB,
NCLOB, and BFILE data types respectively. In node-oracledb, LOBs can be
represented by instances of the :ref:`Lob <lobclass>` class or as Strings and
Buffers.

There are runnable LOB examples in the GitHub
`examples <https://github.com/oracle/node-oracledb/tree/main/examples>`__
directory.

.. _basiclobinsert:

Simple Insertion of LOBs
========================

Node.js String or Buffer types can be passed into PL/SQL blocks or
inserted into the database by binding to LOB columns or PL/SQL
parameters.

.. _insertclobblob:

Inserting CLOBs and BLOBs
-------------------------

Given the table:

.. code-block:: sql

    CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);

an ``INSERT`` example is:

.. code-block:: javascript

    const fs = require('fs');
    const str = fs.readFileSync('example.txt', 'utf8');
    . . .

    const result = await connection.execute(
        `INSERT INTO mylobs (id, myclobcol) VALUES (:idbv, :cbv)`,
        { idbv: 1, cbv: str }  // type and direction are optional for IN binds
    );

    console.log('CLOB inserted from example.txt');
    . . .

Updating LOBs is similar to insertion:

.. code-block:: javascript

    const result = await connection.execute(
        `UPDATE mylobs SET myclobcol = :cbv WHERE id = :idbv`,
        { idbv: 1, cbv: str }
    );

Buffers can similarly be bound for inserting into, or updating, BLOB
columns.

When binding Strings to NCLOB columns, explicitly specify the bind
:ref:`type <executebindparamtype>` as
:ref:`oracledb.DB_TYPE_NVARCHAR <oracledbconstantsdbtype>`:

.. code-block:: javascript

    const result = await connection.execute(
        `UPDATE mylobs SET mynclobcol = :ncbv WHERE id = :idbv`,
        { idbv: 1,  ncbv: { type: oracledb.DB_TYPE_NVARCHAR, val: str } }
    );

When using PL/SQL, a procedure:

.. code-block:: sql

    PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB) . . .

can be called like:

.. code-block:: javascript

    const bigStr = 'My string to insert';
    const bigBuf = Buffer.from([. . .]);

    const result = await connection.execute(
        `BEGIN lobs_in(:id, :c, :b); END;`,
        { id: 20,
          c: bigStr,    // type and direction are optional for CLOB and BLOB IN binds
          b: bigBuf }
        }
    );

See :ref:`LOB Bind Parameters <lobbinds>` for size considerations
regarding LOB binds.

If the data is larger than can be handled as a String or Buffer in
Node.js or node-oracledb, it will need to be streamed to a
:ref:`Lob <lobclass>`, as discussed in :ref:`Streaming
Lobs <streamsandlobs>`.

See :ref:`fetchinglob` for information on how to fetch CLOBs, BLOBs, and NCLOBs.

.. _insertbfile:

Inserting BFILEs
----------------

The data of `BFILE <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-D4642C92-F343-4700-9F1F-486F82249FB8>`__ type LOB is stored as files in a
directory in the Oracle Database server. The column of type BFILE stores a
reference to the file stored in the Oracle Database server file system.
The BFILE column data cannot be updated from within your application since
Oracle Database allows read-only access to the data stored in BFILE columns.

Before using the BFILE data type, ensure that you have created a directory in
the database server file system to store the file. Each BFILE object is
associated with:

- A DIRECTORY object which is an alias for the directory on the database
  server file system that stores the file with BFILE data. For example, if
  your server is running on a Linux machine, you can create a DIRECTORY object
  by using:

  .. code-block:: sql

        CREATE OR REPLACE DIRECTORY MYBFILEDIR AS '/tmp/my-bfile-dir'

  ``MYBFILEDIR`` is the directory alias.
  ``/tmp/my-bfile-dir`` is the physical operating system directory in the
  database server file system. It is a string containing the full path name of
  the directory and follows the operating system rules.

  This directory and alias are used in subsequent examples.
- The file name of the physical file which is stored in the directory in the
  database server file system. For example, ``MYBFILE.JPG``. The file in this
  directory can be copied using operating system commands such as ``cp`` or
  ``COPY``. This file name is used in subsequent examples.

Ensure that you have the required access permissions to the directory. For
Windows platform, ensure that you have set the Access Control Lists (ACL) or
Discretionary Access Control List (DACL) correctly to access the file.

The following table will be used in the subsequent examples to demonstrate
using ``BFILE`` data with node-oracledb:

.. code-block:: sql

    CREATE TABLE bfile_table(
        id NUMBER,
        bfilecol BFILE
    );

To insert data of BFILE data type:

.. code-block:: javascript

    const result = await connection.execute(
        `INSERT INTO bfile_table VALUES (:id, BFILENAME(:BFILEDIR, :BFILENAME))`,
        [101, "MYBFILEDIR", "MYBFILE.JPG"]);

This example inserts a row in ``bfile_table`` with BFILE properties,
directory alias ``MYBFILEDIR`` and file name ``MYBFILE.JPG``.

Note that the content in the BFILE column cannot be updated. You can only
update the properties such as directory alias and the file name. Once updated,
the LOB object references the new file name specified. To update the file name
to ``NEWBFILE.JPG``, you can use:

.. code-block:: javascript

    const result = await connection.execute(
        `UPDATE bfile_table SET bfilecol = BFILENAME("MYBFILEDIR", "NEWBFILE.JPG") WHERE id = :ID`,
        [101]);

You can set the directory alias and file name using
:meth:`lob.setDirFileName()`. For example:

.. code-block:: javascript

    const result = await conn.execute(`
        SELECT bfilecol FROM bfile_table WHERE id = :id`, [101]);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    lob.setDirFileName({dirName: "NEWALIASNAME", fileName: "NEWBFILENAME"});

This will update the directory alias to ``NEWALIASNAME`` and file name to
``NEWBFILENAME``.

See :ref:`fetchbfile` for information on how to query a BFILE column.

.. _queryinglobs:

Simple LOB Queries and PL/SQL OUT Binds
=======================================

.. _fetchinglob:

Fetching CLOBs, BLOBs, and NCLOBs
---------------------------------

LOBs queried from the database that are shorter than 1 GB can be
returned as Strings or Buffers by using
:attr:`oracledb.fetchAsString` or :attr:`oracledb.fetchAsBuffer` (or
:ref:`fetchInfo <propexecfetchinfo>`). If the data is larger than can
be handled as a String or Buffer in Node.js or node-oracledb, it will
need to be streamed from a :ref:`Lob <lobclass>`, as discussed later in
:ref:`Streaming Lobs <streamsandlobs>`.

For example, to make every CLOB and NCLOB queried by the application be
returned as a string:

.. code-block:: javascript

    oracledb.fetchAsString = [ oracledb.CLOB ];

    const result = await connection.execute(`SELECT c FROM mylobs WHERE id = 1`);

    if (result.rows.length === 0)
        console.error("No results");
    else {
        const clob = result.rows[0][0];
        console.log(clob);
    }

CLOB columns in individual queries can be fetched as strings using
``fetchInfo``:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT c FROM mylobs WHERE id = 1`,
        [], // no binds
        { fetchInfo: {"C": {type: oracledb.STRING}} }
    );

    if (result.rows.length === 0) {
        console.error("No results");
    }
    else {
        const clob = result.rows[0][0];
        console.log(clob);
    }

.. _fetchasbuffereg:

BLOB query examples are very similar. To force every BLOB in the
application to be returned as a buffer:

.. code-block:: javascript

    oracledb.fetchAsBuffer = [ oracledb.BLOB ];

    const result = await connection.execute(`SELECT b FROM mylobs WHERE id = 2`);

    if (result.rows.length === 0)
        console.error("No results");
    else {
        const blob = result.rows[0][0];
        console.log(blob.toString());  // assuming printable characters
    }

BLOB columns in individual queries can be fetched as buffers using
``fetchInfo``:

.. code-block:: javascript

    const result = await connection.execute(
        `SELECT b FROM mylobs WHERE id = 2`,
        [ ], // no binds
        { fetchInfo: {"B": {type: oracledb.BUFFER}} }
    );

    if (result.rows.length === 0) {
        console.error("No results");
    } else {
        const blob = result.rows[0][0];
        console.log(blob.toString());  // assuming printable characters
    }

Getting LOBs as String or Buffer from PL/SQL
++++++++++++++++++++++++++++++++++++++++++++

To get PL/SQL LOB OUT parameters as String or Buffer, set the bind
``type`` as:

- ``oracledb.STRING`` for CLOB
- ``oracledb.DB_TYPE_NVARCHAR`` for NCLOB
- ``oracledb.BUFFER`` for BLOB

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN lobs_out(:id, :c, :b); END;`,
        { id: 20,
          c: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000},
          b: {type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 50000}
        }
    );

    const str = result.outBinds.c;  // a String
    const buf = result.outBinds.b;  // a Buffer

    . . . // do something with str and buf

The fetched String and Buffer can be used directly in Node.js.

If data to be bound is larger than can be handled as a String or Buffer
in Node.js or node-oracledb, it will need to be explicitly streamed to a
:ref:`Lob <lobclass>`, as discussed in :ref:`Streaming
Lobs <streamsandlobs>`. See :ref:`LOB Bind Parameters <lobbinds>` for
size considerations regarding LOB binds.

.. _fetchbfile:

Fetching BFILEs
---------------

To query the BFILE column of ``bfile_table``, you can use:

.. code-block:: javascript

    const result = await connection.execute(
         `SELECT bfilecol FROM bfile_table WHERE id = :id`, [101]);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    console.log("Directory Alias:", dirFile.dirName, "File Name:", dirFile.fileName);

This prints the following output::

    MYBFILEDIR, MYBFILE.JPG

To query the metadata of a BFILE column, you can use:

.. code-block:: javascript

    const result = await connection.execute(`SELECT bfilecol FROM bfile_table`);
    console.log("Metadata:", result.metaData);

This query prints the metadata for the ``bfilecol`` column and displays the
dbType as ``DB_TYPE_BFILE``::

    MetaData: [
        {
            name: 'BFILECOL',
            dbType: [DbType DB_TYPE_BFILE],
            nullable: false,
            isJson: false,
            isOson: false,
            dbTypeName: 'BFILE',
            fetchType: [DbType DB_TYPE_BFILE],
            converter: [Function: converter]
        },
    ]

.. _streamsandlobs:

Streaming Lobs
==============

The :ref:`Lob Class <lobclass>` in node-oracledb implements the `Node.js
Stream <https://nodejs.org/api/stream.html>`__ interface to provide
streaming access to CLOB, NCLOB and BLOB database columns and to PL/SQL
bind parameters.

Node-oracledb Lobs can represent persistent LOBs (those permanently
stored in the database) or temporary LOBs (such as those created with
:meth:`connection.createLob()`, or returned from some SQL or PL/SQL).

If multiple LOBs are streamed concurrently, worker threads will
effectively be serialized on the connection.

It is the application’s responsibility to make sure the connection
remains open while a Stream operation such as ``pipe()`` is in progress.

Readable Lobs
-------------

Being a Stream object, a Lob being read from the database has two modes
of operation: “flowing mode” and “paused mode”. In flowing mode, data is
piped to another stream, or events are posted as data is read. In paused
mode the application must explicitly call ``read()`` to get data.

The ``read(size)`` unit is in bytes for BLOBs, and characters for CLOBs
and NCLOBs.

When reading a LOB from the database, resources are automatically
released at completion of the readable stream or if there is a LOB
error. The :meth:`lob.destroy()` method can also be used
to close persistent LOBs that have not been streamed to completion.

A Readable Lob object starts out in paused mode. If a ``data`` event
handler is added, or the Lob is piped to a Writeable stream, then the
Lob switches to flowing mode.

For unpiped Readable Lobs operating in flowing mode where the Lob is
read through event handlers, the Lob object can be switched to paused
mode by calling ``pause()``. Once the Lob is in paused mode, it stops
emitting ``data`` events.

Similarly, a Readable Lob operating in the paused mode can be switched
to flowing mode by calling ``resume()``. It will then start emitting
``data`` events again.

Writeable Lobs
--------------

Lobs are written to with ``pipe()``. Alternatively the ``write()``
method can be called successively, with the last piece being written by
the ``end()`` method. The ``end()`` method must be called because it
frees resources. If the Lob is being piped into, then the ``write()``
and ``end()`` methods are automatically called.

Writeable Lobs also have events, see the `Node.js
Stream <https://nodejs.org/api/stream.html>`__ documentation.

At the conclusion of streaming into a Writeable Lob, the ``finish``
event will occur. It is recommended to put logic such as committing and
releasing connections in this event (or after it occurs). See
`lobinsert2.js <https://github.com/oracle/node-oracledb/tree/main/examples/lobinsert2.js>`__.

.. _lobinsertdiscussion:

Using RETURNING INTO to Insert into LOBs
========================================

If Strings or Buffers are too large to be directly inserted into the
database (see :ref:`Simple Insertion of LOBs <basiclobinsert>`), use a
``RETURNING INTO`` clause to retrieve a :ref:`Lob <lobclass>` for a table
item. Data can then be streamed into the Lob and committed directly to
the table:

.. code-block:: javascript

    const result = await connection.execute(
        `INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv`,
        { id: 4,
          lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false }  // a transaction needs to span the INSERT and pipe()
    );

    if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
        throw new Error('Error getting a LOB locator');
    }

    const doInsert = new Promise((resolve, reject) => {
        const lob = result.outBinds.lobbv[0];
        lob.on('finish', async () => {
            await connection.commit();  // all data is loaded so we can commit it
        });
        lob.on('error', async (err) => {
            await connection.close();
            reject(err);
        });

        const inStream = fs.createReadStream('example.txt'); // open the file to read from
        inStream.on('error', (err) => {
            reject(err);
        });

        inStream.pipe(lob);  // copies the text to the LOB
    });

    await doInsert;

This example streams from a file into the table. When the data has been
completely streamed, the Lob is automatically closed and the ``close``
event triggered. At this point the data can be committed.

See `lobinsert2.js <https://github.com/oracle/node-oracledb/tree/main/
examples/lobinsert2.js>`__ for the full example.

.. _loboutstream:

Getting LOBs as Streams from Oracle Database
============================================

By default, when a ``SELECT`` clause contains a LOB column, or a PL/SQL
OUT parameter returns a LOB, instances of :ref:`Lob <lobclass>` are
created. (This can be changed, see :ref:`Simple LOB Queries and PL/SQL OUT
Binds <queryinglobs>`.)

For each Lob instance, the :attr:`lob.type` property will
be :ref:`oracledb.BLOB <oracledbconstantsnodbtype>` or
:ref:`oracledb.CLOB <oracledbconstantsnodbtype>`, depending on the
column or PL/SQL parameter type.

Returned Lobs can be used as `Readable
Streams <https://nodejs.org/api/stream.html>`__. Data can be streamed
from each Lob, for example to a file. At the conclusion of the stream,
persistent LOBs are automatically closed.

Lobs returned from the database that are not streamed can be passed back
to the database as IN binds for PL/SQL blocks, for ``INSERT``, or for
``UPDATE`` statements. The Lobs should then be closed with
:meth:`lob.destroy()`. If they are passed as IN OUT binds,
they will be automatically closed and the execution
:ref:`outBinds <execoutbinds>` property will contain the updated Lob.

LOB Query Example
-----------------

Each CLOB, NCLOB or BLOB in a ``SELECT`` returns a :ref:`Lob <lobclass>`
by default. For example, the table:

.. code-block:: sql

    CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);

can be called to get a Lob ``clob`` like:

.. code-block:: javascript

    const result = await connection.execute(`SELECT c FROM mylobs WHERE id = 1`);

    if (result.rows.length === 1) {
        const clob = result.rows[0][0]; // Instance of a node-oracledb Lob
        // console.log(clob.type);      // -> 2017 aka oracledb.CLOB
        . . .                           // do something with the Lob
    }

PL/SQL LOB Parameter Fetch Example
----------------------------------

A PL/SQL procedure such as this:

.. code-block:: sql

    PROCEDURE lobs_out (id IN NUMBER, clob_out OUT CLOB, blob_out OUT BLOB) . . .

can be called to get the :ref:`Lobs <lobclass>` ``clob`` and ``blob``:

.. code-block:: javascript

    const result = await connection.execute(
        `BEGIN lobs_out(:id, :c, :b); END;`,
        { id: 1,
          c: {type: oracledb.CLOB, dir: oracledb.BIND_OUT},
          b: {type: oracledb.BLOB, dir: oracledb.BIND_OUT}
        }
    );

    const clob = result.outBinds.c;
    const blob = result.outBinds.b;

    . . . // do something with the Lobs

To bind a Lob object to an NCLOB parameter, set ``type`` to
``oracledb.DB_TYPE_NCLOB``.

Streaming Out a Lob
-------------------

Once a Lob is obtained from a query or PL/SQL OUT bind, it can be
streamed out:

.. code-block:: javascript

    if (lob === null) {
        // . . . do special handling such as create an empty file or throw an error
    }

    if (lob.type === oracledb.CLOB) {
        lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    }

    lob.on('error', function(err) { cb(err); });
    lob.on('end', function() { cb(null); });   // all done.  The Lob is automatically closed.

    const outStream = fs.createWriteStream('myoutput.txt');
    outStream.on('error', function(err) { cb(err); });

    // switch into flowing mode and push the LOB to myoutput.txt
    lob.pipe(outStream);

Note the Lob is automatically closed at the end of the stream.

An alternative to the ``lob.pipe()`` call is to have a ``data`` event on
the Lob Stream which processes each chunk of LOB data separately. Either
a String or Buffer can be built up or, if the LOB is big, each chunk can
be written to another Stream or to a file:

.. code-block:: javascript

    if (lob === null) {
        // . . . do special handling such as create an empty file or throw an error
    }

    let str = "";

    lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    lob.on('error', function(err) { cb(err); });
    lob.on('end', function() { cb(null); });   // all done.  The Lob is automatically closed.
    lob.on('data', function(chunk) {
        str += chunk; // or use Buffer.concat() for BLOBS
    });
    lob.on('end', function() {
        fs.writeFile(..., str, ...);
    });

Node-oracledb’s :attr:`lob.pieceSize` can be used to
control the number of bytes retrieved for each readable ``data`` event.
This sets the number of bytes (for BLOBs) or characters (for CLOBs and
NCLOBs). The default is :attr:`lob.chunkSize`. The
recommendation is for it to be a multiple of ``chunkSize``.

See `lobbinds.js <https://github.com/oracle/node-oracledb/tree/main/
examples/lobbinds.js>`__ for a full example.

.. _templobdiscussion:

Using ``createLob()`` for PL/SQL IN Binds
=========================================

Node-oracledb applications can create Oracle ‘temporary LOBs’ by calling
:meth:`connection.createLob()`. These are instances of the
:ref:`Lob <lobclass>` class. They can be populated with data and
passed to PL/SQL blocks. This is useful if the data is larger than
feasible for direct binding (see :ref:`Simple Insertion of
LOBs <basiclobinsert>`). These Lobs can also be used for SQL
statement IN binds, however the ``RETURNING INTO`` method shown above
will be more efficient.

Lobs from ``createLob()`` will use space in the temporary tablespace
until :meth:`lob.destroy()` is called. Database
Administrators can track this usage by querying
`V$TEMPORARY_LOBS <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=
GUID-4E9360AA-C610-4341-AAD3-9DCDF82CF085>`__.

Passing a Lob Into PL/SQL
-------------------------

The following insertion example is based on `lobplsqltemp.js
<https://github.com/oracle/node-oracledb/tree/main/examples/lobplsqltemp.js>`__.
It creates an empty LOB, populates it, and then passes it to a PL/SQL
procedure.

A temporary LOB can be created with
:meth:`connection.createLob()`:

.. code-block:: javascript

    const templob = await connection.createLob(oracledb.CLOB);

Once created, data can be inserted into it. For example to read a text
file:

.. code-block:: javascript

    templob.on('error', function(err) { somecallback(err); });

    // The data was loaded into the temporary LOB, so use it
    templob.on('finish', function() { somecallback(null, templob); });

    // copies the text from 'example.txt' to the temporary LOB
    const inStream = fs.createReadStream('example.txt');
    inStream.on('error', function(err) { . . . });
    inStream.pipe(templob);

Now the LOB has been populated, it can be bound in ``somecallback()`` to
a PL/SQL IN parameter:

.. code-block:: javascript

    // For PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB)
    const result = await connection.execute(
        `BEGIN lobs_in(:id, :c, null); END;`,
        { id: 3,
          c: templob  // type and direction are optional for IN binds
        }
    );

When the temporary LOB is no longer needed, it must be closed with
:meth:`lob.destroy()`:

.. code-block:: javascript

    await templob.destroy();

.. _closinglobs:

Closing Lobs
============

Closing a Lob frees up resources. In particular, the temporary
tablespace storage used by a temporary LOB is released. Once a Lob is
closed, it can no longer be bound or used for streaming.

Lobs created with :meth:`~connection.createLob()` should be
explicitly closed with :meth:`lob.destroy()`.

Persistent or temporary Lobs returned from the database should be closed
with ``lob.destroy()`` unless they have been automatically closed.
Automatic closing of returned Lobs occurs when:

-  streaming has completed
-  a stream error occurs
-  the Lob was used as the source for an IN OUT bind
