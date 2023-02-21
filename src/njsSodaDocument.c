// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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
//   njsSodaDocument.c
//
// DESCRIPTION
//   SodaDocument class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getContentAsBuffer);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getContentAsString);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getCreatedOn);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getKey);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getLastModified);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getMediaType);
NJS_NAPI_METHOD_DECL_SYNC(njsSodaDocument_getVersion);

// finalize
static NJS_NAPI_FINALIZE(njsSodaDocument_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "getContentAsBuffer", NULL, njsSodaDocument_getContentAsBuffer,
            NULL, NULL, NULL, napi_default, NULL },
    { "getContentAsString", NULL, njsSodaDocument_getContentAsString,
            NULL, NULL, NULL, napi_default, NULL },
    { "getCreatedOn", NULL, njsSodaDocument_getCreatedOn, NULL, NULL, NULL,
            napi_default, NULL },
    { "getKey", NULL, njsSodaDocument_getKey, NULL, NULL, NULL, napi_default,
            NULL },
    { "getLastModified", NULL, njsSodaDocument_getLastModified, NULL, NULL,
            NULL, napi_default, NULL },
    { "getMediaType", NULL, njsSodaDocument_getMediaType, NULL, NULL, NULL,
            napi_default, NULL },
    { "getVersion", NULL, njsSodaDocument_getVersion, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaDocument = {
    "SodaDocumentImpl", sizeof(njsSodaDocument), njsSodaDocument_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsSodaDocument_genericGetter(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance,
        int (*dpiGetterFn)(dpiSodaDoc*, const char**, uint32_t *),
        napi_value *returnValue);


//-----------------------------------------------------------------------------
// njsSodaDocument_createFromHandle()
//   Creates a new SODA document object given the ODPI-C handle.
//-----------------------------------------------------------------------------
bool njsSodaDocument_createFromHandle(napi_env env, dpiSodaDoc *handle,
        njsModuleGlobals *globals, napi_value *docObj)
{
    njsSodaDocument *doc;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaDocument,
            globals->jsSodaDocumentConstructor, docObj,
            (njsBaseInstance**) &doc))
        return false;

    // perform initializations
    doc->handle = handle;

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_finalize()
//   Invoked when the njsSodaDocument object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSodaDocument_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSodaDocument *doc = (njsSodaDocument*) finalizeData;

    if (doc->handle) {
        dpiSodaDoc_release(doc->handle);
        doc->handle = NULL;
    }
    free(doc);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_genericGetter()
//   Generic function which performs the work of getting an attribute from the
// SODA document.
//-----------------------------------------------------------------------------
static bool njsSodaDocument_genericGetter(napi_env env,
        njsModuleGlobals *globals, njsBaseInstance *instance,
        int (*dpiGetterFn)(dpiSodaDoc*, const char**, uint32_t *),
        napi_value *returnValue)
{
    njsSodaDocument *doc = (njsSodaDocument*) instance;
    uint32_t valueLength;
    const char *value;

    if ((*dpiGetterFn)(doc->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (valueLength == 0) {
        NJS_CHECK_NAPI(env, napi_get_null(env, returnValue))
    } else {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
                returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getContentAsBuffer()
//   Returns the contents of the SODA document as a buffer.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getContentAsBuffer, 0, NULL)
{
    njsSodaDocument *doc = (njsSodaDocument*) callingInstance;
    const char *value, *encoding;
    uint32_t valueLength;

    if (dpiSodaDoc_getContent(doc->handle, &value, &valueLength,
            &encoding) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, valueLength, value, NULL,
            returnValue))

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getContentAsString()
//   Returns the contents of the SODA document as a string.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getContentAsString, 0, NULL)
{
    njsSodaDocument *doc = (njsSodaDocument*) callingInstance;
    const char *value, *encoding;
    uint32_t valueLength;

    if (dpiSodaDoc_getContent(doc->handle, &value, &valueLength,
            &encoding) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (valueLength == 0) {
        NJS_CHECK_NAPI(env, napi_get_null(env, returnValue))
    } else if (!encoding || strcmp(encoding, "UTF-8") == 0) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
                returnValue))
    } else {
        NJS_CHECK_NAPI(env, napi_create_string_utf16(env, (char16_t*) value,
                (size_t) (valueLength / 2), returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getCreatedOn()
//   Get accessor of "createdOn" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getCreatedOn, 0, NULL)
{
    return njsSodaDocument_genericGetter(env, globals, callingInstance,
            dpiSodaDoc_getCreatedOn, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getKey()
//   Get accessor of "key" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getKey, 0, NULL)
{
    return njsSodaDocument_genericGetter(env, globals, callingInstance,
            dpiSodaDoc_getKey, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getLastModified()
//   Get accessor of "lastModified" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getLastModified, 0, NULL)
{
    return njsSodaDocument_genericGetter(env, globals, callingInstance,
            dpiSodaDoc_getLastModified, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getMediaType()
//   Get accessor of "mediaType" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getMediaType, 0, NULL)
{
    return njsSodaDocument_genericGetter(env, globals, callingInstance,
            dpiSodaDoc_getMediaType, returnValue);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getVersion()
//   Get accessor of "version" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsSodaDocument_getVersion, 0, NULL)
{
    return njsSodaDocument_genericGetter(env, globals, callingInstance,
            dpiSodaDoc_getVersion, returnValue);
}
