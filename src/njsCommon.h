/* Copyright (c) 2015, 2017, Oracle and/or its affiliates.
   All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file uses NAN:
 *
 * Copyright (c) 2015 NAN contributors
 *
 * NAN contributors listed at https://github.com/rvagg/nan#contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * NAME
 *  njsCommon.h
 *
 * DESCRIPTION
 *  Common classes used throughout driver.
 *
 *****************************************************************************/

#ifndef __NJSCOMMON_H__
#define __NJSCOMMON_H__

#include <v8.h>
#include <node.h>
#include "nan.h"
#include <string>
#include <cstring>
#include <stdlib.h>
#include <stdio.h>

extern "C" {
#include "dpi.h"
}

#include "njsMessages.h"

using namespace v8;
using namespace node;

class njsBaton;
class njsOracledb;
class njsProtoILob;

//-----------------------------------------------------------------------------
// njsBindType
//   User defined bind types.
//-----------------------------------------------------------------------------
typedef enum {
    NJS_BIND_UNKNOWN  = -1,
    NJS_BIND_IN       = 3001,
    NJS_BIND_INOUT    = 3002,
    NJS_BIND_OUT      = 3003
} njsBindType;


//-----------------------------------------------------------------------------
// njsRowsType
//   Values used for "outFormat".
//-----------------------------------------------------------------------------
typedef enum {
    NJS_ROWS_UNKNOWN  = -1,
    NJS_ROWS_ARRAY    = 4001,
    NJS_ROWS_OBJECT   = 4002
} njsRowsType;


//-----------------------------------------------------------------------------
// njsDataType
//   User defined data types for binds and defines.
//-----------------------------------------------------------------------------
typedef enum {
    NJS_DATATYPE_UNKNOWN  = -1,
    NJS_DATATYPE_DEFAULT  = 0,  // Used in FetchInfo Context only (use DB type)
    NJS_DATATYPE_STR      = 2001,
    NJS_DATATYPE_NUM      = 2002,
    NJS_DATATYPE_DATE     = 2003,
    NJS_DATATYPE_CURSOR   = 2004,
    NJS_DATATYPE_BUFFER   = 2005,
    NJS_DATATYPE_CLOB     = 2006,
    NJS_DATATYPE_BLOB     = 2007,
    NJS_DATATYPE_INT      = 2008
} njsDataType;


//-----------------------------------------------------------------------------
// njsDBType
//   Database types used for extended meta data
//-----------------------------------------------------------------------------
typedef enum {
    NJS_DB_TYPE_UNKNOWN        = -1,
    NJS_DB_TYPE_DEFAULT        = 0,
    NJS_DB_TYPE_VARCHAR        = 1,
    NJS_DB_TYPE_NUMBER         = 2,
    NJS_DB_TYPE_LONG           = 8,
    NJS_DB_TYPE_DATE           = 12,
    NJS_DB_TYPE_RAW            = 23,
    NJS_DB_TYPE_LONG_RAW       = 24,
    NJS_DB_TYPE_CHAR           = 96,
    NJS_DB_TYPE_BINARY_FLOAT   = 100,
    NJS_DB_TYPE_BINARY_DOUBLE  = 101,
    NJS_DB_TYPE_ROWID          = 104,
    NJS_DB_TYPE_CLOB           = 112,
    NJS_DB_TYPE_BLOB           = 113,
    NJS_DB_TYPE_TIMESTAMP      = 187,
    NJS_DB_TYPE_TIMESTAMP_TZ   = 188,
    NJS_DB_TYPE_TIMESTAMP_LTZ  = 232,

    /* Pseudo types */
    NJS_DB_TYPE_NCHAR          = 1096,
    NJS_DB_TYPE_NVARCHAR       = 1001,
    NJS_DB_TYPE_NCLOB          = 1112,
} njsDBType;


