// Copyright (c) 2025, Oracle and/or its affiliates.

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
//   njsJsContext.c
//
// DESCRIPTION
//   Implementation of njsJsContext methods to call JS methods inside C.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

//-----------------------------------------------------------------------------
// njsJsContext_populate()
//   Sets the JavaScript values on the njsContext structure. These are a number
// of constructors and also the JavaScript object that is "this" for the method
// that is currently being executed.
//-----------------------------------------------------------------------------
bool njsJsContext_populate(napi_env env, njsModuleGlobals *globals,
        njsJsContext *jsContext)
{
    // acquire the LOB constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsLobConstructor, &jsContext->jsLobConstructor))

    // acquire the result set constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsResultSetConstructor,
            &jsContext->jsResultSetConstructor))

    // acquire the base database object constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsDbObjectConstructor,
            &jsContext->jsDbObjectConstructor))

    // acquire the _getDateComponents() function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsGetDateComponentsFn,
            &jsContext->jsGetDateComponentsFn))

    // acquire the _makeDate() function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsMakeDateFn, &jsContext->jsMakeDateFn))

    // acquire the _decodeVector function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsDecodeVectorFn, &jsContext->jsDecodeVectorFn))

    // acquire the _encodeVector function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsEncodeVectorFn, &jsContext->jsEncodeVectorFn))

    // acquire the JsonId constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsJsonIdConstructor, &jsContext->jsJsonIdConstructor))

    // acquire the SparseVector constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsSparseVectorConstructor,
            &jsContext->jsSparseVectorConstructor))

    // acquire the IntervalYM constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsIntervalYMConstructor,
            &jsContext->jsIntervalYMConstructor))

    // acquire the IntervalDS constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            globals->jsIntervalDSConstructor,
            &jsContext->jsIntervalDSConstructor))

    return true;
}


//-----------------------------------------------------------------------------
// njsJsContext_getJsonNodeValue()
//   Return an appropriate JavaScript value for the JSON node.
//-----------------------------------------------------------------------------
bool njsJsContext_getJsonNodeValue(njsJsContext *jsContext, dpiJsonNode *node,
        napi_env env, napi_value *value)
{
    napi_value key, temp;
    dpiJsonArray *array;
    dpiJsonObject *obj;
    void *destData = NULL;
    size_t byteLength = 0;
    double temp_double;
    uint32_t i;
    napi_value global, vectorBytes, arrBuf;

    // null is a special case
    if (node->nativeTypeNum == DPI_NATIVE_TYPE_NULL) {
        NJS_CHECK_NAPI(env, napi_get_null(env, value))
        return true;
    }

    // handle the other types supported in JSON nodes
    switch (node->oracleTypeNum) {
        case DPI_ORACLE_TYPE_JSON_ARRAY:
            array = &node->value->asJsonArray;
            NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                    array->numElements, value))
            for (i = 0; i < array->numElements; i++) {
                if (!njsJsContext_getJsonNodeValue(jsContext, &array->elements[i],
                        env, &temp))
                    return false;
                NJS_CHECK_NAPI(env, napi_set_element(env, *value, i, temp))
            }
            return true;
        case DPI_ORACLE_TYPE_JSON_OBJECT:
            obj = &node->value->asJsonObject;
            NJS_CHECK_NAPI(env, napi_create_object(env, value))
            for (i = 0; i< obj->numFields; i++) {
                NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                        obj->fieldNames[i], obj->fieldNameLengths[i], &key))
                if (!njsJsContext_getJsonNodeValue(jsContext, &obj->fields[i],
                        env, &temp))
                    return false;
                NJS_CHECK_NAPI(env, napi_set_property(env, *value, key, temp))
            }
            return true;
        case DPI_ORACLE_TYPE_VARCHAR:
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    node->value->asBytes.ptr, node->value->asBytes.length,
                    value))
            return true;
        case DPI_ORACLE_TYPE_RAW:
            NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                    node->value->asBytes.length, node->value->asBytes.ptr,
                    NULL, value))
            return true;
        case DPI_ORACLE_TYPE_NUMBER:
            temp_double = (node->nativeTypeNum == DPI_NATIVE_TYPE_DOUBLE) ?
                    node->value->asDouble : node->value->asFloat;
            NJS_CHECK_NAPI(env, napi_create_double(env, temp_double, value))
            return true;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
            return njsUtils_getDateValue(node->oracleTypeNum, env,
                jsContext->jsMakeDateFn, &node->value->asTimestamp, value);
            return true;
        case DPI_ORACLE_TYPE_BOOLEAN:
            NJS_CHECK_NAPI(env, napi_get_boolean(env, node->value->asBoolean,
                    value))
            return true;
        case DPI_ORACLE_TYPE_INTERVAL_YM:
            return njsJsContext_getIntervalYM(jsContext,
                &(node->value->asIntervalYM), env, value);
        case DPI_ORACLE_TYPE_INTERVAL_DS:
            return njsJsContext_getIntervalDS(jsContext,
                &(node->value->asIntervalDS), env, value);
        case DPI_ORACLE_TYPE_VECTOR:
            NJS_CHECK_NAPI(env, napi_get_global(env, &global))
            NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                    node->value->asBytes.length, node->value->asBytes.ptr,
                    NULL, &vectorBytes))
            NJS_CHECK_NAPI(env, napi_call_function(env, global,
                    jsContext->jsDecodeVectorFn, 1, &vectorBytes, value))
            return true;
        case DPI_ORACLE_TYPE_JSON_ID:
            byteLength = node->value->asBytes.length;
            NJS_CHECK_NAPI(env, napi_create_arraybuffer(env,
                    byteLength, &destData, &arrBuf))
            memcpy(destData, node->value->asBytes.ptr, byteLength);
            NJS_CHECK_NAPI(env, napi_new_instance(env,
                    jsContext->jsJsonIdConstructor, 1, &arrBuf, value))
            return true;

        default:
            break;
    }

    return njsUtils_throwUnsupportedDataTypeInJson(env,
            node->oracleTypeNum);
}


