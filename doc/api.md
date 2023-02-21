# node-oracledb 6.0.0-dev Documentation for the Oracle Database Node.js Add-on

*Copyright (c) 2015, 2023, Oracle and/or its affiliates.*

This software is dual-licensed to you under the Universal Permissive License
(UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
either license.

If you elect to accept the software under the Apache License, Version 2.0,
the following applies:

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

See
[LICENSE.txt](https://github.com/oracle/node-oracledb/blob/main/LICENSE.txt)
and
[THIRD_PARTY_LICENSES.txt](https://github.com/oracle/node-oracledb/blob/main/THIRD_PARTY_LICENSES.txt).

----------

## Note: The node-oracledb 5.5 documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/](https://node-oracledb.readthedocs.io/en/latest/).

## The new documentation layout facilitates better search and navigation of the content. For future node-oracledb releases, the latest updates will only be added to the new node-oracledb documentation.

----------

## Manual Sections

This document contains:

- [Node-oracledb API Manual](https://node-oracledb.readthedocs.io/en/latest/index.html#api-manual)
- [Node-oracledb User Manual](https://node-oracledb.readthedocs.io/en/latest/index.html#user-guide)

For installation information, see the [Node-oracledb Installation Instructions](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html).

## <a name="apimanual"></a> NODE-ORACLEDB API MANUAL

## <a name="intro"></a> 1. Introduction

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#intro](https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#intro).

### <a name="architecture"></a> 1.1 Node-oracledb Architecture
[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#architecture)

### <a name="getstarted"></a> 1.2 Getting Started with Node-oracledb

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#getstarted)

####  <a name="examplequery"></a> 1.2.1 Example: A SQL SELECT statement in Node.js

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#examplequery)

#### <a name="examplesodaawait"></a> 1.2.2 Example: Simple Oracle Document Access (SODA) in Node.js

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#examplesodaawait)

## <a name="errorobj"></a> 2. Errors

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#errorobj](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#errorobj).

### <a name="properror"></a> 2.1 Error Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#properror)

#### <a name="properrerrornum"></a> 2.1.1 `errorNum`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#error.errorNum)

#### <a name="properrmessage"></a> 2.1.2 `message`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#error.message)

#### <a name="properroffset"></a> 2.1.3 `offset`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#error.offset)

#### <a name="properrstack"></a> 2.1.4 `stack`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/errors.html#error.stack)

## <a name="oracledbclass"></a> 3. Oracledb Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbclass).

### <a name="oracledbconstants"></a> 3.1 Oracledb Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstants)

#### <a name="oracledbconstantsoutformat"></a> 3.1.1 Query `outFormat` Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsoutformat)

#### <a name="oracledbconstantsdbtype"></a> 3.1.2 Oracle Database Type Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsdbtype)

#### <a name="oracledbconstantsnodbtype"></a> 3.1.3 Node-oracledb Type Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsnodbtype)

#### <a name="oracledbconstantsbinddir"></a> 3.1.4 Execute Bind Direction Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsbinddir)

#### <a name="oracledbconstantsprivilege"></a> 3.1.5 Privileged Connection Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsprivilege)

#### <a name="oracledbconstantsstmttype"></a> 3.1.6 SQL Statement Type Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsstmttype)

#### <a name="oracledbconstantssubscription"></a> 3.1.7 Subscription Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantssubscription)

#### <a name="oracledbconstantsaq"></a> 3.1.8 Advanced Queuing Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsaq)

#### <a name="oracledbconstantscqn"></a> 3.1.9 Continuous Query Notification Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantscqn)

#### <a name="oracledbconstantspool"></a> 3.1.10 Pool Status Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantspool)

#### <a name="oracledbconstantssoda"></a> 3.1.11 Simple Oracle Document Access (SODA) Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantssoda)

#### <a name="oracledbconstantsshutdown"></a> 3.1.12 Database Shutdown Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantsshutdown)

#### <a name="oracledbconstantstpc"></a> 3.1.12 Two-Phase Commit Constants

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbconstantstpc)

### <a name="oracledbproperties"></a> 3.2 Oracledb Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbproperties)

#### <a name="propdbisautocommit"></a> 3.2.1 `oracledb.autoCommit`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.autoCommit)

#### <a name="propdbconclass"></a> 3.2.2 `oracledb.connectionClass`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.connectionClass)

#### <a name="propdbobjpojo"></a> 3.2.3 `oracledb.dbObjectAsPojo`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.dbObjectAsPojo)

#### <a name="propdbedition"></a> 3.2.4 `oracledb.edition`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.edition)

#### <a name="propdberrconexecute"></a> 3.2.5 `oracledb.errorOnConcurrentExecute`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.errorOnConcurrentExecute)

#### <a name="propdbevents"></a> 3.2.6 `oracledb.events`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.events)

#### <a name="propdbextendedmetadata"></a> 3.2.7 `oracledb.extendedMetaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.extendedMetaData)

#### <a name="propdbisexternalauth"></a> 3.2.8 `oracledb.externalAuth`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.externalAuth)

#### <a name="propdbfetcharraysize"></a> 3.2.9 `oracledb.fetchArraySize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.fetchArraySize)

#### <a name="propdbfetchasbuffer"></a> 3.2.10 `oracledb.fetchAsBuffer`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.fetchAsBuffer)

#### <a name="propdbfetchasstring"></a> 3.2.11 `oracledb.fetchAsString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.fetchAsString)

#### <a name="propdblobprefetchsize"></a> 3.2.12 `oracledb.lobPrefetchSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.lobPrefetchSize)

#### <a name="propdbmaxrows"></a> 3.2.13 `oracledb.maxRows`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.maxRows)

#### <a name="propdboracleclientversion"></a> 3.2.14 `oracledb.oracleClientVersion`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.oracleClientVersion)

#### <a name="propdboracleclientversionstring"></a> 3.2.15 `oracledb.oracleClientVersionString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.oracleClientVersionString)

#### <a name="propdboutformat"></a> 3.2.16 `oracledb.outFormat`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.outFormat)

#### <a name="propdbpoolincrement"></a> 3.2.17 `oracledb.poolIncrement`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolIncrement)

#### <a name="propdbpoolmax"></a> 3.2.18 `oracledb.poolMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolMax)

#### <a name="propdbpoolmaxpershard"></a> 3.2.19 `oracledb.poolMaxPerShard`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolMaxPerShard)

#### <a name="propdbpoolmin"></a> 3.2.20 `oracledb.poolMin`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolMin)

#### <a name="propdbpoolpinginterval"></a> 3.2.21 `oracledb.poolPingInterval`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolPingInterval)

#### <a name="propdbpooltimeout"></a> 3.2.22 `oracledb.poolTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.poolTimeout)

#### <a name="propdbprefetchrows"></a> 3.2.23 `oracledb.prefetchRows`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.prefetchRows)

#### <a name="propdbpromise"></a> 3.2.24 `oracledb.Promise`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.Promise)

#### <a name="propdbqueuemax"></a> 3.2.25 `oracledb.queueMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.queueMax)

#### <a name="propdbqueuerequests"></a> 3.2.26 `oracledb.queueRequests`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.queueRequests)

#### <a name="propdbqueuetimeout"></a> 3.2.27 `oracledb.queueTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.queueTimeout)

#### <a name="propdbstmtcachesize"></a> 3.2.28 `oracledb.stmtCacheSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.stmtCacheSize)

#### <a name="propdbversion"></a> 3.2.29 `oracledb.version`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.version)

#### <a name="propdbversionstring"></a> 3.2.30 `oracledb.versionString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.versionString)

#### <a name="propdbversionsuffix"></a> 3.2.31 `oracledb.versionSuffix`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.versionSuffix)

### <a name="oracledbmethods"></a> 3.3 Oracledb Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledbmethods)

#### <a name="createpool"></a> 3.3.1 `oracledb.createPool()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.createPool)

###### <a name="createpoolpoolattrs"></a> 3.3.1.1 `createPool()`: Parameters and Attributes

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolparams)

###### <a name="createpoolpoolattrsaccesstoken"></a> 3.3.1.1.1 `accessToken`: Attributes

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsaccesstoken)

###### <a name="createpoolpoolattrsaccesstokencallback"></a> 3.3.1.1.2 `accessTokenCallback`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsaccesstokencallback)

###### <a name="createpoolpoolattrsconnectstring"></a> 3.3.1.1.3 `connectString`, `connectionString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsconnectstring)

###### <a name="createpoolpoolattrsedition"></a> 3.3.1.1.4 `edition`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsedition)

###### <a name="createpoolpoolattrsstats"></a> 3.3.1.1.5 `enableStatistics`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsstats)

###### <a name="createpoolpoolattrsevents"></a> 3.3.1.1.6 `events`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsevents)

###### <a name="createpoolpoolattrsexternalauth"></a> 3.3.1.1.7 `externalAuth`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsexternalauth)

###### <a name="createpoolpoolattrshomogeneous"></a> 3.3.1.1.8 `homogeneous`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrshomogeneous)

###### <a name="createpoolpoolattrspassword"></a> 3.3.1.1.9 `password`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspassword)

###### <a name="createpoolpoolattrspoolalias"></a> 3.3.1.1.10 `poolAlias`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolalias)

###### <a name="createpoolpoolattrspoolincrement"></a> 3.3.1.1.11 `poolIncrement`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolincrement)

###### <a name="createpoolpoolattrspoolmax"></a> 3.3.1.1.12 `poolMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolmax)

###### <a name="createpoolpoolattrspoolmaxpershard"></a> 3.3.1.1.13 `poolMaxPerShard`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolmaxpershard)

###### <a name="createpoolpoolattrspoolmin"></a> 3.3.1.1.14 `poolMin`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolmin)

###### <a name="createpoolpoolattrspoolpinginterval"></a> 3.3.1.1.15 `poolPingInterval`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspoolpinginterval)

###### <a name="createpoolpoolattrspooltimeout"></a> 3.3.1.1.16 `poolTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrspooltimeout)

###### <a name="createpoolpoolattrsqueuemax"></a> 3.3.1.1.17 `queueMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsqueuemax)

###### <a name="createpoolpoolattrsqueuerequests"></a> 3.3.1.1.18 `queueRequests`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsqueuerequests)

###### <a name="createpoolpoolattrsqueuetimeout"></a> 3.3.1.1.19 `queueTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsqueuetimeout)

###### <a name="createpoolpoolattrssessioncallback"></a> 3.3.1.1.20 `sessionCallback`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrssessioncallback)

###### <a name="createpoolpoolattrssodamdcache"></a> 3.3.1.1.21 `sodaMetaDataCache`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrssodamdcache)

###### <a name="createpoolpoolattrsstmtcachesize"></a> 3.3.1.1.22 `stmtCacheSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsstmtcachesize)

###### <a name="createpoolpoolattrsuser"></a> 3.3.1.1.23 `user`, `username`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#createpoolpoolattrsuser)

#### <a name="createpoolpoolcallback"></a> 3.3.1.2 `createPool()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.createPool)

#### <a name="getconnectiondb"></a> 3.3.2 `oracledb.getConnection()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.getConnection)

##### <a name="getconnectiondbattrs"></a> 3.3.2.1 `getConnection()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrs)

###### <a name="getconnectionpoolalias"></a> 3.3.2.1.1 Pool Alias

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectionpoolalias)

###### <a name="getconnectiondbattrsconnattrs"></a> 3.3.2.1.2 `getConnection()`: Attributes

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsconnattrs)

###### <a name="getconnectiondbattrsaccesstoken"></a> 3.3.2.1.2.1 `accessToken`: Attributes

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsaccesstoken)

