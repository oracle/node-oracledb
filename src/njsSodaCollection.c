// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

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
//   njsSodaCollection.c
//
// DESCRIPTION
//   SodaCollection class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_createIndex);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_drop);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_dropIndex);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaCollection_find);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_getDataGuide);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaCollection_getMetaData);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaCollection_getName);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_insertMany);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_insertManyAndGet);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_insertOne);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_insertOneAndGet);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_save);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_saveAndGet);
NJS_NAPI_METHOD_DECL_ASYNC(njsSodaCollection_truncate);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaCollection_createIndexAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_dropAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_dropIndexAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_getDataGuideAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertManyAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertManyAndGetAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertOneAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertOneAndGetAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_saveAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_saveAndGetAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_truncateAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaCollection_dropPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_dropIndexPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_getDataGuidePostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_insertManyAndGetPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_insertOneAndGetPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_saveAndGetPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_insertManyProcessArgs);

// finalize
static NJS_NAPI_FINALIZE(njsSodaCollection_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "createIndex", NULL, njsSodaCollection_createIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "drop", NULL, njsSodaCollection_drop, NULL, NULL, NULL,
            napi_default, NULL },
    { "dropIndex", NULL, njsSodaCollection_dropIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "find", NULL, njsSodaCollection_find, NULL, NULL, NULL,
            napi_default, NULL },
    { "getDataGuide", NULL, njsSodaCollection_getDataGuide, NULL, NULL, NULL,
            napi_default, NULL },
    { "insertOne", NULL, njsSodaCollection_insertOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "insertOneAndGet", NULL, njsSodaCollection_insertOneAndGet, NULL, NULL,
            NULL, napi_default, NULL },
    { "insertMany", NULL, njsSodaCollection_insertMany, NULL, NULL, NULL,
            napi_default, NULL },
    { "insertManyAndGet", NULL, njsSodaCollection_insertManyAndGet, NULL,
            NULL, NULL, napi_default, NULL },
    { "getMetaData", NULL, njsSodaCollection_getMetaData, NULL, NULL, NULL,
            napi_default, NULL },
    { "getName", NULL, njsSodaCollection_getName, NULL, NULL, NULL,
            napi_default, NULL },
    { "save", NULL, njsSodaCollection_save, NULL, NULL, NULL, napi_default,
            NULL },
    { "saveAndGet", NULL, njsSodaCollection_saveAndGet, NULL, NULL, NULL,
            napi_default, NULL },
    { "truncate", NULL, njsSodaCollection_truncate, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaCollection = {
    "SodaCollectionImpl", sizeof(njsSodaCollection),
    njsSodaCollection_finalize, njsClassProperties, false
};

// other methods used internally
static bool njsSodaCollection_processHintOption(njsBaton *baton,
        napi_env env, napi_value *args);

//-----------------------------------------------------------------------------
// njsSodaCollection_createIndex()
//   Creates an index on the SODA collection.
//
// PARAMETERS
//   - index spec
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_createIndex, 1, NULL)
{
    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsUtils_getStringArg(env, args, 0, &baton->indexSpec,
            &baton->indexSpecLength))
        return false;
    return njsBaton_queueWork(baton, env, "Drop",
            njsSodaCollection_createIndexAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_createIndexAsync()
//   Worker function for njsSodaCollection_createIndex().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_createIndexAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_createIndex(coll->handle, baton->indexSpec,
            (uint32_t) baton->indexSpecLength, flags) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_drop()
//   Drops the collection from the database.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_drop, 0, NULL)
{
    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    return njsBaton_queueWork(baton, env, "Drop", njsSodaCollection_dropAsync,
            njsSodaCollection_dropPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropAsync()
//   Worker function for njsSodaCollection_drop().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    int isDropped;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_drop(coll->handle, flags, &isDropped) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->isDropped = (bool) isDropped;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value isDropped;

    NJS_CHECK_NAPI(env, napi_create_object(env, result))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->isDropped, &isDropped))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "dropped",
            isDropped))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropIndex()
//   Drops an index of a SODA collection.
//
// PARAMETERS
//   - name
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_dropIndex, 2, NULL)
{
    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsUtils_getStringArg(env, args, 0, &baton->name, &baton->nameLength))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 1, "force", &baton->force,
            NULL))
        return false;
    return njsBaton_queueWork(baton, env, "DropIndex",
            njsSodaCollection_dropIndexAsync,
            njsSodaCollection_dropIndexPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropIndexAsync()
//   Worker function for njsSodaCollection_dropIndex().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropIndexAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    int isDropped;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (baton->force)
        flags |= DPI_SODA_FLAGS_INDEX_DROP_FORCE;
    if (dpiSodaColl_dropIndex(coll->handle, baton->name,
            (uint32_t) baton->nameLength, flags, &isDropped) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->isDropped = (bool) isDropped;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropIndexPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropIndexPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value isDropped;

    NJS_CHECK_NAPI(env, napi_create_object(env, result))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->isDropped, &isDropped))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "dropped",
            isDropped))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_finalize()
