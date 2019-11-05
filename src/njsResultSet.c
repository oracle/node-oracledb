// Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved.

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
//   njsResultSet.c
//
// DESCRIPTION
//   ReseultSet class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsResultSet_close);
static NJS_NAPI_METHOD(njsResultSet_getRows);

// asynchronous methods
static NJS_ASYNC_METHOD(njsResultSet_closeAsync);
static NJS_ASYNC_METHOD(njsResultSet_getRowsAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsResultSet_getRowsPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsResultSet_getRowsProcessArgs);

// getters
static NJS_NAPI_GETTER(njsResultSet_getMetaData);

// finalize
static NJS_NAPI_FINALIZE(njsResultSet_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_close", NULL, njsResultSet_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getRows", NULL, njsResultSet_getRows, NULL, NULL, NULL,
            napi_default, NULL },
    { "metaData", NULL, NULL, njsResultSet_getMetaData, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefResultSet = {
    "ResultSet", sizeof(njsResultSet), njsResultSet_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsResultSet_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);
static bool njsResultSet_getRowsHelper(njsResultSet *rs, njsBaton *baton,
        bool *moreRows);


//-----------------------------------------------------------------------------
// njsResultSet_close()
//   Close the result set.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
static napi_value njsResultSet_close(napi_env env, napi_callback_info info)
{
    njsResultSet *rs;
    njsBaton *baton;

    if (!njsResultSet_createBaton(env, info, 1, NULL, &baton))
        return NULL;
    rs = (njsResultSet*) baton->callingInstance;
    baton->dpiStmtHandle = rs->handle;
    rs->handle = NULL;
    njsBaton_queueWork(baton, env, "Close", njsResultSet_closeAsync, NULL, 1);
    return NULL;
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

    baton->queryVars = rs->queryVars;
    baton->numQueryVars = rs->numQueryVars;
    rs->queryVars = NULL;
    rs->numQueryVars = 0;
    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsResultSet_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsBaton *tempBaton;
    njsResultSet *rs;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    rs = (njsResultSet*) tempBaton->callingInstance;
    if (!rs->handle || !rs->conn->handle) {
        njsBaton_setError(tempBaton, errInvalidResultSet);
        njsBaton_reportError(tempBaton, env);
        return false;
    }

    tempBaton->oracleDb = rs->conn->oracleDb;
    if (rs->activeBaton) {
        njsBaton_setError(tempBaton, errBusyResultSet);
        njsBaton_reportError(tempBaton, env);
        return false;
    }
    rs->activeBaton = tempBaton;

    *baton = tempBaton;
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
static napi_value njsResultSet_getMetaData(napi_env env,
        napi_callback_info info)
{
    napi_value metadata;
    njsResultSet *rs;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &rs))
        return NULL;
    if (!rs->handle || !rs->conn->handle)
        return NULL;
    if (!njsVariable_getMetadataMany(rs->queryVars, rs->numQueryVars,
            env, rs->extendedMetaData, &metadata))
        return NULL;
    return metadata;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRows()
//   Get a number of rows from the result set.
//
// PARAMETERS
//   - max number of rows to fetch at this time
//   - JS callback which will receive (error, rows)
//-----------------------------------------------------------------------------
static napi_value njsResultSet_getRows(napi_env env, napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsResultSet_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsResultSet_getRowsProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    njsBaton_queueWork(baton, env, "GetRows", njsResultSet_getRowsAsync,
            njsResultSet_getRowsPostAsync, 2);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsAsync()
//   Worker function for njsResultSet_getRows().
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsAsync(njsBaton *baton)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;
    bool moreRows = false, ok;

    // result sets that should be auto closed are closed if the result set
    // is exhaused or the maximum number of rows has been fetched or an error
    // has taken place
    ok = njsResultSet_getRowsHelper(rs, baton, &moreRows);
    if ((!ok || !moreRows) && rs->autoClose) {
        dpiStmt_release(rs->handle);
        rs->handle = NULL;
    }

    return ok;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsPostAsync()
//   Generates return values for njsResultSet_getRows().
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsPostAsync(njsBaton *baton, napi_env env,
        napi_value *args)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;
    napi_value result, rowObj, colObj;
    uint32_t row, col, i;
    njsVariable *var;

    // create constructors used for various types that might be returned
    if (!njsBaton_setConstructors(baton, env, false))
        return false;

    // if outFormat is OBJECT, create names for each of the variables
    if (rs->outFormat == NJS_ROWS_OBJECT) {
        for (col = 0; col < rs->numQueryVars; col++) {
            var = &rs->queryVars[col];
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, var->name,
                    var->nameLength, &var->jsName))
        }
    }

    // create array
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->rowsFetched,
            &result))

    // process each row
    for (row = 0; row < baton->rowsFetched; row++) {

        // create row, either as an array or an object
        if (rs->outFormat == NJS_ROWS_ARRAY) {
            NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                    rs->numQueryVars, &rowObj))
        } else {
            NJS_CHECK_NAPI(env, napi_create_object(env, &rowObj))
        }

        // process each column
        for (col = 0; col < rs->numQueryVars; col++) {
            var = &rs->queryVars[col];
            if (!njsVariable_getScalarValue(var, var->buffer, row, baton,
                    env, &colObj))
                return false;
            if (rs->outFormat == NJS_ROWS_ARRAY) {
                NJS_CHECK_NAPI(env, napi_set_element(env, rowObj, col, colObj))
            } else {
                NJS_CHECK_NAPI(env, napi_set_property(env, rowObj, var->jsName,
                        colObj))
            }
        }
        NJS_CHECK_NAPI(env, napi_set_element(env, result, row, rowObj))

    }

    // clear variables if result set was closed
    if (!rs->handle) {
        for (i = 0; i < rs->numQueryVars; i++)
            njsVariable_free(&rs->queryVars[i]);
        free(rs->queryVars);
        rs->queryVars = NULL;
        rs->numQueryVars = 0;
    }

    args[1] = result;
    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsHelper()
