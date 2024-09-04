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
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getDirFileName);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_getFileExists);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getLength);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getPieceSize);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_getType);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_read);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_setPieceSize);
NJS_NAPI_METHOD_DECL_ASYNC(njsLob_write);
NJS_NAPI_METHOD_DECL_SYNC(njsLob_setDirFileName);

// asynchronous methods
static NJS_ASYNC_METHOD(njsLob_closeAsync);
static NJS_ASYNC_METHOD(njsLob_getDataAsync);
static NJS_ASYNC_METHOD(njsLob_getFileExistsAsync);
static NJS_ASYNC_METHOD(njsLob_readAsync);
static NJS_ASYNC_METHOD(njsLob_writeAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsLob_getDataPostAsync);
static NJS_ASYNC_POST_METHOD(njsLob_getFileExistsPostAsync);
static NJS_ASYNC_POST_METHOD(njsLob_readPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsLob_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "close", NULL, njsLob_close, NULL, NULL, NULL, napi_default, NULL },
    { "getChunkSize", NULL, njsLob_getChunkSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "getData", NULL, njsLob_getData, NULL, NULL, NULL, napi_default, NULL },
    { "getDirFileName", NULL, njsLob_getDirFileName, NULL, NULL, NULL,
            napi_default, NULL },
    { "fileExists", NULL, njsLob_getFileExists, NULL, NULL, NULL, napi_default,
            NULL },
    { "getLength", NULL, njsLob_getLength, NULL, NULL, NULL, napi_default,
            NULL },
    { "getPieceSize", NULL, njsLob_getPieceSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "getType", NULL, njsLob_getType, NULL, NULL, NULL, napi_default, NULL },
    { "read", NULL, njsLob_read, NULL, NULL, NULL, napi_default, NULL },
    { "setPieceSize", NULL, njsLob_setPieceSize, NULL, NULL, NULL,
            napi_default, NULL },
    {  "setDirFileName", NULL, njsLob_setDirFileName, NULL, NULL, NULL,
            napi_default, NULL},
    { "write", NULL, njsLob_write, NULL, NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefLob = {
    "LobImpl", sizeof(njsLob), njsLob_finalize, njsClassProperties, false
};


//-----------------------------------------------------------------------------
// njsLob_close()
//   Close the LOB.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_close, 0, NULL)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

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
//   Read data from the LOB and return it as a single string or
// buffer.
//
// PARAMETERS
//   - lobOffset
//   - lobAmount
//
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_getData, 2, NULL)
{
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0],
            &baton->lobOffset))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[1],
            &baton->lobAmount))
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
    uint32_t len;

    // if the length is marked dirty, acquire it at this time
    if (lob->dirtyLength) {
        if (dpiLob_getSize(lob->handle, &lob->length) < 0)
            return njsBaton_setErrorDPI(baton);
        lob->dirtyLength = false;
    }
    len = baton->lobAmount;
    if ((len == 0) || (len >= lob->length)) {
        // If user has not given lobAmount or user gave greater than
        // lob length, adjust the len value.
        if (lob->length >= baton->lobOffset) {
            len = lob->length - (baton->lobOffset - 1);
        } else {
            len = 1;
        }
    }

    // determine size of buffer that is required
    if (lob->dataType == NJS_DATATYPE_BLOB ||
            lob->dataType == NJS_DATATYPE_BFILE) {
        baton->bufferSize = len;
    } else if (dpiLob_getBufferSize(lob->handle, len,
            &baton->bufferSize) < 0) {
        ok = njsBaton_setErrorDPI(baton);
    }

    // allocate memory for the buffer
    if (ok && baton->bufferSize > 0) {
        baton->bufferPtr = malloc(baton->bufferSize);
        if (!baton->bufferPtr)
            ok = njsBaton_setErrorInsufficientMemory(baton);
    }

    // read from the LOB into the provided buffer
    if (ok && baton->bufferSize > 0 && dpiLob_readBytes(lob->handle,
            baton->lobOffset, len, baton->bufferPtr, &baton->bufferSize) < 0)
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
            lobObj, (void**) &lob))
        return false;

    // transfer data from LOB buffer to instance
    lob->handle = buffer->handle;
    buffer->handle = NULL;
    lob->dataType = buffer->dataType;
    lob->chunkSize = buffer->chunkSize;
    lob->pieceSize = buffer->chunkSize;
    lob->length = buffer->length;
    if (lob->dataType == NJS_DATATYPE_BFILE) {
        lob->dirtyLength = true;
    }

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
    if (buffer->dataType != DPI_ORACLE_TYPE_BFILE) {
        if (dpiLob_getChunkSize(buffer->handle, &buffer->chunkSize) < 0)
            return njsBaton_setErrorDPI(baton);

        if (dpiLob_getSize(buffer->handle, &buffer->length) < 0)
            return njsBaton_setErrorDPI(baton);
    }

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
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &baton->lobOffset))
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
                ok = njsBaton_setErrorInsufficientMemory(baton);
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
// njsLob_getDirFileName()
//  To obtain the directory alias and file name properties of BFILE lob object
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_getDirFileName, 0, NULL)
{
    njsLob *lob = (njsLob *) callingInstance;
    uint32_t dirNameLength, fileNameLength;
    const char *dirName, *fileName;
    napi_value temp;

    if (dpiLob_getDirectoryAndFileName(lob->handle, &dirName, &dirNameLength,
            &fileName, &fileNameLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    // create result object
    NJS_CHECK_NAPI(env, napi_create_object(env, returnValue))
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, dirName,
        dirNameLength, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *returnValue,
        "dirName", temp))
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, fileName,
        fileNameLength, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *returnValue,
        "fileName", temp))

    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getFileExists()
//   To get the file-existence status of BFILE.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsLob_getFileExists, 0, NULL)
{
  return njsBaton_queueWork(baton, env, "fileExists",
          njsLob_getFileExistsAsync, njsLob_getFileExistsPostAsync,
          returnValue);
}


//-----------------------------------------------------------------------------
// njsLob_getFileExists()
//   Worker thread function for njsLob_getFileExists().
//-----------------------------------------------------------------------------
static bool njsLob_getFileExistsAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob *) baton->callingInstance;
    int exists;

    if (dpiLob_getFileExists(lob->handle, &exists) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->fileExists = (exists != 0) ? true : false;

    return true;
}


//-----------------------------------------------------------------------------
// njsLob_getFileExistsPostAsync()
//    To return whether the file exists (BFILE)
//-----------------------------------------------------------------------------
static bool njsLob_getFileExistsPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->fileExists, result))
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_setDirFileName()
//   TO set the directory alias and file name property on BFILE lob object
//----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsLob_setDirFileName, 1, NULL)
{
    njsLob *lob = (njsLob*) callingInstance;
    size_t dirNameLength, fileNameLength;
    char *dirName, *fileName;

    if (!njsUtils_getNamedPropertyString(env, args[0], "dirName",
            &dirName, &dirNameLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "fileName",
            &fileName, &fileNameLength))
        return false;
    if (dpiLob_setDirectoryAndFileName(lob->handle, dirName, dirNameLength,
            fileName, fileNameLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);

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
    size_t bufferSize;
    bool isBuffer;

    // get the offset (characters for CLOBs, bytes for BLOBs)
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &baton->lobOffset))

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
    } else if (!njsUtils_copyStringFromJS(env, args[1], &baton->bufferPtr,
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