//-----------------------------------------------------------------------------
// njsJsContext_getIntervalYM()
//   Returns the appropriate IntervalYM JavaScript object for the Interval
// year-to-month type. At this point it is known that the Javascript
// attributes are integers and that the variable can support it.
//-----------------------------------------------------------------------------
bool njsJsContext_getIntervalYM(njsJsContext *jsContext, dpiIntervalYM *data,
        napi_env env, napi_value *value)
{
    napi_value temp, intervalYMTempObj;

    NJS_CHECK_NAPI(env, napi_create_object(env, &intervalYMTempObj))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->years, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalYMTempObj,
            "years", temp))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->months, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalYMTempObj,
            "months", temp))
    NJS_CHECK_NAPI(env, napi_new_instance(env,
            jsContext->jsIntervalYMConstructor, 1, &intervalYMTempObj, value))

    return true;
}


//-----------------------------------------------------------------------------
// njsJsContext_getIntervalDS()
//   Returns the appropriate IntervalDS JavaScript object for the Interval
// day-to-second type. At this point it is known that the Javascript
// attributes are integers and that the variable can support it.
//-----------------------------------------------------------------------------
bool njsJsContext_getIntervalDS(njsJsContext *jsContext, dpiIntervalDS *data,
        napi_env env, napi_value *value)
{
    napi_value temp, intervalDSTempObj;

    NJS_CHECK_NAPI(env, napi_create_object(env, &intervalDSTempObj))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->days, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalDSTempObj,
            "days", temp))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->hours, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalDSTempObj,
            "hours", temp))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->minutes, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalDSTempObj,
            "minutes", temp))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->seconds, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalDSTempObj,
            "seconds", temp))
    NJS_CHECK_NAPI(env, napi_create_int32(env, data->fseconds, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, intervalDSTempObj,
            "fseconds", temp))
    NJS_CHECK_NAPI(env, napi_new_instance(env,
            jsContext->jsIntervalDSConstructor, 1, &intervalDSTempObj, value))

    return true;
}
