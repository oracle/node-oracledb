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
 *   njsOracle.cpp
 *
 * DESCRIPTION
 *   Oracledb class implementation.
 *
 *****************************************************************************/

#include "node.h"

#include "njsOracle.h"
#include "njsConnection.h"
#include "njsPool.h"
#include "njsResultSet.h"
#include "njsMessages.h"
#include "njsIntLob.h"
#include <sstream>

// peristent Oracledb class handle
Nan::Persistent<FunctionTemplate> njsOracledb::oracledbTemplate_s;

// DPI context
dpiContext *njsOracledb::globalDPIContext = NULL;


//-----------------------------------------------------------------------------
// njsOracledb::njsOracledb()
//   Constructor.
//-----------------------------------------------------------------------------
njsOracledb::njsOracledb()
{
    outFormat               = NJS_ROWS_ARRAY;
    maxRows                 = NJS_MAX_ROWS;
    autoCommit              = false;
    extendedMetaData        = false;
    stmtCacheSize           = NJS_STMT_CACHE_SIZE;
    poolMax                 = NJS_POOL_MAX;
    poolMin                 = NJS_POOL_MIN;
    poolIncrement           = NJS_POOL_INCR;
    poolTimeout             = NJS_POOL_TIMEOUT;
    fetchArraySize          = DPI_DEFAULT_FETCH_ARRAY_SIZE;
    connClass               = "";
    edition                 = "";
    externalAuth            = false;
    lobPrefetchSize         = NJS_LOB_PREFETCH_SIZE;
    poolPingInterval        = NJS_POOL_DEFAULT_PING_INTERVAL;
    oraClientVer            = 0;
    events                  = false;
}


//-----------------------------------------------------------------------------
// njsOracledb::Init()
//   Initialization function. Maps functions and properties from JS to C++.
//-----------------------------------------------------------------------------
void njsOracledb::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    dpiErrorInfo errorInfo;

    // create DPI context
    if (dpiContext_create(DPI_MAJOR_VERSION, DPI_MINOR_VERSION,
            &globalDPIContext, &errorInfo) < 0) {
        Nan::ThrowError(errorInfo.message);
        return;
    }

    Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);
    temp->InstanceTemplate()->SetInternalFieldCount(1);
    temp->SetClassName(Nan::New<v8::String>("Oracledb").ToLocalChecked());

    Nan::SetPrototypeMethod(temp, "getConnection", GetConnection);
    Nan::SetPrototypeMethod(temp, "createPool", CreatePool);

    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolMax").ToLocalChecked(),
            njsOracledb::GetPoolMax, njsOracledb::SetPoolMax);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolMin").ToLocalChecked(),
            njsOracledb::GetPoolMin, njsOracledb::SetPoolMin);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolIncrement").ToLocalChecked(),
            njsOracledb::GetPoolIncrement, njsOracledb::SetPoolIncrement);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolTimeout").ToLocalChecked(),
            njsOracledb::GetPoolTimeout, njsOracledb::SetPoolTimeout);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("stmtCacheSize").ToLocalChecked(),
            njsOracledb::GetStmtCacheSize, njsOracledb::SetStmtCacheSize);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("fetchArraySize").ToLocalChecked(),
            njsOracledb::GetFetchArraySize, njsOracledb::SetFetchArraySize);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("autoCommit").ToLocalChecked(),
            njsOracledb::GetAutoCommit, njsOracledb::SetAutoCommit);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("extendedMetaData").ToLocalChecked(),
            njsOracledb::GetExtendedMetaData,
            njsOracledb::SetExtendedMetaData);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("maxRows").ToLocalChecked(),
            njsOracledb::GetMaxRows, njsOracledb::SetMaxRows);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("outFormat").ToLocalChecked(),
            njsOracledb::GetOutFormat, njsOracledb::SetOutFormat);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("version").ToLocalChecked(),
            njsOracledb::GetVersion, njsOracledb::SetVersion);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("versionString").ToLocalChecked(),
            njsOracledb::GetVersionString, njsOracledb::SetVersionString);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("versionSuffix").ToLocalChecked(),
            njsOracledb::GetVersionSuffix, njsOracledb::SetVersionSuffix);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("connectionClass").ToLocalChecked(),
            njsOracledb::GetConnectionClass, njsOracledb::SetConnectionClass);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("edition").ToLocalChecked(),
            njsOracledb::GetEdition, njsOracledb::SetEdition);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("externalAuth").ToLocalChecked(),
            njsOracledb::GetExternalAuth, njsOracledb::SetExternalAuth);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("fetchAsString").ToLocalChecked(),
            njsOracledb::GetFetchAsString, njsOracledb::SetFetchAsString);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("fetchAsBuffer").ToLocalChecked(),
            njsOracledb::GetFetchAsBuffer, njsOracledb::SetFetchAsBuffer);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("lobPrefetchSize").ToLocalChecked(),
            njsOracledb::GetLobPrefetchSize, njsOracledb::SetLobPrefetchSize);
    Nan::SetAccessor(temp->InstanceTemplate (),
            Nan::New<v8::String>("oracleClientVersion").ToLocalChecked(),
            njsOracledb::GetOracleClientVersion,
            njsOracledb::SetOracleClientVersion);
    Nan::SetAccessor(temp->InstanceTemplate (),
            Nan::New<v8::String>("oracleClientVersionString").ToLocalChecked(),
            njsOracledb::GetOracleClientVersionString,
            njsOracledb::SetOracleClientVersionString);
    Nan::SetAccessor(temp->InstanceTemplate (),
            Nan::New<v8::String>("poolPingInterval").ToLocalChecked(),
            njsOracledb::GetPoolPingInterval,
            njsOracledb::SetPoolPingInterval);
    Nan::SetAccessor(temp->InstanceTemplate (),
            Nan::New<v8::String>("events").ToLocalChecked(),
            njsOracledb::GetEvents, njsOracledb::SetEvents);

    oracledbTemplate_s.Reset(temp);
    Nan::Set(target, Nan::New<v8::String>("Oracledb").ToLocalChecked(),
            temp->GetFunction());
}