###### <a name="getconnectiondbattrsconnectstring"></a> 3.3.2.1.2.2 `connectString`, `connectionString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsconnectstring)

###### <a name="getconnectiondbattrsedition"></a> 3.3.2.1.2.3 `edition`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsedition)

###### <a name="getconnectiondbattrsevents"></a> 3.3.2.1.2.4 `events`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsevents)

###### <a name="getconnectiondbattrsexternalauth"></a> 3.3.2.1.2.5 `externalAuth`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsexternalauth)

###### <a name="getconnectiondbattrsmatchany"></a> 3.3.2.1.2.6 `matchAny`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsmatchany)

###### <a name="getconnectiondbattrsnewpassword"></a> 3.3.2.1.2.7 `newPassword`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsnewpassword)

###### <a name="getconnectiondbattrspoolalias"></a> 3.3.2.1.2.8 `poolAlias`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrspoolalias)

###### <a name="getconnectiondbattrspassword"></a> 3.3.2.1.2.9 `password`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrspassword)

###### <a name="getconnectiondbattrsprivilege"></a> 3.3.2.1.2.10 `privilege`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsprivilege)

###### <a name="getconnectiondbattrsshardingkey"></a> 3.3.2.1.2.11 `shardingKey`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsshardingkey)

###### <a name="getconnectiondbattrsstmtcachesize"></a> 3.3.2.1.2.12 `stmtCacheSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsstmtcachesize)

###### <a name="getconnectiondbattrssupershardingkey"></a> 3.3.2.1.2.13 `superShardingKey`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrssupershardingkey)

###### <a name="getconnectiondbattrstag"></a> 3.3.2.1.2.14 `tag`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrstag)

###### <a name="getconnectiondbattrsuser"></a> 3.3.2.1.2.15 `user`, `username`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getconnectiondbattrsuser)

##### <a name="getconnectiondbcallback"></a> 3.3.2.2 `getConnection()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.getConnection)

#### <a name="getpool"></a> 3.3.3 `oracledb.getPool()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.getPool)

##### <a name="getpoolattrs"></a> 3.3.3.1 Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getpoolattrs)

###### <a name="getpoolattrsalias"></a> 3.3.3.1.1 `alias`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#getpoolattrs)

#### <a name="odbinitoracleclient"></a> 3.3.4 `oracledb.initOracleClient()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.initOracleClient)

##### <a name="odbinitoracleclientattrs"></a> 3.3.4.1 Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbinitoracleclientattrs)

###### <a name="odbinitoracleclientattrsopts"></a> 3.3.4.1.1 `options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbinitoracleclientattrsopts)

#### <a name="odbshutdown"></a> 3.3.5 `oracledb.shutdown()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.shutdown)

##### <a name="odbshutdownattrs"></a> 3.3.5.1 Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbshutdownattrs)

###### <a name="odbshutdownattrsconn"></a> 3.3.5.1.1 `connAttr`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbshutdownattrsconn)

###### <a name="odbshutdownattrsmode"></a> 3.3.5.1.2 `shutdownMode`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbshutdownattrsmode)

##### <a name="odbshutdowncallback"></a> 3.3.5.2 `shutdown()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.shutdown)

#### <a name="odbstartup"></a> 3.3.6 `oracledb.startup()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.startup)

##### <a name="odbstartupattrs"></a> 3.3.6.1 Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbstartupattrs)

###### <a name="odbstartupattrsconn"></a> 3.3.6.1.1 `connAttr`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbstartupattrsconn)

###### <a name="odbstartupattrsoptions"></a> 3.3.6.1.2 `options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#odbstartupattrsoptions)

##### <a name="odbstartupcallback"></a> 3.3.6.2 `startup()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.startup)

## <a name="connectionclass"></a> 4. Connection Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connectionclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connectionclass).

### <a name="connectionproperties"></a> 4.1 Connection Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connectionproperties)

#### <a name="propconnaction"></a> 4.1.1 `connection.action`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.action)

#### <a name="propconncalltimeout"></a> 4.1.2 `connection.callTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.callTimeout)

#### <a name="propconnclientid"></a> 4.1.3 `connection.clientId`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.clientId)

#### <a name="propconnclientinfo"></a> 4.1.4 `connection.clientInfo`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.clientInfo)

#### <a name="propconncurrentschema"></a> 4.1.5 `connection.currentSchema`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.currentSchema)

#### <a name="propconndbop"></a> 4.1.6 `connection.dbOp`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.dbOp)

#### <a name="propconnecid"></a> 4.1.7 `connection.ecId`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.ecId)

#### <a name="propconnmodule"></a> 4.1.8 `connection.module`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.module)

#### <a name="propconnoracleserverversion"></a> 4.1.9 `connection.oracleServerVersion`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.oracleServerVersion)

#### <a name="propconnoracleserverversionstring"></a> 4.1.10 `connection.oracleServerVersionString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.oracleServerVersionString)

#### <a name="propconnstmtcachesize"></a> 4.1.11 `connection.stmtCacheSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.stmtCacheSize)

#### <a name="propconntag"></a> 4.1.12 `connection.tag`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tag)

