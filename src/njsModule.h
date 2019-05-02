// Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved.

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

#define NAPI_VERSION 2

#include <node_api.h>
#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "dpi.h"
#include "uv.h"

// Keep the version in sync with package.json.
// The suffix should be something like "-dev" or "-beta.1".
// For production, leave NJS_NODE_ORACLEDB_SUFFIX undefined (not "")
#define NJS_NODE_ORACLEDB_MAJOR       4
#define NJS_NODE_ORACLEDB_MINOR       0
#define NJS_NODE_ORACLEDB_PATCH       0
#define NJS_NODE_ORACLEDB_SUFFIX      "-dev"

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

// define macro for checking the result of an N-API call
#define NJS_CHECK_NAPI(env, status) \
    if ((status) != napi_ok) \
        return njsUtils_genericThrowError(env);

// define macros for defining N-API functions; many are identical but different
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


//-----------------------------------------------------------------------------
// enumerations
//-----------------------------------------------------------------------------

// bind directions
#define NJS_BIND_IN                     3001
#define NJS_BIND_INOUT                  3002
#define NJS_BIND_OUT                    3003

// data types (loosely based on Javascript types)
#define NJS_DATATYPE_DEFAULT            0
#define NJS_DATATYPE_STR                2001
#define NJS_DATATYPE_NUM                2002
#define NJS_DATATYPE_DATE               2003
#define NJS_DATATYPE_CURSOR             2004
#define NJS_DATATYPE_BUFFER             2005
#define NJS_DATATYPE_CLOB               2006
#define NJS_DATATYPE_BLOB               2007
#define NJS_DATATYPE_INT                2008

// database types (used for extended metadata)
#define NJS_DB_TYPE_DEFAULT             0
#define NJS_DB_TYPE_VARCHAR             1
#define NJS_DB_TYPE_NUMBER              2
#define NJS_DB_TYPE_LONG                8
#define NJS_DB_TYPE_DATE                12
#define NJS_DB_TYPE_RAW                 23
#define NJS_DB_TYPE_LONG_RAW            24
#define NJS_DB_TYPE_CHAR                96
#define NJS_DB_TYPE_BINARY_FLOAT        100
#define NJS_DB_TYPE_BINARY_DOUBLE       101
#define NJS_DB_TYPE_ROWID               104
#define NJS_DB_TYPE_CLOB                112
#define NJS_DB_TYPE_BLOB                113
#define NJS_DB_TYPE_TIMESTAMP           187
#define NJS_DB_TYPE_TIMESTAMP_TZ        188
#define NJS_DB_TYPE_TIMESTAMP_LTZ       232
#define NJS_DB_TYPE_NCHAR               1096
#define NJS_DB_TYPE_NVARCHAR            1001
#define NJS_DB_TYPE_NCLOB               1112

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

    // New ones should be added here

    errMaxErrors                // Max # of errors plus one
} njsErrorType;

// pool statuses
#define NJS_POOL_STATUS_OPEN            6000
#define NJS_POOL_STATUS_DRAINING        6001
#define NJS_POOL_STATUS_CLOSED          6002

// values used for "outFormat"
#define NJS_ROWS_ARRAY                  4001
#define NJS_ROWS_OBJECT                 4002

// values used for SODA collection creation mode
#define NJS_SODA_COLL_CREATE_MODE_DEFAULT   0
#define NJS_SODA_COLL_CREATE_MODE_MAP       5001


//-----------------------------------------------------------------------------
// forward declarations
//-----------------------------------------------------------------------------

typedef struct njsBaseInstance njsBaseInstance;
typedef struct njsBaton njsBaton;
typedef struct njsClassDef njsClassDef;
typedef struct njsConnection njsConnection;
typedef struct njsConstant njsConstant;
typedef struct njsFetchInfo njsFetchInfo;
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


//-----------------------------------------------------------------------------
// class definitions (defined in class implementation files)
//-----------------------------------------------------------------------------

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
    dpiPool *dpiPoolHandle;
    dpiStmt *dpiStmtHandle;
    dpiSodaColl *dpiSodaCollHandle;
    dpiSodaDoc *dpiSodaDocHandle;
    dpiSodaDocCursor *dpiSodaDocCursorHandle;
    uint32_t numSodaDocs;
    dpiSodaDoc **sodaDocs;

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

    // other structures (no free required)
    dpiStmtInfo stmtInfo;

    // integer values
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
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

    // boolean values
    bool externalAuth;
    bool homogeneous;
    bool getRS;
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

    // LOB buffer (requires free only if string was used)
    uint64_t bufferSize;
    char *bufferPtr;

    // subscriptions (no free required)
    njsSubscription *subscription;

    // references that are held (requires free)
    napi_ref jsBuffer;
    napi_ref jsCallingObj;
    napi_ref jsCallback;
    napi_ref jsSubscription;

    // constructors
    napi_value jsDateConstructor;
    napi_value jsLobConstructor;

    // asynchronous work parameters
    napi_async_work asyncWork;
    bool (*workCallback)(njsBaton*);
    bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*);
    napi_value *callbackArgs;
    unsigned int numCallbackArgs;
};

// data for class definitions exposed to JS
struct njsClassDef {
    const char *name;
    size_t structSize;
    napi_finalize finalizeFn;
    const napi_property_descriptor *properties;
    const njsConstant *constants;
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
    uint32_t poolIncrement;
    uint32_t poolTimeout;
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
    napi_ref jsDateConstructor;
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
    njsOracleDb *oracleDb;
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    uint32_t stmtCacheSize;
    int32_t poolPingInterval;
};

