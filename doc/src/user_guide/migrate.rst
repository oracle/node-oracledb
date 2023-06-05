.. _migrate:

**********************************************
Upgrading to the Latest node-oracledb Releases
**********************************************

.. _upgradev55v60:

Upgrading from node-oracledb 5.5 to 6.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- To use node-oracledb 6.0, you need Node.js 14.6 or later versions. Update
  your Node.js version, if necessary.

- With node-oracledb 6.0, connections to Oracle Database can be established
  in one of the two modes:

   - **Thin mode**: By default, node-oracledb operates in this mode and
     connects directly to Oracle Database. This mode does not require Oracle
     Client libraries.
   - **Thick mode**: When Oracle Client libraries are used, then node-oracledb
     is in Thick mode. You must call :meth:`oracledb.initOracleClient`
     to enable Thick mode. See :ref:`enablingthick`.

- Review the updated :ref:`node-oracledb installation instructions
  <installation>` and :ref:`initialization options <initnodeoracledb>`.

- The Oracle Database features supported by the node-oracledb Thin and Thick
  modes and the notable differences between these two modes are detailed
  :ref:`here <appendixa>`.

- If your application currently uses Thick mode, and you want to use the Thin
  mode, see :ref:`changingthick`.

- Note that the Oracle Database Type constants were changed to database type
  objects in node-oracledb 6.0. When comparing fetch types, ensure that you
  are using the database type object name instead of the the database type
  number. For example, use
  ``result.metadata[0].fetchType == oracledb.DB_TYPE_VARCHAR`` instead of
  ``result.metadata[0].fetchType == 2001``.

- Oracle Database DATE and TIMESTAMP types are now returned as JavaScript date
  types in the application's timezone. These database types are no longer
  fetched or bound as TIMESTAMP WITH LOCAL TIME ZONE. The connection session
  time zone does not impact these database types. There is no change to the
  handling of TIMESTAMP WITH TIMEZONE and TIMESTAMP WITH LOCAL TIMEZONE types.

- The execution option attribute ``fetchInfo`` was deprecated. You can use the
  :ref:`fetchtypehandler` functionality instead which has introduced a new
  :attr:`oracledb.fetchTypeHandler` and equivalent execution option which allows
  you to alter the queried data before it is returned to the application.

- The previously deprecated Token-Based Authentication ``accessTokenCallback``
  attribute has been removed. Use
  :ref:`accessToken <createpoolpoolattrsaccesstoken>` instead.

- Extended metadata is now always returned for queries. The
  ``oracledb.extendedMetaData`` and equivalent
  :ref:`execution attribute <propexecextendedmetadata>` values are
  ignored.

- The node-oracledb Thin and Thick modes may return different errors in some
  scenarios. See :ref:`exceptions`.

- The node-oracledb Thick mode uses Oracle Database's National Language Support
  (NLS) functionality to assist in globalizing applications. The node-oracledb
  Thin mode uses Node.js localization functions. See :ref:`nls`.

.. _changingthick:

Changing Applications to Use node-oracledb Thin Mode
----------------------------------------------------

Changing an existing application that currently uses :ref:`Thick mode
<thickarch>` to use Thin mode may require a few changes as detailed below.

1. Review :ref:`featuresummary` and :ref:`modediff` to ensure that all the
   features required for your application are supported by the Thin mode.

   The node-oracledb Thin and Thick modes can both connect to on-premises
   databases and Oracle Cloud databases. However, the node-oracledb Thin mode
   does not support some of the advanced Oracle Database features such as
   Application Continuity (AC), Advanced Queuing (AQ), Continuous Query
   Notification (CQN), SODA, and Sharding.

2. If you are upgrading from node-oracledb 5.5, then review
   :ref:`upgradev55v60`.

3. Remove all calls to :meth:`oracledb.initOracleClient()` from the
   application since this enables the node-oracledb Thick mode.

4. If the ``configDir`` parameter of :meth:`~oracledb.initOracleClient` had
   been used, then set the ``configDir`` attribute of any
   :meth:`oracledb.getConnection()` or :meth:`oracledb.createPool()` calls.

5. If the application is connecting using a net service alias and is looking up
   that alias in a ``tnsnames.ora`` file from a "default" location such as the
   Instant Client ``network/admin/`` subdirectory, in
   ``$ORACLE_HOME/network/admin/``, or in
   ``$ORACLE_BASE/homes/XYZ/network/admin/`` (in a read-only Oracle Database
   home), then the configuration file directory must now explicitly be set.
   See :ref:`usingconfigfiles`.

6. The node-oracledb Thin mode does not support ``sqlnet.ora`` files. Some of
   these parameters can be set as :meth:`~oracledb.getConnection()` or
   :meth:`~oracledb.createPool()` attributes, or in an Easy Connect string, or
   in the ``tnsnames.ora`` file connect descriptors.

7. If you were using node-oracledb in an ORACLE_HOME database installation
   environment, you will now need to use an explicit connection string since
   the ``ORACLE_SID`` environment variable is not used in node-oracledb Thin
   mode.

8. Remove calls to :attr:`oracledb.oracleclientVersion()` and
   :attr:`oracledb.oracleclientVersionString` which are only available in
   the node-oracledb Thick mode. Oracle Client libraries are not used
   in Thin mode.

