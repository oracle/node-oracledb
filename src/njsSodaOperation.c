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
//   njsSodaOperation.c
//
// DESCRIPTION
//   SodaOperation class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsSodaOperation_count);
static NJS_NAPI_METHOD(njsSodaOperation_getCursor);
static NJS_NAPI_METHOD(njsSodaOperation_getDocuments);
static NJS_NAPI_METHOD(njsSodaOperation_getOne);
static NJS_NAPI_METHOD(njsSodaOperation_remove);
static NJS_NAPI_METHOD(njsSodaOperation_replaceOne);
static NJS_NAPI_METHOD(njsSodaOperation_replaceOneAndGet);

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
    { "_count", NULL, njsSodaOperation_count, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getCursor", NULL, njsSodaOperation_getCursor, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getDocuments", NULL, njsSodaOperation_getDocuments, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getOne", NULL, njsSodaOperation_getOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "_remove", NULL, njsSodaOperation_remove, NULL, NULL, NULL,
            napi_default, NULL },
    { "_replaceOne", NULL, njsSodaOperation_replaceOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "_replaceOneAndGet", NULL, njsSodaOperation_replaceOneAndGet, NULL,
            NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaOperation = {
    "SodaOperation", sizeof(njsSodaOperation), njsSodaOperation_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsSodaOperation_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);
static bool njsSodaOperation_processOptions(njsBaton *baton, napi_env env,
        napi_value *args);


//-----------------------------------------------------------------------------
// njsSodaOperation_count()
//   Return the number of documents in the collection that match the criteria.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
static napi_value njsSodaOperation_count(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Count", njsSodaOperation_countAsync,
            njsSodaOperation_countPostAsync);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_countAsync()
//   Worker function for njsSodaOperation_count().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_countAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
// njsSodaOperation_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
static bool njsSodaOperation_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsSodaOperation *op;
    njsBaton *tempBaton;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    op = (njsSodaOperation*) tempBaton->callingInstance;
    tempBaton->oracleDb = op->coll->db->oracleDb;

    *baton = tempBaton;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation_createFromCollection()
//   Creates a new SODA operation object given a collection.
//-----------------------------------------------------------------------------
bool njsSodaOperation_createFromCollection(napi_env env,
        napi_value collObj, njsSodaCollection *coll, napi_value *opObj)
{
    njsSodaOperation *op;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaOperation,
            coll->db->oracleDb->jsSodaOperationConstructor, opObj,
            (njsBaseInstance**) &op))
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
static napi_value njsSodaOperation_getCursor(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetCursor",
            njsSodaOperation_getCursorAsync,
            njsSodaOperation_getCursorPostAsync);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getCursorAsync()
//   Worker function for njsSodaOperation_getCursor().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getCursorAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaOperation_getDocuments(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetDocuments",
            njsSodaOperation_getDocumentsAsync,
            njsSodaOperation_getDocumentsPostAsync);
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
    if (baton->oracleDb->autoCommit)
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
                return njsBaton_setError(baton, errInsufficientMemory);
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
                baton->oracleDb, &element))
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
static napi_value njsSodaOperation_getOne(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetOne",
            njsSodaOperation_getOneAsync, njsSodaOperation_getOnePostAsync);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_getOneAsync()
//   Worker function for njsSodaOperation_getOne().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_getOneAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
            baton->dpiSodaDocHandle, baton->oracleDb, result))
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
        napi_value *args)
{
    dpiVersionInfo versionInfo;

    // allocate memory for ODPI-C operations structure
    baton->sodaOperOptions = calloc(1, sizeof(dpiSodaOperOptions));
    if (!baton->sodaOperOptions)
        return njsBaton_setError(baton, errInsufficientMemory);

    // set fetch array size, but ONLY if the client version exceeds 19.5
    if (dpiContext_getClientVersion(baton->oracleDb->context,
            &versionInfo) < 0)
        return njsUtils_throwErrorDPI(env, baton->oracleDb);
    if (versionInfo.versionNum > 19 ||
            (versionInfo.versionNum == 19 && versionInfo.releaseNum >= 5))
        baton->sodaOperOptions->fetchArraySize =
                baton->oracleDb->fetchArraySize;

    // process each of the options
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "fetchArraySize",
            &baton->sodaOperOptions->fetchArraySize, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "limit",
            &baton->sodaOperOptions->limit, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "skip",
            &baton->sodaOperOptions->skip, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "filter",
            &baton->filter, &baton->filterLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "version",
            &baton->version, &baton->versionLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "key",
            &baton->key, &baton->keyLength, NULL))
        return false;
    if (!njsBaton_getStringArrayFromArg(baton, env, args, 0, "keys",
            &baton->numKeys, &baton->keys, &baton->keysLengths, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "hint",
            &baton->hint, &baton->hintLength, NULL))
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
static napi_value njsSodaOperation_remove(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Remove",
            njsSodaOperation_removeAsync, njsSodaOperation_removePostAsync);
}


//-----------------------------------------------------------------------------
// njsSodaOperation_removeAsync()
//   Worker function for njsSodaOperation_remove().
//-----------------------------------------------------------------------------
static bool njsSodaOperation_removeAsync(njsBaton *baton)
{
    njsSodaOperation *op = (njsSodaOperation*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaOperation_replaceOne(napi_env env,
        napi_callback_info info)
{
    njsSodaOperation *op;
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    op = (njsSodaOperation*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, op->coll->db, env, args[1],
            &baton->dpiSodaDocHandle)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "ReplaceOne",
            njsSodaOperation_replaceOneAsync,
            njsSodaOperation_replaceOnePostAsync);
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

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaOperation_replaceOneAndGet(napi_env env,
        napi_callback_info info)
{
    njsSodaOperation *op;
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaOperation_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaOperation_processOptions(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    op = (njsSodaOperation*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, op->coll->db, env, args[1],
            &baton->dpiSodaDocHandle)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "ReplaceOneAndGet",
            njsSodaOperation_replaceOneAndGetAsync,
            njsSodaOperation_replaceOneAndGetPostAsync);
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

    if (baton->oracleDb->autoCommit)
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
            baton->dpiSodaDocHandle, baton->oracleDb, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}
