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
//   njsLob.c
//
// DESCRIPTION
//   Lob class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsLob_close);
static NJS_NAPI_METHOD(njsLob_getData);
static NJS_NAPI_METHOD(njsLob_read);
static NJS_NAPI_METHOD(njsLob_write);

// asynchronous methods
static NJS_ASYNC_METHOD(njsLob_closeAsync);
static NJS_ASYNC_METHOD(njsLob_getDataAsync);
static NJS_ASYNC_METHOD(njsLob_readAsync);
static NJS_ASYNC_METHOD(njsLob_writeAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsLob_getDataPostAsync);
static NJS_ASYNC_POST_METHOD(njsLob_readPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsLob_readProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsLob_writeProcessArgs);

// getters
static NJS_NAPI_GETTER(njsLob_getAutoCloseLob);
static NJS_NAPI_GETTER(njsLob_getChunkSize);
static NJS_NAPI_GETTER(njsLob_getLength);
static NJS_NAPI_GETTER(njsLob_getPieceSize);
static NJS_NAPI_GETTER(njsLob_getType);
static NJS_NAPI_GETTER(njsLob_getValid);

// setters
static NJS_NAPI_SETTER(njsLob_setPieceSize);

// finalize
static NJS_NAPI_FINALIZE(njsLob_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_close", NULL, njsLob_close, NULL, NULL, NULL, napi_default, NULL },
    { "_getData", NULL, njsLob_getData, NULL, NULL, NULL, napi_default, NULL },
    { "__read", NULL, njsLob_read, NULL, NULL, NULL, napi_default, NULL },
    { "__write", NULL, njsLob_write, NULL, NULL, NULL, napi_default, NULL },
    { "_autoCloseLob", NULL, NULL, njsLob_getAutoCloseLob, NULL, NULL,
            napi_default, NULL },
    { "chunkSize", NULL, NULL, njsLob_getChunkSize, NULL, NULL, napi_default,
            NULL },
    { "length", NULL, NULL, njsLob_getLength, NULL, NULL, napi_default, NULL },
    { "pieceSize", NULL, NULL, njsLob_getPieceSize, njsLob_setPieceSize, NULL,
            napi_default, NULL },
    { "type", NULL, NULL, njsLob_getType, NULL, NULL, napi_default, NULL },
    { "valid", NULL, NULL, njsLob_getValid, NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefLob = {
    "Lob", sizeof(njsLob), njsLob_finalize, njsClassProperties, NULL, false
};

// other methods used internally
static bool njsLob_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);


//-----------------------------------------------------------------------------
// njsLob_close()
//   Close the LOB.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsLob_close(napi_env env, napi_callback_info info)
{
    njsBaton *baton;
    njsLob *lob;

    if (!njsLob_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    lob = (njsLob*) baton->callingInstance;
    lob->activeBaton = NULL;
    baton->dpiLobHandle = lob->handle;
    lob->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsLob_closeAsync, NULL);
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
// njsLob_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsLob_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsBaton *tempBaton;
    njsLob *lob;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    lob = (njsLob*) tempBaton->callingInstance;
    if (!lob->handle) {
        njsBaton_setError(tempBaton, errInvalidLob);
        njsBaton_reportError(tempBaton, env);
        return false;
    }
    tempBaton->oracleDb = lob->oracleDb;
    lob->activeBaton = tempBaton;

    *baton = tempBaton;
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
// njsLob_getAutoCloseLob()
//   Get accessor of "autoCloseLob" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getAutoCloseLob(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToBoolean(env, lob->isAutoClose);
}


//-----------------------------------------------------------------------------
// njsLob_getChunkSize()
//   Get accessor of "chunkSize" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getChunkSize(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, lob->chunkSize);
}


//-----------------------------------------------------------------------------
// njsLob_getLength()
//   Get accessor of "length" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getLength(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, (uint32_t) lob->length);
}


//-----------------------------------------------------------------------------
// njsLob_getPieceSize()
//   Get accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getPieceSize(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, lob->pieceSize);
}


//-----------------------------------------------------------------------------
// njsLob_getType()
//   Get accessor of "type" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getType(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, lob->dataType);
}