#### <a name="propconntpcinternalname"></a> 4.1.13 `connection.tpcInternalName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcInternalName)

#### <a name="propconntpcexternalname"></a> 4.1.14 `connection.tpcExternalName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcExternalName)

### <a name="connectionmethods"></a> 4.2 Connection Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connectionmethods)

#### <a name="break"></a> 4.2.1 `connection.break()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.break)

####  <a name="changepassword"></a> 4.2.2 `connection.changePassword()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.changePassword)

####  <a name="connectionclose"></a> <a name="release"></a> 4.2.3 `connection.close()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.close)

####  <a name="commit"></a> 4.2.4 `connection.commit()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.commit)

#### <a name="connectioncreatelob"></a> 4.2.5 `connection.createLob()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.createLob)

#### <a name="execute"></a> 4.2.6 `connection.execute()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.execute)

##### <a name="executesqlparam"></a> 4.2.6.1 `execute()`: SQL Statement

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executesqlparam)

##### <a name="executebindParams"></a> 4.2.6.2 `execute()`: Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparams)

##### <a name="executebindparamdir"></a> 4.2.6.2.1 `dir`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparamdir)

##### <a name="executebindparammaxarraysize"></a> 4.2.6.2.2 `maxArraySize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparammaxarraysize)

##### <a name="executebindparammaxsize"></a> 4.2.6.2.3 `maxSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparammaxsize)

##### <a name="executebindparamtype"></a> 4.2.6.2.4 `type`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparamtype)

##### <a name="executebindparamval"></a> 4.2.6.2.5 `val`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executebindparamval)

The input value or variable to be used for an IN or IN OUT bind variable.

##### <a name="executeoptions"></a> 4.2.6.3 `execute()`: Options

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executeoptions)

###### <a name="propexecautocommit"></a> 4.2.6.3.1 `autoCommit`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecautocommit)

###### <a name="propexecobjpojo"></a> 4.2.6.3.2 `dbObjectAsPojo`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecobjpojo)

###### <a name="propexecextendedmetadata"></a> 4.2.6.3.3 `extendedMetaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecextendedmetadata)

###### <a name="propexecfetcharraysize"></a> 4.2.6.3.4 `fetchArraySize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecfetcharraysize)

###### <a name="propfetchinfo"></a> <a name="propexecfetchinfo"></a> 4.2.6.3.5 `fetchInfo`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecfetchinfo)

###### <a name="propexeckeepinstmtcache"></a> 4.2.6.3.6 `keepInStmtCache`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexeckeepinstmtcache)

###### <a name="propexecmaxrows"></a> 4.2.6.3.7 `maxRows`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecmaxrows)

###### <a name="propexecoutformat"></a> 4.2.6.3.8 `outFormat`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecoutformat)

###### <a name="propexecprefetchrows"></a> 4.2.6.3.9 `prefetchRows`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecprefetchrows)

###### <a name="propexecresultset"></a> 4.2.6.3.10 `resultSet`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#propexecresultset)

##### <a name="executecallback"></a> 4.2.6.4 `execute()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.execute)

##### <a name="resultobject"></a> Result Object Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#resultobject)

###### <a name="execimplicitresults"></a> 4.2.6.4.1 `implicitResults`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execimplicitresults)

###### <a name="execlastrowid"></a> 4.2.6.4.2 `lastRowid`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execlastrowid)

###### <a name="execmetadata"></a> 4.2.6.4.3 `metaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execmetadata)

###### <a name="execoutbinds"></a> 4.2.6.4.4 `outBinds`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execoutbinds)

###### <a name="execresultset"></a> 4.2.6.4.5 `resultSet`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execresultset)

###### <a name="execrows"></a> 4.2.6.4.6 `rows`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execrows)

###### <a name="execrowsaffected"></a> 4.2.6.4.7 `rowsAffected`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execrowsaffected)

#### <a name="executemany"></a> 4.2.7 `connection.executeMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.executeMany)

##### <a name="executemanysqlparam"></a> 4.2.7.1 `executeMany()`: SQL Statement

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanysqlparam)

##### <a name="executemanybinds"></a> 4.2.7.2 `executeMany()`: Binds

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanybinds)

##### <a name="executemanyoptions"></a> 4.2.7.3 `executeMany()`: Options

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptions)

###### <a name="executemanyoptautocommit"></a> 4.2.7.3.1 `autoCommit`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptautocommit)

###### <a name="executemanyoptbatcherrors"></a> 4.2.7.3.2 `batchErrors`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptbatcherrors)

###### <a name="executemanyoptbinddefs"></a> 4.2.7.3.3 `bindDefs`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptbinddefs)

###### <a name="executemanyoptdmlrowcounts"></a> 4.2.7.3.4 `dmlRowCounts`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptdmlrowcounts)

###### <a name="executemanyoptkeepinstmtcache"></a> 4.2.7.3.5 `keepInStmtCache`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#executemanyoptkeepinstmtcache)

##### <a name="executemanycallback"></a> 4.2.7.4 `executeMany()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.executeMany)

###### <a name="execmanybatcherrors"></a> 4.2.7.4.1 `result.batchErrors`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execmanybatcherrors)

###### <a name="execmanydmlrowscounts"></a> 4.2.7.4.2 `result.dmlRowCounts`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execmanydmlrowscounts)

###### <a name="execmanyoutbinds"></a> 4.2.7.4.3 `result.outBinds`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execmanyoutbinds)

###### <a name="execmanyrowsaffected"></a> 4.2.7.4.4 `result.rowsAffected`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#execmanyrowsaffected)

#### <a name="getdbobjectclass"></a> 4.2.8 `connection.getDbObjectClass()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.getDbObjectClass)

#### <a name="getqueue"></a> 4.2.9 `connection.getQueue()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.getQueue)

#### <a name="getsodadatabase"></a> 4.2.10 `connection.getSodaDatabase()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.getSodaDatabase)

#### <a name="getstmtinfo"></a> 4.2.11 `connection.getStatementInfo()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.getStatementInfo)

#### <a name="ishealthy"></a> 4.2.12 `connection.isHealthy()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.isHealthy)

#### <a name="connectionping"></a> 4.2.13 `connection.ping()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.ping)

#### <a name="querystream"></a> 4.2.14 `connection.queryStream()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.queryStream)

#### <a name="rollback"></a> 4.2.15 `connection.rollback()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.rollback)

#### <a name="conshutdown"></a> 4.2.16 `connection.shutdown()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.shutdown)

##### <a name="conshutdownmode"></a> 4.2.16.1 `shutdown()`: shutdownMode

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#conshutdownmode)

##### <a name="conshutdowncallback"></a> 4.2.16.2 `shutdown()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.shutdown)

#### <a name="consubscribe"></a> 4.2.17 `connection.subscribe()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.subscribe)

##### <a name="consubscribename"></a> 4.2.17.1 `subscribe()`: Name

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribename)

##### <a name="consubscribeoptions"></a> 4.2.17.2 `subscribe()`: Options

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptions)

###### <a name="consubscribeoptbinds"></a> 4.2.16.2.1 `binds`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptbinds)

###### <a name="consubscribeoptcallback"></a> 4.2.17.2.2 `callback`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptcallback)

###### <a name="consubscribeoptclientinitiated"></a> 4.2.17.2.3 `clientInitiated`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptclientinitiated)

###### <a name="consubscribeoptgroupingclass"></a> 4.2.17.2.4 `groupingClass`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptgroupingclass)

###### <a name="consubscribeoptgroupingtype"></a> 4.2.17.2.5 `groupingType`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptgroupingtype)

###### <a name="consubscribeoptgroupingvalue"></a> 4.2.17.2.6 `groupingValue`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptgroupingvalue)

###### <a name="consubscribeoptipaddress"></a> 4.2.17.2.7 `ipAddress`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptipaddress)

###### <a name="consubscribeoptnamespace"></a> 4.2.17.2.8 `namespace`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptnamespace)

###### <a name="consubscribeoptoperations"></a> 4.2.17.2.9 `operations`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptoperations)

###### <a name="consubscribeoptport"></a> 4.2.17.2.10 `port`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptport)

###### <a name="consubscribeoptqos"></a> 4.2.17.2.11 `qos`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptqos)

###### <a name="consubscribeoptsql"></a> 4.2.17.2.12 `sql`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeoptsql)