//-----------------------------------------------------------------------------
// njsVariable
//   Class used for keeping track of variables used for fetching data.
//-----------------------------------------------------------------------------
class njsVariable {
public:
    std::string name;
    uint32_t pos;
    dpiOracleTypeNum dbTypeNum;
    dpiOracleTypeNum varTypeNum;
    dpiNativeTypeNum nativeTypeNum;
    dpiVar *dpiVarHandle;
    dpiData *dpiVarData;
    uint32_t bindDir;
    uint32_t maxArraySize;
    uint32_t maxSize;
    uint32_t dbSizeInBytes;
    int16_t precision;
    int8_t scale;
    bool isArray;
    bool isNullable;
    njsProtoILob *lobs;
    uint32_t numQueryVars;
    njsVariable *queryVars;

    njsVariable() : pos(0), dbTypeNum(DPI_ORACLE_TYPE_VARCHAR),
            varTypeNum(DPI_ORACLE_TYPE_VARCHAR),
            nativeTypeNum(DPI_NATIVE_TYPE_BYTES), dpiVarHandle(NULL),
            dpiVarData(NULL), bindDir(0), maxArraySize(0), maxSize(0),
            dbSizeInBytes(0), precision(0), scale(0), isArray(false),
            isNullable(false), lobs(NULL), numQueryVars(0), queryVars(NULL) {}
    ~njsVariable();
    njsDataType DataType();
    njsDBType DBType();
};


//-----------------------------------------------------------------------------
// njsFetchInfo
//   Class used for keeping track of which data types have been specifically
// requested from JS.
//-----------------------------------------------------------------------------
class njsFetchInfo {
public:
    std::string name;
    njsDataType type;

    njsFetchInfo() : type(NJS_DATATYPE_DEFAULT) {}
};


//-----------------------------------------------------------------------------
// njsCommon
//   Class used for all objects that are exposed to JS.
//-----------------------------------------------------------------------------
class njsCommon : public Nan::ObjectWrap {
friend class njsBaton;
protected:

    virtual njsErrorType GetInvalidErrorType() const = 0;
    virtual bool IsValid() const = 0;

    static bool Validate(njsCommon *obj);
    static njsCommon *ValidateGetter(Nan::NAN_GETTER_ARGS_TYPE args);
    static njsCommon *ValidateSetter(Nan::NAN_SETTER_ARGS_TYPE args);
    static njsCommon *ValidateArgs(Nan::NAN_METHOD_ARGS_TYPE args,
            int minArgs, int maxArgs);
    static void PropertyIsReadOnly(const char *name);

    njsBaton *CreateBaton(Nan::NAN_METHOD_ARGS_TYPE args);
    bool GetObjectArg(Nan::NAN_METHOD_ARGS_TYPE args, int index,
            Local<Object> &value);
    bool GetStringArg(Nan::NAN_METHOD_ARGS_TYPE args, int index,
            std::string &value);
    bool GetUnsignedIntArg(Nan::NAN_METHOD_ARGS_TYPE args, int index,
            uint32_t *value);
    bool SetPropBool(Local<Value> value, bool *valuePtr, const char *name);
    bool SetPropInt(Local<Value> value, int32_t *valuePtr, const char *name);
    bool SetPropPositiveInt(Local<Value> value, uint32_t *valuePtr,
            const char *name);
    bool SetPropString(Local<Value> value, std::string *valuePtr,
            const char *name);
    bool SetPropUnsignedInt(Local<Value> value, uint32_t *valuePtr,
            const char *name);

    // used to prevent multiple asynchronous methods from acting upon this
    // object at the same time
    njsBaton *activeBaton;
};


