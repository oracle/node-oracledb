// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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
//   njsSodaDocCursor.c
//
// DESCRIPTION
//   SodaDocCursor class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsSodaDocCursor_close);
static NJS_NAPI_METHOD(njsSodaDocCursor_getNext);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaDocCursor_closeAsync);
static NJS_ASYNC_METHOD(njsSodaDocCursor_getNextAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaDocCursor_getNextPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsSodaDocCursor_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_close", NULL, njsSodaDocCursor_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getNext", NULL, njsSodaDocCursor_getNext, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaDocCursor = {
    "SodaDocCursor", sizeof(njsSodaDocCursor), njsSodaDocCursor_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsSodaDocCursor_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);


//-----------------------------------------------------------------------------
// njsSodaDocCursor_close()
//   Close the cursor.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsSodaDocCursor_close(napi_env env, napi_callback_info info)
{
    njsSodaDocCursor *cursor;
    njsBaton *baton;

    if (!njsSodaDocCursor_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    cursor = (njsSodaDocCursor*) baton->callingInstance;
    baton->dpiSodaDocCursorHandle = cursor->handle;
    cursor->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsSodaDocCursor_closeAsync,
            NULL);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_closeAsync()
//   Worker function for njsSodaDocCursor_close().
//-----------------------------------------------------------------------------
static bool njsSodaDocCursor_closeAsync(njsBaton *baton)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) baton->callingInstance;

    if (dpiSodaDocCursor_close(baton->dpiSodaDocCursorHandle) < 0) {
        njsBaton_setErrorDPI(baton);
        cursor->handle = baton->dpiSodaDocCursorHandle;
        baton->dpiSodaDocCursorHandle = NULL;
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
static bool njsSodaDocCursor_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsSodaDocCursor *cursor;
    njsBaton *tempBaton;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    cursor = (njsSodaDocCursor*) tempBaton->callingInstance;
    if (!cursor->handle) {
        njsBaton_setError(tempBaton, errInvalidSodaDocCursor);
        njsBaton_reportError(tempBaton, env);
        return false;
    }
    tempBaton->oracleDb = cursor->oracleDb;

    *baton = tempBaton;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_finalize()
//   Invoked when the njsSodaDocCursor object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSodaDocCursor_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) finalizeData;

    if (cursor->handle) {
        dpiSodaDocCursor_release(cursor->handle);
        cursor->handle = NULL;
    }
    free(cursor);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_getNext()
//   Gets the next document from the cursor.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsSodaDocCursor_getNext(napi_env env,
        napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaDocCursor_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "GetNext",
            njsSodaDocCursor_getNextAsync, njsSodaDocCursor_getNextPostAsync);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_getNextAsync()
//   Worker function for njsSodaDocCursor_getNext().
//-----------------------------------------------------------------------------
static bool njsSodaDocCursor_getNextAsync(njsBaton *baton)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) baton->callingInstance;

    if (dpiSodaDocCursor_getNext(cursor->handle, DPI_SODA_FLAGS_DEFAULT,
            &baton->dpiSodaDocHandle) < 0 )
        return njsBaton_setErrorDPI(baton);
    return true;
}



//-----------------------------------------------------------------------------
// njsSodaDocCursor_getNextPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaDocCursor_getNextPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    if (baton->dpiSodaDocHandle && !njsSodaDocument_createFromHandle(env,
            baton->dpiSodaDocHandle, baton->oracleDb, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor_newFromBaton()
//   Called when a SODA document cursor is being created from the baton.
//-----------------------------------------------------------------------------
bool njsSodaDocCursor_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *cursorObj)
{
    napi_value callingObj;
    njsSodaDocCursor *cursor;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaDocCursor,
            baton->oracleDb->jsSodaDocCursorConstructor, cursorObj,
            (njsBaseInstance**) &cursor))
        return false;

    // storing reference to operation which in turn stores reference to
    // connection which is needed to serialize SodaDocCursor object methods
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *cursorObj, "_operation",
            callingObj))

    // perform initializations
    cursor->handle = baton->dpiSodaDocCursorHandle;
    baton->dpiSodaDocCursorHandle = NULL;
    cursor->oracleDb = baton->oracleDb;

    return true;
}
