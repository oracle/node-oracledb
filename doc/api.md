# node-oracledb 3.1 Documentation for the Oracle Database Node.js Add-on

*Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

##
## ===> *** Note: Go to [https://oracle.github.io/node-oracledb/doc/api.html](https://oracle.github.io/node-oracledb/doc/api.html) for production documentation ***

##  <a name="contents"></a> Contents

1. [Introduction](#intro)
    - 1.1 [Getting Started with Node-oracledb](#getstarted)
        - 1.1.1 [Example: Simple SQL SELECT statement in Node.js with Callbacks](#examplequerycb)
        - 1.1.2 [Example: Simple Oracle Document Access (SODA) in Node.js](#examplesodaawait)
2. [Errors](#errorobj)
    - 2.1 [Error Properties](#properror)
        - 2.1.1 [`errorNum`](#properrerrornum)
        - 2.1.2 [`message`](#properrmessage)
        - 2.1.3 [`offset`](#properroffset)
3. [Oracledb Class](#oracledbclass)
    - 3.1 [Oracledb Constants](#oracledbconstants)
        - 3.1.1 [Query `outFormat` Constants](#oracledbconstantsoutformat)
            - [`ARRAY`](#oracledbconstantsoutformat), [`OBJECT`](#oracledbconstantsoutformat)
        - 3.1.2 [Node-oracledb Type Constants](#oracledbconstantsnodbtype)
            - [`BLOB`](#oracledbconstantsnodbtype), [`BUFFER`](#oracledbconstantsnodbtype), [`CLOB`](#oracledbconstantsnodbtype), [`CURSOR`](#oracledbconstantsnodbtype), [`DATE`](#oracledbconstantsnodbtype), [`DEFAULT`](#oracledbconstantsnodbtype), [`NUMBER`](#oracledbconstantsnodbtype), [`STRING`](#oracledbconstantsnodbtype)
        - 3.1.3 [Oracle Database Type Constants](#oracledbconstantsdbtype)
            - [`DB_TYPE_BINARY_DOUBLE`](#oracledbconstantsdbtype), [`DB_TYPE_BINARY_FLOAT`](#oracledbconstantsdbtype), [`DB_TYPE_BLOB`](#oracledbconstantsdbtype), [`DB_TYPE_CHAR`](#oracledbconstantsdbtype), [`DB_TYPE_CLOB`](#oracledbconstantsdbtype), [`DB_TYPE_DATE`](#oracledbconstantsdbtype), [`DB_TYPE_LONG`](#oracledbconstantsdbtype), [`DB_TYPE_LONG_RAW`](#oracledbconstantsdbtype), [`DB_TYPE_NCHAR`](#oracledbconstantsdbtype), [`DB_TYPE_NCLOB`](#oracledbconstantsdbtype), [`DB_TYPE_NUMBER`](#oracledbconstantsdbtype), [`DB_TYPE_NVARCHAR`](#oracledbconstantsdbtype), [`DB_TYPE_RAW`](#oracledbconstantsdbtype), [`DB_TYPE_ROWID`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP_LTZ`](#oracledbconstantsdbtype), [`DB_TYPE_TIMESTAMP_TZ`](#oracledbconstantsdbtype), [`DB_TYPE_VARCHAR`](#oracledbconstantsdbtype)
            - [`BIND_IN`](#oracledbconstantsbinddir), [`BIND_INOUT`](#oracledbconstantsbinddir), [`BIND_OUT`](#oracledbconstantsbinddir)
        - 3.1.5 [Privileged Connection Constants](#oracledbconstantsprivilege)
            - [`SYSDBA`](#oracledbconstantsprivilege), [`SYSOPER`](#oracledbconstantsprivilege), [`SYSASM`](#oracledbconstantsprivilege), [`SYSBACKUP`](#oracledbconstantsprivilege), [`SYSDG`](#oracledbconstantsprivilege), [`SYSKM`](#oracledbconstantsprivilege), [`SYSRAC`](#oracledbconstantsprivilege)
        - 3.1.6 [SQL Statement Type Constants](#oracledbconstantsstmttype)
            - [`STMT_TYPE_UNKNOWN`](#oracledbconstantsstmttype), [`STMT_TYPE_SELECT`](#oracledbconstantsstmttype), [`STMT_TYPE_UPDATE`](#oracledbconstantsstmttype), [`STMT_TYPE_DELETE`](#oracledbconstantsstmttype), [`STMT_TYPE_INSERT`](#oracledbconstantsstmttype), [`STMT_TYPE_CREATE`](#oracledbconstantsstmttype), [`STMT_TYPE_DROP`](#oracledbconstantsstmttype), [`STMT_TYPE_ALTER`](#oracledbconstantsstmttype), [`STMT_TYPE_BEGIN`](#oracledbconstantsstmttype), [`STMT_TYPE_DECLARE`](#oracledbconstantsstmttype), [`STMT_TYPE_CALL`](#oracledbconstantsstmttype), [`STMT_TYPE_EXPLAIN_PLAN`](#oracledbconstantsstmttype), [`STMT_TYPE_MERGE`](#oracledbconstantsstmttype), [`STMT_TYPE_ROLLBACK`](#oracledbconstantsstmttype), [`STMT_TYPE_COMMIT`](#oracledbconstantsstmttype)
        - 3.1.7 [Subscription Constants](#oracledbconstantssubscription)
            - [`SUBSCR_EVENT_TYPE_DEREG`](#oracledbconstantssubscription), [`SUBSCR_EVENT_TYPE_OBJ_CHANGE`](#oracledbconstantssubscription), [`SUBSCR_EVENT_TYPE_QUERY_CHANGE`](#oracledbconstantssubscription), [`SUBSCR_EVENT_TYPE_AQ`](#oracledbconstantssubscription), [`SUBSCR_GROUPING_CLASS_TIME`](#oracledbconstantssubscription), [`SUBSCR_GROUPING_TYPE_SUMMARY`](#oracledbconstantssubscription), [`SUBSCR_GROUPING_TYPE_LAST`](#oracledbconstantssubscription), [`SUBSCR_QOS_BEST_EFFORT`](#oracledbconstantssubscription), [`SUBSCR_QOS_DEREG_NFY`](#oracledbconstantssubscription), [`SUBSCR_QOS_QUERY`](#oracledbconstantssubscription), [`SUBSCR_QOS_RELIABLE`](#oracledbconstantssubscription), [`SUBSCR_QOS_ROWIDS`](#oracledbconstantssubscription)
        - 3.1.8 [Continuous Query Notification Constants](#oracledbconstantscqn)
            - [`CQN_OPCODE_ALL_OPS`](#oracledbconstantscqn), [`CQN_OPCODE_ALL_ROWS`](#oracledbconstantscqn), [`CQN_OPCODE_ALTER`](#oracledbconstantscqn), [`CQN_OPCODE_DELETE`](#oracledbconstantscqn), [`CQN_OPCODE_DROP`](#oracledbconstantscqn), [`CQN_OPCODE_INSERT`](#oracledbconstantscqn), [`CQN_OPCODE_UPDATE`](#oracledbconstantscqn)
        - 3.1.9 [Pool Status Constants](#oracledbconstantspool)
            - [`POOL_STATUS_OPEN`](#oracledbconstantspool), [`POOL_STATUS_DRAINING`](#oracledbconstantspool), [`POOL_STATUS_CLOSED`](#oracledbconstantspool)
        - 3.1.10 [Simple Oracle Document Access (SODA) Constants](#oracledbconstantssoda)
            - [`SODA_COLL_MAP_MODE`](#oracledbconstantssoda)
    - 3.2 [Oracledb Properties](#oracledbproperties)
        - 3.2.1 [`autoCommit`](#propdbisautocommit)
        - 3.2.2 [`connectionClass`](#propdbconclass)
        - 3.2.3 [`edition`](#propdbedition)
        - 3.2.4 [`events`](#propdbevents)
        - 3.2.5 [`extendedMetaData`](#propdbextendedmetadata)
        - 3.2.6 [`externalAuth`](#propdbisexternalauth)
        - 3.2.7 [`fetchArraySize`](#propdbfetcharraysize)
        - 3.2.8 [`fetchAsBuffer`](#propdbfetchasbuffer)
        - 3.2.9 [`fetchAsString`](#propdbfetchasstring)
        - 3.2.10 [`lobPrefetchSize`](#propdblobprefetchsize)
        - 3.2.11 [`maxRows`](#propdbmaxrows)
        - 3.2.12 [`oracleClientVersion`](#propdboracleclientversion)
        - 3.2.13 [`oracleClientVersionString`](#propdboracleclientversionstring)
        - 3.2.14 [`outFormat`](#propdboutformat)
        - 3.2.15 [`poolIncrement`](#propdbpoolincrement)
        - 3.2.16 [`poolMax`](#propdbpoolmax)
        - 3.2.17 [`poolMin`](#propdbpoolmin)
        - 3.2.18 [`poolPingInterval`](#propdbpoolpinginterval)
        - 3.2.19 [`poolTimeout`](#propdbpooltimeout)
        - 3.2.20 [`prefetchRows`](#propdbprefetchrows)
        - 3.2.21 [`Promise`](#propdbpromise)
        - 3.2.22 [`queueRequests`](#propdbqueuerequests)
        - 3.2.23 [`queueTimeout`](#propdbqueuetimeout)
        - 3.2.24 [`stmtCacheSize`](#propdbstmtcachesize)
        - 3.2.25 [`version`](#propdbversion)
        - 3.2.26 [`versionString`](#propdbversionstring)
        - 3.2.27 [`versionSuffix`](#propdbversionsuffix)
    - 3.3 [Oracledb Methods](#oracledbmethods)
        - 3.3.1 [`createPool()`](#createpool)
            - 3.3.1.1 [`createPool()`: Parameters and Attributes](#createpoolpoolattrs)
                - 3.3.1.1.1 [`connectString`](#createpoolpoolattrsconnectstring), [`connectionString`](#createpoolpoolattrsconnectstring)
                - 3.3.1.1.2 [`edition`](#createpoolpoolattrsedition)
                - 3.3.1.1.3 [`events`](#createpoolpoolattrsevents)
                - 3.3.1.1.4 [`externalAuth`](#createpoolpoolattrsexternalauth)
                - 3.3.1.1.5 [`homogeneous`](#createpoolpoolattrshomogeneous)
                - 3.3.1.1.6 [`password`](#createpoolpoolattrspassword)
                - 3.3.1.1.7 [`poolAlias`](#createpoolpoolattrspoolalias)
                - 3.3.1.1.8 [`poolIncrement`](#createpoolpoolattrspoolincrement)
                - 3.3.1.1.9 [`poolMax`](#createpoolpoolattrspoolmax)
                - 3.3.1.1.10 [`poolMin`](#createpoolpoolattrspoolmin)
                - 3.3.1.1.11 [`poolPingInterval`](#createpoolpoolattrspoolpinginterval)
                - 3.3.1.1.12 [`poolTimeout`](#createpoolpoolattrspooltimeout)
                - 3.3.1.1.13 [`queueRequests`](#createpoolpoolattrsqueuerequests)
                - 3.3.1.1.14 [`queueTimeout`](#createpoolpoolattrsqueuetimeout)
                - 3.3.1.1.15 [`sessionCallback`](#createpoolpoolattrssessioncallback)
                - 3.3.1.1.16 [`stmtCacheSize`](#createpoolpoolattrsstmtcachesize)
                - 3.3.1.1.17 [`user`](#createpoolpoolattrsuser)
            - 3.3.1.2 [`createPool()`: Callback Function](#createpoolpoolcallback)
        - 3.3.2 [`getConnection()`](#getconnectiondb)
            - 3.3.2.1 [`getConnection()`: Parameters](#getconnectiondbattrs)
                - 3.3.2.1.1 [Pool Alias](#getconnectionpoolalias)
                - 3.3.2.1.2 [`getConnection()`: Attributes](#getconnectiondbattrsconnattrs)
                    - 3.3.2.1.2.1 [`connectString`](#getconnectiondbattrsconnectstring), [`connectionString`](#getconnectiondbattrsconnectstring)
                    - 3.3.2.1.2.2 [`edition`](#getconnectiondbattrsedition)
                    - 3.3.2.1.2.3 [`events`](#getconnectiondbattrsevents)
                    - 3.3.2.1.2.4 [`externalAuth`](#getconnectiondbattrsexternalauth)
                    - 3.3.2.1.2.5 [`matchAny`](#getconnectiondbattrsmatchany)
                    - 3.3.2.1.2.6 [`newPassword`](#getconnectiondbattrsnewpassword)
                    - 3.3.2.1.2.7 [`poolAlias`](#getconnectiondbattrspoolalias)
                    - 3.3.2.1.2.8 [`password`](#getconnectiondbattrspassword)
                    - 3.3.2.1.2.9 [`privilege`](#getconnectiondbattrsprivilege)
                    - 3.3.2.1.2.10 [`stmtCacheSize`](#getconnectiondbattrsstmtcachesize)
                    - 3.3.2.1.2.11 [`tag`](#getconnectiondbattrstag)
                    - 3.3.2.1.2.12 [`user`](#getconnectiondbattrsuser)
            - 3.3.2.2 [`getConnection()`: Callback Function](#getconnectiondbcallback)
        - 3.3.3 [`getPool()`](#getpool)
            - 3.3.3.1 [`getPool()`: Parameters](#getpoolattrs)
                - 3.3.3.1.1 [`poolAlias`](#getpoolattrsalias)
4. [Connection Class](#connectionclass)
    - 4.1 [Connection Properties](#connectionproperties)
        - 4.1.1 [`action`](#propconnaction)
        - 4.1.2 [`callTimeout`](#propconncalltimeout)
        - 4.1.3 [`clientId`](#propconnclientid)
        - 4.1.4 [`module`](#propconnmodule)
        - 4.1.5 [`oracleServerVersion`](#propconnoracleserverversion)
        - 4.1.6 [`oracleServerVersionString`](#propconnoracleserverversionstring)
        - 4.1.7 [`stmtCacheSize`](#propconnstmtcachesize)
        - 4.1.8 [`tag`](#propconntag)
    - 4.2 [Connection Methods](#connectionmethods)
        - 4.2.1 [`break()`](#break)
        - 4.2.2 [`changePassword()`](#changepassword)
        - 4.2.3 [`close()`](#connectionclose)
        - 4.2.4 [`commit()`](#commit)
        - 4.2.5 [`createLob()`](#connectioncreatelob)
        - 4.2.6 [`execute()`](#execute)
            - 4.2.6.1 [`execute()`: SQL Statement](#executesqlparam)
            - 4.2.6.2 [`execute()`: Bind Parameters](#executebindParams)
                - [`dir`](#executebindParams), [`maxArraySize`](#executebindParams), [`maxSize`](#executebindParams), [`type`](#executebindParams), [`val`](#executebindParams)
            - 4.2.6.3 [`execute()`: Options](#executeoptions)
                - 4.2.6.3.1 [`autoCommit`](#propexecautocommit)
                - 4.2.6.3.2 [`extendedMetaData`](#propexecextendedmetadata)
                - 4.2.6.3.3 [`fetchArraySize`](#propexecfetcharraysize)
                - 4.2.6.3.4 [`fetchInfo`](#propexecfetchinfo)
                - 4.2.6.3.5 [`maxRows`](#propexecmaxrows)
                - 4.2.6.3.6 [`outFormat`](#propexecoutformat)
                - 4.2.6.3.7 [`prefetchRows`](#propexecprefetchrows)
                - 4.2.6.3.8 [`resultSet`](#propexecresultset)
            - 4.2.6.4 [`execute()`: Callback Function](#executecallback)
                - 4.2.6.4.1 [`metaData`](#execmetadata)
                    - [`name`](#execmetadata), [`fetchType`](#execmetadata), [`dbType`](#execmetadata), [`byteSize`](#execmetadata), [`precision`](#execmetadata), [`scale`](#execmetadata), [`nullable`](#execmetadata)
                - 4.2.6.4.2 [`outBinds`](#execoutbinds)
                - 4.2.6.4.3 [`resultSet`](#execresultset)
                - 4.2.6.4.4 [`rows`](#execrows)
                - 4.2.6.4.5 [`rowsAffected`](#execrowsaffected)
        - 4.2.7 [`executeMany()`](#executemany)
            - 4.2.7.1 [`executeMany()`: SQL Statement](#executemanysqlparam)
            - 4.2.7.2 [`executeMany()`: Binds](#executemanybinds)
            - 4.2.7.3 [`executeMany()`: Options](#executemanyoptions)
                - 4.2.7.3.1 [`autoCommit`](#executemanyoptautocommit)
                - 4.2.7.3.2 [`batchErrors`](#executemanyoptbatcherrors)
                - 4.2.7.3.3 [`bindDefs`](#executemanyoptbinddefs)
                    - [`dir`](#executemanyoptbinddefs), [`maxSize`](#executemanyoptbinddefs), [`type`](#executemanyoptbinddefs)
                - 4.2.7.3.4 [`dmlRowCounts`](#executemanyoptdmlrowcounts)
            - 4.2.7.4 [`executeMany()`: Callback Function](#executemanycallback)
                - 4.2.7.4.1 [`batchErrors`](#execmanybatcherrors)
                - 4.2.7.4.2 [`dmlRowCounts`](#execmanydmlrowscounts)
                - 4.2.7.4.3 [`outBinds`](#execmanyoutbinds)
                - 4.2.7.4.4 [`rowsAffected`](#execmanyrowsaffected)
        - 4.2.8 [`getSodaDatabase()`](#getsodadatabase)
        - 4.2.9 [`getStatementInfo()`](#getstmtinfo)
        - 4.2.10 [`ping()`](#connectionping)
        - 4.2.11 [`queryStream()`](#querystream)
        - 4.2.12 [`release()`](#release)
        - 4.2.13 [`rollback()`](#rollback)
        - 4.2.14 [`subscribe()`](#consubscribe)
            - 4.2.14.1 [`subscribe()`: Name](#consubscribename)
            - 4.2.14.2 [`subscribe()`: Options](#consubscribeoptions)
                - 4.2.14.2.1 [`binds`](#consubscribeoptbinds)
                - 4.2.14.2.2 [`callback`](#consubscribeoptcallback)
                - 4.2.14.2.3 [`groupingClass`](#consubscribeoptgroupingclass)
                - 4.2.14.2.4 [`groupingType`](#consubscribeoptgroupingtype)
                - 4.2.14.2.5 [`groupingValue`](#consubscribeoptgroupingvalue)
                - 4.2.14.2.6 [`ipAddress`](#consubscribeoptipaddress)
                - 4.2.14.2.7 [`namespace`](#consubscribeoptnamespace)
                - 4.2.14.2.8 [`operations`](#consubscribeoptoperations)
                - 4.2.14.2.9 [`port`](#consubscribeoptport)
                - 4.2.14.2.10 [`qos`](#consubscribeoptqos)
                - 4.2.14.2.11 [`sql`](#consubscribeoptsql)
                - 4.2.14.2.12 [`timeout`](#consubscribeopttimeout)
            - 4.2.14.3 [`subscribe()`: Callback Function](#consubscribecallback)
        - 4.2.15 [`unsubscribe()`](#conunsubscribe)
5. [Lob Class](#lobclass)
    - 5.1 [Lob Properties](#lobproperties)
        - 5.1.1 [`chunkSize`](#proplobchunksize)
        - 5.1.2 [`length`](#proploblength)
        - 5.1.3 [`pieceSize`](#proplobpiecesize)
        - 5.1.4 [`type`](#proplobtype)
    - 5.2 [Lob Methods](#lobmethods)
        - 5.2.1 [`close()`](#lobclose)
6. [Pool Class](#poolclass)
    - 6.1 [Pool Properties](#poolproperties)
        - 6.1.1 [`connectionsInUse`](#proppoolconnectionsinuse)
        - 6.1.2 [`connectionsOpen`](#proppoolconnectionsopen)
        - 6.1.3 [`poolAlias`](#proppoolpoolalias)
        - 6.1.4 [`poolIncrement`](#proppoolpoolincrement)
        - 6.1.5 [`poolMax`](#proppoolpoolmax)
        - 6.1.6 [`poolMin`](#proppoolpoolmin)
        - 6.1.7 [`poolPingInterval`](#proppoolpoolpinginterval)
        - 6.1.8 [`poolTimeout`](#proppoolpooltimeout)
        - 6.1.9 [`queueRequests`](#proppoolqueuerequests)
        - 6.1.10 [`queueTimeout`](#proppoolqueueTimeout)
        - 6.1.11 [`status`](#proppoolstatus)
        - 6.1.12 [`stmtCacheSize`](#proppoolstmtcachesize)
    - 6.2 [Pool Methods](#poolmethods)
        - 6.2.1 [`close()`](#poolclose)
        - 6.2.2 [`getConnection()`](#getconnectionpool)
        - 6.2.3 [`terminate()`](#terminate)
7. [ResultSet Class](#resultsetclass)
    - 7.1 [ResultSet Properties](#resultsetproperties)
        - 7.1.1 [`metaData`](#rsmetadata)
    - 7.2 [ResultSet Methods](#resultsetmethods)
        - 7.2.1 [`close()`](#close)
        - 7.2.2 [`getRow()`](#getrow)
        - 7.2.3 [`getRows()`](#getrows)
        - 7.2.4 [`toQueryStream()`](#toquerystream)
8. [SodaCollection Class](#sodacollectionclass)
    - 8.1 [SodaCollection Properties](#sodacollectionproperties)
        - 8.1.1 [`metaData`](#sodacollectionpropmetadata)
        - 8.1.2 [`name`](#sodacollectionpropname)
    - 8.2 [SodaCollection Methods](#sodacollectionmethods)
        - 8.2.1 [`createIndex()`](#sodacollcreateindex)
            - 8.2.1.1 [`createIndex()`: Parameters](#sodacollcreateindexparams)
                - 8.2.1.1.1 [`indexSpec`](#sodacollcreateindexspec)
            - 8.2.1.2 [`createIndex()`: Callback Function](#sodacollcreateindexcb)
        - 8.2.2 [`drop()`](#sodacolldrop)
            - 8.2.2.1 [`drop()`: Callback Function](#sodacolldropcallback)
        - 8.2.3 [`dropIndex()`](#sodacolldropindex)
            - 8.2.3.1 [`dropIndex()`: Parameters](#sodacolldropindexparams)
                - 8.2.3.1.1 [`indexName`](#sodacolldropindexindexname)
                - 8.2.3.1.2 [`options`](#sodacolldropindexoptions)
            - 8.2.3.2 [`dropIndex()`: Callback Function](#sodacolldropindexcb)
        - 8.2.4 [`find()`](#sodacollfind)
            - 8.2.4.1 [SodaOperation Class](#sodaoperationclass)
                - 8.2.4.1.1 [Non-terminal SodaOperation Methods](#sodaoperationclassnonterm)
                    - 8.2.4.1.1.1 [`filter()`](#sodaoperationclassfilter)
                    - 8.2.4.1.1.2 [`key()`](#sodaoperationclasskey)
                    - 8.2.4.1.1.3 [`keys()`](#sodaoperationclasskeys)
                    - 8.2.4.1.1.4 [`limit()`](#sodaoperationclasslimit)
                    - 8.2.4.1.1.5 [`skip()`](#sodaoperationclassskip)
                    - 8.2.4.1.1.6 [`version()`](#sodaoperationclassversion)
                - 8.2.4.1.2 [Terminal SodaOperation Methods](#sodaoperationclassterm)
                    - 8.2.4.1.2.1 [`count()`](#sodaoperationclasscount)
                    - 8.2.4.1.2.2 [`getCursor()`](#sodaoperationclassgetcursor)
                    - 8.2.4.1.2.3 [`getDocuments()`](#sodaoperationclassgetdocuments)
                    - 8.2.4.1.2.4 [`getOne()`](#sodaoperationclassgetone)
                    - 8.2.4.1.2.5 [`remove()`](#sodaoperationclassremove)
                    - 8.2.4.1.2.6 [`replaceOne()`](#sodaoperationclassreplaceone)
                    - 8.2.4.1.2.7 [`replaceOneAndGet()`](#sodaoperationclassreplaceoneandget)
        - 8.2.5 [`getDataGuide()`](#sodacollgetdataguide)
        - 8.2.6 [`insertOne()`](#sodacollinsertone)
            - 8.2.6.1 [`insertOne()`: Parameters](#sodacollinsertoneparams)
                - 8.2.6.1.1 [`newDocumentContent`](#sodacollinsertoneparamsdoc), [`newDocument`](#sodacollinsertoneparamsdoc)
            - 8.2.6.2 [`insertOne()`: Callback Function](#sodacollinsertonecb)
        - 8.2.7 [`insertOneAndGet()`](#sodacollinsertoneandget)
            - 8.2.7.1 [`insertOneAndGet()`: Parameters](#sodacollinsertoneandgetparams)
                - 8.2.7.1.1 [`newDocumentContent`](#sodacollinsertoneandgetparamsdoc), [`newDocument`](#sodacollinsertoneandgetparamsdoc)
            - 8.2.7.2 [`insertOneAndGet()`: Callback Function](#sodacollinsertoneandgetcb)
9. [SodaDatabase Class](#sodadatabaseclass)
    - 9.1 [SodaDatabase Methods](#sodadatabasemethods)
        - 9.1.1 [`createCollection()`](#sodadbcreatecollection)
            - 9.1.1.1 [`createCollection(): collectionName`](#sodadbcreatecollectionname)
            - 9.1.1.2 [`createCollection(): options`](#sodadbcreatecollectionoptions)
                - 9.1.1.2.1 [`metaData`](#sodadbcreatecollectionoptsmetadata)
                - 9.1.1.2.2 [`mode`](#sodadbcreatecollectionoptsmode)
            - 9.1.1.3 [`createCollection()`: Callback Function](#sodadbcreatecollectioncb)
        - 9.1.2 [`createDocument()`](#sodadbcreatedocument)
            - 9.1.2.1 [`createDocument(): content`](#sodadbcreatedocumentcontent)
            - 9.1.2.2 [`createDocument(): options`](#sodadbcreatedocumentoptions)
                - 9.1.2.2.1 [`key`](#sodadbcreatedocumentoptskey)
                - 9.1.2.2.2 [`mediaType`](#sodadbcreatedocumentoptsmediatype)
        - 9.1.3 [`getCollectionNames()`](#sodadbgetcollectionnames)
            - 9.1.3.1 [`getCollectionNames()`: Parameters](#sodadbgetcollectionnamesparams)
                - 9.1.3.1.1 [`options`](#sodadbgetcollectionnamesoptions)
            - 9.1.3.2 [`getCollectionNames()`: Callback Function](#sodadbgetcollectionnamescb)
        - 9.1.4 [`openCollection()`](#sodadbopencollection)
            - 9.1.4.1 [`openCollection()`: Parameters](#sodadbopencollectionparams)
                - 9.1.4.1.1 [`collectionName`](#sodadbopencollectionname)
            - 9.1.4.2 [`openCollection()`: Callback Function](#sodadbopencollectioncb)
10. [SodaDocument Class](#sodadocumentclass)
    - 10.1 [SodaDocument Properties](#sodadocumentproperties)
    - 10.2 [SodaDocument Methods](#sodadocumentmethods)
        - 10.2.1 [`getContent()`](#sodadocgetcontent)
        - 10.2.2 [`getContentAsBuffer()`](#sodadocgetcontentasbuffer)
        - 10.2.3 [`getContentAsString()`](#sodadocgetcontentasstring)
11. [SodaDocumentCursor Class](#sodadocumentcursorclass)
    - 11.1 [SodaDocumentCursor Methods](#sodadoccursormethods)
        - 11.1.1 [`close()`](#sodadoccursorclose)
        - 11.1.2 [`getNext()`](#sodadoccursorgetnext)
12. [Connection Handling](#connectionhandling)
    - 12.1 [Connection Strings](#connectionstrings)
        - 12.1.1 [Easy Connect Syntax for Connection Strings](#easyconnect)
        - 12.1.2 [Net Service Names for Connection Strings](#tnsnames)
        - 12.1.3 [Embedded Connection Strings](#embedtns)
        - 12.1.4 [JDBC and Node-oracledb Connection Strings Compared](#notjdbc)
    - 12.2 [Connections and Number of Threads](#numberofthreads)
    - 12.3 [Connection Pooling](#connpooling)
        - 12.3.1 [Connection Pool Sizing](#conpoolsizing)
        - 12.3.2 [Connection Pool Closing and Draining](#conpooldraining)
        - 12.3.3 [Connection Pool Cache](#connpoolcache)
        - 12.3.4 [Connection Pool Queue](#connpoolqueue)
        - 12.3.5 [Connection Pool Monitoring and Throughput](#connpoolmonitor)
        - 12.3.6 [Connection Pool Pinging](#connpoolpinging)
        - 12.3.7 [Connection Tagging and Session State](#connpooltagging)
        - 12.3.8 [Heterogeneous Connection Pools and Pool Proxy Authentication](#connpoolproxy)
    - 12.4 [External Authentication](#extauth)
    - 12.5 [Database Resident Connection Pooling (DRCP)](#drcp)
    - 12.6 [Privileged Connections](#privconn)
    - 12.7 [Securely Encrypting Network Traffic to Oracle Database](#securenetwork)
    - 12.8 [Changing Passwords and Connecting with an Expired Password](#changingpassword)
    - 12.9 [Connections and High Availability](#connectionha)
        - 12.9.1 [Fast Application Notification (FAN)](#connectionfan)
        - 12.9.2 [Runtime Load Balancing (RLB)](#connectionrlb)
        - 12.9.3 [Database Call Timeouts](#dbcalltimeouts)
    - 12.10 [Optional Client Configuration Files](#tnsadmin)
13. [SQL Execution](#sqlexecution)
    - 13.1 [SELECT Statements](#select)
        - 13.1.1 [Fetching Rows with Direct Fetches](#fetchingrows)
        - 13.1.2 [Fetching Rows with Result Sets](#resultsethandling)
        - 13.1.3 [Query Streaming](#streamingresults)
        - 13.1.4 [Query Output Formats](#queryoutputformats)
        - 13.1.5 [Query Column Metadata](#querymeta)
        - 13.1.6 [Query Result Type Mapping](#typemap)
            - 13.1.6.1 [Fetching CHAR, VARCHAR2, NCHAR and NVARCHAR](#stringhandling)
            - 13.1.6.2 [Fetching Numbers](#numberhandling)
            - 13.1.6.3 [Fetching Dates and Timestamps](#datehandling)
            - 13.1.6.4 [Fetching Numbers and Dates as String](#fetchasstringhandling)
            - 13.1.6.5 [Fetching BLOB and CLOB](#fetchlob)
            - 13.1.6.6 [Fetching LONG and LONG RAW](#fetchlong)
            - 13.1.6.7 [Fetching ROWID and UROWID](#fetchrowid)
            - 13.1.6.8 [Fetching XMLType](#fetchxml)
            - 13.1.6.9 [Fetching RAW](#fetchraw)
            - 13.1.6.10 [Mapping Custom Types](#customtypehandling)
        - 13.1.7 [Limiting Rows and Creating Paged Datasets](#pagingdata)
        - 13.1.8 [Auto-Increment Columns](#autoincrement)
    - 13.2 [Cursor Management](#cursors1000)
14. [PL/SQL Execution](#plsqlexecution)
    - 14.1 [PL/SQL Stored Procedures](#plsqlproc)
    - 14.2 [PL/SQL Stored Functions](#plsqlfunc)
    - 14.3 [Anonymous PL/SQL blocks](#plsqlanon)
    - 14.4 [Using DBMS_OUTPUT](#dbmsoutput)
    - 14.5 [Edition-Based Redefinition](#ebr)
15. [Working with CLOB and BLOB Data](#lobhandling)
    - 15.1 [Simple Insertion of LOBs](#basiclobinsert)
    - 15.2 [Simple LOB Queries and PL/SQL OUT Binds](#queryinglobs)
    - 15.3 [Streaming Lobs](#streamsandlobs)
    - 15.4 [Using RETURNING INTO to Insert into LOBs](#lobinsertdiscussion)
    - 15.5 [Getting LOBs as Streams from Oracle Database](#loboutstream)
    - 15.6 [Using `createLob()` for PL/SQL IN Binds](#templobdiscussion)
    - 15.7 [Closing Lobs](#closinglobs)
16. [Oracle Database 12c JSON Data type](#jsondatatype)
17. [Working with XMLType](#xmltype)
18. [Bind Parameters for Prepared Statements](#bind)
    - 18.1 [IN Bind Parameters](#inbind)
    - 18.2 [OUT and IN OUT Bind Parameters](#outbind)
    - 18.3 [DML RETURNING Bind Parameters](#dmlreturn)
    - 18.4 [REF CURSOR Bind Parameters](#refcursors)
    - 18.5 [LOB Bind Parameters](#lobbinds)
    - 18.6 [PL/SQL Collection Associative Array (Index-by) Bind Parameters](#plsqlindexbybinds)
    - 18.7 [Binding Multiple Values to a SQL `WHERE IN` Clause](#sqlwherein)
    - 18.8 [Binding Column and Table Names in Queries](#sqlbindtablename)
19. [Batch Statement Execution](#batchexecution)
20. [Transaction Management](#transactionmgt)
21. [Statement Caching](#stmtcache)
22. [Continuous Query Notification (CQN)](#cqn)
23. [Advanced Queuing (AQ)](#aq)
24. [External Configuration](#oraaccess)
25. [Globalization and National Language Support (NLS)](#nls)
26. [End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend)
27. [Simple Oracle Document Access (SODA)](#sodaoverview)
    - 27.1 [Node-oracledb SODA Requirements](#sodarequirements)
    - 27.2 [Creating SODA Collections](#creatingsodacollections)
    - 27.3 [Creating and Accessing SODA documents](#accessingsodadocuments)
    - 27.4 [SODA Query-by-Example Searches for JSON Documents](#sodaqbesearches)
    - 27.5 [SODA Client-Assigned Keys and Collection Metadata](#sodaclientkeys)
    - 27.6 [JSON Data Guides in SODA](#sodajsondataguide)
28. [Promises and node-oracledb](#promiseoverview)
    - 28.1 [Custom Promise Libraries](#custompromises)
29. [Async/Await and node-oracledb](#asyncawaitoverview)
30. [Tracing SQL and PL/SQL Statements](#tracingsql)
31. [Migrating from Previous node-oracledb Releases](#migrate)
    - 31.1 [Migrating from node-oracledb 1.13 to node-oracledb 2.0](#migratev1v2)
    - 31.2 [Migrating from node-oracledb 2.0 to node-oracledb 2.1](#migratev20v21)
    - 31.3 [Migrating from node-oracledb 2.3 to node-oracledb 3.0](#migratev23v30)
    - 31.3 [Migrating from node-oracledb 3.0 to node-oracledb 3.1](#migratev30v31)

## <a name="apimanual"></a> NODE-ORACLEDB API MANUAL

## <a name="intro"></a> 1. Introduction

The [*node-oracledb*][1] add-on for Node.js powers high performance Oracle Database applications.

This document shows how to use node-oracledb version 2.  The API
reference is in sections 2 - 11 and the user guide in subsequent
sections.

Documentation about node-oracledb version 1 is [here][94].
Documentation about node-oracledb version 2 is [here][121].

The node-oracledb API is a generic Oracle Database access layer.
Almost all the functionality described here is common across all
current Oracle Databases.  However the documentation may describe some
database features that are in specific Oracle Database versions,
editions, or require additional database options or packs.

### <a name="getstarted"></a> 1.1 Getting Started with Node-oracledb

Install Node.js from [nodejs.org][88].

Install node-oracledb using the [Quick Start Node-oracledb
Installation][87] steps.

Download node-oracledb [examples][3] or create a script like the one
below.  As well as callbacks, node-oracledb can also use
[Promises](#promiseoverview) and [Async/Await](#asyncawaitoverview)
functions.

Scripts to create Oracle's sample schemas can be found at
[github.com/oracle/db-sample-schemas][4].

Locate your Oracle Database [user name and password][91], and the database
[connection string](#connectionstrings).  The connection string is
commonly of the format `hostname/servicename`, using the host name
where the database is running and the Oracle Database service name of
the database instance.

Substitute your user name, password and connection string in the code.
For downloaded examples, put these in [`dbconfig.js`][89].

Run the script, for example:

```
node myscript.js
```

####  <a name="examplequerycb"></a> 1.1.1 Example: Simple SQL SELECT statement in Node.js with Callbacks

```javascript
// myscript.js

var oracledb = require('oracledb');

var mypw = ...  // set mypw to the hr schema password

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw
    connectString : "localhost/XEPDB1"
  },
  function(err, connection) {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      `SELECT manager_id, department_id, department_name
       FROM departments
       WHERE manager_id = :id`,
      [103],  // bind value for :id
      function(err, result) {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result.rows);
        doRelease(connection);
      });
  });

function doRelease(connection) {
  connection.close(
    function(err) {
      if (err)
        console.error(err.message);
    });
}
```

With Oracle's sample HR schema, the output is:

```
[ [ 103, 60, 'IT' ] ]
```

#### <a name="examplesodaawait"></a> 1.1.2 Example: Simple Oracle Document Access (SODA) in Node.js

Oracle Database 18c users who have been granted the SODA_APP role can
use [node-oracledb 3's SODA API](#sodaoverview) to store content such
as JSON.  SODA support in node-oracledb is in Preview status and
should not be used in production.  It will be supported with a future
version of Oracle Client libraries.

```javascript
// mysoda.js

const oracledb = require('oracledb');

let  mypw = ...  // set mypw to the hr schema password

const dbconfig = { user: 'hr', password: mypw, connectString: 'localhost/orclpdb' };

oracledb.autoCommit = true;

(async function() {
  let conn;

  try {
    conn = await oracledb.getConnection(dbconfig);
    console.log('Connected to database...');

    // Create a new (or open an existing) document collection
    let sd = conn.getSodaDatabase();
    let collectionName = 'nodb_soda_collection';
    let myCollection = await sd.createCollection(collectionName);

    // Insert a new document
    let myContent = { name: "Sally", address: {city: "Melbourne"} };
    await myCollection.insertOne(JSON.stringify(myContent));

    // Print names of people living in Melbourne
    let filterSpec = { "address.city": "Melbourne" };
    let myDocuments = await myCollection.find().filter(filterSpec).getDocuments();
    myDocuments.forEach(function(element) {
      let content = element.getContent();
      console.log(content.name, ' lives in Melbourne.');
    });
  } catch(err) {
    console.log('Error in processing:\n', err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        console.log('Error in closing connection:\n', err);
      }
    }
  }
})();
```

## <a name="errorobj"></a> 2. Errors

The last parameter of each method is a callback, unless
[Promises](#promiseoverview) are being used.  The first parameter of
the callback is an *Error* object that contains error information if
the call fails.  If the call succeeds, then the object is null.

When using Promises, the `catch()` callback's error object will
contain error information when the Promise chain fails.

If an invalid value is set for a property, then an error occurs.  The
same is true for invalid operations on read-only or write-only
properties.  If an unrecognized property name is used, it will be
ignored.

### <a name="properror"></a> 2.1 Error Properties

The *Error* object contains `errorNum`, `message` and `offset` properties.

#### <a name="properrerrornum"></a> 2.1.1 `errorNum`

```
Number errorNum
```

The Oracle error number.  This value is undefined for non-Oracle
errors and for messages prefixed with NJS or DPI.

#### <a name="properrmessage"></a> 2.1.2 `message`

```
String message
```

The text of the error message.

The error may be a standard Oracle message with a prefix like ORA or
PLS.  Alternatively it may be a node-oracledb specific error prefixed with
NJS or DPI.

A single line error message may look like this:

```
ORA-01017: invalid username/password; logon denied
```

A multi-line error message may look like this:

```
ORA-06550: line 1, column 7:
PLS-00201: identifier 'TESTPRC' must be declared
ORA-06550: line 1, column 7:
PL/SQL: Statement ignored
```

#### <a name="properroffset"></a> 2.1.3 `offset`

```
Number offset
```

The character offset into the SQL text that resulted in the Oracle
error.  The value may be `0` in non-SQL contexts.  This value is
undefined for non-Oracle errors and for messages prefixed with NJS or
DPI.

## <a name="oracledbclass"></a> 3. Oracledb Class

The *Oracledb* object is the factory class for *Pool* and *Connection* objects.

The *Oracledb* object is instantiated by loading node-oracledb:

```javascript
var oracledb = require("oracledb");
```

Internally, the add-on creates the *Oracledb* object as a singleton.
Reloading it in the same Node.js process creates a new pointer to the
same object.

### <a name="oracledbconstants"></a> 3.1 Oracledb Constants

These constants are defined in the `oracledb` module.  Usage is
described later in this document.

The numeric values for the constants are shown to aid debugging.  They
may change in future, so use the constant names in applications.


#### <a name="oracledbconstantsoutformat"></a> 3.1.1 Query `outFormat` Constants

Constants for the query result [outFormat](#propdboutformat) option:

Constant Name                        | Value |Description
-------------------------------------|-------|-----------------------------------------------
`oracledb.ARRAY`                     | 4001  | Fetch each row as array of column values
`oracledb.OBJECT`                    | 4002  | Fetch each row as an object

#### <a name="oracledbconstantsnodbtype"></a> 3.1.2 Node-oracledb Type Constants

Constants for `execute()` [bind parameter](#executebindParams) `type` property,
for the [`createLob()`](#connectioncreatelob) `type` parameter,
for the [Lob](#proplobtype) `type` property,
for [`fetchAsBuffer`](#propdbfetchasbuffer),
for [`fetchAsString`](#propdbfetchasstring)
and [`fetchInfo`](#propexecfetchinfo), and
for [extended metadata](#propdbextendedmetadata).

Not all constants can be used in all places.

Constant Name                        | Value |Description
-------------------------------------|-------|-----------------------------------------------
`oracledb.BLOB`                      | 2007  | Bind a BLOB to a Node.js Stream or create a temporary BLOB, or for fetchAsBuffer and fetchInfo
`oracledb.BUFFER`                    | 2005  | Bind a RAW, LONG RAW or BLOB to a Node.js Buffer
`oracledb.CLOB`                      | 2006  | Bind a CLOB to a Node.js Stream, create a temporary CLOB, or for fetchAsString and fetchInfo
`oracledb.CURSOR`                    | 2004  | Bind a REF CURSOR to a node-oracledb ResultSet class
`oracledb.DATE`                      | 2003  | Bind as JavaScript date type.  Can also be used for fetchAsString and fetchInfo
`oracledb.DEFAULT`                   |    0  | Used with fetchInfo to reset the fetch type to the database type
`oracledb.NUMBER`                    | 2002  | Bind as JavaScript number type.  Can also be used for fetchAsString and fetchInfo
`oracledb.STRING`                    | 2001  | Bind as JavaScript String type.  Can be used for most database types.

#### <a name="oracledbconstantsdbtype"></a> 3.1.3 Oracle Database Type Constants

The values of these types are shown
in [extended metadata](#propdbextendedmetadata) for queries and REF
CURSORS.  They indicate the Oracle Database type.

Constant Name                        | Value |Description
-------------------------------------|-------|-----------------------------------------------
`oracledb.DB_TYPE_BINARY_DOUBLE`     |  101  | BINARY_DOUBLE
`oracledb.DB_TYPE_BINARY_FLOAT`      |  100  | BINARY_FLOAT
`oracledb.DB_TYPE_BLOB`              |  113  | BLOB
`oracledb.DB_TYPE_CHAR`              |   96  | CHAR
`oracledb.DB_TYPE_CLOB`              |  112  | CLOB
`oracledb.DB_TYPE_DATE`              |   12  | DATE
`oracledb.DB_TYPE_LONG`              |    8  | LONG
`oracledb.DB_TYPE_LONG_RAW`          |   24  | LONG RAW
`oracledb.DB_TYPE_NCHAR`             | 1096  | NCHAR
`oracledb.DB_TYPE_NCLOB`             | 1112  | NCLOB
`oracledb.DB_TYPE_NUMBER`            |    2  | NUMBER or FLOAT
`oracledb.DB_TYPE_NVARCHAR`          | 1001  | NVARCHAR
`oracledb.DB_TYPE_RAW`               |   23  | RAW
`oracledb.DB_TYPE_ROWID`             |  104  | ROWID
`oracledb.DB_TYPE_TIMESTAMP`         |  187  | TIMESTAMP
`oracledb.DB_TYPE_TIMESTAMP_LTZ`     |  232  | TIMESTAMP WITH LOCAL TIME ZONE
`oracledb.DB_TYPE_TIMESTAMP_TZ`      |  188  | TIMESTAMP WITH TIME ZONE
`oracledb.DB_TYPE_VARCHAR`           |    1  | VARCHAR2

#### <a name="oracledbconstantsbinddir"></a> 3.1.4 Execute Bind Direction Constants

Constants for the `dir` property of `execute()`
[bindParams](#executebindParams), [`queryStream()`](#querystream) and
`executeMany()` [`bindDefs`](#executemanyoptbinddefs).

These specify whether data values bound to SQL or PL/SQL bind
parameters are passed into, or out from, the database:

Constant Name                        | Value |Description
-------------------------------------|-------|-----------------------------------------------
`oracledb.BIND_IN`                   |  3001 | Direction for IN binds
`oracledb.BIND_INOUT`                |  3002 | Direction for IN OUT binds
`oracledb.BIND_OUT`                  |  3003 | Direction for OUT binds

#### <a name="oracledbconstantsprivilege"></a> 3.1.5 Privileged Connection Constants

Constants for [`getConnection()`](#getconnectiondb)
[`privilege`](#getconnectiondbattrsprivilege) properties.

These specify what privilege should
be used by the connection that is being established.

Constant Name                        | Value |Description
-------------------------------------|---------|-----------------------------------------------
`oracledb.SYSDBA`                    |       2 | SYSDBA privileges
`oracledb.SYSOPER`                   |       4 | SYSOPER privileges
`oracledb.SYSASM`                    |   32768 | SYSASM privileges
`oracledb.SYSBACKUP`                 |  131072 | SYSBACKUP privileges
`oracledb.SYSDG`                     |  262144 | SYSDG privileges
`oracledb.SYSKM`                     |  524288 | SYSKM privileges
`oracledb.SYSRAC`                    | 1048576 | SYSRAC privileges

#### <a name="oracledbconstantsstmttype"></a> 3.1.6 SQL Statement Type Constants

Constants for [`connection.getStatementInfo()`](#getstmtinfo)
properties.


Constant Name                        | Value |Description
-------------------------------------|-------|-----------------------------------------------
`oracledb.STMT_TYPE_UNKNOWN`         |     0 | Unknown statement type
`oracledb.STMT_TYPE_SELECT`          |     1 | SELECT
`oracledb.STMT_TYPE_UPDATE`          |     2 | UPDATE
`oracledb.STMT_TYPE_DELETE`          |     3 | DELETE
`oracledb.STMT_TYPE_INSERT`          |     4 | INSERT
`oracledb.STMT_TYPE_CREATE`          |     5 | CREATE
`oracledb.STMT_TYPE_DROP`            |     6 | DROP
`oracledb.STMT_TYPE_ALTER`           |     7 | ALTER
`oracledb.STMT_TYPE_BEGIN`           |     8 | BEGIN
`oracledb.STMT_TYPE_DECLARE`         |     9 | DECLARE
`oracledb.STMT_TYPE_CALL`            |    10 | CALL
`oracledb.STMT_TYPE_EXPLAIN_PLAN`    |    15 | EXPLAIN PLAN
`oracledb.STMT_TYPE_MERGE`           |    16 | MERGE
`oracledb.STMT_TYPE_ROLLBACK`        |    17 | ROLLBACK
`oracledb.STMT_TYPE_COMMIT`          |    21 | COMMIT

#### <a name="oracledbconstantssubscription"></a> 3.1.7 Subscription Constants

Constants for the Continuous Query Notification [`message.type`](#consubscribeoptcallback).

Constant Name                               | Value |Description
--------------------------------------------|-------|-----------------------------------------------
`oracledb.SUBSCR_EVENT_TYPE_AQ`             | 100   | Advanced Queuing notifications are being used
`oracledb.SUBSCR_EVENT_TYPE_DEREG`          | 5     | A subscription has been closed or the timeout value has been reached
`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE`     | 6     | Object-level notications are being used (Database Change Notification)
`oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE`   | 7     | Query-level notifications are being used (Continuous Query Notification)

Constant for the Continuous Query Notification [`groupingClass`](#consubscribeoptgroupingclass).

Constant Name                           | Value |Description
----------------------------------------|-------|-----------------------------------------------
`oracledb.SUBSCR_GROUPING_CLASS_TIME`   | 1     | Group notifications by time into a single notification

Constants for the Continuous Query Notification [`groupingType`](#consubscribeoptgroupingtype).

Constant Name                           | Value |Description
----------------------------------------|-------|-----------------------------------------------
`oracledb.SUBSCR_GROUPING_TYPE_SUMMARY` | 1     | A summary of the grouped notifications is sent
`oracledb.SUBSCR_GROUPING_TYPE_LAST`    | 2     | The last notification in the group is sent

Constants for the Continuous Query Notification [`qos`](#consubscribeoptqos) Quality of Service.

Constant Name                      | Value |Description
-----------------------------------|-------|---------------------------------------------------
`oracledb.SUBSCR_QOS_BEST_EFFORT`  | 16    | When best effort filtering for query result set changes is acceptable. False positive notifications may be received. This behavior may be suitable for caching applications.
`oracledb.SUBSCR_QOS_DEREG_NFY`    |  2    | The subscription will be automatically unregistered as soon as the first notification is received.
`oracledb.SUBSCR_QOS_QUERY`        |  8    | Continuous Query Notification will be used instead of Database Change Notification.  This means that notifications are only sent if the result set of the registered query changes. By default no false positive notifications are generated. Use `oracledb.SUBSCR_QOS_BEST_EFFORT` if this is not needed.
`oracledb.SUBSCR_QOS_RELIABLE`     |  1    | Notifications are not lost in the event of database failure.
`oracledb.SUBSCR_QOS_ROWIDS`       |  4    | Notifications include the ROWIDs of the rows that were affected

Constants for the Continuous Query Notification [`namespace`](#consubscribeoptnamespace).

Constant Name                        | Value |Description
-------------------------------------|-------|---------------------------------------------------
`oracledb.SUBSCR_NAMESPACE_AQ`       | 1     | For Advanced Queuing notifications.  Note AQ enqueue and dequeue methods are not supported in node-oracledb.
`oracledb.SUBSCR_NAMESPACE_DBCHANGE` | 2     | For Continuous Query Notifications.

#### <a name="oracledbconstantscqn"></a> 3.1.8 Continuous Query Notification Constants

Constants for the Continuous Query Notification
`connection.subscribe()` option [`operations`](#consubscribeoptoperations), and for the
notification message [`operation`](#consubscribeoptcallback) properties.

Constant Name                   | Value |Description
--------------------------------|-------|---------------------------------------------------
`oracledb.CQN_OPCODE_ALL_OPS`   |  0    | Default.  Used to request notification of all operations.
`oracledb.CQN_OPCODE_ALL_ROWS`  |  1    | Indicates that row information is not available. This occurs if the `qos` quality of service flags do not specify the desire for ROWIDs, or if grouping has taken place and summary notifications are being sent.
`oracledb.CQN_OPCODE_ALTER`     | 16    | Set if the table was altered in the notifying transaction
`oracledb.CQN_OPCODE_DELETE`    |  8    | Set if the notifying transaction included deletes on the table
`oracledb.CQN_OPCODE_DROP`      | 32    | Set if the table was dropped in the notifying transaction
`oracledb.CQN_OPCODE_INSERT`    |  2    | Set if the notifying transaction included inserts on the table
`oracledb.CQN_OPCODE_UPDATE`    |  4    | Set if the notifying transaction included updates on the table

#### <a name="oracledbconstantspool"></a> 3.1.9 Pool Status Constants

Constants for the connection [`pool.status`](#proppoolstatus) readonly attribute.

Constant Name                   | Value |Description
--------------------------------|-------|---------------------------------------------------
`oracledb.POOL_STATUS_OPEN`     | 6000  | The connection pool is open.
`oracledb.POOL_STATUS_DRAINING` | 6001  | The connection pool is being drained of in-use connections and will be force closed soon.
`oracledb.POOL_STATUS_CLOSED`   | 6002  | The connection pool has been closed.

#### <a name="oracledbconstantssoda"></a> 3.1.10 Simple Oracle Document Access (SODA) Constants

Constant Name                   | Value |Description
--------------------------------|-------|---------------------------------------------------
`oracledb.SODA_COLL_MAP_MODE`   | 5001  | Indicate [`sodaDatabase.createCollection()`](#sodadbcreatecollection) should use an externally created table to store the collection

### <a name="oracledbproperties"></a> 3.2 Oracledb Properties

The properties of the *Oracledb* object are used for setting up
configuration parameters for deployment.

If required, these properties can be overridden for the *Pool* or
*Connection* objects.

These properties may be read or modified. If a property is modified,
only subsequent invocations of the `createPool()` or `getConnection()`
methods will be affected. Objects that exist before a property is
modified are not altered.

Invalid values, or combinations of values, for pool configuration
properties can result in the error *ORA-24413: Invalid number of
sessions specified*.

Each of the configuration properties is described below.

#### <a name="propdbisautocommit"></a> 3.2.1 `oracledb.autoCommit`

```
Boolean autoCommit
```

If this property is *true*, then the transaction in the current
connection is automatically committed at the end of statement
execution.

The default value is *false*.

This property may be overridden in an [`execute()`](#executeoptions) call.

Note prior to node-oracledb 0.5 this property was called
`isAutoCommit`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.autoCommit = false;
```

#### <a name="propdbconclass"></a> 3.2.2 `oracledb.connectionClass`

```
String connectionClass
```

The user-chosen Connection class value defines a logical name for connections.
Most single purpose applications should set `connectionClass` when
using a connection pool or DRCP.

When a pooled session has a connection class, Oracle ensures that the
session is not shared outside of that connection class.

The connection class value is similarly used by
[Database Resident Connection Pooling (DRCP)](#drcp) to allow or
disallow sharing of sessions.

For example, where two different kinds of users share one pool, you
might set `connectionClass` to 'HRPOOL' for connections that access a
Human Resources system, and it might be set to 'OEPOOL' for users of an
Order Entry system.  Users will only be given sessions of the
appropriate class, allowing maximal reuse of resources in each case,
and preventing any session information leaking between the two systems.

If `connectionClass` is set for a non-pooled connection, the driver
name is not recorded in `V$` views.
See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.connectionClass = 'HRPOOL';
```

#### <a name="propdbedition"></a> 3.2.3 `oracledb.edition`

```
String edition
```

Sets the name used for Edition-Based Redefinition by connections.

See [Edition-Based Redefinition](#ebr) for more information.

This property was added in node-oracledb 2.2.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.edition = 'ed_2';
```

#### <a name="propdbevents"></a> 3.2.4 `oracledb.events`

```
Boolean events
```

Determines whether Oracle Client events mode should be enabled.

The default value for `events` is *false*.

This property can be overridden in the
[`oracledb.createPool()`](#createpoolpoolattrsevents) call and when
getting a standalone connection from
[`oracledb.getConnection()`](#getconnectiondbattrsevents).

Events mode is required for [Continuous Query
Notification](#consubscribe), [Fast Application Notification
(FAN)](#connectionfan) and [Runtime Load Balancing
(RLB)](#connectionrlb).

This property was added in node-oracledb 2.2.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.events = true;
```

#### <a name="propdbextendedmetadata"></a> 3.2.5 `oracledb.extendedMetaData`

```
Boolean extendedMetaData
```

Determines whether additional metadata is available for queries and
for REF CURSORs returned from PL/SQL blocks.

The default value for `extendedMetaData` is *false*. With this value,
the [`result.metaData`](#execmetadata)
[`result.resultSet.metaData`](#rsmetadata) objects only include column
names.

If `extendedMetaData` is *true* then `metaData` will contain
additional attributes.  These are listed in
[Result Object Properties](#execmetadata).

This property may be overridden in an [`execute()`](#executeoptions) call.

This property was added in node-oracledb 1.10.

#### <a name="propdbisexternalauth"></a> 3.2.6 `oracledb.externalAuth`

```
Boolean externalAuth
```

If this property is *true* then connections are established using
external authentication.  See [External Authentication](#extauth) for
more information.

The default value is *false*.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

This property can be overridden in the
[`oracledb.createPool()`](#createpool) call and when getting a
standalone connection from
[`oracledb.getConnection()`](#getconnectiondb).

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.externalAuth = false;
```

#### <a name="propdbfetcharraysize"></a> 3.2.7 `oracledb.fetchArraySize`

```
Number fetchArraySize
```

This property sets the size of an internal buffer used for fetching
query rows from Oracle Database.  Changing it may affect query
performance but does not affect how many rows are returned to the
application.

The default value is 100.

The property is used during the default [direct
fetches](#fetchingrows), during ResultSet [`getRow()`](#getrow) calls,
and for [`queryStream()`](#querystream).  It is not used for
[`getRows()`](#getrows).

Increasing this value reduces the number of [round-trips][124] to the
database but increases memory usage for each data fetch.  For queries
that return a large number of rows, higher values of `fetchArraySize`
may give better performance.  For queries that only return a few rows,
reduce the value of `fetchArraySize` to minimize the amount of memory
management during data fetches.  JavaScript memory fragmentation may
occur in some cases, see [Fetching Rows with Direct
Fetches](#fetchingrows).

For direct fetches (those using `execute()` option [`resultSet:
false`](#propexecresultset)), the internal buffer size will be based
on the lesser of [`maxRows`](#propdbmaxrows) and `fetchArraySize`.

The property was introduced in node-oracledb version 2.0.  It replaces
[`prefetchRows`](#propdbprefetchrows).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.fetchArraySize = 100;
```

#### <a name="propdbfetchasbuffer"></a> 3.2.8 `oracledb.fetchAsBuffer`

```
Array fetchAsBuffer
```

An array of node-oracledb types.  Currently the only valid type
is [`oracledb.BLOB`](#oracledbconstantsnodbtype).  When a BLOB column is
queried with [`execute()`](#execute)
or [`queryStream()`](#querystream), the column data is returned as a
Buffer instead of the default representation.

By default in node-oracledb, all columns are returned as native types
or as [Lob](#lobclass) instances, in the case of CLOB and BLOB types.

Individual query columns in [`execute()`](#execute)
or [`queryStream()`](#querystream) calls can override the
`fetchAsBuffer` global setting by
using [`fetchInfo`](#executeoptions).

This property was added in node-oracledb 1.13.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.fetchAsBuffer = [ oracledb.BLOB ];
```

#### <a name="propdbfetchasstring"></a> 3.2.9 `oracledb.fetchAsString`

```
Array fetchAsString
```

An array of node-oracledb types.  The valid types are
[`oracledb.DATE`](#oracledbconstantsnodbtype),
[`oracledb.NUMBER`](#oracledbconstantsnodbtype),
[`oracledb.BUFFER`](#oracledbconstantsnodbtype),
and [`oracledb.CLOB`](#oracledbconstantsnodbtype).  When any column having one
of the specified types is queried with [`execute()`](#execute)
or [`queryStream()`](#querystream), the column data is returned as a
string instead of the default representation.

By default in node-oracledb, all columns are returned as native types
or as [Lob](#lobclass) instances, in the case of CLOB and BLOB types.

This property helps avoid situations where using JavaScript types can
lead to numeric precision loss, or where date conversion is unwanted.
See [Query Result Type Mapping](#typemap) for more discussion.

For raw data returned as a string, Oracle returns the data as a hex-encoded
string.  For dates and numbers returned as a string, the maximum length of a
string created by this mapping is 200 bytes.  Strings created for CLOB columns
will generally be limited by Node.js and V8 memory restrictions.

Individual query columns in [`execute()`](#execute)
or [`queryStream()`](#querystream) calls can override the
`fetchAsString` global setting by
using [`fetchInfo`](#executeoptions).

For non-CLOB types, the conversion to string is handled by Oracle
client libraries and is often referred to as *defining* the fetch
type.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
```

#### <a name="propdblobprefetchsize"></a> 3.2.10 `oracledb.lobPrefetchSize`

```
Number lobPrefetchSize
```

This attribute is temporarily disabled.  Setting it has no effect.

Node-oracledb internally uses Oracle *LOB Locators* to manipulate long
object (LOB) data.  LOB Prefetching allows LOB data to be returned
early to node-oracledb when these locators are first returned.
This is similar to the way [row prefetching](#rowprefetching) allows
for efficient use of resources and [round-trips][124] between node-oracledb
and the database.

Prefetching of LOBs is mostly useful for small LOBs.

The default size is 16384.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.lobPrefetchSize = 16384;
```

#### <a name="propdbmaxrows"></a> 3.2.11 `oracledb.maxRows`

```
Number maxRows
```

The maximum number of rows that are fetched by a query with
[`connection.execute()`](#execute) when *not* using a
[ResultSet](#resultsetclass).  Rows beyond this limit are not fetched
from the database.  A value of 0 means there is no limit.

The default value is 0, meaning unlimited.

This property may be overridden in an [`execute()`](#executeoptions)
call.

To improve database efficiency, SQL queries should use a row limiting
clause like [`OFFSET` / `FETCH`](#pagingdata) or equivalent. The `maxRows`
property can be used to stop badly coded queries from returning
unexpectedly large numbers of rows.

When the number of query rows is relatively big, or can not be
predicted, it is recommended to use a [ResultSet](#resultsetclass) or
[`queryStream()`](#querystream).  This allows applications to process
rows in smaller chunks or individually, preventing the Node.js memory
limit being exceeded or query results being unexpectedly truncated by
a `maxRows` limit.

In version 1, the default value was 100.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.maxRows = 0;
```

#### <a name="propdboracleclientversion"></a> 3.2.12 `oracledb.oracleClientVersion`

```
readonly Number oracleClientVersion
```

This readonly property gives a numeric representation of the Oracle client library version which is useful in comparisons.
For version *a.b.c.d.e*, this property gives the number: `(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e`

This property was added in node-oracledb 1.3.

From node-oracledb 3.1.0, using `oracledb.oracleClientVersion` will
throw a *DPI-1047* error if node-oracledb cannot load Oracle Client
libraries.  Previous versions threw this error from
`require('oracledb')`.

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Oracle client library version number is " + oracledb.oracleClientVersion);
```

#### <a name="propdboracleclientversionstring"></a> 3.2.13 `oracledb.oracleClientVersionString`

```
readonly String oracleClientVersionString
```

This readonly property gives a string representation of the Oracle client library version which is useful for display.

This property was added in node-oracledb 2.2.

From node-oracledb 3.1.0, using `oracledb.oracleClientVersionString`
will throw a *DPI-1047* error if node-oracledb cannot load Oracle
Client libraries.  Previous versions threw this error from
`require('oracledb')`.

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Oracle client library version is " + oracledb.oracleClientVersionString);
```

#### <a name="propdboutformat"></a> 3.2.14 `oracledb.outFormat`

```
Number outFormat
```

The format of query rows fetched when
using [`connection.execute()`](#execute)
or [`connection.queryStream()`](#querystream).  It affects
both [ResultSet](#propexecresultset) and non-ResultSet queries.  It
can be used for top level queries and REF CURSOR output.

This can be either of
the [Oracledb constants](#oracledbconstantsoutformat) `oracledb.ARRAY` or
`oracledb.OBJECT`.  The default value is `oracledb.ARRAY` which is more efficient.

If specified as `oracledb.ARRAY`, each row is fetched as an array of column
values.

If specified as `oracledb.OBJECT`, each row is fetched as a JavaScript object.
The object has a property for each column name, with the property
value set to the respective column value.  The property name follows
Oracle's standard name-casing rules.  It will commonly be uppercase,
since most applications create tables using unquoted, case-insensitive
names.

This property may be overridden in
an [`execute()`](#executeoptions)
or [`queryStream()`](#querystream) call.

See [Query Output Formats](#queryoutputformats) for more information.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.ARRAY;
```

#### <a name="propdbpoolincrement"></a> 3.2.15 `oracledb.poolIncrement`

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

The default value is 1.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolIncrement = 1;
```

#### <a name="propdbpoolmax"></a> 3.2.16 `oracledb.poolMax`

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

The default value is 4.

This property may be overridden when [creating a connection pool](#createpool).

See [Connections and Number of Threads](#numberofthreads) for why you
should not increase this value beyond 128.  Importantly, if you
increase `poolMax` you should also increase the number of threads
available to node-oracledb.

See [Connection Pooling](#connpooling) for other pool sizing guidelines.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMax = 4;
```

#### <a name="propdbpoolmin"></a> 3.2.17 `oracledb.poolMin`

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

The default value is 0.

This property may be overridden when [creating a connection pool](#createpool).

For pools created with [External Authentication](#extauth) or with
[`homogeneous`](#createpoolpoolattrshomogeneous) set to *false*, the
number of connections initially created is zero even if a larger value
is specified for `poolMin`.  The pool increment is always 1,
regardless of the value of
[`poolIncrement`](#createpoolpoolattrspoolincrement).  Once the number
of open connections exceeds `poolMin` and connections are idle for
more than the [`poolTimeout`](#propdbpooltimeout) seconds, then the
number of open connections does not fall below `poolMin`.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolMin = 0;
```

#### <a name="propdbpoolpinginterval"></a> 3.2.18 `oracledb.poolPingInterval`

```
Number poolPingInterval
```

When a pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool for at least `poolPingInterval`
seconds, node-oracledb internally "pings" the database to check the
connection is alive.  After a ping, an unusable connection is
destroyed and a usable one is returned by `getConnection()`.
Connection pinging improves the chance a pooled connection is valid
when it is first used because identified unusable connections will not
be returned to the application.

The default `poolPingInterval` value is 60 seconds.  Possible values
are:

`poolPingInterval` Value     | Behavior of a Pool `getConnection()` Call
----------|------------------------------------------
`n` < `0` | Never checks for connection aliveness
`n` = `0` | Always checks for connection aliveness. This value is not recommended for most applications because of the overhead in performing each ping
`n` > `0` | Checks aliveness if the connection has been idle in the pool (not "checked out" to the application by `getConnection()`) for at least `n` seconds

This property may be overridden when [creating a connection pool](#createpool).

See [Connection Pool Pinging](#connpoolpinging) for more discussion.

This property was added in node-oracledb 1.12.  It was disabled when
using Oracle Client 12.2 (and later) until node-oracledb 3.0.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolPingInterval = 60;     // seconds
```

#### <a name="propdbpooltimeout"></a> 3.2.19 `oracledb.poolTimeout`

```
Number poolTimeout
```

The number of seconds after which idle connections (unused in the
pool) are terminated.  Idle connections are terminated only when the
pool is accessed.  If the `poolTimeout` is set to 0, then idle
connections are never terminated.

The default value is 60.

This property may be overridden when [creating a connection pool](#createpool).

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.poolTimeout = 60;
```

#### <a name="propdbprefetchrows"></a> 3.2.20 `oracledb.prefetchRows`

```
Number prefetchRows
```

This attribute is no longer used in node-oracledb version 2 and has no
effect on applications.  Use
[`oracledb.fetchArraySize`](#propdbfetcharraysize) instead.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.prefetchRows = 100;
```

#### <a name="propdbpromise"></a> 3.2.21 `oracledb.Promise`

```
Promise Promise
```

Node-oracledb supports Promises on all methods.  The standard Promise
library is used.

See [Promises and node-oracledb](#promiseoverview) for a discussion of
using Promises.

This property can be set to override or disable the Promise
implementation.

##### Example

```javascript
var mylib = require('myfavpromiseimplementation');
oracledb.Promise = mylib;
```

Promises can be completely disabled by setting

```javascript
oracledb.Promise = null;
```

#### <a name="propdbqueuerequests"></a> 3.2.22 `oracledb.queueRequests`

This property was removed in node-oracledb 3.0.  Queuing is now always
enabled.  See [Connection Pool Queue](#connpoolqueue) for more
information.

#### <a name="propdbqueuetimeout"></a> 3.2.23 `oracledb.queueTimeout`

```
Number queueTimeout
```

The number of milliseconds after which connection requests waiting in
the connection request queue are terminated.  If `queueTimeout` is
0, then queued connection requests are never terminated.

The default value is 60000.

This property may be overridden when [creating a connection pool](#createpool).

See [Connection Pool Queue](#connpoolqueue) for more information.

This property was added in node-oracledb 1.7.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.queueTimeout = 3000; // 3 seconds
```

#### <a name="propdbstmtcachesize"></a> 3.2.24 `oracledb.stmtCacheSize`

```
Number stmtCacheSize
```

The number of statements that are cached in the [statement cache](#stmtcache) of
each connection.

The default value is 30.

This property may be overridden for specific *Pool* or *Connection*
objects.

In general, set the statement cache to the size of the working set of
statements being executed by the application.  Statement caching can
be disabled by setting the size to 0.

See [Statement Caching](#stmtcache) for examples.

##### Example

```javascript
var oracledb = require('oracledb');
oracledb.stmtCacheSize = 30;
```

#### <a name="propdbversion"></a> 3.2.25 `oracledb.version`
```
readonly Number version
```

This readonly property gives a numeric representation of the node-oracledb version.
For version *x.y.z*, this property gives the number: `(10000 * x) + (100 * y) + z`

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Driver version number is " + oracledb.version);
```

#### <a name="propdbversionstring"></a> 3.2.26 `oracledb.versionString`
```
readonly String versionString
```

This readonly property gives a string representation of the node-oracledb version, including the version suffix if one is present.

This property was added in node-oracledb 2.1.

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Driver version is " + oracledb.versionString);
```

#### <a name="propdbversionsuffix"></a> 3.2.27 `oracledb.versionSuffix`
```
readonly String versionSuffix
```

This readonly property gives a string representing the version suffix (e.g. "-dev" or "-beta") or an empty string if no version suffix is present.

This property was added in node-oracledb 2.1.

##### Example

```javascript
var oracledb = require('oracledb');
console.log("Driver version suffix is " + oracledb.versionSuffix);
```

### <a name="oracledbmethods"></a> 3.3 Oracledb Methods

#### <a name="createpool"></a> 3.3.1 `oracledb.createPool()`

##### Prototype

Callback:
```
createPool(Object poolAttrs, function(Error error, Pool pool){});
```
Promise:
```
promise = createPool(Object poolAttrs);
```

##### Description

This method creates a pool of connections with the specified user
name, password and connection string.  A pool is typically created
once during application initialization.

Internally, `createPool()` creates an [Oracle Call Interface Session
Pool][6] for each Pool object.

The default properties may be overridden by specifying new properties
in the `poolAttrs` parameter.

It is possible to add pools to the pool cache when calling `createPool()`.
This allows pools to later be accessed by name, removing the need to
pass the pool object through code.
See [Connection Pool Cache](#connpoolcache) for more details.

A pool should be terminated with the [`pool.close()`](#poolclose)
call.

From node-oracledb 3.1.0, the `createPool()` error callback will
return a *DPI-1047* error if node-oracledb cannot load Oracle Client
libraries.  Previous versions threw this error from
`require('oracledb')`.

See [Connection Pooling](#connpooling) for more information about pooling.

###### <a name="createpoolpoolattrs"></a> 3.3.1.1 `createPool()`: Parameters and Attributes

```
Object poolAttrs
```

The `poolAttrs` parameter object provides connection credentials and
pool-specific configuration properties, such as the maximum or minimum
number of connections for the pool, or the statement cache size for
the connections.

The properties provided in the `poolAttrs` parameter override the
default pooling properties of the *Oracledb* object.  If an attribute
is not set, or is null, the value of the related *Oracledb* property
will be used.

Note that the `poolAttrs` parameter may have configuration
properties that are not used by the `createPool()` method.  These are
ignored.

The properties of `poolAttrs` are described below.

###### <a name="createpoolpoolattrsconnectstring"></a> 3.3.1.1.1 `connectString`, `connectionString`

```
String connectString
String connectionString
```

The two properties are aliases for each other.  Use only one of the properties.

The Oracle database instance used by connections in the pool.  The
string can be an Easy Connect string, or a Net Service Name from a
`tnsnames.ora` file, or the name of a local Oracle database instance.
See [Connection Strings](#connectionstrings) for examples.

The alias `connectionString` was added in node-oracledb 2.1.

###### <a name="createpoolpoolattrsedition"></a> 3.3.1.1.2 `edition`

```
String edition
```

Sets the name used for [Edition-Based Redefinition](#ebr) by
connections in the pool.

This optional property overrides the
[`oracledb.edition`](#propdbedition) property.

This property was added in node-oracledb 2.2.

###### <a name="createpoolpoolattrsevents"></a> 3.3.1.1.3 `events`

```
Boolean events
```

Indicate whether Oracle Call Interface events mode should be enabled for this pool.

This optional property overrides the
[`oracledb.events`](#propdbevents) property.

This property was added in node-oracledb 2.2.

###### <a name="createpoolpoolattrsexternalauth"></a> 3.3.1.1.4 `externalAuth`

```
Boolean externalAuth
```

Indicate whether pooled connections should be established using
[External Authentication](#extauth).

The default is *false*.

This optional property overrides the
[`oracledb.externalAuth`](#propdbisexternalauth) property.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

###### <a name="createpoolpoolattrshomogeneous"></a> 3.3.1.1.5 `homogeneous`

```
Boolean homogeneous
```

Indicate whether connections in the pool all have the same credentials
(a 'homogeneous' pool), or whether different credentials can be used
(a 'heterogeneous' pool).

The default is *true*.

When set to *false*, the user name and password can be omitted from
the `connection.createPool()` call, but will need to be given for
subsequent `pool.getConnection()` calls.  Different
`pool.getConnection()` calls can provide different user credentials.
Alternatively, when `homogeneous` is *false*, the user name (the
'proxy' user name) and password can be given, but subsequent
`pool.getConnection()` calls can specify a different user name to
access that user's schema.

Heterogeneous pools cannot be used with the [connection pool
cache](#connpoolcache).  Applications should ensure the pool object is
explicitly passed between code modules, or use a homogeneous pool and
make use of [`connection.clientId`](#propconnclientid).

See [Heterogeneous Connection Pools and Pool Proxy
Authentication](#connpoolproxy) for details and examples.

This property was added in node-oracledb 2.3.

###### <a name="createpoolpoolattrspassword"></a> 3.3.1.1.6 `password`

```
String password
```

The password of the database user used by connections in the pool.  A
password is also necessary if a proxy user is specified at pool creation.

If `homogeneous` is *false*, then the password may be omitted at pool
creation but given in subsequent `pool.getConnection()` calls.

###### <a name="createpoolpoolattrspoolalias"></a> 3.3.1.1.7 `poolAlias`

```
String poolAlias
```

The `poolAlias` is an optional property that is used to explicitly add pools to the
connection pool cache. If a pool alias is provided, then the new pool will be added
to the connection pool cache and the `poolAlias` value can then be used with methods
that utilize the connection pool cache, such as [`oracledb.getPool()`](#getpool) and
[`oracledb.getConnection()`](#getconnectiondb).

See [Connection Pool Cache](#connpoolcache) for details and examples.

This property was added in node-oracledb 1.11.

###### <a name="createpoolpoolattrspoolincrement"></a> 3.3.1.1.8 `poolIncrement`

```
Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

The default value is 1.

This optional property overrides the
[`oracledb.poolIncrement`](#propdbpoolincrement) property.

###### <a name="createpoolpoolattrspoolmax"></a> 3.3.1.1.9 `poolMax`

```
Number poolMax
```

The maximum number of connections to which a connection pool can grow.

The default value is 4.

This optional property overrides the
[`oracledb.poolMax`](#propdbpoolmax) property.

See [Connections and Number of Threads](#numberofthreads) for why you
should not increase this value beyond 128.  Importantly, if you
increase `poolMax` you should also increase the number of threads
available to node-oracledb.

See [Connection Pooling](#connpooling) for other pool sizing guidelines.

###### <a name="createpoolpoolattrspoolmin"></a> 3.3.1.1.10 `poolMin`

```
Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

The default value is 0.

This optional property overrides the
[`oracledb.poolMin`](#propdbpoolmin) property.

###### <a name="createpoolpoolattrspoolpinginterval"></a> 3.3.1.1.11 `poolPingInterval`

```
Number poolPingInterval
```

When a pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool for at least `poolPingInterval`
seconds, an internal "ping" will be performed first to check the
aliveness of the connection.

The default value is 60.

This optional property overrides the
[`oracledb.poolPingInterval`](#propdbpoolpinginterval) property.

See [Connection Pool Pinging](#connpoolpinging) for more discussion.

###### <a name="createpoolpoolattrspooltimeout"></a> 3.3.1.1.12 `poolTimeout`

```
Number poolTimeout
```

The number of seconds after which idle connections (unused in the
pool) may be terminated.  Idle connections are terminated only when
the pool is accessed.

The default value is 60.

This optional property overrides the
[`oracledb.poolTimeout`](#propdbpooltimeout) property.

###### <a name="createpoolpoolattrsqueuerequests"></a> 3.3.1.1.13 `queueRequests`

This property was removed in node-oracledb 3.0.  Queuing is now always
enabled.  See [Connection Pool Queue](#connpoolqueue) for more
information.

###### <a name="createpoolpoolattrsqueuetimeout"></a> 3.3.1.1.14 `queueTimeout`

```
Number queueTimeout
```

The number of milliseconds after which connection requests waiting in the
connection request queue are terminated.  If `queueTimeout` is
set to 0, then queued connection requests are never terminated.

The default value is 60000.

This optional property overrides the
[`oracledb.queueTimeout`](#propdbqueuetimeout) property.

###### <a name="createpoolpoolattrssessioncallback"></a> 3.3.1.1.15 `sessionCallback`

```
String sessionCallback | function sessionCallback(Connection connection, String requestedTag, function callback)
```

When `sessionCallback` is a Node.js function, it will be invoked for
each `pool.getConnection()` call that will return a newly created
connection in the pool.  It will also be called if
`pool.getConnection()` requests a connection from the pool with a
given [`tag`](#getconnectiondbattrstag), and that tag value does not
match the connection's current actual tag.  It will not be invoked for
other `getConnection()` calls.  The tag requested by
`pool.getConnection()` is passed as the `requestedTag` parameter and
the actual tag is available in [`connection.tag`](#propconntag).

The session callback is called before `getConnection()` returns so it
can be used to do logging or efficiently set session state such as
with ALTER SESSION statements.  Make sure any session state is set and
`connection.tag` is updated in the `sessionCallback` function prior to
it calling its own `callback` function otherwise the session will not
be correctly set when `getConnection()` returns.

When node-oracledb is using Oracle Client libraries 12.2 or later, the
tag must be a [multi-property tag][125] with name=value pairs like
"k1=v1;k2=v2".

When using Oracle Client libraries 12.2 or later, `sessionCallback`
can be a string containing the name of a PL/SQL procedure to be called
when `pool.getConnection()` requests a
[`tag`](#getconnectiondbattrstag), and that tag does not match the
connection's actual tag.  When the application uses [DRCP
connections](#drcp), a PL/SQL callback can avoid the [round-trip][124]
calls that a Node.js function would require to set session state.  For
non-DRCP connections, the PL/SQL callback will require a round-trip
from the application.

The PL/SQL procedure declaration is:

```sql
PROCEDURE mycallback (
  desired_props IN  VARCHAR2,
  actual_props  IN  VARCHAR2
);
```

See [Connection Tagging and Session State](#connpooltagging) for more
information.

This property was added in node-oracledb 3.1.

###### <a name="createpoolpoolattrsstmtcachesize"></a> 3.3.1.1.16 `stmtCacheSize`

```
Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection in the pool.

This optional property overrides the
[`oracledb.stmtCacheSize`](#propdbstmtcachesize) property.

###### <a name="createpoolpoolattrsuser"></a> 3.3.1.1.17 `user`

```
String user
```

The database user name for connections in the pool.  Can be a simple
user name or a proxy of the form *alison[fred]*. See the [Client
Access Through a Proxy][7] section in the Oracle Call Interface manual
for more details about proxy authentication.

If `homogeneous` is *false*, then the pool user name and password need
to be specified only if the application wants that user to proxy the
users supplied in subsequent `pool.getConnection()` calls.

#### <a name="createpoolpoolcallback"></a> 3.3.1.2 `createPool()`: Callback Function

##### Prototype

```
function(Error error [, Pool pool])
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createPool()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Pool pool*   | The newly created connection pool. If `createPool()` fails, `pool` will be NULL.  If the pool will be accessed via the [pool cache](#connpoolcache), this parameter can be omitted.  See [Pool class](#poolclass) for more information.

#### <a name="getconnectiondb"></a> 3.3.2 `oracledb.getConnection()`

##### Prototype

Callback:
```
getConnection([String poolAlias | Object connAttrs], function(Error error, Connection conn){});
```
Promise:
```
promise = getConnection([String poolAlias | Object connAttrs]);
```

##### Description

Obtains a connection from a pool in the [connection pool
cache](#connpoolcache) or creates a new, standalone, non-pooled
connection.

For situations where connections are used infrequently, creating a
standalone connection may be more efficient than creating and managing
a connection pool. However, in most cases, Oracle recommends getting
connections from a [connection pool](#createpool).

The following table shows the various signatures that can be used when invoking
`getConnection` and describes how the function will behave as a result.

Signature | Description
--------- | -----------
`oracledb.getConnection()` | Gets a connection from the previously created default pool.  Returns a promise.
`oracledb.getConnection(callback)` | Gets a connection from the previously created default pool.  Invokes the callback.
`oracledb.getConnection(poolAlias)` | Gets a connection from the previously created pool with the specified `poolAlias`.  Returns a promise.
`oracledb.getConnection(poolAlias, callback)` | Gets a connection from the previously created pool with the specified `poolAlias`.  Invokes the callback.
`oracledb.getConnection(connAttrs)` | Creates a standalone, non-pooled connection. Returns a promise.
`oracledb.getConnection(connAttrs, callback)` | Creates a standalone, non-pooled connection.  Invokes the callback.

Note if the application opens a number of connections, you should
increase the number of threads available to node-oracledb.
See [Connections and Number of Threads](#numberofthreads).

From node-oracledb 3.1.0, a non-pooled `oracledb.getConnection()` call
will return a *DPI-1047* error if node-oracledb cannot load Oracle
Client libraries.  Previous versions threw this error from
`require('oracledb')`.

See [Connection Handling](#connectionhandling) for more information on
connections.

##### <a name="getconnectiondbattrs"></a> 3.3.2.1 `getConnection()`: Parameters

###### <a name="getconnectionpoolalias"></a> 3.3.2.1.1 Pool Alias

```
String poolAlias
```

The `poolAlias` parameter specifies which previously created pool in
the [connection pool cache](#connpoolcache) to use to obtain the
connection.

###### <a name="getconnectiondbattrsconnattrs"></a> 3.3.2.1.2 `getConnection()`: Attributes

```
Object connAttrs
```

The `connAttrs` parameter object provides connection credentials and
connection-specific configuration properties.

Any `connAttrs` properties that are not used by the `getConnection()`
method are ignored.

The properties of the `connAttrs` object are described below.

###### <a name="getconnectiondbattrsconnectstring"></a> 3.3.2.1.2.1 `connectString`, `connectionString`

```
String connectString
String connectionString
```

The two properties are aliases for each other.  Use only one of the properties.

The Oracle database instance to connect to.  The string can be an Easy Connect string, or a
Net Service Name from a `tnsnames.ora` file, or the name of a local
Oracle database instance.  See
[Connection Strings](#connectionstrings) for examples.

The alias `connectionString` was added in node-oracledb 2.1.

###### <a name="getconnectiondbattrsedition"></a> 3.3.2.1.2.2 `edition`

```
String edition
```

Sets the name used for [Edition-Based Redefinition](#ebr) by this connection.

This optional property overrides the
[`oracledb.edition`](#propdbedition) property.

This property was added in node-oracledb 2.2.

###### <a name="getconnectiondbattrsevents"></a> 3.3.2.1.2.3 `events`

```
Boolean events
```

Determines if the standalone connection is created using Oracle Call Interface events mode.

This optional property overrides the
[`oracledb.events`](#propdbisevents) property.

This property was added in node-oracledb 2.2.

###### <a name="getconnectiondbattrsexternalauth"></a> 3.3.2.1.2.4 `externalAuth`

```
Boolean externalAuth
```

If this optional property is *true* then the connection will be
established using [External Authentication](#extauth).

This optional property overrides the
[`oracledb.externalAuth`](#propdbisexternalauth) property.

The `user` and `password` properties should not be set when
`externalAuth` is *true*.

Note prior to node-oracledb 0.5 this property was called
`isExternalAuth`.

###### <a name="getconnectiondbattrsmatchany"></a> 3.3.2.1.2.5 `matchAny`

```
Boolean matchAny
```

Used in conjunction with [`tag`](#getconnectiondbattrstag) when
getting a connection from a [connection pool](#poolclass).

Indicates that the tag in a connection returned from a connection pool
may not match the requested tag.

See [Connection Tagging and Session State](#connpooltagging).

This property was added in node-oracledb 3.1.

###### <a name="getconnectiondbattrsnewpassword"></a> 3.3.2.1.2.6 `newPassword`

```
String newPassword
```

The new password to use for the database user.  When using
`newPassword`, the [`password`](#getconnectiondbattrspassword)
property should be set to the current password.

This allows passwords to be changed at the time of connection, in
particular it can be used to connect when the old password has
expired.

See [Changing Passwords and Connecting with an Expired Password](#changingpassword).

This property was added in node-oracledb 2.2.

###### <a name="getconnectiondbattrspoolalias"></a> 3.3.2.1.2.7 `poolAlias`

```
String poolAlias
```

Specifies which previously created pool in the [connection pool
cache](#connpoolcache) to obtain the connection from.  See [Pool
Alias](#getconnectionpoolalias).

###### <a name="getconnectiondbattrspassword"></a> 3.3.2.1.2.8 `password`

```
String password
```

The password of the database user. A password is also necessary if a
proxy user is specified.

###### <a name="getconnectiondbattrsprivilege"></a> 3.3.2.1.2.9 `privilege`

```
Number privilege
```

The privilege to use when establishing connection to the database. This
optional property should be one of the
[privileged connection constants](#oracledbconstantsprivilege).

See [Privileged Connections](#privconn) for more information.

Note only non-pooled connections can be privileged.

This property was added in node-oracledb 2.1.

###### <a name="getconnectiondbattrsstmtcachesize"></a> 3.3.2.1.2.10 `stmtCacheSize`

```
Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.  This optional
property may be used to override the
[`oracledb.stmtCacheSize`](#propdbstmtcachesize) property.

###### <a name="getconnectiondbattrstag"></a> 3.3.2.1.2.11 `tag`

```
String tag
```

Used when getting a connection from a [connection pool](#poolclass).

Indicates the tag that a connection returned from a connection pool
should have.  Various heuristics determine the tag that is actually
returned, see [Connection Tagging and Session
State](#connpooltagging).

This property was added in node-oracledb 3.1.

###### <a name="getconnectiondbattrsuser"></a> 3.3.2.1.2.12 `user`

```
String user
```

The database user name.  Can be a simple user name or a proxy of the
form *alison[fred]*. See the [Client Access Through a Proxy][7]
section in the Oracle Call Interface manual for more details about
proxy authentication.

##### <a name="getconnectiondbcallback"></a> 3.3.2.2 `getConnection()`: Callback Function

##### Prototype

```
function(Error error, Connection conn)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getConnection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Connection connection* | The newly created connection.  If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

#### <a name="getpool"></a> 3.3.3 `oracledb.getPool()`

##### Prototype

```
getPool([String poolAlias]);
```

##### Description

Retrieves a previously created pool from the [connection pool
cache](#connpoolcache). Note that this is a synchronous method.

##### <a name="getpoolattrs"></a> 3.3.3.1 Parameters

###### <a name="getpoolattrsalias"></a> 3.3.3.1.1 `alias`

```
String poolAlias
```

The pool alias of the pool to retrieve from the connection pool cache. The default
value is 'default' which will retrieve the default pool from the cache.

## <a name="connectionclass"></a> 4. Connection Class

A *Connection* object is obtained by a *Pool* class
[`getConnection()`](#getconnectionpool) or
*Oracledb* class [`getConnection()`](#getconnectiondb)
call.

The connection is used to access an Oracle database.

### <a name="connectionproperties"></a> 4.1 Connection Properties

The properties of a *Connection* object are listed below.

#### <a name="propconnaction"></a> 4.1.1 `connection.action`

```
writeonly String action
```

The [action][9] attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconncalltimeout"></a> 4.1.2 `connection.callTimeout`

```
Number callTimeout
```

Sets the maximum number of milliseconds that each underlying
[round-trip][124] between node-oracledb and Oracle Database may take.
Each node-oracledb method or operation may make zero or more
round-trips.  The `callTimeout` value applies to each round-trip
individually, not to the sum of all round-trips.  Time spent
processing in node-oracledb before or after the completion of each
round-trip is not counted.

See [Database Call Timeouts](#dbcalltimeouts) for more information.

This property was added in node-oracledb 3.0.  An exception will occur
if node-oracledb is not using Oracle client library version 18.1 or
later.

#### <a name="propconnclientid"></a> 4.1.3 `connection.clientId`

```
writeonly String clientId
```

The [client identifier][10] for end-to-end application tracing, use
with mid-tier authentication, and with [Virtual Private
Databases][11].

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnmodule"></a> 4.1.4 `connection.module`

```
writeonly String module
```

The [module][9] attribute for end-to-end application tracing.

This is a write-only property.  Displaying a Connection object will
show a value of `null` for this attribute.  See
[End-to-end Tracing, Mid-tier Authentication, and Auditing](#endtoend).

#### <a name="propconnoracleserverversion"></a> 4.1.5 `connection.oracleServerVersion`

```
readonly Number oracleServerVersion
```

This readonly property gives a numeric representation of the Oracle database version which is useful in comparisons.
For version *a.b.c.d.e*, this property gives the number: `(100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e`

Note if you connect to Oracle Database 18, the version will only be
accurate if node-oracledb is also using Oracle Database 18 client
libraries.  Otherwise it will show the base release such as 1800000000
instead of 1803000000.

This property was added in node-oracledb 1.3.

#### <a name="propconnoracleserverversionstring"></a> 4.1.6 `connection.oracleServerVersionString`

```
readonly String oracleServerVersionString
```

This readonly property gives a string representation of the Oracle database version which is useful for display.

Note if you connect to Oracle Database 18, the version will only be
accurate if node-oracledb is also using Oracle Database 18 client
libraries.  Otherwise it will show the base release such as
"18.0.0.0.0" instead of "18.3.0.0.0".

This property was added in node-oracledb 2.2.

#### <a name="propconnstmtcachesize"></a> 4.1.7 `connection.stmtCacheSize`

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of the connection.  The default value is
the `stmtCacheSize` property in effect in the *Pool* object when the
connection is created in the pool.

#### <a name="propconntag"></a> 4.1.8 `connection.tag`

```
String tag
```

Applications can set the tag property on pooled connections to
indicate the 'session state' that a connection has.  The tag will be
retained when the connection is released to the pool.  A subsequent
`pool.getConnection()` can request a connection that has a given
[`tag`](#getconnectiondbattrstag).  It is up to the application to set
any desired session state and set `connection.tag` prior to closing
the connection.

The tag property is not used for standalone connections.

When node-oracledb is using Oracle Client libraries 12.2 or later, the
tag must be a [multi-property tag][125] with name=value pairs like
"k1=v1;k2=v2".

An empty string represents not having a tag set.

See [Connection Tagging and Session State](#connpooltagging).

This property was added in node-oracledb 3.1.

##### Getting the tag

After a `pool.getConnection()` requests a [tagged
connection](#getconnectiondbattrstag):

- When no [`sessionCallback`](#createpoolpoolattrssessioncallback) is
  in use, then `connection.tag` will contain the actual tag of the
  connection.

- When a Node.js `sessionCallback` function is used, then
  `connection.tag` will be set to the value of the connection's actual
  tag prior to invoking the callback.  The callback can then set
  connection state and alter `connection.tag`, as desired, before the
  connection is returned from `pool.getConnection()`.

- When a PL/SQL `sessionCallback` procedure is used, then after
  `pool.getConnection()` returns, `connection.tag` contains a tag with
  the same property values as the tag that was requested.  The
  properties may be in a different order.  If `matchAnyTag` is *true*,
  then `connection.tag` may contain other properties in addition to
  the requested properties.  Code after each `pool.getConnection()`
  call mirroring the PL/SQL code may be needed so `connection.tag` can
  be set to a value representing the session state changed in the
  PL/SQL procedure.

##### Setting the tag

A tag can be set anytime prior to closing the connection.  If a
Node.js `sessionCallback` function is being used, the best practice
recommendation is to set the tag in the callback function.

To clear a connection's tag, set `connection.tag = ""`.

### <a name="connectionmethods"></a> 4.2 Connection Methods

#### <a name="break"></a> 4.2.1 `connection.break()`

##### Prototype

Callback:
```
break(function(Error error){});
```
Promise:
```
promise = break();
```

##### Description

This call stops the currently running operation on the connection.

If there is no operation in progress or the operation has completed by
the time the break is issued, the `break()` is effectively a no-op.

If the running asynchronous operation is interrupted, its callback
will return an error.

In network configurations that drop (or in-line) out-of-band breaks,
`break()` may hang unless you have [`DISABLE_OOB=ON`][122] in a
`sqlnet.ora` file, see [Optional Client Configuration
Files](#tnsadmin).

If you use use `break()` with [DRCP connections](#drcp), it is
currently recommended to drop the connection when releasing it back to
the pool: `await connection.close({drop: true})`.  See Oracle bug
29116892.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `break()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="changepassword"></a> 4.2.2 `connection.changePassword()`

##### Prototype

Callback:
```
changePassword(String user, String oldPassword, String newPassword, function(Error error){});
```
Promise:
```
promise = changePassword(String user, String oldPassword, String newPassword);
```

##### Description

Changes the password of the specified user.

Only users with the ALTER USER privilege can change passwords of other
users.

See [Changing Passwords and Connecting with an Expired Password](#changingpassword).

This method was added in node-oracledb 2.2.

##### Parameters

-   ```
    String user
    ```

    The name of the user whose password is to be changed.

-   ```
    String oldPassword
    ```

    The current password of the currently connected user.

    If `changePassword()` is being used by a DBA to change the password of
    another user, the value of `oldPassword` is ignored and can be an
    empty string.

-   ```
    String newPassword
    ```

    The new password of the user whose password is to be changed.

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `changePassword()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="connectionclose"></a> 4.2.3 `connection.close()`

##### Prototype

Callback:
```
close([Object options, ] function(Error error){});
```
Promise:
```
promise = close([Object options]);
```

##### Description

Releases a connection.

Calling `close()` as soon as a connection is no longer required is
strongly encouraged for system efficiency.  Calling `close()` for
pooled connections is required to prevent the pool running out of
connections.

When a connection is released, any ongoing transaction on the
connection is rolled back.

If an error occurs on a pooled connection and that error is known to
make the connection unusable, then `close()` will drop that connection
from the connection pool so a future pooled `getConnection()` call
that grows the pool will create a new, valid connection.

This method was added to node-oracledb 1.9, replacing the equivalent
alias `connection.release()`.

##### Parameters

-   ```
    Object options
    ```

    This parameter only affects pooled connections.

    The only valid option attribute is `drop`.

    For pooled connections, if `drop` is *false*, then the
    connection is returned to the pool for reuse.  If `drop` is *true*,
    the connection will be completely dropped from the connection pool, for example:

    ```javascript
    await connection.close({drop: true});
    ```

    The default is *false*.

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

####  <a name="commit"></a> 4.2.4 `connection.commit()`

##### Prototype

Callback:
```
commit(function(Error error){});
```
Promise:
```
promise = commit();
```

##### Description

This call commits the current transaction in progress on the connection.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `commit()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="connectioncreatelob"></a> 4.2.5 `connection.createLob()`

##### Prototype

Callback:
```
createLob(Number type, function(Error error, Lob lob){});
```
Promise:
```
promise = createLob(Number type);
```

##### Description

Creates a [Lob](#lobclass) as an Oracle [temporary LOB][12].  The LOB
is initially empty.  Data can be streamed to the LOB, which can then
be passed into PL/SQL blocks, or inserted into the database.

When no longer required, Lobs created with `createLob()` should be
closed with [`lob.close()`](#lobclose) because Oracle Database
resources are held open if temporary LOBs are not closed.

Open temporary LOB usage can be monitored using the view
[`V$TEMPORARY_LOBS`][13].

LOBs created with `createLob()` can be bound for IN, IN OUT and OUT
binds.

See [Working with CLOB and BLOB Data](#lobhandling) and [LOB Bind Parameters](#lobbinds) for more information.

##### Parameters

-   ```
    Number type
    ```

    One of the constants [`oracledb.CLOB`](#oracledbconstantsnodbtype)
    or [`oracledb.BLOB`](#oracledbconstantsnodbtype).

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `createLob()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).


#### <a name="execute"></a> 4.2.6 `connection.execute()`

##### Prototype

Callback:
```
execute(String sql, [Object bindParams, [Object options,]] function(Error error, [Object result]){});
```
Promise:
```
promise = execute(String sql, [Object bindParams, [Object options]]);
```

##### Description

This call executes a single SQL or PL/SQL statement.
See [SQL Execution](#sqlexecution) for examples.  Also
see [`queryStream()`](#querystream) for an alternative way of executing
queries.

The statement to be executed may contain [IN binds](#inbind),
[OUT or IN OUT](#outbind) bind values or variables, which are bound
using either an object or an array.

A callback function returns a [`result`](#executecallback) object,
containing any fetched rows, the values of any OUT and IN OUT bind
variables, and the number of rows affected by the execution of
[DML][14] statements.

##### Parameters


Parameter | Description
----------|------------
[`String sql`](#executesqlparam) | The SQL statement that is executed. The statement may contain bind parameters.
[`Object bindParams`](#executebindParams) | This function parameter is needed if there are bind parameters in the SQL statement.
[`Object options`](#executeoptions) | This is an optional parameter to `execute()` that may be used to control statement execution.
[`function(Error error, [Object result])`](#executecallback) | Callback function with the execution results.

The parameters are discussed in the next sections.

##### <a name="executesqlparam"></a> 4.2.6.1 `execute()`: SQL Statement

```
String sql
```

The SQL or PL/SQL statement that `execute()` executes. The statement
may contain bind variables.

##### <a name="executebindParams"></a> 4.2.6.2 `execute()`: Bind Parameters

```
Object bindParams
```

The `execute()` function `bindParams` parameter is needed if there are
bind variables in the statement, or if [`options`](#executeoptions)
are used.  It can be either an object that associates values or
JavaScript variables to the statement's bind variables by name, or an
array of values or JavaScript variables that associate to the
statement's bind variables by their relative positions.
See [Bind Parameters for Prepared Statements](#bind) for more details
on binding.

If a bind value is an object it may have the following properties:

Bind Property | Description
---------------|------------
`dir` | The direction of the bind.  One of the [Execute Bind Direction Constants](#oracledbconstantsbinddir) `oracledb.BIND_IN`, `oracledb.BIND_INOUT`, or `oracledb.BIND_OUT`. The default is `oracledb.BIND_IN`.
`maxArraySize` | The number of array elements to be allocated for a PL/SQL Collection INDEX BY associative array OUT or IN OUT array bind variable.  For IN binds, the value of `maxArraySize` is ignored.  See [PL/SQL Collection Associative Array (Index-by) Bind Parameters](#plsqlindexbybinds).
`maxSize` | The maximum number of bytes that an OUT or IN OUT bind variable of type `oracledb.STRING` or `oracledb.BUFFER` can use to get data. The default value is 200. The maximum limit depends on the database type, see below.  When binding IN OUT, then `maxSize` refers to the size of the returned  value: the input value can be smaller or bigger.  For IN binds, `maxSize` is ignored.
`type` | The node-oracledb or JavaScript data type to be bound.  One of the [Node-oracledb Type Constants](#oracledbconstantsnodbtype) `oracledb.BLOB`, `oracledb.BUFFER`, `oracledb.CLOB`, `oracledb.CURSOR`, `oracledb.DATE`, `oracledb.NUMBER`, or `oracledb.STRING`.  With IN or IN OUT binds the type can be explicitly set with `type` or it will default to the type of the input data value.  With OUT binds, the type defaults to `oracledb.STRING` whenever `type` is not specified.
`val` | The input value or variable to be used for an IN or IN OUT bind variable.

The limit for `maxSize` when binding as `oracledb.BUFFER` is 2000
bytes, and as `oracledb.STRING` is 4000 bytes unless you are using
Oracle Database 12 or later, and the database initialization parameter
`MAX_STRING_SIZE` has a value of `EXTENDED`.  In this case the limit
is 32767 bytes.

When binding Oracle LOBs as `oracledb.STRING` or `oracledb.BUFFER`,
the value of `maxSize` can be much larger, see the limits
in [LOB Bind Parameters](#lobbinds).

When binding to get a UROWID value from the database, note that
UROWIDs can take up to 5267 bytes when fetched from the database so
`maxSize` should be set to at least this value.

Note `oracledb.CURSOR` bind variables can be used only for PL/SQL OUT binds.

##### <a name="executeoptions"></a> 4.2.6.3 `execute()`: Options

```
Object options
```

This is an optional parameter to `execute()` that may be used to
control statement execution.

If there are no bind variables in the SQL statement, then a null
`bindParams`, for example `{}`, must be specified before `options`
otherwise you will get an error like *ORA-01036: Illegal variable
name/number* or *NJS-012: encountered invalid bind data type in parameter*.

The following properties can be set or overridden for the execution of
a statement.

###### <a name="propexecautocommit"></a> 4.2.6.3.1 `autoCommit`

```
Boolean autoCommit
```

Overrides [`oracledb.autoCommit`](#propdbisautocommit).

###### <a name="propexecextendedmetadata"></a> 4.2.6.3.2 `extendedMetaData`

```
Boolean extendedMetaData
```

Overrides [`oracledb.extendedMetaData`](#propdbextendedmetadata).

###### <a name="propexecfetcharraysize"></a> 4.2.6.3.3 `fetchArraySize`

```
Number fetchArraySize
```

Overrides [`oracledb.fetchArraySize`](#propdbfetcharraysize).

###### <a name="propfetchinfo"></a> <a name="propexecfetchinfo"></a> 4.2.6.3.4 `fetchInfo`

```
Object fetchInfo
```

Object defining how query column data should be represented in
JavaScript.  It can be used in conjunction with, or instead of, the
global settings [`fetchAsString`](#propdbfetchasstring)
and [`fetchAsBuffer`](#propdbfetchasbuffer).

For example:

```
fetchInfo: {
  "HIRE_DATE":    { type: oracledb.STRING },  // return the date as a string
  "HIRE_DETAILS": { type: oracledb.DEFAULT }  // override fetchAsString or fetchAsBuffer
}
```

Each column is specified by name, using Oracle's standard naming
convention.

The `type` property can be set to one of:

- [`oracledb.STRING`](#oracledbconstantsnodbtype) for number, date and
  raw columns in a query to indicate they should be returned as
  Strings instead of their native format.  CLOB column data can also
  be returned as Strings instead of [Lob](#lobclass) instances.

  Raw columns returned as strings will be returned as hex-encoded
  strings.  The maximum length of a string created by type mapping
  number and date columns is 200 bytes.  If a database column that is
  already being fetched as type `oracledb.STRING` is specified in
  `fetchInfo`, then the actual database metadata will be used to
  determine the maximum length.

- [`oracledb.BUFFER`](#oracledbconstantsnodbtype) for a BLOB column,
  each BLOB item will be returned as a Buffer instead of a
  [Lob](#lobclass) instance.

- [`oracledb.DEFAULT`](#oracledbconstantsnodbtype) overrides any
  global mapping given by [`fetchAsString`](#propdbfetchasstring) or
  [`fetchAsBuffer`](#propdbfetchasbuffer).  The column data is
  returned in native format.

Strings and Buffers created for LOB columns will generally be limited
by Node.js and V8 memory restrictions.

Columns fetched from REF CURSORS are not mapped by `fetchInfo`
settings in the `execute()` call.  Use the
global [`fetchAsString`](#propdbfetchasstring)
or [`fetchAsBuffer`](#propdbfetchasbuffer) settings instead.

See [Query Result Type Mapping](#typemap) for more information on query type
mapping.

###### <a name="propexecmaxrows"></a> 4.2.6.3.5 `maxRows`

```
Number maxRows
```

Overrides [`oracledb.maxRows`](#propdbmaxrows).

###### <a name="propexecoutformat"></a> 4.2.6.3.6 `outFormat`

```
Number outFormat
```

Overrides [`oracledb.outFormat`](#propdboutformat).

###### <a name="propexecprefetchrows"></a> 4.2.6.3.7 `prefetchRows`

```
Number prefetchRows
```

This attribute is no longer supported in node-oracledb version 2 and
has no effect on applications.  Use
[`fetchArraySize`](#propexecfetcharraysize) instead.

###### <a name="propexecresultset"></a> 4.2.6.3.8 `resultSet`

```
Boolean resultSet
```

Determines whether query results should be returned as a
[ResultSet](#resultsetclass) object or directly.  The default is
*false*.

##### <a name="executecallback"></a> 4.2.6.4 `execute()`: Callback Function

```
function(Error error, [Object result])
```

The parameters of the `execute()` callback function are:

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `execute()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
*Object result* | The [`result`](#resultobject) object, described below.  The `result` parameter can be omitted for [DDL][15] and [DML][14] statements where the application only checks `error` for success or failure.

##### <a name="resultobject"></a> Result Object Properties

The properties of `result` object from the `execute()` callback are described below.

###### <a name="execmetadata"></a> 4.2.6.4.1 `metaData`

```
readonly Array metaData
```

For `SELECT` statements, this contains an array of objects describing
details of columns for the select list.  For non queries, this property is undefined.

Each column's `name` is always given.  If the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `execute()` option
[`extendedMetaData`](#propexecextendedmetadata) are *true* then
additional information is included.

- `name`: The column name follows Oracle's standard name-casing rules.  It will commonly be uppercase, since most applications create tables using unquoted, case-insensitive names.
- `fetchType`: one of the [Node-oracledb Type Constant](#oracledbconstantsnodbtype) values.
- `dbType`: one of the [Oracle Database Type Constant](#oracledbconstantsdbtype) values.
- `byteSize`: the database byte size.  This is only set for `oracledb.DB_TYPE_VARCHAR`, `oracledb.DB_TYPE_CHAR` and `oracledb.DB_TYPE_RAW` column types.
- `precision`: set only for `oracledb.DB_TYPE_NUMBER`, `oracledb.DB_TYPE_TIMESTAMP`, `oracledb.DB_TYPE_TIMESTAMP_TZ` and `oracledb.DB_TYPE_TIMESTAMP_LTZ` columns.
- `scale`: set only for `oracledb.DB_TYPE_NUMBER` columns.
- `nullable`: indicates whether `NULL` values are permitted for this column.

For numeric columns: when `precision` is `0`, then the column is
simply a NUMBER.  If `precision` is nonzero and `scale` is `-127`,
then the column is a FLOAT.  Otherwise, it is a NUMBER(precision,
scale).

Metadata for ResultSets and REF CURSORS is available in a
[ResultSet property](#rsmetadata).  For Lobs, a
[Lob type property](#proplobtype) also indicates whether the object is
a BLOB or CLOB.

To get query metadata without fetching rows, use a
[ResultSet](#resultsetclass).  Access
[`resultset.metaData`](#rsmetadata) and then close the ResultSet.  Do
not call `getRow()` or `getRows()`.  Preferably use a query clause
such as `WHERE 1 = 0` so the database does minimal work.

See [Query Column Metadata](#querymeta) for examples.

###### <a name="execoutbinds"></a> 4.2.6.4.2 `outBinds`

```
Array/object outBinds
```

This contains the output values of OUT and IN OUT binds.
If [`bindParams`](#executebindParams) is passed as an array, then
`outBinds` is returned as an array.  If `bindParams` is passed as an
object, then `outBinds` is returned as an object. If there are no OUT
or IN OUT binds, the value is undefined.

###### <a name="execresultset"></a> 4.2.6.4.3 `resultSet`

```
Object resultSet
```

For `SELECT` statements when the [`resultSet`](#executeoptions) option
is *true*, use the `resultSet` object to fetch rows.
See [ResultSet Class](#resultsetclass)
and [Fetching Rows with Result Sets](#resultsethandling).

When using this option, [`resultSet.close()`](#close) must be called
when the ResultSet is no longer needed.  This is true whether or not
rows have been fetched from the ResultSet.

###### <a name="execrows"></a> 4.2.6.4.4 `rows`

```
Array rows
```

For `SELECT` statements using [direct fetches](#fetchingrows), `rows`
contains an array of fetched rows.  It will be NULL if there is an
error or the SQL statement was not a SELECT statement.  By default,
the rows are in an array of column value arrays, but this can be
changed to arrays of objects by setting
[`outFormat`](#propdboutformat) to `oracledb.OBJECT`.  If a single row
is fetched, then `rows` is an array that contains one single row.

The number of rows returned is limited by
[`oracledb.maxRows`](#propdbmaxrows) or the
[`maxRows`](#propexecmaxrows) option in an `execute()` call.  If
`maxRows` is 0, then the number of rows is limited by Node.js memory
constraints.

###### <a name="execrowsaffected"></a> 4.2.6.4.5 `rowsAffected`

```
Number rowsAffected
```

For [DML][14] statements (including SELECT FOR UPDATE) this contains
the number of rows affected, for example the number of rows
inserted. For non-DML statements such as queries and PL/SQL statements,
`rowsAffected` is undefined.

#### <a name="executemany"></a> 4.2.7 `connection.executeMany()`

##### Prototype

Callback:
```
executeMany(String sql, Array binds, [Object options], function(Error error, [Object result]) {});
executeMany(String sql, Number numIterations, [Object options], function(Error error, [Object result]) {});
```
Promise:
```
promise = executeMany(String sql, Array binds, [Object options]);
promise = executeMany(String sql, Number numIterations, [Object options]);
```

##### Description

This method allows sets of data values to be bound to one DML or
PL/SQL statement for execution.  It is like calling
[`connection.execute()`](#execute) multiple times but requires fewer
[round-trips][124].  This is an efficient way to handle batch changes, for
example when inserting or updating multiple rows.  The method cannot
be used for queries.

The `executeMany()` method supports IN, IN OUT and OUT binds for most
data types except [PL/SQL Collection Associative
Arrays](#plsqlindexbybinds).

The version of this function which accepts a number of iterations should be
used when no bind parameters are required or when all bind parameters are OUT
binds.

See [Batch Statement Execution](#batchexecution) for more information.

This method was added in node-oracledb 2.2.

##### <a name="executemanysqlparam"></a> 4.2.6.1 `executeMany()`: SQL Statement

```
String sql
```

The SQL or PL/SQL statement that `executeMany()` executes.  The
statement should contain bind variable names.

##### <a name="executemanybinds"></a> 4.2.7.2 `executeMany()`: Binds

The `binds` parameter contains the values or variables to be bound to
the executed statement.  It must be an array of arrays (for 'bind by
position') or an array of objects whose keys match the bind variable
names in the SQL statement (for 'bind by name').  Each sub-array or
sub-object should contain values for the bind variables used in the
SQL statement.  At least one such record must be specified.

If a record contains fewer values than expected, NULL values will be
used.  For bind by position, empty values can be specified using
syntax like `[a,,c,d]`.

By default, the direction of binds is `oracledb.BIND_IN`.  The first
data record determines the number of bind variables, each bind
variable's data type, and its name (when binding by name).  If a
variable in the first record contains a null, this value is ignored
and a subsequent record is used to determine that variable's
characteristics.  If all values in all records for a particular bind
variable are null, the type of that bind is `oracledb.STRING` with a
maximum size of 1.

The maximum sizes of strings and buffers are determined by scanning
all records in the bind data.

If a [`bindDefs`](#executemanyoptbinddefs) property is used, no data
scanning occurs.  This property explicitly specifies the
characteristics of each bind variable.

##### <a name="executemanyoptions"></a> 4.2.7.3 `executeMany()`: Options

The `options` parameter is optional.  It can contain the following
properties.

###### <a name="executemanyoptautocommit"></a> 4.2.7.3.1 `autoCommit`

```
Boolean autoCommit
```

This optional property overrides
[`oracledb.autoCommit`](#propdbisautocommit).

Note [`batchErrors`](#executemanyoptbatcherrors) can affect autocommit
mode.

###### <a name="executemanyoptbatcherrors"></a> 4.2.7.3.2 `batchErrors`

```
Boolean batchErrors
```

This optional property allows invalid data records to be rejected
while still letting valid data be processed.  It can only be set
*true* for INSERT, UPDATE, DELETE or MERGE statements.

When *false*, the `executeMany()` call will stop when the first error
occurs.  The callback [error object](#errorobj) will be set.

When `batchErrors` is *true*, processing will continue even if there
are data errors.  The `executeMany()` callback error parameter is not
set.  Instead, an array containing an error per input data record will
be returned in the callback `result` parameter.  All valid data
records will be processed and a transaction will be started but not
committed, even if `autoCommit` is *true*.  The application can
examine the errors, take action, and explicitly commit or rollback as
desired.

Note that some classes of error will always return via the
`executeMany()` callback error object, not as batch errors.  No
transaction is created in this case.

The default value is *false*.

###### <a name="executemanyoptbinddefs"></a> 4.2.7.3.3 `bindDefs`

```
Object bindDefs
```

The `bindDefs` object defines the bind variable types, sizes and
directions.  This object is optional in some cases but it is more
efficient to set it.

It should be an array or an object, depending on the structure of the
[`binds parameter`](#executemanybinds).

Each value in the `bindDefs` array or object should be an object
containing the keys `dir`, `maxSize`, and `type` for each bind
variable, similar to how [`execute() bind
parameters`](#executebindParams) are identified.

BindDef Property | Description
---------------|------------
`dir` | The direction of the bind.  One of the [Execute Bind Direction Constants](#oracledbconstantsbinddir) `oracledb.BIND_IN`, `oracledb.BIND_INOUT`  or `oracledb.BIND_OUT`.  The default is `oracledb.BIND_IN`.
`maxSize` | Required for Strings and Buffers.  Ignored for other types.  Specifies the maximum number of bytes allocated when processing each value of this bind variable.  When data is being passed into the database, `maxSize` should be at least the size of the longest value.  When data is being returned from the database, `maxSize` should be the size of the longest value.  If `maxSize` is too small, `executeMany()` will throw an error that is not handled by [`batchErrors`](#executemanyoptbatcherrors).
`type` | The node-oracledb or JavaScript data type to be bound.  One of the [Node-oracledb Type Constants](#oracledbconstantsnodbtype) `oracledb.BLOB`, `oracledb.BUFFER`, `oracledb.CLOB`, `oracledb.CURSOR`, `oracledb.DATE`, `oracledb.NUMBER`, or `oracledb.STRING`.

###### <a name="executemanyoptdmlrowcounts"></a> 4.2.7.3.4 `dmlRowCounts`

```
Boolean dmlRowCounts
```

When *true*, this optional property enables output of the number of
rows affected by each input data record.  It can only be set *true*
for INSERT, UPDATE, DELETE or MERGE statements.

The default value is *false*.

This feature works when node-oracledb is using version 12, or later,
of the Oracle client library.

##### <a name="executemanycallback"></a> 4.2.7.4 `executeMany()`: Callback Function

```
function(Error error, [Object result])
```

If `executeMany()` succeeds, `error` is NULL.  If an error occurs,
then `error` contains the error message.

The `result` object may contain:

###### <a name="execmanybatcherrors"></a> 4.2.7.4.1 `result.batchErrors`

```
Array batchErrors
```

This property is an array of [error objects](#errorobj) that were
reported during execution.  The `offset` property of each error object
corresponds to the 0-based index of the `executeMany()` [binds
parameter](#executemanybinds) array, indicating which record could not
be processed.

It will be present only if [`batchErrors`](#executemanyoptbatcherrors)
was *true* in the [`executeMany()` options](#executemanyoptions)
parameter and there are data errors to report.  Some classes of
execution error will always return via the `executeMany()` callback
error object, not in `batchErrors`.

###### <a name="execmanydmlrowscounts"></a> 4.2.7.4.2 `result.dmlRowCounts`

```
Array dmlRowCounts
```

This is an array of integers identifying the number of rows affected
by each record of the [binds parameter](#executemanybinds). It is
present only if [`dmlRowCounts`](#executemanyoptdmlrowcounts) was
*true* in the [`executeMany()` options](#executemanyoptions) parameter
and a DML statement was executed.

###### <a name="execmanyoutbinds"></a> 4.2.7.4.3 `result.outBinds`

```
Object outBinds
```

This contains the value of any returned IN OUT or OUT binds.  It is an
array of arrays, or an array of objects, depending on the [`binds
parameters`](#executemanybinds) structure.  The length of the array
will correspond to the length of the array passed as the [binds
parameter](#executemanybinds).  It will be present only if there is at
least one OUT bind variable identified.

###### <a name="execmanyrowsaffected"></a> 4.2.7.4.4 `result.rowsAffected`

```
Number rowsAffected
```

This is an integer identifying the total number of database rows
affected by the processing of all records of the [binds
parameter](#executemanybinds).  It is only present if a DML statement
was executed.

#### <a name="getsodadatabase"></a> 4.2.8 `connection.getSodaDatabase()`

##### Prototype

```
getSodaDatabase();
```

##### Return Value

This synchronous method returns a [SodaDatabase](#sodadatabaseclass).

##### Description

Returns a parent SodaDatabase object for use with Simple Oracle
Document Access (SODA).

SODA support in node-oracledb is in Preview status and should not be
used in production.  It will be supported with a future version of
Oracle Client libraries.

See [Simple Oracle Document Access (SODA)](#sodaoverview) for more
information about using SODA in node-oracledb.

This method was added in node-oracledb 3.0.

#### <a name="getstmtinfo"></a> 4.2.9 `connection.getStatementInfo()`

##### Prototype

Callback:
```
getStatementInfo(String sql, function(Error error, [Object information]){});
```
Promise:
```
promise = getStatementInfo(String sql);
```

##### Description

Parses a SQL statement and returns information about it.  This is most
useful for finding column names of queries, and for finding the names
of bind variables used.

This method performs a [round-trip][124] to the database, so unnecessary
calls should be avoided.

The information is provided by lower level APIs that have some
limitations.  Some uncommon statements will return the statement type
as `oracledb.STMT_TYPE_UNKNOWN`.  DDL statements are not parsed, so
syntax errors in them will not be reported.  The direction and types
of bind variables cannot be determined.

This method was added in node-oracledb 2.2.

##### Parameters

-   ```
    String sql
    ```

    The SQL statement to parse.

-   ```
    function(Error error, [Object information])
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getStatementInfo()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
    *Object information* | The `information` object, described below.

    Depending on the statement type, the `information` object may contain:

    - `bindNames`: an array of strings corresponding to the unique names
      of the bind variables used in the SQL statement.

    - `metaData`: containing properties equivalent to those given by
      `execute()` [extendedMetaData](#execmetadata).  This property exists
      only for queries.

    - `statementType`: an integer corresponding to one of the [SQL
      Statement Type Constants](#oracledbconstantsstmttype).


#### <a name="connectionping"></a> 4.2.10 `connection.ping()`

##### Prototype

Callback:
```
ping(function(Error error){});
```
Promise:
```
promise = ping();
```

##### Description

This method checks that a connection is currently usable and the
network to the database is valid.  This call can be useful for system
health checks.  A ping only confirms that a single connection is
usable at the time of the ping.

Pinging does not replace error checking during statement execution,
since network or database failure may occur in the interval between
`ping()` and `execute()` calls.

Pinging requires a [round-trip][124] to the database so unnecessary ping
calls should be avoided.

If `ping()` returns an error, the application should close the
connection.

This method was added in node-oracledb 2.2.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `ping()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="querystream"></a> 4.2.11 `connection.queryStream()`

##### Prototype

```
queryStream(String sql, [Object bindParams, [Object options]]);
```

##### Return Value

This method will return a [Readable Stream][16] for queries.

##### Description

This function provides query streaming support.  The parameters are
the same as [`execute()`](#execute) except a callback is not used.
Instead this function returns a stream used to fetch data.

Each row is returned as a `data` event.  Query metadata is available
via a `metadata` event.  The `end` event indicates the end of the
query results.

The connection must remain open until the stream is completely read.

For tuning, adjust the value of
[`oracledb.fetchArraySize`](#propdbfetcharraysize) or the
option [`fetchArraySize`](#propexecfetcharraysize) (see `execute()`).

See [Query Streaming](#streamingresults) for more information.

Support for Node.js version 8 Stream `destroy()` method was added in
node-oracledb 2.1.

This method was added in node-oracledb 1.8.

##### Parameters

See [execute()](#execute).

#### <a name="release"></a> 4.2.12 `connection.release()`

An alias for [connection.close()](#connectionclose).

#### <a name="rollback"></a> 4.2.13 `connection.rollback()`

##### Prototype

Callback:
```
rollback(function(Error error){});
```
Promise:
```
promise = rollback();
```

##### Description

This call rolls back the current transaction in progress on the
connection.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `rollback()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="consubscribe"></a> 4.2.14 `connection.subscribe()`

##### Prototype

Callback:
```
subscribe(String name, Object options, function(Error error){});
```
Promise:
```
promise = subscribe(String name, Object options);
```

##### Description

Register a JavaScript callback method to be invoked when data is
changed in the database by any committed transaction.

For notification to work, the connection must be created with
[`events`](#propdbevents) mode *true*.

The database must be able to connect to the node-oracledb machine for
notifications to be received.  Typically this means that the machine
running node-oracledb needs a fixed IP address.  If there is any
problem sending a notification, then the callback method will not be
invoked.

The `connection.subscribe()` method may be called multiple times with
the same `name`.  In this case, the second and subsequent invocations
ignore all `options` properties other than
[`sql`](#consubscribeoptsql) and [`binds`](#consubscribeoptbinds).
Instead, the new SQL statement is registered to the same subscription,
and the same JavaScript notification callback is used.  For
performance reasons this can be preferable to creating a new
subscription for each query.

See [Continuous Query Notification (CQN)](#cqn) for more information.

This method was added in node-oracledb 2.3.

##### <a name="consubscribename"></a> 4.2.14.1 `subscribe()`: Name

```
String name
```

For Continuous Query Notification this is an arbitrary name given to
the subscription.  For Advanced Queue notifications this must be the
queue name.

##### <a name="consubscribeoptions"></a> 4.2.14.2 `subscribe()`: Options

```
Object options
```

The options that control the subscription.  The following properties can be set.

###### <a name="consubscribeoptbinds"></a> 4.2.14.2.1 `binds`

```
Object binds
```

An array (bind by position) or object (bind by name) containing the
bind values to use in the [`sql`](#consubscribeoptsql) property.

###### <a name="consubscribeoptcallback"></a> 4.2.14.2.2 `callback`

```
function callback(message)
```

The notification callback that will be called whenever notifications
are sent by the database.  It accepts one parameter which contains
details of the notification.

Callback function parameter | Description
----------------------------|-------------
*Object message*            | Information about the notification.  Described below.

The `message` parameter in the notification callback is an object containing the following properties:

- `dbName` - the name of the database which sent a notification. This property is only defined for CQN. It is not defined when `type` is [`oracledb.SUBSCR_EVENT_TYPE_DEREG`](#oracledbconstantssubscription).
- `queries` - an array of objects specifying the queries which were affected by the Query Change notification. This is only defined if the `type` key is the value [`oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE`](#oracledbconstantssubscription). It contains the following key:
    - `tables` - an array of objects identical to the objects created for Database Change Notification (see the `tables` property below).
- `registered` - a boolean indicating whether the subscription is registerd with the database.  Will be *false* if `type` is [`oracledb.SUBSCR_EVENT_TYPE_DEREG`](#oracledbconstantssubscription) or if the subscription was created with the [`qos`](#consubscribeoptqos) property set to [`oracledb.SUBSCR_QOS_DEREG_NFY`](#oracledbconstantssubscription).
- `tables` - an array of objects specifying the tables which were affected by the notification. This is only defined if `type` is [`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE`](#oracledbconstantssubscription). It contains the following properties:
    - `name` - the name of the table which was modified in some way.
    - `operation` - an integer mask composed of one or more values of the following constants:
        - [`oracledb.CQN_OPCODE_ALL_ROWS`](#oracledbconstantscqn) - if row information is not available. This occurs if the [`qos`](#consubscribeoptqos) quality of service flags do not specify the desire for ROWIDs or if grouping has taken place and summary notifications are being sent.  This may also be set when too many rows are returned.
        - [`oracledb.CQN_OPCODE_ALTER`](#oracledbconstantscqn) - if the table was altered in the notifying transaction.
        - [`oracledb.CQN_OPCODE_DELETE`](#oracledbconstantscqn) - if the notifying transaction included deletes on the table.
        - [`oracledb.CQN_OPCODE_DROP`](#oracledbconstantscqn) - if the table was dropped in the notifying transaction.
        - [`oracledb.CQN_OPCODE_INSERT`](#oracledbconstantscqn) - if the notifying transaction included inserts on the table.
        - [`oracledb.CQN_OPCODE_UPDATE`](#oracledbconstantscqn) - if the notifying transaction included updates on the table.
    - `rows` - an array of objects specifying the rows which were changed. This will only be defined if the [`qos`](#consubscribeoptqos) quality of service used when creating the subscription indicated the desire for ROWIDs and no summary grouping took place. It contains the following properties:
        - `operation` - an integer which is one of [`oracledb.CQN_OPCODE_INSERT`](#oracledbconstantscqn), [`oracledb.CQN_OPCODE_UPDATE`](#oracledbconstantscqn), [`oracledb.CQN_OPCODE_DELETE`](#oracledbconstantscqn) as described earlier
        - `rowid` - a string containing the ROWID of the row that was affected
- `txId` - a buffer containing the identifier of the transaction which spawned the notification.
- `type` - the type of notification sent. This will be the value of one of the following constants:
    - [`oracledb.SUBSCR_EVENT_TYPE_AQ`](#oracledbconstantssubscription) - One or more Advanced Queuing messages are available to be dequeued (Note AQ enqueue and dequeue methods are not supported)
    - [`oracledb.SUBSCR_EVENT_TYPE_DEREG`](#oracledbconstantssubscription) - the subscription has been closed or the timeout value has been reached.
    - [`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE`](#oracledbconstantssubscription) - object-level notications are being used (Database Change Notification).
    - [`oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE`](#oracledbconstantssubscription) - query-level notifications are being used (Continuous Query Notification).

###### <a name="consubscribeoptgroupingclass"></a> 4.2.14.2.3 `groupingClass`

```
Number groupingClass
```

An integer mask which currently, if set, can only contain the value
[`oracledb.SUBSCR_GROUPING_CLASS_TIME`](#oracledbconstantssubscription). If
this value is set then notifications are grouped by time into a single
notification.

###### <a name="consubscribeoptgroupingtype"></a> 4.2.14.2.4 `groupingType`

```
Number groupingType
```

Either
[`oracledb.SUBSCR_GROUPING_TYPE_SUMMARY`](#oracledbconstantssubscription)
(the default) indicating notifications should be grouped in a summary,
or
[`oracledb.SUBSCR_GROUPING_TYPE_LAST`](#oracledbconstantssubscription)
indicating the last notification in the group should be sent.

###### <a name="consubscribeoptgroupingvalue"></a> 4.2.14.2.5 `groupingValue`

```
Number groupingValue
```

If `groupingClass` contains
[`oracledb.SUBSCR_GROUPING_CLASS_TIME`](#oracledbconstantssubscription)
then `groupingValue` can be used to set the number of seconds over
which notifications will be grouped together, invoking `callback`
once.  If `groupingClass` is not set, then `groupingValue` is ignored.

###### <a name="consubscribeoptipaddress"></a> 4.2.14.2.6 `ipAddress`

```
String ipAddress
```

A string containing an IPv4 or IPv6 address on which the subscription
should listen to receive notifications.  If not specified, then the
Oracle Client library will select an IP address.

###### <a name="consubscribeoptnamespace"></a> 4.2.14.2.7 `namespace`

```
Number namespace
```

One of the
[`oracledb.SUBSCR_NAMESPACE_AQ`](#oracledbconstantssubscription) or
[`oracledb.SUBSCR_NAMESPACE_DBCHANGE`](#oracledbconstantssubscription)
(the default) constants.

You can use `oracledb.SUBSCR_NAMESPACE_AQ` to get notifications that
Advanced Queuing messages are available to be dequeued.  Note Advanced
Queuing enqueue and dequeue methods are not supported yet.

###### <a name="consubscribeoptoperations"></a> 4.2.14.2.8 `operations`

```
Number operations
```

An integer mask containing one or more of the operation type
[`oracledb.CQN_OPCODE_*`](#oracledbconstantscqn) constants to indicate
what types of database change should generation notifications.

###### <a name="consubscribeoptport"></a> 4.2.14.2.9 `port`

```
Number port
```

The port number on which the subscription should listen to receive
notifications.  If not specified, then the Oracle Client library will
select a port number.

###### <a name="consubscribeoptqos"></a> 4.2.14.2.10 `qos`

```
Number qos
```

An integer mask containing one or more of the quality of service
[`oracledb.SUBSCR_QOS_*`](#oracledbconstantssubscription) constants.

###### <a name="consubscribeoptsql"></a> 4.2.14.2.11 `sql`

```
String sql
```

The SQL query string to use for notifications.

###### <a name="consubscribeopttimeout"></a> 4.2.14.2.12 `timeout`

The number of seconds the subscription should remain active.  Once
this length of time has been reached, the subscription is
automatically unregistered and a deregistration notification is sent.

##### <a name="consubscribecallback"></a> 4.2.14.3 `subscribe()`: Callback Function

##### Prototype

```
function(Error error)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error*               | If `subscribe()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

#### <a name="conunsubscribe"></a> 4.2.15 `connection.unsubscribe()`

##### Prototype

Callback:
```
unsubscribe(String name, function(Error error){});
```

Promise:
```
promise = unsubscribe(String name);
```

##### Description

Unregister a [Continuous Query Notification (CQN)](#cqn) subscription
previously created with [`connection.subscribe()`](#consubscribe).  No
further notifications will be sent.  The notification callback does
not receive a notification of the deregistration event.

A subscription can be unregistered using a different connection to the
initial subscription, as long as the credentials are the same.

If the subscription [`timeout`](#consubscribeoptions) was reached and
the subscription was automatically unregistered, you will get an error
if you call `connection.unsubscribe()`.

This method was added in node-oracledb 2.3.

##### Parameters

-   ```
    String name
    ```

    The name of the subscription used in [`connection.subscribe()`](#consubscribe).

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error*               | If `unsubscribe()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="lobclass"></a> 5. Lob Class

Lob objects can be used to access Oracle Database CLOB and BLOB data.

A Lob object implements the [Node.js Stream][16] interface.

See [Working with CLOB and BLOB Data](#lobhandling) and [LOB Bind Parameters](#lobbinds) for more information.

### <a name="lobproperties"></a> 5.1 Lob Properties

The properties of a Lob object are listed below.

#### <a name="proplobchunksize"></a> 5.1.1 `lob.chunkSize`

```
readonly Number chunkSize
```

This corresponds to the size used by the Oracle LOB layer when
accessing or modifying the LOB value.

#### <a name="proploblength"></a> 5.1.2 `lob.length`

```
readonly Number length
```

Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs).

#### <a name="proplobpiecesize"></a> 5.1.3 `lob.pieceSize`

```
Number pieceSize
```

The number of bytes (for BLOBs) or characters (for CLOBs) to read for
each Stream 'data' event of a queried LOB.

The default value is [`chunkSize`](#proplobchunksize).

For efficiency, it is recommended that `pieceSize` be a multiple of
`chunkSize`.

The property should not be reset in the middle of streaming since data
will be lost when internal buffers are resized.

The maximum value for `pieceSize` is limited to the value of UINT_MAX.

#### <a name="proplobtype"></a> 5.1.4 `lob.type`

```
readonly Number type
```

This read-only attribute shows the type of Lob being used.  It will
have the value of one of the constants
[`oracledb.BLOB`](#oracledbconstantsnodbtype) or
[`oracledb.CLOB`](#oracledbconstantsnodbtype).  The value is derived from the
bind type when using LOB bind variables, or from the column type when
a LOB is returned by a query.

### <a name="lobmethods"></a> 5.2 Lob Methods

#### <a name="lobclose"></a> 5.2.1 `lob.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

Explicitly closes a Lob.

Lobs created with [`createLob()`](#connectioncreatelob) should be
explicitly closed with [`lob.close()`](#lobclose) when no longer
needed.  This frees resources in node-oracledb and in Oracle Database.

Persistent or temporary Lobs returned from the database may also be
closed with `lob.close()` as long as streaming is not currently
happening.  Note these Lobs are automatically closed when streamed to
completion or used as the source for an IN OUT bind.  If you try to
close a Lob being used for streaming you will get the error *NJS-023:
concurrent operations on a Lob are not allowed*.

The `lob.close()` method emits the [Node.js Stream][16] 'close' event
unless the Lob has already been explicitly or automatically closed.

The connection must be open when calling `lob.close()` on a temporary
LOB, such as those created by `createLob()`.

Once a Lob is closed, it cannot be bound.

See [Closing Lobs](#closinglobs) for more discussion.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).

## <a name="poolclass"></a> 6. Pool Class

A connection *Pool* object is created by calling the
[`oracledb.createPool()`](#createpool) method.

The *Pool* object obtains connections to the Oracle database using the
`getConnection()` method to "check them out" from the pool. Internally
[Oracle Call Interface Session Pooling][6] is used.

After the application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the `close()` method on the Pool object.

See [Connection Pooling](#connpooling) for more information.

### <a name="poolproperties"></a> 6.1 Pool Properties

The *Pool* object properties may be read to determine the current
values.

#### <a name="proppoolconnectionsinuse"></a> 6.1.1 `pool.connectionsInUse`

```
readonly Number connectionsInUse
```

The number of currently active connections in the connection pool
i.e. the number of connections currently "checked out" using
`getConnection()`.

#### <a name="proppoolconnectionsopen"></a> 6.1.2 `pool.connectionsOpen`

```
readonly Number connectionsOpen
```

The number of currently open connections in the underlying connection
pool.

#### <a name="proppoolpoolalias"></a> 6.1.3 `pool.poolAlias`

```
readonly Number poolAlias
```

The alias of this pool in the [connection pool cache](#connpoolcache).  An alias cannot be changed once the pool has been created.

#### <a name="proppoolpoolincrement"></a> 6.1.4 `pool.poolIncrement`

```
readonly Number poolIncrement
```

The number of connections that are opened whenever a connection
request exceeds the number of currently open connections.

See [`oracledb.poolIncrement`](#propdbpoolincrement).

#### <a name="proppoolpoolmax"></a> 6.1.5 `pool.poolMax`

```
readonly Number poolMax
```

The maximum number of connections that can be open in the connection
pool.

See [`oracledb.poolMax`](#propdbpoolmax).

#### <a name="proppoolpoolmin"></a> 6.1.6 `pool.poolMin`

```
readonly Number poolMin
```

The minimum number of connections a connection pool maintains, even
when there is no activity to the target database.

See [`oracledb.poolMin`](#propdbpoolmin).

#### <a name="proppoolpoolpinginterval"></a> 6.1.7 `pool.poolPingInterval`

```
readonly Number poolPingInterval
```

The maximum number of seconds that a connection can remain idle in a
connection pool (not "checked out" to the application by
`getConnection()`) before node-oracledb pings the database prior to
returning that connection to the application.

See [`oracledb.poolPingInterval`](#propdbpoolpinginterval).

#### <a name="proppoolpooltimeout"></a> 6.1.8 `pool.poolTimeout`

```
readonly Number poolTimeout
```

The time (in seconds) after which the pool terminates idle connections
(unused in the pool). The number of connections does not drop below
poolMin.

See [`oracledb.poolTimeout`](#propdbpooltimeout).

#### <a name="proppoolqueuerequests"></a> 6.1.9 `pool.queueRequests`

This property was removed in node-oracledb 3.0.  Queuing is now always
enabled.  See [Connection Pool Queue](#connpoolqueue) for more
information.

#### <a name="proppoolqueueTimeout"></a> 6.1.10 `pool.queueTimeout`

```
readonly Number queueTimeout
```

The time (in milliseconds) that a connection request should wait in
the queue before the request is terminated.

See [`oracledb.queueTimeout`](#propdbqueuetimeout).

#### <a name="proppoolstatus"></a> 6.1.11 `pool.status`

```
readonly Number status
```

One of the [`oracledb.POOL_STATUS_*`](#oracledbconstantspool) constants indicating
whether the pool is open, being drained of in-use connections, or has
been closed.

See [Connection Pool Closing and Draining](#conpooldraining).

#### <a name="proppoolstmtcachesize"></a> 6.1.12 `pool.stmtCacheSize`

```
readonly Number stmtCacheSize
```

The number of statements to be cached in the
[statement cache](#stmtcache) of each connection.

See [`oracledb.stmtCacheSize`](#propdbstmtcachesize).

### <a name="poolmethods"></a> 6.2 Pool Methods

#### <a name="poolclose"></a> 6.2.1 `pool.close()`

##### Prototype

Callback:
```
close([Number drainTime,] function(Error error){});
```
Promise:
```
promise = close([Number drainTime]);
```

##### Description

This call closes connections in the pool and terminates the connection
pool.

If a `drainTime` is not given, then any open connections should be
released with [`connection.close()`](#connectionclose) before
`pool.close()` is called, otherwise the pool close will fail and the
pool will remain open.

If a `drainTime` is specified, then any new `pool.getConnection()`
calls will fail.  If connections are in use by the application, they
can continue to be used for the specified number of seconds, after
which the pool and all open connections are forcibly closed.  Prior to
this time limit, if there are no connections currently "checked out"
from the pool with `getConnection()`, then the pool and any
connections that are idle in the pool are immediately closed.
Non-zero `drainTime` values are strongly recommended so applications
have the opportunity to gracefully finish database operations.  A
`drainTime` of 0 may be used to close a pool and its connections
immediately.

In network configurations that drop (or in-line) out-of-band breaks,
forced pool termination may hang unless you have
[`DISABLE_OOB=ON`][122] in a `sqlnet.ora` file, see [Optional Client
Configuration Files](#tnsadmin).

When the pool is closed, it will be removed from the [connection pool
cache](#connpoolcache).

This method was added to node-oracledb 1.9, replacing the equivalent
alias `pool.terminate()`.

The `drainTime` parameter was added in node-oracledb 3.0.

##### Parameters

-   ```
    Number drainTime
    ```

    The number of seconds before the pool and connections are force closed.

    If `drainTime` is 0, the pool and its connections are closed immediately.

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).


#### <a name="getconnectionpool"></a> 6.2.2 `pool.getConnection()`

##### Prototype

Callback:
```
getConnection([Object poolAttrs,] function(Error error, Connection conn){});
```
Promise:
```
promise = getConnection([Object poolAttrs]);
```

##### Description

This method obtains a connection from the connection pool.

If a previously opened connection is available in the pool, that
connection is returned.  If all connections in the pool are in use, a
new connection is created and returned to the caller, as long as the
number of connections does not exceed the specified maximum for the
pool. If the pool is at its maximum limit, the `getConnection()` call
results in an error, such as *ORA-24418: Cannot open further sessions*.

By default pools are created with
[`homogeneous`](#createpoolpoolattrshomogeneous) set to *true*.  The
user name and password are supplied when the pool is created.  Each
time `pool.getConnection()` is called, a connection for that user is
returned:

```javascript
  pool.getConnection(
    function (err, conn) { ... }
  );
```

If a heterogeneous pool was created by setting
[`homogeneous`](#createpoolpoolattrshomogeneous) to *false* during
creation and credentials were omitted, then the user name and password
may be used in `pool.getConnection()` like:

```javascript
  pool.getConnection(
    {
      user     : 'hr',
      password : mypw,  // mypw contains the hr schema password
    },
    function (err, conn) { ... }
  );
```

In this case, different user names may be used each time
`pool.getConnection()` is called.  Proxy users may also be specified.

See [Connection Handling](#connectionhandling) for more information on
connections.

See [Heterogeneous Connection Pools and Pool Proxy
Authentication](#connpoolproxy) for more information on heterogeneous
pools.

##### Parameters

-   ```
    Object poolAttrs
    ```

    This optional parameter is used when getting connections from
    heterogeneous pools.  It can contain `user` and `password` properties
    for true heterogeneous pool usage, or it can contain a `user` property
    when a pool proxy user is desired.  It can contain `tag` when
    [connection tagging](#connpooltagging) is in use.

    See [Connection Attributes](#getconnectiondbattrsconnattrs) for
    discussion of these attributes.

-   ```
    function(Error error, Connection conn)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getConnection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the [error message](#errorobj).
    *Connection connection* | The newly created connection.   If `getConnection()` fails, `connection` will be NULL.  See [Connection class](#connectionclass) for more details.

#### <a name="terminate"></a> 6.2.3 `pool.terminate()`

An alias for [pool.close()](#poolclose).

## <a name="resultsetclass"></a> 7. ResultSet Class

ResultSets allow query results to fetched from the database one at a
time, or in groups of rows.  They can also be converted to Readable
Streams.  ResultSets enable applications to process very large data
sets.

ResultSets should also be used where the number of query rows cannot
be predicted and may be larger than Node.js can handle in a single
array.

A *ResultSet* object is obtained by setting `resultSet: true` in the
`options` parameter of the *Connection* [`execute()`](#execute) method
when executing a query.  A *ResultSet* is also returned to
node-oracledb when binding as type [`oracledb.CURSOR`](#oracledbconstantsnodbtype) to a
PL/SQL REF CURSOR bind parameter.

See [Fetching Rows with Result Sets](#resultsethandling) for more information on ResultSets.

### <a name="resultsetproperties"></a> 7.1 ResultSet Properties

The properties of a *ResultSet* object are listed below.

#### <a name="rsmetadata"></a> 7.1.1 `resultset.metaData`

```
readonly Array metaData
```

Contains an array of objects with metadata about the query or REF
CURSOR columns.

Each column's `name` is always given.  If the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `execute()` option
[`extendedMetaData`](#propexecextendedmetadata) are *true* then
additional information is included.

See [`result.metaData`](#execmetadata) for the available attributes.

### <a name="resultsetmethods"></a> 7.2 ResultSet Methods

#### <a name="close"></a> 7.2.1 `resultset.close()`

##### Prototype

Callback:
```
close(function(Error error){});
```
Promise:
```
promise = close();
```

##### Description

Closes a ResultSet.  Applications should always call this at the end
of fetch or when no more rows are needed.  It should also be called if
no rows are ever going to be fetched from the ResultSet.

#### <a name="getrow"></a> 7.2.2 `resultset.getRow()`

##### Prototype

Callback:
```
getRow(function(Error error, Object row){});
```
Promise:
```
promise = getRow();
```

##### Description

This call fetches one row of the ResultSet as an object or an array of
column values, depending on the value of
[outFormat](#propdboutformat).

At the end of fetching, the ResultSet should be freed by calling
[`close()`](#close).

Performance of `getRow()` can be tuned by adjusting the value of
[`oracledb.fetchArraySize`](#propdbfetcharraysize) or the `execute()`
option [`fetchArraySize`](#propexecfetcharraysize).

#### <a name="getrows"></a> 7.2.3 `resultset.getRows()`

##### Prototype

Callback:
```
getRows(Number numRows, function(Error error, Array rows){});
```
Promise:
```
promise = getRows(Number numRows);
```

##### Description

This call fetches `numRows` rows of the ResultSet as an object or an
array of column values, depending on the value of [outFormat](#propdboutformat).

At the end of fetching, the ResultSet should be freed by calling [`close()`](#close).

Different values of `numRows` may alter the time needed for fetching
data from Oracle Database.  The value of
[`fetchArraySize`](#propdbfetcharraysize) has no effect on `getRows()`
performance or internal buffering.

#### <a name="toquerystream"></a> 7.2.4 `resultset.toQueryStream()`

##### Prototype

```
toQueryStream();
```

##### Return Value

This method will return a [Readable Stream][16].

##### Description

This synchronous method converts a ResultSet into a stream.

It can be used to make ResultSets from top-level queries or from REF
CURSOR bind variables streamable.  To make top-level queries
streamable, the alternative [`connection.queryStream()`](#querystream)
method may be easier to use.

To change the behavior of `toQueryStream()`, such as setting the
[query output Format](#queryoutputformats) or the internal buffer size
for performance, adjust global attributes such as
[`oracledb.outFormat`](#propdboutformat) and
[`oracledb.fetchArraySize`](#propdbfetcharraysize) before calling
[`execute()`](#execute).

See [Query Streaming](#streamingresults) for more information.

The `toQueryStream()` method was added in node-oracledb 1.9.  Support
for Node.js version 8 Stream `destroy()` method was added in node-oracledb 2.1.

## <a name="sodacollectionclass"></a> 8. SodaCollection Class

SODA support in node-oracledb is in Preview status and should not be
used in production.  It will be supported with a future version of
Oracle Client libraries.

#### <a name="sodacollectionproperties"></a> 8.1 SodaCollection Properties

Each SodaCollection object contains read-only properties:

#### <a name="sodacollectionpropmetadata"></a> 8.1.1 `sodaCollection.metaData`

```
readonly Object metaData
```

Metadata of the current collection.  See [SODA Client-Assigned Keys
and Collection Metadata](#sodaclientkeys).

This property was added in node-oracledb 3.0.

#### <a name="sodacollectionpropname"></a> 8.1.2 `sodaCollection.name`


```
readonly String name
```

Name of the current collection.

This property was added in node-oracledb 3.0.

#### <a name="sodacollectionmethods"></a> 8.2 SodaCollection Methods

#### <a name="sodacollcreateindex"></a> 8.2.1 `sodaCollection.createIndex()`

##### Prototype

Callback:
```
createIndex(Object indexSpec, function(Error error){});
```

Promise:
```
promise = createIndex(Object indexSpec);
```

##### Description

Creates an index on a SODA collection, to improve the performance of
SODA query-by-examples (QBE) or enable text searches.  An index is
defined by a specification, which is a JSON object that specifies how
particular QBE patterns are to be indexed for quicker matching.

Note that a commit should be performed before attempting to create an
index.

Different index types can be used:

- B-tree: used to speed up query-by-example (QBE) [`filter()`](#sodaoperationclassfilter) searches.
- JSON search: required for text searches using the `$contains` operator in QBEs.  Also improves QBE filter operation performance. Note a B-tree index will perform better for non-text searches.
- GeoSpatial: for speeding up QBEs that do GeoJSON queries.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`createIndex()` succeeds, then any open user transaction is committed.
Note SODA DDL operations do not commit an open transaction the way that
SQL always does for DDL statements.

See [Overview of SODA Indexing][118].

This method was added in node-oracledb 3.0.

As an example, if a collection has these documents:

```
{"name": "Chris"}
{"name": "Venkat"}
{"name": "Srinath"}
```

Then a B-tree index could be created with:

```javascript
indexSpec = {name: "myIndex", fields: [{path: "name"}]};
await createIndex(indexSpec);
```

This index would improve the performance of QBEs like:

```javascript
d = await collection.find().filter({name: "Venkat"}).getOne();
```

##### <a name="sodacollcreateindexparams"></a> 8.2.1.1 `createIndex()` Parameters

###### <a name="sodacollcreateindexspec"></a> 8.2.1.1.1 `indexSpec`

```
Object indexSpec
```

An object with fields as shown in the [SODA Index Specifications (Reference)][119] manual.

##### <a name="sodacollcreateindexcb"></a> 8.2.1.2 `createIndex()`: Callback Function

```
function(Error error)
```

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createIndex()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.

#### <a name="sodacolldrop"></a> 8.2.2 `sodaCollection.drop()`

##### Prototype

Callback:
```
drop(function(Error error, Object result){});
```

Promise:
```
promise = drop();
```

##### Description

Drops the current collection.

An error such as *ORA-40626* will be returned and the collection will
not be dropped if there are uncommitted writes to the collection in
the current transaction.

If the collection was created with mode
[`oracledb.SODA_COLL_MAP_MODE`](#oracledbconstantssoda), then `drop()`
will not physically delete the database storage containing the
collection, and won't drop SODA indexes.  Instead it will simply unmap
the collection, making it inaccessible to SODA operations.

If [`oracledb.autoCommit`](#propdbisautocommit) is true, and `drop()`
succeeds, then any open user transaction is committed. Note SODA
operations do not commit an open transaction the way that SQL always
does for DDL statements.

If the collection was created with custom metadata changing the key
assignment method to SEQUENCE, the `drop()` method will not delete the
underlying Oracle sequence.  This is in case it was created outside
SODA.  To drop the sequence, use the SQL command DROP SEQUENCE after
`drop()` has completed.

Note you should never use SQL DROP TABLE command on the database table
underlying a collection.  This will not clean up SODA's metadata.  If
you do accidentally execute DROP SQL, you should cleanup the metadata
with `drop()` or execute the SQL statement: `SELECT
DBMS_SODA.DROP_COLLECTION('myCollection') FROM DUAL;`.

This method was added in node-oracledb 3.0.

##### <a name="sodacolldropcallback"></a> 8.2.2.1 `drop()`: Callback Function

```
function(Error error, Object result)
```

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `drop()` succeeds, `error` is NULL.  It is not an error if the collection does not exist.  If an error occurs, then `error` contains the error message.
*Object result* | See below.


The `result` object contains one attribute:

```
Boolean dropped
```

If the drop operation succeeded, `dropped` will be *true*.  If no
collection was found, `dropped` will be *false*.

#### <a name="sodacolldropindex"></a> 8.2.3 `sodaCollection.dropIndex()`

##### Prototype

Callback:
```
dropIndex(String indexName, [Object options,] function(Error error, Object result){});
```

Promise:
```
promise = dropIndex(String indexName, [Object options]);
```

##### Description

Drops the specified index.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*,
and `dropIndex()` succeeds, then any open user transaction is
committed.  Note SODA operations do not commit an open transaction the
way that SQL always does for DDL statements.

This method was added in node-oracledb 3.0.

##### <a name="sodacolldropindexparams"></a> 8.2.3.1 `dropIndex()`: Parameters

###### <a name="sodacolldropindexindexname"></a> 8.2.3.1.1 `indexName`

```
String indexName
```

Name of the index to be dropped.

###### <a name="sodacolldropindexoptions"></a> 8.2.3.1.2 `options`

```
Object options
```

The `options` parameter can have the following attribute:

```
Boolean force
```

Setting `force` to *true* forces dropping of a JSON Search index or
Spatial index if the underlying Oracle Database domain index does not
permit normal dropping.  See [DROP INDEX][120].

##### <a name="sodacolldropindexcb"></a> 8.2.3.2 `dropIndex()` Callback Function

##### Prototype

```
function(Error error, Object result)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `dropIndex()` succeeds, `error` is NULL.  It is not an error if the index does not exist.  If an error occurs, then `error` contains the error message.
*Boolean dropped* | If dropping the index succeeded, `dropped` will be *true*.  If no index was found, `dropped` will be *false*.

#### <a name="sodacollfind"></a> 8.2.4 `sodaCollection.find()`

##### Prototype

```
find()
```

##### Description

The synchronous `find()` method is used to locate and order a set of
SODA documents for retrieval, replacement, or removal.  It creates and
returns a [SodaOperation](#sodaoperationclass) object which is used
via method chaining with non-terminal and terminal methods described
below.  Note that SodaOperation is an internal object whose attributes
should not be accessed directly.

This method was added in node-oracledb 3.0.

##### Returns

Returns a [SodaOperation](#sodaoperationclass) object.

##### Example

```
documents = await collection.find().filter({"address.city": "Melbourne", "salary": {"$gt": 500000}}).getDocuments();
```

See [Simple Oracle Document Access (SODA)](#sodaoverview) for more examples.

##### <a name="sodaoperationclass"></a> 8.2.4.1 SodaOperation Class

You can chain together SodaOperation methods, to specify read or write
operations against a collection.

Non-terminal SodaOperation methods return the same object on which
they are invoked, allowing them to be chained together.

A terminal SodaOperation method always appears at the end of a method
chain to execute the operation.

A SodaOperation object is an internal object. You should not directly
modify its properties.

##### <a name="sodaoperationclassnonterm"></a> 8.2.4.1.1 Non-terminal SodaOperation Methods

Non-terminal SodaOperation methods are chained together to set
criteria that documents must satisfy.  At the end of the chain, a
single terminal method specifies the operation to be performed on
the matching documents.

When a non-terminal method is repeated, the last one overrides the
earlier one. For example if `find().key("a").key("b")...` was used,
then only documents with the key "b" are matched. If
`find().keys(["a","b"]).key("c")...` is used, then only the document
with the key "c" is matched.

###### <a name="sodaoperationclassfilter"></a> 8.2.4.1.1.1 `sodaOperation.filter()`

##### Prototype

```
filter(Object filterSpec)
```

##### Description

Sets a filter specification for the operation, allowing for complex
document queries and ordering of JSON documents.  Filter
specifications can include comparisons, regular expressions, logical,
and spatial operators, among others.  See [Overview of SODA Filter
Specifications (QBEs)][108] and [SODA Filter Specifications
(Reference)][123].

For node-oracledb examples, see [SODA Query-by-Example Searches for
JSON Documents](#sodaqbesearches)

This method was added in node-oracledb 3.0.

###### <a name="sodaoperationclasskey"></a> 8.2.4.1.1.2 `sodaOperation.key()`

##### Prototype

```
key(String value)
```

##### Description

Sets the key value to be used to match a document for the operation.
Any previous calls made to this method or
[`keys()`](#sodaoperationclasskeys) will be ignored.

SODA document keys are unique.

This method was added in node-oracledb 3.0.

###### <a name="sodaoperationclasskeys"></a> 8.2.4.1.1.3 `sodaOperation.keys()`

##### Prototype

```
keys(Array value)
```

##### Description

Sets the keys to be used to match multiple documents for the
operation.  Any previous calls made to this method or
[`key()`](#sodaoperationclasskey) will be ignored.

SODA document keys are unique.

A maximum of 1000 keys can be used.

This method was added in node-oracledb 3.0.

###### <a name="sodaoperationclasslimit"></a> 8.2.4.1.1.4 `sodaOperation.limit()`

##### Prototype

```
limit(Number n)
```

##### Description

Sets the maximum number of documents that a terminal method will apply
to.  The value of `n` must be greater than 0.  The limit is applied to
documents that match the other SodaOperation criteria.  The `limit()`
method only applies to SodaOperation read operations like
`getCursor()` and `getDocuments()`.  If a filter `$orderby` is not
used, the document order is internally defined.

The `limit()` method cannot be used in conjunction with
[`count()`](#sodaoperationclasscount).

This method was added in node-oracledb 3.0.

###### <a name="sodaoperationclassskip"></a> 8.2.4.1.1.5 `sodaOperation.skip()`

##### Prototype

```
skip(Number n)
```

##### Description

Sets the number of documents that will be skipped before the terminal
method is applied.  The value of `n` must be greater or equal to 0.  The
skip applies to documents that match the other SodaOperation criteria.

If a filter `$orderby` is not used, the document order (and hence which
documents are skipped) is internally defined.

The `skip()` method only applies to SodaOperation read operations like
`getDocuments()`.  It cannot be used with
[`count()`](#sodaoperationclasscount).

This method was added in node-oracledb 3.0.

###### <a name="sodaoperationclassversion"></a> 8.2.4.1.1.6 `sodaOperation.version()`

##### Prototype

```
version(String value)
```

##### Description

Sets the document version that documents must have.

This is typically used in conjunction with a key, for example
`collection.find().key("k").version("v").replaceOne(doc)`.

Using `version()` allows for optimistic locking, so that the
subsequent SodaOperation terminal method does not affect a document
that someone else has already modified.  If the requested document
version is not matched, then your terminal operation will not impact
any document.  The application can then query to find the latest
document version and apply any desired change.

This method was added in node-oracledb 3.0.

##### <a name="sodaoperationclassterm"></a> 8.2.4.1.2 Terminal SodaOperation Methods

A terminal SodaOperation method operates on the set of documents that
satisfy the criteria specified by previous non-terminal methods in the
method chain.  Only one terminal method can be used in each chain.

###### <a name="sodaoperationclasscount"></a> 8.2.4.1.2.1 `sodaOperation.count()`

##### Prototype

Callback
```
count(function Error error, Object result){});
```

Promise
```
promise = count();
```

##### Description

Finds the number of documents matching the given SodaOperation query criteria.

If `skip()` or `limit()` are set, then `count()` will return an error.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`count()` succeeds, then any open transaction on the connection is
committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, Object result)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `count()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *Object result* | See below.

    The `result` object contains one attribute:

    ```
    Number count
    ```

    The number of documents matching the SodaOperation criteria.

###### <a name="sodaoperationclassgetcursor"></a> 8.2.4.1.2.2 `sodaOperation.getCursor()`

##### Prototype

Callback
```
getCursor(function(Error error, SodaDocumentCursor cursor){});
```

Promise
```
promise = getCursor()
```

##### Description

Returns a [SodaDocumentCursor](#sodadocumentcursorclass) for documents
that match the SodaOperation query criteria.  The cursor can be
iterated over with
[`sodaDocumentCursor.getNext()`](#sodadoccursorgetnext) to access each
[SodaDocument](#sodadocumentclass).

When the application has completed using the cursor it must be closed
with [`sodaDocumentCursor.close()`](#sodadoccursorclose).

If the number of documents is known to be small, it is recommended to
use [`sodaOperation.getDocuments()`](#sodaoperationclassgetdocuments)
instead.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`getCursor()` succeeds, then any open transaction on the connection is
committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, SodaDocumentCursor cursor)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error*  | If `getCursor()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *SodaDocumentCursor cursor* | A cursor that can be iterated over to access SodaDocument objects matching the SodaOperation search criteria.

###### <a name="sodaoperationclassgetdocuments"></a> 8.2.4.1.2.3 `sodaOperation.getDocuments()`

##### Prototype

Callback
```
getDocuments(function(Error error, Array documents){});
```

Promise
```
promise = getDocuments();
```

##### Description

Gets an array of [SodaDocuments](#sodadocumentclass) matching the
SodaOperation query criteria.  An empty array will be returned when no
documents match.

Where the number of matching documents is known to be small, this API
should be used in preference to
[`sodaOperation.getCursor()`](#sodaoperationclassgetcursor).

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`getDocuments()` succeeds, then any open transaction on the connection
is committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, Array documents)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getDocuments()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *Array documents* | An array of SodaDocuments that match the SodaOperation query criteria.

###### <a name="sodaoperationclassgetone"></a> 8.2.4.1.2.4 `sodaOperation.getOne()`

##### Prototype

Callback
```
getOne(function(Error error, SodaDocument document){});
```

Promise
```
promise = getOne();
```

##### Description

Obtains one document matching the SodaOperation query criteria.  If
the criteria match more than one document, then only the first is
returned.

Typically `getone()` should be used with `key(k)` or
`key(k).version(v)` to ensure only one document is matched.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`getOne()` succeeds, then any open transaction on the connection is
committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, SodaDocument document)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getOne()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *SodaDocument document* | One SodaDocument that matches the sodaOperation query criteria.  If no document is found, then `document` will be undefined.

###### <a name="sodaoperationclassremove"></a> 8.2.4.1.2.5 `sodaOperation.remove()`

##### Prototype

Callback
```
remove(function(Error error, Object result){});
```

Promise
```
promise = remove();
```

##### Description

Removes a set of documents matching the SodaOperation query criteria.

Note settings from `skip()` and `limit()` non-terminals are ignored because they only apply to read operations.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`remove()` succeeds, then removal and any open transaction on the
connection is committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, Object result)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `remove()` succeeds, error is NULL.  If an error occurs, then error contains the error message.
    *Object result* | See below.

    The `result` object contains one attribute:

    ```
    result.count
    ```

    The number of documents removed from the collection.

###### <a name="sodaoperationclassreplaceone"></a> 8.2.4.1.2.6 `sodaOperation.replaceOne()`

##### Prototype

Callback
```
replaceOne(Object newDocumentContent, function(Error error, Object result){});
replaceOne(SodaDocument newSodaDocument, function(Error error, Object result){});
```

Promise
```
promise = replaceOne(Object newDocumentContent);
promise = replaceOne(SodaDocument newSodaDocument);
```

##### Description

Replaces a document in a collection.  The input document can be either
a JavaScript object representing the data content, or it can be an
existing [SodaDocument](#sodadocumentclass).

The `mediaType` document component and content of the document that
matches the SodaOperation query criteria will be replaced by the
content and any `mediaType` document component of the new document.
Any other document components will not be affected.  The
`lastModified` and `version` document components of the replaced
document will be updated.

The `key()` non-terminal must be used when using `replaceOne()`.

No error is reported if the operation criteria do not match any
document.

Note settings from `skip()` and `limit()` non-terminals are ignored
because they only apply to read operations.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`replaceOne()` succeeds, then any open transaction on the connection
is committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    Object newDocumentContent
    SodaDocument newSodaDocument
    ```

    The new document.  See
    [sodaCollection.insertOne()](#sodacollinsertone), which has the same
    semantics for the document.

-   ```
    function(Error error, Object result)
    ```

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `replaceOne()` succeeds, `error` is NULL.  It is not an error if no document is replaced. If an error occurs, then `error` contains the error message.
    *Object result* | See below.

    The `result` object contains one attribute:

    ```
    result.replaced
    ```

    This attribute will be *true* if the document was successfully replaced, *false* otherwise.

###### <a name="sodaoperationclassreplaceoneandget"></a> 8.2.4.1.2.7 `sodaOperation.replaceOneAndGet()`

##### Prototype

Callback
```
replaceOneAndGet(Object newDocumentContent, function(Error error, SodaDocument updatedDocument){});
replaceOneAndGet(SodaDocument newSodaDocument, function(Error error, SodaDocument updatedDocument){});
```

Promise
```
promise = replaceOneAndGet(Object newDocumentContent);
promise = replaceOneAndGet(SodaDocument newSodaDocument);
```

##### Description

Replaces a document in a collection.  This is similar to
[`replaceOne()`](#sodaoperationclassreplaceone), but also returns the
result document, which contains all [SodaDocument](#sodadocumentclass)
components (key, version, etc.) except for content.  Content is not
returned for performance reasons.  The result document has new values
for components that are updated as part of the replace operation (such
as version, last-modified timestamp, and media type)

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`replaceOneAndGet()` succeeds, then any open transaction on the
connection is committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    Object newDocumentContent
    SodaDocument newSodaDocument
    ```

    The new document.  See
    [sodaCollection.insertOne()](#sodacollinsertone), which has the same
    semantics for the document.

-   ```
    function(Error error, SodaDocument updatedDocument)
    ```

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `replaceOneAndGet()` succeeds, `error` is NULL.  It is not an error if no document is replaced.  If an error occurs, then `error` contains the error message.
    *SodaDocument updatedDocument* | The updated [SodaDocument](#sodadocumentclass) if replacement was successful, otherwise `updatedDocument` will be undefined.  The `lastModified` and `version` attributes of the stored SodaDocument will be updated.  The `mediaType` attribute and the content will be replaced.  Other attributes of `newDocument` are ignored.  Note for performance reasons, `updatedDocument` will not have document content and cannot itself be passed directly to SODA insert or replace methods.

#### <a name="sodacollgetdataguide"></a> 8.2.5 `sodaCollection.getDataGuide()`

##### Prototype

Callback:
```
getDataGuide(function(Error error, SodaDocument document){});
```

Promise:
```
promise = getDataGuide();
```

##### Description

Infers the schema of a collection of JSON documents at the current
time.  A [JSON data guide][116] shows details like the JSON property
names, data types and lengths.  It is useful for exploring the schema
of a collection.  The data guide is represented as JSON content in a
[SodaDocument](#sodadocumentclass).

This method is supported for JSON-only collections which have a [JSON
Search index](#sodacollcreateindex) where the "dataguide" option is
"on".  An error will be returned if a data guide cannot be created.

A data guide is a best effort heuristic and should not be used as a
schema to validate new JSON documents.  The data guide is always
additive, and does not update itself when documents are deleted.
There are some limits such as the maximum number of children under one
node, and the maximum length of a path.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`getDataGuide()` succeeds, then any open user transaction is
committed.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, SodaDocument document)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getDataGuide()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *SodaDocument document* | The SodaDocument containining JSON content which can be accessed from the document as normal with [`sodaDocument.getContent()`](#sodadocgetcontent), [`sodaDocument.getContentAsString()`](#sodadocgetcontentasstring) or [`sodaDocument.getContentAsBuffer()`](#sodadocgetcontentasbuffer).

#### <a name="sodacollinsertone"></a> 8.2.6 `sodaCollection.insertOne()`

##### Prototype

Callback:
```
insertOne(Object newDocumentContent, function(Error error){});
insertOne(SodaDocument newDocument, function(Error error){});
```

Promise:
```
promise = insertOne(Object newDocumentContent);
promise = insertOne(SodaDocument newDocument);
```

##### Description

Inserts a given document to the collection.  The input document can be
either a JavaScript object representing the data content, or it can be
an existing [SodaDocument](#sodadocumentclass).

Note SodaDocuments returned from
[`sodaCollection.insertOneAndGet()`](#sodacollinsertoneandget) or from
[`sodaOperation.replaceOneAndGet()`](#sodaoperationclassreplaceoneandget)
cannot be passed to `insertOne()`, since these do not contain any
document content.  Instead, create a JavaScript object using the
desired attribute values, or use
[`sodaDatabase.createDocument()`](#sodadbcreatedocument), or use a
SodaDocument returned by a [`sodaCollection.find()`](#sodacollfind)
query.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`insertOne()` succeeds, then the new document and any open transaction
on the connection is committed.

This method was added in node-oracledb 3.0.

The following examples are equivalent:

```
newDocumentContent = {name: "Alison"};
await sodaCollection.insertOne(newDocumentContent);
```

and

```
newDocumentContent = {name: "Alison"};
doc = sodaDatabase.createDocument(newDocumentContent);
await sodaCollection.insertOne(doc);
```

##### <a name="sodacollinsertoneparams"></a> 8.2.6.1 `insertOne()`: Parameters

###### <a name="sodacollinsertoneparamsdoc"></a> 8.2.6.1.1 `newDocumentContent`,  `newDocument`

```
Object newDocumentContent
SodaDocument newDocument
```

The document to insert.

Passed as a simple JavaScript object, the value is interpreted as JSON
document content.  Other document components (key, version, etc.) will
be auto-generated by SODA during insert.  The media type will be set to
"application/json".

Alternatively, a [SodaDocument](#sodadocumentclass) can be passed.
The `content` and `mediaType` supplied in the SodaDocument will be
used.  The `key`, if set, will also be used if collection has
client-assigned keys.  Other components in the input SodaDocument,
such as version and last-modified, will be ignored and auto-generated
values will be used instead.

##### <a name="sodacollinsertonecb"></a> 8.2.6.2 `insertOne()` Callback Function

##### Prototype

```
function(Error error)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `insertOne()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.

#### <a name="sodacollinsertoneandget"></a> 8.2.7 `sodaCollection.insertOneAndGet()`

##### Prototype

Callback
```
insertOneAndGet(Object newDocumentContent, function(Error error, SodaDocument document){});
insertOneAndGet(SodaDocument newDocument, function(Error error, SodaDocument document){});
```

Promise
```
promise = insertOneAndGet(Object newDocumentContent);
promise = insertOneAndGet(SodaDocument newDocument);
```

##### Description

Similar to [sodaCollection.insertOne()](#sodacollinsertone) but also
returns the inserted document so system managed properties, such as the
key (in default collections), can be found.

Inserts a document in a collection.  This is similar to
[`sodaCollection.insertOne()`](#sodacollinsertone), but also returns the
result document, which contains all [SodaDocument](#sodadocumentclass)
components (key, version, etc.) except for content.  Content is not
returned for performance reasons.  The result document has new values
for components that are updated as part of the replace operation (such
as version, last-modified timestamp, and media type)

If you want to insert the returned document again, use the original
`newDocumentContent` or `newDocument`.  Alternatively construct a new
object from the returned document and add content.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`insertOneAndGet()` succeeds, then any open transaction on the
connection is committed.

This method was added in node-oracledb 3.0.

##### <a name="sodacollinsertoneandgetparams"></a> 8.2.7.1 `insertOneAndGet()`: Parameters

###### <a name="sodacollinsertoneandgetparamsdoc"></a> 8.2.7.1.1 `newDocumentContent`,  `newDocument`

```
Object newDocumentContent
SodaDocument newDocument
```

The document to insert.

For related documentation, see [`sodaCollection.insertOne()`](#sodacollinsertoneparamsdoc)

##### <a name="sodacollinsertoneandgetcb"></a> 8.2.7.2 `insertOneAndGet()` Callback Function

##### Prototype

```
function(Error error, SodaDocument document)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `insertOne()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
*SodaDocument document* | A result [SodaDocument](#sodadocumentclass) that is useful for finding the system generated key and other metadata of the newly inserted document.  Note for performance reasons, `document` will not have document content and cannot itself be passed directly to SODA insert or replace methods.

## <a name="sodadatabaseclass"></a> 9. SodaDatabase Class

SODA support in node-oracledb is in Preview status and should not be
used in production.  It will be supported with a future version of
Oracle Client libraries.

The SodaDatabase class is the top level object for node-oracledb SODA
operations. A 'SODA database' is an abstraction, allowing access to
SODA collections in that 'SODA database', which then allow access to
documents in those collections.

A SODA database is equivalent to an Oracle Database user, see
[Overview of SODA][117] in the Introduction to SODA manual.

A SODA database object is created by calling
[`connection.getSodaDatabase()`](#getsodadatabase).

See [Simple Oracle Document Access (SODA)](#sodaoverview) for more
information.

#### <a name="sodadatabasemethods"></a> 9.1 SodaDatabase Methods

#### <a name="sodadbcreatecollection"></a> 9.1.1 `sodaDatabase.createCollection()`

##### Prototype

Callback:
```
createCollection(String collectionName, [Object options,] function(Error error, SodaCollection collection){});
```

Promise:
```
promise = createCollection(String collectionName [, Object options]);
```

##### Description

Creates a SODA collection of the given name. If you try to create a
collection, and a collection with the same name already exists, then
that existing collection is opened without error.

Optional metadata allows collection customization.  If metadata is not
supplied, a default collection will be created

Most users will allow `createCollection()` to create the Oracle
Database table used internally to store SODA documents. However the
option `mode` can be used to indicate the collection should be stored
in a table that was previously manually created.

By default, `createCollection()` first attempts to create the Oracle
Database table used internally to store the collection.  If the table
exists already, it will attempt to use it as the table underlying the
collection.

If the optional `mode` parameter is
[`oracledb.SODA_COLL_MAP_MODE`](#oracledbconstantssoda), SODA will
attempt to use a pre-existing table as the table underlying the
collection.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`createCollection()` succeeds, then any open transaction on the
connection is committed.  Note SODA operations do not commit an open
transaction the way that SQL always does for DDL statements.

This method was added in node-oracledb 3.0.

##### <a name="sodadbcreatecollectionname"></a> 9.1.1.1 `createCollection(): collectionName`

Name of the collection to be created.

##### <a name="sodadbcreatecollectionoptions"></a> 9.1.1.2 `createCollection(): options`

```
Object options
```

The options that specify the collection. The following properties can be set.

###### <a name="sodadbcreatecollectionoptsmetadata"></a> 9.1.1.2.1 `metaData`

```
Object metaData
```

Metadata specifying various details about the collection, such as its
database storage, whether it should track version and time stamp
document components, how such components are generated, and what
document types are

If undefined or null, then a default collection metadata description
will be used.  The default metadata specifies that the collection
contains only JSON documents, and is recommend for most SODA users.

For more discussion see [SODA Client-Assigned Keys and Collection
Metadata](#sodaclientkeys).  Also see [SODA Collection Metadata
Components][112].

###### <a name="sodadbcreatecollectionoptsmode"></a> 9.1.1.2.2 `mode`

```
Number mode
```

If `mode` is [`oracledb.SODA_COLL_MAP_MODE`](#oracledbconstantssoda), the
collection will be stored in an externally, previously created table.
A future `sodaCollection.drop()` will not drop the collection table.
It will simply unmap it, making it inaccessible to SODA operations.

Most users will leave `mode` undefined.

##### <a name="sodadbcreatecollectioncb"></a> 9.1.1.3 `createCollection()`: Callback Function

##### Prototype

```
function(Error error, SodaCollection collection)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `createCollection()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
*SodaCollection collection* | The [SodaCollection](#sodacollectionclass) containing zero or more SODA documents, depending whether it is a new or existing collection.

#### <a name="sodadbcreatedocument"></a> 9.1.2 `sodaDatabase.createDocument()`

##### Prototype

```
sodaDatabase.createDocument(String content [, Object options])
sodaDatabase.createDocument(Buffer content [, Object options])
sodaDatabase.createDocument(Object content [, Object options])
```

##### Description

A synchronous method that constructs a proto
[SodaDocument](#sodadocumentclass) object usable for SODA insert and
replace methods.  SodaDocument attributes like `createdOn` will not be
defined, and neither will attributes valid in `options` but not
specified. The document will not be stored in the database until an
insert or replace method is called.

You only need to call `createDocument()` if your collection requires
client-assigned keys or has non-JSON content, otherwise you can pass
your JSON content directly to the SODA insert and replace methods.

This method was added in node-oracledb 3.0.

##### Example

```javascript
myDoc = database.createDocument({name: "Chris", city: "Melbourne"}, {key: 123}); // assuming client-assigned keys
newDoc = await collection.insertOneAndGet(myDoc);
console.log("The key of the new document is: ", newDoc.key);  // 123
```

##### <a name="sodadbcreatedocumentcontent"></a> 9.1.2.1 `createDocument(): content`

```
String content
Buffer content
Object content
```

The document content.

When a Buffer is used, and if the collection `mediaType` is (or will
be) 'application/json' (which is the default media type), then the
JSON must be encoded in UTF-8, UTF-16LE or UTF-16BE otherwise you will
get a SODA error on a subsequent write operation.

##### <a name="sodadbcreatedocumentoptions"></a> 9.1.2.2 `createDocument(): options`

```
Object options
```

The following properties can be set.

###### <a name="sodadbcreatedocumentoptskey"></a> 9.1.2.2.1 `key`

```
String key
```

Must be supplied if the document in intended to be inserted into a
collection with client-assigned keys.  It should be undefined,
otherwise.

###### <a name="sodadbcreatedocumentoptsmediatype"></a> 9.1.2.2.2 `mediaType`

```
String mediaType
```

If the document has non-JSON content, then `mediaType` should be set
to the desired media type.  Using a MIME type is recommended.

The default is 'application/json'.

#### <a name="sodadbgetcollectionnames"></a> 9.1.3 `sodaDatabase.getCollectionNames()`

##### Prototype

Callback:
```
getCollectionNames([Object options,] function(Error error, Array collectionNames){});
```

Promise:
```
promise = getCollectionNames([Object options]);
```

##### Description

Gets an array  of collection names in alphabetical order.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`getCollectionNames()` succeeds, then any open transaction on the
connection is committed.

This method was added in node-oracledb 3.0.

##### <a name="sodadbgetcollectionnamesparams"></a> 9.1.3.1 `getCollectionNames()`: Parameters

###### <a name="sodadbgetcollectionnamesoptions"></a> 9.1.3.1.1 `options`

```
Object options
```

If `options` is undefined, then all collection names will be returned.  Otherwise, it can have the following attributes:

Attribute           | Description
--------------------|------------
*Number limit*      | Limits the number of names returned. If limit is 0 or undefined, then all collection names are returned.
*String startsWith* | Returns names that start with the given string, and all subsequent names, in alphabetic order. For example, if collections with names "cat", "dog", and "zebra" exist, then using `startsWith` of "d" will return "dog" and "zebra".  If `startsWith` is an empty string or undefined, all collection names are returned, subject to the value of `limit`.

##### <a name="sodadbgetcollectionnamescb"></a> 9.1.3.2 `getCollectionNames()`: Callback Function

##### Prototype

```
function(Error error, Array collectionNames)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `getCollectionNames()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
*Array collectionNames* | An array of Strings, each containing the name of a SODA collection in this SODA database. The array is in alphabetical order.

#### <a name="sodadbopencollection"></a> 9.1.4 `sodaDatabase.openCollection()`

##### Prototype

Callback:
```
openCollection(String collectionName, function(Error error, SodaCollection collection){});
```

Promise:
```
promise = openCollection(String collectionName);
```

##### Description

Opens an existing [SodaCollection](#sodacollectionclass) of the given
name.  The collection can then be used to access documents.

If the requested collection does not exist, it is not an
error. Instead, the returned collection value will be undefined.

If [`oracledb.autoCommit`](#propdbisautocommit) is *true*, and
`openCollection()` succeeds, then any open transaction on the
connection is committed.

This method was added in node-oracledb 3.0.

##### <a name="sodadbopencollectionparams"></a> 9.1.4.1 `openCollection()`: Parameters

###### <a name="sodadbopencollectionname"></a> 9.1.4.1.1 `collectionName`

```
String collectionName
```

Name of the collection to open.

##### <a name="sodadbopencollectioncb"></a> 9.1.4.2 `openCollection()`: Callback Function

##### Prototype

```
function(Error error, SodaCollection collection)
```

##### Parameters

Callback function parameter | Description
----------------------------|-------------
*Error error* | If `openCollection()` succeeds, `error` is NULL.  It is not an error if the requested collection does not exist.  If an error occurs, then `error` contains the error message.
*SodaCollection collection* | The requested collection, if one is found.  Otherwise it will be undefined.

## <a name="sodadocumentclass"></a> 10. SodaDocument Class

Note SODA support in node-oracledb is in Preview status and should not
be used in production.  It will be supported with a future version of
Oracle Client libraries.

SodaDocuments represents the document for SODA read and write
operations.

SodaDocument objects can be created in three ways:

- The result of
  [`sodaDatabase.createDocument()`](#sodadbcreatedocument): this is a
  proto SodaDocument object usable for SODA insert and replace
  methods.  The SodaDocument will have content and media type
  components set.  Attributes like `createdOn` will not be defined.
  Optional attributes not specified when calling `createDocument()`
  will also not be defined.

- The result of a read operation from the database, such as calling
  [`sodaOperation.getOne()`](#sodaoperationclassgetone), or from
  [`sodaDocumentCursor.getNext()`](#sodadoccursorgetnext) after a
  [`sodaOperation.getCursor()`](#sodaoperationclassgetcursor) call:
  these return complete SodaDocument objects containing the document
  content and attributes, such as time stamps.

- The result of
  [`sodaCollection.insertOneAndGet()`](#sodacollinsertoneandget)
  or
  [`sodaOperation.replaceOneAndGet()`](#sodaoperationclassreplaceoneandget)
  methods: these return SodaDocuments contain all attributes but do
  not contain the document content itself.  They are useful for
  finding document attributes such as system generated keys and
  versions of new and updated documents.

### <a name="sodadocumentproperties"></a> 10.1 SodaDocument Properties

The available document properties are shown below.  Document content
of queried SodaDocument objects is only accessible via one of the
accessor methods [`getContent()`](#sodadocgetcontent),
[`getContentAsBuffer()`](#sodadocgetcontentasbuffer) or
[`getContentAsString()`](#sodadocgetcontentasstring).

Other properties of a SodaDocument object can be accessed directly.
They are read-only.  The properties for default collections are:

Property              | Description
----------------------|--------------
*readonly String createdOn*    | The creation time of the document as a string in the UTC time zone using an ISO8601 format such as '2018-07-11T01:37:50.123456Z' or '2018-07-11T01:37:50.123Z'. By default, SODA sets this automatically.
*readonly String key*          | A unique key value for this document.  By default, SODA automatically generates the key.
*readonly String lastModified* | Last modified time of the document as a string in the UTC time zone using an ISO8601 format such as '2018-07-11T01:37:50.123456Z' or '2018-07-11T01:37:50.123Z'. By default, SODA sets this automatically.
*readonly String mediaType*    | An arbitrary string value designating the content media type.  The recommendation when creating documents is to use a MIME type for the media type. By default, collections store only JSON document content and this property will be 'application/json'.  This property will be null if the media type is unknown, which will only be in the rare case when a collection was created to store mixed or non-JSON content on top of a pre-existing database table, and that table has NULLs in its `mediaType` column.
*readonly String version*      | Version of the document.  By default, SODA automatically updates the version each time the document is changed.

These properties were added in node-oracledb 3.0.

### <a name="sodadocumentmethods"></a> 10.2 SodaDocument Methods

These methods return the document content stored in a SodaDocument.
Which one to call depends on the content and how you want to use it.
For example, if the document content is JSON, then any of the methods
may be called.  But if the document content is binary, then only
[`getContentAsBuffer()`](#sodadocgetcontentasbuffer) may be called.

Although documents cannot be null, content can be.

#### <a name="sodadocgetcontent"></a> 10.2.1 `sodaDocument.getContent()`

##### Prototype

```
getContent()
```

##### Description

A synchronous method that returns the document content as an object.
An exception will occur if the document content is not JSON and cannot
be converted to an object.

This method was added in node-oracledb 3.0.

#### <a name="sodadocgetcontentasbuffer"></a> 10.2.2 `sodaDocument.getContentAsBuffer()`

##### Prototype

```
getContentAsBuffer()
```

##### Description

A synchronous method that returns the document content as a Buffer.

If the documents were originally created with
[`sodaDatabase.createDocument()`](#sodadbcreatedocument), then
documents are returned as they were created.

For documents fetched from the database where the collection storage
is BLOB (which is the default), and whose `mediaType` is
'application/json', then the buffer returned is identical to that
which was stored.  If the storage is not BLOB, it is UTF-8 encoded.

This method was added in node-oracledb 3.0.

#### <a name="sodadocgetcontentasstring"></a> 10.2.3 `sodaDocument.getContentAsString()`

##### Prototype

```
getContentAsString()
```

##### Description

A synchronous method that returns JSON document content as a String.

An exception will occur if the document content cannot be converted to
a string.

If the document encoding is not known, UTF8 will be used.

This method was added in node-oracledb 3.0.

## <a name="sodadocumentcursorclass"></a> 11. SodaDocumentCursor Class

A SodaDocumentCursor is used to walk through a set of SODA documents
returned from a [`find()`](#sodacollfind)
 [`getCursor()`](#sodaoperationclassgetcursor) method.

### <a name="sodadoccursormethods"></a> 11.1 SodaDocumentCursor Methods

#### <a name="sodadoccursorclose"></a> 11.1.1 `sodaDocumentCursor.close()`

##### Prototype

Callback
```
close(function(Error error){});
```

Promise
```
promise = close();
```

##### Description

This method closes a SodaDocumentCursor. It must be called when the
cursor is no longer required.  It releases resources in node-oracledb
and Oracle Database.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `close()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.

#### <a name="sodadoccursorgetnext"></a> 11.1.2 `sodaDocumentCursor.getNext()`

##### Prototype

Callback:
```
getNext(function(Error error, SodaDocument document){});
```

Promise:
```
promise = getNext();
```

##### Description

This method returns the next [SodaDocument](#sodadocumentclass) in the
cursor returned by a [`find()`](#sodacollfind) terminal method read
operation.

If there are no more documents, the returned `document` parameter will
be undefined.

This method was added in node-oracledb 3.0.

##### Parameters

-   ```
    function(Error error, SodaDocument document)
    ```

    The parameters of the callback function are:

    Callback function parameter | Description
    ----------------------------|-------------
    *Error error* | If `getNext()` succeeds, `error` is NULL.  If an error occurs, then `error` contains the error message.
    *SodaDocument document* | The next document in the cursor.  If there are no more documents, then `document` will be undefined.

## <a name="usermanual"></a> NODE-ORACLEDB USER MANUAL

## <a name="connectionhandling"></a> 12. Connection Handling

In applications which use connections infrequently, create a
connection with [`oracledb.getConnection()`](#getconnectiondb).
Connections should be released with
[`connection.close()`](#connectionclose) when no longer needed:

```javascript
var oracledb = require('oracledb');

var mypw = ...  // set mypw to the hr schema password

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/XEPDB1"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }

    . . .  // use connection

    connection.close(
      function(err) {
        if (err) { console.error(err.message); }
      });
  });
```

Applications which are heavy users of connections should create and
use a [Connection Pool](#connpooling).

### <a name="connectionstrings"></a> 12.1 Connection Strings

The `connectString` parameter for
[`oracledb.getConnection()`](#getconnectiondb) and
[`pool.getConnection()`](#getconnectionpool) can be an [Easy
Connect](#easyconnect) string, or a Net Service Name from a local
[`tnsnames.ora`](#tnsnames) file or external naming service, or it can
be the SID of a local Oracle database instance.

The `connectionString` property is an alias for `connectString`.
Use only one of the properties.

If a connect string is not specified, the empty string "" is used
which indicates to connect to the local, default database.

#### <a name="easyconnect"></a> 12.1.1 Easy Connect Syntax for Connection Strings

An Easy Connect string is often the simplest to use.  With Oracle Database 12 or later
the syntax is:

```
[//]host_name[:port][/service_name][:server_type][/instance_name]
```

Note that old-school connection SIDs are not supported: only service names can be used.

For example, use *"localhost/XEPDB1"* to connect to the database *XE* on the local machine:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "localhost/XEPDB1"
  },
  . . .
```

For more information on Easy Connect strings see [Understanding the
Easy Connect Naming Method][17] in the Oracle documentation.

#### <a name="tnsnames"></a> 12.1.2 Net Service Names for Connection Strings

A Net Service Name, such as `sales` in the example below, can be used
to connect:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "sales"
  },
  . . .
```

This could be defined in a directory server, or in a local
`tnsnames.ora` file, for example:

```
sales =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orcl)
    )
  )
```

Some older databases may use a 'SID' instead of a 'Service Name'.  A
connection string for these databases could look like:

```
sales =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = mymachine.example.com)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SID = orcl)
    )
  )
```

See [Optional Client Configuration Files](#tnsadmin) for where
`tnsnames.ora` files can be located.

For more information on `tnsnames.ora` files and contents see [General
Syntax of tnsnames.ora][18] in the Oracle documentation.

#### <a name="embedtns"></a> 12.1.3 Embedded Connection Strings

Full connection strings can be embedded in applications:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=orcl)))"
  },
  . . .
```

#### <a name="notjdbc"></a> 12.1.4 JDBC and Node-oracledb Connection Strings Compared

Developers familiar with Java connection strings that reference a
service name like:

```
jdbc:oracle:thin:@hostname:port/service_name
```

can use Oracle's Easy Connect syntax in node-oracledb:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "hostname:port/service_name"
  },
  . . .
```

Alternatively, if a JDBC connection string uses an old-style
Oracle system identifier [SID][19], and there is no service name available:

```
jdbc:oracle:thin:@hostname:port:sid
```

then consider creating a [`tnsnames.ora`](#tnsnames) entry, for example:

```
finance =
 (DESCRIPTION =
   (ADDRESS = (PROTOCOL = TCP)(HOST = hostname)(PORT = 1521))
   (CONNECT_DATA =
     (SID = ORCL)
   )
 )
```

This can be referenced in node-oracledb:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "finance"
  },
  . . .
```

### <a name="numberofthreads"></a> 12.2 Connections and Number of Threads

If you open more than four connections, such as via
increasing [`poolMax`](#proppoolpoolmax), you should increase the
number of worker threads available to node-oracledb.  The thread pool
size should be at least equal to the maximum number of connections.
If the application does database and non-database work concurrently,
extra threads could also be required for optimal throughput.

Increase the thread pool size by setting the environment variable
[UV_THREADPOOL_SIZE][20] before starting Node.  For example, in a
Linux terminal, the number of Node.js worker threads can be increased
to 10 by using the following command:

```
$ UV_THREADPOOL_SIZE=10 node myapp.js
```

If the value is set inside the application with
`process.env.UV_THREADPOOL_SIZE` ensure it is set prior to any
asynchronous call that uses the thread pool otherwise the default size
of 4 will still be used.

Note the '[libuv][21]' library used by Node.js limits the number of
threads to 128.  This implies the maxiumum number of connections
opened, i.e. `poolMax`, should be less than 128.

Connections can handle one database operation at a time.  Node.js
worker threads executing database statements on a connection will wait
until [round-trips][124] between node-oracledb and the database are complete.
When an application handles a sustained number of user requests, and
database operations take some time to execute or the network is slow,
then all available threads may be held in use.  This prevents other
connections from beginning work and stops Node.js from handling more
user load.  Increasing the number of worker threads may improve
throughput and prevent [deadlocks][22].

As well as correctly setting the thread pool size, structure your code
to avoid starting parallel operations on a connection.  For example,
instead of using `async.parallel` or `async.each()` which call each
of their items in parallel, use `async.series` or `async.eachSeries()`.
When you use parallel calls on a connection, the queuing ends up being
done in the C layer via a mutex.  However libuv is not aware that a
connection can only do one thing at a time - it only knows when it has
background threads available and so it sends off the work to be done.
If your application runs operations in parallel on a connection, you
could use more than one background thread (perhaps all of them) and
each could be waiting on the one before it to finish its "execute". Of
course other users or transactions cannot use the threads at
that time either.  When you use methods like `async.series` or
`async.eachSeries()`, the queuing is instead done in the main
JavaScript thread.

### <a name="connpooling"></a> 12.3 Connection Pooling

When applications use a lot of connections for short periods, Oracle
recommends using a connection pool for efficiency.  Each node-oracledb
process can use one or more connection pools.  Each pool can contain
one or more connections.  A pool can grow or shrink, as needed.  In
addition to providing an immediately available set of connections,
pools provide [dead connection detection](#connpoolpinging) and
transparently handle Oracle Database [High Availability
events](#connectionha).  This helps shield applications during planned
maintenance and from unplanned failures.  Internally [Oracle Call
Interface Session Pooling][6] is used, which provides many of these
features.

Pools are created by calling [`oracledb.createPool()`](#createpool).
Generally applications will create a pool once as part of
initialization.  After an application finishes using a connection
pool, it should release all connections and terminate the connection
pool by calling the [`pool.close()`](#poolclose) method.

Connections from the pool are obtained with
[`pool.getConnection()`](#getconnectionpool).  If all connections in a
pool are being used, then subsequent `getConnection()` calls will be
put in a [queue](#connpoolqueue).  Connections must be released with
[`connection.close()`](#connectionclose) when no longer needed so they
are available for reuse.  Make sure to release connections in all
codes paths, include error handlers.

When a connection is released back to its pool, any ongoing
transaction will be [rolled back](#transactionmgt) however it will
retain session state, such as [NLS](#nls) settings from ALTER SESSION
statements. See [Connection Tagging and Session
State](#connpooltagging) for more information.

Connections can also be [dropped from the pool](#connectionclose).

In the async/await style:

```javascript
let pool;
try {
  pool = await oracledb.createPool({
    user          : "hr"
    password      : mypw,  // mypw contains the hr schema password
    connectString : "localhost/XEPDB1"
  });

  let connection = await pool.getConnection();
  . . .  // use connection
  await connection.close();  // return connection to the pool

} catch (err) {
  console.error(err.message);
} finally {
  await pool.close();
}
```

#### <a name="conpoolsizing"></a> 12.3.1 Connection Pool Sizing

The [`poolMax`](#propdbpoolmax), [`poolMin`](#propdbpoolmin) and
[`poolPingInterval`](#propdbpoolpinginterval) attributes should be
adjusted to handle the desired workload within the bounds of available
resources in Node.js and the database.

Each connection should be used for a given unit of work, such as a
transaction or a set of sequentially executed statements.  Statements
should be [executed sequentially, not in parallel](#numberofthreads)
on each connection.

If you increase the size of the pool, you must [increase the number of
threads](#numberofthreads) used by Node.js.

The growth characteristics of a connection pool are determined by the
Pool attributes [`poolIncrement`](#proppoolpoolincrement),
[`poolMax`](#proppoolpoolmax), [`poolMin`](#proppoolpoolmin) and
[`poolTimeout`](#proppoolpooltimeout).  Note that when External
Authentication is used, the pool behavior is different, see
[External Authentication](#extauth).

Pool expansion happens when the following are all true: (i)
[`getConnection()`](#getconnectionpool) is called and (ii) all the
currently established connections in the pool are "checked out" by
previous `getConnection()` calls and are in-use by the application,
and (iii) the number of those connections is less than the pool's
`poolMax` setting.

The Oracle Real-World Performance Group's general recommendation for
client connection pools is for the pool to have a fixed sized.  The
values of `poolMin` and `poolMax` should be the same (and
`poolIncrement` equal to zero), and the [resource manager][101] or
user profile [`IDLE_TIME`][100] should not expire idle sessions.  This
avoids connection storms which can decrease throughput.  They also
recommend sizing connection pools so that the sum of all connections
from all applications accessing a database gives 1-10 connections per
database server CPU core.  See [About Optimizing Real-World
Performance with Static Connection Pools][23].

The Pool attribute [`stmtCacheSize`](#propconnstmtcachesize) can be
used to set the statement cache size used by connections in the pool,
see [Statement Caching](#stmtcache).

#### <a name="conpooldraining"></a> 12.3.2 Connection Pool Closing and Draining

Closing a connection pool allows database resources to be freed.  If
Node.js is killed without [`pool.close()`](#poolclose) being called,
it may be some time before the unused database-side of connections are
automatically cleaned up in the database.

When `pool.close()` is called, the pool will be closed only if all
connections have been released to the pool with `connection.close()`.
Otherwise an error is returned and the pool will not be closed.

An optional `drainTime` parameter can be used to force the pool closed
even if connections are in use.  This lets the pool be 'drained' of
connections.  The `drainTime` indicates how many seconds the pool is
allowed to remain active before it and its connections are terminated.
For example, to give active connections 10 seconds to complete their
work before being terminated:

```javascript
await pool.close(10);
```

When a pool has been closed with a specified `drainTime`, then any new
`pool.getConnection()` calls will fail.  If connections are currently
in use by the application, they can continue to be used for the
specified number of seconds, after which the pool and all open
connections are forcibly closed.  Prior to this time limit, if there
are no connections currently "checked out" from the pool with
`getConnection()`, then the pool and its connections are immediately
closed.

In network configurations that drop (or in-line) out-of-band breaks,
forced pool termination may hang unless you have
[`DISABLE_OOB=ON`][122] in a `sqlnet.ora` file, see [Optional Client
Configuration Files](#tnsadmin).

Non-zero `drainTime` values are recommended so applications
have the opportunity to gracefully finish database operations, however
pools can be forcibly closed by specifying a zero drain time:

```javascript
await pool.close(0);
```

Closing the pool would commonly be one of the last stages of a Node.js
application.  A typical closing routine look likes:

```javascript
// Close the default connection pool with 10 seconds draining, and exit
async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    await oracledb.getPool().close(10);
    process.exit(0);
  } catch(err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

It is helpful to invoke `closePoolAndExit()` if Node.js is
sent a signal or interrupted:

```javascript
// Close the pool cleanly if Node.js is interrupted
process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT',  closePoolAndExit);
```

#### <a name="connpoolcache"></a> 12.3.3 Connection Pool Cache

When pools are created, they can be given a named alias.  The alias
can later be used to retrieve the related pool object for use.  This
facilitates sharing pools across modules and simplifies getting
connections.

Pools are added to the cache by using a
[`poolAlias`](#createpoolpoolattrspoolalias) property in the
[`poolAttrs`](#createpoolpoolattrs) object::

```javascript
oracledb.createPool (
  {
    user: 'hr',
    password: mypw,  // mypw contains the hr schema password
    connectString: 'localhost/XEPDB1',
    poolAlias: 'hrpool'
  },
  function(err) {  // callback 'pool' parameter can be omitted
    . . . // get the pool from the cache and use it
  }
);
```

There can be multiple pools in the cache if each pool is created with
a unique alias.

If a pool is created without providing a pool alias, and a pool with
an alias of 'default' is not in the cache already, this pool will be
cached using the alias 'default'.  This pool is used by default in
methods that utilize the connection pool cache.  If subsequent pools
are created without explicit aliases, they will be not stored in the
pool cache.

Methods that can affect or use the connection pool cache include:
- [oracledb.createPool()](#createpool) - can add a pool to the cache
- [oracledb.getPool()](#getpool) - retrieves a pool from the cache
- [oracledb.getConnection()](#getconnectiondb) - can use a pool in the cache to retrieve connections
- [pool.close()](#poolclose) - automatically removes a pool from the cache

##### Using the Default Pool

Assuming the connection pool cache is empty, the following will create a new pool
and cache it using the pool alias 'default':

```javascript
oracledb.createPool (
  {
    user: 'hr',
    password: mypw,  // mypw contains the hr schema password
    connectString: 'localhost/XEPDB1'
  },
  function(err, pool) {
    console.log(pool.poolAlias); // 'default'
    . . . // Use pool
  }
);
```

Note that `createPool()` is not synchronous.

Once cached, the default pool can be retrieved using [oracledb.getPool()](#getpool) without
passing the `poolAlias` parameter:

```javascript
var pool = oracledb.getPool();

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

This specific sequence can be simplified by using the shortcut to
[oracledb.getConnection()](#getconnectiondb) that returns a connection
from a pool:

```javascript
oracledb.getConnection(function(err, conn) {
  . . . // Use connection from the previously created 'default' pool and then release it
});
```

##### Using Multiple Pools

If the application needs to use more than one pool at a time, unique pool aliases
can be used when creating the pools:

```javascript
var oracledb = require('oracledb');

var hrPoolPromise = oracledb.createPool({
  poolAlias: 'hrpool',
  users: 'hr',
  password: mypw,  // mypw contains the hr schema password
  connectString: 'localhost/XEPDB1'
});

var shPoolPromise = oracledb.createPool({
  poolAlias: 'shpool',
  user: 'sh',
  password: mypw,  // mypw contains the sh schema password
  connectString: 'localhost/XEPDB1'
});

Promise.all([hrPoolPromise, shPoolPromise])
  .then(function(pools) {
    console.log(pools[0].poolAlias); // 'hrpool'
    console.log(pools[1].poolAlias); // 'shpool'
  })
  .catch(function(err) {
    . . . // handle error
  })
```

To use the methods or attributes of a pool in the cache, a pool can be retrieved
from the cache by passing its pool alias to [oracledb.getPool()](#getpool):

```javascript
var pool = oracledb.getPool('hrpool'); // or 'shpool'

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

The [oracledb.getConnection()](#getconnectiondb) shortcut can also be used with a pool alias:

```javascript
oracledb.getConnection('hrpool', function(err, conn) { // or 'shpool'
  . . . // Use connection from the pool and then release it
});
```

From node-oracledb 3.1.0 you can pass the alias as an attribute of the
options:

```javascript
oracledb.getConnection({ poolAlias: 'hrpool' }, function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

The presence of the `poolAlias` attribute indicates the previously
created connection pool should be used instead of creating a
standalone connection.  This syntax is useful when you want to pass
other attributes to a pooled `getConnection()` call, such as for
[proxy connections](#connpoolproxy) or with [connection
tagging](#connpooltagging):

```javascript
oracledb.getConnection({ poolAlias: 'hrpool', tag: 'loc=au' }, function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

To use the default pool in this way you must explicitly pass the alias
`default`:

```javascript
oracledb.getConnection({ poolAlias: 'default' tag: 'loc=cn;p=1' }, function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

#### <a name="connpoolqueue"></a> 12.3.4 Connection Pool Queue

If the application has called `getConnection()` so that all
connections in the pool are in use, and
further [`pool.getConnection()`](#getconnectionpool) requests
(or [`oracledb.getConnection()`](#getconnectiondb) calls that use a
pool) are made, then each new request will be queued until an in-use
connection is released back to the pool
with [`connection.close()`](#connectionclose).  If `poolMax` has not
been reached, then connections can be satisfied and are not queued.

The amount of time that a queued request will wait for a free
connection can be configured with [queueTimeout](#propdbqueuetimeout).
When connections are timed out of the queue, they will return the
error *NJS-040: connection request timeout* to the application.

Internally the queue is implemented in node-oracledb's JavaScript top
level.  A queued connection request is dequeued and passed down to
node-oracledb's underlying C++ connection pool when an active
connection is [released](#connectionclose), and the number of
connections in use drops below the value of
[`poolMax`](#proppoolpoolmax).

#### <a name="connpoolmonitor"></a> 12.3.5 Connection Pool Monitoring and Throughput

Connection pool usage should be monitored to choose the appropriate
connection pool settings for your workload.

The Pool attributes [`connectionsInUse`](#proppoolconnectionsinuse)
and [`connectionsOpen`](#proppoolconnectionsopen) provide basic
information about an active pool.

Further statistics can be enabled by setting the
[`createPool()`](#createpool) `poolAttrs` parameter `_enableStats` to
*true*.  Statistics can be output to the console by calling the
`pool._logStats()` method.  The underscore prefixes indicate that
these are private attributes and methods.  **This interface may be
altered or enhanced in the future**.

To enable recording of queue statistics:

```javascript
oracledb.createPool (
  {
    _enableStats  : true,   // default is false
    user          : "hr",
    password      : mypw,   // mypw contains the hr schema password
    connectString : "localhost/XEPDB1"
  },
  function(err, pool) {
  . . .
```

The application can later, on some developer-chosen event, display the
current statistics to the console by calling:

```javascript
pool._logStats();
```

The current implementation of `_logStats()` displays pool queue
statistics, pool settings, and related environment variables.

##### Statistics

The statistics displayed by `_logStats()` in this release are:

Statistic                 | Description
--------------------------|-------------
total up time             | The number of milliseconds this pool has been running.
total connection requests | Number of `getConnection()` requests made by the application to this pool.
total requests enqueued   | Number of `getConnection()` requests that could not be immediately satisfied because every connection in this pool was already being used, and so they had to be queued waiting for the application to return an in-use connection to the pool.
total requests dequeued   | Number of `getConnection()` requests that were dequeued when a connection in this pool became available for use.
total requests failed     | Number of `getConnection()` requests that invoked the underlying C++ `getConnection()` callback with an error state. Does not include queue request timeout errors.
total request timeouts    | Number of queued `getConnection()` requests that were timed out after they had spent [queueTimeout](#propdbqueuetimeout) or longer in this pool's queue.
max queue length          | Maximum number of `getConnection()` requests that were ever waiting at one time.
sum of time in queue      | The sum of the time (milliseconds) that dequeued requests spent in the queue.
min time in queue         | The minimum time (milliseconds) that any dequeued request spent in the queue.
max time in queue         | The maximum time (milliseconds) that any dequeued request spent in the queue.
avg time in queue         | The average time (milliseconds) that dequeued requests spent in the queue.
pool connections in use   | The number of connections from this pool that `getConnection()` returned successfully to the application and have not yet been released back to the pool.
pool connections open     | The number of connections in this pool that have been established to the database.

Note that for efficiency, the minimum, maximum, average, and sum of
times in the queue are calculated when requests are removed from the
queue.  They do not take into account times for connection requests
still waiting in the queue.

##### Attribute Values

The `_logStats()` method also shows attribute values of the pool:

Attribute                                   |
--------------------------------------------|
[`poolAlias`](#createpoolpoolattrspoolalias)|
[`queueTimeout`](#propdbqueuetimeout)       |
[`poolMin`](#propdbpoolmin)                 |
[`poolMax`](#propdbpoolmax)                 |
[`poolIncrement`](#propdbpoolincrement)     |
[`poolTimeout`](#propdbpooltimeout)         |
[`poolPingInterval`](#propdbpoolpinginterval) |
[`sessionCallback`](#createpoolpoolattrscallback)|
[`stmtCacheSize`](#propdbstmtcachesize)     |

##### Pool Status

The `_logStats()` method also shows the pool status:

Attribute                   |
----------------------------|
[`status`](#proppoolstatus) |

##### Related Environment Variables

One related environment variable is is shown by `_logStats()`:

Environment Variable                                 | Description
-----------------------------------------------------|-------------
[`process.env.UV_THREADPOOL_SIZE`](#numberofthreads) | The number of worker threads for this process.  Note this shows the value of the variable, however if this variable was set after the thread pool starts, the thread pool will actually be the default size of 4.

#### <a name="connpoolpinging"></a> 12.3.6 Connection Pool Pinging

Connection pool pinging is a way for node-oracledb to identify
unusable pooled connections and replace them with usable ones before
returning them to the application.  Database connections may become
unusable due to network dropouts, database instance failures,
exceeding user profile resource limits, or by explicit session closure
from a DBA.  By default, idle connections in the pool are unaware of
these events so the pool could return unusable connections to the
application and errors would only occur when they are later used.
Pinging helps provide tolerance against this situation.

The frequency of pinging can be controlled with the
[`oracledb.poolPingInterval`](#propdbpoolpinginterval) property or
during [pool creation](#createpoolpoolattrspoolpinginterval) to meet
your quality of service requirements.

The default [`poolPingInterval`](#propdbpoolpinginterval) value is 60
seconds.  Possible values are:

`poolPingInterval` Value     | Behavior of a Pool `getConnection()` Call
----------|------------------------------------------
`n` < `0` | Never checks for connection aliveness
`n` = `0` | Always checks for connection aliveness
`n` > `0` | Checks aliveness if the connection has been idle in the pool (not "checked out" to the application by `getConnection()`) for at least `n` seconds

A ping has the cost of a [round-trip][124] to the database so always pinging
after each `getConnection()` is not recommended for most applications.

When `getConnection()` is called to return a pooled connection, and
the connection has been idle in the pool (not "checked out" to the
application by `getConnection()`) for the specified `poolPingInterval`
time, then an internal "ping" will be performed first.  If the ping
detects the connection is invalid then node-oracledb internally drops
the unusable connection and obtains another from the pool.  This
second connection may also need a ping.  This ping-and-release process
may be repeated until:

- an existing connection that does not qualify for pinging is obtained.  The `getConnection()` call returns this to the application.  Note that since a ping may not have been performed, the connection is not guaranteed to be usable
- a new, usable connection is opened. This is returned to the application
- a number of unsuccessful attempts to find a valid connection have been made, after which an error is returned to the application

Pools in active use may never have connections idle longer than
`poolPingInterval`, so pinging often only occurs for infrequently
accessed connection pools.

Because a ping may not occur every time a connection is returned from
[`getConnection()`](#getconnectionpool), and also it is possible for
network outages to occur after `getConnection()` is called,
applications should continue to use appropriate statement execution
error checking.

When node-oracledb is using the Oracle client library version 12.2 or
later, then a lightweight connection check always occurs in the client
library.  While this check prevents some unusable connections from
being returned by `getConnection()`, it does not identify errors such
as session termination from the database [resource manager][101] or
user resource profile [`IDLE_TIME`][100], or from an `ALTER SYSTEM
KILL SESSION` command.  The explicit ping initiated by
`poolPingInterval` will detect these problems.

For ultimate scalability, use Oracle client 12.2 (or later) libraries,
disable explicit pool pinging by setting `poolPingInterval` to a
negative value, and make sure the firewall, database resource manager,
or user profile is not expiring idle sessions.

In all cases, when a bad connection is released back to the pool with
[connection.close()](#connectionclose), the connection is
automatically destroyed.  This allows a valid connection to the
database to be opened by some subsequent `getConnection()` call.

Explicit pings can be performed at any time with
[`connection.ping()`](#connectionping).

#### <a name="connpooltagging"></a> 12.3.7 Connection Tagging and Session State

Applications can set "session" state in each connection, such as
[NLS](#nls) settings from ALTER SESSION statements.  Pooled
connections will retain this session state after they have been
released back to the pool with `connection.close()`.  However, because
pools can grow, or connections in the pool can be recreated, there is
no guarantee a subsequent `pool.getConnection()` call will return a
database connection that has any particular state.

The [`oracledb.createPool()`](#createpool) option attribute
[`sessionCallback`](#createpoolpoolattrssessioncallback) can be used
to set session state efficiently so that connections have a known
session state.  The `sessionCallback` can be a Node.js function that
will be called whenever `pool.getConnection()` will return a newly
created database connection that has not been used before.  It is also
called when connection tagging is being used and the requested tag is
not identical to the tag in the connection returned by the pool.  It
is called before `pool.getConnection()` returns in these two cases.
It will not be called in other cases.  Using a callback saves the cost
of setting session state if a previous user of a connection has
already set it.  The caller of `pool.getConnection()` can always
assume the correct state is set.

###### <a name="sessionfixupnode"></a> Node.js Callback

This example sets two NLS settings in each pooled connection.  They
are only set the very first time connections are established to the
database.  The `requestedTag` parameter is ignored because it is only
valid when tagging is being used:

```javascript
function initSession(connection, requestedTag, cb) {
  connection.execute(
    `alter session set nls_date_format = 'YYYY-MM-DD' nls_language = AMERICAN`,
    cb);
}

try {
  let pool = await oracledb.createPool({
               user: 'hr',
               password: mypw,  // mypw contains the hr schema password
               connectString: 'localhost/XEPDB1',
               sessionCallback: initSession
             });
  . . .
}
```

If you need to execute multiple SQL statements in the callback, use an
anonymous PL/SQL block to save [round-trips][124] of repeated
`execute()` calls:

```javascript
connection.execute(
  `begin
     execute immediate
       'alter session set nls_date_format = ''YYYY-MM-DD'' nls_language = AMERICAN';
     -- other SQL statements could be put here
   end;`,
  cb);
```

See [`sessionfixup.js`][126] for a runnable example.

Connection tagging and `sessionCallback` are new features in
node-oracledb 3.1.

##### Connection Tagging

Pooled connections can be tagged to record their session state by
setting the property [`connection.tag`](#propconntag) to a string.  A
`pool.getConnection({tag: 'mytag'})` call can request a connection
that has the specified tag.  If no available connections with that tag
exist in the pool, an untagged connection or a connection with a new
session will be returned.  If the optional `getConnection()` attribute
`matchAnyTag` is *true*, then a connection that has a different tag
may be returned.

The [`sessionCallback`](#createpoolpoolattrssessioncallback) function
is invoked before `pool.getConnection()` returns if the requested tag
is not identical to the actual tag of the pooled connection.  The
callback can compare the requested tag with the current actual tag in
`connection.tag`.  Any desired state change can be made to the
connection and `connection.tag` can be updated to record the change.
The best practice recommendation is to set the tag in the callback
function but, if required, a tag can be set anytime prior to closing
the connection.  To clear a connection's tag set `connection.tag` to
an empty string.

You would use tagging where you want `pool.getConnection()` to return
a connection which has one of several different states.  If all
connections should have the same state then you can simply set
`sessionCallback`, as shown [earlier](#sessionfixupnode), and not use
tagging.  Also, it may not be worthwhile using huge numbers of
different tags or using tagging where connections are being
[dropped](#connectionclose) or recreated frequently since the chance
of `pool.getConnection()` returning an already initialized connection
with the requested tag could be low, so most `pool.getConnection()`
calls would return a connection needing its session reset, and tag
management will just add overhead.

When node-oracledb is using Oracle Client libraries 12.2 or later,
then node-oracledb uses 'multi-property tags' and the tag string must
be of the form of one or more "name=value" pairs separated by a
semi-colon, for example `"loc=uk;lang=cy"`.  The Oracle [session
pool][6] used by node-oracledb has various heuristics to determine
which connection is returned to the application.  Refer to the
[multi-property tags documentation][125].  The callback function can
parse the requested multi-property tag and compare it with the
connection's actual properties in [`connection.tag`](#propconntag) to
determine what exact state to set and what value to update
`connection.tag` to.

###### <a name="sessiontaggingnode"></a> Node.js Session Tagging Callback

This example Node.js callback function ensures the connection contains
valid settings for an application-specific "location=USA" property and
ignores any other properties in the tag that represent session state
set by other parts of the application (not shown) that are using the
same pool:

```javascript
const sessionTag = "location=USA";

function initSession(connection, requestedTag, cb) {
  connection.tag = "LOCATION=GB";
  let seen = connection.tag ? connection.tag.split(";").includes(requestedTag) : false;
  if (seen) {
    cb()
  } else {
    connection.execute(
      `ALTER SESSION SET NLS_DATE_FORMAT = 'MM/DD/YY' NLS_LANGUAGE = AMERICAN`,
      (err) => {
        // Update the tag the record the connection's new state
        let k = requestedTag.substr(0, requestedTag.indexOf('=')+1);
        if (connection.tag.indexOf(k) >= 0) {
          // Update value of an existing, matching property in the tag
          let re = new RegExp(k + "[^;]*");
          connection.tag = connection.tag.replace(re, requestedTag);
        } else {
          // the requested property was not previously set in the tag
          connection.tag = requestedTag + ';' + connection.tag;
        }
        cb();
     });
  }
}

try {
  await oracledb.createPool({
               user: 'hr',
               password: mypw,  // mypw contains the hr schema password
               connectString: 'localhost/XEPDB1',
               sessionCallback: initSession
             });

  // Request a connection with a given tag from the pool cache, but accept any tag being returned.
  let connection = await oracledb.getConnection({poolAlias: 'default', tag: sessionTag, matchAnyTag: true});

  . . . // Use the connection

  // The connection will be returned to the pool with the tag value of connection.tag
  await connection.close();

  . . .
```

For runnable examples, see [`sessiontagging1.js`][127] and [`sessiontagging2.js`][128].

###### <a name="sessiontaggingplsql"></a> PL/SQL Session Tagging Callback

When node-oracledb is using Oracle Client libraries 12.2 or later,
`sessionCallback` can be a string containing the name of a PL/SQL
procedure that is called when the requested tag does not match the
actual tag in the connection.  When the application uses [DRCP
connections](#drcp), a PL/SQL callback can avoid the [round-trip][124]
calls that a Node.js function would require to set session state.  For
non-DRCP connections, the PL/SQL callback will require a round-trip
from the application.

After a PL/SQL callback completes and `pool.getConnection()` returns,
[`connection.tag`](#propconntag) will have the same property values as
the requested tag.  The property order may be different.  For example
you may request "USER_TZ=UTC;LANGUAGE=FRENCH" but `connection.tag` may
be "LANGUAGE=FRENCH;USER_TZ=UTC".  When `matchAnyTag` is *true*, then
various heuristics are used to determine which connection in the pool
to use.  See the [multi-property tags documentation][125].  Additional
properties may be present in `connection.tag`.

There is no direct way for Node.js to know if the PL/SQL procedure was
called or what session state it changed.  After `pool.getConnection()`
returns, care must be taken to set `connection.tag` to an appropriate
value.

A sample PL/SQL callback procedure looks like:

```sql
CREATE OR REPLACE PACKAGE myPackage AS
  TYPE property_t IS TABLE OF VARCHAR2(64) INDEX BY VARCHAR2(64);
  PROCEDURE buildTab(
    tag          IN  VARCHAR2,
    propertyTab  OUT property_t
  );
  PROCEDURE myPlsqlCallback (
    requestedTag IN  VARCHAR2,
    actualTag    IN  VARCHAR2
  );
END;
/

CREATE OR REPLACE PACKAGE BODY myPackage AS

  -- Parse the "property=value" pairs in the tag
  PROCEDURE buildTab(tag IN VARCHAR2, propertyTab OUT property_t) IS
    property  VARCHAR2(64);
    propertyName  VARCHAR2(64);
    propertyValue VARCHAR2(64);
    propertyEndPos NUMBER := 1;
    propertyStartPos NUMBER := 1;
    propertyNameEndPos NUMBER := 1;
  begin
    WHILE (LENGTH(tag) > propertyEndPos)
    LOOP
      propertyEndPos := INSTR(tag, ';', propertyStartPos);
      IF (propertyEndPos = 0) THEN
        propertyEndPos := LENGTH(tag) + 1;
      END IF;
      propertyNameEndPos := INSTR(tag, '=', propertyStartPos);
      propertyName := SUBSTR(tag, propertyStartPos,
                   propertyNameEndPos - propertyStartPos);
      propertyValue := SUBSTR(tag, propertyNameEndPos + 1,
                    propertyEndPos - propertyNameEndPos - 1);
      propertyTab(propertyName) := propertyValue;
      propertyStartPos := propertyEndPos + 1;
    END LOOP;
  END;

  PROCEDURE myPlsqlCallback (
    requestedTag IN VARCHAR2,
    actualTag IN VARCHAR2
  ) IS
    reqPropTab property_t;
    actPropTab property_t;
    propertyName VARCHAR2(64);
  BEGIN
    buildTab(requestedTag, reqPropTab);
    buildTab(actualTag, actPropTab);

    -- Iterate over requested properties to set state when it's not
    -- currently set, or not set to the desired value
    propertyName := reqPropTab.FIRST;
    WHILE (propertyName IS NOT NULL)
    LOOP
      IF ((NOT actPropTab.exists(propertyName)) OR
         (actPropTab(propertyName) != reqPropTab(propertyName))) THEN
        IF (propertyName = 'SDTZ') THEN
          EXECUTE IMMEDIATE
            'ALTER SESSION SET TIME_ZONE=''' || reqPropTab(propertyName) || '''';
        ELSE
          RAISE_APPLICATION_ERROR(-20001,'Unexpected session setting requested');
        END IF;
      END IF;
      propertyName := reqPropTab.NEXT(propertyName);
    END LOOP;
    -- Could iterate over other actual properties to set any to a default state
  END;

END myPackage;
/
```

This could be used in your application like:

```javascript
const sessionTag = "SDTZ=UTC";

try {
  let pool = await oracledb.createPool({
               user: 'hr',
               password: mypw,  // mypw contains the hr schema password
               connectString: 'localhost/XEPDB1',
               sessionCallback: "myPackage.myPlsqlCallback"
             });
  . . .

  let connection = await pool.getConnection({tag: sessionTag});

  . . . // The value of connection.tag will be sessionTag
        // Use connection.

  await connection.close();
}
```

#### <a name="connpoolproxy"></a> 12.3.8 Heterogeneous Connection Pools and Pool Proxy Authentication

By default, connection pools are 'homogeneous' meaning that all
connections use the same database credentials.  However, if the pool
option [`homogeneous`](#createpoolpoolattrshomogeneous) is *false* at
pool creation, then a 'heterogeneous' pool will be created.  This
allows different credentials to be used each time a connection is
acquired from the pool with
[`pool.getConnection()`](#getconnectionpool).

##### Heterogeneous Pools

When a heterogeneous pool is created by setting
[`homogeneous`](#createpoolpoolattrshomogeneous) to *false* and no
credentials supplied during pool creation, then a user name and
password may be passed to `pool.getConnection()`:

```javascript
oracledb.createPool(
  {
    connectString : "localhost/XEPDB1",  // no user name or password
    homogeneous   : false,
    . . .  // other pool options such as poolMax can be used
  },
  function(err, pool) {
    pool.getConnection(
      {
        user     : 'hr',
        password : mypw,  // mypw contains the hr schema password
      },
      function (err, conn) {

      . . . // use connection

        conn.close(
          function(err) {
            if (err) { console.error(err.message); }
          });
      });
  });
```

The `connectString` is required during pool creation since the pool is
created for one database instance.

Different user names may be used each time `pool.getConnection()` is
called.

When applications want to use connection pools but are not able to use
[`connection.clientId`](#propconnclientid) to distinguish application
users from database schema owners, a 'heterogeneous' connection pool
might be an option.

Note heterogeneous pools cannot be used with the [connection pool
cache](#connpoolcache).  Applications should ensure the pool object is
explicitly passed between code modules, or use a homogeneous pool and
make use of [`connection.clientId`](#propconnclientid).

For heterogeneous pools, the number of connections initially created
is zero even if a larger value is specified for
[`poolMin`](#propdbpoolmin).  The pool increment is always 1,
regardless of the value of
[`poolIncrement`](#createpoolpoolattrspoolincrement).  Once the number
of open connections exceeds `poolMin` and connections are idle for
more than the [`poolTimeout`](#propdbpooltimeout) seconds, then the
number of open connections does not fall below `poolMin`.

##### Pool Proxy Authentication

Pool proxy authentication requires a heterogeneous pool.

The idea of a proxy is to create a schema in one database user name.
Privilege is granted on that schema to other database users so they
can access the schema and manipulate its data.  This aids three-tier
applications where one user owns the schema while multiple end-users
access the data.

To grant access, typically a DBA would execute:

```sql
ALTER USER sessionuser GRANT CONNECT THROUGH proxyuser;
```

For example, to allow a user called `MYPROXYUSER` to access the schema
of `HR`:

```
SQL> CONNECT system

SQL> ALTER USER hr GRANT CONNECT THROUGH myproxyuser;

SQL> CONNECT myproxyuser[hr]/myproxyuserpassword

SQL> SELECT SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER,
  2         SYS_CONTEXT('USERENV', 'PROXY_USER')   AS PROXY_USER
  3  FROM DUAL;

SESSION_USER         PROXY_USER
-------------------- --------------------
HR                   MYPROXYUSER
```

See the [Client Access Through a Proxy][7] section in the Oracle Call
Interface manual for more details about proxy authentication.

To use the proxy user with a node-oracledb heterogeneous connection
pool you could do:

```javascript
let myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

let pool = await oracledb.createPool({ connectString: "localhost/orclpdb", homogeneous: false });
let conn = await pool.getConnection({ user: 'myproxyuser[hr]', password: myproxyuserpw});

. . . // connection has access to the HR schema objects

await conn.close();
```

Other proxy cases are supported such as:

```javascript
let myproxyuserpw = ... // the password of the 'myproxyuser' proxy user

let pool = await oracledb.createPool(
  {
    user          : 'myproxyuser',
    password      : myproxyuserpw,
    connectString : "localhost/XEPDB1",
    homogeneous   : false,
    . . .  // other pool options such as poolMax can be used
  });

let conn = pool.getConnection({ user : 'hr' });  // the session user

. . . // connection has access to the HR schema objects

await conn.close();
```

### <a name="extauth"></a> 12.4 External Authentication

External Authentication allows applications to use an external
password store (such as an [Oracle Wallet][27]), the [Secure Socket
Layer][28] (SSL), or the [operating system][29] to validate user
access.  One of the benefits is that database credentials do not need
to be hard coded in the application.

To use external authentication, set the
[`oracledb.externalAuth`](#propdbisexternalauth) property to *true*.  This property can
also be set in the `connAttrs` or `poolAttrs` parameters of the
[`oracledb.getConnection()`](#getconnectiondb) or
[`oracledb.createPool()`](#createpool) calls, respectively.

When `externalAuth` is set, any subsequent connections obtained using
the [`oracledb.getConnection()`](#getconnectiondb) or
[`pool.getConnection()`](#getconnectionpool) calls will use external
authentication.  Setting this property does not affect the operation
of existing connections or pools.

For a standalone connection:

```javascript
let config = { connectString: "localhost/orclpdb", externalAuth: true };
let conn = await oracledb.getConnection(config);

. . . // connection has access to the schema objects of the externally identified user
```

If a user `HR` has been given the `CONNECT THROUGH` grant from the
externally identified user `MYPROXYUSER`:

```sql
ALTER USER hr GRANT CONNECT THROUGH myproxyuser;
```

then to specify that the session user of the connection should be
`HR`, use:

```javascript
let config = { connectString: "localhost/orclpdb", user: "[hr]", externalAuth: true };
let conn = await oracledb.getConnection(config);

. . . // connection has access to the HR schema objects
```

For a *Pool*, you can authenticate as an externally identified user like:

```javascript
let config = { connectString: "localhost/orclpdb", externalAuth: true };
let pool = await oracledb.createPool(config);
let conn = await pool.getConnection();

. . . // connection has access to the schema objects of the externally identified user

await conn.close();
```

If a user `HR` has been given the `CONNECT THROUGH` grant from the
externally identified user, then to specify that the session user of
the connection should be `HR`, use:

```javascript
let config = { connectString: "localhost/orclpdb", externalAuth: true };
let pool = await oracledb.createPool(config);
let conn = await pool.getConnection({ user: "[hr]" });

. . . // connection has access to the HR schema objects

await conn.close();
```

Note this last case needs Oracle Client libraries version 18 or later.

Using `externalAuth` in the `connAttrs` parameter of a
`pool.getConnection()` call is not possible.  The connections from a *Pool*
object are always obtained in the manner in which the pool was
initially created.

For pools created with external authentication, the number of
connections initially created is zero even if a larger value is
specified for [`poolMin`](#propdbpoolmin).  The pool increment is
always 1, regardless of the value of
[`poolIncrement`](#proppoolpoolincrement).  Once the number
of open connections exceeds `poolMin` and connections are idle for
more than the [`poolTimeout`](#propdbpooltimeout) seconds, then the
number of open connections does not fall below `poolMin`.

### <a name="drcp"></a> 12.5 Database Resident Connection Pooling (DRCP)

[Database Resident Connection Pooling][24] (DRCP) enables database
resource sharing for applications that run in multiple client
processes or run on multiple middle-tier application servers.  DRCP
reduces the overall number of connections that a database must handle.

DRCP is useful for applications which share the same database credentials, have
similar session settings (for example date format settings and PL/SQL
package state), and where the application gets a database connection,
works on it for a relatively short duration, and then releases it.

To use DRCP in node-oracledb:

1. The DRCP pool must be started in the database: `SQL> execute dbms_connection_pool.start_pool();`
2. The [`connectionClass`](#propdbconclass) should be set by the node-oracledb application.  If it is not set, the pooled server session memory will not be reused optimally, and the statistic views will record large values for `NUM_MISSES`.
3. The `pool.createPool()` or `oracledb.getConnection()` property `connectString` (or its alias `connectionString`) must specify to use a pooled server, either by the Easy Connect syntax like [`myhost/sales:POOLED`](#easyconnect), or by using a [`tnsnames.ora`](#tnsnames) alias for a connection that contains `(SERVER=POOLED)`.

For efficiency, it is recommended that DRCP connections should be used
with node-oracledb's local [connection pool](#poolclass).

The DRCP 'Purity' is SELF for DRCP connections.  This allows reuse of
both the pooled server process and session memory, giving maximum
benefit from DRCP.  See the Oracle documentation on [benefiting from
scalability][25].

The [Oracle DRCP documentation][24] has more details, including when
to use, and when not to use DRCP.

There are a number of Oracle Database `V$` views that can be used to
monitor DRCP.  These are discussed in the Oracle documentation and in
the Oracle white paper [PHP Scalability and High Availability][26].
This paper also gives more detail on configuring DRCP.

### <a name="privconn"></a> 12.6 Privileged Connections

Database privileges such as `SYSDBA` can be obtained when using
standalone connections.  Use one of the [Privileged Connection
Constants](#oracledbconstantsprivilege) with the connection
[`privilege`](#getconnectiondbattrsprivilege) property, for example:

```
oracledb.getConnection(
  {
    user          : 'sys',
    password      : 'secret',
    connectString : 'localhost/orclpdb',
    privilege     : oracledb.SYSDBA
  },
  function(err, connection) {
    if (err)
      console.error(err);
    else
      console.log('I have power');
  }
);
```

Note that if node-oracledb is using the Oracle client libraries
located in the Oracle Database installation, i.e. is on the same
machine as the database and is not using Oracle Instant Client, then
operating system privileges may be used for authentication.  In this
case the password value is ignored.  For example on Linux, membership
of the operating system [`dba`][96] group allows `SYSDBA` connections.

Administrative privileges can allow access to a database instance even
when the database is not open.  Control of these privileges is totally
outside of the database itself.  Care must be taken with
authentication to ensure security.  See the [Database Administrators
Guide][90] for information.

### <a name="securenetwork"></a> 12.7 Securely Encrypting Network Traffic to Oracle Database

Data transferred between Oracle Database and the Oracle client
libraries used by node-oracledb can be [encrypted][30] so that
unauthorized parties are not able to view plain text data as it passes
over the network.  The easiest configuration is Oracle's native
network encryption.  The standard SSL protocol can also be used if you
have a PKI, but setup is necessarily more involved.

With native network encryption, the client and database server
negotiate a key using Diffie-Hellman key exchange.  There is
protection against man-in-the-middle attacks.

Native network encryption can be configured by editing Oracle Net's
optional `sqlnet.ora` configuration files, on either the database server
and/or on each node-oracledb 'client'.  Parameters control whether
data integrity checking and encryption is required or just allowed,
and which algorithms the client and server should consider for use.

As an example, to ensure all connections to the database are checked
for integrity and are also encrypted, create or edit the Oracle
Database `$ORACLE_HOME/network/admin/sqlnet.ora` file.  Set the
checksum negotiation to always validate a checksum and set the
checksum type to your desired value.  The network encryption settings
can similarly be set.  For example, to use the SHA512 checksum and
AES256 encryption use:

```
SQLNET.CRYPTO_CHECKSUM_SERVER = required
SQLNET.CRYPTO_CHECKSUM_TYPES_SERVER = (SHA512)
SQLNET.ENCRYPTION_SERVER = required
SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)
```

If you definitely know that the database server enforces integrity and
encryption, then you do not need to configure Node.js separately.
However you can also, or alternatively, do so depending on your
business needs.  Create a `sqlnet.ora` and locate it with other
[Optional Client Configuration Files](#tnsadmin):

```
SQLNET.CRYPTO_CHECKSUM_CLIENT = required
SQLNET.CRYPTO_CHECKSUM_TYPES_CLIENT = (SHA512)
SQLNET.ENCRYPTION_CLIENT = required
SQLNET.ENCRYPTION_TYPES_CLIENT = (AES256)
```

The client and server sides can negotiate the protocols used if the
settings indicate more than one value is accepted.

Note these are example settings only.  You must review your security
requirements and read the documentation for your Oracle version.  In
particular review the available algorithms for security and
performance.

The `NETWORK_SERVICE_BANNER` column of the database view
[`V$SESSION_CONNECT_INFO`][31] can be used to verify the encryption
status of a connection.

For more information about Oracle Data Network Encryption and
Integrity, and for information about configuring SSL network
encryption, refer to the [Oracle Database Security Guide][32].  This
manual also contains information about other important security
features that Oracle Database provides, such Transparent Data
Encryption of data-at-rest in the database.

### <a name="changingpassword"></a> 12.8 Changing Passwords and Connecting with an Expired Password

#### Changing Passwords

Database passwords can be changed with
[`connection.changePassword()`](#changepassword).  For example:

```javascript
let currentpw = ...  // the current password for the hr schema
let newpw = ...      // the new hr schema password

oracledb.getConnection(
  {
    user          : "hr",
    password      : currentpw,
    connectString : "localhost/orclpdb"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }

    connection.changePassword(
        'hr', currentpw, newpw,
        function(err) {
        . . .
        });
    . . .
```

Only DBAs, or users with the ALTER USER privilege, can change the
password of another user.  In this case, the old password value is
ignored and can be an empty string:

```javascript
oracledb.getConnection(
  {
    user          : "system",   // a privileged user
    password      : mypw,  // mypw contains the hr schema password
    connectString : "localhost/orclpdb"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }

    let newpw = ... // the new password

    connection.changePassword(
        'hr', '', newpw,
        function(err) {
        . . .
        });
    . . .
```

#### Connecting with an Expired Password

When creating a standalone, non-pooled connection the user's password
can be changed at time of connection.  This is most useful when the
user's password has expired, because it allows a user to connect
without requiring a DBA to reset their password.

Both the current and new passwords must be given when connecting.  For
example:

```javascript
var oldpw = ...  // the hr schema's old password
var newpw = ...  // the new password

oracledb.getConnection(
  {
    user          : "hr",
    password      : oldpw,
    newPassword   : newpw,
    connectString : "localhost/orclpdb"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }
  . . .
```

### <a name="connectionha"></a> 12.9 Connections and High Availability

For applications that need to be highly available, you may want to
configure your OS network settings and Oracle Net (which handles
communication between node-oracledb and the database).

For Oracle Net configuration, create a `sqlnet.ora` file.  See
[Optional Client Configuration Files](#tnsadmin) for where to place
this.  In this file you can configure settings like
[`SQLNET.OUTBOUND_CONNECT_TIMEOUT`][33], [`SQLNET.RECV_TIMEOUT`][34]
and [`SQLNET.SEND_TIMEOUT`][35].  You may also want to use a
[`tnsnames.ora`](#tnsnames) file to configure the database service
setting [`ENABLE=BROKEN`][36].

Other [Oracle Net Services][37] options may also be useful for
high availability and performance tuning.

#### <a name="connectionfan"></a> 12.9.1 Fast Application Notification (FAN)

Users of [Oracle Database FAN][64] should set
[`oracledb.events`](#propdbevents) to *true*.  This can also be
enabled via [External Configuration](#oraaccess).

FAN support gives fast connection failover, an Oracle Database high
availability feature.  This allows applications to be notified when a
database machine becomes unavailable.  Without FAN, node-oracledb can
hang until a TCP timeout occurs and an error is returned, which might
be several minutes.  Enabling FAN in node-oracledb can allow
applications to detect errors, re-connect to an available database
instance, and replay application logic without the application user
being aware of an outage.  It is up to the application to handle
errors and take desired action.

FAN benefits users of Oracle Database's clustering technology ([Oracle
RAC][93]) because connections to surviving database instances can be
immediately made.  Users of Oracle's Data Guard with a broker will see
the FAN events generated when the standby database goes online.
Standalone databases will send FAN events when the database restarts.

For active connections, when a machine or database instance becomes
unavailable, a connection failure error will be returned by the
node-oracledb method currently being called.  On a subsequent
re-connect, a connection to a surviving database instance will be
established.  Node-oracledb also transparently cleans up any idle
connections affected by a database machine or instance failure so
future connect calls will establish a fresh connection without the
application being aware of any service disruption.

For a more information on FAN see the [whitepaper on Fast Application
Notification][97].

#### <a name="connectionrlb"></a> 12.9.2 Runtime Load Balancing (RLB)

[Oracle Database RAC][93] users with [Oracle Database (RLB)][65]
advisory events configured should use node-oracledb [Connection
Pooling](#connpooling) and set [`oracledb.events`](#propdbevents) to
*true*.  The events mode can also be enabled via [External
Configuration](#oraaccess).

RLB allows optimal use of database resources by balancing database
requests across RAC instances.

For a more information on RLB, see the [whitepaper on Fast Application
Notification][97].

#### <a name="dbcalltimeouts"></a> 12.9.3 Database Call Timeouts

When node-oracledb is using Oracle client libraries version 18, or
later, a millisecond timeout for database calls can be set with
[`connection.callTimeout`](#propconncalltimeout).

The call timeout is on each individual [round-trip][124] between
node-oracledb and Oracle Database.  Each node-oracledb method or
operation may require zero or more round-trips to Oracle Database.
The `callTimeout` value applies to each round-trip individually, not
to the sum of all round-trips.  Time spent processing in node-oracledb
before or after the completion of each round-trip is not counted.

- If the time from the start of any one round-trip to the completion
  of that same round-trip exceeds `callTimeout` milliseconds, then the
  operation is halted and an error is returned.

- In the case where a node-oracledb operation requires more than one
  round-trip and each round-trip takes less than `callTimeout`
  milliseconds, then no timeout will occur, even if the sum of all
  round-trip calls exceeds `callTimeout`.

- If no round-trip is required, the operation will never be
  interrupted.

After a timeout occurs, node-oracledb attempts to clean up the
internal connection state.  The cleanup is allowed to take another
`callTimeout` milliseconds.

If the cleanup was successful, a *DPI-1067* error will be returned and
the application can continue to use the connection.

For small values of `callTimeout`, the connection cleanup may not
complete successfully within the additional `callTimeout` period.  In
this case an *ORA-3114* is returned and the connection will no longer
be usable.  It should be released.

### <a name="tnsadmin"></a> 12.10 Optional Client Configuration Files

Optional Oracle Client configuration files are read when node-oracledb
is loaded.  These files affect connections and applications.  Common
files include `tnsnames.ora`, `sqlnet.ora`, `ldap.ora`, and
[`oraaccess.xml`](#oraaccess).

The files should be accessible to the node-oracledb binary, not the
database server.  Default locations include:

- `/opt/oracle/instantclient_18_3/network/admin` if Instant Client is in `/opt/oracle/instantclient_18_3`.
- `/usr/lib/oracle/12.2/client64/lib/network/admin` if Oracle 18.3 Instant Client RPMs are used on Linux.
- `$ORACLE_HOME/network/admin` if node-oracledb is using libraries from the database installation.

Alternatively, Oracle Client configuration files can be put in
another, accessible directory.  Then set the environment variable
[`TNS_ADMIN`][8] to that directory name.  For example, if the file
`/etc/my-oracle-config/tnsnames.ora` is being used, set `TNS_ADMIN` to
`/etc/my-oracle-config`.

## <a name="sqlexecution"></a> 13. SQL Execution

A single SQL or PL/SQL statement may be executed using the
*Connection* [`execute()`](#execute) method.  The callback style shown
below, or [promises](#promiseoverview), or
[Async/Await](#asyncawaitoverview) may be used.

Results may be returned in a single array, or fetched in batches with
a [ResultSet](#resultsetclass).  Queries may optionally be streamed
using the [`connection.queryStream()`](#querystream) method.

Node-oracledb's [`execute()`](#execute)
and [`queryStream()`](#querystream) methods
use [Statement Caching](#stmtcache) to make re-execution of statements
efficient.  This removes the need for a separate 'prepare' method to
parse statements.

For queries that return a large number of rows, the network traffic
for fetching data from Oracle Database can be optimized by increasing
[`oracledb.fetchArraySize`](#propdbfetcharraysize).  For queries that
are known to return a small set of rows, reduce
[`fetchArraySize`](#propdbfetcharraysize) to avoid unnecessary memory
allocation.  The `execute()` option
[`fetchArraySize`](#propexecfetcharraysize) can be used to override
the global property for individual queries.

Connections can handle one database operation at a time.  Other
database operations will block.  Structure your code to avoid starting
parallel operations on a connection.  For example, instead of using
`async.parallel` or `async.each()` which calls each of its items in
parallel, use `async.series` or `async.eachSeries()`.  Also
see [Connections and Number of Threads](#numberofthreads).

After all database calls on the connection complete, the application
should use the [`connection.close()`](#connectionclose) call to
release the connection.

### <a name="select"></a> 13.1 SELECT Statements

#### <a name="fetchingrows"></a> 13.1.1 Fetching Rows with Direct Fetches

By default, queries are handled as 'direct fetches', meaning all
results are returned in the callback [`result.rows`](#execrows)
property:

```javascript
    connection.execute(
      `SELECT department_id, department_name
       FROM departments
       WHERE department_id = :did`,
      [180],
      { maxRows: 10 },  // a maximum of 10 rows will be returned
      function(err, result) {
        if (err) { console.error(err.message); return; }
        console.log(result.rows);  // print all returned rows
      });
```

Any rows beyond the `maxRows` limit are not returned.  If `maxRows` is
0, then the number of rows is only limited by Node.js memory.

To improve database efficiency, SQL queries should use a row limiting
clause like [`OFFSET` / `FETCH`](#pagingdata) or equivalent. The `maxRows`
property can be used to stop badly coded queries from returning
unexpectedly large numbers of rows.

Internally, rows are fetched from Oracle Database in batches.  The
internal batch size is based on the lesser of `fetchArraySize` and
`maxRows`.  Each batch is concatenated into the array returned to the
application.

For queries expected to return a small number of rows, reduce
`maxRows` or [`fetchArraySize`](#propexecfetcharraysize) to reduce
internal memory overhead by node-oracledb.

For direct fetches, JavaScript memory can become a limitation in two
cases:

- the absolute amount of data returned is simply too large for
  JavaScript to hold in a single array.

- the JavaScript heap can be exceeded, or become fragmented, due to
  concatenation of the buffers of records fetched from the database.
  To minimize this, use a `fetchArraySize` value determined by tuning.

In both cases, use a [ResultSet](#resultsethandling) or [Query
Stream](#streamingresults) instead of a direct fetch.

#### <a name="resultsethandling"></a> 13.1.2 Working with Result Sets

When the number of query rows is relatively big, or cannot be
predicted, it is recommended to use a [ResultSet](#resultsetclass)
with callbacks, as described in this section, or via query streaming,
as described [later](#streamingresults).  This prevents query results
being unexpectedly truncated by the [`maxRows`](#propdbmaxrows) limit,
or exceeding Node.js memory constraints.  Otherwise, for queries that
return a known small number of rows, non-ResultSet queries may have
less overhead.

A ResultSet is created when the `execute()` option property
[`resultSet`](#executeoptions) is *true*.  ResultSet rows can be
fetched using [`getRow()`](#getrow) or [`getRows()`](#getrows) on the
`execute()` callback function's `result.resultSet` property.

For ResultSets, the [`maxRows`](#propdbmaxrows) limit is ignored.  All
rows can be fetched.

When all rows have been fetched, or the application does not want to
continue getting more rows, then the ResultSet should be freed using
[`close()`](#close).  The ResultSet should also be explicitly closed
in the cases where no rows will be fetched from it.

REF CURSORS returned from a PL/SQL block via an `oracledb.CURSOR` OUT
binds are also available as a ResultSet. See
[REF CURSOR Bind Parameters](#refcursors).

The format of each row will be an array or object, depending on the
value of [outFormat](#propdboutformat).

See [resultset1.js][38], [resultset2.js][39] and [refcursor.js][40]
for full examples.

To fetch one row at a time use getRow() :

```javascript
connection.execute(
  `SELECT employee_id, last_name FROM employees ORDER BY employee_id`,
  [], // no bind variables
  { resultSet: true }, // return a Result Set.  Default is false
  function(err, result) {
    if (err) { . . . }
    fetchOneRowFromRS(connection, result.resultSet);
  });
});

function fetchOneRowFromRS(connection, resultSet) {
  resultSet.getRow( // get one row
    function (err, row) {
      if (err) {
         . . .           // close the Result Set and release the connection
      } else if (!row) { // no rows, or no more rows
        . . .            // close the Result Set and release the connection
      } else {
        console.log(row);
        fetchOneRowFromRS(connection, resultSet);  // get next row
      }
    });
}
```

To fetch multiple rows at a time, use `getRows()`:


```javascript
var numRows = 10;  // number of rows to return from each call to getRows()

connection.execute(
  `SELECT employee_id, last_name FROM employees ORDER BY employee_id`,
  [], // no bind variables
  { resultSet: true }, // return a ResultSet.  Default is false
  function(err, result) {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.resultSet, numRows);
  });
});

function fetchRowsFromRS(connection, resultSet, numRows) {
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows) {
      if (err) {
         . . .                        // close the ResultSet and release the connection
      } else if (rows.length > 0) {   // got some rows
        console.log(rows);            // process rows
        if (rows.length === numRows)  // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else                          // got fewer rows than requested so must be at end
          . . .                       // close the ResultSet and release the connection
      } else {                        // else no rows
          . . .                       // close the ResultSet and release the connection
      }
    });
}
```

#### <a name="streamingresults"></a> 13.1.3 Query Streaming

Streaming of query results allows data to be piped to other streams, for
example when dealing with HTTP responses.

Use [`connection.queryStream()`](#querystream) to create a stream from
a top level query and listen for events.  You can also call
[`connection.execute()`](#execute) and use
[`toQueryStream()`](#toquerystream) to return a stream from the
returned [ResultSet](#resultsetclass) or OUT bind REF CURSOR
ResultSet.

With streaming, each row is returned as a `data` event.  Query
metadata is available via a `metadata` event.  The `end` event
indicates the end of the query results.

Query results should be fetched to completion to avoid resource leaks,
or (from Node.js 8 onwards) the Stream [`destroy()`][92] method can be
used to terminate a stream early.  For older Node.js versions use a
[ResultSet with callbacks](#resultsethandling) if you need to stop a
query before retrieving all data.  Note the previous, experimental
`_close()` method no longer emits a 'close' event.

The connection must remain open until the stream is completely read
and any returned [Lob](#lobclass) objects have been processed.

The query stream implementation is a wrapper over the [ResultSet
Class](#resultsetclass).  In particular, successive calls to
[getRow()](#getrow) are made internally.  Each row will generate a
`data` event.  For tuning, adjust the value of
[`oracledb.fetchArraySize`](#propdbfetcharraysize) or the `execute()`
option [`fetchArraySize`](#propexecfetcharraysize).

An example of streaming query results is:

```javascript
var stream = connection.queryStream('SELECT employees_name FROM employees');

stream.on('error', function (error) {
  // handle any error...
});

stream.on('data', function (data) {
  // handle data row...
});

stream.on('end', function () {
  // release connection...
});

stream.on('metadata', function (metadata) {
  // access metadata of query
});

// listen to any other standard stream events...
```

See [selectstream.js][41] for a runnable example using
`connection.queryStream()`.

The [REF CURSOR Bind Parameters](#refcursors) section shows using
`toQueryStream()` to return a stream for a REF CURSOR.

#### <a name="queryoutputformats"></a> 13.1.4 Query Output Formats

Query rows may be returned as an array of column values, or as
JavaScript objects, depending on the values of
[outFormat](#propdboutformat).

The default format for each row is an array of column values.
For example:

```javascript
var oracledb = require('oracledb');
. . .

connection.execute(
  `SELECT department_id, department_name
   FROM departments
   WHERE manager_id < :id`,
  [110],  // bind value for :id
  function(err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.rows);
  });
```

If run with Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

Using this format is recommended for efficiency.

Alternatively, rows may be fetched as JavaScript objects. To do so,
specify the `outFormat` option to be `oracledb.OBJECT`:

```javascript
oracledb.outFormat = oracledb.OBJECT;
```

The value can also be set as an `execute()` option:

```javascript
connection.execute(
  `SELECT department_id, department_name
   FROM departments
   WHERE manager_id < :id`,
  [110],  // bind value for :id
  { outFormat: oracledb.OBJECT },
  function(err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.rows);
  });
```

The output is:

```
[ { DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT' },
  { DEPARTMENT_ID: 90, DEPARTMENT_NAME: 'Executive' },
  { DEPARTMENT_ID: 100, DEPARTMENT_NAME: 'Finance' } ]
```

In the preceding example, each row is a JavaScript object that
specifies column names and their respective values.  Note the property
names follow Oracle's standard name-casing rules.  They will commonly
be uppercase, since most applications create tables using unquoted,
case-insensitive names.

#### <a name="querymeta"></a> 13.1.5 Query Column Metadata

The column names of a query are returned in the `execute()` callback's
[`result.metaData`](#execmetadata) attribute:

```javascript
connection.execute(
  `SELECT department_id, department_name
   FROM departments
   WHERE manager_id < :id`,
  [110],  // bind value for :id
  function(err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.metaData);  // show the metadata
  });
```

When using a [ResultSet](#resultsetclass), metadata is also
available in [`result.resultSet.metaData`](#rsmetadata).  For queries
using [`queryStream()`](#querystream), metadata is available via the
`metadata` event.

The metadata is an array of objects, one per column.  By default each
object has a `name` attribute:

```
[ { name: 'DEPARTMENT_ID' }, { name: 'DEPARTMENT_NAME' } ]
```

The names are in uppercase.  This is the default casing behavior for
Oracle client programs when a database table is created with unquoted,
case-insensitive column names.

##### Extended Metadata

More metadata is included when the
[`oracledb.extendedMetaData`](#propdbextendedmetadata) or `connection.execute()` option
[`extendedMetaData`](#propexecextendedmetadata) is *true*.  For
example:

```javascript
connection.execute(
  `SELECT department_id, department_name
   FROM departments
   WHERE manager_id < :id`,
  [110],  // bind value for :id
  { extendedMetaData: true },
  function(err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.metaData);  // show the extended metadata
  });
```

The output is:

```
[ { name: 'DEPARTMENT_ID',
    fetchType: 2002,
    dbType: 2,
    precision: 4,
    scale: 0,
    nullable: false },
  { name: 'DEPARTMENT_NAME',
    fetchType: 2001,
    dbType: 1,
    byteSize: 30,
    nullable: false } ]
```

Description of the properties is given in the
[`result.metaData`](#execmetadata) description.

Also see [`connection.getStatementInfo()`](#getstmtinfo).

#### <a name="typemap"></a> 13.1.6 Query Result Type Mapping

Supported Oracle number, date, character, ROWID, UROWID, LONG and LONG
RAW column types are selected as Numbers, Dates, Strings, or Buffers.
BLOBs and CLOBs are selected into [Lobs](#lobclass).

The default mapping for some types can be changed
using [`fetchAsBuffer`](#propdbfetchasbuffer),
or [`fetchAsString`](#propdbfetchasstring).
The [`fetchInfo`](#propexecfetchinfo) property can also be used to
change the default mapping, or override a global mapping, for
individual columns.

Data types in `SELECT` statements that are unsupported give an error
*NJS-010: unsupported data type in select list*.  These include
INTERVAL, BFILE and XMLType types.

Details are in the following sections.

##### <a name="stringhandling"></a> 13.1.6.1 Fetching CHAR, VARCHAR2, NCHAR and NVARCHAR

Columns of database type CHAR, VARCHAR2, NCHAR and NVARCHAR are
returned from queries as JavaScript strings.

Note that binding NCHAR and NVARCHAR for [DML][14] is not supported
and may cause unexpected character set translation, see [Bind Data
Type Notes](#binddatatypenotes).

##### <a name="numberhandling"></a> 13.1.6.2 Fetching Numbers

By default all numeric columns are mapped to JavaScript numbers.
Node.js uses double floating point numbers as its native number type.

When numbers are fetched from the database, conversion to JavaScript's
less precise binary number format can result in "unexpected"
representations.  For example:

```javascript
conn.execute(
`SELECT 38.73 FROM dual`,
function (err, result) {
  if (err)
    . . .
  else
    console.log(result.rows[0]); // gives 38.730000000000004
});
```

Similar issues can occur with binary floating-point arithmetic
purely in Node.js, for example:

```javascript
console.log(0.2 + 0.7); // gives 0.8999999999999999
```

Node.js can also only represent numbers up to 2 ^ 53
which is 9007199254740992.  Numbers larger than this will be truncated.

The primary recommendation for number handling is to use Oracle SQL or
PL/SQL for mathematical operations, particularly for currency
calculations.

To reliably work with numbers in Node.js, use `fetchAsString` or
`fetchInfo` (see [below](#fetchasstringhandling)) to fetch numbers in
string format, and then use one of the available third-party
JavaScript number libraries that handles large values and more
precision.

##### <a name="datehandling"></a> 13.1.6.3 Fetching Dates and Timestamps

By default, date and timestamp columns are mapped to JavaScript Date
objects.  Internally, DATE, TIMESTAMP, TIMESTAMP WITH LOCAL TIME
ZONE, and TIMESTAMP WITH TIME ZONE columns are fetched as
TIMESTAMP WITH LOCAL TIME ZONE using the session time zone.
Oracle INTERVAL types are not supported.

Note that JavaScript Date has millisecond precision therefore
timestamps will lose any sub-millisecond fractional part when fetched.

To make applications more portable, it is recommended to always set
the session time zone to a pre-determined value, such as UTC.  This
can be done by setting the environment variable [`ORA_SDTZ`][42]
before starting Node.js, for example:

```
$ export ORA_SDTZ='UTC'
$ node myapp.js
```

The session time zone can also be changed at runtime for each connection by
executing:

```javascript
connection.execute(
  `ALTER SESSION SET TIME_ZONE='UTC'`,
  function(err) { ... }
);
```

With pooled connections, you could make use of a
[`sessionCallback`](#createpoolpoolattrssessioncallback) function to
minimize the number of times the ALTER SESSION needs to be executed.

To set the time zone without requiring the overhead of a
[round-trip][124] to execute the `ALTER` statement, you could use a
PL/SQL trigger:

```sql
CREATE OR REPLACE TRIGGER my_logon_trigger
  AFTER LOGON
  ON hr.SCHEMA
BEGIN
  EXECUTE IMMEDIATE 'ALTER SESSION SET TIME_ZONE=''UTC''';
END;
```

See [Working with Dates Using the Node.js Driver][43] for more
discussion of date handling.

##### <a name="fetchasstringhandling"></a> 13.1.6.4 Fetching Numbers and Dates as String

The global [`fetchAsString`](#propdbfetchasstring) property can be
used to force all number or date columns
(and [CLOB columns](#queryinglobs)) queried by an application to be
fetched as strings instead of in native format.  Allowing data to be
fetched as strings helps avoid situations where using JavaScript types
can lead to numeric precision loss, or where date conversion is
unwanted.

For example, to force all dates and numbers used by queries in an
application to be fetched as strings:

```javascript
var oracledb = require('oracledb');
oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
```

For dates and numbers, the maximum length of a string created can be
200 bytes.

Individual queries can use the [`execute()`](#execute) option
[`fetchInfo`](#propexecfetchinfo) to map individual number or date columns
to strings without affecting other columns or other queries.  Any
global `fetchAsString` setting can be overridden to allow specific
columns to have data returned in native format:

```javascript
var oracledb = require('oracledb');

var mypw = ...  // set mypw to the hr schema password

oracledb.fetchAsString = [ oracledb.NUMBER ];  // any number queried will be returned as a string

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/XEPDB1"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return; }
    connection.execute(
      `SELECT last_name, hire_date, salary, commission_pct FROM employees WHERE employee_id = :id`,
      [178],
      {
        fetchInfo :
        {
          "HIRE_DATE":      { type : oracledb.STRING },  // return the date as a string
          "COMMISSION_PCT": { type : oracledb.DEFAULT }  // override oracledb.fetchAsString and fetch as native type
        }
      },
      function(err, result) {
        if (err) { console.error(err.message); return; }
        console.log(result.rows);
      });
  });
```

The output is:

```
[ [ 'Grant', '24-MAY-07', '7000', 0.15 ] ]
```

The date and salary columns are returned as strings, but the
commission is a number.  The date is mapped using the current session
date format, which was `DD-MON-YY` in this example.  The default date
format can be set, for example, with the environment variable
`NLS_DATE_FORMAT`.  Note this variable will only be read if `NLS_LANG`
is also set.

Without the mapping capabilities provided by `fetchAsString` and
`fetchInfo` the hire date would have been a JavaScript date in the
local time zone, and both numeric columns would have been
represented as numbers:

```
[ [ 'Grant', Thu May 24 2007 00:00:00 GMT+1000 (AEST), 7000, 0.15 ] ]
```

To map columns returned from REF CURSORS, use `fetchAsString`.  The
`fetchInfo` settings do not apply.

When using `fetchAsString` or `fetchInfo` for numbers, you may need to
explicitly use `NLS_NUMERIC_CHARACTERS` to override your NLS settings
and force the decimal separator to be a period.  This can be done for
each connection by executing the statement:

```javascript
connection.execute(
  `ALTER SESSION SET NLS_NUMERIC_CHARACTERS = '.,'`,
  function(err) { ... }
);
```

Alternatively you can set the equivalent environment variable prior
to starting Node.js:

```
$ export NLS_NUMERIC_CHARACTERS='.,'
```

Note this environment variable is not used unless the `NLS_LANG`
environment variable is also set.

##### <a name="fetchlob"></a> 13.1.6.5 Fetching BLOB, CLOB and NCLOB

By default BLOB, CLOB and NCLOB columns are fetched into [Lob](#lobclass)
instances.  For small LOBs it can be more convenient to fetch them
directly into Buffers or Strings by using the
global [`fetchAsBuffer`](#propdbfetchasbuffer)
or [`fetchAsString`](#propdbfetchasstring) settings, or the
per-column [`fetchInfo`](#propexecfetchinfo) setting.  See the
section [Working with CLOB and BLOB Data](#lobhandling).

Note that binding NCLOB for [DML][14] is not supported and may cause
unexpected character set translation, see [Bind Data Type
Notes](#binddatatypenotes).

##### <a name="fetchlong"></a> 13.1.6.6 Fetching LONG and LONG RAW

LONG columns in queries will be fetched as Strings.  LONG RAW columns
will be fetched as Buffers.

Unlike for LOBs, there is no support for streaming LONG types.  Oracle
Database allows values 2 GB in length, but Node.js and V8 memory
limitations typically only allow memory chunks in the order of tens of
megabytes.  This means complete data may not be able to fetched from
the database.  The SQL function [`TO_LOB`][44] can be used to migrate
data to LOB columns which can be streamed to node-oracledb, however
`TO_LOB` cannot be used directly in a `SELECT`.

##### <a name="fetchrowid"></a> 13.1.6.7 Fetching ROWID and UROWID

Queries will return ROWID and UROWID columns as Strings.

##### <a name="fetchxml"></a> 13.1.6.8 Fetching XMLType

`XMLType` columns queried will returns as Strings.  They can also be
handled as CLOBs, see [Working with XMLType](#xmltype).

##### <a name="fetchraw"></a> 13.1.6.9 Fetching RAW

Queries will return RAW columns as Node.js Buffers.

##### <a name="customtypehandling"></a> 13.1.6.10 Mapping Custom Types

Data types such as an Oracle Locator `SDO_GEOMETRY`, or your own custom
types, cannot be fetched directly in node-oracledb.  Instead, utilize
techniques such as using an intermediary PL/SQL procedure to map the
type components to scalar values, or use a pipelined table.

For example, consider a `CUSTOMERS` table having a `CUST_GEO_LOCATION`
column of type `SDO_GEOMETRY`, as created in this [example
schema][45]:

```sql
CREATE TABLE customers (
  customer_id NUMBER,
  last_name VARCHAR2(30),
  cust_geo_location SDO_GEOMETRY);

INSERT INTO customers VALUES
  (1001, 'Nichols', SDO_GEOMETRY(2001, 8307, SDO_POINT_TYPE (-71.48923,42.72347,NULL), NULL, NULL));

COMMIT;
```

Instead of attempting to get `CUST_GEO_LOCATION` by directly calling a
PL/SQL procedure that returns an `SDO_GEOMETRY` parameter, you could
instead get the scalar coordinates by using an intermediary PL/SQL
block that decomposes the geometry:

```javascript
    . . .
    var sql =
      `BEGIN
         SELECT t.x, t.y
         INTO :x, :y
         FROM customers, TABLE(sdo_util.getvertices(customers.cust_geo_location)) t
         WHERE customer_id = :id;
       END;`;
    var bindvars = {
      id: 1001,
      x: { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
      y: { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
    }
    connection.execute(
      sql,
      bindvars,
      function (err, result) {
        if (err) { console.error(err.message); return; }
        console.log(result.outBinds);
      });
```

The output is:

```
{ x: -71.48922999999999, y: 42.72347 }
```

Note the JavaScript precision difference.  In this particular example,
you may want to bind using `type: oracledb.STRING`.  Output would be:

```
{ x: '-71.48923', y: '42.72347' }
```

#### <a name="pagingdata"></a> 13.1.7 Limiting Rows and Creating Paged Datasets

Query data is commonly broken into small sets for two reasons:

- 'Web pagination' that allows moving from one set of rows to a next,
  or previous, set.

- Fetching of consectitive small sets of data for processing.  This
  happens because the number of records is too large for Node.js to
  handle at the same time.

The latter can be handled by [ResultSets](#resultsethandling) or
[`queryStream()`](#querystream) with one execution of the SQL query as
discsussed in those links.

How to do 'web pagination' is discussed in this section.  For each
'page' of results, a SQL query is executed to get the appropriate set
of rows from a table.  Since the query will be executed more than
once, make sure to use bind variables for row numbers and row limits.

Oracle Database 12c SQL introduced an `OFFSET` / `FETCH` clause which
is similar to the LIMIT keyword of MySQL.  See [Row Limiting:
Examples][5] in the Oracle documentation.  A node-oracledb example is:

```javascript
var myoffset = 0;       // do not skip any rows (start at row 1)
var mymaxnumrows = 20;  // get 20 rows

connection.execute(
  `SELECT last_name
   FROM employees
   ORDER BY last_name
   OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY`,
  {offset: myoffset, maxnumrows: mymaxnumrows},
. . .
```

A runnable example is in [rowlimit.js][84].

You can use a basic [`execute()`](#execute) or a
[ResultSet](#resultsetclass), or [`queryStream()`](#querystream) with
your query.  For basic `execute()` fetches, make sure that
`oracledb.maxRows` is greater than the value bound to `:maxnumrows`,
or set to 0 (meaning unlimited).

In applications where the SQL query is not known in advance, this
method sometimes involves appending the `OFFSET` clause to the 'real'
user query. Be very careful to avoid SQL injection security issues.

As an anti-example, another way to limit the number of rows returned
involves setting [`maxRows`](#propdbmaxrows).  However it is more
efficient to let Oracle Database do the row selection in the SQL query
and only return the exact number of rows required to node-oracledb.

For Oracle Database 11g and earlier there are several alternative ways
to limit the number of rows returned.  The old, canonical paging query
is:

```SQL
SELECT *
FROM (SELECT a.*, ROWNUM AS rnum
      FROM (YOUR_QUERY_GOES_HERE -- including the order by) a
      WHERE ROWNUM <= MAX_ROW)
WHERE rnum >= MIN_ROW
```

Here, `MIN_ROW` is the row number of first row and `MAX_ROW` is the
row number of the last row to return.  For example:

```SQL
SELECT *
FROM (SELECT a.*, ROWNUM AS rnum
      FROM (SELECT last_name FROM employees ORDER BY last_name) a
      WHERE ROWNUM <= 20)
WHERE rnum >= 1
```

This always has an 'extra' column, here called RNUM.

An alternative and preferred query syntax for Oracle Database 11g uses
the analytic `ROW_NUMBER()` function. For example to get the 1st to
20th names the query is:

```SQL
SELECT last_name FROM
(SELECT last_name,
        ROW_NUMBER() OVER (ORDER BY last_name) AS myr
        FROM employees)
WHERE myr BETWEEN 1 and 20
```

Refer to [On Top-n and Pagination Queries][85] in Oracle Magazine for
details.

#### <a name="autoincrement"></a> 13.1.8 Auto-Increment Columns

From Oracle Database 12c you can create tables with auto-incremented
values.  This is useful to generate unique primary keys for your data
when ROWID or UROWID are not preferred.

In SQL*Plus execute:

```SQL
CREATE TABLE mytable
  (myid NUMBER(11) GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH 1),
   mydata VARCHAR2(20)
  )
```

Refer to the [CREATE TABLE identity column documentation][86].

If you already have a sequence `myseq` you can use values from it to
auto-increment a column value like this:

```SQL
CREATE TABLE mytable
  (myid NUMBER DEFAULT myseq.NEXTVAL,
   mydata VARCHAR2(20)
  )
```

This also requires Oracle Database 12c or later.

Prior to Oracle Database 12c, auto-increment columns in Oracle
Database can be created using a sequence generator and a trigger.

Sequence generators are defined in the database and return Oracle
numbers.  Sequence numbers are generated independently of tables.
Therefore, the same sequence generator can be used for more than one
table or anywhere that you want to use a unique number.  You can get a
new value from a sequence generator using the NEXTVAL operator in a
SQL statement.  This gives the next available number and increments
the generator.  The similar CURRVAL operator returns the current value
of a sequence without incrementing the generator.

A trigger is a PL/SQL procedure that is automatically invoked at a
predetermined point.  In this example a trigger is invoked whenever an
insert is made to a table.

In SQL*Plus run:

```SQL
CREATE SEQUENCE myseq;
CREATE TABLE mytable (myid NUMBER PRIMARY KEY, mydata VARCHAR2(20));
CREATE TRIGGER mytrigger BEFORE INSERT ON mytable FOR EACH ROW
BEGIN
  :new.myid := myseq.NEXTVAL;
END;
/
```

Prior to Oracle Database 11g replace the trigger assignment with a
SELECT like:

```SQL
SELECT myseq.NEXTVAL INTO :new.myid FROM dual;
```

##### Getting the Last Insert ID

To get the automatically inserted identifier in node-oracledb, use a
[DML RETURNING](#dmlreturn) clause:

```javascript
. . .
connection.execute(
  `INSERT INTO mytable (mydata) VALUES ('Hello') RETURN myid INTO :id`,
  {id : {type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds.id);  // print the ID of the inserted row
  });
```

### <a name="cursors1000"></a> 13.2 Cursor Management

Developers starting out with Node have to get to grips with the
'different' programming style of JavaScript that seems to cause
methods to be called when least expected!  While you are still in the
initial hacking-around-with-node-oracledb phase you may sometimes
encounter the error *ORA-01000: maximum open cursors exceeded*.  A
cursor is a "handle for the session-specific private SQL area that
holds a parsed SQL statement and other processing information".

Here are things to do when you see an *ORA-1000*:

- Avoid having too many incompletely processed statements open at one time:

    - Make sure your application is handling connections and statements
      in the order you expect.

    - [Close ResultSets](#close) before releasing the connection.

    - If cursors are opened with `DBMS_SQL.OPEN_CURSOR()` in a PL/SQL
      block, close them before the block returns - except for REF
      CURSORs being passed back to node-oracledb.

- Choose the appropriate Statement Cache size.  Node-oracledb has a
  statement cache per connection.  When node-oracledb internally
  releases a statement it will be put into the statement cache of that
  connection, and its cursor will remain open. This makes statement
  re-execution very efficient.

  The cache size is settable with the
  [`oracle.stmtCacheSize`](#propdbstmtcachesize) attribute.
  The size you choose will depend on your knowledge of the
  locality of the statements, and of the resources available to the
  application.  Are statements re-executed?  Will they still be in the
  cache when they get executed?  How many statements do you want to be
  cached?  In rare cases when statements are not re-executed, or are
  likely not to be in the cache, you might even want to disable the
  cache to eliminate its management overheads.

  Incorrectly sizing the statement cache will reduce application
  efficiency.

  To help set the cache size, you can turn on auto-tuning with Oracle
  12.1, or later, using an [*oraaccess.xml*](#oraaccess) file.

  For more information, see the [Statement Caching](#stmtcache) documentation.

- Use bind variables otherwise each variant of the statement will have
  its own statement cache entry and cursor.  With appropriate binding
  only one entry and cursor will be needed.

- Set the database's [*open_cursors*][47] parameter appropriately.
  This parameter specifies the maximum number of cursors that each
  "session" (i.e each node-oracle connection) can use.  When a
  connection exceeds the value, the *ORA-1000* error is thrown.

  Along with a cursor per entry in the connection's statement cache,
  any new statements that a connection is currently executing, or
  ResultSets that have not been released (in neither situation are
  these yet cached), will also consume a cursor.  Make sure that
  *open_cursors* is large enough to accommodate the maximum open
  cursors any connection may have.  The upper bound required is
  *stmtCacheSize* + the maximum number of executing statements in a
  connection.

  Remember this is all per connection. Also cache management happens
  when statements are internally released.  The majority of your
  connections may use less than *open_cursors* cursors, but if one
  connection is at the limit and it then tries to execute a new
  statement, that connection will get *ORA-1000: maximum open cursors
  exceeded*.

## <a name="plsqlexecution"></a> 14. PL/SQL Execution

PL/SQL stored procedures, functions and anonymous blocks can be called
from node-oracledb using [`execute()`](#execute).

Note the error property of the callback is not set when PL/SQL
"success with info" warnings such as compilation warnings occur.

### <a name="plsqlproc"></a> 14.1 PL/SQL Stored Procedures

The PL/SQL procedure:

```sql
CREATE OR REPLACE PROCEDURE myproc (id IN NUMBER, name OUT VARCHAR2) AS
BEGIN
  SELECT last_name INTO name FROM employees WHERE employee_id = id;
END;
```

can be called:

```javascript
. . .
connection.execute(
  `BEGIN myproc(:id, :name); END;`,
  {  // bind variables
    id:   159,
    name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
  },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ name: 'Smith' }
```

Binding is required for IN OUT and OUT parameters.  It is strongly
recommended for IN parameters.  See
[Bind Parameters for Prepared Statements](#bind).

### <a name="plsqlfunc"></a> 14.2 PL/SQL Stored Functions

The PL/SQL function:

```sql
CREATE OR REPLACE FUNCTION myfunc RETURN VARCHAR2 AS
BEGIN
  RETURN 'Hello';
END;
```

can be called by using an OUT bind variable for the function return value:

```javascript
. . .
connection.execute(
  `BEGIN :ret := myfunc(); END;`,
  { ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 } },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ ret: 'Hello' }
```

See [Bind Parameters for Prepared Statements](#bind) for information on binding.

### <a name="plsqlanon"></a> 14.3 PL/SQL Anonymous PL/SQL Blocks

Anonymous PL/SQL blocks can be called from node-oracledb like:

```javascript
. . .
connection.execute(
  `BEGIN SELECT last_name INTO :name FROM employees WHERE employee_id = :id; END;`,
  {  // bind variables
    id:   134,
    name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 },
  },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

The output is:

```
{ name: 'Rogers' }
```

See [Bind Parameters for Prepared Statements](#bind) for information on binding.

### <a name="dbmsoutput"></a> 14.4 Using DBMS_OUTPUT

The [DBMS_OUTPUT][48] package is the standard way to "print" output
from PL/SQL.  The way DBMS_OUTPUT works is like a buffer.  Your
Node.js application code must first turn on DBMS_OUTPUT buffering for
the current connection by calling the PL/SQL procedure
`DBMS_OUTPUT.ENABLE(NULL)`.  Then any PL/SQL executed by the
connection can put text into the buffer using
`DBMS_OUTPUT.PUT_LINE()`.  Finally `DBMS_OUTPUT.GET_LINE()` is used to
fetch from that buffer.  Note, any PL/SQL code that uses DBMS_OUTPUT
runs to completion before any output is available to the user.  Also,
other database connections cannot access your buffer.

A basic way to fetch DBMS_OUTPUT with node-oracledb is to bind an
output string when calling the PL/SQL `DBMS_OUTPUT.GET_LINE()`
procedure, print the string, and then repeat until there is no more
data.  The following snippet is based on the example
[dbmsoutputgetline.js][49]:

```javascript
function fetchDbmsOutputLine(connection, cb) {
  connection.execute(
    `BEGIN DBMS_OUTPUT.GET_LINE(:ln, :st); END;`,
    { ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
      st: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
    function(err, result) {
      if (err) {
        return cb(err, connection);
      } else if (result.outBinds.st == 1) { // no more output
        return cb(null, connection);
      } else {
        console.log(result.outBinds.ln);
        return fetchDbmsOutputLine(connection, cb);
      }
    });
  }
```

Another way is to wrap the `DBMS_OUTPUT.GET_LINE()` call into a
pipelined function and fetch the output using a SQL query.  See
[dbmsoutputpipe.js][50] for the full example.

The pipelined function could be created like:

```sql
CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
/

CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
  line VARCHAR2(32767);
  status INTEGER;
  BEGIN LOOP
    DBMS_OUTPUT.GET_LINE(line, status);
    EXIT WHEN status = 1;
    PIPE ROW (line);
  END LOOP;
END;
/
```

To get DBMS_OUTPUT that has been created, simply execute the query
using the same connection:

```sql
connection.execute(
  `SELECT * FROM TABLE(mydofetch())`,
  [],
  { resultSet: true },
  function (err, result) {
  . . .
```

The query rows can be handled using a [ResultSet](#resultsethandling).

Remember to first enable output using `DBMS_OUTPUT.ENABLE(NULL)`.

### <a name="ebr"></a> 14.5 Edition-Based Redefinition

The [Edition-Based Redefinition][98] (EBR) feature of Oracle Database allows
multiple versions of views, synonyms, PL/SQL objects and SQL
Translation profiles to be used concurrently.  Each items version is
associated with an 'edition' which can be nominated at runtime by
applications.  This lets database logic be updated and tested while
production users are still accessing the original version.  Once every
user has begun using the objects in the new edition, the old objects
can be dropped.

To choose the edition, node-oracledb applications can set
[`oracledb.edition`](#propdbedition) globally, or specify a value
when [`creating a pool`](#createpoolpoolattrsedition) or a
[`standalone connection`](#getconnectiondbattrsedition).

The example below shows how a PL/SQL function `DISCOUNT` can be
created with two different implementations.  The initial procedure is
created as normal in the SQL*Plus command line:

```sql
CONNECT nodedemo/welcome

-- The default edition's DISCOUNT procedure

CREATE OR REPLACE FUNCTION discount(price IN NUMBER) RETURN NUMBER
AS
 newprice NUMBER;
BEGIN
  newprice := price - 4;
  IF (newprice < 1) THEN
    newprice := 1;
  END IF;
  RETURN newprice;
END;
/
```

This initial implementation is in the default 'edition' `ora$base`, which
is pre-created in new and upgraded databases.

The user `nodedemo` can be given permission to create new 'editions':

```sql
CONNECT system

GRANT CREATE ANY EDITION TO nodedemo;
ALTER USER nodedemo ENABLE EDITIONS FORCE;
```

The next SQL*Plus script creates a new edition `e2`, and changes the
current session to use it.  A new version of `DISCOUNT` is created
under that edition:

```sql
CONNECT nodedemo/welcome

CREATE EDITION e2;
ALTER SESSION SET EDITION = e2;

-- E2 edition's discount

CREATE OR REPLACE FUNCTION discount(price IN NUMBER) RETURN NUMBER
AS
 newprice NUMBER;
BEGIN
  newprice := 0.75 * price;
  RETURN newprice;
END;
/
```

There are now two implementations of the PL/SQL procedure `DISCOUNT`
with the same prototype.  Applications can choose at runtime which
implementation to use.  Here is a script that calls `DISCOUNT`:

```javascript
var oracledb = require('oracledb');

var mypw = ...  // set mypw to the nodedemo schema password

oracledb.getConnection(
  {
    user: 'nodedemo',
    password: mypw,
    connectString: 'localhost/orclpdb'
  },
  function (err, connection) {
    if (err) {
      console.error(err.message);
      return;
    }
    connection.execute(
      `SELECT name, price, DISCOUNT(price) AS discountprice
       FROM parts
       ORDER BY id`,
      [],
      { outFormat: oracledb.OBJECT },
      function(err, result) {
        if (err) {
          console.error(err.message);
        } else {
          console.log(result.rows);
        }
      });
  }
);
```

Since the code does not explicitly set `oracledb.edition` (or
equivalent), then the first implementation of `DISCOUNT` in the
default edition is used.  The output might be like:

```
[ { NAME: 'lamp', PRICE: 40, DISCOUNTPRICE: 36 },
  { NAME: 'wire', PRICE: 10, DISCOUNTPRICE: 6 },
  { NAME: 'switch', PRICE: 4, DISCOUNTPRICE: 1 } ]
```

If the connection uses edition `e2`, then the second implementation of
`DISCOUNT` will be used:

```javascript
oracledb.getConnection(
  {
    user: 'nodedemo',
    password: mypw,  // mypw contains the nodedemo schema password
    connectString: 'localhost/orclpdb',
    edition: 'e2'
  },
  . . . // same code as before
```

The output might be like:

```
[ { NAME: 'lamp', PRICE: 40, DISCOUNTPRICE: 30 },
  { NAME: 'wire', PRICE: 10, DISCOUNTPRICE: 7.5 },
  { NAME: 'switch', PRICE: 4, DISCOUNTPRICE: 3 } ]

```

See the Database Development Guide chapter [Using Edition-Based
Redefinition][98] for more information about EBR.

## <a name="lobhandling"></a> 15. Working with CLOB and BLOB Data

Oracle Database uses LOB data types to store long objects. The CLOB
type is used for character data and the BLOB type is used for binary
data.  In node-oracledb, LOBs can be represented by instances of
the [Lob](#lobclass) class or as Strings and Buffers.

There are runnable LOB examples in the GitHub [examples][3] directory.

### <a name="basiclobinsert"></a> 15.1 Simple Insertion of LOBs

Node.js String or Buffer types can be passed into PL/SQL blocks or
inserted into the database by binding to LOB columns or PL/SQL
parameters.

If the data is larger than can be handled as a String or Buffer in
Node.js or node-oracledb, it will need to be streamed to
a [Lob](#lobclass), as discussed in [Streaming Lobs](#streamsandlobs).
See [LOB Bind Parameters](#lobbinds) for size considerations regarding
LOB binds.

Given the table:

```sql
CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
```

an `INSERT` example is:

```javascript
var fs = require('fs');
var str = fs.readFileSync('example.txt', 'utf8');
. . .

conn.execute(
  `INSERT INTO mylobs (id, myclobcol) VALUES (:idbv, :cbv)`,
  { idbv: 1,
    cbv: str },  // type and direction are optional for IN binds
  function(err, result) {
    if (err)
      console.error(err.message);
    else
      console.log('CLOB inserted from example.txt');
. . .
```

Updating LOBs is similar to insertion:

```javascript
conn.execute(
  `UPDATE mylobs SET myclobcol = :cbv WHERE id = :idbv`,
  { idbv: 1, cbv: str },
. . .
```

Buffers can similarly be bound for inserting into, or updating, BLOB columns.

When using PL/SQL, a procedure:

```sql
PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB) . . .
```

can be called like:

```javascript
bigStr = 'My string to insert';
bigBuf = Buffer.from([. . .]);

conn.execute(
  `BEGIN lobs_in(:id, :c, :b); END;`,
  { id: 20,
    c: bigStr,    // type and direction are optional for IN binds
    b: bigBuf } },
  function (err) {
    if (err) { return cb(err, conn); }
    console.log("Completed");
    return cb(null, conn);
  }
);
```

### <a name="queryinglobs"></a> 15.2 Simple LOB Queries and PL/SQL OUT Binds

#### Querying LOBs

Smaller LOBs queried from the database can be returned as Strings or Buffers by
using [`oracledb.fetchAsString`](#propdbfetchasstring) or [`oracledb.fetchAsBuffer`](#propdbfetchasbuffer)
(or [`fetchInfo`](#propexecfetchinfo)).  If the data is larger than can
be handled as a String or Buffer in Node.js or node-oracledb, it will need to be
streamed from a [Lob](#lobclass), as discussed later
in [Streaming Lobs](#streamsandlobs).

For example, to make every CLOB queried by the application be returned
as a string:

```javascript
oracledb.fetchAsString = [ oracledb.CLOB ];

conn.execute(
  `SELECT c FROM mylobs WHERE id = 1`,
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rows.length === 0)
      console.error("No results");
    else {
      var clob = result.rows[0][0];
      console.log(clob);
    }
  });
```

CLOB columns in individual queries can be fetched as strings using `fetchInfo`:

```javascript
conn.execute(
  `SELECT c FROM mylobs WHERE id = 1`,
  [ ], // no binds
  { fetchInfo: {"C": {type: oracledb.STRING}} },
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rows.length === 0) {
      console.error("No results");
    }
    else {
      var clob = result.rows[0][0];
      console.log(clob);
    }
  });
```

BLOB query examples are very similar.  To force every BLOB in the
application to be returned as a buffer:

```javascript
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

conn.execute(
  `SELECT b FROM mylobs WHERE id = 2`,
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rows.length === 0)
      console.error("No results");
    else {
      var blob = result.rows[0][0];
      console.log(blob.toString());  // assuming printable characters
    }
  });
```

BLOB columns in individual queries can be fetched as buffers using `fetchInfo`:

```javascript
conn.execute(
  `SELECT b FROM mylobs WHERE id = 2`,
  [ ], // no binds
  { fetchInfo: {"B": {type: oracledb.BUFFER}} },
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rows.length === 0) {
      console.error("No results");
    } else {
      var blob = result.rows[0][0];
      console.log(blob.toString());  // assuming printable characters
    }
  });
```

#### Getting LOBs as String or Buffer from PL/SQL

PL/SQL LOB OUT parameters can be bound as `oracledb.STRING` or
`oracledb.BUFFER`.  See [LOB Bind Parameters](#lobbinds) for size
considerations regarding LOB binds.

```javascript
conn.execute(
  `BEGIN lobs_out(:id, :c, :b); END;`,
  { id: 20,
    c: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000},
    b: {type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 50000} },
  function (err, result) {
    if (err) { return cb(err, conn); }

    var str = result.outBinds.c;  // a String
    var buf = result.outBinds.b;  // a Buffer
    return cb(null, str, buf); // do something with str and buf
  });
```

The fetched String and Buffer can be used directly in Node.js.

If data to be bound is larger than can be handled as a String or
Buffer in Node.js or node-oracledb, it will need to be explicitly
streamed to a [Lob](#lobclass), as discussed
in [Streaming Lobs](#streamsandlobs).
See [LOB Bind Parameters](#lobbinds) for size considerations regarding
LOB binds.

### <a name="streamsandlobs"></a> 15.3 Streaming Lobs

The [Lob Class](#lobclass) in node-oracledb implements the [Node.js
Stream][16] interface to provide streaming access to CLOB and BLOB
database columns and to PL/SQL bind parameters.

Node-oracledb Lobs can represent persistent LOBs (those permanently
stored in the database) or temporary LOBs (such as those created
with [`connection.createLob()`](#connectioncreatelob), or returned
from some SQL or PL/SQL).

If multiple LOBs are streamed concurrently, worker threads will
effectively be serialized on the connection.

It is the application's responsibility to make sure the connection
remains open while a Stream operation such as `pipe()` is in progress.

#### Readable Lobs

Being a Stream object, a Lob being read from the database has two
modes of operation: "flowing mode" and "paused mode".  In flowing mode,
data is piped to another stream, or events are posted as data is read.
In paused mode the application must explicitly call `read()` to get
data.

The `read(size)` unit is in characters for CLOBs and in bytes for BLOBs.

When reading a LOB from the database, resources are automatically
released at completion of the readable stream or if there is a LOB
error.  The `lob.close()` method can also be used to close persistent
LOBs that have not been streamed to completion.

A Readable Lob object starts out in paused mode.  If a 'data' event
handler is added, or the Lob is piped to a Writeable stream, then the
Lob switches to flowing mode.

For unpiped Readable Lobs operating in flowing mode where the Lob is
read through event handlers, the Lob object can be switched to paused
mode by calling `pause()`.  Once the Lob is in paused mode, it stops
emitting `data` events.

Similarly, a Readable Lob operating in the paused mode can be switched
to flowing mode by calling `resume()`.  It will then start emitting
'data' events again.

#### Writeable Lobs

Lobs are written to with `pipe()`. Alternatively the `write()` method
can be called successively, with the last piece being written by the
`end()` method.  The `end()` method must be called because it frees
resources.  If the Lob is being piped into, then the `write()` and
`end()` methods are automatically called.

Writeable Lobs also have events, see the [Node.js Stream][16]
documentation.

At the conclusion of streaming into a Writeable Lob, the `close` event
will occur.  It is recommended to put logic such as committing and
releasing connections in this event (or after it occurs).  See
[lobinsert2.js][51].  It is also recommended that persistent LOBs not
use the `finish` event handler for cleanup.

### <a name="lobinsertdiscussion"></a> 15.4 Using RETURNING INTO to Insert into LOBs

If Strings or Buffers are too large to be directly inserted into the
database (see [Simple Insertion of LOBs](#basiclobinsert)), use a
`RETURNING INTO` clause to retrieve a [Lob](#lobclass) for a table
item.  Data can then be streamed into the Lob and committed directly
to the table:

```javascript
connection.execute(
  `INSERT INTO mylobs (id, c) VALUES (:id, EMPTY_CLOB()) RETURNING c INTO :lobbv`,
  { id: 4,
    lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
  { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
  function(err, result) {
    if (err) { console.error(err.message); return; }
    if (result.rowsAffected != 1 || result.outBinds.lobbv.length != 1) {
      console.error('Error getting a LOB locator');
      return;
    }

    var lob = result.outBinds.lobbv[0];
    lob.on('close', function() {
        connection.commit(  // all data is loaded so we can commit it
          function(err) {
            if (err) console.error(err.message);
            connection.close(function(err) { if (err) console.error(err); });
          });
      });
    lob.on('error', function(err) {
        console.error(err);
        connection.close(function(err) {
          if (err) console.error(err.message);
        });
      });

    var inStream = fs.createReadStream('example.txt'); // open the file to read from
    inStream.on('error', function(err) { if (err) console.error(err); });
    inStream.pipe(lob);  // copies the text to the LOB
  });
```

This example streams from a file into the table.  When the data has
been completely streamed, the Lob is automatically closed and the
'close' event triggered.  At this point the data can be committed.

See [lobinsert2.js][51] for the full example.

### <a name="loboutstream"></a> 15.5 Getting LOBs as Streams from Oracle Database

By default, when a `SELECT` clause contains a LOB column, or a PL/SQL
OUT parameter returns a LOB, instances of [Lob](#lobclass) are
created.  (This can be changed, see [Simple LOB Queries and PL/SQL OUT Binds](#queryinglobs).)

For each Lob instance, the [`lob.type`](#proplobtype) property will
be [`oracledb.BLOB`](#oracledbconstantsnodbtype)
or [`oracledb.CLOB`](#oracledbconstantsnodbtype), depending on the
column or PL/SQL parameter type.

Returned Lobs can be used as [Readable Streams][16].  Data can be
streamed from each Lob, for example to a file.  At the conclusion of
the stream, persistent LOBs are automatically closed.

Lobs returned from the database that are not streamed can be passed
back to the database as IN binds for PL/SQL blocks, for `INSERT`, or
for `UPDATE` statements.  The Lobs should then be closed
with [`lob.close()`](#lobclose).  If they are passed as IN OUT binds,
they will be automatically closed and the
execution [`outBinds`](#execoutbinds) property will contain the
updated Lob.

#### LOB Query Example

Each CLOB or BLOB in a `SELECT` returns a [Lob](#lobclass) by default.
The table:

```sql
CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
```
can be called to get a Lob `clob` like:

```javascript
conn.execute(
  `SELECT c FROM mylobs WHERE id = 1`,
  function(err, result) {
    if (err) {
      return cb(err);
    }
    if (result.rows.length === 0) {
      return cb(new Error("whoops"));
    }
    var clob = result.rows[0][0]; // Instance of a node-oracledb Lob
    // console.log(clob.type);    // -> 2006 aka oracledb.CLOB
    cb(null, clob);               // do something with the Lob
  });
```

#### PL/SQL LOB Parameter Fetch Example

A PL/SQL procedure such as this:

```sql
PROCEDURE lobs_out (id IN NUMBER, clob_out OUT CLOB, blob_out OUT BLOB) . . .
```

can be called to get the [Lobs](#lobclass) `clob` and `blob`:

```javascript
conn.execute(
  `BEGIN lobs_out(:id, :c, :b); END;`,
  { id: 1,
    c: {type: oracledb.CLOB, dir: oracledb.BIND_OUT},
    b: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
  function(err, result) {
    if (err) {
      return cb(err, conn);
    }

    var clob = result.outBinds.c;
    var blob = result.outBinds.b;
    cb(null, clob, blob);         // do something with the Lobs
  });
```

#### Streaming Out a Lob

Once a Lob is obtained from a query or PL/SQL OUT bind, it can be
streamed out:

```javascript
if (lob === null) {
    // . . . do special handling such as create an empty file or throw an error
}

if (lob.type === oracledb.CLOB) {
  lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
}

lob.on('error', function(err) { cb(err); });
lob.on('close', function() { cb(null); });   // all done.  The Lob is automatically closed.

var outStream = fs.createWriteStream('myoutput.txt');
outStream.on('error', function(err) { cb(err); });

// switch into flowing mode and push the LOB to myoutput.txt
lob.pipe(outStream);
```

Note the Lob is automatically closed at the end of the stream.

An alternative to the `lob.pipe()` call is to have a `data` event on
the Lob Stream which processes each chunk of LOB data separately.
Either a String or Buffer can be built up or, if the LOB is big, each
chunk can be written to another Stream or to a file:

```javascript
if (lob === null) {
    // . . . do special handling such as create an empty file or throw an error
}

var str = "";

lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
lob.on('error', function(err) { cb(err); });
lob.on('close', function() { cb(null); });   // all done.  The Lob is automatically closed.
lob.on('data', function(chunk) {
    str += chunk; // or use Buffer.concat() for BLOBS
});
lob.on('end', function() {
    fs.writeFile(..., str, ...);
});

```

Node-oracledb's [`lob.pieceSize`](#proplobpiecesize) can be used to
control the number of bytes retrieved for each readable 'data' event.
This sets the number of bytes (for BLOBs) or characters (for CLOBs).
The default is [`lob.chunkSize`](#proplobchunksize).  The
recommendation is for it to be a multiple of `chunkSize`.

See [lobbinds.js][52] for a full example.

### <a name="templobdiscussion"></a> 15.6 Using `createLob()` for PL/SQL IN Binds

Node-oracledb applications can create Oracle 'temporary LOBs' by
calling [`connection.createLob()`](#connectioncreatelob).  These are
instances of the [Lob](#lobclass) class. They can be populated with
data and passed to PL/SQL blocks.  This is useful if the data is
larger than feasible for direct binding
(see [Simple Insertion of LOBs](#basiclobinsert)).  These Lobs can
also be used for SQL statement IN binds, however the `RETURNING INTO`
method shown above will be more efficient.

Lobs from `createLob()` will use space in the temporary tablespace
until [`lob.close()`](#lobclose) is called.  Database Administrators
can track this usage by querying [`V$TEMPORARY_LOBS`][13].

#### Passing a Lob Into PL/SQL

The following insertion example is based on [lobplsqltemp.js][53].  It
creates an empty LOB, populates it, and then passes it to a PL/SQL
procedure.

A temporary LOB can be created
with [`connection.createLob()`](#connectioncreatelob):

```javascript
conn.createLob(oracledb.CLOB, function(err, templob) {
  if (err) { . . . }

  // ... else use templob
});
```

Once created, data can be inserted into it.  For example to read a
text file:

```javascript
templob.on('error', function(err) { somecallback(err); });

// The data was loaded into the temporary LOB, so use it
templob.on('finish', function() { somecallback(null, templob); });

// copies the text from 'example.txt' to the temporary LOB
var inStream = fs.createReadStream('example.txt');
inStream.on('error', function(err) { . . . });
inStream.pipe(templob);
```

Now the LOB has been populated, it can be bound in `somecallback()` to
a PL/SQL IN parameter:

```javascript
// For PROCEDURE lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB)
conn.execute(
  `BEGIN lobs_in(:id, :c, null); END;`,
  { id: 3,
    c: templob }, // type and direction are optional for IN binds
  function(err) {
    if (err) { return cb(err); }
    console.log("Call completed");
    return cb(null, conn, templob);
  });
```

When the LOB is no longer needed, it must be closed
with [`lob.close()`](#lobclose):

```javascript
templob.close(function (err) {
  if (err)
    . . .
  else
    // success
});
```

### <a name="closinglobs"></a> 15.7 Closing Lobs

Closing a Lob frees up resources. In particular, the temporary
tablespace storage used by a temporary LOB is released.  Once a Lob is
closed, it can no longer be bound or used for streaming.

Lobs created with [`createLob()`](#connectioncreatelob) should be
explicitly closed with [`lob.close()`](#lobclose).

Persistent or temporary Lobs returned from the database should be
closed with `lob.close()` unless they have been automatically closed.
Automatic closing of returned Lobs occurs when:

- streaming has completed
- a stream error occurs
- the Lob was used as the source for an IN OUT bind

If you try to close a Lob being used for streaming you will get the
error *NJS-023: concurrent operations on a Lob are not allowed*.

The connection must be open when calling `lob.close()` on a temporary
LOB.

The `lob.close()` method emits the [Node.js Stream][16] 'close' event
unless the Lob has already been closed explicitly or automatically.

## <a name="jsondatatype"></a> 16. Oracle Database JSON Data type

Oracle Database 12.1.0.2 introduced native support for JSON data.  You
can use JSON with relational database features, including
transactions, indexing, declarative querying, and views.  You can
project JSON data relationally, making it available for relational
processes and tools.

JSON data in the database is stored as BLOB, CLOB or VARCHAR2 data.
This means that node-oracledb can easily insert and query it.

As an example, the following table has a `PO_DOCUMENT` column that is
enforced to be JSON:

```sql
CREATE TABLE j_purchaseorder (po_document VARCHAR2(4000) CHECK (po_document IS JSON));
```

To insert data using node-oracledb:

```javascript
var data = { "userId": 1, "userName": "Chris", "location": "Australia" };
var s = JSON.stringify(data);  // change JavaScript value to a JSON string

connection.execute(
  `INSERT INTO j_purchaseorder (po_document) VALUES (:bv)`,
  [s]  // bind the JSON string
  function (err) {
  . . .
  });
```

Queries can access JSON with Oracle JSON path expressions.  These
expressions are matched by Oracle SQL functions and conditions to
select portions of the JSON data.  Path expressions can use wildcards
and array ranges.  An example is `$.friends` which is the value of
JSON field `friends`.

Oracle provides SQL functions and conditions to create, query, and
operate on JSON data stored in the database.

For example, `j_purchaseorder` can be queried with:

```
SELECT po.po_document.location FROM j_purchaseorder po
```

With the earlier JSON inserted into the table, the queried value would
be `Australia`.

The `JSON_EXISTS` tests for the existence of a particular value within
some JSON data.  To look for JSON entries that have a `quantity`
field:

```JavaScript
conn.execute(
  `SELECT po_document FROM j_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')`,
  function(err, result) {
    if (err) {
      . . .
    } else {
      var js = JSON.parse(result.rows[0][0]);  // show only first record in this example
      console.log('Query results: ', js);
    }
  });
```

This query would display:

```
{ userId: 1, userName: 'Chris', location: 'Australia' }
```

In Oracle Database 12.2, or later, the [`JSON_OBJECT` ][54] function is a great
way to convert relational table data to JSON:

```javascript
conn.execute(
  `SELECT JSON_OBJECT ('deptId' IS d.department_id, 'name' IS d.department_name) department
  FROM departments d
  WHERE department_id < :did`,
  [50],
  function(err, result) {
    if (err) { console.error(err.message); return; }
    for (var i = 0; i < result.rows.length; i++)
      console.log(result.rows[i][0]);
  });
```

This produces:

```
{"deptId":10,"name":"Administration"}
{"deptId":20,"name":"Marketing"}
{"deptId":30,"name":"Purchasing"}
{"deptId":40,"name":"Human Resources"}
```

See [selectjson.js][55] and [selectjsonblob.js][56] for runnable
examples.

For more information about using JSON in Oracle Database see the
[Database JSON Developer's Guide][57].

## <a name="xmltype"></a> 17. Working with XMLType

`XMLType` columns queried will returns as Strings by default.

However, if desired, the SQL query could be changed to return a CLOB,
for example:

```sql
var sql = 'SELECT XMLTYPE.GETCLOBVAL(res) FROM resource_view';
```

The CLOB can be fetched in node-oracledb as a String
or [Lob](#lobclass).

To insert into an `XMLType` column, directly insert a string
containing the XML, or use a temporary LOB, depending on the data
length.

```javascript
var myxml =
    `<Warehouse>
    <WarehouseId>1</WarehouseId>
    <WarehouseName>Melbourne, Australia</WarehouseName>
    <Building>Owned</Building>
    <Area>2020</Area>
    <Docks>1</Docks>
    <DockType>Rear load</DockType>
    <WaterAccess>false</WaterAccess>
    <RailAccess>N</RailAccess>
    <Parking>Garage</Parking>
    <VClearance>20</VClearance>
    </Warehouse>`;

    connection.execute(
      `INSERT INTO xwarehouses (warehouse_id, warehouse_spec) VALUES (:id, XMLType(:bv))`,
      { id: 1, bv: myxml },
      . . .
```

LOB handling as discussed in the
section [Working with CLOB and BLOB Data](#lobhandling).

## <a name="bind"></a> 18. Bind Parameters for Prepared Statements

SQL and PL/SQL statements may contain bind parameters, indicated by
colon-prefixed identifiers or numerals.  These indicate where
separately specified values are substituted in a statement when it is
executed, or where values are to be returned after execution.

IN binds are values passed into the database.  OUT binds are used to
retrieve data.  IN OUT binds are passed in, and may return a different
value after the statement executes.

Using bind parameters is recommended in preference to constructing SQL
or PL/SQL statements by string concatenation or template literals.
This is for performance and security.

Inserted data that is bound is passed to the database separately from
the statement text.  It can never be executed directly.  This means
there is no need to escape bound data inserted into the database.

If a statement is executed more than once with different values for
the bind parameters, then Oracle can re-use context from the initial
execution, generally improving performance.  However, if similar
statements contain hard coded values instead of bind parameters,
Oracle sees the statement text is different and will be less
efficient.

Bind parameters can be used to substitute data but not the text of the
statement.

Bind variables cannot be used in [DDL][15] statements, for example
`CREATE TABLE` or `ALTER` commands.

Sets of values can bound for use in
[`connection.executeMany()`](#executemany), see [Batch Statement
Execution](#batchexecution).

### <a name="inbind"></a> 18.1 IN Bind Parameters

For IN binds, a data value is passed into the database and substituted
into the statement during execution of SQL or PL/SQL.

#### <a name="bindbyname"></a> Bind by Name

To bind data values, the [`bindParams`](#executebindParams) argument
of `execute()` should contain bind variable objects
with
[`dir`](#executebindParams),
[`val`](#executebindParams), [`type`](#executebindParams) properties.
Each bind variable object name must match the statement's bind
parameter name:

```javascript
var oracledb = require('oracledb');
. . .
connection.execute(
  `INSERT INTO countries VALUES (:country_id, :country_name)`,
  {
    country_id: { dir: oracledb.BIND_IN, val: 90, type: oracledb.NUMBER },
    country_name: { dir: oracledb.BIND_IN, val: "Tonga", type:oracledb.STRING }
  },
  function(err, result) {
    if (err)
      console.error(err.message);
    else
      console.log("Rows inserted " + result.rowsAffected);
  });
```

For IN binds:

- The direction `dir` is `oracledb.BIND_IN`, which is the default when `dir`
  is not specified.

- The `val` attribute may be a constant or a JavaScript variable.

- If `type` is omitted, it is inferred from the bind data value.  If
  `type` is set, it can be `oracledb.STRING`, `oracledb.NUMBER`,
  `oracledb.DATE` or `oracledb.BUFFER` matching the standard Node.js
  type of the data being passed into the database.  Use a bind type of
  `oracledb.BLOB` or `oracledb.CLOB` to pass in [Lob](#lobclass)
  instances.  The type `oracledb.BUFFER` can bind a Node.js Buffer to
  an Oracle Database RAW, LONG RAW or BLOB type.

Since `dir` and `type` have defaults, these attributes are sometimes
omitted for IN binds.  Binds can be like:

```javascript
connection.execute(
  `INSERT INTO countries VALUES (:country_id, :country_name)`,
  {country_id: 90, country_name: "Tonga"},
  function(err, result) {
    if (err)
      console.error(err.message);
    else
      console.log("Rows inserted " + result.rowsAffected);
  });
```

When a bind parameter name is used more than once in the SQL statement,
it should only occur once in the bind object:

```javascript
connection.execute(
  `SELECT first_name, last_name FROM employees WHERE first_name = :nmbv OR last_name = :nmbv`,
  {nmbv: 'Christopher'},
  function(err, result)
  . . .
```

#### <a name="bindbypos"></a> Bind by Position

Instead of using named bind parameters, the data can alternatively be
in an array.  In this example, values are bound to the SQL bind
parameters `:country_id` and `:country_name`:

```javascript
connection.execute(
  `INSERT INTO countries VALUES (:country_id, :country_name)`,
  [90, "Tonga"],
  function(err, result)
  . . .
```

The position of the array values corresponds to the position of the
SQL bind parameters as they occur in the statement, regardless of their
names.  This is still true even if the bind parameters are named like
`:0`, `:1`, etc.  The following snippet will fail because the country
name needs to be the second entry of the array so it becomes the
second value in the `INSERT` statement

```javascript
connection.execute(
  `INSERT INTO countries (country_id, country_name) VALUES (:1, :0)`,
  ["Tonga", 90],  // fail
  . . .
```

In the context of SQL statements, the input array position 'n'
indicates the bind parameter at the n'th position in the
statement. However, in the context of PL/SQL statements the position
'n' in the bind call indicates a binding for the n'th unique parameter
name in the statement when scanned left to right.

If a bind parameter name is repeated in the SQL string
then [bind by name](#bindbyname) syntax should be used.

#### <a name="binddatatypenotes"></a> Bind Data Type Notes

When binding a JavaScript Date value in an `INSERT` statement, it is
inserted as if it represented a TIMESTAMP WITH LOCAL TIME ZONE value.
In the database, TIMESTAMP WITH LOCAL TIME ZONE dates are normalized
to the database time zone, or to the time zone specified for TIMESTAMP
WITH TIME ZONE columns.  If later queried, they are returned in the
session time zone.  See [Fetching Date and Timestamps](#datehandling)
for more information.

The type `oracledb.CURSOR` cannot be used with IN binds.

Binding NCHAR, NVARCHAR or NCLOB for [DML][14] may result in incorrect
character mapping, depending on the database character set and the
database national character set.  It may work in the case where the
database character set can safely convert to the database national
character set.

### <a name="outbind"></a> 18.2 OUT and IN OUT Bind Parameters

OUT binds are used to retrieve data from the database.  IN OUT binds
are passed in, and may return a different value after the statement
executes.  IN OUT binds can be used for PL/SQL calls, but not for SQL.

For each OUT and IN OUT bind parameter
in [`bindParams`](#executebindParams), a bind variable object
containing
[`dir`](#executebindParams),
[`val`](#executebindParams), [`type`](#executebindParams),
and [`maxSize`](#executebindParams) properties is used:

- The `dir` attribute should be `oracledb.BIND_OUT` or
  `oracledb.BIND_INOUT`, depending on whether data is only to be
  returned from the database or additionally passed into the
  database.

- The `val` parameter in needed when binding IN OUT to pass a value
  into the database.  It is not used for OUT binds.

- For `oracledb.BIND_INOUT` parameters, the `type` attribute is
  inferred from the input data type.  Alternatively it can be
  explicitly set to `oracledb.STRING`, `oracledb.NUMBER`,
  `oracledb.DATE`, `oracledb.BLOB`, `oracledb.CLOB` or
  `oracledb.BUFFER`, matching the data type of the Node.js value or
  variable.  The output data type will always be the same as the
  input data type.

  For `oracledb.BIND_OUT` parameters the `type` attribute will be the
  node-oracledb or Node.js data type that data will be returned as.
  It should be `oracledb.STRING`, `oracledb.NUMBER`, `oracledb.DATE`,
  `oracledb.BUFFER`, `oracledb.CURSOR`, `oracledb.BLOB`, or
  `oracledb.CLOB`.  If `type` is not specified for OUT binds then
  `oracledb.STRING` is assumed.

  Oracle Database CLOB data can be bound with a `type` of
  `oracledb.STRING` to return a Node.js String, or as `type` of
  `oracledb.CLOB` to return a [Lob instance](#lobclass).

  Oracle Database BLOB data can be bound with a `type` of
  `oracledb.BUFFER` to return a Node.js Buffer, or as `type` of
  `oracledb.BLOB` to return a [Lob instance](#lobclass).

  Oracle Database RAW and LONG RAW data can be bound with a
  `type` of `oracledb.BUFFER` to return a Node.js Buffer.

  Oracle Database LONG, ROWID and UROWID data can be bound with a
  `type` of `oracledb.STRING` to return a JavaScript String.

- A `maxSize` attribute should be set for `oracledb.STRING` or
  `oracledb.BUFFER` OUT or IN OUT binds.  This is the maximum number
  of bytes the bind parameter will return.  If the output value does
  not fit in `maxSize` bytes, then an error such *ORA-06502: PL/SQL:
  numeric or value error: character string buffer too small* or
  *NJS-016: buffer is too small for OUT binds* occurs.

  A default value of 200 bytes is used when `maxSize` is not provided
  for OUT binds of type `oracledb.STRING` or `oracledb.BUFFER`.

  A string representing a UROWID may be up to 5267 bytes long in
  node-oracledb.

For [PL/SQL Associative Array binds](#plsqlindexbybinds)
a [`maxArraySize`](#executebindParams) property is also required

Note that before a PL/SQL block returns, all OUT binds should be set
to NULL or, for REF CURSORS, to an empty result set.  See this [GitHub
Issue][102].

#### <a name="outbinds"></a> Accessing OUT Bind Values

The [`results`](#executecallback) parameter of the `execute()`
callback contains an [`outBinds`](#execoutbinds) property with the
returned OUT and IN OUT bind values.

Given the creation of the PL/SQL procedure `TESTPROC`:

```sql
CREATE OR REPLACE PROCEDURE testproc (
p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
AS
BEGIN
  p_inout := p_in || p_inout;
  p_out := 101;
END;
/
show errors
```

The procedure `TESTPROC` can be called with:

```javascript
var oracledb = require('oracledb');
. . .
var bindVars = {
  i:  'Chris', // default direction is BIND_IN. Data type is inferred from the data
  io: { val: 'Jones', dir: oracledb.BIND_INOUT },
  o:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
}
connection.execute(
  `BEGIN testproc(:i, :io, :o); END;`,
  bindVars,
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds);
  });
```

Since `bindParams` is passed as an object, the `outBinds` property is
also an object.  The Node.js output is:

```
{ io: 'ChrisJones', o: 101 }
```

PL/SQL allows named parameters in procedure and function calls.  This
can be used in `execute()` like:

```
  `BEGIN testproc(p_in => :i, p_inout => :io, p_out => :o); END;`,
```

An alternative to node-oracledb's 'bind by name' syntax is 'bind by array' syntax:

```javascript
var bindVars = [
  'Chris',
  { val: 'Jones', dir: oracledb.BIND_INOUT },
  { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
];
```

When [`bindParams`](#executebindParams) is passed as an array, then
`outBinds` is returned as an array, with the same order as the OUT
binds in the statement:

```
[ 'ChrisJones', 101 ]
```

Mixing positional and named syntax is not supported.  The following
will throw an error:

```javascript
var bindVars = [
  'Chris',                                                  // valid
  { val: 'Jones', dir: oracledb.BIND_INOUT },               // valid
  { o: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } }  // invalid
];
```

### <a name="dmlreturn"></a> 18.3 DML RETURNING Bind Parameters

[DML][14] statements query or manipulate data in existing schema
objects.

Bind parameters from "DML RETURNING" statements (such as `INSERT
... RETURNING ... INTO ...`) can use `oracledb.BLOB`, `oracledb.CLOB`, `oracledb.STRING`,
`oracledb.NUMBER` or `oracledb.DATE` for the OUT [`type`](#executebindParams).

For `oracledb.STRING` types, an error occurs if [`maxSize`](#executebindParams)
is not large enough to hold a returned value.

Note each DML RETURNING bind OUT parameter is returned as an array
containing zero or more elements.  Application code that is designed
to expect only one value could be made more robust if it confirms the
returned array length is not greater than one.  This will help identify
invalid data or an incorrect `WHERE` clause that causes more results
to be returned.

Oracle Database DATE, TIMESTAMP, TIMESTAMP WITH LOCAL TIME ZONE
and TIMESTAMP WITH TIME ZONE types can be bound as `oracledb.DATE` for DML
RETURNING.  These types can also be bound as `oracledb.STRING`, if desired.
ROWID and UROWID data to be returned can be bound as `oracledb.STRING`.
Note that a string representing a UROWID may be up to 5267 bytes
long.

No duplicate binds are allowed in a DML statement with a `RETURNING`
clause, and no duplication is allowed between bind parameters in the
DML section and the `RETURNING` section of the statement.

One common use case is to return an 'auto incremented' key values, see
[Auto-Increment Columns](#autoincrement).

An example of DML RETURNING binds is:

```javascript
var oracledb = require('oracledb');
. . .
connection.execute(
   `UPDATE mytab SET name = :name
    WHERE id = :id
    RETURNING id, ROWID INTO :ids, :rids`,
  {
    id:    1001,
    name:  "Krishna",
    ids:   { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    rids:  { type: oracledb.STRING, dir: oracledb.BIND_OUT }
  },
  function(err, result) {
    if (err) { console.error(err); return; }
    console.log(result.outBinds);
  });
```

If the `WHERE` clause matches one record, the output would be like:

```
{ ids: [ 1001 ], rids: [ 'AAAbvZAAMAAABtNAAA' ] }
```

When a couple of rows match, the output could be:

```
{ ids: [ 1001, 1002 ],
  rids: [ 'AAAbvZAAMAAABtNAAA', 'AAAbvZAAMAAABtNAAB' ] }
```

If the `WHERE` clause matches no rows, the output would be:

```
{ ids: [], rids: [] }
```

### <a name="refcursors"></a> 18.4 REF CURSOR Bind Parameters

Oracle REF CURSORS can be fetched in node-oracledb by binding a
`oracledb.CURSOR` to a PL/SQL call.  The resulting bind variable becomes a
[ResultSet](#resultsetclass), allowing rows to be fetched using
[`getRow()`](#getrow) or [`getRows()`](#getrows).  The ResultSet can
also be converted to a Readable Stream by using
[`toQueryStream()`](#toquerystream).

If using `getRow()` or `getRows()` the ResultSet must be freed using
[`close()`](#close) when all rows have been fetched, or when the
application does not want to continue getting more rows.  If the REF
CURSOR is set to NULL or is not set in the PL/SQL procedure then the
returned ResultSet is invalid and methods like `getRows()` will
return an error when invoked.

Given a PL/SQL procedure defined as:

```sql
CREATE OR REPLACE PROCEDURE get_emp_rs (
  p_sal IN NUMBER,
  p_recordset OUT SYS_REFCURSOR) AS
BEGIN
  OPEN p_recordset FOR
    SELECT first_name, salary, hire_date
    FROM   employees
    WHERE  salary > p_sal;
END;
/
```

This PL/SQL procedure can be called in node-oracledb using:

```javascript
var oracledb = require('oracledb');

var numRows = 10;  // number of rows to return from each call to getRows()

var plsql = "BEGIN get_emp_rs(:sal, :cursor); END;";
var bindvars = {
  sal:  6000,
  cursor:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
}

connection.execute(
  plsql,
  bindvars,
  function(err, result) {
    if (err) { . . . }
    fetchRowsFromRS(connection, result.outBinds.cursor, numRows);
  });

function fetchRowsFromRS(connection, resultSet, numRows) {
  resultSet.getRows( // get numRows rows
    numRows,
    function (err, rows) {
      if (err) {
         . . .                        // close the ResultSet and release the connection
      } else if (rows.length > 0) {   // got some rows
        console.log(rows);            // process rows
        if (rows.length === numRows)  // might be more rows
          fetchRowsFromRS(connection, resultSet, numRows);
        else                          // got fewer rows than requested so must be at end
          . . .                       // close the ResultSet and release the connection
      } else {                        // else no rows
          . . .                       // close the ResultSet and release the connection
      }
    });
}
```

See [refcursor.js][40] for a complete example.

To convert the REF CURSOR ResultSet to a stream, use
[`toQueryStream()`](#toquerystream).  With the PL/SQL and bind values
from the previous examples, the code would become:

```javascript
connection.execute(
  plsql,
  bindvars,
  function(err, result) {
    if (err) { . . . }
    fetchRCFromStream(connection, result.outBinds.cursor);
  });

function fetchRCFromStream(connection, cursor) {
  var stream = cursor.toQueryStream();

  stream.on('error', function (error) {
    // console.log("stream 'error' event");
    console.error(error);
    return;
  });

  stream.on('metadata', function (metadata) {
    // console.log("stream 'metadata' event");
    console.log(metadata);
  });

  stream.on('data', function (data) {
    // console.log("stream 'data' event");
    console.log(data);
  });

  stream.on('end', function () {
    // console.log("stream 'end' event");
    connection.release(
      function(err) {
        if (err) {
          console.error(err.message);
        }
      });
  });
}
```

The connection must remain open until the stream is completely read.
Query results must be fetched to completion to avoid resource leaks.
The ResultSet `close()` call for streaming query results will be
executed internally when all data has been fetched.

### <a name="lobbinds"></a> 18.5 LOB Bind Parameters

Database CLOBs can be bound with `type` set
to [`oracledb.CLOB`](#oracledbconstants).  Database BLOBs can be bound
as [`oracledb.BLOB`](#oracledbconstants).  These binds accept, or
return, node-oracledb [Lob](#lobclass) instances, which implement the
Node.js Stream interface.

Lobs may represent Oracle Database persistent LOBs (those stored in
tables) or temporary LOBs (such as those created
with [`createLob()`](#connectioncreatelob) or returned by some SQL and
PL/SQL operations).

LOBs can be bound with direction `oracledb.BIND_IN`, `oracledb.BIND_OUT` or
`oracledb.BIND_INOUT`, depending on context.

Note that any PL/SQL OUT LOB parameter should be initialized in the
PL/SQL block - even just to NULL - before the PL/SQL code
completes. Make sure to do this in all PL/SQL code paths including in
error handlers. This prevents node-oracledb throwing the error
*DPI-007: invalid OCI handle or descriptor*.

In many cases it will be easier to work with JavaScript Strings and
Buffers instead of [Lobs](#lobclass).  These types can be bound
directly for SQL IN binds to insert into, or update, LOB columns.
They can also be bound to PL/SQL LOB parameters.  Use the bind
type [`oracledb.STRING`](#oracledbconstants) for CLOBs
and [`oracledb.BUFFER`](#oracledbconstants) for BLOBs.  The default
size used for these binds in the OUT direction is 200, so set
`maxSize` appropriately.

See [Working with CLOB and BLOB Data](#lobhandling) for examples and
more information on binding and working with LOBs.

#### Size Limits for Binding LOBs to Strings and Buffers

When CLOBs are bound as `oracledb.STRING`, or BLOBs are bound as
`oracledb.BUFFER`, the limitation on binding is the memory available
to Node.js and the V8 engine.  For data larger than several megabytes,
it is recommended to bind as `oracledb.CLOB` or `oracledb.BLOB` and
use [Lob streaming](#streamsandlobs).  If you try to create large
Strings or Buffers in Node.js you will see errors like *JavaScript
heap out of memory*, or other space related messages.

Internally, temporary LOBs are used when binding Strings and Buffers
larger than 32 KB for PL/SQL calls.  Freeing of the temporary LOB is
handled automatically.  For SQL calls no temporary LOBs are used.

### <a name="plsqlindexbybinds"></a> 18.6 PL/SQL Collection Associative Array (Index-by) Bind Parameters

Arrays of strings and numbers can be bound to PL/SQL IN, IN OUT, and
OUT parameters of PL/SQL INDEX BY associative array type.  This type
was formerly called PL/SQL tables or index-by tables.  This method of
binding can be a very efficient way of transferring small data sets to
PL/SQL.  Note PL/SQL's VARRAY and nested table collection types cannot
be bound.

Given this table and PL/SQL package:

```sql
DROP TABLE mytab;
CREATE TABLE mytab (id NUMBER, numcol NUMBER);

CREATE OR REPLACE PACKAGE mypkg IS
  TYPE numtype IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;
  PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype);
  PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype);
END;
/

CREATE OR REPLACE PACKAGE BODY mypkg IS

  PROCEDURE myinproc(p_id IN NUMBER, vals IN numtype) IS
  BEGIN
    FORALL i IN INDICES OF vals
      INSERT INTO mytab (id, numcol) VALUES (p_id, vals(i));
  END;

  PROCEDURE myoutproc(p_id IN NUMBER, vals OUT numtype) IS
  BEGIN
    SELECT numcol BULK COLLECT INTO vals FROM mytab WHERE id = p_id ORDER BY 1;
  END;

END;
/
```

To bind an array in node-oracledb using "bind by name" syntax for insertion into `mytab` use:

```javascript
connection.execute(
  `BEGIN mypkg.myinproc(:id, :vals); END;`,
  {
    id: 1234,
    vals: { type: oracledb.NUMBER,
             dir: oracledb.BIND_IN,
             val: [1, 2, 23, 4, 10]
          }
  }, . . .
```

Alternatively, "bind by position" syntax can be used:

 ```javascript
connection.execute(
  `BEGIN mypkg.myinproc(:id, :vals); END;`,
  [
    1234,
    { type: oracledb.NUMBER,
       dir: oracledb.BIND_IN,
       val: [1, 2, 23, 4, 10]
    }
  ],

  function (err) { . . . });
```

After executing either of these `mytab` will contain:

```
    ID         NUMCOL
---------- ----------
      1234          1
      1234          2
      1234         23
      1234          4
      1234         10
```

The [`type`](#executebindParams) must be set for PL/SQL array binds.
It can be set to [`oracledb.STRING`](#oracledbconstantsnodbtype) or [`oracledb.NUMBER`](#oracledbconstantsnodbtype).

For OUT and IN OUT binds, the [`maxArraySize`](#executebindParams)
bind property must be set.  Its value is the maximum number of
elements that can be returned in an array.  An error will occur if the
PL/SQL block attempts to insert data beyond this limit.  If the PL/SQL
code returns fewer items, the JavaScript array will have the actual
number of data elements and will not contain null entries.  Setting
`maxArraySize` larger than needed will cause unnecessary memory
allocation.

For IN OUT binds, `maxArraySize` can be greater than the number of
elements in the input array.  This allows more values to be returned
than are passed in.

For IN binds, `maxArraySize` is ignored, as also is `maxSize`.

For `oracledb.STRING` IN OUT or OUT binds, the string length
[`maxSize`](#executebindParams) property may be set.  If it is not set
the memory allocated per string will default to 200 bytes.  If the
value is not large enough to hold the longest string data item in the
collection a runtime error occurs.  To avoid unnecessary memory
allocation, do not let the size be larger than needed.

The next example fetches an array of values from a table.  First,
insert these values:

```sql
INSERT INTO mytab (id, numcol) VALUES (99, 10);
INSERT INTO mytab (id, numcol) VALUES (99, 25);
INSERT INTO mytab (id, numcol) VALUES (99, 50);
COMMIT;
```

With these values, the following node-oracledb code will print
`[ 10, 25, 50 ]`.

```javascript
connection.execute(
  `BEGIN mypkg.myoutproc(:id, :vals); END;`,
  {
    id: 99,
    vals: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_OUT,
            maxArraySize: 10          // allocate memory to hold 10 numbers
        }
  },
  function (err, result) {
    if (err) { console.error(err.message); return; }
    console.log(result.outBinds.vals);
  });
```

If `maxArraySize` was reduced to `2`, the script would fail with:

```
ORA-06513: PL/SQL: index for PL/SQL table out of range for host language array
```

See [Oracledb Constants](#oracledbconstants) and
[execute(): Bind Parameters](#executebindParams) for more information
about binding.

See [plsqlarray.js][58] for a runnable example.

### <a name="sqlwherein"></a> 18.7 Binding Multiple Values to a SQL `WHERE IN` Clause

Binding a single JavaScript value into a SQL `WHERE IN` clause is easy:

```javascript
sql = 'SELECT last_name FROM employees WHERE first_name IN (:bv)';
binds = ['Christopher'];
connection.execute(sql, binds, function(...));
```

But a common use case for a query `WHERE IN` clause is for multiple
values, for example when a web user selects multiple check-box options
and the query should match all chosen values.

Trying to associate multiple data values with a single bind parameter
will not work.  To use a fixed, small number of values in an `WHERE IN`
bind clause, the SQL query should have individual bind parameters, for
example:

```javascript
sql = 'SELECT last_name FROM employees WHERE first_name IN (:bv1, :bv2, :bv3, :bv4)';
binds = ['Alyssa', 'Christopher', 'Hazel', 'Samuel'];
connection.execute(sql, binds, function(...));
```


If you sometimes execute the query with a smaller number of items, a
null can be bound for the 'missing' values:

```javascript
binds = ['Alyssa', 'Christopher', 'Hazel', null];
```

When the exact same statement text is re-executed many times
regardless of the number of user supplied values, you get performance
and scaling benefits from not having multiple, unique SQL statements
being run.

Another solution when the number of data items is only known at
runtime is to build up an exact SQL string like:

```javascript
binds = ['Christopher', 'Hazel', 'Samuel'];
sql = "SELECT first_name, last_name FROM employees WHERE first_name IN (";
for (var i=0; i < binds.length; i++)
   sql += (i > 0) ? ", :" + i : ":" + i;
sql += ")";
```

This will construct a SQL statement:

```
SELECT first_name, last_name FROM employees WHERE first_name IN (:0, :1, :2)
```

Binds are still used for security.  But, depending how often this
query is executed, and how changeable the number of bind values is,
you can end up with lots of 'unique' query strings being executed.
You might not get the statement caching benefits that re-executing a
fixed SQL statement would have.

Another solution for a larger number of values is to construct a SQL
statement like:

```
SELECT ... WHERE col IN ( <something that returns a list of rows> )
```

The easiest way to do the `<something that returns a list of rows>`
will depend on how the data is initially represented and the number of
items.  You might look at using `CONNECT BY` or nested tables.  Or,
for really large numbers of items, you might prefer to use a global
temporary table.  Some solutions are given in [On Cursors, SQL, and
Analytics][59] and in [this StackOverflow answer][60].

### <a name="sqlbindtablename"></a> 18.8 Binding Column and Table Names in Queries

It is not possible to bind table names in queries.  Instead use a
hardcoded whitelist of names to build the final SQL statement, for
example:

```javascript
const validTables = ['LOCATIONS', 'DEPARTMENTS'];

const tableName = getTableNameFromEndUser();

if (!validTables.includes(tableName)) {
  throw new Error('Invalid table name');
}

const query = 'SELECT * FROM ' + tableName;
```

The same technique can be used to construct the list of selected
column names.  Make sure to use a whitelist of names to avoid SQL
Injection security risks.

Each final SQL statement will obviously be distinct, and will use a
slot in the [statement cache](#stmtcache).

It is possible to bind column names used in an ORDER BY:

```javascript
const sql = `SELECT first_name, last_name
             FROM employees
             ORDER BY
               CASE :ob
                 WHEN 'FIRST_NAME' THEN first_name
                 ELSE last_name
               END`;

const columnName = getColumnNameFromEndUser();
const binds = [columnName];

let result = await conn.execute(sql, binds);
```

In this example, when `columnName` is 'FIRST_NAME' then the result set
will be ordered by first name, otherwise the order will be by last
name.

You should analyze the statement usage patterns and optimizer query
plan before deciding whether to using binds like this, or to use
multiple hard-coded SQL statements, each with a different ORDER BY.

## <a name="batchexecution"></a> 19. Batch Statement Execution

The [`connection.executeMany()`](#executemany) method allows many sets
of data values to be bound to one DML or PL/SQL statement for
execution.  It is like calling [`connection.execute()`](#execute)
multiple times but requires fewer [round-trips][124].  This is an efficient
way to handle batch changes, for example when doing bulk inserts, or
for updating multiple rows.  The method cannot be used for queries.

The `executeMany()` method supports IN, IN OUT and OUT binds for most
data types except [PL/SQL Collection Associative
Arrays](#plsqlindexbybinds).

There are runnable examples in the GitHub [examples][3] directory.

For example, to insert three records into the database:

```javascript
var sql = "INSERT INTO mytab VALUES (:a, :b)";

var binds = [
  { a: 1, b: "One" },
  { a: 2, b: "Two" },
  { a: 3, b: "Three" }
];

var options = {
  autoCommit: true,
  bindDefs: {
    a: { type: oracledb.NUMBER },
    b: { type: oracledb.STRING, maxSize: 5 }
  } };

connection.executeMany(sql, binds, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result);  // { rowsAffected: 3 }
  }
});
```

Strings and Buffers require a `maxSize` value in `bindDefs`.  It must
be the length (or greater) of the longest data value.  For efficiency,
keep the size as small as possible.

The [`options`](#executemanyoptions) parameter is optional.

If [`bindDefs`](#executemanyoptbinddefs) is not set, then the bind
direction is assumed to be IN, and the [bind data](#executemanybinds)
are used to determine the bind variable types, names and maximum
sizes.  Using `bindDefs` is generally recommended because it removes
the overhead of scanning all records.

The bind definitions `bindDefs` can also use "bind by position"
syntax, see the next examples.

#### Identifying Affected Rows

When executing a DML statement the number of database rows affected
for each input record can be shown by setting
[`dmlRowCounts`](#execmanydmlrowscounts).  For example when deleting
rows:

```javascript
const sql = "DELETE FROM tab WHERE id = :1";

const binds = [
  [20],
  [30],
  [40]
];

const options = { dmlRowCounts: true };

connection.executeMany(sql, binds, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result.dmlRowCounts);
  }
});
```

If the table originally contained three rows with id of 20, five rows
with id of 30 and six rows with id of 40, then the output would be:

```
[ 3, 5, 6 ]
```


#### Handling Data Errors

With large sets of data, it can be helpful not to abort processing on
the first data error, but to continue processing and resolve the
errors later.

When [`batchErrors`](#executemanyoptbatcherrors) is *true*, processing
will continue even if there are data errors in some records.  The
`executeMany()` callback error parameter is not set.  Instead, an
array containing each error will be returned in the callback `result`
parameter.  All valid data records will be processed and a transaction
will be started but not committed, even if `autoCommit` is *true*.
The application can examine the errors, take action, and explicitly
commit or rollback, as desired.

For example:

```
var sql = "INSERT INTO childtab VALUES (:1, :2, :3)";

var binds = [
  [1016, 10, "Child 2 of Parent A"],
  [1017, 10, "Child 3 of Parent A"],
  [1018, 20, "Child 4 of Parent B"],
  [1018, 20, "Child 4 of Parent B"],   // duplicate key
  [1019, 30, "Child 3 of Parent C"],
  [1020, 40, "Child 4 of Parent D"],
  [1021, 75, "Child 1 of Parent F"],   // parent does not exist
  [1022, 40, "Child 6 of Parent D"]
];

var options = {
  autoCommit: true,
  batchErrors: true,
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.NUMBER },
    { type: oracledb.STRING, maxSize: 20 }
  ]
};

connection.executeMany(sql, binds, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result.batchErrors);
  }
});
```

The output is an array of [error objects](#errorobj) that were
reported during execution.  The `offset` property corresponds to the
0-based index of the `executeMany()` [binds
parameter](#executemanybinds) array, indicating which record could
not be processed:

```
   [ { Error: ORA-00001: unique constraint (HR.CHILDTAB_PK) violated errorNum: 1, offset: 3 },
     { Error: ORA-02291: integrity constraint (HR.CHILDTAB_FK) violated - parent key not found errorNum: 2291, offset: 6 } ]
```

Note that some classes of error will always return via the
`executeMany()` callback error object, not as batch errors.  No
transaction is created in this case.  This includes errors where
string or buffer data is larger than the specified
[`maxSize`](#executemanyoptbinddefs) value.

#### DML RETURNING

Values can be returned with DML RETURNING syntax:

```
var sql = "INSERT INTO tab VALUES (:1) RETURNING ROWID INTO :2";

var binds = [
  ["One"],
  ["Two"],
  ["Three"]
];

var options = {
  bindDefs: [
    { type: oracledb.STRING, maxSize: 5 },
    { type: oracledb.STRING, maxSize: 18, dir: oracledb.BIND_OUT  },
  ]
};

connection.executeMany(sql, binds, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result.outBinds);
  }
});
```

Output is:

```
[ [ [ 'AAAmI9AAMAAAAnVAAA' ] ],
  [ [ 'AAAmI9AAMAAAAnVAAB' ] ],
  [ [ 'AAAmI9AAMAAAAnVAAC' ] ] ]
```

#### Calling PL/SQL

The `executeMany()` method can be used to execute a PL/SQL statement
multiple times with different input values.  For example, the
following PL/SQL procedure:

```sql
CREATE PROCEDURE testproc (
  a_num IN NUMBER,
  a_outnum OUT NUMBER,
  a_outstr OUT VARCHAR2)
AS
BEGIN
  a_outnum := a_num * 2;
  FOR i IN 1..a_num LOOP
    a_outstr := a_outstr || 'X';
  END LOOP;
END;
/
```

can be called like:

```javascript
var sql = "BEGIN testproc(:1, :2, :3); END;";

// IN binds
var binds = [
  [1],
  [2],
  [3],
  [4]
];

var options = {
  bindDefs: [
    { type: oracledb.NUMBER },
    { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
  ]
};

connection.executeMany(sql, binds, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result.outBinds);
  }
});
```

The returned bind values are:

```
[ [ 2, 'X' ],
  [ 4, 'XX' ],
  [ 6, 'XXX' ],
  [ 8, 'XXXX' ] ]
```

The variant of `executeMany()` that accepts a number of iterations is
useful when there no bind values, or only OUT bind values.  This
example calls a PL/SQL block eight times:

```javascript
var sql = `DECLARE
             t_id NUMBER;
           BEGIN
             SELECT NVL(COUNT(*), 0) + 1 INTO t_id FROM testtable;
             INSERT INTO testtable VALUES (t_id, 'Test String ' || t_id);
             SELECT SUM(id) INTO :1 FROM testtable;
           END;`

var options = {
  bindDefs: [
    { type : oracledb.NUMBER, dir : oracledb.BIND_OUT }
  ]
};

var numIterations = 8;

connection.executeMany(sql, numIterations, options, function (err, result) {
  if (err) {
    console.error(err)
  } else {
    console.log(result.outBinds);
  }
});
```

Output would be an array of eight values such as:

```
[ [ 6 ], [ 10 ], [ 15 ], [ 21 ], [ 28 ], [ 36 ], [ 45 ], [ 55 ] ]
```

## <a name="transactionmgt"></a> 20. Transaction Management

By default, [DML][14] statements are not committed in node-oracledb.

The node-oracledb add-on implements [`commit()`](#commit) and
[`rollback()`](#rollback) methods that can be used to explicitly
control transactions.

If the [`autoCommit`](#propdbisautocommit) flag is set to *true*,
then a commit occurs at the end of each `execute()` call.  Unlike an
explicit `commit()`, this does not require a [round-trip][124] to the
database.  For maximum efficiency, set `autoCommit` to *true* for the
last `execute()` call of a transaction in preference to using an
additional, explicit `commit()` call.

When a connection is released, any ongoing transaction will be rolled
back.  Therefore if a released, pooled connection is re-used by a
subsequent [`pool.getConnection()`](#getconnectionpool) call
(or [`oracledb.getConnection()`](#getconnectiondb) call that uses a
pool), then any DML statements performed on the obtained connection are
always in a new transaction.

When an application ends, any uncommitted transaction on a connection
will be rolled back.

Note: Oracle Database will implicitly commit when a [DDL][15]
statement is executed irrespective of the value of `autoCommit`.

## <a name="stmtcache"></a> 21. Statement Caching

Node-oracledb's [`execute()`](#execute) and
[`queryStream()`](#querystream) methods use the [Oracle Call Interface
statement cache][61] to make re-execution of statements efficient.
This cache removes the need for the separate 'prepare' or 'parse'
method which is sometimes seen in other Oracle APIs: there is no
separate method in node-oracledb.

Each non-pooled connection and each session in the connection pool has
its own cache of statements with a default size of 30.  Statement
caching lets cursors be used without re-parsing the statement.
Statement caching also reduces meta data transfer costs between the
node-oracledb and the database.  Performance and scalability are
improved.

In general, set the statement cache to the size of the working set of
statements being executed by the application.

Statement caching can be disabled by setting the size to 0.  Disabling
the cache may be beneficial when the quantity or order of statements
causes cache entries to be flushed before they get a chance to be
reused.  For example if there are more distinct statements than cache
slots, and the order of statement execution causes older statements to
be flushed from the cache before the statements are re-executed.

The statement cache size can be set globally with [stmtCacheSize](#propdbstmtcachesize):

```javascript
var oracledb = require('oracledb');
oracledb.stmtCacheSize = 40;
```

The value can be overridden in an `oracledb.getConnection()` call:

```javascript
var oracledb = require('oracledb');

var mypw = ... // the hr schema password

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/XEPDB1",
    stmtCacheSize : 40
  },
  function(err, connection) {
    . . .
  });
```

The value can also be overridden in the `poolAttrs` parameter to
the [`createPool()`](#createpool) method.

With Oracle Database 12c, or later, the statement cache size can be automatically tuned with the
[External Configuration](#oraaccess) *oraaccess.xml* file.

To manually tune the statement cache size, monitor general application
load and the [Automatic Workload Repository][62] (AWR) "bytes sent via SQL*Net to client" values.  The
latter statistic should benefit from not shipping statement metadata
to node-oracledb.  Adjust the statement cache size to your
satisfaction.

## <a name="cqn"></a> 22. Continuous Query Notification (CQN)

[Continuous Query Notification (CQN)][99] lets node-oracledb
applications register a JavaScript method that is invoked when changed
data is committed to the database, regardless of the user or the
application that made the change.  For example your application may be
interested in knowing if a table used for lookup data has changed so
the application can update a local cache of that table.

CQN is suitable for infrequently modified tables.  It is recommended
to avoid frequent subscription and unsubscription.

The connection must be created with [`events`](#propdbevents) mode
*true*.

The database must be able to connect to the node-oracledb machine for
notifications to be received.  Typically this means that the machine
running node-oracledb needs a fixed IP address.  Note
`connection.subscribe()` does not verify that this reverse connection
is possible.  If there is any problem sending a notification, then the
callback method will not be invoked.  The configuration options can
include an [`ipAddress`](#consubscribeoptipaddress) and
[`port`](#consubscribeoptport) on which to listen for notifications,
otherwise the database chooses values.

To register interest in database changes, the
[`connection.subscribe()`](#consubscribe) method is passed an
arbitrary name and an [`options`](#consubscribeoptions) object that
controls notification.  In particular `options` contains a valid SQL
query and a JavaScript callback:

```javascript
function myCallback(message) {
    console.log(message);
}

options = {
    sql      : "select * from mytable",  // query of interest
    callback : myCallback                // method called by notifications
};

connection.subscribe('mysub', options, function(err) { ... } );
```

In this example, whenever a change to `mytable` is committed then
`myCallback()` is invoked.  The callback
[`message`](#consubscribeoptcallback) parameter contains information
about the notification.

CQN notification behavior is widely configurable by the subscription
[`options`](#consubscribeoptions).  Choices include specifying what
types of SQL should trigger a notification, whether notifications
should survive database loss, and control over unsubscription.  You
can also choose whether notification messages will include ROWIDs of
affected rows.

The `connection.subscribe()` method may be called multiple times with
the same `name`.  In this case, the second and subsequent invocations
ignore all `options` properties other than
[`sql`](#consubscribeoptsql) and [`binds`](#consubscribeoptbinds).
Instead, the new SQL statement is registered to the same subscription,
and the same JavaScript notification callback is used.  For
performance reasons this can be preferable to creating a new
subscription for each query.

You can view information about registrations by querying
`USER_CHANGE_NOTIFICATION_REGS` table.

When notifications are no longer required, the subscription name can
be passed to [`connection.unsubscribe()`](#conunsubscribe).

By default, object-level (previously known as Database Change
Notification) occurs and the JavaScript notification method is invoked
whenever a database transaction is committed that changes an object
the query references, regardless of whether the actual query result
changed.  However if the subscription option
[`qos`](#consubscribeoptqos) is
[`oracledb.SUBSCR_QOS_QUERY`](#oracledbconstantssubscription) then
query-level notification occurs.  In this mode, the database notifies
the application whenever a transaction changes the result of the
registered query and commits.  For example:

```javascript
options = {
    sql      : "select * from mytable where key > 100",  // query of interest
    callback : myCallback,                               // method called by notifications
    qos      : oracledb.SUBSCR_QOS_QUERY                 // CQN
};
```

In this example, if a new `key` of 10 was inserted then no
notification would be generated.  If a key wth `200` was inserted, then
a notification would occur.

Before using CQN, users must have appropriate permissions, for
example:

```sql
SQL> CONNECT system

SQL> GRANT CHANGE NOTIFICATION TO hr;
```

Below is an example of CQN that uses object-level notification and
grouped notifications in batches at 10 second intervals.  After 60
seconds, the notification callback is unregisted and no more
notifications will occur.  The quality of service flags indicate
ROWIDs should be returned in the callback:

```javascript
let interval = setInterval(function() {
    console.log("waiting...");
}, 5000);

function myCallback(message)
{
    console.log("Message type:", message.type);
    if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
        clearInterval(interval);
        console.log("Deregistration has taken place...");
        return;
    }
    console.log("Message database name:", message.dbName);
    console.log("Message transaction id:", message.txId);
    for (let i = 0; i < message.tables.length; i++) {
        let table = message.tables[i];
        console.log("--> Table Name:", table.name);
        console.log("--> Table Operation:", table.operation);
        if (table.rows) {
            for (j = 0; j < table.rows.length; j++) {
                let row = table.rows[j];
                console.log("--> --> Row Rowid:", row.rowid);
                console.log("--> --> Row Operation:", row.operation);
                console.log(Array(61).join("-"));
            }
        }
        console.log(Array(61).join("="));
    }
}

const options = {
    sql           : "SELECT * FROM MY mytable",
    callback      : myCallback,
    timeout       : 60,
    qos           : oracledb.SUBSCR_QOS_ROWIDS,
    groupingClass : oracledb.SUBSCR_GROUPING_CLASS_TIME,
    groupingValue : 10,
    groupingType  : oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
};

try {
    // This is Node 8 syntax, but can be changed to callbacks

    let conn = await oracledb.getConnection({
      user          : "hr",
      password      : mypw,  // mypw contains the hr schema password
      connectString : "localhost/XEPDB1",
      events        :  true
    });

    await connection.subscribe('mysub', options);
    console.log("Subscription created...");

} catch (err) {
    console.error(err);
    clearInterval(interval);
}
```

If two new rows were inserted into the table and then committed,
output might be like:

```
Message type: 6
Message database name: orcl
Message transaction id: <Buffer 06 00 21 00 f5 0a 00 00>
--> Table Name: CJ.MYTABLE
--> Table Operation: 2
--> --> Row Rowid: AAAVH6AAMAAAAHjAAW
--> --> Row Operation: 2
------------------------------------------------------------
--> --> Row Rowid: AAAVH6AAMAAAAHjAAX
--> --> Row Operation: 2
------------------------------------------------------------
```

Here, the message type 6 corresponds to
[`oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE`](#oracledbconstantssubscription)
and the row operations of 2 correspond to
[`oracledb.CQN_OPCODE_INSERT`](#oracledbconstantscqn).

There are runnable examples in the GitHub [examples][3] directory.

## <a name="aq"></a> 23. Advanced Queuing (AQ)

[Oracle Advanced Queuing][129] allows applications to use
producer-consumer message passing.  Oracle AQ is highly configurable.
Messages can queued by multiple producers.  Different consumers can
filter messages for them.  Messages can also be propagated to queues
in other databases.  Oracle AQ has PL/SQL, Java, C and HTTPS
interfaces, allowing many applications to communicate via messages.
From node-oracledb, the PL/SQL interface is currently used via
explicit calls.

The following example shows how to enqueue and dequeue a simple
message.

First, create a new Oracle user `demoqueue` with permission to create
and use queues.  Connect as SYSDBA and run:

```sql
CREATE USER demoqueue IDENTIFIED BY welcome;
ALTER USER demoqueue DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
GRANT CONNECT, RESOURCE TO DEMOQUEUE;
GRANT AQ_ADMINISTRATOR_ROLE, AQ_USER_ROLE TO demoqueue;
GRANT EXECUTE ON DBMS_AQ TO demoqueue;
GRANT CREATE TYPE TO demoqueue;
```

The message in this example contains a name and address.  To create a
payload type for this, and to start a queue for this payload, connect
as the new `demoqueue` user and run:

```
-- For the data we want to queue
CREATE OR REPLACE TYPE USER_ADDRESS_TYPE AS OBJECT (
   NAME        VARCHAR2(10),
   ADDRESS     VARCHAR2(50)
);
/

-- Create and start a queue
BEGIN
 DBMS_AQADM.CREATE_QUEUE_TABLE(
   QUEUE_TABLE        =>  'DEMOQUEUE.ADDR_QUEUE_TAB',
   QUEUE_PAYLOAD_TYPE =>  'DEMOQUEUE.USER_ADDRESS_TYPE');
END;
/

BEGIN
 DBMS_AQADM.CREATE_QUEUE(
   QUEUE_NAME         =>  'DEMOQUEUE.ADDR_QUEUE',
   QUEUE_TABLE        =>  'DEMOQUEUE.ADDR_QUEUE_TAB');
END;
/

BEGIN
 DBMS_AQADM.START_QUEUE(
   QUEUE_NAME         => 'DEMOQUEUE.ADDR_QUEUE',
   ENQUEUE            => TRUE);
END;
/
```

Two helper functions to enqueue and dequeue messages will make calling
the queue easier.  As the `demoqueue` user run:

```sql
CREATE OR REPLACE PROCEDURE my_enq(
       user_addr_p IN user_address_type) AS
  ENQUEUE_OPTIONS    DBMS_AQ.ENQUEUE_OPTIONS_T;
  MESSAGE_PROPERTIES DBMS_AQ.MESSAGE_PROPERTIES_T;
  ENQ_ID             RAW(16);
BEGIN
  DBMS_AQ.ENQUEUE(QUEUE_NAME            => 'DEMOQUEUE.ADDR_QUEUE',
                  ENQUEUE_OPTIONS       => ENQUEUE_OPTIONS,
                  MESSAGE_PROPERTIES    => MESSAGE_PROPERTIES,
                  PAYLOAD               => user_addr_p,
                  MSGID                 => ENQ_ID);
  COMMIT;
END;
/
SHOW ERRORS

CREATE OR REPLACE PROCEDURE MY_DEQ(
       user_addr_p OUT USER_ADDRESS_TYPE) AS
  DEQUEUE_OPTIONS    DBMS_AQ.DEQUEUE_OPTIONS_T;
  MESSAGE_PROPERTIES DBMS_AQ.MESSAGE_PROPERTIES_T;
  ENQ_ID             RAW(16);
BEGIN
  DBMS_AQ.DEQUEUE(QUEUE_NAME            => 'DEMOQUEUE.ADDR_QUEUE',
                  DEQUEUE_OPTIONS       => DEQUEUE_OPTIONS,
                  MESSAGE_PROPERTIES    => MESSAGE_PROPERTIES,
                  PAYLOAD               => user_addr_p,
                  MSGID                 => ENQ_ID);
  COMMIT;
END;
/
SHOW ERRORS
```

With this basic queue configuration, if a dequeue operation is called
without a message being present in the queue, then the call will block
waiting for one to be enqueued or until the queue wait time expires.
This behavior can be configured.

The helper procedures can be called from node-oracledb in anonymous
blocks to enqueue and dequeue messages:

```javascript
// Enqueue a message
username = 'scott';
address  = 'The Kennel';
sql = `BEGIN
         my_enq(user_address_type(:un, :ad));
       END;`;
binds = {un: username, ad: address};
await connection.execute(sql, binds);

// Dequeue a message
sql = `DECLARE
         ua user_address_type;
       BEGIN
         my_deq(ua);
         :un := ua.name;
         :ad := ua.address;
       END;`;
binds = {un: {dir: oracledb.BIND_OUT}, ad: {dir: oracledb.BIND_OUT}};
result = await connection.execute(sql, binds);
console.log(result.outBinds);
```

The output is:

```
{ un: 'scotty', ad: 'The Kennel' }
```

Queuing is highly configurable and scalable, providing a great way to
distribute workload for a web application.  Oracle AQ is available in
all editions of the database.

## <a name="oraaccess"></a> 24. External Configuration

The optional Oracle client-side configuration file [oraaccess.xml][63]
can be used to configure some behaviors of node-oracledb.  See
[Optional Client Configuration Files](#tnsadmin) for information about
file creation..

An oraaccess.xml file is only used when node-oracledb is linked with
Oracle Database 12c, or later, client libraries.

The following oraaccess.xml file sets the Oracle client
['prefetch'][79] value to 100 rows.  This value affects every SQL
query in the application:

```
<?xml version="1.0"?>
 <oraaccess xmlns="http://xmlns.oracle.com/oci/oraaccess"
  xmlns:oci="http://xmlns.oracle.com/oci/oraaccess"
  schemaLocation="http://xmlns.oracle.com/oci/oraaccess
  http://xmlns.oracle.com/oci/oraaccess.xsd">
  <default_parameters>
    <prefetch>
      <rows>100</rows>
    </prefetch>
  </default_parameters>
</oraaccess>
```

Prefetching is the number of additional rows the underlying Oracle
client library fetches whenever node-oracledb requests query data from
the database.  Prefetching is a tuning option to maximize data
transfer efficiency and minimize [round-trips][124] to the database.  The
prefetch size does not affect when, or how many, rows are returned by
node-oracledb to the application.  The cache management is
transparently handled by the Oracle client libraries. Note, standard
node-oracledb fetch tuning is via
[`fetchArraySize`](#propdbfetcharraysize), but changing the prefetch
value can be useful in some cases such as when modifying the
application is not feasible.

The oraaccess.xml file has other uses including:

- Turning on [Fast Application Notification (FAN)](#connectionfan) events to enable FAN notifications and [Runtime Load Balancing (RLB)](#connectionrlb).
- Configuring [Client Result Caching][66] parameters
- Turning on [Client Statement Cache Auto-tuning][67]

Refer to the [oraaccess.xml documentation][63].

## <a name="nls"></a> 25. Globalization and National Language Support (NLS)

Node-oracledb can use Oracle's [National Language Support (NLS)][68]
to assist in globalizing applications.

Node-oracledb always uses Oracle's AL32UTF8 character set internally.
Data will be converted between AL32UTF8 and the
database character set when it is inserted into, or queried from, the
database.  The environment variable `NLS_LANG` can be used to
configure the Oracle 'client' (i.e. node-oracledb) language and territory only.

Oracle NLS environment variables, or statements like `ALTER SESSION`,
can be used to configure further aspects of node-oracledb data access
globalization. Examples are `NLS_NUMERIC_CHARACTERS` (discussed in
[Fetching Numbers](#numberhandling)), and `NLS_DATE_FORMAT` (discussed
in [Fetching Numbers and Dates as String](#fetchasstringhandling)).
Refer to [NLS Documentation][69] for others.

To find the database character set, execute the query:

```sql
SELECT value AS db_charset
FROM nls_database_parameters
WHERE parameter = 'NLS_CHARACTERSET'
```

The general Oracle statement  to find the 'client' character set is:

```sql
SELECT DISTINCT client_charset AS client_charset
FROM v$session_connect_info
WHERE sid = SYS_CONTEXT('USERENV', 'SID');
```

In node-oracledb this will always show AL32UTF8.

## <a name="endtoend"></a> 26. End-to-end Tracing, Mid-tier Authentication, and Auditing

The Connection properties [action](#propconnaction),
[module](#propconnmodule), and [clientId](#propconnclientid) set
metadata for [end-to-end tracing][70].  The values can be tracked in
database views, shown in audit trails, and seen in tools such as
Enterprise Manager.

The `clientId` property can also be used by applications that do their
own mid-tier authentication but connect to the database using the one
database schema.  By setting `clientId` to the application's
authenticated user name, the database is aware of who the actual end
user is.  This can, for example, be used by Oracle [Virtual Private
Database][11] policies to automatically restrict data access by that
user.

Applications should set the properties because they can greatly help
to identify and resolve unnecessary database resource usage, or
improper access.

The attributes are set on a [connection](#propdbconclass) object and
sent to the database on the next [round-trip][124] from node-oracledb, for
example, with `execute()`:

```javascript
oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,  // mypw contains the hr schema password
    connectString : "localhost/orclpdb"
  },
  function(err, connection) {
    if (err) { console.error(err.message); return;    }

    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    connection.execute(`SELECT . . .`,
      function(err, result) {
        . . .
```

While the connection is open the attribute values can be seen, for example with SQL*Plus:

```
SQL> SELECT username, client_identifier, action, module FROM v$session WHERE username = 'HR';

USERNAME   CLIENT_IDENTIFIER    ACTION               MODULE
---------- -------------------- -------------------- --------------------
HR         Chris                Query departments    End-to-end example
```

The values can also be manually set by calling
[`DBMS_APPLICATION_INFO`][71] procedures or
[`DBMS_SESSION.SET_IDENTIFIER`][72], however these cause explicit
[round-trips][124], reducing scalability.

In general, applications should be consistent about how, and when,
they set the end-to-end tracing attributes so that current values are
recorded by the database.

Idle connections released back to a connection pool will retain the
previous attribute values of that connection. This avoids the overhead
of a round-trip to reset the values.  The Oracle design assumption is
that pools are actively used and have few idle connections. After
getting a connection from a pool, an application that uses end-to-end
tracing should set new values appropriately.

When a Connection object is displayed, such as with `console.log()`,
the end-to-end tracing attributes will show as `null` even if values
have been set and are being sent to the database.  This is for
architectural, efficiency and consistency reasons.  When an already
established connection is retrieved from a local pool, node-oracledb
is not able to efficiently retrieve values previously established in
the connection.  The same occurs if the values are set by a call to
PL/SQL code - there is no efficient way for node-oracledb to know the
values have changed.

The attribute values are commonly useful to DBAs.  However, if knowing
the current values is useful in an application, the application should
save the values as part of its application state whenever the
node-oracledb attributes are set.  Applications can also find the
current values by querying the Oracle data dictionary or using PL/SQL
procedures such as `DBMS_APPLICATION_INFO.READ_MODULE()` with the
understanding that these require round-trips to the database.

#### The Add-on Name

The Oracle Database `V$SESSION_CONNECT_INFO` view shows the version of
node-oracledb in use.  This allows DBAs to verify that applications
are using the desired add-on version.  For example, a DBA might see:

```
SQL> SELECT UNIQUE sid, client_driver
     FROM v$session_connect_info
     WHERE client_driver LIKE 'node-oracledb%'
     ORDER BY sid;

       SID CLIENT_DRIVER
---------- ------------------------------
        16 node-oracledb : 2.2.0
        33 node-oracledb : 2.2.0
```

Note if [`oracledb.connectionClass`](#propdbconclass) is set for a
non-pooled connection, the `CLIENT_DRIVER` value will not be set for
that connection.

## <a name="sodaoverview"></a> 27. Simple Oracle Document Access (SODA)

Oracle Database Simple Oracle Document Access (SODA) access is
available in node-oracledb version 3 through a set of NoSQL-style
APIs.  Documents can be inserted, queried, and retrieved from Oracle
Database using node-oracledb methods.  By default, documents are JSON
strings.

SODA support in node-oracledb is in Preview status and should not be
used in production.  It will be supported with a future version of
Oracle Client libraries.

The [Oracle Database Introduction to SODA][103] manual contains much
information relevant to using SODA.  You can use Oracle SODA
implementations in Node.js, [Python][106], [Java][105], [PL/SQL][104]
or [Oracle Call Interface][107] to perform operations on documents of
nearly any kind (including video, image, sound, and other binary
content).  Create, read, update and delete operations can be performed
via document key lookups, or by query-by-example (QBE)
pattern-matching.

SODA uses a SQL schema to store documents but you do not need to know
SQL or how the documents are stored. However, access via SQL does
allow use of advanced Oracle Database functionality such as analytics
for reporting.

Applications that access a mixture of SODA objects and relational
objects (or access SODA objects via SQL) are supported, but be aware
of the commit behavior, since any commit or rollback on a connection
will affect all work.

Node-oracledb uses the following objects for SODA:

- [SodaDatabase](#sodadatabaseclass): The top level object for
  node-oracledb SODA operations. This is acquired from an Oracle
  Database connection.  A 'SODA database' is an abstraction, allowing
  access to SODA collections in that 'SODA database', which then allow
  access to documents in those collections.  A SODA database is
  analogous to an Oracle Database user or schema, a collection is
  analogous to a table, and a document is analogous to a table row
  with one column for a unique document key, a column for the document
  content, and other columns for various document attributes.

- [SodaCollection](#sodacollectionclass): Represents a collection of
  SODA documents.  By default, collections allow JSON documents to be
  stored.  This is recommended for most SODA users.  However optional
  metadata can set various details about a collection, such as its
  database storage, whether it should track version and time stamp
  document components, how such components are generated, and what
  document types are supported.  See [Collection
  Metadata](#sodaclientkeys) for more information.  By default, the
  name of the Oracle Database table storing a collection is the same
  as the collection name. Note: do not use SQL to drop the database
  table, since SODA metadata will not be correctly removed.  Use the
  [`sodaCollection.drop()`](#sodacolldrop) method instead.

- [SodaDocument](#sodadocumentclass): Represents a document.
  Typically the document content will be JSON.  The document has
  properties including the content, a key, timestamps, and the media
  type.  By default, document keys are automatically generated.  See
  [SodaDocument Class](#sodadocumentclass) for the forms of
  SodaDocument.

- [SodaDocumentCursor](#sodadocumentcursorclass): A cursor object
  representing the result of the
  [`getCursor()`](#sodaoperationclassgetcursor) method from a
  [`find()`](#sodacollfind) operation.  It can be iterated over to
  access each SodaDocument.

- [SodaOperation](#sodaoperationclass): An internal object used with
  [`find()`](#sodacollfind) to perform read and write operations on
  documents.  Chained methods set properties on a SodaOperation object
  which is then used by a terminal method to find, count, replace, or
  remove documents.  This is an internal object that should not be
  directly accessed.

### <a name="sodarequirements"></a> 27.1 Node-oracledb SODA Requirements

SODA is available to Node.js applications when the node-oracledb
driver uses Oracle Database and Client 18.3, or higher.

To execute SODA operations, Oracle Database users require the SODA_APP
role granted to them by a DBA:

```sql
GRANT SODA_APP TO hr;
```

The `CREATE TABLE` system privilege is also needed.  Advanced users
who are using Oracle sequences for keys will also need the `CREATE
SEQUENCE` privilege.

The general recommendation for SODA applications is to turn on
[`autoCommit`](#propdbisautocommit) globally:

```javascript
oracledb.autoCommit = true;
```

If your SODA document write operations are mostly independent of each
other, this removes the overhead of explicit
[`connection.commit()`](#commit) calls.

When deciding how to commit transactions, beware of transactional
consistency and performance requirements.  If you are inserting or
updating a large number of documents, you should turn `autoCommit` off
and issue a single, explicit [`connection.commit()`](#commit) after
all documents have been processed.

If you are not autocommitting, and one of the SODA operations in your
transaction fails, then your application must explicitly roll back the
transaction with [`connection.rollback()`](#rollback).

Note:

- SODA DDL operations do not commit an open transaction the way that SQL always does for DDL statements.
- When [`oracledb.autoCommit`](#propdbisautocommit) is *true*, most SODA methods will issue a commit before successful return.
- SODA provide optimistic locking, see [`sodaOperation.version()`](#sodaoperationclassversion).

### <a name="creatingsodacollections"></a> 27.2 Creating SODA Collections

The following examples use Node.js 8's
[async/await](#asyncawaitoverview) syntax, however callbacks can also
be used.  There are runnable examples in the GitHub [examples][3]
directory.

Collections can be created like:

```javascript
oracledb.autoCommit = true;

try {
  soda = connection.getSodaDatabase();
  collection = await soda.createCollection("mycollection");
  indexSpec = { "name": "CITY_IDX",
                "fields": [ {
                    "path": "address.city",
                    "datatype": "string",
                    "order": "asc" } ] };
  await collection.createIndex(indexSpec);
} catch(err) {
  console.error(err);
}
```

This example creates a collection that, by default, allows JSON
documents to be stored. A non-unique B-tree index is created on the
`address.city` path to improve search performance.

If the collection name passed to
[`createCollection()`](#sodadbcreatecollection) already exists, it
will simply be opened. Alternatively you can open a known, existing
collection with
[`sodaDatabase.openCollection()`](#sodadbopencollection).

Collections will be visible as tables in your Oracle Database
schema. Do not use DROP TABLE to drop these database tables, since
SODA metadata will not be correctly removed. Use the
[`sodaCollection.drop()`](#sodacolldrop) method instead.  If you
accidentally execute DROP SQL, you should call `sodaCollection.drop()`
or execute the SQL statement `SELECT
DBMS_SODA.DROP_COLLECTION('myCollection') FROM dual;`

See [SODA Client-Assigned Keys and Collection
Metadata](#sodaclientkeys) for how to create a collection with custom
metadata.

### <a name="accessingsodadocuments"></a> 27.3 Creating and Accessing SODA documents

To insert a document into an opened collection, a JavaScript object
that is the document content can be used directly.  In the following
example, it is the object myContent:

```javascript
try {
  myContent = {name: "Sally", address: {city: "Melbourne"}};
  newDoc = await collection.insertOneAndGet(myContent);
  // a system generated key is created by default
  console.log("The key of the new SODA document is: ", newDoc.key);
} catch(err) {
  console.error(err);
}
```

See [`sodaCollection.insertOne()`](#sodacollinsertone) for more
information.

For many users, passing your document content directly to the
[`insertOne()`](#sodacollinsertone),
[`insertOneAndGet()`](#sodacollinsertoneandget),
[`replaceOne()`](#sodaoperationclassreplaceone) or
[`replaceOneAndGet()`](#sodaoperationclassreplaceoneandget) methods
will be fine. System generated values for the key and other document
components will be added to the stored SODA document.  For cases where
you want to insert Buffers or Strings, or when you need more control
over the SodaDocument, such as to use a client-assigned key, then you
can call the [`sodaDatabase.createDocument()`](#sodadbcreatedocument)
method and pass its result to methods like `insertOne()`:

```javascript
try {
  myContent = {name: "Sally", address: {city: "Melbourne"}};
  newDoc = database.createDocument(myContent, {key: 123});
  await collection.insertOne(myContent);
} catch(err) {
  console.error(err);
}
```

Note: to use client-assigned keys, collections must be created with
custom metadata, see [SODA Client-Assigned Keys and Collection
Metadata](#sodaclientkeys).

To extract documents from a collection, the [`find()`](#sodacollfind)
method can be used to build a [SodaOperation](#sodaoperationclass)
object specifying the keys of desired documents, or searches can be
performed on JSON documents using query-by-example (QBE) methods.
Each document has a unique key. If the key for a document is "k1", the
document can be fetched like:

```javascript
myKey = "k1";
try {
  soda = connection.getSodaDatabase();
  collection = await soda.openCollection("mycollection");
  doc = await collection.find().key(myKey).getOne(); // A SodaDocument
  content = doc.getContent();  // A JavaScript object
  console.log("Name: " + content.name); // Sally
  console.log("Lives in: " + content.address.city);  // Melbourne
} catch(err) {
  console.error(err);
}
```

The content of queried SodaDocument objects is only accessible via one
of the accessor methods [`getContent()`](#sodadocgetcontent),
[`getContentAsBuffer()`](#sodadocgetcontentasbuffer) or
[`getContentAsString()`](#sodadocgetcontentasstring).  Which one to
use depends on the media type, and how you want to use it in the
application. By default, the media type is 'application/json'.

The [`find()`](#sodacollfind) method creates a SodaOperation object
used with method chaining to specify desired properties of documents
that a terminal method like [`getOne()`](#sodaoperationclassgetone) or
[`remove()`](#sodaoperationclassremove) then applies to.

Other examples of chained read and write operations include:

- To see if a document exists:

    ```javascript
    c = await col.find().key("k1").getOne();
    if (c) then { . . .}
    ```

- To return a cursor that can be iterated over to get documents with
  keys "k1" and "k2":

    ```javascript
    docCursor = await collection.find().keys(["k1", "k2"]).getCursor();
    ```
- To remove the documents matching the supplied keys

    ```javascript
    await collection.find().keys(["k1", "k2"])).remove();
    ```

- To remove the document with the key 'k1' and version 'v1':

    ```javascript
    await collection.find().key("k1").version("v1").remove();
    ```

    The version field is a value that automatically changes whenever
    the document is updated. By default it is a hash of the document's
    content.  Using [`version()`](#sodaoperationclassversion) allows
    optimistic locking, so that the [`find()`](#sodacollfind) terminal
    method (which is [`remove()`](#sodaoperationclassremove) in this
    example) does not affect a document that someone else has already
    modified. If the requested document version is not matched, then
    the terminal operation will not impact any documents.  The
    application can then query to find the latest document version and
    apply any desired change.

- To update a document with a given key and version. The new document
  content will be the `newContent` object:

    ```javascript
    newContent = {name: "Fred", address: {city: "Melbourne"}};
    await collection.find().key("k1").version("v1").replaceOne(newContent);
    ```

- To find the new version of an updated document:

    ```javascript
    newContent = {name: "Fred", address: {city: "Melbourne"}};
    updatedDoc = await collection.find().key("k1").version("v1").replaceOneAndGet(newContent);
    console.log('New version is: ' + updatedDoc.version);
    ```

- To count all documents, no keys are needed:

    ```javascript
    n = collection.find().count();
    ```

The [`sodaCollection.find()`](#sodacollfind) operators that return
documents produce complete SodaDocument objects that can be used for
reading document content and attributes such as the key, or for
passing to methods like
[`sodaCollection.insertOne()`](#sodacollinsertone),
[`sodaCollection.insertOneAndGet()`](#sodacollinsertoneandget),
[`sodaOperation.replaceOne()`](#sodaoperationclassreplaceone) and
[`sodaOperation.replaceOneAndGet()`](#sodaoperationclassreplaceoneandget).
However note that for efficiency the SodaDocuments returned from
[`sodaCollection.insertOneAndGet()`](#sodacollinsertoneandget) and
[`sodaOperation.replaceOneAndGet()`](#sodaoperationclassreplaceoneandget)
do not contain document content.  These SodaDocuments are useful for
getting other document components such as the key and version.

### <a name="sodaqbesearches"></a> 27.4 SODA Query-by-Example Searches for JSON Documents

JSON documents stored in SODA can easily be searched using
query-by-example (QBE) syntax with
`collection.find().filter()`. Filtering and ordering easily allows
subsets of documents to be retrieved, replaced or removed.  Filter
specifications can include comparisons, regular expressions, logical,
and spatial operators, among others.  See [Overview of SODA Filter
Specifications (QBEs)][108]

Some QBE examples are:

- To find the number of documents where 'age' is less than 30, the
  city is San Francisco and the salary is greater than 500000:

    ```javascript
    n = await collection.find().filter({"age": {"$lt": 30},
                                        "address.city": "San Francisco",
                                        "salary": {"$gt": 500000}}).count();
    ```

- To return all documents that have an age less than 30, an address in
  San Francisco, and a salary greater than 500000:

    ```javascript
    docCursor = await collection.find().filter({"age": {"$lt": 30},
                                                "address.city": "San Francisco",
                                                "salary": {"$gt": 500000}}).getCursor();
    ```

- Same as the previous example, but allowing for pagination of results
  by only getting 10 documents:

    ```javascript
    docCursor = await collection.find().filter({"age": {"$lt": 30},
                                                "address.city": "San Francisco",
                                                "salary": {"$gt": 500000}}).skip(0).limit(10).getCursor();
    ```

    To get the next 10 documents, the QBE could be repeated with the
    `skip()` value set to 10.

- To get JSON documents with an "age" attribute with values greater
  than 60, and where either the name is "Max" or where tea or coffee
  is drunk.

    ```javascript
    filterSpec = {"$and": [{"age": {"$gt": 60} },
                    {"$or": [{"name": "Max"},
                             {"drinks": {"$in": ["tea", "coffee"]}}]}]; };
    docCursor = await collection.find().filter(filterSpec).getCursor();
    ```

- The `$orderby` specification can be used to order any returned documents:

    ```javascript
    filterSpec = {"$query": {"salary": {$between [10000, 20000]}},
                  "$orderby": {"age": -1, "name": 2}};
    docCursor = await collection.find().filter(filterSpec).getCursor();
    ```

    This 'orderby abbreviated syntax' returns documents within a
    particular salary range, sorted by descending age and ascending
    name. Sorting is done first by age and then by name, because the
    absolute value of -1 is less than the absolute value of 2 - not
    because -1 is less than 2, and not because field age appears
    before field name in the `$orderby` object.

    An alternate `$orderby` syntax allows specifying the data types and
    maximum number of string characters to be used for comparison.
    See [Overview of QBE Operator $orderby][109].

- Documents that contain a [GeoJSON][110] geometry can be searched.
  For example if the collection contained documents of the form:

    ```javascript
    {"location": {"type": "Point", "coordinates": [33.7243, -118.1579]}}
    ```

    Then a Spatial QBE like the following could be used to find documents within a 50 km range of a specified point:

    ```javascript
    filterSpec = {"location" :
      {"$near" :
        {"$geometry": {"type": "Point", "coordinates": [34.0162, -118.2019]},
          "$distance" : 50,
          "$unit"     : "KM"}}};
    docCursor = await collection.find().filter(filterSpec).getCursor();
    ```

    See [Overview of QBE Spatial Operators][111].

### <a name="sodaclientkeys"></a> 27.5 SODA Client-Assigned Keys and Collection Metadata

Default collections support JSON documents and use system generated
document keys. Various storage options are also configured which
should suit most users. Overriding the default configuration is
possible by passing custom metadata when a collection is created with
[`sodaDatabase.createCollection()`](#sodadbcreatecollection).
Metadata specifies things such as:

- Storage details, such as the name of the table that stores the
  collection and the names and data types of its columns.

- The presence or absence of columns for creation time stamp,
  last-modified time stamp, and version.

- Whether the collection can store only JSON documents.

- Methods of document key generation, and whether document keys are
  client- assigned or generated automatically.

- Methods of version generation.

Note that changing storage options should only be done with care.

The metadata attributes are described in [SODA Collection Metadata Components][112].

Collection metadata in SODA is represented as a JavaScript object.

The default collection metadata specifies that a collection stores
five components for each document: key, JSON content, version,
last-modified timestamp, and a created-on timestamp.  An example of
default metadata is:

```javascript
{
   "schemaName": "mySchemaName",
   "tableName": "myCollectionName",
   "keyColumn":
   {
      "name": "ID",
      "sqlType": "VARCHAR2",
      "maxLength": 255,
      "assignmentMethod": "UUID"
   },
   "contentColumn":
   {
      "name": "JSON_DOCUMENT",
      "sqlType": "BLOB",
      "compress": "NONE",
      "cache": true,
      "encrypt": "NONE",
      "validation": "STANDARD"
   },
   "versionColumn":
   {
     "name": "VERSION",
     "method": "SHA256"
   },
   "lastModifiedColumn":
   {
     "name": "LAST_MODIFIED"
   },
   "creationTimeColumn":
   {
      "name": "CREATED_ON"
   },
   "readOnly": false
}
```

See [Overview of SODA Document Collections][113] for more information
on collections and their metadata.

The following example shows how to create a collection that supports
keys supplied by the application, instead of being system
generated. Here, numeric keys will be used.  The metadata used when
creating the collection will be the same as the above default metadata
with the [keyColumn][114] object changed.  Here the type becomes
NUMBER and the [assignment method][115] is noted as client-assigned:

```javascript
mymetadata = { . . . };   // the default metadata shown above

// update the keyColumn info
mymetadata.keyColumn =
{
   "name": "ID",
   "sqlType": "NUMBER",
   "assignmentMethod": "CLIENT"
};

// Set schemaName to the connected user
mymetadata.schemaName = 'HR';
```

This custom metadata is then used when creating the collection:

```javascript
oracledb.autoCommit = true;

try {
  soda = connection.getSodaDatabase();
  collection = await soda.createCollection("mycollection", { metaData: mymetadata});
  indexSpec = { "name": "CITY_IDX",
                "fields": [ {
                    "path": "address.city",
                    "datatype": "string",
                    "order": "asc" } ] };
  await collection.createIndex(indexSpec);
} catch(err) {
  console.error(err);
}
```

To insert a document into the collection, a key must be supplied by
the application:

```javascript
try {
  myContent = {name: "Sally", address: {city: "Melbourne"}};
  newDoc = database.createDocument(myContent, {key: 123});
  await collection.insertOne(myContent);
} catch(err) {
  console.error(err);
}
```

### <a name="sodajsondataguide"></a> 27.6 JSON Data Guides in SODA

SODA exposes Oracle Database's [JSON data guide][116] feature.  This
lets you discover information about the structure and content of JSON
documents by giving details such as property names, data types and
data lengths. In SODA, it can be useful for exploring the schema of a
collection.

To get a data guide in SODA, the collection must be JSON-only and have
a [JSON Search index](#sodacollcreateindex) where the `"dataguide"`
option is `"on"`. Data guides are returned from
[`sodaCollection.getDataGuide()`](#sodacollgetdataguide) as JSON
content in a [SodaDocument](#sodadocumentclass).  The data guide is
inferred from the collection as it currently is.  As a collection
grows and documents change, a new data guide may be returned each
subsequent time `getDataGuide()` is called.

As an example, suppose a collection was created with default settings,
meaning it can store JSON content. If the collection contained these
documents:

```javascript
{"name": "max", "country": "ukraine"}
{"name": "chris", "country": "australia"}
{"name": "venkat" , "country": "india"}
{"name": "anthony", "country": "canada"}
```

Then the following code:

```javascript
await createIndex({"name": "myIndex"});  // dataguide is "on" by default
doc = await sodaCollection.getDataGuide();
dg = doc.getContentAsString();
console.log(dg);
```

Will display the data guide:

```javascript
{"type":"object","properties":{
  "name":{"type":"string","o:length":8,"o:preferred_column_name":"JSON_DOCUMENT$name"},
  "country":{"type":"string","o:length":16,"o:preferred_column_name":"JSON_DOCUMENT$country"}}}
```

This indicates that the collection documents are JSON objects, and
currently have "name" and "country" fields. The types ("string" in
this case) and lengths of the values of these fields are listed.  The
"preferred_column_name" fields can be helpful for advanced users who
want to define SQL views over JSON data. They suggest how to name the
columns of a view.

## <a name="promiseoverview"></a> 28. Promises and node-oracledb

Node-oracledb supports Promises with all asynchronous methods.  The native Promise
implementation is used.

If an asynchronous method is invoked without a callback, it returns a
Promise:

```javascript
var oracledb = require('oracledb');

var mypw = ... // the user password

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/XEPDB1"
  })
  .then(function(conn) {
    return conn.execute(
      `SELECT department_id, department_name
       FROM departments
       WHERE manager_id < :id`,
      [110]  // bind value for :id
    )
      .then(function(result) {
        console.log(result.rows);
        return conn.close();
      })
      .catch(function(err) {
        console.error(err);
        return conn.close();
      });
  })
  .catch(function(err) {
    console.error(err);
  });
```

With Oracle's sample HR schema, the output is:

```
[ [ 60, 'IT' ], [ 90, 'Executive' ], [ 100, 'Finance' ] ]
```

Notice there are two promise "chains": one to get a connection and the
other to use it.  This is required because it is only possible to
refer to the connection within the function to which it was passed.

When invoking asynchronous methods, it is possible to accidentally
get a Promise by forgetting to pass a callback function:

```javascript
oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/WRONG_SERVICE_NAME"
  });
  . . .
```

Since the returned promise will not have a catch block, as the
developer intended to use the callback programming style, any
rejections that occur will go unnoticed.  Node.js 4.0 added the
`unhandledRejection` event to prevent such rejections from going
unnoticed:

```javascript
process.on('unhandledRejection', (reason, p) => {
  console.error("Unhandled Rejection at: ", p, " reason: ", reason);
  // application specific logging, throwing an error, or other logic here
});

oracledb.getConnection(
  {
    user          : "hr",
    password      : mypw,
    connectString : "localhost/WRONG_SERVICE_NAME"
  });
  . . .
```

Whereas the code without the `unhandledRejection` exception silently
exited, adding the handler could, for example, show:

```
$ node myapp.js
Unhandled Rejection at:  Promise {
  <rejected> [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
] }  reason:  [Error: ORA-12514: TNS:listener does not currently know of service requested in connect descriptor
]
```

For more information, see [How to get, use, and close a DB connection
using promises][73].

### <a name="custompromises"></a> 28.1 Custom Promise Libraries

The Promise implementation is designed to be overridden, allowing a
custom Promise library to be used.

```javascript
var mylib = require('myfavpromiseimplementation');
oracledb.Promise = mylib;
```

Promises can be completely disabled by setting

```javascript
oracledb.Promise = null;
```

## <a name="asyncawaitoverview"></a> 29. Async/Await and node-oracledb

Node.js 7.6 supports async functions, also known as Async/Await.  These
can be used with node-oracledb.  For example:

```javascript
const oracledb = require('oracledb');

let mypw = ... // the hr schema password

function getEmployee(empid) {
  return new Promise(async function(resolve, reject) {
    let conn;

    try {
      conn = await oracledb.getConnection({
        user          : "hr",
        password      : mypw,
        connectString : "localhost/XEPDB1"
      });

      let result = await conn.execute(
        `SELECT * FROM employees WHERE employee_id = :bv`,
        [empid]
      );
      resolve(result.rows);

    } catch (err) { // catches errors in getConnection and the query
      reject(err);
    } finally {
      if (conn) {   // the conn assignment worked, must release
        try {
          await conn.release();
        } catch (e) {
          console.error(e);
        }
      }
    }
  });
}

async function run() {
  try {
    let res = await getEmployee(101);
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}

run();
```

If you are using [Lob instances](#lobclass) for LOB data, then the
Lobs must be streamed since there is no Promisified interface for
them.  Alternatively you can work with the data directly as Strings or
Buffers.

For more information, see [How to get, use, and close a DB connection
using async functions][74].

## <a name="bindtrace"></a> <a name="tracingsql"></a> 30. Tracing SQL and PL/SQL Statements

####  End-to-End Tracing

Applications that have implemented [End-to-end Tracing](#endtoend)
calls such as [action](#propconnaction) and [module](#propconnmodule),
will make it easier in database monitoring tools to identify SQL
statement execution.

#### Tracing Executed Statements

Database statement tracing is commonly used to identify performance
issues.  Oracle Database trace files can be analyzed after statements
are executed.  Tracing can be enabled in various ways at a database
system or individal session level.  Refer to [Oracle Database Tuning
documentation][95].  Setting a customer identifier is recommended to
make searching for relevant log files easier:

```
ALTER SESSION SET tracefile_identifier='My-identifier' SQL_TRACE=TRUE
```

In node-oracledb itself, the [ODPI-C tracing capability][75] can be
used to log executed statements to the standard error stream.  Before
executing Node.js, set the environment variable `DPI_DEBUG_LEVEL`
to 16.  At a Windows command prompt, this could be done with `set
DPI_DEBUG_LEVEL=16`.  On Linux, you might use:

```
export DPI_DEBUG_LEVEL=16
node myapp.js 2> log.txt
```

For an application that does a single query, the log file might
contain a tracing line consisting of the prefix 'ODPI', a thread
identifier, a timestamp, and the SQL statement executed:

```
ODPI [6905309] 2017-09-13 09:02:46.140: SQL select sysdate from dual where :b = 1
```

#### Tracing Bind Values

Sometimes it is useful to trace the bind data values that have been
used when executing statements.  Several methods are available.

In the Oracle Database, the view [`V$SQL_BIND_CAPTURE`][76] can
capture bind information.  Tracing with Oracle Database's
[`DBMS_MONITOR.SESSION_TRACE_ENABLE()`][77] may also be useful.

You can also write your own wrapper around `execute()` and log any
parameters.

#### Other Tracing Utilities

PL/SQL users may be interested in using [PL/Scope][78].

## <a name="migrate"></a> 31. Migrating from Previous node-oracledb Releases

### <a name="migratev1v2"></a> 31.1 Migrating from node-oracledb 1.13 to node-oracledb 2.0

When upgrading from node-oracledb version 1.13 to version 2.0:

- Review the [CHANGELOG][83].

- Installation has changed.  Pre-built binaries are available for
  common platforms.  To build from source code, change your
  package.json dependency to install from GitHub.  Refer to
  [INSTALL][80].

- Users of Instant Client RPMs must now always have the Instant Client
  libraries in the library search path.  Refer to [INSTALL][81].

- Users of macOS must now always have the Instant Client
  libraries in `~/lib` or `/usr/local/lib`.  Refer to [INSTALL][82].

- For queries and REF CURSORS, the internal buffer sizing and tuning
  of round-trips to Oracle Database is now done with
  [`fetchArraySize`](#propdbfetcharraysize).  This replaces
  [`prefetchRows`](#propdbprefetchrows), which is no longer used.  It
  also replaces the overloaded use of `maxRows` for
  [`queryStream()`](#querystream).  To upgrade scripts:

    - Replace the property `prefetchRows` with `fetchArraySize` and make
      sure all values are greater than 0.

    - Tune `fetchArraySize` instead of `maxRows` for `queryStream()`.

    - For [direct fetches](#fetchingrows), optionally tune
      `fetchArraySize`.

    - For [direct fetches](#fetchingrows), optionally replace enormously
      over-sized `maxRows` values with 0, meaning an unlimited number of
      rows can be returned.

- For [direct fetches](#fetchingrows) that relied on the version 1
  default value of [`maxRows`](#propdbmaxrows) to limit the number of
  returned rows to 100, it is recommended to use an [`OFFSET` /
  `FETCH`](#pagingdata) query clause.  Alternatively explicitly set
  `maxRows` to 100.

- Review and update code that checks for specific *NJS-XXX* or
  *DPI-XXX* error messages.

- Ensure that all [ResultSets](#resultsetclass) and [LOBs](#lobclass)
  are closed prior to calling
  [`connection.close()`](#connectionclose). Otherwise you will get the
  error *DPI-1054: connection cannot be closed when open statements or
  LOBs exist*.  (*Note*: this limitation was removed in node-oracledb 2.1)

- Test applications to check if changes such as the improved property
  validation uncover latent problems in your code.

### <a name="migratev20v21"></a> 31.2 Migrating from node-oracledb 2.0 to node-oracledb 2.1

When upgrading from node-oracledb version 2.0 to version 2.1:

- If using the experimental `_close` method with [Query
  Streaming](#streamingresults) in Node 8 or later:

    - Change the method name from `_close()` to [`destroy()`][92].
    - Stop passing a callback.
    - Optionally pass an error.

### <a name="migratev23v30"></a> 31.3 Migrating from node-oracledb 2.3 to node-oracledb 3.0

When upgrading from node-oracledb version 2.3 to version 3.0:

- Review the [CHANGELOG][83].  Implement new features such as the
[`pool.close()`](#poolclose) `drainTime` parameter.

- If using a connection pool and Oracle Client libraries 12.2 or
  later, tune [`oracledb.poolPingInterval`](#propdbpoolpinginterval),
  since this property is now additionally used with these versions of
  Oracle Client.

- Before migrating, ensure your application works with the [Connection
  Pool Queue](#connpoolqueue), since this mode is always enabled in
  node-oracledb 3.0 and the value of
  [`oracledb.queueRequests`](#propdbqueuerequests) is ignored.

- Change code that relied on unused properties in objects such as the
  `execute()` result being set to `undefined`.  These properties are
  no longer set in node-oracledb 3.

### <a name="migratev30v31"></a> 31.4 Migrating from node-oracledb 3.0 to node-oracledb 3.1

When upgrading from node-oracledb version 3.0 to version 3.1:

- Review the [CHANGELOG][83].  Implement new features such as the
  Connection Pool
  [`sessionCallback`](#createpoolpoolattrssessioncallback) to
  efficiently set session state.

- Code that catches `require('oracledb')` errors to check
  node-oracledb and the Oracle Client libraries are installed
  correctly will need to be changed.  In node-oracledb 3.1,
  `require()` will always succeed if node-oracledb is installed even
  if Oracle Client is not configured.  To confirm that node-oracle
  will be usable, access
  [`oracledb.oracleClientVersion`](#propdboracleclientversion) or
  [`oracledb.oracleClientVersionString`](#propdboracleclientversionstring),
  or try opening a connection.

[1]: https://www.npmjs.com/package/oracledb
[2]: https://oracle.github.io/node-oracledb/INSTALL.html
[3]: https://github.com/oracle/node-oracledb/tree/master/examples
[4]: https://github.com/oracle/db-sample-schemas
[5]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-CFA006CA-6FF1-4972-821E-6996142A51C6
[6]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F9662FFB-EAEF-495C-96FC-49C6D1D9625C
[7]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D77D0D4A-7483-423A-9767-CBB5854A15CC
[8]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-12C94B15-2CE1-4B98-9D0C-8226A9DDF4CB
[9]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-624A4771-58C5-4E2B-8131-E3389F58A0D6
[10]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8A9F1295-4360-4AC6-99A4-050C5C82E0B0
[11]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-89DB0C3C-A36F-4254-8C82-020F5F6DE31F
[12]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8E91CBE9-6CE1-4482-A694-04444C22B288
[13]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D3873ED4-5FAD-479F-85F9-EE56D4B18ED5
[14]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2E008D4A-F6FD-4F34-9071-7E10419CA24D
[15]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FD9A8CB4-6B9A-44E5-B114-EFB8DA76FC88
[16]: https://nodejs.org/api/stream.html
[17]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-B0437826-43C1-49EC-A94D-B650B6A4A6EE
[18]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-47DAB4DF-1D35-46E5-B227-339FF912E058
[19]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-BADFDC72-0F1D-47FA-8857-EC15DC8ACFBB
[20]: http://docs.libuv.org/en/v1.x/threadpool.html
[21]: https://github.com/libuv/libuv
[22]: https://github.com/oracle/node-oracledb/issues/603#issuecomment-277017313
[23]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-BC09F045-5D80-4AF5-93F5-FEF0531E0E1D
[24]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-015CA8C1-2386-4626-855D-CC546DDC1086
[25]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-661BB906-74D2-4C5D-9C7E-2798F76501B3
[26]: http://www.oracle.com/technetwork/topics/php/php-scalability-ha-twp-128842.pdf
[27]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E3E16C82-E174-4814-98D5-EADF1BCB3C37
[28]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-6AD89576-526F-4D6B-A539-ADF4B840819F
[29]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-37BECE32-58D5-43BF-A098-97936D66968F
[30]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F12066A-2BA1-476C-809B-BB95A3F727CF
[31]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9F0DCAEA-A67E-4183-89E7-B1555DC591CE
[32]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=DBSEG
[33]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-0857C817-675F-4CF0-BFBB-C3667F119176
[34]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4A19D81A-75F0-448E-B271-24E5187B5909
[35]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-48547756-9C0B-4D14-BE85-E7ADDD1A3A66
[36]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7A18022A-E40D-4880-B3CE-7EE9864756CA
[37]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NETRF
[38]: https://github.com/oracle/node-oracledb/tree/master/examples/resultset1.js
[39]: https://github.com/oracle/node-oracledb/tree/master/examples/resultset2.js
[40]: https://github.com/oracle/node-oracledb/tree/master/examples/refcursor.js
[41]: https://github.com/oracle/node-oracledb/tree/master/examples/selectstream.js
[42]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-578B5988-31E2-4D0F-ACEA-95C827F6012B
[43]: https://jsao.io/2016/09/working-with-dates-using-the-nodejs-driver/
[44]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-35810313-029E-4CB8-8C27-DF432FA3C253
[45]: https://docs.oracle.com/cd/E17781_01/appdev.112/e18750/xe_locator.htm#XELOC560
[47]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-FAFD1247-06E5-4E64-917F-AEBD4703CF40
[48]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-C1400094-18D5-4F36-A2C9-D28B0E12FD8C
[49]: https://github.com/oracle/node-oracledb/tree/master/examples/dbmsoutputgetline.js
[50]: https://github.com/oracle/node-oracledb/tree/master/examples/dbmsoutputpipe.js
[51]: https://github.com/oracle/node-oracledb/tree/master/examples/lobinsert2.js
[52]: https://github.com/oracle/node-oracledb/tree/master/examples/lobbinds.js
[53]: https://github.com/oracle/node-oracledb/tree/master/examples/lobplsqltemp.js
[54]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1EF347AE-7FDA-4B41-AFE0-DD5A49E8B370
[55]: https://github.com/oracle/node-oracledb/tree/master/examples/selectjson.js
[56]: https://github.com/oracle/node-oracledb/tree/master/examples/selectjsonblob.js
[57]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADJSN
[58]: https://github.com/oracle/node-oracledb/tree/master/examples/plsqlarray.js
[59]: http://www.oracle.com/technetwork/issue-archive/2007/07-mar/o27asktom-084983.html
[60]: http://stackoverflow.com/a/43330282/4799035
[61]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4947CAE8-1F00-4897-BB2B-7F921E495175
[62]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-56AEF38E-9400-427B-A818-EDEC145F7ACD
[63]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2
[64]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F3FBE48B-468B-4393-8B0C-D5C8E0E4374D
[65]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-25F85237-702B-4609-ACE2-1454EBC8284B
[66]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D2FA7B29-301B-4AB8-8294-2B1B015899F9
[67]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-6E21AA56-5BBE-422A-802C-197CAC8AAEA4
[68]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NLSPG
[69]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D5C74C82-8622-46F4-8760-0F8ABA28A816
[70]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-246A5A52-E666-4DBC-BDF6-98B83260A7AD
[71]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-14484F86-44F2-4B34-B34E-0C873D323EAD
[72]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-988EA930-BDFE-4205-A806-E54F05333562
[73]: https://jsao.io/2017/06/how-to-get-use-and-close-a-db-connection-using-promises/
[74]: https://jsao.io/2017/07/how-to-get-use-and-close-a-db-connection-using-async-functions/
[75]: https://oracle.github.io/odpi/doc/user_guide/debugging.html
[76]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D353F4BE-5943-4F5B-A99B-BC9505E9579C
[77]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-C9054D20-3A70-484F-B11B-CC591A10D609
[78]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-24109CB5-7BB9-48B2-AD7A-39458AA13C0C
[79]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7AE9DBE2-5316-4802-99D1-969B72823F02
[80]: https://oracle.github.io/node-oracledb/INSTALL.html#github
[81]: https://oracle.github.io/node-oracledb/INSTALL.html#instrpm
[82]: https://oracle.github.io/node-oracledb/INSTALL.html#instosx
[83]: https://github.com/oracle/node-oracledb/blob/master/CHANGELOG.md
[84]: https://github.com/oracle/node-oracledb/tree/master/examples/rowlimit.js
[85]: http://www.oracle.com/technetwork/issue-archive/2007/07-jan/o17asktom-093877.html
[86]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F9CE0CC3-13AE-4744-A43C-EAC7A71AAAB6__CJAHCAFF
[87]: https://oracle.github.io/node-oracledb/INSTALL.html#quickstart
[88]: https://nodejs.org/en/download/
[89]: https://github.com/oracle/node-oracledb/tree/master/examples/dbconfig.js
[90]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-C48021EF-6AEA-427F-95B2-37EFCFEA2400
[91]: https://www.youtube.com/watch?v=WDJacg0NuLo
[92]: https://nodejs.org/api/stream.html#stream_readable_destroy_error
[93]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-D04AA2A7-2E68-4C5C-BD6E-36C62427B98E
[94]: https://github.com/oracle/node-oracledb/blob/node-oracledb-v1/doc/api.md
[95]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=TGSQL
[96]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-0A789F28-169A-43D6-9E48-AAE20D7B0C44
[97]: http://www.oracle.com/technetwork/database/options/clustering/applicationcontinuity/learnmore/fastapplicationnotification12c-2538999.pdf
[98]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-58DE05A0-5DEF-4791-8FA8-F04D11964906
[99]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-373BAF72-3E63-42FE-8BEA-8A2AEFBF1C35
[100]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-ABC7AE4D-64A8-4EA9-857D-BEF7300B64C3
[101]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2BEF5482-CF97-4A85-BD90-9195E41E74EF
[102]: https://github.com/oracle/node-oracledb/issues/886
[103]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADSDI
[104]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADSDP
[105]: https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/java-1/adsda/index.html
[106]: https://cx-oracle.readthedocs.org/en/latest/index.html
[107]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-23206C89-891E-43D7-827C-5C6367AD62FD
[108]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-CB09C4E3-BBB1-40DC-88A8-8417821B0FBE
[109]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-3B182089-9A38-45DA-B7D7-8232E13C8F83
[110]: https://tools.ietf.org/html/rfc7946
[111]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-12994E27-DA98-40C7-8D4F-84341106F8D9
[112]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-49EFF3D3-9FAB-4DA6-BDE2-2650383566A3
[113]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-C107707F-E135-493F-9112-98691C80D3E9
[114]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-1938641C-B5BF-4B77-9A54-17EE06FEA94C
[115]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-53AA7D85-80A9-4F98-994F-E3BD91769146
[116]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-219FC30E-89A7-4189-BC36-7B961A24067C
[117]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-BE42F8D3-B86B-43B4-B2A3-5760A4DF79FB
[118]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4848E6A0-58A7-44FD-8D6D-A033D0CCF9CB
[119]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C
[120]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F60F75DF-2866-4F93-BB7F-8FCE64BF67B6
[121]: https://github.com/oracle/node-oracledb/blob/v2.3.0/doc/api.md
[122]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4DD81A76-8D7D-4DEF-9DC1-77212C657AAF
[123]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8DDB51EB-D80F-4476-9ABF-D6860C6214D1
[124]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9B2F05F9-D841-4493-A42D-A7D89694A2D1
[125]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-DFA21225-E83C-4177-A79A-B8BA29DC662C
[126]: https://github.com/oracle/node-oracledb/tree/master/examples/sessionfixup.js
[127]: https://github.com/oracle/node-oracledb/tree/master/examples/sessiontagging1.js
[128]: https://github.com/oracle/node-oracledb/tree/master/examples/sessiontagging2.js
[129]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=ADQUE
