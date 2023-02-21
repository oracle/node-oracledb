// Copyright (c) 2015, 2022, Oracle and/or its affiliates.

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
//   njsResultSet.c
//
// DESCRIPTION
//   ReseultSet class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsResultSet_close);
NJS_NAPI_METHOD_DECL_SYNC(njsResultSet_getMetaData);
NJS_NAPI_METHOD_DECL_ASYNC(njsResultSet_getRows);

// asynchronous methods
static NJS_ASYNC_METHOD(njsResultSet_closeAsync);
static NJS_ASYNC_METHOD(njsResultSet_getRowsAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsResultSet_getRowsPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsResultSet_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "close", NULL, njsResultSet_close, NULL, NULL, NULL, napi_default,
            NULL },
    { "getMetaData", NULL, njsResultSet_getMetaData, NULL, NULL, NULL,
            napi_default, NULL },
    { "getRows", NULL, njsResultSet_getRows, NULL, NULL, NULL, napi_default,
            NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefResultSet = {
    "ResultSetImpl", sizeof(njsResultSet), njsResultSet_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsResultSet_check(njsResultSet *rs, njsBaton *baton);

//-----------------------------------------------------------------------------
// njsResultSet_check()
//   Checks the result set to ensure it is valid and then marks the current
// baton as the active one (to prevent concurrent access).
//-----------------------------------------------------------------------------
static bool njsResultSet_check(njsResultSet *rs, njsBaton *baton)
{
    if (!rs->handle || !rs->conn->handle)
        return njsBaton_setError(baton, errInvalidResultSet);
    rs->activeBaton = baton;
    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_close()
//   Close the result set.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsResultSet_close, 0, NULL)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;

    if (!njsResultSet_check(rs, baton))
        return false;
    baton->dpiStmtHandle = rs->handle;
    rs->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsResultSet_closeAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsResultSet_closeAsync()
//   Worker function for njsResultSet_close().
//-----------------------------------------------------------------------------
static bool njsResultSet_closeAsync(njsBaton *baton)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;

    if (dpiStmt_close(baton->dpiStmtHandle, NULL, 0) < 0) {
        njsBaton_setErrorDPI(baton);
        rs->handle = baton->dpiStmtHandle;
        baton->dpiStmtHandle = NULL;
        return false;
    }

    if (!rs->isNested) {
        baton->queryVars = rs->queryVars;
        baton->numQueryVars = rs->numQueryVars;
        rs->queryVars = NULL;
        rs->numQueryVars = 0;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_finalize()
//   Invoked when the njsResultSet object is garbage collected.
//-----------------------------------------------------------------------------
static void njsResultSet_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsResultSet *rs = (njsResultSet*) finalizeData;

    if (rs->handle) {
        dpiStmt_release(rs->handle);
        rs->handle = NULL;
    }
    free(rs);
}


//-----------------------------------------------------------------------------
// njsResultSet_getMetaData()
//   Get accessor of "metaData" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsResultSet_getMetaData, 0, NULL)
{
    njsResultSet *rs = (njsResultSet*) callingInstance;

    if (rs->handle && rs->conn->handle) {
        if (!njsVariable_getMetadataMany(rs->queryVars, rs->numQueryVars, env,
                returnValue))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRows()
//   Get a number of rows from the result set.
//
// PARAMETERS
//   - max number of rows to fetch at this time
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsResultSet_getRows, 1, NULL)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;

    if (!njsResultSet_check(rs, baton))
        return false;

    // copy items from the global settings class to the baton since they might
    // change after the asynchronous function begins
    if (!njsBaton_getGlobalSettings(baton, env,
            NJS_GLOBAL_ATTR_FETCH_AS_BUFFER,
            NJS_GLOBAL_ATTR_FETCH_AS_STRING,
            0))
        return false;

    // check options
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->fetchArraySize))
        return false;
    if (baton->fetchArraySize == 0)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);

    return njsBaton_queueWork(baton, env, "GetRows", njsResultSet_getRowsAsync,
            njsResultSet_getRowsPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsAsync()
//   Worker function for njsResultSet_getRows().
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsAsync(njsBaton *baton)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;
    njsVariable *var;
    int moreRows;
    uint32_t i;

    // create ODPI-C variables, if necessary
    for (i = 0; i < rs->numQueryVars; i++) {
        var = &rs->queryVars[i];
        if (var->dpiVarHandle && var->maxArraySize >= baton->fetchArraySize)
            continue;
        rs->varsDefined = false;
        if (var->dpiVarHandle) {
            if (dpiVar_release(var->dpiVarHandle) < 0)
                return njsBaton_setErrorDPI(baton);
            var->dpiVarHandle = NULL;
        }
        if (dpiConn_newVar(rs->conn->handle, var->varTypeNum,
                var->nativeTypeNum, baton->fetchArraySize, var->maxSize, 1, 0,
                var->dpiObjectTypeHandle, &var->dpiVarHandle,
                &var->buffer->dpiVarData) < 0)
            return njsBaton_setErrorDPI(baton);
        var->maxArraySize = baton->fetchArraySize;
    }

    // perform define, if necessary
    if (!rs->varsDefined) {
        for (i = 0; i < rs->numQueryVars; i++) {
            var = &rs->queryVars[i];
            if (dpiStmt_define(rs->handle, i + 1, var->dpiVarHandle) < 0)
                return njsBaton_setErrorDPI(baton);
        }
        rs->varsDefined = true;
    }

    // set fetch array size as requested
    if (dpiStmt_setFetchArraySize(rs->handle, baton->fetchArraySize) < 0)
        return njsBaton_setErrorDPI(baton);

    // perform fetch
    if (dpiStmt_fetchRows(rs->handle, baton->fetchArraySize,
            &baton->bufferRowIndex, &baton->rowsFetched, &moreRows) < 0)
        return njsBaton_setErrorDPI(baton);

    return njsVariable_process(rs->queryVars, rs->numQueryVars,
            baton->rowsFetched, baton);
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;
    napi_value rowObj, colObj;
    uint32_t row, col, i;
    njsVariable *var;

    // set JavaScript values to simplify creation of returned objects
    if (!njsBaton_setJsValues(baton, env))
        return false;

    // create array
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->rowsFetched,
            result))

    // process each row
    for (row = 0; row < baton->rowsFetched; row++) {

        // create row
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                rs->numQueryVars, &rowObj))

        // process each column
        for (col = 0; col < rs->numQueryVars; col++) {
            var = &rs->queryVars[col];
            if (!njsVariable_getScalarValue(var, rs->conn, var->buffer, row,
                    baton, env, &colObj))
                return false;
            NJS_CHECK_NAPI(env, napi_set_element(env, rowObj, col, colObj))
        }
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, row, rowObj))

    }

    // clear variables if result set was closed
    if (!rs->handle && !rs->isNested) {
        for (i = 0; i < rs->numQueryVars; i++)
            njsVariable_free(&rs->queryVars[i]);
        free(rs->queryVars);
        rs->queryVars = NULL;
        rs->numQueryVars = 0;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_new()
//   Creates a new ResultSet object given the handle and variables that have
// been built previously. It as assumed that the calling instance is a
// connection.
//-----------------------------------------------------------------------------
bool njsResultSet_new(njsBaton *baton, napi_env env, njsConnection *conn,
        dpiStmt *handle, njsVariable *vars, uint32_t numVars,
        napi_value *rsObj)
{
    napi_value callingObj;
    njsResultSet *rs;

    if (baton->outFormat == NJS_ROWS_OBJECT) {
        if (!njsResultSet_makeUniqueColumnNames (env, baton, vars, numVars))
            return false;
    }

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefResultSet,
            baton->globals->jsResultSetConstructor, rsObj,
            (njsBaseInstance**) &rs))
        return false;

    // store a reference to the parent object (a connection or a parent result
    // set) to ensure that it is not garbage collected during the lifetime of
    // the result set
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *rsObj, "_parentObj",
            callingObj))

    // perform some initializations
    rs->handle = handle;
    rs->conn = conn;
    rs->numQueryVars = numVars;
    rs->queryVars = vars;
    rs->fetchArraySize = baton->fetchArraySize;
    rs->isNested = (baton->callingInstance != (void*) conn);

    return true;
}
