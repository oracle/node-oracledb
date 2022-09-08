// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
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

#define NAPI_VERSION 4

#include <node_api.h>
#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "dpi.h"
#include "uv.h"

// Keep the version in sync with package.json.
// The suffix should be something like "-dev" or "-beta.1".
// For production, use: #define NJS_NODE_ORACLEDB_SUFFIX ""
#define NJS_NODE_ORACLEDB_MAJOR       5
#define NJS_NODE_ORACLEDB_MINOR       5
#define NJS_NODE_ORACLEDB_PATCH       0
#define NJS_NODE_ORACLEDB_SUFFIX      ""

// define stringified version and driver name
#define NJS_STR_HELPER(x)       #x
#define NJS_STR(x)              NJS_STR_HELPER(x)
#define NJS_VERSION_STRING  \
        NJS_STR(NJS_NODE_ORACLEDB_MAJOR) "." \
        NJS_STR(NJS_NODE_ORACLEDB_MINOR) "." \
        NJS_STR(NJS_NODE_ORACLEDB_PATCH) \
        NJS_NODE_ORACLEDB_SUFFIX
#define NJS_DRIVER_NAME "node-oracledb : " NJS_VERSION_STRING

// Used for Oracledb.version
#define NJS_NODE_ORACLEDB_VERSION   ( (NJS_NODE_ORACLEDB_MAJOR * 10000) + \
                                      (NJS_NODE_ORACLEDB_MINOR * 100) +   \
                                      (NJS_NODE_ORACLEDB_PATCH) )

// default values
#define NJS_MAX_ROWS                    0
#define NJS_STMT_CACHE_SIZE             30
#define NJS_POOL_MIN                    0
#define NJS_POOL_MAX                    4
#define NJS_POOL_INCR                   1
#define NJS_POOL_TIMEOUT                60
#define NJS_LOB_PREFETCH_SIZE           16384
#define NJS_POOL_DEFAULT_PING_INTERVAL  60

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
        return njsUtils_genericThrowError(env);

// define macros for defining Node-API functions; many are identical but different
// names are used to make it easier to read
#define NJS_NAPI_GETTER(name) \
    napi_value name(napi_env, napi_callback_info)
#define NJS_NAPI_METHOD(name) \
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

    // New ones should be added here

    errMaxErrors                // Max # of errors plus one
} njsErrorType;

// pool statuses
#define NJS_POOL_STATUS_OPEN            6000
#define NJS_POOL_STATUS_DRAINING        6001
#define NJS_POOL_STATUS_CLOSED          6002
#define NJS_POOL_STATUS_RECONFIGURING   6003

// values used for "outFormat"
#define NJS_ROWS_ARRAY                  4001
#define NJS_ROWS_OBJECT                 4002

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
typedef struct njsConstant njsConstant;
typedef struct njsDataTypeInfo njsDataTypeInfo;
typedef struct njsFetchInfo njsFetchInfo;
typedef struct njsImplicitResult njsImplicitResult;
typedef struct njsJsonBuffer njsJsonBuffer;
typedef struct njsLob njsLob;
typedef struct njsLobBuffer njsLobBuffer;
typedef struct njsOracleDb njsOracleDb;
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
extern const njsClassDef njsClassDefBaseDbObject;
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
    njsOracleDb *oracleDb;
};

// data for class AqEnqOptions exposed to JS.
struct njsAqEnqOptions {
    NJS_INSTANCE_HEAD
    dpiEnqOptions *handle;
    njsOracleDb *oracleDb;
    uint16_t deliveryMode;
};

// data for class AqMessage exposed to JS.
struct njsAqMessage {
    NJS_INSTANCE_HEAD
    dpiMsgProps *handle;
    njsOracleDb *oracleDb;
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
    njsOracleDb *oracleDb;
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
    char *typeName;
    size_t typeNameLength;
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
    uint32_t outFormat;
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
    bool closeOnFetch;
    bool closeOnAllRowsFetched;
    bool autoCommit;
    bool extendedMetaData;
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
    bool dbObjectAsPojo;
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

