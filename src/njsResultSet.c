// Copyright (c) 2015, 2022, Oracle and/or its affiliates.

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
static NJS_NAPI_GETTER(njsResultSet_getFetchArraySize);
static NJS_NAPI_GETTER(njsResultSet_getMetaData);
static NJS_NAPI_GETTER(njsResultSet_getNestedCursorIndices);

// finalize
static NJS_NAPI_FINALIZE(njsResultSet_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_close", NULL, njsResultSet_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getRows", NULL, njsResultSet_getRows, NULL, NULL, NULL,
            napi_default, NULL },
    { "_fetchArraySize", NULL, NULL, njsResultSet_getFetchArraySize, NULL,
            NULL, napi_default, NULL },
    { "_nestedCursorIndices", NULL, NULL, njsResultSet_getNestedCursorIndices,
            NULL, NULL, napi_default, NULL },
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
static bool njsResultSet_makeUniqueColumnNames(napi_env env, njsBaton *baton,
        njsVariable *queryVars, uint32_t numQueryVars);

//-----------------------------------------------------------------------------
// njsResultSet_close()
//   Close the result set.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsResultSet_close(napi_env env, napi_callback_info info)
{
    njsResultSet *rs;
    njsBaton *baton;

    if (!njsResultSet_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    rs = (njsResultSet*) baton->callingInstance;
    baton->dpiStmtHandle = rs->handle;
    rs->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsResultSet_closeAsync,
            NULL);
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
// njsResultSet_getFetchArraySize()
//   Get accessor of "_fetchArraySize" property.
//-----------------------------------------------------------------------------
static napi_value njsResultSet_getFetchArraySize(napi_env env,
        napi_callback_info info)
{
    njsResultSet *rs;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &rs))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, rs->fetchArraySize);
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
// njsResultSet_getNestedCursorIndices()
//   Get accessor of "_nestedCursorIndices" property.
//-----------------------------------------------------------------------------
static napi_value njsResultSet_getNestedCursorIndices(napi_env env,
        napi_callback_info info)
{
    napi_value indices;
    njsResultSet *rs;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &rs))
        return NULL;
    if (!rs->handle || !rs->conn->handle)
        return NULL;
    if (!njsVariable_getNestedCursorIndices(rs->queryVars, rs->numQueryVars,
            env, &indices))
        return NULL;
    return indices;
}


//-----------------------------------------------------------------------------
// njsResultSet_getRows()
//   Get a number of rows from the result set.
//
// PARAMETERS
//   - max number of rows to fetch at this time
//   - should the result set be closed after the fetch has completed?
//   - should the result set be closed after all rows have been fetched?
//-----------------------------------------------------------------------------
static napi_value njsResultSet_getRows(napi_env env, napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsResultSet_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsResultSet_getRowsProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetRows", njsResultSet_getRowsAsync,
            njsResultSet_getRowsPostAsync);
}


//-----------------------------------------------------------------------------
// njsResultSet_getRowsAsync()
//   Worker function for njsResultSet_getRows().
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsAsync(njsBaton *baton)
{
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;
    bool moreRows = false, ok;

    // after rows have been fetched, the JavaScript layer may have requested
    // that the result set be closed automatically; this occurs if all of the
    // rows are being fetched by the JavaScript library and one of the
    // following three situations occurs:
    //   (1) no further rows are available,
    //   (2) an error has taken place or
    //   (3) when a maximum number of rows has been specified and this fetch
    //       will either satisfy that request or not enough rows are available
    //       to satisfy that request
    ok = njsResultSet_getRowsHelper(rs, baton, &moreRows);
    if (baton->closeOnFetch ||
            ((!ok || !moreRows) && baton->closeOnAllRowsFetched)) {
        dpiStmt_release(rs->handle);
        rs->handle = NULL;
    }

    return ok;
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
            result))

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
            if (!njsVariable_getScalarValue(var, rs->conn, var->buffer, row,
                    baton, env, &colObj))
                return false;
            if (rs->outFormat == NJS_ROWS_ARRAY) {
                NJS_CHECK_NAPI(env, napi_set_element(env, rowObj, col, colObj))
            } else {
                NJS_CHECK_NAPI(env, napi_set_property(env, rowObj, var->jsName,
                        colObj))
            }
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
// njsResultSet_getRowsHelper()
//   Get rows from the result set and indicate if more rows are available to
// fetch or not.
//-----------------------------------------------------------------------------
static bool njsResultSet_getRowsHelper(njsResultSet *rs, njsBaton *baton,
        bool *moreRows)
{
    njsVariable *var;
    int tempMoreRows;
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
            &baton->bufferRowIndex, &baton->rowsFetched, &tempMoreRows) < 0)
        return njsBaton_setErrorDPI(baton);
    *moreRows = (bool) tempMoreRows;

    // result sets that should be auto closed are closed if the result set
    // is exhaused or the maximum number of rows has been fetched
    if (*moreRows && baton->maxRows > 0) {
        if (baton->rowsFetched == baton->maxRows) {
            *moreRows = 0;
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
    njsResultSet *rs = (njsResultSet*) baton->callingInstance;

    // copy arrays for fetch as buffer and fetch as RAW types
    if (!njsUtils_copyArray(env, baton->oracleDb->fetchAsBufferTypes,
            baton->oracleDb->numFetchAsBufferTypes, sizeof(uint32_t),
            (void**) &baton->fetchAsBufferTypes,
            &baton->numFetchAsBufferTypes))
        return false;
    if (!njsUtils_copyArray(env, baton->oracleDb->fetchAsStringTypes,
            baton->oracleDb->numFetchAsStringTypes, sizeof(uint32_t),
            (void**) &baton->fetchAsStringTypes,
            &baton->numFetchAsStringTypes))
        return false;

    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->fetchArraySize))
        return false;
    if (baton->fetchArraySize == 0)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);
    if (!njsUtils_getBoolArg(env, args, 1, &baton->closeOnFetch))
        return false;
    if (!njsUtils_getBoolArg(env, args, 2, &baton->closeOnAllRowsFetched))
        return false;
    baton->extendedMetaData = rs->extendedMetaData;
    baton->outFormat = rs->outFormat;

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
            baton->oracleDb->jsResultSetConstructor, rsObj,
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
    rs->outFormat = baton->outFormat;
    rs->extendedMetaData = baton->extendedMetaData;
    rs->fetchArraySize = baton->fetchArraySize;
    rs->outFormat = baton->outFormat;
    rs->isNested = (baton->callingInstance != (void*) conn);

    return true;
}


