.. _migrate:

**********************************************
Migrating from Previous node-oracledb Releases
**********************************************

Documentation about node-oracledb version 1 is
`here <https://github.com/oracle/node-oracledb/blob/node-oracledb-v1/doc/api.md>`__.

Documentation about node-oracledb version 2 is
`here <https://github.com/oracle/node-oracledb/blob/v2.3.0/doc/api.md>`__.

Documentation about node-oracledb version 3 is
`here <https://github.com/oracle/node-oracledb/blob/v3.1.2/doc/api.md>`__.

Documentation about node-oracledb version 4 is
`here <https://github.com/oracle/node-oracledb/blob/v4.2.0/doc/api.md>`__.

.. _migratev31v40:

Migrating from node-oracledb 3.1 to node-oracledb 4.0
=====================================================

When upgrading from node-oracledb version 3.1 to version 4.0:

-  Review the
   `CHANGELOG <https://github.com/oracle/node-oracledb/blob/main/CHANGELOG.md>`__
   and take advantage of new features.

-  Update Node.js, if necessary. Node-oracledb 4.0 requires

   -  Node.js 8.16 or higher
   -  Node.js 10.16, or higher
   -  Node.js 12

-  Review error handling. Some errors have changed. All exceptions are
   now passed through the error callback.

-  Code that relied on numeric values for the :ref:`node-oracledb Type
   Constants <oracledbconstantsnodbtype>` and :ref:`Oracle Database Type
   Constants <oracledbconstantsdbtype>` will need updating. Use the
   constant names instead of their values.

-  To view node-oracledb class information, update code to use
   ``Object.getPrototypeOf()``.

-  Optionally migrate :attr:`~oracledb.outFormat` constants to the new,
   preferred names
   :ref:`OUT_FORMAT_ARRAY <oracledbconstantsoutformat>` and
   :ref:`OUT_FORMAT_OBJECT <oracledbconstantsoutformat>`.

.. _migratev40v41:

Migrating from node-oracledb 4.0 to node-oracledb 4.1
=====================================================

When upgrading from node-oracledb version 4.0 to version 4.1:

-  Review the
   `CHANGELOG <https://github.com/oracle/node-oracledb/blob/main/CHANGELOG.md>`__
   and take advantage of new features.

-  Review your application use of node-oracledb error messages since
   some have changed.

-  Note that the default for :attr:`oracledb.events` has
   reverted to *false*. If you relied on it being *true*, then
   explicitly set it.

.. _migratev41v42:

Migrating from node-oracledb 4.1 to node-oracledb 4.2
=====================================================

-  Review the
   `CHANGELOG <https://github.com/oracle/node-oracledb/blob/main/CHANGELOG.md>`__
   and take advantage of new features.

-  Review the updated Lob stream documentation. The best practice is to
   use the ``end`` event (for readable streams) and ``finish`` event
   (for writeable streams) instead of depending on the ``close`` event.
   Applications should migrate to the Node.js 8
   :meth:`~lob.destroy()` method instead of the deprecated
   node-oracledb :meth:`~lob.close()` method. Note that unlike
   ``close()``, the ``destroy()`` method does not take a callback
   parameter. If ``destroy()`` is given an error argument, an ``error``
   event is emitted with this error.

.. _migratev42v50:

Migrating from node-oracledb 4.2 to node-oracledb 5.0
=====================================================

-  Review the
   `CHANGELOG <https://github.com/oracle/node-oracledb/blob/main/CHANGELOG.md>`__
   and take advantage of new features.

-  Review the updated installation and initialization options in the
   :ref:`node-oracledb installation
   instructions <installation>` and :ref:`Initializing Node-oracledb
   <initnodeoracledb>`, particularly
   around how node-oracledb can locate Oracle Client libraries.

-  Choose a sensible value for the new *Pool*
   :attr:`~oracledb.queueMax` attribute, so that applications
   get the new error only under abnormal connection load. To allow all
   pooled connection requests to be queued (the previous behavior), set
   it to -1.

-  Take advantage of the new
   :ref:`prefetchRows <propexecprefetchrows>` attribute to re-tune SQL
   queries.

-  Support for custom Promises was necessarily removed due to a
   refactoring of the module’s JavaScript layer. Code should be migrated
   to use the native Node.js Promise implementation.

-  The function call parameter errors *NJS-005: invalid value for
   parameter* and *NJS-009: invalid number of parameters* are now passed
   through the callback, if one is used. In earlier versions they were
   thrown without the ability for them to be caught.

.. _migratev51v52:

Migrating from node-oracledb 5.1 to node-oracledb 5.2
=====================================================

-  Review the
   `CHANGELOG <https://github.com/oracle/node-oracledb/blob/main/CHANGELOG.md>`__
   and take advantage of new features.

-  Review the dead connection detection changes and adjust any
   application error checks to look for the new error *DPI-1080*.

-  Replace obsolete uses of ``_enableStats`` and ``_logStats()`` with
   the new functionality
   :ref:`enableStatistics <createpoolpoolattrsstats>`,
   :meth:`~pool.getStatistics()`, and :meth:`~pool.logStatistics()`.