//   Get rows from the result set and indicate if more rows are available to
// fetch or not.
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsHelper(njsResultSet *rs, njsBaton *baton,
        bool *moreRows)
{
    uint32_t i, numRowsToFetch;
    njsVariable *var;
    int tempMoreRows;

    // determine how many rows to fetch; use fetchArraySize unless it is less
    // than maxRows (no need to waste memory!)
    numRowsToFetch = baton->fetchArraySize;
    if (rs->maxRows > 0 && rs->maxRows < numRowsToFetch)
        numRowsToFetch = rs->maxRows;

    // create ODPI-C variables and define them, if necessary
    for (i = 0; i < rs->numQueryVars; i++) {
        var = &rs->queryVars[i];
        if (var->dpiVarHandle && var->maxArraySize >= numRowsToFetch)
            continue;
        if (var->dpiVarHandle) {
            if (dpiVar_release(var->dpiVarHandle) < 0)
                return njsBaton_setErrorDPI(baton);
            var->dpiVarHandle = NULL;
        }
        if (dpiConn_newVar(rs->conn->handle, var->varTypeNum,
                var->nativeTypeNum, numRowsToFetch, var->maxSize, 1, 0,
                var->dpiObjectTypeHandle, &var->dpiVarHandle,
                &var->buffer->dpiVarData) < 0)
            return njsBaton_setErrorDPI(baton);
        var->maxArraySize = numRowsToFetch;
        if (dpiStmt_define(rs->handle, i + 1, var->dpiVarHandle) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set fetch array size as requested
    if (dpiStmt_setFetchArraySize(rs->handle, numRowsToFetch) < 0)
        return njsBaton_setErrorDPI(baton);

    // perform fetch
    if (dpiStmt_fetchRows(rs->handle, numRowsToFetch, &baton->bufferRowIndex,
            &baton->rowsFetched, &tempMoreRows) < 0)
        return njsBaton_setErrorDPI(baton);
    *moreRows = (bool) tempMoreRows;

    // result sets that should be auto closed are closed if the result set
    // is exhaused or the maximum number of rows has been fetched
    if (*moreRows && rs->maxRows > 0) {
        if (baton->rowsFetched == rs->maxRows) {
            *moreRows = 0;
        } else {
            rs->maxRows -= baton->rowsFetched;
        }
    }
    return njsVariable_process(rs->queryVars, rs->numQueryVars,
            baton->rowsFetched, baton);
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->fetchArraySize))
        return false;
    if (baton->fetchArraySize == 0)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet_new()
//   Creates a new ResultSet object given the handle and variables that have
// been built previously. It as assumed that the calling instance is a
// connection.
//-----------------------------------------------------------------------------
bool njsResultSet_new(njsBaton *baton, napi_env env, dpiStmt *handle,
        njsVariable *vars, uint32_t numVars, bool autoClose, napi_value *rsObj)
{
    napi_value connObj;
    njsResultSet *rs;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefResultSet,
            baton->oracleDb->jsResultSetConstructor, rsObj,
            (njsBaseInstance**) &rs))
        return false;

    // store a reference to the connection to ensure that it is not garbage
    // collected during the lifetime of the result set
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObj,
            &connObj))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *rsObj, "_connection",
            connObj))

    // perform some initializations
    rs->handle = handle;
    rs->conn = (njsConnection*) baton->callingInstance;
    rs->numQueryVars = numVars;
    rs->queryVars = vars;
    rs->outFormat = baton->outFormat;
    rs->extendedMetaData = baton->extendedMetaData;
    if (autoClose) {
        rs->maxRows = baton->maxRows;
        rs->autoClose = true;
    }

    return true;
}