9. Ensure that any assumptions about when connections are created in the
   connection pool are eliminated. The node-oracledb Thin mode creates
   connections in an async fashion and so :meth:`oracledb.createPool()` will
   return before any, or all, minimum number of connections are created. The
   attribute :attr:`pool.connectionsOpen` will change over time and will not
   be equal to :attr:`pool.poolMin` immediately after the pool is created. In
   node-oracledb Thick mode and earlier node-oracledb versions,
   ``oracledb.createPool()`` does not return control to the application until
   all the ``pool.poolMin`` connections were created.

10. Make any additional code changes required for :ref:`exceptions` differences,
    or :ref:`nls` differences.

11. When you are satisfied, you can optionally remove Oracle Client
    libraries. For example, by deleting your Oracle Instant Client directory.

You can find the node-oracledb mode by checking node-oracledb attributes or
querying the ``V$SESSION_CONNECT_INFO`` table, see :ref:`vsessconinfo`.

.. _upgradev54v55:

Upgrading from node-oracledb 5.4 to 5.5
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

.. _upgradev53v54:

Upgrading from node-oracledb 5.3 to 5.4
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

.. _upgradev52v53:

Upgrading from node-oracledb 5.2 to 5.3
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

.. _migratev51v52:

Upgrading from node-oracledb 5.1 to 5.2
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the dead connection detection changes and adjust any
  application error checks to look for the new error *DPI-1080*.

- Replace obsolete uses of ``_enableStats`` and ``_logStats()`` with
  the new functionality
  :ref:`enableStatistics <createpoolpoolattrsstats>`,
  :meth:`~pool.getStatistics()`, and :meth:`~pool.logStatistics()`.

.. _migratev42v50:

Upgrading from node-oracledb 4.2 to 5.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the updated installation and initialization options in the
  :ref:`node-oracledb installation
  instructions <installation>` and :ref:`Initializing Node-oracledb
  <initnodeoracledb>`, particularly
  around how node-oracledb can locate Oracle Client libraries.

- Choose a sensible value for the new *Pool*
  :attr:`~oracledb.queueMax` attribute, so that applications
  get the new error only under abnormal connection load. To allow all
  pooled connection requests to be queued (the previous behavior), set
  it to -1.

- Take advantage of the new
  :ref:`prefetchRows <propexecprefetchrows>` attribute to re-tune SQL
  queries.

- Support for custom Promises was necessarily removed due to a
  refactoring of the module’s JavaScript layer. Code should be migrated
  to use the native Node.js Promise implementation.

- The function call parameter errors *NJS-005: invalid value for
  parameter* and *NJS-009: invalid number of parameters* are now passed
  through the callback, if one is used. In earlier versions they were
  thrown without the ability for them to be caught.

.. _migratev41v42:

Upgrading from node-oracledb 4.1 to 4.2
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review the updated Lob stream documentation. The best practice is to
  use the ``end`` event (for readable streams) and ``finish`` event
  (for writeable streams) instead of depending on the ``close`` event.
  Applications should migrate to the Node.js 8
  :meth:`~lob.destroy()` method instead of the deprecated
  node-oracledb :meth:`~lob.close()` method. Note that unlike
  ``close()``, the ``destroy()`` method does not take a callback
  parameter. If ``destroy()`` is given an error argument, an ``error``
  event is emitted with this error.

.. _migratev40v41:

Upgrading from node-oracledb 4.0 to 4.1
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Review your application use of node-oracledb error messages since
  some have changed.

- Note that the default for :attr:`oracledb.events` has
  reverted to *false*. If you relied on it being *true*, then
  explicitly set it.

.. _migratev31v40:

Upgrading from node-oracledb 3.1 to 4.0
=======================================

- Review the :ref:`releasenotes` and take advantage of new features.

- Update Node.js, if necessary. Node-oracledb 4.0 requires

   - Node.js 8.16 or higher
   - Node.js 10.16, or higher
   - Node.js 12

- Review error handling. Some errors have changed. All exceptions are
  now passed through the error callback.

- Code that relied on numeric values for the :ref:`node-oracledb Type
  Constants <oracledbconstantsnodbtype>` and :ref:`Oracle Database Type
  Constants <oracledbconstantsdbtype>` will need updating. Use the
  constant names instead of their values.

- To view node-oracledb class information, update code to use
  ``Object.getPrototypeOf()``.

- Optionally migrate :attr:`~oracledb.outFormat` constants to the new,
  preferred names
  :ref:`OUT_FORMAT_ARRAY <oracledbconstantsoutformat>` and
  :ref:`OUT_FORMAT_OBJECT <oracledbconstantsoutformat>`.

Earlier node-oracledb Versions
==============================

Documentation about node-oracledb version 1 is
`here <https://github.com/oracle/node-oracledb/blob/node-oracledb-v1/doc/api.md>`__.

Documentation about node-oracledb version 2 is
`here <https://github.com/oracle/node-oracledb/blob/v2.3.0/doc/api.md>`__.

Documentation about node-oracledb version 3 is
`here <https://github.com/oracle/node-oracledb/blob/v3.1.2/doc/api.md>`__.

Documentation about node-oracledb version 4 is
`here <https://github.com/oracle/node-oracledb/blob/v4.2.0/doc/api.md>`__.
