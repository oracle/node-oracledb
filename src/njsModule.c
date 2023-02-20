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
// njsModule_extendClass()
//   Extends a class defined in JavaScript.
//-----------------------------------------------------------------------------
static bool njsModule_extendClass(napi_env env, napi_value module,
        njsModuleGlobals *globals, const njsClassDef *classDef,
        napi_ref *clsRef)
{
    size_t numProperties, numBaseProperties, i;
    napi_property_descriptor *allProperties;
    napi_value cls, prototype, tempInstance;

    // get the class from the module
    NJS_CHECK_NAPI(env, napi_get_named_property(env, module, classDef->name,
            &cls))

    // create a new instance of the class (temporarily) and get its prototype
    NJS_CHECK_NAPI(env, napi_new_instance(env, cls, 0, NULL, &tempInstance))
    NJS_CHECK_NAPI(env, napi_get_prototype(env, tempInstance, &prototype))

    // scan each of the class properties and constants to get the total number
    // of properties to define
    numProperties = 0;
    if (!classDef->propertiesOnInstance) {
        for (i = 0; classDef->properties[i].utf8name; i++, numProperties++);
    }
    numBaseProperties = numProperties;

    // perform define if any properties are present
    if (numProperties > 0) {

        // allocate memory for all of the properties
        allProperties = calloc(numProperties,
                sizeof(napi_property_descriptor));
        if (!allProperties)
            return njsUtils_throwError(env, errInsufficientMemory);

        // populate the properties
        memcpy(allProperties, classDef->properties,
                sizeof(napi_property_descriptor) * numBaseProperties);

        // store the instance on each of the properties as a convenience
        for (i = 0; i < numProperties; i++)
            allProperties[i].data = globals;

        // define the properties on the prototype
        if (napi_define_properties(env, prototype, numProperties,
                allProperties) != napi_ok) {
            free(allProperties);
            return njsUtils_genericThrowError(env);
        }
        free(allProperties);

    }

    // store a reference to the constructor for later use
    NJS_CHECK_NAPI(env, napi_create_reference(env, cls, 1, clsRef))

    return true;
}


//-----------------------------------------------------------------------------
// njsModule_finalizeGlobals()
//   Called when the module object goes out of scope and cleans up module
// globals.
// -----------------------------------------------------------------------------
static void njsModule_finalizeGlobals(napi_env env, void *finalize_data,
        void *finalize_hint)
{
    njsModuleGlobals *globals = (njsModuleGlobals*) finalize_data;

    if (globals->context) {
        dpiContext_destroy(globals->context);
        globals->context = NULL;
    }
    NJS_DELETE_REF_AND_CLEAR(globals->jsAqDeqOptionsConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsAqEnqOptionsConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsAqMessageConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsAqQueueConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsBaseDbObjectConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsConnectionConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsLobConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsPoolConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsResultSetConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSodaCollectionConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSodaDatabaseConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSodaDocCursorConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSodaDocumentConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSodaOperationConstructor);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSubscriptions);
    NJS_DELETE_REF_AND_CLEAR(globals->jsSettings);
    free(globals);
}


//-----------------------------------------------------------------------------
// njsModule_populateGlobals()
//   Populates the module globals used throughout the module. This includes
// extending the classes defined in JavaScript and storing references to the
// constructors for later use. It also includes keeping a reference to the
// global settings found in JavaScript and an object that stores active
// subscriptions.
//-----------------------------------------------------------------------------
static bool njsModule_populateGlobals(napi_env env, napi_value module,
        napi_value settings, njsModuleGlobals *globals)
{
    dpiVersionInfo versionInfo;
    char versionString[40];
    napi_value temp;

    // extend classes
    if (!njsModule_extendClass(env, module, globals, &njsClassDefAqDeqOptions,
            &globals->jsAqDeqOptionsConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefAqEnqOptions,
            &globals->jsAqEnqOptionsConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefAqMessage,
            &globals->jsAqMessageConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefAqQueue,
            &globals->jsAqQueueConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefBaseDbObject,
            &globals->jsBaseDbObjectConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefConnection,
            &globals->jsConnectionConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefLob,
            &globals->jsLobConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefPool,
            &globals->jsPoolConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefResultSet,
            &globals->jsResultSetConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals,
            &njsClassDefSodaCollection, &globals->jsSodaCollectionConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefSodaDatabase,
            &globals->jsSodaDatabaseConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefSodaDocCursor,
            &globals->jsSodaDocCursorConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefSodaDocument,
            &globals->jsSodaDocumentConstructor))
        return false;
    if (!njsModule_extendClass(env, module, globals, &njsClassDefSodaOperation,
            &globals->jsSodaOperationConstructor))
        return false;

    // create reference to global settings
    NJS_CHECK_NAPI(env, napi_create_reference(env, settings, 1,
            &globals->jsSettings))

    // acquire Oracle client version and store this in the settings object
    if (dpiContext_getClientVersion(globals->context, &versionInfo) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, versionInfo.fullVersionNum,
            &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, settings,
            "oracleClientVersion", temp))
    (void) snprintf(versionString, sizeof(versionString), "%d.%d.%d.%d.%d",
            versionInfo.versionNum, versionInfo.releaseNum,
            versionInfo.updateNum, versionInfo.portReleaseNum,
            versionInfo.portUpdateNum);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, versionString,
            strlen(versionString), &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, settings,
            "oracleClientVersionString", temp))

    // create object for storing subscriptions
    NJS_CHECK_NAPI(env, napi_create_object(env, &temp))
    NJS_CHECK_NAPI(env, napi_create_reference(env, temp, 1,
            &globals->jsSubscriptions))

    return true;
}


