Node-oracledb Shutdown/Startup Tests

These tests perform database shutdown and startup operations on an Oracle Database.
Tests validate administrative operations such as shutting down and starting up a database instance using Oracle's flexible API
and simple APIs.

Prerequisites
Before running the tests, ensure the following requirements are met:

Oracle Database:
The database must be configured to allow SYSDBA connections.
The connect string used must point to the CDB root in case of a multitenant setup.

DBA User Credentials:
A DBA user with SYSDBA privileges is required to perform shutdown and startup operations.

NOTE: These tests are designed for on-premises or manually managed Oracle Database instances on the same host as the client.
It does NOT work with Oracle Autonomous Databases or fully managed cloud environments or remote databases.