###### <a name="consubscribeopttimeout"></a> 4.2.17.2.13 `timeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribeopttimeout)

##### <a name="consubscribecallback"></a> 4.2.17.3 `subscribe()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#consubscribecallback)

#### <a name="constartup"></a> 4.2.18 `connection.startup()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.startup)

##### <a name="constartupoptions"></a> 4.2.18.1 `startup()`: options

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#constartupparams)

##### <a name="constartupoptionsforce"></a> 4.2.18.1.1.1 `force`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#startupoptions)

##### <a name="constartupoptionspfile"></a> 4.2.18.1.1.2 `pfile`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#startupoptions)

##### <a name="constartupoptionsrestrict"></a> 4.2.18.1.1.3 `restrict`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#startupoptions)

##### <a name="constartupcallback"></a> 4.2.18.2 `startup()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.startup)

#### <a name="contpcbegin"></a> 4.2.19 `connection.tpcBegin()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcBegin)

#### <a name="contpccommit"></a> 4.2.20 `connection.tpcCommit()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcCommit)

#### <a name="contpcend"></a> 4.2.21 `connection.tpcEnd()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcEnd)

#### <a name="contpcforget"></a> 4.2.22 `connection.tpcForget()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcForget)

#### <a name="contpcprepare"></a> 4.2.23 `connection.tpcPrepare()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcPrepare)

#### <a name="contpcrecover"></a> 4.2.24 `connection.tpcRecover()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcRecover)

#### <a name="contpcrollback"></a> 4.2.25 `connection.tpcRollback()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.tpcRollback)

#### <a name="conunsubscribe"></a> 4.2.26 `connection.unsubscribe()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/connection.html#connection.unsubscribe)

## <a name="aqqueueclass"></a> 5. AqQueue Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqqueueclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqqueueclass).

### <a name="aqqueueproperties"></a> 5.1 AqQueue Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqqueueproperties)

#### <a name="aqqueuename"></a> 5.1.1 `aqQueue.name`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.name)

#### <a name="aqqueuedeqopts"></a> 5.1.2 `aqQueue.deqOptions`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.deqOptions)

##### <a name="aqdeqoptionsclass"></a> 5.1.2.1 AqDeqOptions Class

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqdeqoptionsclass)

#### <a name="aqqueueenqopts"></a> 5.1.3 `aqQueue.enqOptions`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.enqOptions)

##### <a name="aqenqoptionsclass"></a> 5.1.3.1 AqEnqOptions Class

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqenqoptionsclass)

#### <a name="aqqueuepayloadtype"></a> 5.1.4 `aqQueue.payloadType`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.payloadType)

#### <a name="aqqueuepayloadtypeclass"></a> 5.1.5 `aqQueue.payloadTypeClass`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.payloadTypeClass)

#### <a name="aqqueuepayloadtypename"></a> 5.1.6 `aqQueue.payloadTypeName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.payloadTypeName)

### <a name="aqqueuemethods"></a> 5.2 AqQueue Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqqueuemethods)

#### <a name="aqqueuemethoddeqmany"></a> 5.2.1 `aqQueue.deqMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.deqMany)

#### <a name="aqqueuemethoddeqone"></a> 5.2.2 `aqQueue.deqOne()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.deqOne)

##### <a name="aqmessageclass"></a> 5.2.2.1 AqMessage Class

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqmessageclass)

### <a name="aqqueuemethodenqmany"></a> 5.2.3 `aqQueue.enqMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.enqMany)

#### <a name="aqqueuemethodenqone"></a> 5.2.4 `aqQueue.enqOne()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/aq.html#aqQueue.enqOne)

## <a name="dbobjectclass"></a> 6. DbObject Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbobjectclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbobjectclass).

### <a name="dbobjectproperties"></a> 6.1 DbObject Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbobjectproperties)

#### <a name="dbobjattributesattributes"></a> 6.1.1 `dbObject.attributes`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.attributes)

#### <a name="dbobjattributeselementtype"></a> 6.1.2 `dbObject.elementType`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.elementType)

#### <a name="dbobjattributeselementtypeclass"></a> 6.1.3 `dbObject.elementTypeClass`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.elementTypeClass)

#### <a name="dbobjattributeselementtypename"></a> 6.1.4 `dbObject.elementTypeName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.elementTypeName)

#### <a name="dbobjattributesfqn"></a> 6.1.5 `dbObject.fqn`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.fqn)

#### <a name="dbobjattributesiscollection"></a> 6.1.6 `dbObject.isCollection`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.isCollection)

#### <a name="dbobjattributeslength"></a> 6.1.7 `dbObject.length`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.length)

#### <a name="dbobjattributesname"></a> 6.1.8 `dbObject.name`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.name)

#### <a name="dbobjattributesschema"></a> 6.1.9 `dbObject.schema`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbObject.schema)

### <a name="dbobjectmethods"></a> 6.2 DbObject Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbobjectmethods)

#### <a name="dbobjectmethodscolls"></a> 6.2.1 DbObject Methods for Collections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/dbobject.html#dbobjectmethodscolls)

## <a name="lobclass"></a> 7. Lob Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lobclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lobclass).

### <a name="lobproperties"></a> 7.1 Lob Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lobproperties)

#### <a name="proplobchunksize"></a> 7.1.1 `lob.chunkSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.chunkSize)

#### <a name="proploblength"></a> 7.1.2 `lob.length`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.length)

#### <a name="proplobpiecesize"></a> 7.1.3 `lob.pieceSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.pieceSize)

#### <a name="proplobtype"></a> 7.1.4 `lob.type`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.type)

### <a name="lobmethods"></a> 7.2 Lob Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lobmethods)

#### <a name="lobclose"></a> 7.2.1 `lob.close()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.close)

#### <a name="lobdestroy"></a> 7.2.2 `lob.destroy()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.destroy)

#### <a name="lobgetdata"></a> 7.2.3 `lob.getData()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/lob.html#lob.getData)

## <a name="poolclass"></a> 8. Pool Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#poolclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#poolclass).

### <a name="poolproperties"></a> 8.1 Pool Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#poolproperties)

#### <a name="proppoolconnectionsinuse"></a> 8.1.1 `pool.connectionsInUse`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.connectionsInUse)

#### <a name="proppoolconnectionsopen"></a> 8.1.2 `pool.connectionsOpen`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.connectionsOpen)

#### <a name="proppoolconnectstring"></a> 8.1.3 `pool.connectString`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.connectString)

#### <a name="proppooledition"></a> 8.1.4 `pool.edition`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.edition)

#### <a name="proppoolevents"></a> 8.1.5 `pool.events`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.events)

#### <a name="proppoolexternalauth"></a> 8.1.6 `pool.externalAuth`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.externalAuth)

#### <a name="proppoolenablestatistics"></a> 8.1.7 `pool.enableStatistics`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.enableStatistics)

#### <a name="proppoolhomogeneous"></a> 8.1.8 `pool.homogeneous`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.homogeneous)

#### <a name="proppoolpoolalias"></a> 8.1.9 `pool.poolAlias`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolAlias)

#### <a name="proppoolpoolincrement"></a> 8.1.10 `pool.poolIncrement`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolIncrement)

#### <a name="proppoolpoolmax"></a> 8.1.11 `pool.poolMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolMax)

#### <a name="proppoolpoolmaxpershard"></a> 8.1.12 `pool.poolMaxPerShard`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolMaxPerShard)

#### <a name="proppoolpoolmin"></a> 8.1.13 `pool.poolMin`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolMin)

#### <a name="proppoolpoolpinginterval"></a> 8.1.14 `pool.poolPingInterval`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolPingInterval)

#### <a name="proppoolpooltimeout"></a> 8.1.15 `pool.poolTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.poolTimeout)

#### <a name="proppoolqueuemax"></a> 8.1.16 `pool.queueMax`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.queueMax)

#### <a name="proppoolqueuerequests"></a> 8.1.17 `pool.queueRequests`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.queueRequests)

#### <a name="proppoolqueueTimeout"></a> 8.1.18 `pool.queueTimeout`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.queueTimeout)

#### <a name="proppoolsessioncallback"></a> 8.1.19 `pool.sessionCallback`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.sessionCallback)

#### <a name="proppoolsodamdcache"></a> 8.1.20 `pool.sodaMetaDataCache`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.sodaMetaDataCache)

#### <a name="proppoolstatus"></a> 8.1.21 `pool.status`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.status)