    // values required to check if a value is a date; this is only used when
    // binding data in connection.execute() and connection.executeMany() and
    // when managing sharding keys (when getting a connection); this can be
    // replaced with calls to napi_is_date() when it is available for all LTS
    // releases
    napi_value jsIsDateObj;
    napi_value jsIsDateMethod;

    // constructors
    napi_value jsDateConstructor;
    napi_value jsLobConstructor;
    napi_value jsResultSetConstructor;
    napi_value jsBaseDbObjectConstructor;

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
    const njsConstant *constants;
    bool propertiesOnInstance;
};

// data for class Connection exposed to JS.
struct njsConnection {
    NJS_INSTANCE_HEAD
    dpiConn *handle;
    njsOracleDb *oracleDb;
    char *tag;
    size_t tagLength;
    bool retag;
};

// data for constants exposed to JS
struct njsConstant {
    const char *name;
    uint32_t value;
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
    njsOracleDb *oracleDb;
    uint32_t dataType;
    char *bufferPtr;
    uint64_t bufferSize;
    uint32_t pieceSize;
    uint32_t chunkSize;
    uint64_t length;
    bool isAutoClose;
    bool dirtyLength;
};

// data for keeping track of LOBs in the worker thread
struct njsLobBuffer {
    dpiLob *handle;
    uint32_t dataType;
    uint32_t chunkSize;
    uint64_t length;
    bool isAutoClose;
};

// data for class OracleDb exposed to JS.
struct njsOracleDb {
    NJS_INSTANCE_HEAD
    dpiContext *context;
    uint32_t maxRows;
    uint32_t outFormat;
    uint32_t stmtCacheSize;
    uint32_t fetchArraySize;
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolMaxPerShard;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    uint32_t prefetchRows;
    uint32_t lobPrefetchSize;
    uint32_t numFetchAsBufferTypes;
    uint32_t *fetchAsBufferTypes;
    uint32_t numFetchAsStringTypes;
    uint32_t *fetchAsStringTypes;
    int32_t poolPingInterval;
    char *connectionClass;
    size_t connectionClassLength;
    char *edition;
    size_t editionLength;
    bool autoCommit;
    bool extendedMetaData;
    bool externalAuth;
    bool events;
    bool dbObjectAsPojo;
    napi_ref jsAqDeqOptionsConstructor;
    napi_ref jsAqEnqOptionsConstructor;
    napi_ref jsAqMessageConstructor;
    napi_ref jsAqQueueConstructor;
    napi_ref jsBaseDbObjectConstructor;
    napi_ref jsConnectionConstructor;
    napi_ref jsDateConstructor;
    napi_ref jsLobConstructor;
    napi_ref jsPoolConstructor;
    napi_ref jsResultSetConstructor;
    napi_ref jsSodaCollectionConstructor;
    napi_ref jsSodaDatabaseConstructor;
    napi_ref jsSodaDocCursorConstructor;
    napi_ref jsSodaDocumentConstructor;
    napi_ref jsSodaOperationConstructor;
    napi_ref jsSubscriptions;
    napi_ref jsTokenCallbackHandler;

};

// data for class Pool exposed to JS.
struct njsPool {
    NJS_INSTANCE_HEAD
    dpiPool *handle;
    njsOracleDb *oracleDb;
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
    uint32_t outFormat;
    bool extendedMetaData;
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
    njsOracleDb *oracleDb;
};

// data for class SodaDocCursor exposed to JS.
struct njsSodaDocCursor {
    NJS_INSTANCE_HEAD
    dpiSodaDocCursor *handle;
    njsOracleDb *oracleDb;
};

// data for class SodaDocument exposed to JS.
struct njsSodaDocument {
    NJS_INSTANCE_HEAD
    dpiSodaDoc *handle;
    njsOracleDb *oracleDb;
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
    uint32_t subscrNamespace;
    uint64_t regId;
    njsOracleDb *oracleDb;
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
    bool dbObjectAsPojo;
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
    njsOracleDb *oracleDb;
    uint16_t numAttributes;
    njsDbObjectAttr *attributes;
    napi_property_descriptor *descriptors;
    njsDataTypeInfo elementTypeInfo;
    napi_ref jsDbObjectConstructor;
    char *fqn;
    size_t fqnLength;
};


