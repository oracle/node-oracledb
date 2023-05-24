.. _poolstatisticsclass:

*************************
API: PoolStatistics Class
*************************

A PoolStatistics object is returned from :meth:`pool.getStatistics()`.
It contains attributes recording the pool statistics and pool configuration.
The attributes are described in :ref:`poolstats`.

.. versionadded:: 5.3

.. _poolstatisticsmethods:

PoolStatistics Methods
======================

.. method:: poolstatistics.logStatistics()

    .. versionadded:: 5.3

    .. code-block:: javascript

        logStatistics();

    This synchronous function prints the pool statistics similar to
    :meth:`pool.logStatistics()`.
