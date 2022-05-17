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
//   njsModule.c
//
// DESCRIPTION
//   Top-level module implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

//-----------------------------------------------------------------------------
// njsModule_externalInit()
//   Called by the JavaScript library to initialize the library. This extends
// each of the classes defined in the JavaScript library by adding constants
// and methods.
//-----------------------------------------------------------------------------
static napi_value njsModule_externalInit(napi_env env, napi_callback_info info)
{
    napi_value instance, thisArg;
    njsOracleDb *oracleDb;
    size_t actualArgs = 1;

    // verify that the OracleDb instance has been passed through
    if (napi_get_cb_info(env, info, &actualArgs, &instance, &thisArg,
            NULL) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    if (actualArgs != 1) {
        njsUtils_throwError(env, errInvalidNumberOfParameters, actualArgs, 1);
        return NULL;
    }

    // perform initializations for C structure
    if (!njsOracleDb_new(env, instance, &oracleDb))
        return NULL;

    // prepare classes for use
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefOracleDb, NULL))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefAqDeqOptions, &oracleDb->jsAqDeqOptionsConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefAqEnqOptions, &oracleDb->jsAqEnqOptionsConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefAqMessage, &oracleDb->jsAqMessageConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefAqQueue, &oracleDb->jsAqQueueConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefBaseDbObject, &oracleDb->jsBaseDbObjectConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefConnection, &oracleDb->jsConnectionConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefPool, &oracleDb->jsPoolConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefLob, &oracleDb->jsLobConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefResultSet, &oracleDb->jsResultSetConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefSodaDatabase, &oracleDb->jsSodaDatabaseConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefSodaCollection,
            &oracleDb->jsSodaCollectionConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefSodaDocCursor, &oracleDb->jsSodaDocCursorConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefSodaDocument, &oracleDb->jsSodaDocumentConstructor))
        return NULL;
    if (!njsOracleDb_prepareClass(oracleDb, env, instance,
            &njsClassDefSodaOperation, &oracleDb->jsSodaOperationConstructor))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsModule_init()
//   Initializer for the module. This defines all of the property and methods
// exported by the module.
//-----------------------------------------------------------------------------
static napi_value njsModule_init(napi_env env, napi_value exports)
{
    napi_value fn;

    // define function for initializing classes
    if (napi_create_function(env, "init", NAPI_AUTO_LENGTH,
            njsModule_externalInit, NULL, &fn) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    if (napi_set_named_property(env, exports, "init", fn) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, njsModule_init)
