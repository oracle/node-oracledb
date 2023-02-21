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
//   njsLob.c
//
// DESCRIPTION
//   Lob class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_close);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getChunkSize);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_getData);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getLength);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getPieceSize);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getType);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_read);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_setPieceSize);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_write);

// asynchronous methods
static NJS_ASYNC_METHOD(njsLob_closeAsync);
static NJS_ASYNC_METHOD(njsLob_getDataAsync);
static NJS_ASYNC_METHOD(njsLob_readAsync);
static NJS_ASYNC_METHOD(njsLob_writeAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsLob_getDataPostAsync);
static NJS_ASYNC_POST_METHOD(njsLob_readPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsLob_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "close", NULL, njsLob_close, NULL, NULL, NULL, napi_default, NULL },
    { "getChunkSize", NULL, njsLob_getChunkSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "getData", NULL, njsLob_getData, NULL, NULL, NULL, napi_default, NULL },
    { "getLength", NULL, njsLob_getLength, NULL, NULL, NULL, napi_default,
            NULL },
    { "getPieceSize", NULL, njsLob_getPieceSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "getType", NULL, njsLob_getType, NULL, NULL, NULL, napi_default, NULL },
    { "read", NULL, njsLob_read, NULL, NULL, NULL, napi_default, NULL },
    { "setPieceSize", NULL, njsLob_setPieceSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "write", NULL, njsLob_write, NULL, NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefLob = {
    "LobImpl", sizeof(njsLob), njsLob_finalize, njsClassProperties, false
};

// other methods used internally
static bool njsLob_check(njsLob *lob, njsBaton *baton);


//-----------------------------------------------------------------------------
// njsLob_check()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsLob_check(njsLob *lob, njsBaton *baton)
{
    if (!lob->handle)
        return njsBaton_setError(baton, errInvalidLob);
    lob->activeBaton = baton;
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_close()
//   Close the LOB.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_close, 0, NULL)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (!njsLob_check(lob, baton))
        return false;
    lob->activeBaton = NULL;
    baton->dpiLobHandle = lob->handle;
    lob->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsLob_closeAsync, NULL,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsLob_closeAsync()
//   Worker function for njsLob_close().
//-----------------------------------------------------------------------------
static bool njsLob_closeAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (dpiLob_close(baton->dpiLobHandle) < 0) {
        njsBaton_setErrorDPI(baton);
        lob->handle = baton->dpiLobHandle;
        baton->dpiLobHandle = NULL;
        return false;
    }
    return true;
}



//-----------------------------------------------------------------------------
// njsLob_finalize()
//   Invoked when the njsLob object is garbage collected.
//-----------------------------------------------------------------------------
static void njsLob_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsLob *lob = (njsLob*) finalizeData;

    if (lob->handle) {
        dpiLob_release(lob->handle);
        lob->handle = NULL;
    }
    NJS_FREE_AND_CLEAR(lob->bufferPtr);
    free(lob);
}


//-----------------------------------------------------------------------------
// njsLob_getChunkSize()
//   Get accessor of "chunkSize" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_getChunkSize, 0, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, lob->chunkSize, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getLength()
//   Get accessor of "length" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_getLength, 0, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, lob->length, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getPieceSize()
//   Get accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_getPieceSize, 0, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, lob->pieceSize, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getType()
//   Get accessor of "type" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_getType, 0, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, lob->dataType, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getData()
//   Read all of the data from the LOB and return it as a single string or
// buffer.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_getData, 0, NULL)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (!njsLob_check(lob, baton))
        return false;
    return njsBaton_queueWork(baton, env, "GetData", njsLob_getDataAsync,
            njsLob_getDataPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsLob_getDataAsync()
//   Worker function for njsLob_getData().
//-----------------------------------------------------------------------------
static bool njsLob_getDataAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob*) baton->callingInstance;
    bool ok = true;

    // if the length is marked dirty, acquire it at this time
    if (lob->dirtyLength) {
        if (dpiLob_getSize(lob->handle, &lob->length) < 0)
            return njsBaton_setErrorDPI(baton);
        lob->dirtyLength = false;
    }

    // determine size of buffer that is required
    if (lob->dataType == NJS_DATATYPE_BLOB) {
        baton->bufferSize = lob->length;
    } else if (dpiLob_getBufferSize(lob->handle, lob->length,
            &baton->bufferSize) < 0) {
        ok = njsBaton_setErrorDPI(baton);
    }

    // allocate memory for the buffer
    if (ok && baton->bufferSize > 0) {
        baton->bufferPtr = malloc(baton->bufferSize);
        if (!baton->bufferPtr)
            ok = njsBaton_setError(baton, errInsufficientMemory);
    }

    // read from the LOB into the provided buffer
    if (ok && baton->bufferSize > 0 && dpiLob_readBytes(lob->handle, 1,
            lob->length, baton->bufferPtr, &baton->bufferSize) < 0)
        ok = njsBaton_setErrorDPI(baton);

    return ok;
}


//-----------------------------------------------------------------------------
// njsLob_getDataPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsLob_getDataPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (!baton->bufferSize) {
        NJS_CHECK_NAPI(env, napi_get_null(env, result))
    } else if (lob->dataType == DPI_ORACLE_TYPE_CLOB ||
            lob->dataType == DPI_ORACLE_TYPE_NCLOB) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, baton->bufferPtr,
                baton->bufferSize, result))
    } else {
        NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, baton->bufferSize,
                baton->bufferPtr, NULL, result))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsLob_new()
