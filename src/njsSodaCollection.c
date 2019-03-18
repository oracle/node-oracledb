// Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved.

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
static NJS_NAPI_METHOD(njsSodaCollection_insertOne);
static NJS_NAPI_METHOD(njsSodaCollection_insertOneAndGet);

// asynchronous methods
static NJS_ASYNC_METHOD(njsSodaCollection_createIndexAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_dropAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_dropIndexAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_getDataGuideAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertOneAsync);
static NJS_ASYNC_METHOD(njsSodaCollection_insertOneAndGetAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsSodaCollection_dropPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_dropIndexPostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_getDataGuidePostAsync);
static NJS_ASYNC_POST_METHOD(njsSodaCollection_insertOneAndGetPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsSodaCollection_dropIndexProcessArgs);

// getters
static NJS_NAPI_GETTER(njsSodaCollection_getMetaData);
static NJS_NAPI_GETTER(njsSodaCollection_getName);

// setters
static NJS_NAPI_SETTER(njsSodaCollection_setMetaData);
static NJS_NAPI_SETTER(njsSodaCollection_setName);

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
    { "metaData", NULL, NULL, njsSodaCollection_getMetaData,
            njsSodaCollection_setMetaData, NULL, napi_default, NULL },
    { "name", NULL, NULL, njsSodaCollection_getName,
            njsSodaCollection_setName, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaCollection = {
    "SodaCollection", sizeof(njsSodaCollection), njsSodaCollection_finalize,
    njsClassProperties, NULL
};

// other methods used internally
static bool njsSodaCollection_createBaton(napi_env env,
        napi_callback_info info, size_t numArgs, napi_value *args,
        njsBaton **baton);


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
//   - JS callback which will receive (error, result)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_createIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsUtils_getStringArg(env, args, 0, &baton->indexSpec,
            &baton->indexSpecLength)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    njsBaton_queueWork(baton, env, "Drop", njsSodaCollection_createIndexAsync,
            NULL, 1);
    return NULL;
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
            baton->indexSpecLength, flags) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_drop()
//   Drops the collection from the database.
//
// PARAMETERS
//   - JS callback which will receive (error, result)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_drop(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, NULL, &baton))
        return NULL;
    njsBaton_queueWork(baton, env, "Drop", njsSodaCollection_dropAsync,
            njsSodaCollection_dropPostAsync, 2);
    return NULL;
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
//   Creates the result object which is returned to the JS application.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropPostAsync(njsBaton *baton,
        napi_env env, napi_value *args)
{
    napi_value result, isDropped;

    NJS_CHECK_NAPI(env, napi_create_object(env, &result))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->isDropped, &isDropped))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, result, "dropped",
            isDropped))

    args[1] = result;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropIndex()
//   Drops an index of a SODA collection.
//
// PARAMETERS
//   - name
//   - options
//   - JS callback which will receive (error, result)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_dropIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsSodaCollection_dropIndexProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    njsBaton_queueWork(baton, env, "DropIndex",
            njsSodaCollection_dropIndexAsync,
            njsSodaCollection_dropIndexPostAsync, 2);
    return NULL;
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
    if (dpiSodaColl_dropIndex(coll->handle, baton->name, baton->nameLength,
            flags, &isDropped) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->isDropped = (bool) isDropped;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_dropIndexPostAsync()
//   Creates the result object which is returned to the JS application.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_dropIndexPostAsync(njsBaton *baton,
        napi_env env, napi_value *args)
{
    napi_value result, isDropped;

    NJS_CHECK_NAPI(env, napi_create_object(env, &result))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->isDropped, &isDropped))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, result, "dropped",
            isDropped))

    args[1] = result;
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
// PARAMETERS
//   - JS callback which will receive (error, document)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_getDataGuide(napi_env env,
        napi_callback_info info)
{
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 1, NULL, &baton))
        return NULL;
    njsBaton_queueWork(baton, env, "GetDataGuide",
            njsSodaCollection_getDataGuideAsync,
            njsSodaCollection_getDataGuidePostAsync, 2);
    return NULL;
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
//   Creates the result object which is returned to the JS application.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_getDataGuidePostAsync(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsSodaDocument_createFromHandle(env, baton->dpiSodaDocHandle,
            baton->oracleDb, &args[1]))
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
// njsSodaCollection_insertOne()
//   Inserts a single document into the collection.
//
// PARAMETERS
//   - SODA document
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_insertOne(napi_env env,
        napi_callback_info info)
{
    njsSodaCollection *coll;
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    coll = (njsSodaCollection*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0])) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    njsBaton_queueWork(baton, env, "InsertOne",
            njsSodaCollection_insertOneAsync, NULL, 1);
    return NULL;
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
//   - JS callback which will receive (error, document)
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_insertOneAndGet(napi_env env,
        napi_callback_info info)
{
    njsSodaCollection *coll;
    napi_value args[2];
    njsBaton *baton;

    if (!njsSodaCollection_createBaton(env, info, 2, args, &baton))
        return NULL;
    coll = (njsSodaCollection*) baton->callingInstance;
    if (!njsBaton_getSodaDocument(baton, coll->db, env, args[0])) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    njsBaton_queueWork(baton, env, "InsertOneAndGet",
            njsSodaCollection_insertOneAndGetAsync,
            njsSodaCollection_insertOneAndGetPostAsync, 2);
    return NULL;
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
    if (dpiSodaColl_insertOne(coll->handle, baton->dpiSodaDocHandle, flags,
            &resultDoc) < 0)
        return njsBaton_setErrorDPI(baton);
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = resultDoc;
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_insertOneAndGetPostAsync()
//   Creates the result object which is returned to the JS application.
//-----------------------------------------------------------------------------
static bool njsSodaCollection_insertOneAndGetPostAsync(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsSodaDocument_createFromHandle(env, baton->dpiSodaDocHandle,
            baton->oracleDb, &args[1]))
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
            baton->oracleDb->jsSodaCollectionConstructor, collObj,
            (njsBaseInstance**) &coll))
        return false;

    // store a copy of the database instance on the collection object to
    // ensure that the database object is not collected before the collection
    // object is
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObj,
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
// njsSodaCollection_setMetaData()
//   Set accessor of "metaData" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_setMetaData(napi_env env,
        napi_callback_info info)
{
    njsUtils_throwError(env, errReadOnly, "metaData");
    return NULL;
}


//-----------------------------------------------------------------------------
// njsSodaCollection_setName()
//   Set accessor of "name" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaCollection_setName(napi_env env,
        napi_callback_info info)
{
    njsUtils_throwError(env, errReadOnly, "name");
    return NULL;
}