#### <a name="proppoolstmtcachesize"></a> 8.1.22 `pool.stmtCacheSize`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.stmtCacheSize)

#### <a name="proppooluser"></a> 8.1.23 `pool.user`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.user)

### <a name="poolmethods"></a> 8.2 Pool Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#poolmethods)

#### <a name="poolclose"></a> <a name="terminate"></a> 8.2.1 `pool.close()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.close)

#### <a name="getconnectionpool"></a> 8.2.2 `pool.getConnection()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.getConnection)

#### <a name="poolgetstatistics"></a> 8.2.3 `pool.getStatistics()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.getStatistics)

#### <a name="poollogstatistics"></a> 8.2.4 `pool.logStatistics()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.logStatistics)

#### <a name="poolreconfigure"></a> 8.2.5 `pool.reconfigure()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.reconfigure)

#### <a name="poolsetaccesstoken"></a> 8.2.6 `pool.setAccessToken()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/pool.html#pool.setAccessToken)

## <a name="poolstatisticsclass"></a> 9. PoolStatistics Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/statistics.html#poolstatisticsclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/statistics.html#poolstatisticsclass).

### <a name="poolstatisticsmethods"></a> 9.1 PoolStatistics Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/statistics.html#poolstatisticsmethods)

#### <a name="poolstatisticslogstatistics"></a> 9.1.1 `poolstatistics.logStatistics()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/statistics.html#poolstatistics.logStatistics)

## <a name="resultsetclass"></a> 10. ResultSet Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultsetclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultsetclass).

### <a name="resultsetproperties"></a> 10.1 ResultSet Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultsetproperties)

#### <a name="rsmetadata"></a> 10.1.1 `resultset.metaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultset.metaData)

### <a name="resultsetmethods"></a> 10.2 ResultSet Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultsetmethods)

#### <a name="close"></a> 10.2.1 `resultset.close()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultset.close)

#### <a name="getrow"></a> 10.2.2 `resultset.getRow()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultset.getRow)

#### <a name="getrows"></a> 10.2.3 `resultset.getRows()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultset.getRows)

#### <a name="toquerystream"></a> 10.2.4 `resultset.toQueryStream()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/resultset.html#resultset.toQueryStream)

## <a name="sodacollectionclass"></a> 11. SodaCollection Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollectionclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollectionclass).

#### <a name="sodacollectionproperties"></a> 11.1 SodaCollection Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollectionproperties)

#### <a name="sodacollectionpropmetadata"></a> 11.1.1 `sodaCollection.metaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.metaData)

#### <a name="sodacollectionpropname"></a> 11.1.2 `sodaCollection.name`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.name)

#### <a name="sodacollectionmethods"></a> 11.2 SodaCollection Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollectionmethods)

#### <a name="sodacollcreateindex"></a> 11.2.1 `sodaCollection.createIndex()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.createIndex)

##### <a name="sodacollcreateindexparams"></a> 11.2.1.1 `createIndex()` Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollcreateindexparams)

###### <a name="sodacollcreateindexspec"></a> 11.2.1.1.1 `indexSpec`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollcreateindexparams)

##### <a name="sodacollcreateindexcb"></a> 11.2.1.2 `createIndex()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.createIndex)

#### <a name="sodacolldrop"></a> 10.2.2 `sodaCollection.drop()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.drop)

##### <a name="sodacolldropcallback"></a> 11.2.2.1 `drop()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.drop)

#### <a name="sodacolldropindex"></a> 11.2.3 `sodaCollection.dropIndex()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.dropIndex)

##### <a name="sodacolldropindexparams"></a> 11.2.3.1 `dropIndex()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacolldropindexparams)

###### <a name="sodacolldropindexindexname"></a> 11.2.3.1.1 `indexName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacolldropindexparams)

###### <a name="sodacolldropindexoptions"></a> 11.2.3.1.2 `options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacolldropindexparams)

##### <a name="sodacolldropindexcb"></a> 11.2.3.2 `dropIndex()` Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.dropIndex)

#### <a name="sodacollfind"></a> 11.2.4 `sodaCollection.find()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.find)

##### <a name="sodaoperationclass"></a> 11.2.4.1 SodaOperation Class

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaoperationclass)

##### <a name="sodaoperationclassnonterm"></a> 11.2.4.1.1 Non-terminal SodaOperation Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaoperationclassnonterm)

###### <a name="sodaoperationclassfetcharraysize"></a> 11.2.4.1.1.1 `sodaOperation.fetchArraySize()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.fetchArraySize)

###### <a name="sodaoperationclassfilter"></a> 11.2.4.1.1.2 `sodaOperation.filter()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.filter)

###### <a name="sodaoperationclasshint"></a> 11.2.4.1.1.3 `sodaOperation.hint()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.hint)

###### <a name="sodaoperationclasskey"></a> 11.2.4.1.1.4 `sodaOperation.key()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.key)

###### <a name="sodaoperationclasskeys"></a> 11.2.4.1.1.5 `sodaOperation.keys()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.keys)

###### <a name="sodaoperationclasslimit"></a> 11.2.4.1.1.6 `sodaOperation.limit()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.limit)

###### <a name="sodaoperationclassskip"></a> 11.2.4.1.1.7 `sodaOperation.skip()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.skip)

###### <a name="sodaoperationclassversion"></a> 11.2.4.1.1.8 `sodaOperation.version()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.version)

##### <a name="sodaoperationclassterm"></a> 11.2.4.1.2 Terminal SodaOperation Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaoperationclassterm)

###### <a name="sodaoperationclasscount"></a> 11.2.4.1.2.1 `sodaOperation.count()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.count)

###### <a name="sodaoperationclassgetcursor"></a> 11.2.4.1.2.2 `sodaOperation.getCursor()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.getCursor)

###### <a name="sodaoperationclassgetdocuments"></a> 11.2.4.1.2.3 `sodaOperation.getDocuments()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.getDocuments)

###### <a name="sodaoperationclassgetone"></a> 11.2.4.1.2.4 `sodaOperation.getOne()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.getOne)

###### <a name="sodaoperationclassremove"></a> 11.2.4.1.2.5 `sodaOperation.remove()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.remove)

###### <a name="sodaoperationclassreplaceone"></a> 11.2.4.1.2.6 `sodaOperation.replaceOne()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.replaceOne)

###### <a name="sodaoperationclassreplaceoneandget"></a> 11.2.4.1.2.7 `sodaOperation.replaceOneAndGet()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaOperation.replaceOneAndGet)

#### <a name="sodacollgetdataguide"></a> 11.2.5 `sodaCollection.getDataGuide()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.getDataGuide)

#### <a name="sodacollinsertmany"></a> 11.2.6 `sodaCollection.insertMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertMany)

#### <a name="sodacollinsertmanyandget"></a> 11.2.7 `sodaCollection.insertManyAndGet()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertManyAndGet)

#### <a name="sodacollinsertone"></a> 11.2.8 `sodaCollection.insertOne()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertOne)

##### <a name="sodacollinsertoneparams"></a> 11.2.8.1 `insertOne()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollinsertoneparams)

###### <a name="sodacollinsertoneparamsdoc"></a> 11.2.8.1.1 `newDocumentContent`,  `newSodaDocument`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodacollinsertoneparams)

##### <a name="sodacollinsertonecb"></a> 11.2.8.2 `insertOne()` Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertOne)

#### <a name="sodacollinsertoneandget"></a> 11.2.9 `sodaCollection.insertOneAndGet()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertOneAndGet)

##### <a name="sodacollinsertoneandgetparams"></a> 11.2.9.1 `insertOneAndGet()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#insertoneandget)

###### <a name="sodacollinsertoneandgetparamsdoc"></a> 11.2.9.1.1 `newDocumentContent`,  `newSodaDocument`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#insertoneandget)

##### <a name="sodacollinsertoneandgetcb"></a> 11.2.9.2 `insertOneAndGet()` Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.insertOneAndGet)

#### <a name="sodacollsave"></a> 11.2.10 `sodaCollection.save()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.save)

#### <a name="sodacollsaveandget"></a> 11.2.11 `sodaCollection.saveAndGet()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.saveAndGet)

#### <a name="sodacolltruncate"></a> 11.2.12 `sodaCollection.truncate()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.truncate)

##### <a name="sodacolltruncatecb"></a> 11.2.12.1 `truncate()` Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacollection.html#sodaCollection.truncate)