//-----------------------------------------------------------------------------
// njsBaton
//   Baton used for asynchronous methods. Node.js does not allow objects to be
// created on one thread and used on another so any data needs to be passed
// between threads using this class. This class also simplifies the code
// required to make asynchronous calls.
//-----------------------------------------------------------------------------
class njsBaton {
public:
    std::string error;
    std::string sql;
    std::string user;
    std::string password;
    std::string connectString;
    std::string connClass;
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    int32_t poolPingInterval;
    dpiPool *dpiPoolHandle;
    dpiConn *dpiConnHandle;
    dpiStmt *dpiStmtHandle;
    dpiLob *dpiLobHandle;
    uint32_t stmtCacheSize;
    uint32_t lobPrefetchSize;
    uint32_t maxRows;
    uint32_t fetchArraySize;
    uint32_t rowsFetched;
    uint32_t bufferRowIndex;
    uint64_t rowsAffected;
    unsigned int outFormat;
    uint32_t numQueryVars;
    njsVariable *queryVars;
    uint32_t numBindVars;
    njsVariable *bindVars;
    uint32_t numFetchInfo;
    njsFetchInfo *fetchInfo;
    uint32_t numFetchAsStringTypes;
    njsDataType *fetchAsStringTypes;
    uint32_t numFetchAsBufferTypes;
    njsDataType *fetchAsBufferTypes;
    njsProtoILob *protoILob;
    bool externalAuth;
    bool getRS;
    bool autoCommit;
    bool extendedMetaData;
    bool keepQueryInfo;
    bool isReturning;
    bool isPLSQL;
    uint64_t bufferSize;
    char *bufferPtr;
    uint64_t lobOffset;
    uint64_t lobAmount;
    njsCommon *callingObj;
    Nan::Persistent<Object> jsCallingObj;
    Nan::Persistent<Object> jsOracledb;
    Nan::Persistent<Object> jsBuffer;
    Nan::Persistent<Object> jsRows;
    Nan::Persistent<Function> jsCallback;

    njsBaton(Local<Function> callback, Local<Object> callingObj) :
            poolMin(0), poolMax(0), poolIncrement(0), poolTimeout(0),
            poolPingInterval(0), dpiPoolHandle(NULL), dpiConnHandle(NULL),
            dpiStmtHandle(NULL), dpiLobHandle(NULL), stmtCacheSize(0),
            lobPrefetchSize(0), maxRows(0), fetchArraySize(0), rowsFetched(0),
            bufferRowIndex(0), rowsAffected(0), outFormat(0), numQueryVars(0),
            queryVars(NULL), numBindVars(0), bindVars(NULL), numFetchInfo(0),
            fetchInfo(NULL), numFetchAsStringTypes(0),
            fetchAsStringTypes(NULL), numFetchAsBufferTypes(0),
            fetchAsBufferTypes(NULL), protoILob(NULL), externalAuth(false),
            getRS(false), autoCommit(false), extendedMetaData(false),
            keepQueryInfo(false), isReturning(false), isPLSQL(false),
            bufferSize(0), bufferPtr(NULL), lobOffset(0), lobAmount(0) {
        this->jsCallback.Reset(callback);
        this->jsCallingObj.Reset(callingObj);
        this->callingObj = Nan::ObjectWrap::Unwrap<njsCommon>(callingObj);
        req.data = this;
    }
    ~njsBaton();

    // methods for getting information from JS objects stored on baton
    njsOracledb *GetOracledb();

    // methods for getting DPI errors
    void GetDPIError(void);

    // method for checking for a JavaScript exception
    void CheckJSException(Nan::TryCatch *tryCatch);

    // clear all data used in asynchronous operations
    void ClearAsyncData(void);

    // methods for setting DPI handles
    void SetDPIConnHandle(dpiConn *handle);
    void SetDPIPoolHandle(dpiPool *handle);
    void SetDPIStmtHandle(dpiStmt *handle);
    void SetDPILobHandle(dpiLob *handle);

    // methods for getting values from JSON
    bool GetBoolFromJSON(Local<Object> obj, const char *key, int index,
            bool *value);
    bool GetStringFromJSON(Local<Object> obj, const char *key, int index,
            string &value);
    bool GetPositiveIntFromJSON(Local<Object> obj, const char *key, int index,
            uint32_t *value);
    bool GetIntFromJSON(Local<Object> obj, const char *key, int index,
            int32_t *value);
    bool GetUnsignedIntFromJSON(Local<Object> obj, const char *key, int index,
            uint32_t *value);

    // methods for queuing work on the thread queue
    void QueueWork(const char *methodName, void (*workCallback)(njsBaton*),
            void (*afterWorkCallback)(njsBaton*, Local<Value>[]),
            unsigned int numCallbackArgs);

private:
    uv_work_t req;
    const char *methodName;
    void (*workCallback)(njsBaton*);
    void (*afterWorkCallback)(njsBaton*, Local<Value> callbackArgs[]);
    unsigned int numCallbackArgs;

    static void AsyncWorkCallback(uv_work_t *req);
    static void AsyncAfterWorkCallback(uv_work_t *req, int status);
};

#endif

