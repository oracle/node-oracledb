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
//   njsAqDeqOptions.c
//
// DESCRIPTION
//   AqDeqOptions (Advanced Queuing Dequeue Options) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// getters
static NJS_NAPI_GETTER(njsAqDeqOptions_getCondition);
static NJS_NAPI_GETTER(njsAqDeqOptions_getConsumerName);
static NJS_NAPI_GETTER(njsAqDeqOptions_getCorrelation);
static NJS_NAPI_GETTER(njsAqDeqOptions_getMode);
static NJS_NAPI_GETTER(njsAqDeqOptions_getMsgId);
static NJS_NAPI_GETTER(njsAqDeqOptions_getNavigation);
static NJS_NAPI_GETTER(njsAqDeqOptions_getTransformation);
static NJS_NAPI_GETTER(njsAqDeqOptions_getVisibility);
static NJS_NAPI_GETTER(njsAqDeqOptions_getWait);

// setters
static NJS_NAPI_SETTER(njsAqDeqOptions_setCondition);
static NJS_NAPI_SETTER(njsAqDeqOptions_setConsumerName);
static NJS_NAPI_SETTER(njsAqDeqOptions_setCorrelation);
static NJS_NAPI_SETTER(njsAqDeqOptions_setMode);
static NJS_NAPI_SETTER(njsAqDeqOptions_setMsgId);
static NJS_NAPI_SETTER(njsAqDeqOptions_setNavigation);
static NJS_NAPI_SETTER(njsAqDeqOptions_setTransformation);
static NJS_NAPI_SETTER(njsAqDeqOptions_setVisibility);
static NJS_NAPI_SETTER(njsAqDeqOptions_setWait);

// finalize
static NJS_NAPI_FINALIZE(njsAqDeqOptions_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "condition", NULL, NULL, njsAqDeqOptions_getCondition,
            njsAqDeqOptions_setCondition, NULL, napi_enumerable, NULL },
    { "consumerName", NULL, NULL, njsAqDeqOptions_getConsumerName,
            njsAqDeqOptions_setConsumerName, NULL, napi_enumerable, NULL },
    { "correlation", NULL, NULL, njsAqDeqOptions_getCorrelation,
            njsAqDeqOptions_setCorrelation, NULL, napi_enumerable, NULL },
    { "mode", NULL, NULL, njsAqDeqOptions_getMode, njsAqDeqOptions_setMode,
            NULL, napi_enumerable, NULL },
    { "msgId", NULL, NULL, njsAqDeqOptions_getMsgId, njsAqDeqOptions_setMsgId,
            NULL, napi_enumerable, NULL },
    { "navigation", NULL, NULL, njsAqDeqOptions_getNavigation,
            njsAqDeqOptions_setNavigation, NULL, napi_enumerable, NULL },
    { "transformation", NULL, NULL, njsAqDeqOptions_getTransformation,
            njsAqDeqOptions_setTransformation, NULL, napi_enumerable, NULL },
    { "visibility", NULL, NULL, njsAqDeqOptions_getVisibility,
            njsAqDeqOptions_setVisibility, NULL, napi_enumerable, NULL },
    { "wait", NULL, NULL, njsAqDeqOptions_getWait, njsAqDeqOptions_setWait,
            NULL, napi_enumerable, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqDeqOptions = {
    "AqDeqOptions", sizeof(njsAqDeqOptions), njsAqDeqOptions_finalize,
    njsClassProperties, NULL, true
};

// other methods used internally
static napi_value njsAqDeqOptions_getTextAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiDeqOptions*, const char **, uint32_t *));
static napi_value njsAqDeqOptions_getUnsignedIntAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiDeqOptions*, uint32_t *));
static napi_value njsAqDeqOptions_setTextAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiDeqOptions*, const char *, uint32_t));
static napi_value njsAqDeqOptions_setUnsignedIntAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiDeqOptions*, uint32_t));


//-----------------------------------------------------------------------------
// njsAqDeqOptions_finalize()
//   Invoked when the njsAqDeqOptions object is garbage collected.
//-----------------------------------------------------------------------------
static void njsAqDeqOptions_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) finalizeData;

    if (options->handle) {
        dpiDeqOptions_release(options->handle);
        options->handle = NULL;
    }
    free(options);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getCondition()
//   Get accessor of "condition" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getCondition(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getTextAttribute(env, info,
            dpiDeqOptions_getCondition);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getConsumerName()
//   Get accessor of "consumerName" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getConsumerName(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getTextAttribute(env, info,
            dpiDeqOptions_getConsumerName);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getCorrelation()
//   Get accessor of "correlation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getCorrelation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getTextAttribute(env, info,
            dpiDeqOptions_getCorrelation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getMode()
