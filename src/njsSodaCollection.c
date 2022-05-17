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
static NJS_NAPI_METHOD(njsSodaCollection_createIndex);
static NJS_NAPI_METHOD(njsSodaCollection_drop);
static NJS_NAPI_METHOD(njsSodaCollection_dropIndex);
static NJS_NAPI_METHOD(njsSodaCollection_find);
static NJS_NAPI_METHOD(njsSodaCollection_getDataGuide);
static NJS_NAPI_METHOD(njsSodaCollection_insertMany);
static NJS_NAPI_METHOD(njsSodaCollection_insertManyAndGet);
static NJS_NAPI_METHOD(njsSodaCollection_insertOne);
static NJS_NAPI_METHOD(njsSodaCollection_insertOneAndGet);
static NJS_NAPI_METHOD(njsSodaCollection_save);
static NJS_NAPI_METHOD(njsSodaCollection_saveAndGet);
static NJS_NAPI_METHOD(njsSodaCollection_truncate);

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
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_dropIndexProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_insertManyProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_insertManyAndGetProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_insertOneAndGetProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_saveAndGetProcessArgs);

// getters
static NJS_NAPI_GETTER(njsSodaCollection_getMetaData);
static NJS_NAPI_GETTER(njsSodaCollection_getName);

// finalize
static NJS_NAPI_FINALIZE(njsSodaCollection_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_createIndex", NULL, njsSodaCollection_createIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "_drop", NULL, njsSodaCollection_drop, NULL, NULL, NULL,
            napi_default, NULL },
    { "_dropIndex", NULL, njsSodaCollection_dropIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "_find", NULL, njsSodaCollection_find, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getDataGuide", NULL, njsSodaCollection_getDataGuide, NULL, NULL, NULL,
            napi_default, NULL },
    { "_insertOne", NULL, njsSodaCollection_insertOne, NULL, NULL, NULL,
            napi_default, NULL },
    { "_insertOneAndGet", NULL, njsSodaCollection_insertOneAndGet, NULL, NULL,
            NULL, napi_default, NULL },
    { "_insertMany", NULL, njsSodaCollection_insertMany, NULL, NULL, NULL,
            napi_default, NULL },
    { "_insertManyAndGet", NULL, njsSodaCollection_insertManyAndGet, NULL,
            NULL, NULL, napi_default, NULL },
    { "_metaData", NULL, NULL, njsSodaCollection_getMetaData, NULL, NULL,
            napi_default, NULL },
    { "name", NULL, NULL, njsSodaCollection_getName, NULL, NULL, napi_default,
            NULL },
    { "_save", NULL, njsSodaCollection_save, NULL, NULL, NULL, napi_default,
            NULL },
    { "_saveAndGet", NULL, njsSodaCollection_saveAndGet, NULL, NULL, NULL,
            napi_default, NULL },
    { "_truncate", NULL, njsSodaCollection_truncate, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaCollection = {
    "SodaCollection", sizeof(njsSodaCollection), njsSodaCollection_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsSodaCollection_createBaton(napi_env env,
        napi_callback_info info, size_t numArgs, napi_value *args,
        njsBaton **baton);
static bool njsSodaCollection_processHintOption(njsBaton *baton,
        napi_env env, napi_value *args);

//-----------------------------------------------------------------------------
// njsSodaCollection_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsSodaCollection_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsSodaCollection *coll;
    njsBaton *tempBaton;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    coll = (njsSodaCollection*) tempBaton->callingInstance;
    tempBaton->oracleDb = coll->db->oracleDb;

    *baton = tempBaton;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_createIndex()
//   Creates an index on the SODA collection.
//
// PARAMETERS
//   - index spec
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_createIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsUtils_getStringArg(env, args, 0, &baton->indexSpec,
            &baton->indexSpecLength)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Drop",
            njsSodaCollection_createIndexAsync, NULL);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_createIndexAsync()
//   Worker function for njsSodaCollection_createIndex().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_createIndexAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaCollection_drop(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Drop", njsSodaCollection_dropAsync,
            njsSodaCollection_dropPostAsync);
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

    if (coll->db->oracleDb->autoCommit)
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
static napi_value njsSodaCollection_dropIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaCollection_dropIndexProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "DropIndex",
            njsSodaCollection_dropIndexAsync,
            njsSodaCollection_dropIndexPostAsync);
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

    if (coll->db->oracleDb->autoCommit)
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
// njsSodaCollection_dropIndexProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropIndexProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getStringArg(env, args, 0, &baton->name, &baton->nameLength))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 1, "force", &baton->force,
            NULL))
        return false;

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
static napi_value njsSodaCollection_find(napi_env env, napi_callback_info info)
{
    napi_value opObj, collObj;
    njsSodaCollection *coll;

    if (!njsUtils_validateArgs(env, info, 0, NULL, &collObj,
            (njsBaseInstance**) &coll))
        return NULL;
    if (!njsSodaOperation_createFromCollection(env, collObj, coll, &opObj))
        return NULL;

    return opObj;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getDataGuide()
//   Returns the data guide associated with the SODA collection.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_getDataGuide(napi_env env,
        napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "GetDataGuide",
            njsSodaCollection_getDataGuideAsync,
            njsSodaCollection_getDataGuidePostAsync);
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
            baton->oracleDb, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getMetaData()
