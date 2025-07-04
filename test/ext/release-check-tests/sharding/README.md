# Oracle Database Sharding Tests
This directory contains comprehensive test suites for Oracle Database sharding functionality using the Oracle Node.js driver (node-oracledb). The tests validate various sharding key types, connection methods, and error handling scenarios.

# Important Prerequisites
These tests require Oracle Globally Distributed Databases (Oracle Sharding) to be properly configured and running.
This CANNOT be run on normal Oracle databases. The tests specifically require:

Oracle Database 12.2 or higher with sharding enabled
A configured shard catalog database
Multiple shard databases (minimum 2 shards)

Environment Variables
Before running the tests, you must set the following environment variables:
Required Environment Variables

# Database connection credentials
NODE_ORACLEDB_USER
NODE_ORACLEDB_PASSWORD

# Catalog database connection string (main shard coordinator)
NODE_ORACLEDB_CATALOG_CONNECTSTRING="localhost:1521/catalog_pdb"

# Individual shard connection strings
NODE_ORACLEDB_SHARD1_CONNECTSTRING="localhost:1521/shard1_pdb"
NODE_ORACLEDB_SHARD2_CONNECTSTRING="localhost:1521/shard2_pdb"

ShardingSetup.js
The shardingSetup.js file serves as the central configuration and utility module for all sharding tests.