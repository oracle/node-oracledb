// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// NAME
//   njsModule.h
//
// DESCRIPTION
//   Definitions used by the module.
//
//-----------------------------------------------------------------------------

#ifndef __NJSMODULE_H__
#define __NJSMODULE_H__

#define NAPI_VERSION 6

#include <node_api.h>
#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "dpi.h"
#include "uv.h"

// maximum length of error messages
#define NJS_MAX_ERROR_MSG_LEN           256

// define macros for clearing memory
#define NJS_FREE_AND_CLEAR(var) \
    if (var) { \
        free((void*) var); \
        var = NULL; \
    }
#define NJS_DELETE_REF_AND_CLEAR(var) \
    if (var) { \
        napi_delete_reference(env, var); \
        var = NULL; \
    }

// define macro for checking the result of an Node-API call
#define NJS_CHECK_NAPI(env, status) \
    if ((status) != napi_ok) \
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);

// define macro for synchronous Node-API methods
#define NJS_NAPI_METHOD_DECL_SYNC(name) \
    static bool name##_(napi_env, napi_value*, napi_value, njsModuleGlobals*, \
            njsBaseInstance*, napi_value*); \
    static napi_value name(napi_env, napi_callback_info)
#define NJS_NAPI_METHOD_IMPL_SYNC(name, numArgs, classDef) \
    static napi_value name(napi_env env, napi_callback_info info) { \
        napi_value callingObj, args[numArgs + 1], returnValue = NULL; \
        njsBaseInstance* callingInstance; \
        njsModuleGlobals *globals; \
        if (!njsUtils_validateArgs(env, info, numArgs, args, &globals, \
                &callingObj, classDef, (njsBaseInstance**) &callingInstance)) \
            return NULL; \
        if (!name##_(env, args, callingObj, globals, callingInstance, \
                &returnValue)) { \
            return NULL; \
        } \
        return returnValue; \
    } \
    static bool name##_(napi_env env, napi_value *args, \
            napi_value callingObj, njsModuleGlobals *globals, \
            njsBaseInstance *callingInstance, napi_value *returnValue)

// define macro for asynchronous Node-API methods
#define NJS_NAPI_METHOD_DECL_ASYNC(name) \
    static bool name##_(napi_env, napi_value*, njsBaton*, \
            napi_value*); \
    static napi_value name(napi_env, napi_callback_info)
#define NJS_NAPI_METHOD_IMPL_ASYNC(name, numArgs, classDef) \
    static napi_value name(napi_env env, napi_callback_info info) { \
        napi_value args[numArgs + 1], returnValue = NULL; \
        njsBaton *baton = NULL; \
        if (!njsUtils_createBaton(env, info, numArgs, args, classDef, &baton)) \
            return NULL; \
        if (!name##_(env, args, baton, &returnValue)) { \
            if (baton->deferred) { \
                napi_reject_deferred(env, baton->deferred, NULL); \
                njsBaton_free(baton, env); \
            } else { \
                njsBaton_reportError(baton, env); \
            } \
            return NULL; \
        } \
        return returnValue; \
    } \
    static bool name##_(napi_env env, napi_value* args, njsBaton *baton, \
            napi_value *returnValue)

// define macros for defining other Node-API functions; many are identical but
// different names are used to make it easier to read
#define NJS_NAPI_GETTER(name) \
    napi_value name(napi_env, napi_callback_info)
#define NJS_NAPI_SETTER(name) \
    napi_value name(napi_env, napi_callback_info)
#define NJS_NAPI_FINALIZE(name) \
    void name(napi_env, void*, void*)
#define NJS_ASYNC_METHOD(name) \
    bool name(njsBaton*)
#define NJS_ASYNC_POST_METHOD(name) \
    bool name(njsBaton*, napi_env, napi_value*)
#define NJS_PROCESS_ARGS_METHOD(name) \
    bool name(njsBaton*, napi_env, napi_value*)

// default value for bind option maxSize
#define NJS_MAX_OUT_BIND_SIZE           200

// max number of bytes for data converted to string with fetchAsString or
// fetchInfo
#define NJS_MAX_FETCH_AS_STRING_SIZE    200

// encoding name to use for all strings
#define NJS_ENCODING                    "UTF-8"


//-----------------------------------------------------------------------------
// enumerations
//-----------------------------------------------------------------------------

// bind directions
#define NJS_BIND_IN                     3001
#define NJS_BIND_INOUT                  3002
#define NJS_BIND_OUT                    3003