//-----------------------------------------------------------------------------
// njsOracledb::New()
//   Invoked when new of oracledb is called from JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsOracledb::New)
{
    dpiVersionInfo versionInfo;

    if (dpiContext_getClientVersion(globalDPIContext, &versionInfo) < 0) {
        ThrowDPIError();
        return;
    }
    njsOracledb *oracledb = new njsOracledb();
    oracledb->oraClientVer = static_cast<unsigned int> (
                             100000000 * versionInfo.versionNum     +
                               1000000 * versionInfo.releaseNum     +
                                 10000 * versionInfo.updateNum      +
                                   100 * versionInfo.portReleaseNum +
                                         versionInfo.portUpdateNum  );
    oracledb->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsOracledb::InitCommonCreateParams()
//   Initialize common creation parameters for pools and standalone
// connection creation.
//-----------------------------------------------------------------------------
bool njsOracledb::InitCommonCreateParams(njsBaton *baton,
        dpiCommonCreateParams *params)
{
    if (dpiContext_initCommonCreateParams(globalDPIContext, params) < 0) {
        baton->GetDPIError();
        return false;
    }
    params->createMode = DPI_MODE_CREATE_THREADED;
    if (baton->events)
        params->createMode = (dpiCreateMode)
                ((int) params->createMode | DPI_MODE_CREATE_EVENTS);
    params->encoding = "UTF-8";
    params->nencoding = "UTF-8";
    params->driverName = NJS_DRIVER_NAME;
    params->driverNameLength = (uint32_t) strlen(params->driverName);
    return true;
}


//-----------------------------------------------------------------------------
// njsOracledb::GetPoolMin()
//   Get accessor of "poolMin" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetPoolMin)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->poolMin);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetPoolMin()
//   Set accessor of "poolMin" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetPoolMin)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->poolMin, "poolMin");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetPoolMax()
//   Get accessor of "poolMax" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetPoolMax)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->poolMax);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetPoolMax()
//   Set accessor of "poolMax" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetPoolMax)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->poolMax, "poolMax");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetPoolIncrement()
//   Get accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetPoolIncrement)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->poolIncrement);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetPoolIncrement()
//   Set accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetPoolIncrement)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->poolIncrement,
                "poolIncrement");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetPoolPingInterval()
//   Get accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetPoolPingInterval)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->poolPingInterval);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetPoolPingInterval()
//   Set accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetPoolPingInterval)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropInt(value, &oracledb->poolPingInterval,
                "poolPingInterval");
}