// data for object type attribute information
struct njsDbObjectAttr {
    dpiObjectAttr *handle;
    njsOracleDb *oracleDb;
    njsDataTypeInfo typeInfo;
    const char *name;
    uint32_t nameLength;
};


// data for managing callback
struct njsTokenCallback {
    dpiAccessToken *accessToken;
    njsOracleDb *oracleDb;
    uv_async_t async;
    uv_mutex_t mutex;
    uv_barrier_t barrier;
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
bool njsBaton_create(njsBaton *baton, napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args);
bool njsBaton_createDate(njsBaton *baton, napi_env env, double value,
        napi_value *dateObj);
void njsBaton_free(njsBaton *baton, napi_env env);
bool njsBaton_getBoolFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, bool *result, bool *found);
bool njsBaton_getFetchInfoFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *numFetchInfo, njsFetchInfo **fetchInfo, bool *found);
bool njsBaton_getIntFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, int32_t *result, bool *found);
uint32_t njsBaton_getNumOutBinds(njsBaton *baton);
bool njsBaton_getShardingKeyColumnsFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint8_t *numShardKeys, dpiShardingKeyColumn **shards);
bool njsBaton_getSodaDocument(njsBaton *baton, njsSodaDatabase *db,
        napi_env env, napi_value obj, dpiSodaDoc **handle);
bool njsBaton_getStringFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found);
bool njsBaton_getStrBufFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found);
bool njsBaton_getStringArrayFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *resultNumElems, char ***resultElems,
        uint32_t **resultElemLengths, bool *found);
bool njsBaton_getSubscription(njsBaton *baton, napi_env env, napi_value name,
        bool unsubscribe);
bool njsBaton_getUnsignedIntFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *result, bool *found);
bool njsBaton_getValueFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found);
bool njsBaton_getXid(njsBaton *baton, napi_env env, napi_value arg);
bool njsBaton_isBindValue(njsBaton *baton, napi_env env, napi_value value);
bool njsBaton_isDate(njsBaton *baton, napi_env env, napi_value value,
        bool *isDate);
napi_value njsBaton_queueWork(njsBaton *baton, napi_env env,
        const char *methodName, bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*));
void njsBaton_reportError(njsBaton *baton, napi_env env);
bool njsBaton_setError(njsBaton *baton, int errNum, ...);
bool njsBaton_setErrorDPI(njsBaton *baton);
bool njsBaton_setJsValues(njsBaton *baton, napi_env env);


//-----------------------------------------------------------------------------
// definition of functions for njsDbObject class
//-----------------------------------------------------------------------------
bool njsDbObject_getInstance(njsOracleDb *oracleDb, napi_env env,
        napi_value value, njsDbObject **obj);
bool njsDbObject_getSubClass(njsBaton *baton, dpiObjectType *objectTypeHandle,
        napi_env env, napi_value *cls, njsDbObjectType **objectType);
bool njsDbObject_new(njsDbObjectType *objType, dpiObject *objHandle,
        napi_env env, napi_value *value);
bool njsDbObjectType_getFromClass(napi_env env, napi_value cls,
        njsDbObjectType **objType);
bool njsDbObject_toPojo(napi_value obj, napi_env env, napi_value *pojo);


//-----------------------------------------------------------------------------
// definition of functions for njsOracleDb class
//-----------------------------------------------------------------------------
bool njsOracleDb_new(napi_env env, napi_value instanceObj,
        njsOracleDb **instance);
bool njsOracleDb_prepareClass(njsOracleDb *oracleDb, napi_env env,
        napi_value instance, const njsClassDef *classDef, napi_ref *clsRef);


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
bool njsLob_new(njsOracleDb *oracleDb, njsLobBuffer *buffer, napi_env env,
        napi_value parentObj, napi_value *lobObj);

//-----------------------------------------------------------------------------
// definition of functions for njsPool class
//-----------------------------------------------------------------------------
bool njsPool_newFromBaton(njsBaton *baton, napi_env env, napi_value *poolObj);


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
        njsOracleDb *oracleDb, napi_value *docObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaDatabase class
