.. _poolstatisticsclass:

*************************
API: PoolStatistics Class
*************************

A PoolStatistics object is returned from :meth:`pool.getStatistics()`.
It contains attributes recording the pool statistics and pool configuration.
The attributes are described in :ref:`Connection Pool Monitoring
<connpoolmonitor>`.

.. versionadded:: 5.3

.. _poolstatisticsmethods:

PoolStatistics Methods
======================

.. method:: poolstatistics.logStatistics()

    .. code-block:: javascript

        logStatistics();

    This synchronous function prints the pool statistics similar to
    :meth:`pool.logStatistics()`.

    .. versionadded:: 5.3