//----------------------------------------------------------------------------
// njsResultSet_makeUniqueColumnNames()
//  Check for duplicate column names, and append "_xx" to make names unique
//
// Parameters
//   env          - napi env variable
//   baton        - baton structure
//   queryVars    - njsVariables struct for Query SQLs
//   numQueryVars - number of Query Variables
//---------------------------------------------------------------------------
bool njsResultSet_makeUniqueColumnNames(napi_env env, njsBaton *baton,
        njsVariable *queryVars, uint32_t numQueryVars)
{
    char tempName[NJS_MAX_COL_NAME_BUFFER_LENGTH];
    uint32_t tempNum, col, index;
    napi_value tempObj, colObj;
    size_t tempNameLength;
    bool exists;

    // First loop creates a napi-object(hash table) with unique column name &
    // column number first appeared for later use.
    NJS_CHECK_NAPI(env, napi_create_object(env, &tempObj))
    for (col = 0; col < numQueryVars; col ++) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, queryVars[col].name,
                queryVars[col].nameLength, &queryVars[col].jsName))

        NJS_CHECK_NAPI(env, napi_has_own_property(env, tempObj,
                queryVars[col].jsName, &exists))
        if (!exists) {
            NJS_CHECK_NAPI(env, napi_create_uint32(env, col, &colObj))
            NJS_CHECK_NAPI(env, napi_set_property(env, tempObj,
                    queryVars[col].jsName, colObj))
        }
    }

    // Second loop looks for the current column name in the napi-object,
    // if exists and column number is different, (then it is duplicate),
    // tries to compose a name to resolve the duplicate name.
    // The composed name is also checked in the napi-object before updating
    // to make sure there are no conflicts.
    for (col = 0; col < numQueryVars; col ++) {
        NJS_CHECK_NAPI(env, napi_get_property(env, tempObj,
                queryVars[col].jsName, &colObj))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, colObj, &index))

        if (index != col) {
            exists = true;
            tempNum = 0;
            while (exists) {
                tempNameLength = (size_t) snprintf(tempName, sizeof (tempName),
                        "%.*s_%d", (int)queryVars[col].nameLength,
                        queryVars[col].name, ++tempNum);
                if (tempNameLength > (sizeof(tempName) - 1))
                    tempNameLength = sizeof(tempName) - 1;

                NJS_CHECK_NAPI(env, napi_create_string_utf8(env, tempName,
                        tempNameLength, &queryVars[col].jsName))
                NJS_CHECK_NAPI(env, napi_has_property(env, tempObj,
                        queryVars[col].jsName, &exists))
            }
            if (!njsUtils_copyStringFromJS(env, queryVars[col].jsName,
                    &queryVars[col].name, &queryVars[col].nameLength))
                return false;

            NJS_CHECK_NAPI(env, napi_create_uint32(env, col, &colObj))
            NJS_CHECK_NAPI(env, napi_set_property(env, tempObj,
                    queryVars[col].jsName, colObj))
        }
    }
    return true;
}
