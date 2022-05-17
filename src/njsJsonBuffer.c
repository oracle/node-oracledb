// Copyright (c) 2020, 2022, Oracle and/or its affiliates.

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
//   njsJsonBuffer.c
//
// DESCRIPTION
//   Implementation of methods for managing buffers for binding JSON data.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// forward declarations for functions only used in this file
static void njsJsonBuffer_freeNode(dpiJsonNode *node);
static bool njsJsonBuffer_getString(njsJsonBuffer *buf, njsBaton *baton,
        napi_env env, napi_value inValue, char **outValue,
        uint32_t *outValueLength);
static bool njsJsonBuffer_populateNode(njsJsonBuffer *buf, dpiJsonNode *node,
        napi_env env, napi_value value, njsBaton *baton);


//-----------------------------------------------------------------------------
// njsJsonBuffer_freeNode()
//-----------------------------------------------------------------------------
static void njsJsonBuffer_freeNode(dpiJsonNode *node)
{
    dpiJsonArray *array;
    dpiJsonObject *obj;
    uint32_t i;

    switch (node->nativeTypeNum) {
        case DPI_NATIVE_TYPE_JSON_ARRAY:
            array = &node->value->asJsonArray;
            if (array->elements) {
                for (i = 0; i < array->numElements; i++) {
                    if (array->elements[i].value)
                        njsJsonBuffer_freeNode(&array->elements[i]);
                }
                free(array->elements);
                array->elements = NULL;
            }
            if (array->elementValues) {
                free(array->elementValues);
                array->elementValues = NULL;
            }
            break;
        case DPI_NATIVE_TYPE_JSON_OBJECT:
            obj = &node->value->asJsonObject;
            if (obj->fields) {
                for (i = 0; i < obj->numFields; i++) {
                    if (obj->fields[i].value)
                        njsJsonBuffer_freeNode(&obj->fields[i]);
                }
                free(obj->fields);
                obj->fields = NULL;
            }
            if (obj->fieldNames) {
                free(obj->fieldNames);
                obj->fieldNames = NULL;
            }
            if (obj->fieldNameLengths) {
                free(obj->fieldNameLengths);
                obj->fieldNameLengths = NULL;
            }
            if (obj->fieldValues) {
                free(obj->fieldValues);
                obj->fieldValues = NULL;
            }
            break;
    }
}


//-----------------------------------------------------------------------------
// njsJsonBuffer_getString()
//   Acquire a new buffer from the array of buffers and then allocate the
// requested space to store the string value. If an element in the array is not
// available, more space for the array is allocated in chunks.
//-----------------------------------------------------------------------------
static bool njsJsonBuffer_getString(njsJsonBuffer *buf, njsBaton *baton,
        napi_env env, napi_value inValue, char **outValue,
        uint32_t *outValueLength)
{
    char **tempBuffers, *temp;
    size_t tempLength;

    *outValue = NULL;
    *outValueLength = 0;
    if (buf->numBuffers == buf->allocatedBuffers) {
        buf->allocatedBuffers += 16;
        tempBuffers = malloc(buf->allocatedBuffers * sizeof(char*));
        if (!tempBuffers)
            return njsBaton_setError(baton, errInsufficientMemory);
        if (buf->numBuffers > 0) {
            memcpy(tempBuffers, buf->buffers, buf->numBuffers * sizeof(char*));
            free(buf->buffers);
        }
        buf->buffers = tempBuffers;
    }
    NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, inValue, NULL, 0,
            &tempLength))
    temp = malloc(tempLength + 1);
    if (!temp)
        return njsBaton_setError(baton, errInsufficientMemory);
    buf->buffers[buf->numBuffers++] = temp;
    NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, inValue, temp,
            tempLength + 1, &tempLength))
    *outValue = temp;
    *outValueLength = (uint32_t) tempLength;
    return true;
}