// data types (loosely based on Javascript types)
#define NJS_DATATYPE_DEFAULT            0
#define NJS_DATATYPE_STR                DPI_ORACLE_TYPE_VARCHAR
#define NJS_DATATYPE_NUM                DPI_ORACLE_TYPE_NUMBER
#define NJS_DATATYPE_DATE               DPI_ORACLE_TYPE_TIMESTAMP_LTZ
#define NJS_DATATYPE_CURSOR             DPI_ORACLE_TYPE_STMT
#define NJS_DATATYPE_BUFFER             DPI_ORACLE_TYPE_RAW
#define NJS_DATATYPE_CLOB               DPI_ORACLE_TYPE_CLOB
#define NJS_DATATYPE_NCLOB              DPI_ORACLE_TYPE_NCLOB
#define NJS_DATATYPE_BLOB               DPI_ORACLE_TYPE_BLOB
#define NJS_DATATYPE_BOOLEAN            DPI_ORACLE_TYPE_BOOLEAN
#define NJS_DATATYPE_OBJECT             DPI_ORACLE_TYPE_OBJECT
#define NJS_DATATYPE_JSON               DPI_ORACLE_TYPE_JSON

// global settings attributes used in C
#define NJS_GLOBAL_ATTR_AUTOCOMMIT          7000
#define NJS_GLOBAL_ATTR_CONNECTION_CLASS    7001
#define NJS_GLOBAL_ATTR_EDITION             7003
#define NJS_GLOBAL_ATTR_EVENTS              7004
#define NJS_GLOBAL_ATTR_EXTERNAL_AUTH       7006
#define NJS_GLOBAL_ATTR_FETCH_AS_BUFFER     7008
#define NJS_GLOBAL_ATTR_FETCH_AS_STRING     7009
#define NJS_GLOBAL_ATTR_POOL_INCREMENT      7012
#define NJS_GLOBAL_ATTR_POOL_MAX            7013
#define NJS_GLOBAL_ATTR_POOL_MAX_PER_SHARD  7014
#define NJS_GLOBAL_ATTR_POOL_MIN            7015
#define NJS_GLOBAL_ATTR_POOL_PING_INTERVAL  7016
#define NJS_GLOBAL_ATTR_POOL_TIMEOUT        7017
#define NJS_GLOBAL_ATTR_STMT_CACHE_SIZE     7019

// error messages used within the driver
typedef enum {
    errSuccess = 0,
    errMissingCallback,
    errInvalidPool,
    errInvalidConnection,
    errInvalidPropertyValue,
    errInvalidParameterValue,
    errInvalidPropertyValueInParam,
    errInvalidNumberOfParameters,
    errUnsupportedDataType,
    errBindValueAndTypeMismatch,
    errInvalidBindDataType,
    errInvalidBindDirection,
    errNoTypeForConversion,
    errInsufficientBufferForBinds,
    errBusyResultSet,
    errInvalidResultSet,
    errInvalidNonQueryExecution,
    errInvalidTypeForConversion,
    errInvalidLob,
    errBusyLob,
    errInsufficientMemory,
    errInvalidTypeForArrayBind,
    errReqdMaxArraySize,
    errInvalidArraySize,
    errIncompatibleTypeArrayBind,
    errConnRequestTimeout,
    errCannotConvertRsToStream,
    errCannotInvokeRsMethods,
    errResultSetAlreadyConverted,
    errNamedJSON,
    errCannotLoadBinary,
    errPoolWithAliasAlreadyExists,
    errPoolWithAliasNotFound,
    errIncompatibleTypeArrayIndexBind,
    errNonArrayProvided,
    errMixedBind,
    errMissingMaxSizeByPos,
    errMissingMaxSizeByName,
    errMaxSizeTooSmall,
    errMissingTypeByPos,
    errMissingTypeByName,
    errInvalidSubscription,
    errMissingSubscrCallback,
    errMissingSubscrSql,
    errPoolClosing,
    errPoolClosed,
    errInvalidSodaDocCursor,
    errNoBinaryAvailable,
    errInvalidErrNum,
    errNodeTooOld,
    errInvalidAqMessage,
    errConvertFromObjElement,
    errConvertFromObjAttr,
    errConvertToObjElement,
    errConvertToObjAttr,
    errDblConnectionString,
    errQueueMax,
    errClientLibAlreadyInitialized,
    errUnsupportedDataTypeInJson,
    errConvertToJsonValue,
    errDblUsername,
    errConcurrentOps,
    errPoolReconfiguring,
    errPoolStatisticsDisabled,
    errTokenBasedAuth,
    errPoolTokenBasedAuth,
    errStandaloneTokenBasedAuth,
    errExpiredToken,
    errAccessTokenCallback,
    errInvalidGlobalSettingAttrNum,
    errInitOracleClientArgs,
    errMissingFile,

    // New ones should be added here

    errMaxErrors                // Max # of errors plus one
} njsErrorType;

// pool statuses
#define NJS_POOL_STATUS_OPEN            6000
#define NJS_POOL_STATUS_DRAINING        6001
#define NJS_POOL_STATUS_CLOSED          6002
#define NJS_POOL_STATUS_RECONFIGURING   6003

