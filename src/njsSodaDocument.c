// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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
//   njsSodaDocument.c
//
// DESCRIPTION
//   SodaDocument class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsSodaDocument_getContentAsBuffer);
static NJS_NAPI_METHOD(njsSodaDocument_getContentAsString);

// getters
static NJS_NAPI_GETTER(njsSodaDocument_getCreatedOn);
static NJS_NAPI_GETTER(njsSodaDocument_getKey);
static NJS_NAPI_GETTER(njsSodaDocument_getLastModified);
static NJS_NAPI_GETTER(njsSodaDocument_getMediaType);
static NJS_NAPI_GETTER(njsSodaDocument_getVersion);

// finalize
static NJS_NAPI_FINALIZE(njsSodaDocument_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_getContentAsBuffer", NULL, njsSodaDocument_getContentAsBuffer,
            NULL, NULL, NULL, napi_default, NULL },
    { "_getContentAsString", NULL, njsSodaDocument_getContentAsString,
            NULL, NULL, NULL, napi_default, NULL },
    { "createdOn", NULL, NULL, njsSodaDocument_getCreatedOn, NULL, NULL,
            napi_default, NULL },
    { "key", NULL, NULL, njsSodaDocument_getKey, NULL, NULL, napi_default,
            NULL },
    { "lastModified", NULL, NULL, njsSodaDocument_getLastModified, NULL, NULL,
            napi_default, NULL },
    { "mediaType", NULL, NULL, njsSodaDocument_getMediaType, NULL, NULL,
            napi_default, NULL },
    { "version", NULL, NULL, njsSodaDocument_getVersion, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefSodaDocument = {
    "SodaDocument", sizeof(njsSodaDocument), njsSodaDocument_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static napi_value njsSodaDocument_genericGetter(napi_env env,
        napi_callback_info info,
        int (*dpiGetterFn)(dpiSodaDoc*, const char**, uint32_t *));


//-----------------------------------------------------------------------------
// njsSodaDocument_createFromHandle()
//   Creates a new SODA document object given the ODPI-C handle.
//-----------------------------------------------------------------------------
bool njsSodaDocument_createFromHandle(napi_env env, dpiSodaDoc *handle,
        njsOracleDb *oracleDb, napi_value *docObj)
{
    njsSodaDocument *doc;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefSodaDocument,
            oracleDb->jsSodaDocumentConstructor, docObj,
            (njsBaseInstance**) &doc))
        return false;

    // perform initializations
    doc->handle = handle;
    doc->oracleDb = oracleDb;

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
static napi_value njsSodaDocument_genericGetter(napi_env env,
        napi_callback_info info,
        int (*dpiGetterFn)(dpiSodaDoc*, const char**, uint32_t *))
{
    njsSodaDocument *doc;
    uint32_t valueLength;
    napi_status status;
    const char *value;
    napi_value result;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &doc))
        return NULL;
    if ((*dpiGetterFn)(doc->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, doc->oracleDb);
        return NULL;
    }

    if (valueLength == 0) {
        status = napi_get_null(env, &result);
    } else {
        status = napi_create_string_utf8(env, value, valueLength, &result);
    }
    if (status != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return result;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getContentAsBuffer()
//   Returns the contents of the SODA document as a buffer.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getContentAsBuffer(napi_env env,
        napi_callback_info info)
{
    const char *value, *encoding;
    njsSodaDocument *doc;
    uint32_t valueLength;
    napi_value result;

    if (!njsUtils_validateArgs(env, info, 0, NULL, NULL,
            (njsBaseInstance**) &doc))
        return NULL;
    if (dpiSodaDoc_getContent(doc->handle, &value, &valueLength,
            &encoding) < 0) {
        njsUtils_throwErrorDPI(env, doc->oracleDb);
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
// njsSodaDocument_getContentAsString()
//   Returns the contents of the SODA document as a string.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getContentAsString(napi_env env,
        napi_callback_info info)
{
    const char *value, *encoding;
    njsSodaDocument *doc;
    uint32_t valueLength;
    napi_status status;
    napi_value result;

    if (!njsUtils_validateArgs(env, info, 0, NULL, NULL,
            (njsBaseInstance**) &doc))
        return NULL;
    if (dpiSodaDoc_getContent(doc->handle, &value, &valueLength,
            &encoding) < 0) {
        njsUtils_throwErrorDPI(env, doc->oracleDb);
        return NULL;
    }
    if (valueLength == 0) {
        status = napi_get_null(env, &result);
    } else if (!encoding || strcmp(encoding, "UTF-8") == 0) {
        status = napi_create_string_utf8(env, value, valueLength, &result);
    } else {
        status = napi_create_string_utf16(env, (char16_t*) value,
                (size_t) (valueLength / 2), &result);
    }
    if (status != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return result;
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getCreatedOn()
//   Get accessor of "createdOn" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getCreatedOn(napi_env env,
        napi_callback_info info)
{
    return njsSodaDocument_genericGetter(env, info, dpiSodaDoc_getCreatedOn);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getKey()
//   Get accessor of "key" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getKey(napi_env env, napi_callback_info info)
{
    return njsSodaDocument_genericGetter(env, info, dpiSodaDoc_getKey);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getLastModified()
//   Get accessor of "lastModified" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getLastModified(napi_env env,
        napi_callback_info info)
{
    return njsSodaDocument_genericGetter(env, info,
            dpiSodaDoc_getLastModified);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getMediaType()
//   Get accessor of "mediaType" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getMediaType(napi_env env,
        napi_callback_info info)
{
    return njsSodaDocument_genericGetter(env, info, dpiSodaDoc_getMediaType);
}


//-----------------------------------------------------------------------------
// njsSodaDocument_getVersion()
//   Get accessor of "version" property.
//-----------------------------------------------------------------------------
static napi_value njsSodaDocument_getVersion(napi_env env,
        napi_callback_info info)
{
    return njsSodaDocument_genericGetter(env, info, dpiSodaDoc_getVersion);
}