//   Get accessor of "metaData" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_getMetaData(napi_env env,
        napi_callback_info info)
{
    njsSodaCollection *coll;
    uint32_t metadataLength;
    const char *metadata;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &coll))
        return NULL;
    if (dpiSodaColl_getMetadata(coll->handle, &metadata,
            &metadataLength) < 0) {
        njsUtils_throwErrorDPI(env, coll->db->oracleDb);
        return NULL;
    }

    return njsUtils_convertToString(env, metadata, metadataLength);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_getName()
//   Get accessor of "name" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_getName(napi_env env,
        napi_callback_info info)
{
    njsSodaCollection *coll;
    uint32_t nameLength;
    const char *name;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &coll))
        return NULL;
    if (dpiSodaColl_getName(coll->handle, &name, &nameLength) < 0) {
        njsUtils_throwErrorDPI(env, coll->db->oracleDb);
        return NULL;
    }

    return njsUtils_convertToString(env, name, nameLength);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertMany()
//   Inserts multiple documents into the collection at the same time.
//
// PARAMETERS
//   - array of SODA documents
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_insertMany(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsSodaCollection_insertManyProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "InsertMany",
            njsSodaCollection_insertManyAsync, NULL);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAsync()
//   Worker function for njsSodaCollection_insertMany().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaCollection_insertManyAndGet(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaCollection_insertManyAndGetProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "InsertManyAndGet",
            njsSodaCollection_insertManyAndGetAsync,
            njsSodaCollection_insertManyAndGetPostAsync);
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

    if (baton->oracleDb->autoCommit)
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
                baton->oracleDb, &temp))
            return false;
        baton->sodaDocs[i] = NULL;
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertManyAndGetProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertManyAndGetProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsSodaCollection_insertManyProcessArgs(baton, env, args))
        return false;

    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOne()
//   Inserts a single document into the collection.
//
// PARAMETERS
//   - SODA document
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_insertOne(napi_env env,
        napi_callback_info info)
{
    njsSodaCollection *coll;
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, args, &baton))
        return NULL;
    coll = (njsSodaCollection*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "InsertOne",
            njsSodaCollection_insertOneAsync, NULL);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAsync()
//   Worker function for njsSodaCollection_insertOne().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaCollection_insertOneAndGet(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaCollection_insertOneAndGetProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "InsertOneAndGet",
            njsSodaCollection_insertOneAndGetAsync,
            njsSodaCollection_insertOneAndGetPostAsync);
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

    if (baton->oracleDb->autoCommit)
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
            baton->oracleDb, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaColection_insertOneAndGetProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAndGetProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;

    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle)) {
        return false;
    }

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
            baton->oracleDb->jsSodaCollectionConstructor, collObj,
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
static napi_value njsSodaCollection_save(napi_env env, napi_callback_info info)
{
    njsSodaCollection *coll;
    napi_value args[1];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, args, &baton))
        return NULL;
    coll = (njsSodaCollection*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Save", njsSodaCollection_saveAsync,
            NULL);
}


//-----------------------------------------------------------------------------
// njsSodaCollection_saveAsync()
//   Worker function for njsSodaCollection_save().
//-----------------------------------------------------------------------------
static bool njsSodaCollection_saveAsync(njsBaton *baton)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->oracleDb->autoCommit)
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
static napi_value njsSodaCollection_saveAndGet(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsSodaCollection_saveAndGetProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "SaveAndGet",
            njsSodaCollection_saveAndGetAsync,
            njsSodaCollection_saveAndGetPostAsync);
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

    if (baton->oracleDb->autoCommit)
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
            baton->oracleDb, result))
        return false;
    baton->dpiSodaDocHandle = NULL;
    return true;
}

//-----------------------------------------------------------------------------
// njsSodaColection_saveAndGetProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_saveAndGetProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    njsSodaCollection *coll = (njsSodaCollection*) baton->callingInstance;

    if (!njsSodaCollection_processHintOption(baton, env, args))
        return false;

    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0],
            &baton->dpiSodaDocHandle)) {
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_truncate()
//   Removes all of the documents from a collection.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_truncate(napi_env env,
        napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Truncate",
            njsSodaCollection_truncateAsync, NULL);
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