//-----------------------------------------------------------------------------
// njsLob_getValid()
//   Get accessor of "valid" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_getValid(napi_env env, napi_callback_info info)
{
    njsLob *lob;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &lob))
        return NULL;
    return njsUtils_convertToBoolean(env, (lob->handle) ? true : false);
}


//-----------------------------------------------------------------------------
// njsLob_getData()
//   Read all of the data from the LOB and return it as a single string or
// buffer.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsLob_getData(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsLob_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "GetData", njsLob_getDataAsync,
            njsLob_getDataPostAsync);
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

    // if an error occurs or the end of the LOB has been reached, and the LOB
    // is marked as one that should be automatically closed, close and release
    // it, ignoring any further errors that occur during the attempt to close
    if (lob->isAutoClose && (!baton->bufferSize || !ok)) {
        NJS_FREE_AND_CLEAR(lob->bufferPtr);
        dpiLob_close(lob->handle);
        dpiLob_release(lob->handle);
        lob->handle = NULL;
    }

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
bool njsLob_new(njsOracleDb *oracleDb, njsLobBuffer *buffer, napi_env env,
        napi_value parentObj, napi_value *lobObj)
{
    njsLob *lob;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefLob, oracleDb->jsLobConstructor,
            lobObj, (njsBaseInstance**) &lob))
        return false;

    // transfer data from LOB buffer to instance
    lob->handle = buffer->handle;
    buffer->handle = NULL;
    lob->oracleDb = oracleDb;
    lob->dataType = buffer->dataType;
    lob->chunkSize = buffer->chunkSize;
    lob->pieceSize = buffer->chunkSize;
    lob->length = buffer->length;
    lob->isAutoClose = buffer->isAutoClose;

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
static napi_value njsLob_read(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsLob_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsLob_readProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Read", njsLob_readAsync,
            njsLob_readPostAsync);
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

    // if an error occurs or the end of the LOB has been reached, and the LOB
    // is marked as one that should be automatically closed, close and release
    // it, ignoring any further errors that occur during the attempt to close
    if (lob->isAutoClose && (!baton->bufferSize || !ok)) {
        NJS_FREE_AND_CLEAR(lob->bufferPtr);
        dpiLob_close(lob->handle);
        dpiLob_release(lob->handle);
        lob->handle = NULL;
    }

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
// njsLob_readProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsLob_readProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    return njsUtils_getUnsignedIntArg(env, args, 0, &baton->lobOffset);
}


//-----------------------------------------------------------------------------
// njsLob_setPieceSize()
//   Set accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
static napi_value njsLob_setPieceSize(napi_env env, napi_callback_info info)
{
    napi_value value;
    njsLob *lob;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &lob, &value))
        return NULL;
    NJS_FREE_AND_CLEAR(lob->bufferPtr);
    if (!njsUtils_setPropUnsignedInt(env, value, "pieceSize", &lob->pieceSize))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsLob_write()
//   Write some data to the LOB.
//
// PARAMETERS
//   - offset
//   - data
//-----------------------------------------------------------------------------
static napi_value njsLob_write(napi_env env, napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsLob_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsLob_writeProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Write", njsLob_writeAsync, NULL);
}


//-----------------------------------------------------------------------------
// njsLob_writeAsync()
//   Worker function for njsLob_write().
//-----------------------------------------------------------------------------
static bool njsLob_writeAsync(njsBaton *baton)
{
    njsLob *lob = (njsLob*) baton->callingInstance;

    // if an error occurs and the LOB is marked as one that should be
    // automatically closed, close and release it, ignoring any further errors
    // that occur during the attempt to close
    if (dpiLob_writeBytes(lob->handle, baton->lobOffset, baton->bufferPtr,
            baton->bufferSize) < 0) {
        njsBaton_setErrorDPI(baton);
        if (lob->isAutoClose) {
            dpiLob_close(lob->handle);
            dpiLob_release(lob->handle);
            lob->handle = NULL;
        }
        return false;
    }
    lob->dirtyLength = true;
    return true;
}


//-----------------------------------------------------------------------------
// njsLob_writeProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsLob_writeProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    size_t bufferSize;
    bool isBuffer;

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

    return true;
}
