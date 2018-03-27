/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   njsOracle.h
 *
 * DESCRIPTION
 *   Oracledb class
 *
 *****************************************************************************/

#ifndef __NJSORACLE_H__
#define __NJSORACLE_H__

#include <v8.h>
#include <node.h>
#include "nan.h"

#include <string>
#include <cstring>
#include <stdlib.h>
#include <stdio.h>

#include "njsCommon.h"

using namespace node;
using namespace v8;


// Keep the version in sync with package.json.
// The suffix should be something like "-dev" or "-beta.1".
// For production, leave NJS_NODE_ORACLEDB_SUFFIX undefined (not "")
#define NJS_NODE_ORACLEDB_MAJOR       2
#define NJS_NODE_ORACLEDB_MINOR       2
#define NJS_NODE_ORACLEDB_PATCH       0
#define NJS_NODE_ORACLEDB_SUFFIX

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


//-----------------------------------------------------------------------------
// njsOracledb
//   Class exposed to JS for the main module.
//-----------------------------------------------------------------------------
class njsOracledb: public njsCommon
{
public:

    static void Init(Local<Object> target);

    bool               getAutoCommit() const       { return autoCommit; }
    unsigned int       getOutFormat() const        { return outFormat; }
    unsigned int       getMaxRows()  const         { return maxRows; }
    unsigned int       getStmtCacheSize()  const   { return stmtCacheSize; }
    unsigned int       getPoolMin() const          { return poolMin; }
    unsigned int       getPoolMax() const          { return poolMax; }
    unsigned int       getPoolIncrement() const    { return poolIncrement; }
    unsigned int       getPoolTimeout() const      { return poolTimeout; }
    unsigned int       getFetchArraySize() const   { return fetchArraySize; }
    const std::string& getConnectionClass() const  { return connClass; }
    bool               getExtendedMetaData() const { return extendedMetaData; }
    bool               IsValid() const             { return true; }
    njsErrorType       GetInvalidErrorType() const { return errSuccess; }
    void SetFetchAsStringTypesOnBaton(njsBaton *baton) const;
    void SetFetchAsBufferTypesOnBaton(njsBaton *baton) const;
    static dpiContext *GetDPIContext()             { return globalDPIContext; }
    static void ThrowDPIError(void);

private:

    static bool InitCommonCreateParams(njsBaton *baton,
            dpiCommonCreateParams *params);

    static NAN_METHOD(New);

    // Get Connection Methods
    static NAN_METHOD(GetConnection);
    static void Async_GetConnection(njsBaton *baton);
    static void Async_AfterGetConnection(njsBaton *baton, Local<Value> argv[]);

    // Create Pool Methods
    static NAN_METHOD(CreatePool);
    static void Async_CreatePool(njsBaton *baton);
    static void Async_AfterCreatePool(njsBaton *baton, Local<Value> argv[]);

    // Define Getter Accessors to Properties
    static NAN_GETTER(GetPoolMin);
    static NAN_GETTER(GetPoolMax);
    static NAN_GETTER(GetPoolIncrement);
    static NAN_GETTER(GetPoolTimeout);
    static NAN_GETTER(GetStmtCacheSize);
    static NAN_GETTER(GetAutoCommit);
    static NAN_GETTER(GetExtendedMetaData);
    static NAN_GETTER(GetMaxRows);
    static NAN_GETTER(GetOutFormat);
    static NAN_GETTER(GetVersion);
    static NAN_GETTER(GetVersionString);
    static NAN_GETTER(GetVersionSuffix);
    static NAN_GETTER(GetConnectionClass);
    static NAN_GETTER(GetEdition);
    static NAN_GETTER(GetExternalAuth);
    static NAN_GETTER(GetFetchArraySize);
    static NAN_GETTER(GetFetchAsString);
    static NAN_GETTER(GetFetchAsBuffer);
    static NAN_GETTER(GetLobPrefetchSize);
    static NAN_GETTER(GetOracleClientVersion);
    static NAN_GETTER(GetOracleClientVersionString);
    static NAN_GETTER(GetPoolPingInterval);
    static NAN_GETTER(GetEvents);

    // Define Setter Accessors to Properties
    static NAN_SETTER(SetPoolMin);
    static NAN_SETTER(SetPoolMax);
    static NAN_SETTER(SetPoolIncrement);
    static NAN_SETTER(SetPoolTimeout);
    static NAN_SETTER(SetStmtCacheSize);
    static NAN_SETTER(SetAutoCommit);
    static NAN_SETTER(SetExtendedMetaData);
    static NAN_SETTER(SetMaxRows);
    static NAN_SETTER(SetOutFormat);
    static NAN_SETTER(SetVersion);
    static NAN_SETTER(SetVersionString);
    static NAN_SETTER(SetVersionSuffix);
    static NAN_SETTER(SetConnectionClass);
    static NAN_SETTER(SetEdition);
    static NAN_SETTER(SetExternalAuth);
    static NAN_SETTER(SetFetchArraySize);
    static NAN_SETTER(SetFetchAsString);
    static NAN_SETTER(SetFetchAsBuffer);
    static NAN_SETTER(SetLobPrefetchSize);
    static NAN_SETTER(SetOracleClientVersion);
    static NAN_SETTER(SetOracleClientVersionString);
    static NAN_SETTER(SetPoolPingInterval);
    static NAN_SETTER(SetEvents);

    njsOracledb();
    ~njsOracledb() {
        jsFetchAsStringTypes.Reset();
        jsFetchAsBufferTypes.Reset();
    }
    uint32_t outFormat;
    bool autoCommit;
    bool extendedMetaData;
    bool events;
    uint32_t maxRows;

    uint32_t stmtCacheSize;
    uint32_t fetchArraySize;

    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolIncrement;
    uint32_t poolTimeout;

    std::string connClass;
    std::string edition;
    bool externalAuth;
    Nan::Persistent<Array> jsFetchAsStringTypes;
    Nan::Persistent<Array> jsFetchAsBufferTypes;
    uint32_t lobPrefetchSize;
    unsigned int oraClientVer;
    int32_t poolPingInterval;

    static Nan::Persistent<FunctionTemplate> oracledbTemplate_s;
    static dpiContext *globalDPIContext;

};

#endif                                               /* __NJSORACLE_H__ */