//   Invoked when the njsSodaCollection object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSodaCollection_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSodaCollection *coll = (njsSodaCollection*) finalizeData;

    if (coll->handle) {
        dpiSodaColl_release(coll->handle);
        coll->handle = NULL;
    }
    free(coll);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_find()
//   Returns a SodaOperation object associated with the collection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaCollection_find, 0, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) callingInstance;

    return njsSodaOperation_createFromCollection(env, callingObj, globals,
            coll, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getDataGuide()
//   Returns the data guide associated with the SODA collection.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_getDataGuide, 0, NULL)
{
    return njsBaton_queueWork(baton, env, "GetDataGuide",
            njsSodaCollection_getDataGuideAsync,
            njsSodaCollection_getDataGuidePostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getDataGuideAsync()
//   Worker function for njsSodaCollection_getDataGuide().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_getDataGuideAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (dpiSodaColl_getDataGuide(coll->handle, DPI_SODA_FLAGS_DEFAULT,
            &baton->dpiSodaDocHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getDataGuidePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_getDataGuidePostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    if (!njsSodaDocument_createFromHandle(env, baton->dpiSodaDocHandle,
            baton->globals, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getMetaData()
//   Get accessor of "metaData" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaCollection_getMetaData, 0, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) callingInstance;
    uint32_t metadataLength;
    const char *metadata;

    if (dpiSodaColl_getMetadata(coll->handle, &metadata,
            &metadataLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, metadata, metadataLength,
            returnValue))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getName()
//   Get accessor of "name" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaCollection_getName, 0, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) callingInstance;
    uint32_t nameLength;
    const char *name;

    if (dpiSodaColl_getName(coll->handle, &name, &nameLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, name, nameLength,
            returnValue))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertMany()
//   Inserts multiple documents into the collection at the same time.
//
// PARAMETERS
//   - array of SODA documents
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_insertMany, 1, NULL)
{
    if (!njsSodaCollection_insertManyProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "InsertMany",
            njsSodaCollection_insertManyAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAsync()
//   Worker function for njsSodaCollection_insertMany().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_insertMany(coll->handle, baton->numSodaDocs,
            baton->sodaDocs, flags, NULL) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    napi_value element;
    uint32_t i;

    // get global autoCommit flag
    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;

    // create array to populate SODA document handles
    NJS_CHECK_NAPI(env, napi_get_array_length(env, args[0],
            &baton->numSodaDocs))
    baton->sodaDocs = calloc(baton->numSodaDocs, sizeof(dpiSodaDoc*));
    if (!baton->sodaDocs)
        return njsUtils_throwError(env, errInsufficientMemory);

    // acquire a SODA document handle for each entry in the array
    for (i = 0; i < baton->numSodaDocs; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, args[0], i, &element))
        if (!njsBaton_getSodaDocument(baton, coll->db, env, element,
                &baton->sodaDocs[i]))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAndGet()
//   Inserts a single document into the collection.
//
// PARAMETERS
//   - SODA document
//   - Options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_insertManyAndGet, 2, NULL)
{
    if (!njsSodaCollection_insertManyProcessArgs(baton, env, args))
        return false;
    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "InsertManyAndGet",
            njsSodaCollection_insertManyAndGetAsync,
            njsSodaCollection_insertManyAndGetPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAndGetAsync()
//   Worker function for njsSodaCollection_insertManyAndGet().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyAndGetAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t i, flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc **resultDocs;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    resultDocs = calloc(baton->numSodaDocs, sizeof(dpiSodaDoc*));
    if (!resultDocs)
        return njsBaton_setError(baton, errInsufficientMemory);
    if (dpiSodaColl_insertManyWithOptions(coll->handle, baton->numSodaDocs,
            baton->sodaDocs, baton->sodaOperOptions, flags, resultDocs) < 0) {
        free(resultDocs);
        return njsBaton_setErrorDPI(baton);
    }
    for (i = 0; i < baton->numSodaDocs; i++) {
        dpiSodaDoc_release(baton->sodaDocs[i]);
        baton->sodaDocs[i] = resultDocs[i];
        resultDocs[i] = NULL;
    }
    free(resultDocs);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAndGetPostAsync()
//   Creates the result object which is returned to the JS application.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyAndGetPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value temp;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numSodaDocs,
            result))
    for (i = 0; i < baton->numSodaDocs; i++) {
        if (!njsSodaDocument_createFromHandle(env, baton->sodaDocs[i],
                baton->globals, &temp))
            return false;
        baton->sodaDocs[i] = NULL;
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOne()
//   Inserts a single document into the collection.
//
// PARAMETERS
//   - SODA document
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_insertOne, 1, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "InsertOne",
            njsSodaCollection_insertOneAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAsync()
//   Worker function for njsSodaCollection_insertOne().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_insertOne(coll->handle, baton->dpiSodaDocHandle, flags,
            NULL) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAndGet()
//   Inserts a single document into the collection.
//
// PARAMETERS
//   - SODA document
//   - Options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_insertOneAndGet, 2, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "InsertOneAndGet",
            njsSodaCollection_insertOneAndGetAsync,
            njsSodaCollection_insertOneAndGetPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAndGetAsync()
//   Worker function for njsSodaCollection_insertOneAndGet().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAndGetAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *resultDoc;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_insertOneWithOptions(coll->handle, baton->dpiSodaDocHandle,
            baton->sodaOperOptions ,flags, &resultDoc) < 0)
        return njsBaton_setErrorDPI(baton);
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = resultDoc;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAndGetPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAndGetPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    if (!njsSodaDocument_createFromHandle(env, baton->dpiSodaDocHandle,
            baton->globals, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_newFromBaton()
//   Called when a SODA collection is being created from the baton.
//-----------------------------------------------------------------------------
bool njsSodaCollection_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *collObj)
{
    njsSodaCollection *coll;
    napi_value db;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaCollection,
            baton->globals->jsSodaCollectionConstructor, collObj,
            (njsBaseInstance**) &coll))
        return false;

    // store a copy of the database instance on the collection object to
    // ensure that the database object is not collected before the collection
    // object is
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &db))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *collObj, "_database",
            db))

    // transfer the ODPI-C collection handle to the new object
    coll->handle = baton->dpiSodaCollHandle;
    baton->dpiSodaCollHandle = NULL;

    // copy the database instance to the new object
    coll->db = (njsSodaDatabase*) baton->callingInstance;

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_processHintOption()
//   Utility function which processes the hint options passed through from
// Javascript and turns them into options expected by ODPI-C
//-----------------------------------------------------------------------------
static bool njsSodaCollection_processHintOption(njsBaton *baton, napi_env env,
        napi_value *args)
{
    if (!njsBaton_getStringFromArg(baton, env, args, 1, "hint", &baton->hint,
            &baton->hintLength, NULL))
        return false;
    if (baton->hintLength) {
        baton->sodaOperOptions = calloc(1, sizeof(dpiSodaOperOptions));
        if (!baton->sodaOperOptions)
            return njsBaton_setError(baton, errInsufficientMemory);
        baton->sodaOperOptions->hint = baton->hint;
        baton->sodaOperOptions->hintLength = (uint32_t) baton->hintLength;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_save()
//   Saves a single document into the collection.
//
// PARAMETERS
//   - SODA document
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_save, 1, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "Save", njsSodaCollection_saveAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_saveAsync()
//   Worker function for njsSodaCollection_save().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_saveAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_save(coll->handle, baton->dpiSodaDocHandle, flags,
            NULL) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_saveAndGet()
//   Saves a single document into the collection and then return a document
// containing metadata.
//
// PARAMETERS
//   - SODA document
//   - Options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_saveAndGet, 2, NULL)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsBaton_getGlobalSettings(baton, env, NJS_GLOBAL_ATTR_AUTOCOMMIT, 0))
        return false;
    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle))
        return false;
    return njsBaton_queueWork(baton, env, "SaveAndGet",
            njsSodaCollection_saveAndGetAsync,
            njsSodaCollection_saveAndGetPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_saveAndGetAsync()
//   Worker function for njsSodaCollection_saveAndGet().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_saveAndGetAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *resultDoc;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_saveWithOptions(coll->handle, baton->dpiSodaDocHandle,
            baton->sodaOperOptions ,flags, &resultDoc) < 0)
        return njsBaton_setErrorDPI(baton);
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = resultDoc;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_saveAndGetPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_saveAndGetPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    if (!njsSodaDocument_createFromHandle(env, baton->dpiSodaDocHandle,
            baton->globals, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_truncate()
//   Removes all of the documents from a collection.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsSodaCollection_truncate, 0, NULL)
{
    return njsBaton_queueWork(baton, env, "Truncate",
            njsSodaCollection_truncateAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_truncateAsync()
//   Worker function for njsSodaCollection_truncate().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_truncateAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (dpiSodaColl_truncate(coll->handle) < 0)
        return njsBaton_setErrorDPI(baton);
    return true;
}
