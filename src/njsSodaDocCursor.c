// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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
//   njsSodaDocCursor.c
//
// DESCRIPTION
//   SodaDocCursor class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaDocCursor_close);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaDocCursor_getNext);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaDocCursor_closeAsync);
static NJS_ASYNC_METHOD(njsSodaDocCursor_getNextAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaDocCursor_getNextPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsSodaDocCursor_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "close", NULL, njsSodaDocCursor_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "getNext", NULL, njsSodaDocCursor_getNext, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaDocCursor = {
    "SodaDocCursorImpl", sizeof(njsSodaDocCursor), njsSodaDocCursor_finalize,
    njsClassProperties, false
};


//-----------------------------------------------------------------------------
// njsSodaDocCursor_close()
//   Close the cursor.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaDocCursor_close, 0, NULL)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) baton->callingInstance;

   if (!cursor->handle)
       return njsBaton_setError(baton, errInvalidSodaDocCursor);
    baton->dpiSodaDocCursorHandle = cursor->handle;
    cursor->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsSodaDocCursor_closeAsync,
            NULL, returnValue);
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
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaDocCursor_getNext, 0, NULL)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) baton->callingInstance;

    if (!cursor->handle)
        return njsBaton_setError(baton, errInvalidSodaDocCursor);
    return njsBaton_queueWork(baton, env, "GetNext",
            njsSodaDocCursor_getNextAsync, njsSodaDocCursor_getNextPostAsync,
            returnValue);
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
            baton->dpiSodaDocHandle, baton->globals, result))
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
            baton->globals->jsSodaDocCursorConstructor, cursorObj,
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

    return true;
}