// values used for SODA collection creation mode
#define NJS_SODA_COLL_CREATE_MODE_DEFAULT   0
#define NJS_SODA_COLL_CREATE_MODE_MAP       5001


// max value used for duplicate name composition (requires space for maximum
// name length (128) and suffix added
#define NJS_MAX_COL_NAME_BUFFER_LENGTH      200


//-----------------------------------------------------------------------------
// forward declarations
//-----------------------------------------------------------------------------

typedef struct njsAqDeqOptions njsAqDeqOptions;
typedef struct njsAqEnqOptions njsAqEnqOptions;
typedef struct njsAqMessage njsAqMessage;
typedef struct njsAqQueue njsAqQueue;
typedef struct njsBaseInstance njsBaseInstance;
typedef struct njsBaton njsBaton;
typedef struct njsClassDef njsClassDef;
typedef struct njsConnection njsConnection;
typedef struct njsDataTypeInfo njsDataTypeInfo;
typedef struct njsFetchInfo njsFetchInfo;
typedef struct njsImplicitResult njsImplicitResult;
typedef struct njsJsonBuffer njsJsonBuffer;
typedef struct njsLob njsLob;
typedef struct njsLobBuffer njsLobBuffer;
typedef struct njsModuleGlobals njsModuleGlobals;
typedef struct njsPool njsPool;
typedef struct njsResultSet njsResultSet;
typedef struct njsSodaCollection njsSodaCollection;
typedef struct njsSodaDatabase njsSodaDatabase;
typedef struct njsSodaDocCursor njsSodaDocCursor;
typedef struct njsSodaDocument njsSodaDocument;
typedef struct njsSodaOperation njsSodaOperation;
typedef struct njsSubscription njsSubscription;
typedef struct njsVariable njsVariable;
typedef struct njsVariableBuffer njsVariableBuffer;
typedef struct njsDbObject njsDbObject;
typedef struct njsDbObjectType njsDbObjectType;
typedef struct njsDbObjectAttr njsDbObjectAttr;
typedef struct njsTokenCallback njsTokenCallback;


//-----------------------------------------------------------------------------
// class definitions (defined in class implementation files)
//-----------------------------------------------------------------------------

extern const njsClassDef njsClassDefAqDeqOptions;
extern const njsClassDef njsClassDefAqEnqOptions;
extern const njsClassDef njsClassDefAqMessage;
extern const njsClassDef njsClassDefAqQueue;
extern const njsClassDef njsClassDefDbObject;
extern const njsClassDef njsClassDefConnection;
extern const njsClassDef njsClassDefLob;
extern const njsClassDef njsClassDefOracleDb;
extern const njsClassDef njsClassDefPool;
extern const njsClassDef njsClassDefResultSet;
extern const njsClassDef njsClassDefSodaCollection;
extern const njsClassDef njsClassDefSodaDatabase;
extern const njsClassDef njsClassDefSodaDocCursor;
extern const njsClassDef njsClassDefSodaDocument;
extern const njsClassDef njsClassDefSodaOperation;


//-----------------------------------------------------------------------------
// structures
//-----------------------------------------------------------------------------

// all structures exposed publicly have these members
#define NJS_INSTANCE_HEAD \
    njsBaton *activeBaton;

// data for class AqDeqOptions exposed to JS.
struct njsAqDeqOptions {
    NJS_INSTANCE_HEAD
    dpiDeqOptions *handle;
};

// data for class AqEnqOptions exposed to JS.
struct njsAqEnqOptions {
    NJS_INSTANCE_HEAD
    dpiEnqOptions *handle;
    uint16_t deliveryMode;
};

// data for class AqMessage exposed to JS.
struct njsAqMessage {
    NJS_INSTANCE_HEAD
    dpiMsgProps *handle;
    njsDbObjectType *objectType;
};

// data for class AqQueue exposed to JS.
struct njsAqQueue {
    NJS_INSTANCE_HEAD
    dpiQueue *handle;
    njsConnection *conn;
    njsDbObjectType *payloadObjectType;
};

// base instance (used for commonly held attributes)
struct njsBaseInstance {
    NJS_INSTANCE_HEAD
};

// data for asynchronous functions
struct njsBaton {

    // assumed to be available at all times
    njsModuleGlobals *globals;
    njsBaseInstance *callingInstance;

    // error handling
    bool dpiError;
    bool hasError;
    char error[NJS_MAX_ERROR_MSG_LEN + 1];
    dpiErrorInfo errorInfo;

