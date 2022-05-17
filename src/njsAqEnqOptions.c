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
//   njsAqEnqOptions.c
//
// DESCRIPTION
//   AqEnqOptions (Advanced Queuing Enqueue Options) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// getters
static NJS_NAPI_GETTER(njsAqEnqOptions_getDeliveryMode);
static NJS_NAPI_GETTER(njsAqEnqOptions_getTransformation);
static NJS_NAPI_GETTER(njsAqEnqOptions_getVisibility);

// setters
static NJS_NAPI_SETTER(njsAqEnqOptions_setDeliveryMode);
static NJS_NAPI_SETTER(njsAqEnqOptions_setTransformation);
static NJS_NAPI_SETTER(njsAqEnqOptions_setVisibility);

// finalize
static NJS_NAPI_FINALIZE(njsAqEnqOptions_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "deliveryMode", NULL, NULL, njsAqEnqOptions_getDeliveryMode,
            njsAqEnqOptions_setDeliveryMode, NULL, napi_enumerable, NULL },
    { "transformation", NULL, NULL, njsAqEnqOptions_getTransformation,
            njsAqEnqOptions_setTransformation, NULL, napi_enumerable, NULL },
    { "visibility", NULL, NULL, njsAqEnqOptions_getVisibility,
            njsAqEnqOptions_setVisibility, NULL, napi_enumerable, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqEnqOptions = {
    "AqEnqOptions", sizeof(njsAqEnqOptions), njsAqEnqOptions_finalize,
    njsClassProperties, NULL, true
};


//-----------------------------------------------------------------------------
// njsAqEnqOptions_finalize()
//   Invoked when the njsAqEnqOptions object is garbage collected.
//-----------------------------------------------------------------------------
static void njsAqEnqOptions_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) finalizeData;

    if (options->handle) {
        dpiEnqOptions_release(options->handle);
        options->handle = NULL;
    }
    free(options);
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_getDeliveryMode()
//   Get accessor of "deliveryMode" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_getDeliveryMode(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, options->deliveryMode);
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_getTransformation()
//   Get accessor of "transformation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_getTransformation(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;
    uint32_t valueLength;
    const char *value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    if (dpiEnqOptions_getTransformation(options->handle, &value,
            &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_getVisibility()
//   Get accessor of "visibility" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_getVisibility(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;
    uint32_t value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    if (dpiEnqOptions_getVisibility(options->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setDeliveryMode()
//   Set accessor of "deliveryMode" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_setDeliveryMode(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;
    napi_value valueObj;
    uint32_t value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &valueObj))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, valueObj, "deliveryMode", &value))
        return NULL;
    if (dpiEnqOptions_setDeliveryMode(options->handle, (uint16_t) value) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    options->deliveryMode = (uint16_t) value;
    return NULL;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setTransformation()
//   Set accessor of "transformation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_setTransformation(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;
    napi_value valueObj;
    size_t valueLength;
    char *value = NULL;
    int status;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &valueObj))
        return NULL;
    if (!njsUtils_setPropString(env, valueObj, "transformation", &value,
            &valueLength))
        return NULL;
    status = dpiEnqOptions_setTransformation(options->handle, value,
            (uint32_t) valueLength);
    free(value);
    if (status < 0)
        njsUtils_throwErrorDPI(env, options->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setVisibility()
//   Set accessor of "visibility" property.
//-----------------------------------------------------------------------------
static napi_value njsAqEnqOptions_setVisibility(napi_env env,
        napi_callback_info info)
{
    njsAqEnqOptions *options;
    napi_value valueObj;
    uint32_t value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &valueObj))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, valueObj, "visibliity", &value))
        return NULL;
    if (dpiEnqOptions_setVisibility(options->handle, value) < 0)
        njsUtils_throwErrorDPI(env, options->oracleDb);
    return NULL;
}