//-----------------------------------------------------------------------------
bool njsSodaDatabase_createFromHandle(napi_env env, napi_value connObj,
        njsConnection *conn, dpiSodaDb *handle, napi_value *dbObj);


//-----------------------------------------------------------------------------
// definition of functions for njsSodaOperation class
//-----------------------------------------------------------------------------
bool njsSodaOperation_createFromCollection(napi_env env,
        napi_value collObj, njsSodaCollection *coll, napi_value *opObj);


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
        size_t numArgs, napi_value *args, njsBaton **baton);
bool njsUtils_genericNew(napi_env env, const njsClassDef *classDef,
        napi_ref constructorRef, napi_value *instanceObj,
        njsBaseInstance **instance);
bool njsUtils_genericThrowError(napi_env env);
bool njsUtils_getBoolArg(napi_env env, napi_value *args, int index,
        bool *result);
bool njsUtils_getError(napi_env env, dpiErrorInfo *errorInfo,
        const char *buffer, napi_value *error);
bool njsUtils_getIntArg(napi_env env, napi_value *args, int index,
        int32_t *result);
napi_value njsUtils_getNull(napi_env env);
bool njsUtils_getOwnPropertyNames(napi_env env, napi_value value,
        napi_value *names);
bool njsUtils_getStringArg(napi_env env, napi_value *args, int index,
        char **result, size_t *resultLength);
bool njsUtils_getStringFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found, char *errorBuffer);
bool njsUtils_getUnsignedIntArg(napi_env env, napi_value *args, int index,
        uint32_t *result);
bool njsUtils_getValueFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found, char *errorBuffer);
bool njsUtils_isBuffer(napi_env env, napi_value value);
bool njsUtils_isInstance(napi_env env, napi_value value, const char *name);
bool njsUtils_setPropBool(napi_env env, napi_value value, const char *name,
        bool *result);
bool njsUtils_setPropInt(napi_env env, napi_value value, const char *name,
        int32_t *result);
bool njsUtils_setPropString(napi_env env, napi_value value, const char *name,
        char **result, size_t *resultLength);
bool njsUtils_setPropUnsignedInt(napi_env env, napi_value value,
        const char *name, uint32_t *result);
bool njsUtils_setPropUnsignedIntArray(napi_env env, napi_value value,
        const char *name, uint32_t *numResults, uint32_t **results,
        const uint32_t *validTypes);
bool njsUtils_throwError(napi_env env, int errNum, ...);
bool njsUtils_throwErrorDPI(napi_env env, njsOracleDb *oracleDb);
bool njsUtils_validateArgs(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, napi_value *callingObj,
        njsBaseInstance **instance);
bool njsUtils_validateGetter(napi_env env, napi_callback_info info,
        njsBaseInstance **instance);
bool njsUtils_validateSetter(napi_env env, napi_callback_info info,
        njsBaseInstance **instance, napi_value *value);
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
        napi_env env, bool extended, napi_value *metadata);
bool njsVariable_getMetadataOne(njsVariable *var, napi_env env, bool extended,
        napi_value *metadata);
bool njsVariable_getNestedCursorIndices(njsVariable *vars, uint32_t numVars,
        napi_env env, napi_value *indices);
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
        napi_value value, bool checkSize, njsBaton *baton);
bool njsVariable_setValue(njsVariable *var, napi_env env, napi_value value,
        njsBaton *baton);


//-----------------------------------------------------------------------------
// definition of functions for njsTokenCallback class
//-----------------------------------------------------------------------------
int njsTokenCallback_eventHandler(njsTokenCallback *callback,
        dpiAccessToken *accessToken);
bool njsTokenCallback_new(njsBaton *baton, napi_env env);
bool njsTokenCallback_startNotifications(njsTokenCallback *callback,
        napi_env env);
bool njsTokenCallback_returnAccessToken(njsTokenCallback *callback,
        napi_env env, napi_value accessToken);
bool njsTokenCallback_stopNotifications(njsTokenCallback *callback);
#endif                                               /* __NJSMODULE_H__ */