    // strings (requires free)
    char *sql;
    size_t sqlLength;
    char *user;
    size_t userLength;
    char *password;
    size_t passwordLength;
    char *newPassword;
    size_t newPasswordLength;
    char *connectString;
    size_t connectStringLength;
    char *connectionClass;
    size_t connectionClassLength;
    char *edition;
    size_t editionLength;
    char *ipAddress;
    size_t ipAddressLength;
    char *name;
    size_t nameLength;
    char *plsqlFixupCallback;
    size_t plsqlFixupCallbackLength;
    char *tag;
    size_t tagLength;
    char *sodaMetaData;
    size_t sodaMetaDataLength;
    char *startsWith;
    size_t startsWithLength;
    char *indexSpec;
    size_t indexSpecLength;
    char *key;
    size_t keyLength;
    char *filter;
    size_t filterLength;
    char *version;
    size_t versionLength;
    char *hint;
    size_t hintLength;
    char *pfile;                             // for DB startup
    size_t pfileLength;
    char *token;
    size_t tokenLength;
    char *privateKey;
    size_t privateKeyLength;

    // various buffers (requires free)
    uint32_t numBindNames;
    const char **bindNames;
    uint32_t *bindNameLengths;
    dpiSodaOperOptions *sodaOperOptions;
    dpiSodaCollNames *sodaCollNames;
    njsLobBuffer *lob;

    // ODPI-C handles (requires release)
    dpiConn *dpiConnHandle;
    dpiLob *dpiLobHandle;
    dpiMsgProps *dpiMsgPropsHandle;
    dpiPool *dpiPoolHandle;
    dpiStmt *dpiStmtHandle;
    dpiObjectType *dpiObjectTypeHandle;
    dpiQueue *dpiQueueHandle;
    dpiSodaColl *dpiSodaCollHandle;
    dpiSodaDoc *dpiSodaDocHandle;
    dpiSodaDocCursor *dpiSodaDocCursorHandle;
    uint32_t numSodaDocs;
    dpiSodaDoc **sodaDocs;
    uint32_t numMsgProps;
    dpiMsgProps **msgProps;

    // SODA operation keys (requires free)
    uint32_t numKeys;
    char **keys;
    uint32_t *keysLengths;

    // variables (requires free)
    uint32_t numQueryVars;
    njsVariable *queryVars;
    uint32_t numBindVars;
    njsVariable *bindVars;

    // batch errors (requires free)
    uint32_t numBatchErrorInfos;
    dpiErrorInfo *batchErrorInfos;

    // array DML row counts (no free required)
    uint32_t numRowCounts;
    uint64_t *rowCounts;

    // mapping types (requires free)
    uint32_t numFetchInfo;
    njsFetchInfo *fetchInfo;
    uint32_t numFetchAsStringTypes;
    uint32_t *fetchAsStringTypes;
    uint32_t numFetchAsBufferTypes;
    uint32_t *fetchAsBufferTypes;

    // implicit results (requires free)
    njsImplicitResult *implicitResults;

    // other structures (no free required)
    dpiStmtInfo stmtInfo;

    // integer values
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolMaxPerShard;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    uint32_t poolWaitTimeout;
    int32_t poolPingInterval;
    uint32_t stmtCacheSize;
    uint32_t maxRows;
    uint32_t bindArraySize;
    uint32_t fetchArraySize;
    uint32_t privilege;
    uint32_t rowsFetched;
    uint32_t bufferRowIndex;
    uint64_t rowsAffected;
    int32_t limit;
    uint32_t createCollectionMode;
    uint64_t docCount;
    uint32_t lobType;
    uint32_t lobOffset;
    uint32_t lobAmount;
    uint32_t timeout;
    uint32_t qos;
    uint32_t operations;
    uint32_t portNumber;
    uint32_t subscrGroupingClass;
    uint32_t subscrGroupingValue;
    uint32_t subscrGroupingType;
    uint32_t shutdownMode;
    uint32_t startupMode;
    uint32_t prefetchRows;

    // boolean values
    bool externalAuth;
    bool homogeneous;
    bool autoCommit;
    bool events;
    bool batchErrors;
    bool dmlRowCounts;
    bool matchAnyTag;
    bool dropSession;
    bool newSession;
    bool isDropped;
    bool replaced;
    bool force;
    bool clientInitiated;
    bool sodaMetadataCache;
    bool keepInStmtCache;

    // LOB buffer (requires free only if string was used)
    uint64_t bufferSize;
    char *bufferPtr;

    // subscriptions (no free required)
    njsSubscription *subscription;

    // njsCallback (no free required)
    njsTokenCallback *accessTokenCallback;

    // sharding (requires free)
    dpiShardingKeyColumn *shardingKeyColumns;
    dpiShardingKeyColumn *superShardingKeyColumns;
    uint8_t  numShardingKeyColumns;
    uint8_t  numSuperShardingKeyColumns;

    // TPC/XA related fields (requires free)
    dpiXid*  xid;
    uint32_t tpcFlags;
    bool     tpcOnePhase;
    bool     tpcCommitNeeded;
    uint32_t tpcTxnTimeout;