//-----------------------------------------------------------------------------
// njsJsonBuffer_populateNode()
//   Populates a particular node with the contents of the JavaScript value.
//-----------------------------------------------------------------------------
static bool njsJsonBuffer_populateNode(njsJsonBuffer *buf, dpiJsonNode *node,
        napi_env env, napi_value value, njsBaton *baton)
{
    napi_value temp, name, names;
    napi_valuetype valueType;
    size_t tempBufferLength;
    dpiJsonArray *array;
    dpiJsonObject *obj;
    char *tempBuffer;
    uint32_t i;
    bool check;

    // determine type of value
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))

    // nulls and undefined in JS are mapped to NULL in Oracle
    if (valueType == napi_undefined || valueType == napi_null) {
        node->oracleTypeNum = DPI_ORACLE_TYPE_NONE;
        node->nativeTypeNum = DPI_NATIVE_TYPE_NULL;
        return true;
    }

    // handle booleans
    if (valueType == napi_boolean) {
        node->oracleTypeNum = DPI_ORACLE_TYPE_BOOLEAN;
        node->nativeTypeNum = DPI_NATIVE_TYPE_BOOLEAN;
        NJS_CHECK_NAPI(env, napi_get_value_bool(env, value, &check))
        node->value->asBoolean = (int) check;
        return true;
    }

    // handle strings
    if (valueType == napi_string) {
        node->oracleTypeNum = DPI_ORACLE_TYPE_VARCHAR;
        node->nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
        return njsJsonBuffer_getString(buf, baton, env, value,
                &node->value->asBytes.ptr, &node->value->asBytes.length);
    }

    // handle numbers
    if (valueType == napi_number) {
        node->oracleTypeNum = DPI_ORACLE_TYPE_NUMBER;
        node->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
        NJS_CHECK_NAPI(env, napi_get_value_double(env, value,
                &node->value->asDouble))
        return true;
    }

    // handle arrays
    NJS_CHECK_NAPI(env, napi_is_array(env, value, &check))
    if (check) {
        node->oracleTypeNum = DPI_ORACLE_TYPE_JSON_ARRAY;
        node->nativeTypeNum = DPI_NATIVE_TYPE_JSON_ARRAY;
        array = &node->value->asJsonArray;
        NJS_CHECK_NAPI(env, napi_get_array_length(env, value,
                &array->numElements))
        array->elements = calloc(array->numElements, sizeof(dpiJsonNode));
        array->elementValues = calloc(array->numElements,
                sizeof(dpiDataBuffer));
        if (!array->elements || !array->elementValues)
            return njsBaton_setError(baton, errInsufficientMemory);
        for (i = 0; i < array->numElements; i++) {
            NJS_CHECK_NAPI(env, napi_get_element(env, value, i, &temp))
            array->elements[i].value = &array->elementValues[i];
            if (!njsJsonBuffer_populateNode(buf, &array->elements[i], env,
                    temp, baton))
                return false;
        }
        return true;
    }

    // handle objects
    if (valueType == napi_object) {

        // handle dates
        if (!njsBaton_isDate(baton, env, value, &check))
            return false;
        if (check) {
            node->oracleTypeNum = DPI_ORACLE_TYPE_TIMESTAMP;
            node->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            NJS_CHECK_NAPI(env, napi_coerce_to_number(env, value, &temp))
            NJS_CHECK_NAPI(env, napi_get_value_double(env, temp,
                    &node->value->asDouble))
            return true;
        }

        // handle buffers
        NJS_CHECK_NAPI(env, napi_is_buffer(env, value, &check))
        if (check) {
            NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value,
                    (void**) &tempBuffer, &tempBufferLength))
            node->oracleTypeNum = DPI_ORACLE_TYPE_RAW;
            node->nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            node->value->asBytes.ptr = tempBuffer;
            node->value->asBytes.length = (uint32_t) tempBufferLength;
            return true;
        }

        // handle other objects
        if (!njsUtils_getOwnPropertyNames(env, value, &names))
            return false;
        node->oracleTypeNum = DPI_ORACLE_TYPE_JSON_OBJECT;
        node->nativeTypeNum = DPI_NATIVE_TYPE_JSON_OBJECT;
        obj = &node->value->asJsonObject;
        NJS_CHECK_NAPI(env, napi_get_array_length(env, names, &obj->numFields))
        obj->fieldNames = calloc(obj->numFields, sizeof(char*));
        obj->fieldNameLengths = calloc(obj->numFields, sizeof(uint32_t));
        obj->fields = calloc(obj->numFields, sizeof(dpiJsonNode));
        obj->fieldValues = calloc(obj->numFields, sizeof(dpiDataBuffer));
        if (!obj->fieldNames || !obj->fieldNameLengths || !obj->fields ||
                !obj->fieldValues)
            return njsBaton_setError(baton, errInsufficientMemory);
        for (i = 0; i < obj->numFields; i++) {
            NJS_CHECK_NAPI(env, napi_get_element(env, names, i, &name))
            if (!njsJsonBuffer_getString(buf, baton, env, name,
                    &obj->fieldNames[i], &obj->fieldNameLengths[i]))
                return false;
            NJS_CHECK_NAPI(env, napi_get_property(env, value, name, &temp))
            obj->fields[i].value = &obj->fieldValues[i];
            if (!njsJsonBuffer_populateNode(buf, &obj->fields[i], env, temp,
                    baton))
                return false;
        }
        return true;

    }

    return njsBaton_setError(baton, errConvertToJsonValue);
}


//-----------------------------------------------------------------------------
// njsJsonBuffer_free()
//   Frees any memory allocated for the JSON buffer.
//-----------------------------------------------------------------------------
void njsJsonBuffer_free(njsJsonBuffer *buf)
{
    uint32_t i;

    if (buf->buffers) {
        for (i = 0; i < buf->numBuffers; i++)
            free(buf->buffers[i]);
        free(buf->buffers);
        buf->buffers = NULL;
    }
    njsJsonBuffer_freeNode(&buf->topNode);
}

//-----------------------------------------------------------------------------
// njsJsonBuffer_fromValue()
//   Populates a JSON buffer from the specified JavaScript value.
//-----------------------------------------------------------------------------
bool njsJsonBuffer_fromValue(njsJsonBuffer *buf, napi_env env,
        napi_value value, njsBaton *baton)
{
    // initialize JSON buffer structure
    buf->topNode.value = &buf->topNodeBuffer;
    buf->allocatedBuffers = 0;
    buf->numBuffers = 0;
    buf->buffers = NULL;

    // populate the top level node
    return njsJsonBuffer_populateNode(buf, &buf->topNode, env, value, baton);
}
