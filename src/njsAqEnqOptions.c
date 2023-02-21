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
//   njsAqEnqOptions.c
//
// DESCRIPTION
//   AqEnqOptions (Advanced Queuing Enqueue Options) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_getDeliveryMode);
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_getTransformation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_getVisibility);
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_setDeliveryMode);
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_setTransformation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqEnqOptions_setVisibility);

// finalize
static NJS_NAPI_FINALIZE(njsAqEnqOptions_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "getDeliveryMode", NULL, njsAqEnqOptions_getDeliveryMode, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "getTransformation", NULL, njsAqEnqOptions_getTransformation, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "getVisibility", NULL, njsAqEnqOptions_getVisibility, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "setDeliveryMode", NULL, njsAqEnqOptions_setDeliveryMode, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "setTransformation", NULL, njsAqEnqOptions_setTransformation, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "setVisibility", NULL, njsAqEnqOptions_setVisibility, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqEnqOptions = {
    "AqEnqOptionsImpl", sizeof(njsAqEnqOptions), njsAqEnqOptions_finalize,
    njsClassProperties, true
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
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_getDeliveryMode, 0, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, options->deliveryMode,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_getTransformation()
//   Get accessor of "transformation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_getTransformation, 0, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiEnqOptions_getTransformation(options->handle, &value,
            &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_getVisibility()
//   Get accessor of "visibility" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_getVisibility, 0, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;
    uint32_t value;

    if (dpiEnqOptions_getVisibility(options->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setDeliveryMode()
//   Set accessor of "deliveryMode" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_setDeliveryMode, 1, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiEnqOptions_setDeliveryMode(options->handle, (uint16_t) value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    options->deliveryMode = (uint16_t) value;
    return true;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setTransformation()
//   Set accessor of "transformation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_setTransformation, 1, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;
    size_t valueLength;
    char *value = NULL;
    int status;

    if (!njsUtils_copyStringFromJS(env, args[0], &value, &valueLength))
        return false;
    status = dpiEnqOptions_setTransformation(options->handle, value,
            (uint32_t) valueLength);
    free(value);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return true;
}


//-----------------------------------------------------------------------------
// njsAqEnqOptions_setVisibility()
//   Set accessor of "visibility" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqEnqOptions_setVisibility, 1, NULL)
{
    njsAqEnqOptions *options = (njsAqEnqOptions*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiEnqOptions_setVisibility(options->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return true;
}