    // references that are held (requires free)
    napi_ref jsBufferRef;
    napi_ref jsCallingObjRef;
    napi_ref jsSubscriptionRef;

    // constructors
    napi_value jsLobConstructor;
    napi_value jsResultSetConstructor;
    napi_value jsDbObjectConstructor;

    // calling object value (used for setting a reference on created objects)
    napi_value jsCallingObj;

    // asynchronous work parameters
    napi_async_work asyncWork;
    bool (*workCallback)(njsBaton*);
    bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*);
    napi_deferred deferred;
};

// data for class definitions exposed to JS
struct njsClassDef {
    const char *name;
    size_t structSize;
    napi_finalize finalizeFn;
    const napi_property_descriptor *properties;
    bool propertiesOnInstance;
};

// data for class Connection exposed to JS.
struct njsConnection {
    NJS_INSTANCE_HEAD
    dpiConn *handle;
    char *tag;
    size_t tagLength;
    bool retag;
};

// data for adjusting fetch types
struct njsFetchInfo {
    char *name;
    size_t nameLength;
    uint32_t type;
};

// data for acquiring implicit results
struct njsImplicitResult {
    dpiStmt *stmt;
    uint32_t numQueryVars;
    njsVariable *queryVars;
    njsImplicitResult *next;
};

// data for values that will be converted to JSON in the database
struct njsJsonBuffer {
    dpiJsonNode topNode;
    dpiDataBuffer topNodeBuffer;
    uint32_t allocatedBuffers;
    uint32_t numBuffers;
    char **buffers;
};

// data for class Lob exposed to JS.
struct njsLob {
    NJS_INSTANCE_HEAD
    dpiLob *handle;
    uint32_t dataType;
    char *bufferPtr;
    uint64_t bufferSize;
    uint32_t pieceSize;
    uint32_t chunkSize;
    uint64_t length;
    bool dirtyLength;
};

// data for keeping track of LOBs in the worker thread
struct njsLobBuffer {
    dpiLob *handle;
    uint32_t dataType;
    uint32_t chunkSize;
    uint64_t length;
};

// data for module globals
struct njsModuleGlobals {
    dpiContext *context;
    napi_ref jsAqDeqOptionsConstructor;
    napi_ref jsAqEnqOptionsConstructor;
    napi_ref jsAqMessageConstructor;
    napi_ref jsAqQueueConstructor;
    napi_ref jsDbObjectConstructor;
    napi_ref jsConnectionConstructor;
    napi_ref jsLobConstructor;
    napi_ref jsPoolConstructor;
    napi_ref jsResultSetConstructor;
    napi_ref jsSodaCollectionConstructor;
    napi_ref jsSodaDatabaseConstructor;
    napi_ref jsSodaDocCursorConstructor;
    napi_ref jsSodaDocumentConstructor;
    napi_ref jsSodaOperationConstructor;
    napi_ref jsSubscriptions;
};

// data for class Pool exposed to JS.
struct njsPool {
    NJS_INSTANCE_HEAD
    dpiPool *handle;
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolMaxPerShard;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    uint32_t stmtCacheSize;
    int32_t poolPingInterval;
    bool  sodaMetadataCache;
    njsTokenCallback *accessTokenCallback;
};

// data for class ResultSet exposed to JS.
struct njsResultSet {
    NJS_INSTANCE_HEAD
    dpiStmt *handle;
    njsConnection *conn;
    uint32_t numQueryVars;
    njsVariable *queryVars;
    uint32_t fetchArraySize;
    bool isNested;
    bool varsDefined;
};

// data for class SodaCollection exposed to JS.
struct njsSodaCollection {
    NJS_INSTANCE_HEAD
    dpiSodaColl *handle;
    njsSodaDatabase *db;
};

// data for class SodaDatabase exposed to JS.
struct njsSodaDatabase {
    NJS_INSTANCE_HEAD
    dpiSodaDb *handle;
};

// data for class SodaDocCursor exposed to JS.
struct njsSodaDocCursor {
    NJS_INSTANCE_HEAD
    dpiSodaDocCursor *handle;
};

// data for class SodaDocument exposed to JS.
struct njsSodaDocument {
    NJS_INSTANCE_HEAD
    dpiSodaDoc *handle;
};

// data for class SodaOperation exposed to JS.
struct njsSodaOperation {
    NJS_INSTANCE_HEAD
    njsSodaCollection *coll;
};

// data for managing subscriptions
struct njsSubscription {
    dpiSubscr *handle;
    uv_async_t async;
    uv_mutex_t mutex;
    uv_barrier_t barrier;
    dpiSubscrMessage *message;
    njsModuleGlobals *globals;
    uint32_t subscrNamespace;
    uint64_t regId;
    char *name;
    size_t nameLength;
    napi_ref jsCallback;
    napi_env env;
};