//-----------------------------------------------------------------------------
// njsModule_initDPI()
//   Initialize the ODPI-C library. This is done when the first standalone
// connection or session pool is created, or when a call to initOracleClient()
// is made, rather than when the module is first imported so that manipulating
// Oracle environment variables will work as expected. It also has the
// additional benefit of reducing the number of errors that can take place when
// the module is imported.
// -----------------------------------------------------------------------------
static bool njsModule_initDPI(napi_env env, napi_value *args,
        njsModuleGlobals *globals, char **libDir, size_t *libDirLength,
        char **configDir, size_t *configDirLength, char **errorUrl,
        size_t *errorUrlLength, char **driverName, size_t *driverNameLength)
{
    dpiContextCreateParams params;
    napi_value error, message;
    dpiErrorInfo errorInfo;

    // get any arguments from JavaScript
    if (!njsUtils_getStringFromArg(env, args, 0, "libDir", libDir,
            libDirLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "configDir", configDir,
            configDirLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "errorUrl", errorUrl,
            errorUrlLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "driverName", driverName,
            driverNameLength, NULL, NULL))
        return false;

    // initialize structure
    memset(&params, 0, sizeof(params));
    if (*libDirLength > 0)
        params.oracleClientLibDir = *libDir;
    if (*configDirLength > 0)
        params.oracleClientConfigDir = *configDir;
    if (*errorUrlLength > 0)
        params.loadErrorUrl = *errorUrl;
    if (*driverNameLength > 0)
        params.defaultDriverName = *driverName;

    // perform ODPI-C initialization
    if (dpiContext_createWithParams(DPI_MAJOR_VERSION, DPI_MINOR_VERSION,
            &params, &globals->context, &errorInfo) < 0) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, errorInfo.message,
                errorInfo.messageLength, &message))
        NJS_CHECK_NAPI(env, napi_create_error(env, NULL, message, &error))
        NJS_CHECK_NAPI(env, napi_throw(env, error))
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsModule_initOracleClient()
//   Initialize the Oracle Client library.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
static napi_value njsModule_initOracleClient(napi_env env,
        napi_callback_info info)
{
    size_t libDirLength, configDirLength, errorUrlLength, driverNameLength;
    char *libDir, *configDir, *errorUrl, *driverName;
    njsModuleGlobals *globals;
    napi_value args[3];
    bool ok;

    // iniitialize ODPI-C
    libDir = configDir = errorUrl = driverName = NULL;
    libDirLength = configDirLength = errorUrlLength = driverNameLength = 0;
    if (!njsUtils_validateArgs(env, info, 3, args, &globals, NULL, NULL))
        return NULL;
    ok = njsModule_initDPI(env, args, globals, &libDir, &libDirLength,
            &configDir, &configDirLength, &errorUrl, &errorUrlLength,
            &driverName, &driverNameLength);
    if (libDir)
        free(libDir);
    if (configDir)
        free(configDir);
    if (errorUrl)
        free(errorUrl);
    if (driverName)
        free(driverName);
    if (!ok)
        return NULL;

    // extend classes
    njsModule_populateGlobals(env, args[1], args[2], globals);

    return NULL;
}


//-----------------------------------------------------------------------------
// njsModule_initHelper()
//   Initializer helper for the module. This defines the items exported by the
// module. A helper function is used to be able to take advantage of the
// NJS_CHECK_NAPI function and simplify code.
// -----------------------------------------------------------------------------
static bool njsModule_initHelper(napi_env env, napi_value exports)
{
    njsModuleGlobals *globals;
    napi_value fn, jsGlobals;

    // create module globals and store an "external" object in JavaScript to
    // prevent it from being collected; this value is also stored on every
    // function definition so that it can be directly referenced
    globals = calloc(1, sizeof(njsModuleGlobals));
    if (!globals)
        return njsUtils_throwError(env, errInsufficientMemory);
    NJS_CHECK_NAPI(env, napi_create_external(env, globals,
            njsModule_finalizeGlobals, NULL, &jsGlobals))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, exports, "_globals",
            jsGlobals))

    // define function for initializing the Oracle client
    NJS_CHECK_NAPI(env, napi_create_function(env, "initOracleClient",
            NAPI_AUTO_LENGTH, njsModule_initOracleClient, globals, &fn))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, exports,
            "initOracleClient", fn))

    return true;
}


//-----------------------------------------------------------------------------
// njsModule_init()
//   Initializer for the module. This defines the items exported by the module.
//-----------------------------------------------------------------------------
static napi_value njsModule_init(napi_env env, napi_value exports)
{
    if (!njsModule_initHelper(env, exports))
        return NULL;

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, njsModule_init)
