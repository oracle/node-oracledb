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
//   njsSodaOperation.c
//
// DESCRIPTION
//   SodaOperation class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_count);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_getCursor);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_getDocuments);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_getOne);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_remove);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_replaceOne);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaOperation_replaceOneAndGet);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaOperation_countAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_getCursorAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_getDocumentsAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_getOneAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_removeAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_replaceOneAsync);
static NJS_ASYNC_METHOD(njsSodaOperation_replaceOneAndGetAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaOperation_countPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_getCursorPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_getDocumentsPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_getOnePostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_removePostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_replaceOnePostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaOperation_replaceOneAndGetPostAsync);

// finalize
static NJS_NAPI_FINALIZE(njsSodaOperation_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "count", NULL, njsSodaOperation_count, NULL, NULL, NULL,
            napi_default, NULL },
    { "getCursor", NULL, njsSodaOperation_getCursor, NULL, NULL, NULL,
            napi_default, NULL },
    { "getDocuments", NULL, njsSodaOperation_getDocuments, NULL, NULL, NULL,
            napi_default, NULL },
    { "getOne", NULL, njsSodaOperation_getOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "remove", NULL, njsSodaOperation_remove, NULL, NULL, NULL,
            napi_default, NULL },
    { "replaceOne", NULL, njsSodaOperation_replaceOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "replaceOneAndGet", NULL, njsSodaOperation_replaceOneAndGet, NULL,
            NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaOperation = {
    "SodaOperationImpl", sizeof(njsSodaOperation), njsSodaOperation_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsSodaOperation_processOptions(njsBaton *baton, napi_env env,
        napi_value options);


//-----------------------------------------------------------------------------
// njsSodaOperation_count()
//   Return the number of documents in the collection that match the criteria.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_count, 1, NULL)
{
    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "Count", njsSodaOperation_countAsync,
            njsSodaOperation_countPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_countAsync()
//   Worker function for njsSodaOperation_count().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_countAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_getDocCount(op->coll->handle, baton->sodaOperOptions,
            flags, &baton->docCount) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_countPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_countPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value count;

    NJS_CHECK_NAPI(env, napi_create_object(env, result))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, (uint32_t) baton->docCount,
            &count))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "count", count))
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_createFromCollection()
//   Creates a new SODA operation object given a collection.
//-----------------------------------------------------------------------------
bool njsSodaOperation_createFromCollection(napi_env env,
        napi_value collObj, njsModuleGlobals *globals, njsSodaCollection *coll,
        napi_value *opObj)
{
    njsSodaOperation *op;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaOperation,
            globals->jsSodaOperationConstructor, opObj, (void**) &op))
        return false;

    // perform some initializations
    op->coll = coll;

    // store a reference to the collection to ensure that it is not garbage
    // collected during the lifetime of the operation
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *opObj, "_collection",
            collObj))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_finalize()
//   Invoked when the njsSodaOperation object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSodaOperation_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSodaOperation *op = (njsSodaOperation*) finalizeData;

    free(op);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getCursor()