// data for keeping track of variables used for binding/fetching data
struct njsVariable {
    char *name;
    size_t nameLength;
    napi_value jsName;
    uint32_t pos;
    dpiOracleTypeNum dbTypeNum;
    dpiOracleTypeNum varTypeNum;
    dpiNativeTypeNum nativeTypeNum;
    dpiObjectType *dpiObjectTypeHandle;
    njsDbObjectType *objectType;
    dpiVar *dpiVarHandle;
    uint32_t bindDir;
    uint32_t maxArraySize;
    uint32_t maxSize;
    uint32_t dbSizeInBytes;
    int16_t precision;
    int8_t scale;
    bool isArray;
    bool isNullable;
    njsVariableBuffer *buffer;
    uint32_t numDmlReturningBuffers;
    njsVariableBuffer *dmlReturningBuffers;
};

// data for keeping track of ODPI-C buffers and LOBs
struct njsVariableBuffer {
    uint32_t numElements;
    dpiData *dpiVarData;
    njsLobBuffer *lobs;
    uint32_t numQueryVars;
    njsVariable *queryVars;
};


// data for DbObject class exposed to JS
struct njsDbObject {
    NJS_INSTANCE_HEAD
    dpiObject *handle;
    njsDbObjectType *type;
};

// data for type information
struct njsDataTypeInfo {
    dpiOracleTypeNum oracleTypeNum;
    dpiNativeTypeNum nativeTypeNum;
    njsDbObjectType *objectType;
};


// data for DbObjectType class exposed to JS
struct njsDbObjectType {
    dpiObjectType *handle;
    uint16_t numAttributes;
    njsDbObjectAttr *attributes;
    njsDataTypeInfo elementTypeInfo;
    napi_ref jsDbObjectType;
    char *fqn;
    size_t fqnLength;
};


// data for object type attribute information
struct njsDbObjectAttr {
    dpiObjectAttr *handle;
    njsDataTypeInfo typeInfo;
    njsModuleGlobals *globals;
    const char *name;
    uint32_t nameLength;
};


// data for managing callback
struct njsTokenCallback {
    dpiAccessToken *accessToken;
    njsModuleGlobals *globals;
    uv_async_t async;
    uv_mutex_t mutex;
    uv_barrier_t barrier;
    napi_ref jsPool;
    napi_ref jsCallback;
    napi_env env;
    bool result;
};


//-----------------------------------------------------------------------------
// definition of error functions
//-----------------------------------------------------------------------------
void njsErrors_getMessage(char *buffer, int errNum, ...);
void njsErrors_getMessageVaList(char *buffer, int errNum, va_list vaList);


//-----------------------------------------------------------------------------
// definition of JSON buffer functions
//-----------------------------------------------------------------------------
void njsJsonBuffer_free(njsJsonBuffer *buf);
bool njsJsonBuffer_fromValue(njsJsonBuffer *buf, napi_env env,
        napi_value value, njsBaton *baton);


//-----------------------------------------------------------------------------
// definition of functions for njsBaton class
//-----------------------------------------------------------------------------
bool njsBaton_commonConnectProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args);
bool njsBaton_create(njsBaton *baton, napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, const njsClassDef *classDef);
void njsBaton_free(njsBaton *baton, napi_env env);
bool njsBaton_getBoolFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, bool *result, bool *found);
bool njsBaton_getFetchInfoFromArg(njsBaton *baton, napi_env env,
        napi_value props, uint32_t *numFetchInfo, njsFetchInfo **fetchInfo);
bool njsBaton_getIntFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, int32_t *result, bool *found);
uint32_t njsBaton_getNumOutBinds(njsBaton *baton);
bool njsBaton_getSodaDocument(njsBaton *baton, njsSodaDatabase *db,
        napi_env env, napi_value obj, dpiSodaDoc **handle);
bool njsBaton_getStringFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found);
bool njsBaton_getStrBufFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found);
bool njsBaton_getSubscription(njsBaton *baton, napi_env env, napi_value name,
        bool unsubscribe);
bool njsBaton_getUnsignedIntFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *result, bool *found);
bool njsBaton_getValueFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found);
bool njsBaton_getXid(njsBaton *baton, napi_env env, napi_value arg);
bool njsBaton_initCommonCreateParams(njsBaton *baton,
        dpiCommonCreateParams *params);
bool njsBaton_isBindValue(njsBaton *baton, napi_env env, napi_value value);
bool njsBaton_isDate(njsBaton *baton, napi_env env, napi_value value,
        bool *isDate);
bool njsBaton_queueWork(njsBaton *baton, napi_env env, const char *methodName,
        bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*),
        napi_value *promise);
