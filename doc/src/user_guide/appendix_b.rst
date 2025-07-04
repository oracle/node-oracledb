.. _frameworks:

************************************************
Appendix B: Node.js Frameworks and node-oracledb
************************************************

The features of node-oracledb Thin and Thick modes cover the needs of common
Node.js frameworks and libraries.

Node-oracledb Thin and Thick modes can be used in `Sequelize
<https://sequelize.org/>`__. To run node-oracledb Thin mode through Sequelize,
you must *not* set the ``libPath`` in the dialectOptions object and must not
call :meth:`~oracledb.initOracleClient`. For node-oracledb Thick mode, set the
``libPath`` in the dialectOptions object or call
:meth:`~oracledb.initOracleClient()`.

You can use the `OpenTelemetry <https://opentelemetry.io/>`__ observability
framework with node-oracledb to generate telemetry data for Oracle Database
connections. This helps you to analyze and monitor connection metrics and
optimize them, if necessary. See :ref:`opentelemetry` for more information.