//-----------------------------------------------------------------------------
// njsOracledb::GetPoolTimeout()
//   Get accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetPoolTimeout)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->poolTimeout);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetPoolTimeout()
//   Set accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetPoolTimeout)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->poolTimeout,
                "poolTimeout");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetMaxRows()
//   Get accessor of "maxRows" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetMaxRows)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->maxRows);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetMaxRows()
//   Set accessor of "maxRows" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetMaxRows)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->maxRows, "maxRows");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetOUtFormat()
//   Get accessor of "outFormat" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetOutFormat)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->outFormat);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetOUtFormat()
//   Set accessor of "outFormat" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetOutFormat)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->outFormat, "outFormat");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetStmtCacheSize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->stmtCacheSize);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetStmtCacheSize()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetStmtCacheSize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->stmtCacheSize,
                "stmtCacheSize");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetFetchArraySize()
//   Get accessor of "fetchArraySize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetFetchArraySize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->fetchArraySize);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetFetchArraySize()
//   Set accessor of "fetchArraySize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetFetchArraySize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropPositiveInt(value, &oracledb->fetchArraySize,
                "fetchArraySize");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetAutoCommit()
//   Get accessor of "autoCommit" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetAutoCommit)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->autoCommit);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetAutoCommit()
//   Set accessor of "autoCommit" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetAutoCommit)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropBool(value, &oracledb->autoCommit, "autoCommit");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetExtendedMetaData()
//   Get accessor of "extendedMetaData" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetExtendedMetaData)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->extendedMetaData);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetExtendedMetaData()
//   Set accessor of "extendedMetaData" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetExtendedMetaData)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropBool ( value, &oracledb->extendedMetaData,
                            "extendedMetaData" ) ;
}


//-----------------------------------------------------------------------------
// njsOracledb::GetVersion()
//   Get accessor of "version" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetVersion)
{
    info.GetReturnValue().Set(NJS_NODE_ORACLEDB_VERSION);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetVersion()
//   Set accessor of "version" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetVersion)
{
    PropertyIsReadOnly("version");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetVersionString()
//   Get accessor of "versionString" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetVersionString)
{
    Local<String> value =
            Nan::New<v8::String>(NJS_VERSION_STRING).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetVersionString()
//   Set accessor of "versionString" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetVersionString)
{
    PropertyIsReadOnly("versionString");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetVersionSuffix()
//   Get accessor of "versionSuffix" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetVersionSuffix)
{
    Local<String> value =
#ifdef NJS_NODE_ORACLEDB_SUFFIX
            Nan::New<v8::String>(NJS_NODE_ORACLEDB_SUFFIX).ToLocalChecked();
#else
            Nan::Undefined();
#endif
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetVersionSuffix()
//   Set accessor of "versionSuffix" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetVersionSuffix)
{
    PropertyIsReadOnly("versionSuffix");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetConnectionClass()
//   Get accessor of "connectionClass" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetConnectionClass)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (!oracledb)
        return;
    Local<String> value =
            Nan::New<v8::String>(oracledb->connClass).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetConnectionClass()
//   Set accessor of "connectionClass" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetConnectionClass)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropString(value, &oracledb->connClass,
                "connectionClass");
}

//-----------------------------------------------------------------------------
// njsOracledb::GetEdition()
//   Get accessor of "edition" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetEdition)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (!oracledb)
        return;
    Local<String> value =
            Nan::New<v8::String>(oracledb->edition).ToLocalChecked();
    info.GetReturnValue().Set(value);
}

//-----------------------------------------------------------------------------
// njsOracledb::SetEdition()
//   Set accessor of "edition" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetEdition)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropString(value, &oracledb->edition,
                "edition");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetExternalAuth()
//   Get accessor of "externalAuth" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetExternalAuth)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->externalAuth);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetExternalAuth()
//   Set accessor of "externalAuth" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetExternalAuth)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropBool(value, &oracledb->externalAuth, "externalAuth" );
}


//-----------------------------------------------------------------------------
// njsOracledb::GetLobPrefetchSize()
//   Get accessor of "lobPrefetchSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetLobPrefetchSize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->lobPrefetchSize);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetLobPrefetchSize()
//   Set accessor of "lobPrefetchSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetLobPrefetchSize)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropUnsignedInt(value, &oracledb->lobPrefetchSize,
                "lobPrefetchSize");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetFetchAsString()