bool njsBaton_reportError(njsBaton *baton, napi_env env);
bool njsBaton_setError(njsBaton *baton, int errNum, ...);
bool njsBaton_setErrorDPI(njsBaton *baton);
bool njsBaton_setJsValues(njsBaton *baton, napi_env env);


//-----------------------------------------------------------------------------
// definition of functions for njsDbObject class
//-----------------------------------------------------------------------------
bool njsDbObject_getInstance(njsModuleGlobals *globals, napi_env env,
        napi_value value, njsDbObject **obj);
bool njsDbObject_getSubClass(njsBaton *baton, dpiObjectType *objectTypeHandle,
        napi_env env, napi_value *cls, njsDbObjectType **objectType);
bool njsDbObject_new(njsDbObjectType *objType, dpiObject *objHandle,
        napi_env env, njsModuleGlobals *globals, napi_value *value);
bool njsDbObjectType_getFromClass(napi_env env, napi_value cls,
        njsDbObjectType **objType);


//-----------------------------------------------------------------------------
// definition of functions for njsAqMessage class
//-----------------------------------------------------------------------------
bool njsAqMessage_createFromHandle(njsBaton *baton, dpiMsgProps *handle,
        napi_env env, njsAqQueue *queue, napi_value *messageObj);


//-----------------------------------------------------------------------------
// definition of functions for njsAqQueue class
//-----------------------------------------------------------------------------
bool njsAqQueue_createFromHandle(njsBaton *baton, napi_env env,
        napi_value *obj);


//-----------------------------------------------------------------------------
// definition of functions for njsConnection class
//-----------------------------------------------------------------------------
bool njsConnection_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *connObj);


//-----------------------------------------------------------------------------
// definition of functions for njsLob class
//-----------------------------------------------------------------------------
bool njsLob_populateBuffer(njsBaton *baton, njsLobBuffer *buffer);
bool njsLob_new(njsModuleGlobals *globals, njsLobBuffer *buffer, napi_env env,
        napi_value parentObj, napi_value *lobObj);