//   Get accessor of "mode" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getMode(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getUnsignedIntAttribute(env, info,
            dpiDeqOptions_getMode);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getMsgId()
//   Get accessor of "msgId" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getMsgId(napi_env env,
        napi_callback_info info)
{
    njsAqDeqOptions *options;
    uint32_t valueLength;
    const char *value;
    napi_value result;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    if (dpiDeqOptions_getMsgId(options->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    if (napi_create_buffer_copy(env, valueLength, value, NULL,
            &result) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return result;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getNavigation()
//   Get accessor of "navigation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getNavigation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getUnsignedIntAttribute(env, info,
            dpiDeqOptions_getNavigation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getTextAttribute()
//   Get accessor of text properties.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getTextAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiDeqOptions*, const char **, uint32_t *))
{
    njsAqDeqOptions *options;
    uint32_t valueLength;
    const char *value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    if ((*getter)(options->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getTransformation()
//   Get accessor of "transformation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getTransformation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getTextAttribute(env, info,
            dpiDeqOptions_getTransformation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getUnsignedIntAttribute()
//   Get accessor of unsigned integer properties.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getUnsignedIntAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiDeqOptions*, uint32_t *))
{
    njsAqDeqOptions *options;
    uint32_t value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &options))
        return NULL;
    if ((*getter)(options->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, options->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getVisibility()
//   Get accessor of "visibility" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getVisibility(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getUnsignedIntAttribute(env, info,
            dpiDeqOptions_getVisibility);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getWait()
//   Get accessor of "wait" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_getWait(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_getUnsignedIntAttribute(env, info,
            dpiDeqOptions_getWait);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setCondition()
//   Set accessor of "condition" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setCondition(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setTextAttribute(env, info, "condition",
            dpiDeqOptions_setCondition);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setConsumerName()
//   Set accessor of "consumerName" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setConsumerName(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setTextAttribute(env, info, "consumerName",
            dpiDeqOptions_setConsumerName);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setCorrelation()
//   Set accessor of "correlation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setCorrelation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setTextAttribute(env, info, "correlation",
            dpiDeqOptions_setCorrelation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setMode()
//   Set accessor of "mode" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setMode(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setUnsignedIntAttribute(env, info, "mode",
            dpiDeqOptions_setMode);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setMsgId()
//   Set accessor of "msgId" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setMsgId(napi_env env,
        napi_callback_info info)
{
    njsAqDeqOptions *options;
    size_t bufferLength;
    napi_value value;
    void *buffer;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &value))
        return NULL;
    if (!njsUtils_isBuffer(env, value)) {
        njsUtils_throwError(env, errInvalidPropertyValue, "msgId");
        return NULL;
    }
    if (napi_get_buffer_info(env, value, &buffer, &bufferLength) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    if (dpiDeqOptions_setMsgId(options->handle, buffer,
            (uint32_t) bufferLength) < 0)
        njsUtils_throwErrorDPI(env, options->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setNavigation()
//   Set accessor of "navigation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setNavigation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setUnsignedIntAttribute(env, info, "navigation",
            dpiDeqOptions_setNavigation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setTextAttribute()
//   Set accessor of text properties.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setTextAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiDeqOptions*, const char *, uint32_t))
{
    njsAqDeqOptions *options;
    size_t bufferLength;
    napi_value value;
    char *buffer;
    int status;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &value))
        return NULL;
    buffer = NULL;
    if (!njsUtils_setPropString(env, value, attributeName, &buffer,
            &bufferLength))
        return NULL;
    status = (*setter)(options->handle, buffer, (uint32_t) bufferLength);
    free(buffer);
    if (status < 0)
        njsUtils_throwErrorDPI(env, options->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setTransformation()
//   Set accessor of "transformation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setTransformation(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setTextAttribute(env, info, "transformation",
            dpiDeqOptions_setTransformation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setUnsignedIntAttribute()
//   Set accessor of unsigned integer properties.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setUnsignedIntAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiDeqOptions*, uint32_t))
{
    njsAqDeqOptions *options;
    napi_value valueObj;
    uint32_t value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &options,
            &valueObj))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, valueObj, attributeName, &value))
        return NULL;
    if ((*setter)(options->handle, value) < 0)
        njsUtils_throwErrorDPI(env, options->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setVisibility()
//   Set accessor of "visibility" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setVisibility(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setUnsignedIntAttribute(env, info, "visibility",
            dpiDeqOptions_setVisibility);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setWait()
//   Set accessor of "wait" property.
//-----------------------------------------------------------------------------
static napi_value njsAqDeqOptions_setWait(napi_env env,
        napi_callback_info info)
{
    return njsAqDeqOptions_setUnsignedIntAttribute(env, info, "wait",
            dpiDeqOptions_setWait);
}