//   Get accessor of "fetchAsString" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetFetchAsString)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb) {
        Local<Value> val = Nan::New(oracledb->jsFetchAsStringTypes);
        if (val.IsEmpty())
            val = Nan::New<Array>(0);
        info.GetReturnValue().Set(val);
    }
}


//-----------------------------------------------------------------------------
// njsOracledb::SetFetchAsString()
//   Set accessor of "fetchAsString" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetFetchAsString)
{
    string errMsg;

    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (!oracledb)
        return;

    // make sure we have an array
    if (!value->IsArray()) {
        errMsg = njsMessages::Get(errInvalidPropertyValue, "fetchAsString");
        Nan::ThrowError(errMsg.c_str());
        return;
    }

    // validate values in array
    Local<Array> array = value.As<Array>();
    for (uint32_t i = 0; i < array->Length(); i++) {
        int32_t dataType = Nan::To<int32_t>
                           (Nan::Get(array,
                             i).ToLocalChecked().As<Integer>()).FromJust();
        njsDataType type = static_cast<njsDataType>(dataType);
        switch (type) {
            case NJS_DATATYPE_NUM:
            case NJS_DATATYPE_DATE:
            case NJS_DATATYPE_CLOB:
                break;
            default:
                errMsg = njsMessages::Get(errInvalidTypeForConversion);
                Nan::ThrowError(errMsg.c_str());
                return;
        }
    }

    // retain value
    oracledb->jsFetchAsStringTypes.Reset(array);
}


//-----------------------------------------------------------------------------
// njsOracledb::GetFetchAsBuffer()
//   Get accessor of "fetchAsBuffer" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetFetchAsBuffer)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb) {
        Local<Value> val = Nan::New(oracledb->jsFetchAsBufferTypes);
        if (val.IsEmpty())
            val = Nan::New<Array>(0);
        info.GetReturnValue().Set(val);
    }
}


//-----------------------------------------------------------------------------
// njsOracledb::SetFetchAsBuffer()
//   Set accessor of "fetchAsBuffer" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetFetchAsBuffer)
{
    string errMsg;

    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (!oracledb)
        return;

    // make sure we have an array
    if (!value->IsArray()) {
        errMsg = njsMessages::Get(errInvalidPropertyValue, "fetchAsBuffer");
        Nan::ThrowError(errMsg.c_str());
        return;
    }

    // validate values in array
    Local<Array> array = value.As<Array>();
    for (uint32_t i = 0; i < array->Length(); i++) {
        int32_t dataType = Nan::To<int32_t>(
                             Nan::Get(array, i).
                               ToLocalChecked().As<v8::Integer>()).FromJust();
        njsDataType type = static_cast<njsDataType>(dataType);

        if (type != NJS_DATATYPE_BLOB) {
            errMsg = njsMessages::Get(errInvalidTypeForConversion);
            Nan::ThrowError(errMsg.c_str());
            return;
        }
    }

    // retain value
    oracledb->jsFetchAsBufferTypes.Reset(array);
}