//-----------------------------------------------------------------------------
// definition of functions for njsResultSet class
//-----------------------------------------------------------------------------
bool njsResultSet_new(njsBaton *baton, napi_env env, njsConnection *conn,
        dpiStmt *handle, njsVariable *vars, uint32_t numVars,
        napi_value *rsObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaCollection class
//-----------------------------------------------------------------------------
bool njsSodaCollection_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *connObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaDocCursor class
//-----------------------------------------------------------------------------
bool njsSodaDocCursor_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *cursorObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaDocument class
//-----------------------------------------------------------------------------
bool njsSodaDocument_createFromHandle(napi_env env, dpiSodaDoc *handle,
        njsModuleGlobals *globals, napi_value *docObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaDatabase class
//-----------------------------------------------------------------------------
bool njsSodaDatabase_createFromHandle(napi_env env, napi_value connObj,
        njsModuleGlobals *globals, dpiSodaDb *handle, napi_value *dbObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaOperation class
//-----------------------------------------------------------------------------
bool njsSodaOperation_createFromCollection(napi_env env,
        napi_value collObj, njsModuleGlobals *globals, njsSodaCollection *coll,
        napi_value *opObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSubscription class
//-----------------------------------------------------------------------------
void njsSubscription_eventHandler(njsSubscription *subscr,
        dpiSubscrMessage *incomingMessage);
bool njsSubscription_new(njsBaton *baton, napi_env env, napi_value *obj,
        njsSubscription **subscr);
bool njsSubscription_startNotifications(njsSubscription *subscr,
        napi_env env, njsBaton *baton);
bool njsSubscription_stopNotifications(njsSubscription *subscr);


//-----------------------------------------------------------------------------
// definition of utility functions
//-----------------------------------------------------------------------------
bool njsUtils_addTypeProperties(napi_env env, napi_value obj,
        const char *propertyNamePrefix, uint32_t oracleTypeNum,
        njsDbObjectType *objType);
napi_value njsUtils_convertToBoolean(napi_env env, bool value);
napi_value njsUtils_convertToInt(napi_env env, int32_t value);
napi_value njsUtils_convertToString(napi_env env, const char *value,
        uint32_t valueLength);
napi_value njsUtils_convertToUnsignedInt(napi_env env, uint32_t value);
napi_value njsUtils_convertToUnsignedIntArray(napi_env env,
        uint32_t numValues, uint32_t *values);
bool njsUtils_copyArray(napi_env env, void *sourceArray, uint32_t numElements,
        size_t elementSize, void **destArray, uint32_t *destNumElements);
bool njsUtils_copyString(napi_env env, char *source, size_t sourceLength,
        char **dest, size_t *destLength);
bool njsUtils_copyStringFromJS(napi_env env, napi_value value, char **result,
        size_t *resultLength);
bool njsUtils_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, const njsClassDef *classDef,
        njsBaton **baton);
bool njsUtils_genericNew(napi_env env, const njsClassDef *classDef,
        napi_ref constructorRef, napi_value *instanceObj,
        njsBaseInstance **instance);
bool njsUtils_genericThrowError(napi_env env, const char *fileName,
        int lineNum);
bool njsUtils_getError(napi_env env, dpiErrorInfo *errorInfo,
        const char *buffer, napi_value *error);
bool njsUtils_getNamedProperty(napi_env env, napi_value value,
        const char *name, napi_value *propertyValue);
bool njsUtils_getNamedPropertyBool(napi_env env, napi_value value,
        const char *name, bool *outValue);
bool njsUtils_getNamedPropertyInt(napi_env env, napi_value value,
        const char *name, int32_t *outValue);
bool njsUtils_getNamedPropertyShardingKey(napi_env env, napi_value value,
        const char *name, uint8_t *numShardingKeyColumns,
        dpiShardingKeyColumn **shardingKeyColumns);
bool njsUtils_getNamedPropertyString(napi_env env, napi_value value,
        const char *name, char **result, size_t *resultLength);
bool njsUtils_getNamedPropertyStringArray(napi_env env, napi_value value,
        const char *name, uint32_t *resultNumElems, char ***resultElems,
        uint32_t **resultElemLengths);
bool njsUtils_getNamedPropertyUnsignedInt(napi_env env, napi_value value,
        const char *name, uint32_t *outValue);
bool njsUtils_getNamedPropertyUnsignedIntArray(napi_env env, napi_value value,
        const char *name, uint32_t *numElements, uint32_t **elements);
bool njsUtils_getStringFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found, char *errorBuffer);
bool njsUtils_getValueFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found, char *errorBuffer);
bool njsUtils_isBuffer(napi_env env, napi_value value);
bool njsUtils_isInstance(napi_env env, napi_value value, const char *name);
bool njsUtils_throwError(napi_env env, int errNum, ...);
bool njsUtils_throwErrorDPI(napi_env env, njsModuleGlobals *globals);
bool njsUtils_validateArgs(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsModuleGlobals **globals,
        napi_value *callingObj, const njsClassDef *classDef,
        njsBaseInstance **instance);
bool njsUtils_validateArgType(napi_env env, napi_value *args,
        napi_valuetype expectedType, int index);
bool njsUtils_validatePropType(napi_env env, napi_value value,
        napi_valuetype expectedType, const char *name);


//-----------------------------------------------------------------------------
// definition of variable functions
//-----------------------------------------------------------------------------
bool njsVariable_createBuffer(njsVariable *var, njsConnection *conn,
        njsBaton *baton);
void njsVariable_free(njsVariable *var);
bool njsVariable_getArrayValue(njsVariable *var, njsConnection *conn,
        uint32_t pos, njsBaton *baton, napi_env env, napi_value *value);
bool njsVariable_getMetadataMany(njsVariable *vars, uint32_t numVars,
        napi_env env, napi_value *metadata);
bool njsVariable_getMetadataOne(njsVariable *var, napi_env env,
        napi_value *metadata);
bool njsVariable_getScalarValue(njsVariable *var, njsConnection *conn,
        njsVariableBuffer *buffer, uint32_t pos, njsBaton *baton, napi_env env,
        napi_value *value);
bool njsVariable_initForQuery(njsVariable *vars, uint32_t numVars,
        dpiStmt *handle, njsBaton *baton);
bool njsVariable_initForQueryJS(njsVariable *vars, uint32_t numVars,
        napi_env env, njsBaton *baton);
bool njsVariable_performMapping(njsVariable *var, dpiQueryInfo *queryInfo,
        njsBaton *baton);
bool njsVariable_process(njsVariable *vars, uint32_t numVars, uint32_t numRows,
        njsBaton *baton);
bool njsVariable_processJS(njsVariable *vars, uint32_t numVars, napi_env env,
        njsBaton *baton);
bool njsVariable_setScalarValue(njsVariable *var, uint32_t pos, napi_env env,
        napi_value value, njsBaton *baton);


//-----------------------------------------------------------------------------
// definition of functions for njsTokenCallback class
//-----------------------------------------------------------------------------
int njsTokenCallback_eventHandler(njsTokenCallback *callback,
        dpiAccessToken *accessToken);
bool njsTokenCallback_new(njsBaton *baton, napi_env env,
        napi_value userCallback);
bool njsTokenCallback_startNotifications(njsTokenCallback *callback,
        napi_env env);
bool njsTokenCallback_returnAccessToken(njsTokenCallback *callback,
        napi_env env, napi_value accessToken);
bool njsTokenCallback_stopNotifications(njsTokenCallback *callback);
#endif                                               /* __NJSMODULE_H__ */