## <a name="sodadatabaseclass"></a> 11. SodaDatabase Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadatabaseclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadatabaseclass).

#### <a name="sodadatabasemethods"></a> 12.1 SodaDatabase Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadatabasemethods)

#### <a name="sodadbcreatecollection"></a> 12.1.1 `sodaDatabase.createCollection()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.createCollection)

##### <a name="sodadbcreatecollectionname"></a> 12.1.1.1 `createCollection(): collectionName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#createcoll)

##### <a name="sodadbcreatecollectionoptions"></a> 12.1.1.2 `createCollection(): options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#createcoll)

###### <a name="sodadbcreatecollectionoptsmetadata"></a> 12.1.1.2.1 `metaData`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadbcreatecollectionoptions)

###### <a name="sodadbcreatecollectionoptsmode"></a> 12.1.1.2.2 `mode`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadbcreatecollectionoptions)

##### <a name="sodadbcreatecollectioncb"></a> 12.1.1.3 `createCollection()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.createCollection)

#### <a name="sodadbcreatedocument"></a> 12.1.2 `sodaDatabase.createDocument()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.createDocument)

##### <a name="sodadbcreatedocumentcontent"></a> 12.1.2.1 `createDocument(): content`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#createdocument)

##### <a name="sodadbcreatedocumentoptions"></a> 12.1.2.2 `createDocument(): options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#createdocument)

###### <a name="sodadbcreatedocumentoptskey"></a> 12.1.2.2.1 `key`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadbcreatedocumentoptions)

###### <a name="sodadbcreatedocumentoptsmediatype"></a> 12.1.2.2.2 `mediaType`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodadbcreatedocumentoptions)

#### <a name="sodadbgetcollectionnames"></a> 12.1.3 `sodaDatabase.getCollectionNames()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.getCollectionNames)

##### <a name="sodadbgetcollectionnamesparams"></a> 12.1.3.1 `getCollectionNames()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#getcollectionnames)

###### <a name="sodadbgetcollectionnamesoptions"></a> 12.1.3.1.1 `options`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#getcollectionnamesoptions)

##### <a name="sodadbgetcollectionnamescb"></a> 12.1.3.2 `getCollectionNames()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.getCollectionNames)

#### <a name="sodadbopencollection"></a> 12.1.4 `sodaDatabase.openCollection()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.openCollection)

##### <a name="sodadbopencollectionparams"></a> 12.1.4.1 `openCollection()`: Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#opencoll)

###### <a name="sodadbopencollectionname"></a> 12.1.4.1.1 `collectionName`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#opencoll)

##### <a name="sodadbopencollectioncb"></a> 12.1.4.2 `openCollection()`: Callback Function

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadb.html#sodaDatabase.openCollection)

## <a name="sodadocumentclass"></a> 13. SodaDocument Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodadocumentclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodadocumentclass).

### <a name="sodadocumentproperties"></a> 13.1 SodaDocument Properties

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodadocumentproperties)

### <a name="sodadocumentmethods"></a> 13.2 SodaDocument Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodadocumentmethods)

#### <a name="sodadocgetcontent"></a> 13.2.1 `sodaDocument.getContent()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodaDocument.getContent)

#### <a name="sodadocgetcontentasbuffer"></a> 13.2.2 `sodaDocument.getContentAsBuffer()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodaDocument.getContentAsBuffer)

#### <a name="sodadocgetcontentasstring"></a> 13.2.3 `sodaDocument.getContentAsString()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodadocument.html#sodaDocument.getContentAsString)

## <a name="sodadocumentcursorclass"></a> 14. SodaDocumentCursor Class

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacursor.html#sodadocumentcursorclass](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacursor.html#sodadocumentcursorclass).

### <a name="sodadoccursormethods"></a> 14.1 SodaDocumentCursor Methods

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacursor.html#sodadoccursormethods)

#### <a name="sodadoccursorclose"></a> 14.1.1 `sodaDocumentCursor.close()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacursor.html#sodaDocumentCursor.close)

#### <a name="sodadoccursorgetnext"></a> 13.1.2 `sodaDocumentCursor.getNext()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/api_manual/sodacursor.html#sodaDocumentCursor.getNext)

## <a name="usermanual"></a> NODE-ORACLEDB USER MANUAL

## <a name="initnodeoracledb"></a> <a name="configureconnections"></a> 15. Initializing Node-oracledb

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#initnodeoracledb](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#initnodeoracledb).

### <a name="oracleclientloading"></a> 15.1 Setting the Oracle Client Library Directory

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oracleclientloading)

#### <a name="oracleclientloadingwindows"></a> 15.1.1 Setting the Oracle Client Directory on Windows

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oracleclientloadingwindows)

#### <a name="oracleclientloadingmacos"></a> 15.1.2 Setting the Oracle Client Directory on macOS

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oracleclientloadingmacos)

#### <a name="oracleclientloadinglinux"></a> 15.1.3 Setting the Oracle Client Directory on Linux and Related Platforms

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oracleclientloadinglinux)

#### <a name="oracleclientcallinginit"></a> 15.1.4 Calling `initOracleClient()` to set the Oracle Client Directory

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oracleclientcallinginit)

### <a name="tnsadmin"></a> 15.2 Optional Oracle Net Configuration

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#tnsadmin)

### <a name="oraaccess"></a> 15.3 Optional Oracle Client Configuration

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#oraaccess)

### <a name="environmentvariables"></a> 15.4 Oracle Environment Variables

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#environmentvariables)

### <a name="otherinit"></a> 15.5 Other Node-oracledb Initialization

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#otherinit)

## <a name="connectionhandling"></a> 16. Connection Handling

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionhandling](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionhandling).

### <a name="connectionstrings"></a> 16.1 Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionstrings)

#### <a name="easyconnect"></a> 16.1.1 Easy Connect Syntax for Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#easyconnect)

#### <a name="embedtns"></a> 16.1.2 Embedded Connect Descriptor Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#embedtns)

#### <a name="tnsnames"></a> 16.1.3 Net Service Names for Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#tnsnames)

#### <a name="notjdbc"></a> 16.1.4 JDBC and Oracle SQL Developer Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#notjdbc)

### <a name="numberofthreads"></a> 16.2 Connections, Threads, and Parallelism

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#numberofthreads)

#### <a name="workerthreads"></a> 16.2.1 Connections and Worker Threads

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#workerthreads)

#### <a name="parallelism"></a> 16.2.2 Parallelism on Each Connection

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#parallelism)

### <a name="connpooling"></a> 16.3 Connection Pooling

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpooling)

#### <a name="conpoolsizing"></a> 16.3.1 Connection Pool Sizing

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#conpoolsizing)

#### <a name="conpooldraining"></a> 16.3.2 Connection Pool Closing and Draining

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#conpooldraining)

#### <a name="connpoolcache"></a> 16.3.3 Connection Pool Cache

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpoolcache)

#### <a name="connpoolqueue"></a> 16.3.4 Connection Pool Queue

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpoolqueue)

#### <a name="connpoolmonitor"></a> 16.3.5 Connection Pool Monitoring

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpoolmonitor)

##### <a name="poolstats"></a> Pool Statistics

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#poolstats)

#### <a name="connpoolpinging"></a> 16.3.6 Connection Pool Pinging

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpoolpinging)

#### <a name="connpooltagging"></a> 16.3.7 Connection Tagging and Session State

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpooltagging)

##### <a name="sessionfixupnode"></a> 16.3.7.1 Node.js Session Callback

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#sessionfixupnode)

##### <a name="sessiontaggingnode"></a> 16.3.7.2 Node.js Session Tagging Callback

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#sessiontaggingnode)

##### <a name="sessiontaggingplsql"></a> 16.3.7.3 PL/SQL Session Tagging Callback

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#sessiontaggingplsql)

#### <a name="connpoolproxy"></a> 16.3.8 Heterogeneous Connection Pools and Pool Proxy Authentication

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connpoolproxy)

### <a name="extauth"></a> 16.4 External Authentication

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth)

### <a name="tokenbasedauthentication"></a> 16.5 Token-Based Authentication

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#tokenbasedauthentication)

#### <a name="oauthtokenbasedauthentication"></a> 16.5.1 OAuth 2.0 Token-Based Authentication

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#oauthtokenbasedauthentication)