//-----------------------------------------------------------------------------
// njsOracledb::GetOracleClientVersion()
//   Get accessor of "oracleClientVersion" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetOracleClientVersion)
{
    dpiVersionInfo versionInfo;
    unsigned int version;

    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (!oracledb)
        return;

    if (dpiContext_getClientVersion(globalDPIContext, &versionInfo) < 0) {
        ThrowDPIError();
        return;
    }

    version = static_cast <unsigned int> (
              100000000 * versionInfo.versionNum     +
                1000000 * versionInfo.releaseNum     +
                  10000 * versionInfo.updateNum      +
                    100 * versionInfo.portReleaseNum +
                          versionInfo.portUpdateNum );

    info.GetReturnValue().Set(version);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetOracleClientVersion()
//   Set accessor of "oracleClientVersion" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetOracleClientVersion)
{
    PropertyIsReadOnly("oracleClientVersion");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetOracleClientVersionString()
//   Get accessor of "oracleClientVersionString" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetOracleClientVersionString)
{
    dpiVersionInfo versionInfo;
    char versionString[40];
    Local<String> value;

    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (!oracledb)
        return;

    if (dpiContext_getClientVersion(globalDPIContext, &versionInfo) < 0) {
        ThrowDPIError();
        return;
    }

    (void) sprintf(versionString, "%d.%d.%d.%d.%d", versionInfo.versionNum,
            versionInfo.releaseNum, versionInfo.updateNum,
            versionInfo.portReleaseNum, versionInfo.portUpdateNum);
    value = Nan::New<v8::String>(versionString).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetOracleClientVersionString()
//   Set accessor of "oracleClientVersionString" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetOracleClientVersionString)
{
    PropertyIsReadOnly("oracleClientVersionString");
}


// njsOracledb::GetEvents()
//   Get accessor of "events" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsOracledb::GetEvents)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateGetter(info);
    if (oracledb)
        info.GetReturnValue().Set(oracledb->events);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetEvents()
//   Set accessor of "events" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsOracledb::SetEvents)
{
    njsOracledb *oracledb = (njsOracledb*) ValidateSetter(info);
    if (oracledb)
        oracledb->SetPropBool(value, &oracledb->events, "events");
}


//-----------------------------------------------------------------------------
// njsOracledb::GetConnection()
//   Establishes a standalone connection to the database using the parameters
// specified in an asynchronous fashion, calling the JS callback when complete.
//
// PARAMETERS
//   - Connection attributes as JSON object
//   - JS callback which will receive (error, connection)
//-----------------------------------------------------------------------------
NAN_METHOD(njsOracledb::GetConnection)
{
    Local<Object> connProps;
    njsOracledb *oracledb;
    njsBaton *baton;

    oracledb = (njsOracledb*) ValidateArgs(info, 2, 2);
    if (!oracledb)
        return;
    if (!oracledb->GetObjectArg(info, 0, connProps))
        return;
    baton = oracledb->CreateBaton(info);
    if (!baton)
        return;
    baton->jsOracledb.Reset(info.Holder());

    baton->GetStringFromJSON(connProps, "user", 0, baton->user);
    baton->GetStringFromJSON(connProps, "password", 0, baton->password);
    baton->GetStringFromJSON(connProps, "connectString", 0,
            baton->connectString);
    baton->GetStringFromJSON(connProps, "newPassword", 0, baton->newPassword);
    baton->connClass = oracledb->connClass;
    baton->edition = oracledb->edition;
    baton->stmtCacheSize  = oracledb->stmtCacheSize;
    baton->externalAuth = oracledb->externalAuth;
    baton->events = oracledb->events;
    baton->GetStringFromJSON(connProps, "edition", 0, baton->edition);
    baton->GetUnsignedIntFromJSON(connProps, "stmtCacheSize", 0,
            &baton->stmtCacheSize);
    baton->GetUnsignedIntFromJSON(connProps, "privilege", 0,
            &baton->privilege);
    baton->GetBoolFromJSON(connProps, "externalAuth", 0, &baton->externalAuth);
    baton->GetBoolFromJSON(connProps, "events", 0, &baton->events);
    baton->lobPrefetchSize = oracledb->lobPrefetchSize;

    baton->QueueWork("GetConnection", Async_GetConnection,
            Async_AfterGetConnection, 2);
}


//-----------------------------------------------------------------------------
// njsOracledb::Async_GetConnection()
//   Worker function for GetConnection() performed on thread. This establishes
// the connection using the information found in the baton.
//-----------------------------------------------------------------------------
void njsOracledb::Async_GetConnection(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiConnCreateParams params;

    if (dpiContext_initConnCreateParams(globalDPIContext, &params) < 0) {
        baton->GetDPIError();
        return;
    }
    if (baton->privilege)
        params.authMode = (dpiAuthMode) baton->privilege;
    params.externalAuth = baton->externalAuth;
    if (!baton->connClass.empty()) {
        params.connectionClass = baton->connClass.c_str();
        params.connectionClassLength = baton->connClass.length();
    }

    if(!baton->newPassword.empty()) {
        params.newPassword = baton->newPassword.c_str();
        params.newPasswordLength = baton->newPassword.length();
    }
    if (!InitCommonCreateParams(baton, &commonParams))
        return;
    if (!baton->edition.empty()) {
        commonParams.edition = baton->edition.c_str();
        commonParams.editionLength = baton->edition.length();
    }

    if (dpiConn_create(globalDPIContext, baton->user.c_str(),
            (uint32_t) baton->user.length(), baton->password.c_str(),
            (uint32_t) baton->password.length(), baton->connectString.c_str(),
            (uint32_t) baton->connectString.length(), &commonParams, &params,
            &baton->dpiConnHandle) < 0)
        baton->GetDPIError();
    else if (dpiConn_setStmtCacheSize(baton->dpiConnHandle,
            baton->stmtCacheSize) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsOracledb::Async_AfterGetConnection()
//   Sets up the arguments for the callback to JS. The connection object is
// created and passed as the second argument. The first argument is always the
// error and at this point it is known that no error has taken place.
//-----------------------------------------------------------------------------
void njsOracledb::Async_AfterGetConnection(njsBaton *baton,
        Local<Value> argv[])
{
    argv[1] = njsConnection::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsOracledb::CreatePool()
//   Creates a session pool using the parameters specified in an asynchronous
// fashion, calling the JS callback when complete.
//
// PARAMETERS
//   - Pool attributes as JSON object
//   - JS callback which will receive (error, pool)
//-----------------------------------------------------------------------------
NAN_METHOD(njsOracledb::CreatePool)
{
    Local<Object> poolProps;
    njsOracledb *oracledb;
    njsBaton *baton;

    oracledb = (njsOracledb*) ValidateArgs(info, 2, 2);
    if (!oracledb)
        return;
    if (!oracledb->GetObjectArg(info, 0, poolProps))
        return;
    baton = oracledb->CreateBaton(info);
    if (!baton)
        return;

    baton->GetStringFromJSON(poolProps, "user", 0, baton->user);
    baton->GetStringFromJSON(poolProps, "password", 0, baton->password);
    baton->GetStringFromJSON(poolProps, "connectString", 0,
            baton->connectString);
    baton->poolMax =  oracledb->poolMax;
    baton->poolMin =  oracledb->poolMin;
    baton->poolIncrement = oracledb->poolIncrement;
    baton->poolTimeout = oracledb->poolTimeout;
    baton->poolPingInterval = oracledb->poolPingInterval;
    baton->stmtCacheSize = oracledb->stmtCacheSize;
    baton->externalAuth = oracledb->externalAuth;
    baton->edition = oracledb->edition;
    baton->events = oracledb->events;
    baton->GetUnsignedIntFromJSON(poolProps, "poolMax", 0, &baton->poolMax);
    baton->GetUnsignedIntFromJSON(poolProps, "poolMin", 0, &baton->poolMin);
    baton->GetUnsignedIntFromJSON(poolProps, "poolIncrement", 0,
            &baton->poolIncrement);
    baton->GetUnsignedIntFromJSON(poolProps, "poolTimeout", 0,
            &baton->poolTimeout);
    baton->GetUnsignedIntFromJSON(poolProps, "stmtCacheSize", 0,
            &baton->stmtCacheSize);
    baton->GetIntFromJSON(poolProps, "poolPingInterval", 0,
            &baton->poolPingInterval);
    baton->GetBoolFromJSON(poolProps, "externalAuth", 0, &baton->externalAuth);
    baton->GetBoolFromJSON(poolProps, "events", 0, &baton->events);
    baton->GetStringFromJSON(poolProps, "edition", 0, baton->edition);
    baton->lobPrefetchSize = oracledb->lobPrefetchSize;
    baton->jsOracledb.Reset(info.Holder());

    baton->QueueWork("CreatePool", Async_CreatePool, Async_AfterCreatePool, 2);
}


//-----------------------------------------------------------------------------
// njsOracledb::Async_CreatePool()
//   Worker function for GetConnection() performed on thread. This establishes
// the connection using the information found in the baton.
//-----------------------------------------------------------------------------
void njsOracledb::Async_CreatePool(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiPoolCreateParams params;

    if (dpiContext_initPoolCreateParams(globalDPIContext, &params) < 0) {
        baton->GetDPIError();
        return;
    }
    params.minSessions = baton->poolMin;
    params.maxSessions = baton->poolMax;
    params.sessionIncrement = baton->poolIncrement;
    params.externalAuth = baton->externalAuth;
    if (params.externalAuth)
        params.homogeneous = 0;
    params.pingInterval = baton->poolPingInterval;
    if (!InitCommonCreateParams(baton, &commonParams))
        return;
    if (!baton->edition.empty()) {
        commonParams.edition = baton->edition.c_str();
        commonParams.editionLength = baton->edition.length();
    }
    if (dpiPool_create(globalDPIContext, baton->user.c_str(),
            (uint32_t) baton->user.length(), baton->password.c_str(),
            (uint32_t) baton->password.length(), baton->connectString.c_str(),
            (uint32_t) baton->connectString.length(), &commonParams, &params,
            &baton->dpiPoolHandle) < 0)
        baton->GetDPIError();
    else if (dpiPool_setTimeout(baton->dpiPoolHandle, baton->poolTimeout) < 0)
        baton->GetDPIError();
    else if (dpiPool_setStmtCacheSize(baton->dpiPoolHandle,
            baton->stmtCacheSize) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsOracledb::Async_AfterCreatePool()
//   Sets up the arguments for the callback to JS. The pool object is created
// and passed as the second argument. The first argument is always the
// error and at this point it is known that no error has taken place.
//-----------------------------------------------------------------------------
void njsOracledb::Async_AfterCreatePool(njsBaton *baton, Local<Value> argv[])
{
    argv[1] = njsPool::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsOracledb::SetFetchAsStringTypesOnBaton()
//   Store information about the fetch as string types from the oracledb
// module. Note that these are copied since the value may change after this
// code has completed.
//-----------------------------------------------------------------------------
void njsOracledb::SetFetchAsStringTypesOnBaton(njsBaton *baton) const
{
    Nan::HandleScope scope;

    Local<Array> array = Nan::New(jsFetchAsStringTypes);
    if (array.IsEmpty())
        return;
    baton->numFetchAsStringTypes = array->Length();
    baton->fetchAsStringTypes = new njsDataType[baton->numFetchAsStringTypes];
    for (uint32_t i = 0; i < baton->numFetchAsStringTypes; i++) {
      int32_t dataType = Nan::To<int32_t>(Nan::Get(array, i).
                           ToLocalChecked().As<v8::Integer>()).FromJust();
      baton->fetchAsStringTypes[i] = static_cast<njsDataType>(dataType);
    }
}


//-----------------------------------------------------------------------------
// njsOracledb::SetFetchAsBufferTypesOnBaton()
//   Store information about the fetch as buffer types from the oracledb
// module. Note that these are copied since the value may change after this
// code has completed.
//-----------------------------------------------------------------------------
void njsOracledb::SetFetchAsBufferTypesOnBaton(njsBaton *baton) const
{
    Nan::HandleScope scope;

    Local<Array> array = Nan::New(jsFetchAsBufferTypes);
    if (array.IsEmpty())
        return;
    baton->numFetchAsBufferTypes = array->Length();
    baton->fetchAsBufferTypes = new njsDataType[baton->numFetchAsBufferTypes];
    for (uint32_t i = 0; i < baton->numFetchAsBufferTypes; i++) {
    int32_t dataType = Nan::To<int32_t>(Nan::Get (array, i).
                         ToLocalChecked().As<v8::Integer>()).FromJust();
    baton->fetchAsBufferTypes[i] = static_cast<njsDataType>(dataType);
    }
}


//-----------------------------------------------------------------------------
// njsOracledb::ThrowDPIError()
//   Gets the error information from ODPI-C and throws an exception.
//-----------------------------------------------------------------------------
void njsOracledb::ThrowDPIError(void)
{
    dpiErrorInfo errorInfo;
    Local<Value> exception;
    Local<Object> errorObj;
    std::string errMsg;

    dpiContext_getError(globalDPIContext, &errorInfo);
    errMsg = std::string(errorInfo.message, errorInfo.messageLength);
    exception = Nan::Error(errMsg.c_str());
    errorObj = exception->ToObject();
    Nan::Set(errorObj, Nan::New<v8::String>("errorNum").ToLocalChecked(),
            Nan::New<v8::Number>(errorInfo.code));
    Nan::Set(errorObj, Nan::New<v8::String>("offset").ToLocalChecked(),
            Nan::New<v8::Number>(errorInfo.offset));
    Nan::ThrowError(exception);
}


//-----------------------------------------------------------------------------
// init()
//   Invoked when require on oracledb is called.
//-----------------------------------------------------------------------------
extern "C"
{
    static void init(Local<Object> target)
    {
        njsOracledb::Init(target);
        njsConnection::Init(target);
        njsPool::Init(target);
        njsResultSet::Init(target);
        njsILob::Init(target);
    }

    NODE_MODULE(oracledb, init)
}

