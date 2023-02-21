// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

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
//   njsAqDeqOptions.c
//
// DESCRIPTION
//   AqDeqOptions (Advanced Queuing Dequeue Options) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getCondition);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getConsumerName);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getCorrelation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getMode);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getMsgId);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getNavigation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getTransformation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getVisibility);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_getWait);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setCondition);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setConsumerName);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setCorrelation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setMode);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setMsgId);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setNavigation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setTransformation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setVisibility);
NJS_NAPI_METHOD_DECL_SYNC(njsAqDeqOptions_setWait);

// finalize
static NJS_NAPI_FINALIZE(njsAqDeqOptions_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "getCondition", NULL, njsAqDeqOptions_getCondition, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getConsumerName", NULL, njsAqDeqOptions_getConsumerName, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "getCorrelation", NULL, njsAqDeqOptions_getCorrelation, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getMode", NULL, njsAqDeqOptions_getMode, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getMsgId", NULL, njsAqDeqOptions_getMsgId, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getNavigation", NULL, njsAqDeqOptions_getNavigation, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getTransformation", NULL, njsAqDeqOptions_getTransformation, NULL,
            NULL, NULL, napi_enumerable, NULL },
    { "getVisibility", NULL, njsAqDeqOptions_getVisibility, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getWait", NULL, njsAqDeqOptions_getWait, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setCondition", NULL, njsAqDeqOptions_setCondition, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setConsumerName", NULL, njsAqDeqOptions_setConsumerName, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "setCorrelation", NULL, njsAqDeqOptions_setCorrelation, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setMode", NULL, njsAqDeqOptions_setMode, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setMsgId", NULL, njsAqDeqOptions_setMsgId, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setNavigation", NULL, njsAqDeqOptions_setNavigation, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setTransformation", NULL, njsAqDeqOptions_setTransformation, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "setVisibility", NULL, njsAqDeqOptions_setVisibility, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setWait", NULL, njsAqDeqOptions_setWait, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqDeqOptions = {
    "AqDeqOptionsImpl", sizeof(njsAqDeqOptions), njsAqDeqOptions_finalize,
    njsClassProperties, true
};

// other methods used internally
static bool njsAqDeqOptions_getTextAttribute(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance,
        int (*getter)(dpiDeqOptions*, const char **, uint32_t *),
        napi_value *returnValue);
static bool njsAqDeqOptions_setTextAttribute(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance, napi_value value,
        int (*setter)(dpiDeqOptions*, const char *, uint32_t));


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
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getCondition, 0, NULL)
{
    return njsAqDeqOptions_getTextAttribute(env, globals, callingInstance,
            dpiDeqOptions_getCondition, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getConsumerName()
//   Get accessor of "consumerName" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getConsumerName, 0, NULL)
{
    return njsAqDeqOptions_getTextAttribute(env, globals, callingInstance,
            dpiDeqOptions_getConsumerName, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getCorrelation()
//   Get accessor of "correlation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getCorrelation, 0, NULL)
{
    return njsAqDeqOptions_getTextAttribute(env, globals, callingInstance,
            dpiDeqOptions_getCorrelation, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getMode()
//   Get accessor of "mode" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getMode, 0, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    if (dpiDeqOptions_getMode(options->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getMsgId()
//   Get accessor of "msgId" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getMsgId, 0, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiDeqOptions_getMsgId(options->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, valueLength, value, NULL,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getNavigation()
//   Get accessor of "navigation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getNavigation, 0, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    if (dpiDeqOptions_getNavigation(options->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getTextAttribute()
//   Get accessor of text properties.
//-----------------------------------------------------------------------------
static bool njsAqDeqOptions_getTextAttribute(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance,
        int (*getter)(dpiDeqOptions*, const char **, uint32_t *),
        napi_value *returnValue)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) instance;
    uint32_t valueLength;
    const char *value;

    if ((*getter)(options->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getTransformation()
//   Get accessor of "transformation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getTransformation, 0, NULL)
{
    return njsAqDeqOptions_getTextAttribute(env, globals, callingInstance,
            dpiDeqOptions_getTransformation, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getVisibility()
//   Get accessor of "visibility" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getVisibility, 0, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    if (dpiDeqOptions_getVisibility(options->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_getWait()
//   Get accessor of "wait" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_getWait, 0, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    if (dpiDeqOptions_getWait(options->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setCondition()
//   Set accessor of "condition" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setCondition, 1, NULL)
{
    return njsAqDeqOptions_setTextAttribute(env, globals, callingInstance,
            args[0], dpiDeqOptions_setCondition);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setConsumerName()
//   Set accessor of "consumerName" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setConsumerName, 1, NULL)
{
    return njsAqDeqOptions_setTextAttribute(env, globals, callingInstance,
            args[0], dpiDeqOptions_setConsumerName);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setCorrelation()
//   Set accessor of "correlation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setCorrelation, 1, NULL)
{
    return njsAqDeqOptions_setTextAttribute(env, globals, callingInstance,
            args[0], dpiDeqOptions_setCorrelation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setMode()
//   Set accessor of "mode" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setMode, 1, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiDeqOptions_setMode(options->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setMsgId()
//   Set accessor of "msgId" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setMsgId, 1, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    size_t bufferLength;
    void *buffer;

    NJS_CHECK_NAPI(env, napi_get_buffer_info(env, args[0], &buffer,
            &bufferLength))
    if (dpiDeqOptions_setMsgId(options->handle, buffer,
            (uint32_t) bufferLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setNavigation()
//   Set accessor of "navigation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setNavigation, 1, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiDeqOptions_setNavigation(options->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setTextAttribute()
//   Set accessor of text properties.
//-----------------------------------------------------------------------------
static bool njsAqDeqOptions_setTextAttribute(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance, napi_value value,
        int (*setter)(dpiDeqOptions*, const char *, uint32_t))
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) instance;
    size_t bufferLength;
    char *buffer = NULL;
    int status;

    if (!njsUtils_copyStringFromJS(env, value, &buffer, &bufferLength))
        return false;
    status = (*setter)(options->handle, buffer, (uint32_t) bufferLength);
    free(buffer);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setTransformation()
//   Set accessor of "transformation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setTransformation, 1, NULL)
{
    return njsAqDeqOptions_setTextAttribute(env, globals, callingInstance,
            args[0], dpiDeqOptions_setTransformation);
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setVisibility()
//   Set accessor of "visibility" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setVisibility, 1, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiDeqOptions_setVisibility(options->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqDeqOptions_setWait()
//   Set accessor of "wait" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqDeqOptions_setWait, 1, NULL)
{
    njsAqDeqOptions *options = (njsAqDeqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiDeqOptions_setWait(options->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}