##### <a name="oauthtokengeneration"></a> 16.5.1.1 OAuth 2.0 Token Generation

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#oauthtokengeneration)

##### <a name="oauthstandalone"></a> 16.5.1.2 OAuth 2.0 Standalone Connections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#oauthstandalone)

##### <a name="oauthpool"></a> 16.5.1.3 OAuth 2.0 Connection Pooling

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#oauthpool)

##### <a name="oauthconnectstring"></a> 16.5.1.4 OAuth 2.0 Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#oauthconnectstring)

#### <a name="tokenbasedauth"></a> <a name="iamtokenbasedauthentication"></a> 16.5.2 IAM Token-Based Authentication

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iamtokenbasedauthentication)

##### <a name="tokengen"></a> <a name="iamtokengeneration"></a> 16.5.2.1 IAM Token Generation

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iamtokengeneration)

##### <a name="tokenread"></a> <a name="iamtokenextraction"></a> 16.5.2.2 IAM Token and Private Key Extraction

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iamtokenextraction)

##### <a name="tokenbasedstandaloneconn"></a> <a name="iamstandalone"></a> 16.5.2.3 IAM Standalone Connections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iamstandalone)

##### <a name="settingpooltokens"></a> <a name="tokenbasedpool"></a> <a name="iampool"></a> 16.5.2.4 IAM Connection Pooling

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iampool)

##### <a name="tokenbasedconnstrings"></a> <a name="iamconnectstring"></a> 16.5.2.5 IAM Connection Strings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#iamconnectstring)

### <a name="drcp"></a> 16.6 Database Resident Connection Pooling (DRCP)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#drcp)

### <a name="privconn"></a> 16.7 Privileged Connections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#privconn)

### <a name="securenetwork"></a> 16.8 Securely Encrypting Network Traffic to Oracle Database

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#securenetwork)

### <a name="changingpassword"></a> 16.9 Changing Passwords and Connecting with an Expired Password

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#changingpassword)

### <a name="connectionha"></a> 16.10 Connections and High Availability

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionha)

#### <a name="connectionpremclose"></a> 16.10.1 Preventing Premature Connection Closing

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionpremclose)

#### <a name="connectionfan"></a> 16.10.2 Fast Application Notification (FAN)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionfan)

#### <a name="connectionrlb"></a> 16.10.3 Runtime Load Balancing (RLB)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionrlb)

#### <a name="appcontinuity"></a> 16.10.4 Application Continuity

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#appcontinuity)

#### <a name="dbcalltimeouts"></a> 16.10.5 Database Call Timeouts

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#dbcalltimeouts)

### <a name="connectionrac"></a> 16.11 Connecting to Oracle Real Application Clusters (RAC)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionrac)

### <a name="connectionadb"></a> 16.12 Connecting to Oracle Cloud Autonomous Databases

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionadb)

#### <a name="connectionadbtls"></a> 16.12.1 TLS Connections to Oracle Cloud Autonomous Database

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionadbtls)

#### <a name="connectionadbmtls"></a> 16.12.2 Mutal TLS connections to Oracle Cloud Autonomous Database

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#connectionadbmtls)

### <a name="sharding"></a> 16.13 Connecting to Sharded Databases

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#sharding)

## <a name="sqlexecution"></a> 17. SQL Execution

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#sqlexecution](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#sqlexecution).

### <a name="select"></a> 17.1 SELECT Statements

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#select)

#### <a name="fetchingrows"></a> 17.1.1 Fetching Rows with Direct Fetches

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchingrows)

#### <a name="resultsethandling"></a> 17.1.2 Fetching Rows with Result Sets

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#resultsethandling)

#### <a name="streamingresults"></a> 17.1.3 Query Streaming

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#streamingresults)

#### <a name="queryoutputformats"></a> 17.1.4 Query Output Formats

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#queryoutputformats)

#### <a name="nestedcursors"></a> 17.1.5 Fetching Nested Cursors

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#nestedcursors)

#### <a name="querymeta"></a> 17.1.6 Query Column Metadata

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#querymeta)

#### <a name="typemap"></a> 17.1.7 Query Result Type Mapping

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#typemap)

##### <a name="stringhandling"></a> 17.1.7.1 Fetching CHAR, VARCHAR2, NCHAR and NVARCHAR

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#stringhandling)

##### <a name="numberhandling"></a> 17.1.7.2 Fetching Numbers

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#numberhandling)

##### <a name="datehandling"></a> 17.1.7.3 Fetching Dates and Timestamps

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#datehandling)

##### <a name="fetchasstringhandling"></a> 17.1.7.4 Fetching Numbers and Dates as String

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchasstringhandling)

##### <a name="fetchlob"></a> 17.1.7.5 Fetching BLOB, CLOB and NCLOB

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchlob)

##### <a name="fetchlong"></a> 17.1.7.6 Fetching LONG and LONG RAW

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchlong)

##### <a name="fetchrowid"></a> 17.1.7.7 Fetching ROWID and UROWID

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchrowid)

##### <a name="fetchxml"></a> 17.1.7.8 Fetching XMLType

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchxml)

##### <a name="fetchraw"></a> 17.1.7.9 Fetching RAW

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchraw)

##### <a name="fetchobjects"></a> 17.1.7.10 Fetching Oracle Database Objects and Collections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#fetchobjects)

#### <a name="pagingdata"></a> 17.1.8 Limiting Rows and Creating Paged Datasets

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#pagingdata)

#### <a name="autoincrement"></a> 17.1.9 Auto-Increment Columns

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#autoincrement)

### <a name="cursors1000"></a> 17.2 Cursor Management

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/sql_execution.html#cursors1000)

## <a name="plsqlexecution"></a> 18. PL/SQL Execution

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlexecution](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlexecution).

### <a name="plsqlproc"></a> 18.1 PL/SQL Stored Procedures

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlproc)

### <a name="plsqlfunc"></a> 18.2 PL/SQL Stored Functions

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlfunc)

### <a name="plsqlanon"></a> 18.3 PL/SQL Anonymous PL/SQL Blocks

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlanon)

### <a name="dbmsoutput"></a> 18.4 Using DBMS_OUTPUT

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#dbmsoutput)

### <a name="ebr"></a> 18.5 Edition-Based Redefinition

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#ebr)

### <a name="implicitresults"></a> 18.6 Implicit Results

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#implicitresults)

### <a name="plsqlcreate"></a> 18.7 Creating PL/SQL Procedures and Functions

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlcreate)

#### <a name="plsqlcompwarnings"></a> 18.7.1 PL/SQL Compilation Warnings

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlcompwarnings)

## <a name="lobhandling"></a> 19. Working with CLOB, NCLOB and BLOB Data

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#lobhandling](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#lobhandling).

### <a name="basiclobinsert"></a> 19.1 Simple Insertion of LOBs

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#basiclobinsert)

### <a name="queryinglobs"></a> 19.2 Simple LOB Queries and PL/SQL OUT Binds

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#queryinglobs)

### <a name="streamsandlobs"></a> 19.3 Streaming Lobs

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#streamsandlobs)

### <a name="lobinsertdiscussion"></a> 19.4 Using RETURNING INTO to Insert into LOBs

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#lobinsertdiscussion)

### <a name="loboutstream"></a> 19.5 Getting LOBs as Streams from Oracle Database

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#loboutstream)

### <a name="templobdiscussion"></a> 19.6 Using `createLob()` for PL/SQL IN Binds

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#templobdiscussion)

### <a name="closinglobs"></a> 19.7 Closing Lobs

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/lob_data.html#closinglobs)

## <a name="jsondatatype"></a> 20. Oracle Database JSON Data Type

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/json_data_type.html#jsondatatype](https://node-oracledb.readthedocs.io/en/latest/user_guide/json_data_type.html#jsondatatype).

## <a name="xmltype"></a> 21. Working with XMLType

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/xml_data_type.html#xmltype](https://node-oracledb.readthedocs.io/en/latest/user_guide/xml_data_type.html#xmltype).

## <a name="bind"></a> 22. Bind Parameters for Prepared Statements

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#bind](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#bind).

### <a name="inbind"></a> 22.1 IN Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#inbind)

### <a name="outbind"></a> 22.2 OUT and IN OUT Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#outbind)

### <a name="dmlreturn"></a> 22.3 DML RETURNING Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#dmlreturn)

### <a name="refcursors"></a> 22.4 REF CURSOR Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#refcursors)

