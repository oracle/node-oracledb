.. _deprecations:

***********************************
Deprecated and Desupported Features
***********************************

The following table contains the deprecated and desupported methods,
properties, and constants of the node-oracledb API, the version they were
deprecated or desupported, and an alternative to use instead, if applicable.
The desupported API feature is a previous deprecation that has been removed
and is not available in node-oracledb. The most recent deprecated and
desupported features are listed first.

.. list-table-with-summary:: Deprecated and Desupported API Features
    :header-rows: 1
    :class: wy-table-responsive
    :align: center
    :widths: 10 25 20
    :width: 100%
    :summary: The first column displays the deprecated API method, property, or constant. The second column displays the node-oracledb version in which the API method, property, or constant was deprecated or desupported. The third column displays the API property, method, or constant to use instead, if applicable.

    * - Method, Property, or Constant
      - Version Deprecated or Desupported
      - Alternative
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
