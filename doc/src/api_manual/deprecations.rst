.. _deprecations:

***********************************
Deprecated and Desupported Features
***********************************

The following table contains the deprecated and desupported features of the
node-oracledb API, the version they were deprecated or desupported, and an
alternative to use instead, if applicable. The desupported API feature is a
previous deprecation that has been removed and is not available in
node-oracledb. The most recent deprecated and desupported features are listed
first.

.. list-table-with-summary:: Deprecated and Desupported API Features
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 20 20 15
    :width: 100%
    :summary: The first column displays the name of the deprecated or desupported feature. The second column displays the node-oracledb version in which the feature was deprecated or desupported. The third column displays the API property, method, or constant to use instead, if applicable.

    * - Name
      - Version Deprecated or Desupported
      - Alternative
    * - Connectivity and interoperability with Oracle Database and Oracle Client libraries older than version 19
      - Deprecated in 6.10
      - Upgrade the database and client library versions.

        Production use, and availability of database and client software, is detailed in `Release Schedule of Current Database Releases <https://support.oracle.com/epmos/faces/ DocumentDisplay?id=742060.1>`__.
    * - Property :ref:`fetchInfo <propexecfetchinfo>`
      - Deprecated in 6.0
      - Use :ref:`fetchTypeHandler <fetchtypehandler>` functionality
    * - Property :attr:`oracledb.extendedMetaData`
      - Desupported in 6.0
      - Extended metadata is now always returned
    * - Property :ref:`extendedMetaData <propexecextendedmetadata>` of ``connection.execute()`` ``Options`` Parameter
      - Desupported in 6.0
      - Extended metadata is now always returned
    * - Property :ref:`accessTokenCallback <createpoolpoolattrsaccesstokencallback>`
      - Desupported in 6.0

        Deprecated in 5.5
      - Use :ref:`accessToken <createpoolpoolattrsaccesstoken>`
    * - Method :meth:`pool.setAccessToken()`
      - Deprecated in 5.5
      - NA
    * - Property ``_enablestats``
      - Deprecated in 5.2
      - Use :ref:`enableStatistics <createpoolpoolattrsstats>`
    * - ``_logStats()``
      - Deprecated in 5.2
      - Use :meth:`pool.logStatistics()`
    * - Method :meth:`lob.close()`
      - Deprecated in 4.2
      - Use :meth:`lob.destroy()`
    * - Constants ``oracledb.ARRAY`` and ``oracledb.OBJECT``
      - Deprecated in 4.0
      - Use ``oracledb.OUT_FORMAT_ARRAY`` and ``oracledb.OUT_FORMAT_OBJECT``
    * - Property :attr:`oracledb.queueRequests`
      - Desupported in 3.0

        Deprecated in 2.3
      - Connection pool queuing is always enabled