### <a name="lobbinds"></a> 22.5 LOB Bind Parameters

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#lobbinds)

### <a name="sqlwherein"></a> 22.6 Binding Multiple Values to a SQL `WHERE IN` Clause

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#sqlwherein)

### <a name="sqlbindlike"></a> 22.7 Binding in a `LIKE` or `REGEXP_LIKE` Clause

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#sqlbindlike)

### <a name="sqlbindtablename"></a> 22.8 Binding Column and Table Names in Queries

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/bind.html#sqlbindtablename)

## <a name="objects"></a> 23. Oracle Database Objects and Collections

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objects](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objects).

### <a name="objectinsert"></a> 23.1 Inserting Objects

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objectinsert)

### <a name="objectfetch"></a> 23.2 Fetching Objects

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objectfetch)

### <a name="plsqlcollections"></a> 23.3 PL/SQL Collection Types

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#plsqlcollections)

#### <a name="plsqlindexbybinds"></a> 23.3.1 PL/SQL Collection Associative Arrays (Index-by)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#plsqlindexbybinds)

#### <a name="plsqlvarray"></a> 23.3.2 PL/SQL Collection VARRAY Types

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#plsqlvarray)

#### <a name="plsqlnestedtables"></a> 23.3.3 PL/SQL Collection Nested Tables

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#plsqlnestedtables)

### <a name="plsqlrecords"></a> 23.4 PL/SQL RECORD Types

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#plsqlrecords)

### <a name="objexecmany"></a> 23.5 Inserting or Passing Multiple Objects of the Same Type

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objexecmany)

### <a name="objectlimitations"></a> 23.6 Oracle Database Object Type Limitations

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/objects.html#objectlimitations)

## <a name="batchexecution"></a> 24. Batch Statement Execution and Bulk Loading

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/batch_statement.html#batchexecution](https://node-oracledb.readthedocs.io/en/latest/user_guide/batch_statement.html#batchexecution).

#### <a name="handlingbatcherrors"></a> Handling Data Errors with `executeMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/batch_statement.html#handlingbatcherrors)

#### <a name="executemanyobjects"></a> Binding Objects with `executeMany()`

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/batch_statement.html#executemanyobjects)

## <a name="transactionmgt"></a> 25. Transaction Management

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/txn_management.html#transactionmgt](https://node-oracledb.readthedocs.io/en/latest/user_guide/txn_management.html#transactionmgt).

## <a name="cqn"></a> 26. Continuous Query Notification (CQN)

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/cqn.html#cqn](https://node-oracledb.readthedocs.io/en/latest/user_guide/cqn.html#cqn).

## <a name="aq"></a> 27. Oracle Advanced Queuing (AQ)

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aq](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aq).

### <a name="aqrawexample"></a> 27.1 Sending Simple AQ Messages

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqrawexample)

### <a name="aqobjexample"></a> 27.2 Sending Oracle Database Object AQ Messages

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqobjexample)

### <a name="aqoptions"></a> 27.3 Changing AQ options

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqoptions)

### <a name="aqmultiplemessages"></a> 27.4 Enqueuing and Dequeuing Multiple Messages

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqmultiplemessages)

### <a name="aqnotifications"></a> 27.5 Advanced Queuing Notifications

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqnotifications)

### <a name="aqrecipientlists"></a> 27.6 Recipient Lists

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/aq.html#aqrecipientlists)

## <a name="nls"></a> 28. Globalization and National Language Support (NLS)

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/globalization.html#nls](https://node-oracledb.readthedocs.io/en/latest/user_guide/globalization.html#nls).

## <a name="endtoend"></a> 29. End-to-end Tracing, Mid-tier Authentication, and Auditing

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/tracing.html#endtoend](https://node-oracledb.readthedocs.io/en/latest/user_guide/tracing.html#endtoend).

#### <a name="drivernameview"></a> The Add-on Name

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/tracing.html#drivernameview)

## <a name="sodaoverview"></a> 30. Simple Oracle Document Access (SODA)

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaoverview](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaoverview).

### <a name="sodarequirements"></a> 30.1 Node-oracledb SODA Requirements

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodarequirements)

### <a name="creatingsodacollections"></a> 30.2 Creating and Dropping SODA Collections

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#creatingsodacollections)

### <a name="accessingsodadocuments"></a> 30.3 Creating and Accessing SODA documents

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#accessingsodadocuments)

### <a name="sodaqbesearches"></a> 30.4 SODA Query-by-Example Searches for JSON Documents

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaqbesearches)

### <a name="sodatextsearches"></a> 30.5 SODA Text Searches

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodatextsearches)

### <a name="sodaclientkeys"></a> 30.6 SODA Client-Assigned Keys and Collection Metadata

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaclientkeys)

### <a name="sodajsondataguide"></a> 30.7 JSON Data Guides in SODA

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodajsondataguide)

#### <a name="sodamdcache"></a> 30.8 Using the SODA Metadata Cache

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodamdcache)

## <a name="startupshutdown"></a> 31. Database Start Up and Shut Down

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/startup.html#startupshutdown](https://node-oracledb.readthedocs.io/en/latest/user_guide/startup.html#startupshutdown).

### <a name="startupshutdownsimple"></a> 31.1 Simple Database Start Up and Shut Down

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/startup.html#startupshutdownsimple)

### <a name="startupshutdownflexible"></a> 31.2 Flexible Database Start Up and Shut Down

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/startup.html#startupshutdownflexible)

### <a name="startupshutdownpdb"></a> 31.3 Oracle Multitenant Pluggable and Container Databases

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/startup.html#startupshutdownpdb)

## <a name="tuning"></a> 32. Node-oracledb Tuning

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#tuning](https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#tuning).

#### <a name="rowfetching"></a> 32.1 Tuning Fetch Performance

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#rowfetching)

### <a name="roundtrips"></a> 32.2 Database Round-trips

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#roundtrips)

### <a name="stmtcache"></a> 32.3. Statement Caching

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#stmtcache)

### <a name="clientresultcache"></a> 32.4 Client Result Caching (CRC)

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/tuning.html#clientresultcache)

## <a name="bindtrace"></a> <a name="tracingsql"></a> 33. Tracing SQL and PL/SQL Statements

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/tracingsql.html#tracingsql](https://node-oracledb.readthedocs.io/en/latest/user_guide/tracingsql.html#tracingsql).

## <a name="twopc"></a> 34. Two-Phase Commits (TPC)

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/two_phase_commit.html#twopc](https://node-oracledb.readthedocs.io/en/latest/user_guide/two_phase_commit.html#twopc).

## <a name="programstyles"></a> 35. Node.js Programming Styles and node-oracledb

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#programstyles](https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#programstyles).

### <a name="callbackoverview"></a> <a name="examplequerycb"></a> 35.1 Callbacks and node-oracledb

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#callbackoverview)

### <a name="promiseoverview"></a> 35.2 Promises and node-oracledb

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#promiseoverview)

#### <a name="custompromises"></a> 35.2.1 Custom Promise Libraries

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#custompromises)

### <a name="asyncawaitoverview"></a> 35.3 Async/Await and node-oracledb

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/pgmstyle.html#asyncawaitoverview)

## <a name="migrate"></a> 36. Migrating from Previous node-oracledb Releases

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migrate](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migrate).

### <a name="migratev31v40"></a> 36.1 Migrating from node-oracledb 3.1 to node-oracledb 4.0

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migratev31v40)

### <a name="migratev40v41"></a> 36.2 Migrating from node-oracledb 4.0 to node-oracledb 4.1

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migratev40v41)

### <a name="migratev41v42"></a> 36.3 Migrating from node-oracledb 4.1 to node-oracledb 4.2

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migratev41v42)

### <a name="migratev42v50"></a> 36.4 Migrating from node-oracledb 4.2 to node-oracledb 5.0

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migratev42v50)

### <a name="migratev51v52"></a> 36.5 Migrating from node-oracledb 5.1 to node-oracledb 5.2

[View latest documentation](https://node-oracledb.readthedocs.io/en/latest/user_guide/migrate.html#migratev51v52)

## <a name="otherresources"></a> 37. Useful Resources for Node-oracledb

The documentation has moved to [https://node-oracledb.readthedocs.io/en/latest/user_guide/resources.html#otherresources](https://node-oracledb.readthedocs.io/en/latest/user_guide/resources.html#otherresources).