// data for class ResultSet exposed to JS.
struct njsResultSet {
    NJS_INSTANCE_HEAD
    dpiStmt *handle;
    njsConnection *conn;
    uint32_t numQueryVars;
    njsVariable *queryVars;
    uint32_t outFormat;
    uint32_t maxRows;
    bool extendedMetaData;
    bool autoClose;
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
    dpiVar *dpiVarHandle;
    uint32_t bindDir;
    uint32_t bindDataType;
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
    uint32_t numLobs;
    njsLobBuffer *lobs;
    uint32_t numQueryVars;
    njsVariable *queryVars;
};


//-----------------------------------------------------------------------------
// definition of functions for error functions
//-----------------------------------------------------------------------------
void njsErrors_getMessage(char *buffer, int errNum, ...);
void njsErrors_getMessageVaList(char *buffer, int errNum, va_list vaList);


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
bool njsBaton_getErrorInfo(njsBaton *baton, napi_env env, napi_value *error,
        napi_value *callingObj, napi_value *callback);
bool njsBaton_getFetchInfoFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *numFetchInfo, njsFetchInfo **fetchInfo, bool *found);
bool njsBaton_getIntFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, int32_t *result, bool *found);
uint32_t njsBaton_getNumOutBinds(njsBaton *baton);
bool njsBaton_getSodaDocument(njsBaton *baton, njsSodaDatabase *db,
        napi_env env, napi_value obj, dpiSodaDoc **handle);
bool njsBaton_getStringFromArg(njsBaton *baton, napi_env env, napi_value *args,
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
bool njsBaton_isBindValue(njsBaton *baton, napi_env env, napi_value value);
bool njsBaton_isDate(njsBaton *baton, napi_env env, napi_value value);
bool njsBaton_queueWork(njsBaton *baton, napi_env env, const char *methodName,
        bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*),
        unsigned int numCallbackArgs);
void njsBaton_reportError(njsBaton *baton, napi_env env);
bool njsBaton_setConstructors(njsBaton *baton, napi_env env);
bool njsBaton_setError(njsBaton *baton, int errNum, ...);
bool njsBaton_setErrorDPI(njsBaton *baton);


//-----------------------------------------------------------------------------
// definition of functions for njsOracleDb class
//-----------------------------------------------------------------------------
bool njsOracleDb_new(napi_env env, napi_value instanceObj,
        njsOracleDb **instance);
bool njsOracleDb_prepareClass(njsOracleDb *oracleDb, napi_env env,
        napi_value instance, const njsClassDef *classDef, napi_ref *clsRef);


//-----------------------------------------------------------------------------
// definition of functions for njsConnection class
//-----------------------------------------------------------------------------
bool njsConnection_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *connObj);


//-----------------------------------------------------------------------------
// definition of functions for njsLob class
//-----------------------------------------------------------------------------
bool njsLob_populateBuffer(njsBaton *baton, njsLobBuffer *buffer);
bool njsLob_new(njsBaton *baton, njsLobBuffer *buffer, napi_env env,
        napi_value *lobObj);

//-----------------------------------------------------------------------------
// definition of functions for njsPool class
//-----------------------------------------------------------------------------
bool njsPool_newFromBaton(njsBaton *baton, napi_env env, napi_value *poolObj);


//-----------------------------------------------------------------------------
// definition of functions for njsResultSet class
//-----------------------------------------------------------------------------
bool njsResultSet_new(njsBaton *baton, napi_env env, dpiStmt *handle,
        njsVariable *vars, uint32_t numVars, bool autoClose,
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
bool njsSodaDatabase_createFromHandle(napi_env env, njsConnection *conn,
        dpiSodaDb *handle, napi_value *dbObj);


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
bool njsUtils_getError(napi_env env, dpiErrorInfo *errorInfo,
        const char *buffer, napi_value *error);
napi_value njsUtils_getNull(napi_env env);
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
bool njsVariable_getArrayValue(njsVariable *var, uint32_t pos, njsBaton *baton,
        napi_env env, napi_value *value);
uint32_t njsVariable_getDataType(njsVariable *var);
uint32_t njsVariable_getDBType(njsVariable *var);
bool njsVariable_getMetadataMany(njsVariable *vars, uint32_t numVars,
        napi_env env, bool extended, napi_value *metadata);
bool njsVariable_getMetadataOne(njsVariable *var, napi_env env, bool extended,
        napi_value *metadata);
bool njsVariable_getScalarValue(njsVariable *var, njsVariableBuffer *buffer,
        uint32_t pos, njsBaton *baton, napi_env env, napi_value *value);
bool njsVariable_initForQuery(njsVariable *vars, uint32_t numVars,
        dpiStmt *handle, njsBaton *baton);
bool njsVariable_performMapping(njsVariable *var, dpiQueryInfo *queryInfo,
        njsBaton *baton);
bool njsVariable_process(njsVariable *vars, uint32_t numVars, uint32_t numRows,
        njsBaton *baton);
bool njsVariable_processBuffer(njsVariable *var, njsVariableBuffer *buffer,
        njsBaton *baton);
bool njsVariable_setScalarValue(njsVariable *var, uint32_t pos, napi_env env,
        napi_value value, bool checkSize, njsBaton *baton);
bool njsVariable_setValue(njsVariable *var, napi_env env, napi_value value,
        njsBaton *baton);

#endif                                               /* __NJSMODULE_H__ */