//   Creates a new LOB object.
//-----------------------------------------------------------------------------
bool njsLob_new(njsModuleGlobals *globals, njsLobBuffer *buffer, napi_env env,
        napi_value parentObj, napi_value *lobObj)
{
    njsLob *lob;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefLob, globals->jsLobConstructor,
            lobObj, (njsBaseInstance**) &lob))
        return false;

    // transfer data from LOB buffer to instance
    lob->handle = buffer->handle;
    buffer->handle = NULL;
    lob->dataType = buffer->dataType;
    lob->chunkSize = buffer->chunkSize;
    lob->pieceSize = buffer->chunkSize;
    lob->length = buffer->length;

    // store a reference to the calling object on the LOB
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *lobObj, "_parentObj",
            parentObj))

    return true;
}


//-----------------------------------------------------------------------------
// njsLob_populateBuffer()
//   Populate the LOB buffer given the ODPI-C LOB handle. The ODPI-C LOB handle
// should not be attached to the buffer until everything has been successfully
// performed; that way the caller knows when the reference is owned by the
// buffer.
//-----------------------------------------------------------------------------
bool njsLob_populateBuffer(njsBaton *baton, njsLobBuffer *buffer)
{
    if (dpiLob_getChunkSize(buffer->handle, &buffer->chunkSize) < 0)
        return njsBaton_setErrorDPI(baton);
    if (dpiLob_getSize(buffer->handle, &buffer->length) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_read()
//   Read some data from the LOB.
//
// PARAMETERS
//   - offset
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_read, 1, NULL)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (!njsLob_check(lob, baton))
        return false;
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->lobOffset))
        return false;
    return njsBaton_queueWork(baton, env, "Read", njsLob_readAsync,
            njsLob_readPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsLob_readAsync()
//   Worker function for njsLob_read().
//-----------------------------------------------------------------------------
static bool njsLob_readAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob*) baton->callingInstance;
    bool ok = true;

    // if no LOB buffer exists, create one
    if (!lob->bufferPtr) {

        // determine the size in bytes of the buffer to create
        if (lob->dataType == NJS_DATATYPE_BLOB) {
            lob->bufferSize = lob->pieceSize;
        } else if (dpiLob_getBufferSize(lob->handle, lob->pieceSize,
                &lob->bufferSize) < 0) {
            ok = njsBaton_setErrorDPI(baton);
        }

        // allocate memory for the buffer
        if (ok) {
            lob->bufferPtr = malloc(lob->bufferSize);
            if (!lob->bufferPtr)
                ok = njsBaton_setError(baton, errInsufficientMemory);
        }

    }

    // read from the LOB into the provided buffer
    baton->bufferSize = lob->bufferSize;
    if (ok && dpiLob_readBytes(lob->handle, baton->lobOffset,
            lob->pieceSize, lob->bufferPtr, &baton->bufferSize) < 0)
        ok = njsBaton_setErrorDPI(baton);

    return ok;
}


//-----------------------------------------------------------------------------
// njsLob_readPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsLob_readPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (!baton->bufferSize) {
        NJS_CHECK_NAPI(env, napi_get_null(env, result))
    } else if (lob->dataType == DPI_ORACLE_TYPE_CLOB ||
            lob->dataType == DPI_ORACLE_TYPE_NCLOB) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, lob->bufferPtr,
                baton->bufferSize, result))
    } else {
        NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, baton->bufferSize,
                lob->bufferPtr, NULL, result))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsLob_setPieceSize()
//   Set accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_setPieceSize, 1, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;

    NJS_FREE_AND_CLEAR(lob->bufferPtr);
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &lob->pieceSize))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_write()
//   Write some data to the LOB.
//
// PARAMETERS
//   - offset
//   - data
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_write, 2, NULL)
{
    njsLob *lob = (njsLob*) baton->callingInstance;
    size_t bufferSize;
    bool isBuffer;

    if (!njsLob_check(lob, baton))
        return false;

    // get the offset (characters for CLOBs, bytes for BLOBs)
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->lobOffset))
        return false;

    // determine if a buffer was passed
    NJS_CHECK_NAPI(env, napi_is_buffer(env, args[1], &isBuffer))

    // buffers store a reference to ensure that the buffer that is provided
    // is not destroyed before we have finished reading from it
    if (isBuffer) {
        NJS_CHECK_NAPI(env, napi_create_reference(env, args[1], 1,
                &baton->jsBufferRef))
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, args[1],
                (void**) &baton->bufferPtr, &bufferSize))

    // otherwise, the string buffer data needs to be acquired
    } else if (!njsUtils_getStringArg(env, args, 1, &baton->bufferPtr,
            &bufferSize)) {
        return false;
    }
    baton->bufferSize = bufferSize;

    return njsBaton_queueWork(baton, env, "Write", njsLob_writeAsync, NULL,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsLob_writeAsync()
//   Worker function for njsLob_write().
//-----------------------------------------------------------------------------
static bool njsLob_writeAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    if (dpiLob_writeBytes(lob->handle, baton->lobOffset, baton->bufferPtr,
            baton->bufferSize) < 0)
        return njsBaton_setErrorDPI(baton);
    lob->dirtyLength = true;
    return true;
}