//   Returns a cursor that will fetch documents matching the criteria.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_getCursor, 1, NULL)
{
    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "GetCursor",
            njsSodaOperation_getCursorAsync,
            njsSodaOperation_getCursorPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getCursorAsync()
//   Worker function for njsSodaOperation_getCursor().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getCursorAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_find(op->coll->handle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocCursorHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getCursorPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getCursorPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    return njsSodaDocCursor_newFromBaton(baton, env, result);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getDocuments()
//   Returns an array of documents that match the criteria.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_getDocuments, 1, NULL)
{
    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "GetDocuments",
            njsSodaOperation_getDocumentsAsync,
            njsSodaOperation_getDocumentsPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getDocumentsAsync()
//   Worker function for njsSodaOperation_getDocuments().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getDocumentsAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc **tempArray, *doc;
    uint32_t numAllocated;

    // acquire cursor to iterate over results
    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_find(op->coll->handle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocCursorHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    // iterate over cursor until no further documents are found
    numAllocated = 0;
    while (true) {

        // acquire the next document from the cursor
        if (dpiSodaDocCursor_getNext(baton->dpiSodaDocCursorHandle, flags,
                &doc) < 0)
            return njsBaton_setErrorDPI(baton);
        if (!doc)
            break;

        // allocate more space in the aray, if needed
        if (baton->numSodaDocs == numAllocated) {
            numAllocated += 16;
            tempArray = malloc(numAllocated * sizeof(dpiSodaDoc*));
            if (!tempArray)
                return njsBaton_setErrorInsufficientMemory(baton);
            if (baton->sodaDocs) {
                memcpy(tempArray, baton->sodaDocs,
                        baton->numSodaDocs * sizeof(dpiSodaDoc*));
                free(baton->sodaDocs);
            }
            baton->sodaDocs = tempArray;
        }

        // store element in the array
        baton->sodaDocs[baton->numSodaDocs] = doc;
        baton->numSodaDocs++;

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getDocumentsPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getDocumentsPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value element;
    uint32_t i;

    // create array of the specified length
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numSodaDocs,
            result))

    // populate it
    for (i = 0; i < baton->numSodaDocs; i++) {

        // create element; if successful remove the SODA document handle from
        // the baton as the reference is now owned by the element
        if (!njsSodaDocument_createFromHandle(env, baton->sodaDocs[i],
                baton->globals, &element))
            return false;
        baton->sodaDocs[i] = NULL;

        // add it to the array
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, element))

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getOne()
//   Return the first document in the collection that matches the criteria.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_getOne, 1, NULL)
{
    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "GetOne",
            njsSodaOperation_getOneAsync, njsSodaOperation_getOnePostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getOneAsync()
//   Worker function for njsSodaOperation_getOne().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getOneAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_findOne(op->coll->handle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getOnePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getOnePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    if (baton->dpiSodaDocHandle && !njsSodaDocument_createFromHandle(env,
            baton->dpiSodaDocHandle, baton->globals, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_processOptions()
//   Utility function which processes the options passed through from
// Javascript and turns them into the options expected by ODPI-C.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_processOptions(njsBaton *baton, napi_env env,
        napi_value options)
{
    dpiVersionInfo *versionInfo;
    bool lock;

    // allocate memory for ODPI-C operations structure
    baton->sodaOperOptions = calloc(1, sizeof(dpiSodaOperOptions));
    if (!baton->sodaOperOptions)
        return njsBaton_setErrorInsufficientMemory(baton);

    // set fetch array size, but ONLY if the client version exceeds 19.5
    versionInfo = &baton->globals->clientVersionInfo;
    if (versionInfo->versionNum > 19 ||
            (versionInfo->versionNum == 19 && versionInfo->releaseNum >= 5))
        baton->sodaOperOptions->fetchArraySize = baton->fetchArraySize;

    // process each of the options
    if (!njsUtils_getNamedPropertyBool(env, options, "autoCommit",
            &baton->autoCommit))
        return false;
    if (!njsUtils_getNamedPropertyUnsignedInt(env, options, "fetchArraySize",
            &baton->sodaOperOptions->fetchArraySize))
        return false;
    if (!njsUtils_getNamedPropertyUnsignedInt(env, options, "limit",
            &baton->sodaOperOptions->limit))
        return false;
    if (!njsUtils_getNamedPropertyUnsignedInt(env, options, "skip",
            &baton->sodaOperOptions->skip))
        return false;
    if (!njsUtils_getNamedPropertyString(env, options, "filter",
            &baton->filter, &baton->filterLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, options, "version",
            &baton->version, &baton->versionLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, options, "key",
            &baton->key, &baton->keyLength))
        return false;
    if (!njsUtils_getNamedPropertyStringArray(env, options, "keys",
            &baton->numKeys, &baton->keys, &baton->keysLengths))
        return false;
    if (!njsUtils_getNamedPropertyString(env, options, "hint",
            &baton->hint, &baton->hintLength))
        return false;
    if (!njsUtils_getNamedPropertyBool(env, options, "lock", &lock))
        return false;

    // populate SODDA operations options structure
    baton->sodaOperOptions->filter = baton->filter;
    baton->sodaOperOptions->filterLength = (uint32_t) baton->filterLength;
    baton->sodaOperOptions->version = baton->version;
    baton->sodaOperOptions->versionLength = (uint32_t) baton->versionLength;
    baton->sodaOperOptions->key = baton->key;
    baton->sodaOperOptions->keyLength = (uint32_t) baton->keyLength;
    baton->sodaOperOptions->numKeys = baton->numKeys;
    baton->sodaOperOptions->keys = (const char**) baton->keys;
    baton->sodaOperOptions->keyLengths = baton->keysLengths;
    baton->sodaOperOptions->hint = baton->hint;
    baton->sodaOperOptions->hintLength = (uint32_t) baton->hintLength;
    baton->sodaOperOptions->lock = (int) lock;

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_remove()
//   Removes the documents that match the criteria and return the number of
// documents thus removed.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_remove, 1, NULL)
{
    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "Remove",
            njsSodaOperation_removeAsync, njsSodaOperation_removePostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_removeAsync()
//   Worker function for njsSodaOperation_remove().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_removeAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_remove(op->coll->handle, baton->sodaOperOptions,
            flags, &baton->docCount) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_removePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_removePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value count;

    NJS_CHECK_NAPI(env, napi_create_object(env, result))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, (uint32_t) baton->docCount,
            &count))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "count", count))
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOne()
//   Replaces a single document matching the criteria with the specified
// content.
//
// PARAMETERS
//   - options
//   - content
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_replaceOne, 2, NULL)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;

    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    if (!njsBaton_getSodaDocument(baton, op->coll->db, env, args[1],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "ReplaceOne",
            njsSodaOperation_replaceOneAsync,
            njsSodaOperation_replaceOnePostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOneAsync()
//   Worker function for njsSodaOperation_replaceOne().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_replaceOneAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    int replaced;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_replaceOne(op->coll->handle, baton->sodaOperOptions,
            baton->dpiSodaDocHandle, flags, &replaced, NULL) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->replaced = (bool) replaced;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOnePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_replaceOnePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value replaced;

    NJS_CHECK_NAPI(env, napi_create_object(env, result))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->replaced, &replaced))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "replaced",
            replaced))
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOneAndGet()
//   Replaces a single document matching the criteria with the specified
// content and returns it, if it was replaced.
//
// PARAMETERS
//   - options
//   - content
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaOperation_replaceOneAndGet, 2, NULL)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;

    if (!njsSodaOperation_processOptions(baton, env, args[0]))
        return false;
    if (!njsBaton_getSodaDocument(baton, op->coll->db, env, args[1],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "ReplaceOneAndGet",
            njsSodaOperation_replaceOneAndGetAsync,
            njsSodaOperation_replaceOneAndGetPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOneAndGetAsync()
//   Worker function for njsSodaOperation_replaceOneAndGet().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_replaceOneAndGetAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *replacedDoc;
    int replaced;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_replaceOne(op->coll->handle, baton->sodaOperOptions,
            baton->dpiSodaDocHandle, flags, &replaced, &replacedDoc) < 0)
        return njsBaton_setErrorDPI(baton);

    baton->replaced = (bool) replaced;
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = replacedDoc;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_replaceOneAndGetPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_replaceOneAndGetPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    if (baton->dpiSodaDocHandle && !njsSodaDocument_createFromHandle(env,
            baton->dpiSodaDocHandle, baton->globals, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}
