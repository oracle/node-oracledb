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
//   njsDbObject.c
//
// DESCRIPTION
//   Database-Object class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsDbObject_append);
static NJS_NAPI_METHOD(njsDbObject_copy);
static NJS_NAPI_METHOD(njsDbObject_deleteElement);
static NJS_NAPI_METHOD(njsDbObject_getElement);
static NJS_NAPI_METHOD(njsDbObject_getFirstIndex);
static NJS_NAPI_METHOD(njsDbObject_getKeys);
static NJS_NAPI_METHOD(njsDbObject_getLastIndex);
static NJS_NAPI_METHOD(njsDbObject_getNextIndex);
static NJS_NAPI_METHOD(njsDbObject_getPrevIndex);
static NJS_NAPI_METHOD(njsDbObject_getValues);
static NJS_NAPI_METHOD(njsDbObject_hasElement);
static NJS_NAPI_METHOD(njsDbObject_setElement);
static NJS_NAPI_METHOD(njsDbObject_trim);

// getters
static NJS_NAPI_GETTER(njsDbObject_getAttrValue);
static NJS_NAPI_GETTER(njsDbObject_getLength);

// setters
static NJS_NAPI_SETTER(njsDbObject_setAttrValue);

// finalize
static NJS_NAPI_FINALIZE(njsDbObject_finalize);
static NJS_NAPI_FINALIZE(njsDbObjectType_finalize);

// properties for collections
static const napi_property_descriptor njsClassProperties[] = {
    { "append", NULL, njsDbObject_append, NULL, NULL, NULL, napi_default,
            NULL },
    { "copy", NULL, njsDbObject_copy, NULL, NULL, NULL, napi_default, NULL },
    { "deleteElement", NULL, njsDbObject_deleteElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getElement", NULL, njsDbObject_getElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getFirstIndex", NULL, njsDbObject_getFirstIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getKeys", NULL, njsDbObject_getKeys, NULL, NULL, NULL, napi_default,
            NULL },
    { "getLastIndex", NULL, njsDbObject_getLastIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getNextIndex", NULL, njsDbObject_getNextIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getPrevIndex", NULL, njsDbObject_getPrevIndex, NULL, NULL, NULL,
            napi_default, NULL },
    { "getValues", NULL, njsDbObject_getValues, NULL, NULL, NULL, napi_default,
            NULL },
    { "hasElement", NULL, njsDbObject_hasElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "length", NULL, NULL, njsDbObject_getLength, NULL, NULL, napi_default,
            NULL },
    { "setElement", NULL, njsDbObject_setElement, NULL, NULL, NULL,
            napi_default, NULL },
    { "trim", NULL, njsDbObject_trim, NULL, NULL, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefBaseDbObject = {
    "BaseDbObject", sizeof(njsDbObject), njsDbObject_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsDbObject_getAttrValueHelper(napi_env env,
        napi_callback_info info, napi_value *value);
static bool njsDbObject_getKeysHelper(napi_env env, napi_callback_info info,
        napi_value *returnValue);
static bool njsDbObject_getValuesHelper(napi_env env, napi_callback_info info,
        napi_value *returnValue);
static bool njsDbObject_setAttrValueHelper(napi_env, napi_callback_info info);
static bool njsDbObject_transformFromOracle(njsDbObject *obj, napi_env env,
        njsDataTypeInfo *typeInfo, dpiData *data, napi_value *value,
        njsDbObjectAttr *attr);
static bool njsDbObject_transformToOracle(njsDbObject *obj, napi_env env,
        napi_value value, dpiNativeTypeNum *nativeTypeNum, dpiData *data,
        char **strBuffer, njsDbObjectAttr *attr);
static bool njsDbObject_validateArgs(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsDbObjectAttr **attr,
        njsDbObject **obj);
static bool njsDbObjectType_populate(njsDbObjectType *objType,
        dpiObjectType *objectTypeHandle, napi_env env, napi_value jsObjectType,
        dpiObjectTypeInfo *info, njsBaton *baton);
static bool njsDbObjectType_populateTypeInfo(njsDataTypeInfo *info,
        njsBaton *baton, napi_env env, dpiDataTypeInfo *sourceInfo);
static bool njsDbObject_wrap(napi_env env, napi_value value,
        njsDbObject **obj);


//-----------------------------------------------------------------------------
// njsDbObject_append()
//   Append an element to the end of the collection.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_append(napi_env env, napi_callback_info info)
{
    dpiNativeTypeNum nativeTypeNum;
    napi_value value;
    char *str = NULL;
    njsDbObject *obj;
    dpiData data;
    int status;

    if (!njsDbObject_validateArgs(env, info, 1, &value, NULL, &obj))
        return NULL;
    nativeTypeNum = obj->type->elementTypeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, value, &nativeTypeNum, &data,
            &str, NULL))
        return NULL;
    status = dpiObject_appendElement(obj->handle, nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsDbObject_copy()
//   Create a copy of the object and return that. The copy is independent of
// the original object that was copied.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_copy(napi_env env, napi_callback_info info)
{
    napi_value thisArg, returnValue = NULL;
    njsDbObjectType *objType = NULL;
    dpiObject *copiedObjHandle;
    size_t actualArgs = 0;
    njsDbObject *obj;

    // get callback information and validate the number of arguments
    if (napi_get_cb_info(env, info, &actualArgs, NULL, &thisArg,
            (void**) &objType) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    if (actualArgs != 0) {
        njsUtils_throwError(env, errInvalidNumberOfParameters, actualArgs, 0);
        return NULL;
    }

    // get instance and create copy
    if (!njsDbObject_getInstance(objType->oracleDb, env, thisArg, &obj))
        return NULL;
    if (dpiObject_copy(obj->handle, &copiedObjHandle) < 0) {
        njsUtils_throwErrorDPI(env, objType->oracleDb);
        return NULL;
    }
    njsDbObject_new(obj->type, copiedObjHandle, env, &returnValue);
    dpiObject_release(copiedObjHandle);
    return returnValue;
}


//-----------------------------------------------------------------------------
// njsDbObject_deleteElement()
//   Returns the element at the specified index.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_deleteElement(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsDbObject *obj;
    int32_t index;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    if (dpiObject_deleteElementByIndex(obj->handle, index) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    return NULL;
}


//-----------------------------------------------------------------------------
// njsDbObject_finalize()
//   Invoked when njsDbObject is garbage collected.
//-----------------------------------------------------------------------------
static void njsDbObject_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsDbObject *obj = (njsDbObject*) finalizeData;

    if (obj->handle) {
        dpiObject_release(obj->handle);
        obj->handle = NULL;
    }
    free(obj);
}


//-----------------------------------------------------------------------------
// njsDbObject_getAttrValue()
//   Generic get accessor for attributes.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getAttrValue(napi_env env,
        napi_callback_info info)
{
    napi_value value = NULL;

    if (!njsDbObject_getAttrValueHelper(env, info, &value))
        return NULL;
    return value;
}


//-----------------------------------------------------------------------------
// njsDbObject_getAttrValueHelper()
//   Helper for njsDbObject_getAttrValue().
//-----------------------------------------------------------------------------
static bool njsDbObject_getAttrValueHelper(napi_env env,
        napi_callback_info info, napi_value *value)
{
    njsDbObjectAttr *attr = NULL;
    njsDbObject *obj;
    dpiData data;

    if (!njsDbObject_validateArgs(env, info, 0, NULL, &attr, &obj))
        return false;
    if (dpiObject_getAttributeValue(obj->handle, attr->handle,
            attr->typeInfo.nativeTypeNum, &data) < 0)
        return njsUtils_throwErrorDPI(env, attr->oracleDb);
    return njsDbObject_transformFromOracle(obj, env, &attr->typeInfo, &data,
            value, attr);
}


//-----------------------------------------------------------------------------
// njsDbObject_getElement()
//   Returns the element at the specified index.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getElement(napi_env env, napi_callback_info info)
{
    napi_value args[1], value = NULL;
    njsDbObject *obj;
    int32_t index;
    dpiData data;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    if (dpiObject_getElementValueByIndex(obj->handle, index,
            obj->type->elementTypeInfo.nativeTypeNum, &data) < 0 ) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (!njsDbObject_transformFromOracle(obj, env, &obj->type->elementTypeInfo,
            &data, &value, NULL))
        return NULL;
    return value;
}


//-----------------------------------------------------------------------------
//  njsDbObject_getInstance()
//    Returns the instance associated with the object. Since objects may be
// created in JavaScript, an instance may not be associated at all. In that
// case, a new instance is created and associated with the object.
//-----------------------------------------------------------------------------
bool njsDbObject_getInstance(njsOracleDb *oracleDb, napi_env env,
        napi_value value, njsDbObject **obj)
{
    njsDbObject *tempObj;

    // if JavaScript object is wrapped, instance is returned immediately
    if (napi_unwrap(env, value, (void**) obj) == napi_ok)
        return true;

    // perform wrap, if needed
    if (!njsDbObject_wrap(env, value, &tempObj))
        return false;

    // if wrap was needed, the object handle will be NULL; in that case, create
    // a new object of that type
    if (!tempObj->handle && dpiObjectType_createObject(tempObj->type->handle,
            &tempObj->handle) < 0)
        return njsUtils_throwErrorDPI(env, oracleDb);

    *obj = tempObj;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getFirstIndex()
//   Returns the first index in the collection.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getFirstIndex(napi_env env,
        napi_callback_info info)
{
    napi_value value = NULL;
    njsDbObject *obj;
    int32_t index;
    int exists;

    if (!njsDbObject_validateArgs(env, info, 0, NULL, NULL, &obj))
        return NULL;
    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (exists && napi_create_int32(env, index, &value) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return value;
}


//-----------------------------------------------------------------------------
// njsDbObject_getKeys()
//   Returns the elements of the collection as a plain JavaScript array.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getKeys(napi_env env, napi_callback_info info)
{
    napi_value returnValue = NULL;

    if (!njsDbObject_getKeysHelper(env, info, &returnValue))
        return NULL;
    return returnValue;
}


//-----------------------------------------------------------------------------
// njsDbObject_getKeysHelper()
//   Helper method for njsDbObject_getKeys().
//-----------------------------------------------------------------------------
static bool njsDbObject_getKeysHelper(napi_env env, napi_callback_info info,
        napi_value *returnValue)
{
    int32_t index, exists, size;
    napi_value arr, temp;
    uint32_t arrayPos;
    njsDbObject *obj;

    // get object instance from caller
    if (!njsDbObject_validateArgs(env, info, 0, NULL, NULL, &obj))
        return false;

    // determine the size of the collection and create an array of that length
    if (dpiObject_getSize(obj->handle, &size) < 0)
        return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, (size_t) size,
            &arr))

    // iterate over the elements in the collection
    arrayPos = 0;
    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    while (exists) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, index, &temp))
        NJS_CHECK_NAPI(env, napi_set_element(env, arr, arrayPos++, temp))
        if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0)
            return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    }
    *returnValue = arr;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getLastIndex()
//   Returns the last index in the collection.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getLastIndex(napi_env env,
        napi_callback_info info)
{
    napi_value value = NULL;
    njsDbObject *obj;
    int32_t index;
    int exists;

    if (!njsDbObject_validateArgs(env, info, 0, NULL, NULL, &obj))
        return NULL;
    if (dpiObject_getLastIndex(obj->handle, &index, &exists) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (exists && napi_create_int32(env, index, &value) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return value;
}


//-----------------------------------------------------------------------------
// njsDbObject_getLength()
//   Get accessor of "length" property.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getLength(napi_env env, napi_callback_info info)
{
    njsDbObject *obj;
    int32_t size;

    if (!njsDbObject_validateArgs(env, info, 0, NULL, NULL, &obj))
        return NULL;
    if (dpiObject_getSize(obj->handle, &size) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    return njsUtils_convertToInt(env, size);
}


//-----------------------------------------------------------------------------
// njsDbObject_getNextIndex()
//   Returns the next index in the collection following the one provided.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getNextIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[1], value = NULL;
    njsDbObject *obj;
    int32_t index;
    int exists;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (exists && napi_create_int32(env, index, &value) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return value;
}


//-----------------------------------------------------------------------------
// njsDbObject_getPrevIndex()
//   Returns the previous index in the collection preceding the one provided.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getPrevIndex(napi_env env,
        napi_callback_info info)
{
    napi_value args[1], value = NULL;
    njsDbObject *obj;
    int32_t index;
    int exists;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    if (dpiObject_getPrevIndex(obj->handle, index, &index, &exists) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (exists && napi_create_int32(env, index, &value) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return value;
}


//-----------------------------------------------------------------------------
//  njsDbObject_getSubClass()
//    Gets the sub class for the specified type.
//-----------------------------------------------------------------------------
bool njsDbObject_getSubClass(njsBaton *baton, dpiObjectType *objectTypeHandle,
        napi_env env, napi_value *cls, njsDbObjectType **objectType)
{
    napi_value fn, args[2], callingObj, prototype;
    njsDbObjectType *tempObjectType;
    dpiObjectTypeInfo info;

    // get object type information from ODPI-C
    if (dpiObjectType_getInfo(objectTypeHandle, &info) < 0)
        return njsBaton_setErrorDPI(baton);

    // call into JavaScript to get sub class (stored in cache on connection)
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info.schema,
            info.schemaLength, &args[0]))
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info.name,
            info.nameLength, &args[1]))
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, callingObj,
            "_getDbObjectClassJS", &fn))
    NJS_CHECK_NAPI(env, napi_call_function(env, callingObj, fn, 2, args, cls))

    // get the class prototype; if it has already been wrapped, it has been
    // fully populated and there is no need to do anything further
    NJS_CHECK_NAPI(env, napi_get_named_property(env, *cls, "prototype",
            &prototype))
    if (napi_unwrap(env, prototype, (void**) objectType) == napi_ok)
        return true;

    // allocate memory for structure; memory is zero-ed
    tempObjectType = (njsDbObjectType*) calloc(1, sizeof(njsDbObjectType));
    if (!tempObjectType)
        return njsUtils_throwError(env, errInsufficientMemory);

    // populate object type (C) and prototype (JS) with all information about
    // the object type
    if (!njsDbObjectType_populate(tempObjectType, objectTypeHandle, env,
            prototype, &info, baton)) {
        njsDbObjectType_finalize(env, tempObjectType, NULL);
        return false;
    }

    // wrap the structure for use by JavaScript
    if (napi_wrap(env, prototype, tempObjectType, njsDbObjectType_finalize,
            NULL, NULL) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsDbObjectType_finalize(env, tempObjectType, NULL);
        return false;
    }

    *objectType = tempObjectType;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_getValues()
//   Returns the elements of the collection as a plain JavaScript array.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_getValues(napi_env env, napi_callback_info info)
{
    napi_value returnValue = NULL;

    if (!njsDbObject_getValuesHelper(env, info, &returnValue))
        return NULL;
    return returnValue;
}


//-----------------------------------------------------------------------------
// njsDbObject_getValuesHelper()
//   Helper method for njsDbObject_getValues().
//-----------------------------------------------------------------------------
static bool njsDbObject_getValuesHelper(napi_env env, napi_callback_info info,
        napi_value *returnValue)
{
    int32_t index, exists, size;
    napi_value arr, temp;
    uint32_t arrayPos;
    njsDbObject *obj;
    dpiData data;

    // get object instance from caller
    if (!njsDbObject_validateArgs(env, info, 0, NULL, NULL, &obj))
        return false;

    // determine the size of the collection and create an array of that length
    if (dpiObject_getSize(obj->handle, &size) < 0)
        return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, (size_t) size,
            &arr))

    // iterate over the elements in the collection
    arrayPos = 0;
    if (dpiObject_getFirstIndex(obj->handle, &index, &exists) < 0)
        return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    while (exists) {
        if (dpiObject_getElementValueByIndex(obj->handle, index,
                obj->type->elementTypeInfo.nativeTypeNum, &data) < 0)
            return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        if (!njsDbObject_transformFromOracle(obj, env,
                &obj->type->elementTypeInfo, &data, &temp, NULL))
            return false;
        NJS_CHECK_NAPI(env, napi_set_element(env, arr, arrayPos++, temp))
        if (dpiObject_getNextIndex(obj->handle, index, &index, &exists) < 0)
            return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    }
    *returnValue = arr;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_hasElement()
//   Returns true or false indicating if an element exists at the specified
// index.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_hasElement(napi_env env, napi_callback_info info)
{
    napi_value args[1], result;
    njsDbObject *obj;
    int32_t index;
    int exists;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    if (dpiObject_getElementExistsByIndex(obj->handle, index, &exists) < 0) {
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
        return NULL;
    }
    if (napi_get_boolean(env, exists, &result) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return result;
}


//-----------------------------------------------------------------------------
//  njsDbObject_new()
//    To create a new instance of njsDbObject
//-----------------------------------------------------------------------------
bool njsDbObject_new(njsDbObjectType *objType, dpiObject *objHandle,
        napi_env env, napi_value *value)
{
    napi_value constructor;
    njsDbObject *obj;

    // create instance and wrap it
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            objType->jsDbObjectConstructor, &constructor))
    NJS_CHECK_NAPI(env, napi_new_instance(env, constructor, 0, NULL, value))
    if (!njsDbObject_wrap(env, *value, &obj))
        return false;

    // transfer handle to instance
    if (dpiObject_addRef(objHandle) < 0)
        return njsUtils_throwErrorDPI(env, objType->oracleDb);
    obj->handle = objHandle;

    return true;
}


//-----------------------------------------------------------------------------
//  njsDbObject_toPojo()
//    Transforms a database object to a "Plain Old JavaScript Object".
//-----------------------------------------------------------------------------
bool njsDbObject_toPojo(napi_value obj, napi_env env, napi_value *pojo)
{
    napi_value fn;

    NJS_CHECK_NAPI(env, napi_get_named_property(env, obj, "_toPojo", &fn))
    NJS_CHECK_NAPI(env, napi_call_function(env, obj, fn, 0, NULL, pojo))
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_setAttrValue()
//   Generic set accessor for attributes.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_setAttrValue(napi_env env,
        napi_callback_info info)
{
    njsDbObject_setAttrValueHelper(env, info);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsDbObject_setAttrValueHelper()
//   Helper for njsDbObject_setAttrValue().
//-----------------------------------------------------------------------------
static bool njsDbObject_setAttrValueHelper(napi_env env,
        napi_callback_info info)
{
    dpiNativeTypeNum nativeTypeNum;
    njsDbObjectAttr *attr = NULL;
    napi_value value;
    char *str = NULL;
    njsDbObject *obj;
    dpiData data;
    int status;

    // get object instance and validate number of arguments
    if (!njsDbObject_validateArgs(env, info, 1, &value, &attr, &obj))
        return false;

    // transform to value required by ODPI-C
    nativeTypeNum = attr->typeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, value, &nativeTypeNum, &data,
            &str, attr))
        return false;

    // set value
    status = dpiObject_setAttributeValue(obj->handle, attr->handle,
            nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, attr->oracleDb);

    return true;
}


//-----------------------------------------------------------------------------
// njsDbObject_setElement()
//   Sets the element at the specified index to the specified value.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_setElement(napi_env env, napi_callback_info info)
{
    dpiNativeTypeNum nativeTypeNum;
    napi_value args[2];
    njsDbObject *obj;
    char *str = NULL;
    int32_t index;
    dpiData data;
    int status;

    if (!njsDbObject_validateArgs(env, info, 2, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getIntArg(env, args, 0, &index))
        return NULL;
    nativeTypeNum = obj->type->elementTypeInfo.nativeTypeNum;
    if (!njsDbObject_transformToOracle(obj, env, args[1], &nativeTypeNum,
            &data, &str, NULL))
        return NULL;
    status = dpiObject_setElementValueByIndex(obj->handle, index,
            nativeTypeNum, &data);
    if (str)
        free(str);
    if (status < 0)
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsDbObject_transformFromOracle()
//   Transforms the value from what was returned by ODPI-C into the value
// expected by JavaScript.
//-----------------------------------------------------------------------------
static bool njsDbObject_transformFromOracle(njsDbObject *obj, napi_env env,
        njsDataTypeInfo *typeInfo, dpiData *data, napi_value *value,
        njsDbObjectAttr *attr)
{
    napi_value global, constructor, temp;
    njsLobBuffer lobBuffer;
    bool ok;

    // handle null values
    if (data->isNull) {
        NJS_CHECK_NAPI(env, napi_get_null(env, value))
        return true;
    }

    // transform other values
    switch (typeInfo->oracleTypeNum) {
        case DPI_ORACLE_TYPE_CHAR:
        case DPI_ORACLE_TYPE_NCHAR:
        case DPI_ORACLE_TYPE_VARCHAR:
        case DPI_ORACLE_TYPE_NVARCHAR:
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    data->value.asBytes.ptr, data->value.asBytes.length,
                    value))
            return true;
        case DPI_ORACLE_TYPE_RAW:
            NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                    data->value.asBytes.length, data->value.asBytes.ptr, NULL,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NUMBER:
            if (typeInfo->nativeTypeNum == DPI_NATIVE_TYPE_INT64) {
                NJS_CHECK_NAPI(env, napi_create_int64(env, data->value.asInt64,
                        value))
            } else {
                NJS_CHECK_NAPI(env, napi_create_double(env,
                        data->value.asDouble, value))
            }
            return true;
        case DPI_ORACLE_TYPE_NATIVE_INT:
            NJS_CHECK_NAPI(env, napi_create_int64(env, data->value.asInt64,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asFloat,
                    value))
            return true;
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asDouble,
                    value))
            return true;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            NJS_CHECK_NAPI(env, napi_get_global(env, &global))
            NJS_CHECK_NAPI(env, napi_get_named_property(env, global, "Date",
                    &constructor))
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asDouble,
                    &temp))
            NJS_CHECK_NAPI(env, napi_new_instance(env, constructor, 1, &temp,
                    value))
            return true;
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
        case DPI_ORACLE_TYPE_BLOB:
            lobBuffer.dataType = typeInfo->oracleTypeNum;
            lobBuffer.handle = data->value.asLOB;
            lobBuffer.isAutoClose = true;
            if (dpiLob_getChunkSize(lobBuffer.handle,
                    &lobBuffer.chunkSize) < 0)
                return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
            if (dpiLob_getSize(lobBuffer.handle, &lobBuffer.length) < 0)
                return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    obj->type->jsDbObjectConstructor, &constructor))
            NJS_CHECK_NAPI(env, napi_get_named_property(env, constructor,
                    "_connection", &temp))
            if (!njsLob_new(obj->type->oracleDb, &lobBuffer, env, temp, value))
                return false;
            if (dpiLob_addRef(data->value.asLOB) < 0)
                return njsUtils_throwErrorDPI(env, obj->type->oracleDb);
            return true;
        case DPI_ORACLE_TYPE_OBJECT:
            ok = njsDbObject_new(typeInfo->objectType, data->value.asObject,
                    env, value);
            dpiObject_release(data->value.asObject);
            return ok;
        case DPI_ORACLE_TYPE_BOOLEAN:
            NJS_CHECK_NAPI(env, napi_get_boolean(env, data->value.asBoolean,
                    value))
            return true;
        default:
            break;
    }

    // unsupported
    if (attr)
        return njsUtils_throwError(env, errConvertFromObjAttr,
                attr->nameLength, attr->name, obj->type->fqnLength,
                obj->type->fqn);
    return njsUtils_throwError(env, errConvertFromObjElement,
            obj->type->fqnLength, obj->type->fqn);
}


//-----------------------------------------------------------------------------
// njsDbObject_transformToOracle()
//   Transforms a JavaScript value into the value that ODPI-C expects.
//-----------------------------------------------------------------------------
static bool njsDbObject_transformToOracle(njsDbObject *obj, napi_env env,
        napi_value value, dpiNativeTypeNum *nativeTypeNum, dpiData *data,
        char **strBuffer, njsDbObjectAttr *attr)
{
    napi_value global, constructor, asNumber, tempObj;
    napi_valuetype valueType;
    njsDbObjectType *objType;
    njsDbObject *valueObj;
    bool check, tempBool;
    void *bufferData;
    size_t length;

    data->isNull = 0;
    *strBuffer = NULL;
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    switch (valueType) {

        // null and undefined are treated as Oracle null values
        case napi_null:
        case napi_undefined:
            dpiData_setNull(data);
            return true;

        // strings are handled as bytes; the buffer is retained so it can be
        // freed by the caller when it is finished with it
        case napi_string:
            if (!njsUtils_copyStringFromJS(env, value, strBuffer, &length))
                return false;
            *nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            dpiData_setBytes(data, *strBuffer, (uint32_t) length);
            return true;

        // numbers are handled as doubles in JavaScript
        case napi_number:
            NJS_CHECK_NAPI(env, napi_get_value_double(env, value,
                    &data->value.asDouble));
            if (*nativeTypeNum != DPI_NATIVE_TYPE_TIMESTAMP) {
                *nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            }
            return true;

        // handle booleans
        case napi_boolean:
            NJS_CHECK_NAPI(env, napi_get_value_bool(env, value, &tempBool))
            *nativeTypeNum = DPI_NATIVE_TYPE_BOOLEAN;
            data->value.asBoolean = (int) tempBool;
            return true;

        // several types of objects are supported
        case napi_object:

            // handle dates
            NJS_CHECK_NAPI(env, napi_get_global(env, &global))
            NJS_CHECK_NAPI(env, napi_get_named_property(env, global, "Date",
                    &constructor))
            NJS_CHECK_NAPI(env, napi_instanceof(env, value, constructor,
                    &check))
            if (check) {
                NJS_CHECK_NAPI(env, napi_coerce_to_number(env, value,
                        &asNumber))
                NJS_CHECK_NAPI(env, napi_get_value_double(env, asNumber,
                        &data->value.asDouble))
                *nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
                return true;
            }

            // handle buffers
            NJS_CHECK_NAPI(env, napi_is_buffer(env, value, &check))
            if (check) {
                NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value,
                        &bufferData, &length))
                dpiData_setBytes(data, bufferData, (uint32_t) length);
                *nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
                return true;
            }

            // handle database objects
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    obj->type->oracleDb->jsBaseDbObjectConstructor,
                    &constructor))
            NJS_CHECK_NAPI(env, napi_instanceof(env, value, constructor,
                    &check))
            if (check) {
                if (!njsDbObject_getInstance(obj->type->oracleDb, env, value,
                        &valueObj))
                    return false;
                dpiData_setObject(data, valueObj->handle);
                *nativeTypeNum = DPI_NATIVE_TYPE_OBJECT;
                return true;
            }

            // other objects are the initial value for an object, but only if
            // the object is a collection containing objects or the attribute
            // is for an object
            objType = (attr) ? attr->typeInfo.objectType :
                    obj->type->elementTypeInfo.objectType;
            if (objType) {
                NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                        objType->jsDbObjectConstructor, &constructor))
                NJS_CHECK_NAPI(env, napi_new_instance(env, constructor, 1,
                        &value, &tempObj))
                if (!njsDbObject_getInstance(objType->oracleDb, env, tempObj,
                        &valueObj))
                    return false;
                dpiData_setObject(data, valueObj->handle);
                *nativeTypeNum = DPI_NATIVE_TYPE_OBJECT;
                return true;
            }

            break;

        // no other types are supported
        default:
            break;
    }

    if (attr)
        return njsUtils_throwError(env, errConvertToObjAttr, attr->nameLength,
                attr->name, obj->type->fqnLength, obj->type->fqn);
    return njsUtils_throwError(env, errConvertToObjElement,
            obj->type->fqnLength, obj->type->fqn);
}


//-----------------------------------------------------------------------------
// njsDbObject_trim()
//   Trim the specified number of elements from the end of the collection.
//-----------------------------------------------------------------------------
static napi_value njsDbObject_trim(napi_env env, napi_callback_info info)
{
    uint32_t numToTrim;
    napi_value args[1];
    njsDbObject *obj;

    if (!njsDbObject_validateArgs(env, info, 1, args, NULL, &obj))
        return NULL;
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &numToTrim))
        return NULL;
    if (dpiObject_trim(obj->handle, numToTrim) < 0)
        njsUtils_throwErrorDPI(env, obj->type->oracleDb);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsDbObject_validateArgs()
//   Gets the instance associated with the object and gets the arguments as
// well. If the number of arguments is incorrect, an exception is thrown. Since
// objects may be created in JavaScript, an instance amy not be associated at
// all. In that case, a new instance is created and associated with the object.
//-----------------------------------------------------------------------------
static bool njsDbObject_validateArgs(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsDbObjectAttr **attr,
        njsDbObject **obj)
{
    njsOracleDb *oracleDb;
    napi_value thisArg;
    size_t actualArgs;
    void *data;

    // get callback information and validate the number of arguments
    actualArgs = numArgs;
    NJS_CHECK_NAPI(env, napi_get_cb_info(env, info, &actualArgs, args,
            &thisArg, &data))
    if (actualArgs != numArgs)
        return njsUtils_throwError(env, errInvalidNumberOfParameters,
                actualArgs, numArgs);

    // data will either be an attribute or a pointer to the global njsOracleDb
    // instance
    if (attr) {
        *attr = (njsDbObjectAttr*) data;
        oracleDb = (*attr)->oracleDb;
    } else {
        oracleDb = (njsOracleDb*) data;
    }

    return njsDbObject_getInstance(oracleDb, env, thisArg, obj);
}


//-----------------------------------------------------------------------------
// njsDbObject_wrap()
//   Wraps the specified value with a new object instance and performs basic
// initialization, if needed. For collections which are proxied, the proxy
// target may already have been wrapped, so check for that first before
// creating a new instance.
//-----------------------------------------------------------------------------
static bool njsDbObject_wrap(napi_env env, napi_value value, njsDbObject **obj)
{
    napi_value prototype, temp;
    njsDbObjectType *objType;
    njsDbObject *tempObj;

    // acquire the prototype from the value; if the prototype does not wrap the
    // object type, then we are dealing with the proxy; in that case, acquire
    // the special property _target which will return the target of the proxy
    // and acquire the prototype from that value instead
    NJS_CHECK_NAPI(env, napi_get_prototype(env, value, &prototype))
    if (napi_unwrap(env, prototype, (void**) &objType) != napi_ok) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "_target",
                &temp))
        value = temp;
        if (napi_unwrap(env, value, (void**) obj) == napi_ok)
            return true;
        NJS_CHECK_NAPI(env, napi_get_prototype(env, value, &prototype))
        NJS_CHECK_NAPI(env, napi_unwrap(env, prototype, (void**) &objType))
    }

    // create a new object instance
    tempObj = calloc(1, sizeof(njsDbObject));
    if (!tempObj)
        return njsUtils_throwError(env, errInsufficientMemory);
    tempObj->type = objType;
    if (napi_wrap(env, value, tempObj, njsDbObject_finalize, NULL,
            NULL) != napi_ok) {
        free(tempObj);
        return njsUtils_genericThrowError(env);
    }

    *obj = tempObj;
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObjectType_finalize()
//   Invoked when njsDbObjectType is garbage collected.
//-----------------------------------------------------------------------------
static void njsDbObjectType_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsDbObjectType *type = (njsDbObjectType*) finalizeData;
    njsDbObjectAttr *attr;
    uint16_t i;

    if (type->attributes) {
        for (i = 0; i < type->numAttributes; i++) {
            attr = &type->attributes[i];
            if (attr->handle) {
                dpiObjectAttr_release(attr->handle);
                attr->handle = NULL;
            }
        }
        free(type->attributes);
        type->attributes = NULL;
    }
    if (type->handle) {
        dpiObjectType_release(type->handle);
        type->handle = NULL;
    }
    NJS_DELETE_REF_AND_CLEAR(type->jsDbObjectConstructor);
    NJS_FREE_AND_CLEAR(type->descriptors);
    NJS_FREE_AND_CLEAR(type->fqn);
    free(type);
}


//-----------------------------------------------------------------------------
// njsDbObjectType_getFromClass()
//   Acquires the object type from a class by acquiring the prototype and then
// unwrapping it to find the object type instance.
//-----------------------------------------------------------------------------
bool njsDbObjectType_getFromClass(napi_env env, napi_value cls,
        njsDbObjectType **objType)
{
    napi_value prototype;

    NJS_CHECK_NAPI(env, napi_get_named_property(env, cls, "prototype",
            &prototype))
    NJS_CHECK_NAPI(env, napi_unwrap(env, prototype, (void**) objType))
    return true;
}


//-----------------------------------------------------------------------------
// njsDbObjectType_populate()
//   Populates the object type and its JS equivalent with information about the
// object type.
//-----------------------------------------------------------------------------
static bool njsDbObjectType_populate(njsDbObjectType *objType,
        dpiObjectType *objectTypeHandle, napi_env env, napi_value jsObjectType,
        dpiObjectTypeInfo *info, njsBaton *baton)
{
    dpiObjectAttr **attrHandles;
    dpiObjectAttrInfo attrInfo;
    napi_value attrs, temp;
    njsDbObjectAttr *attr;
    size_t numProperties;
    napi_value element;
    uint16_t i;

    // transfer basic data to instance
    if (dpiObjectType_addRef(objectTypeHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    objType->handle = objectTypeHandle;
    objType->oracleDb = baton->oracleDb;
    objType->numAttributes = info->numAttributes;

    // transfer attribute information to instance
    if (info->numAttributes > 0) {

        // allocate space for attributes
        objType->attributes = calloc(info->numAttributes,
                sizeof(njsDbObjectAttr));
        if (!objType->attributes)
            return njsBaton_setError(baton, errInsufficientMemory);

        // determine the attributes associated with the object type
        attrHandles = calloc(info->numAttributes, sizeof(dpiObjectAttr*));
        if (!attrHandles)
            return njsBaton_setError(baton, errInsufficientMemory);
        if (dpiObjectType_getAttributes(objectTypeHandle,
                objType->numAttributes, attrHandles) < 0) {
            free(attrHandles);
            return njsBaton_setErrorDPI(baton);
        }

        // transfer handle to attribute structure
        for (i = 0; i < info->numAttributes; i++)
            objType->attributes[i].handle = attrHandles[i];
        free(attrHandles);

    }

    // process collections object types
    if (info->isCollection) {
        numProperties = 0;
        if (!njsDbObjectType_populateTypeInfo(&objType->elementTypeInfo,
                baton, env, &info->elementTypeInfo))
            return false;
        if (!njsUtils_addTypeProperties(env, jsObjectType, "elementType",
                info->elementTypeInfo.oracleTypeNum,
                objType->elementTypeInfo.objectType))
            return false;

    // process object types with attributes
    } else {
        numProperties = info->numAttributes;
        objType->descriptors = calloc(numProperties,
                sizeof(napi_property_descriptor));
        if (!objType->descriptors)
            return njsBaton_setError(baton, errInsufficientMemory);
        NJS_CHECK_NAPI(env, napi_create_object(env, &attrs))
        for (i = 0; i < info->numAttributes; i++) {
            attr = &objType->attributes[i];
            if (dpiObjectAttr_getInfo(attr->handle, &attrInfo) < 0)
                return njsBaton_setErrorDPI(baton);
            attr->oracleDb = baton->oracleDb;
            if (!njsDbObjectType_populateTypeInfo(&attr->typeInfo,
                    baton, env, &attrInfo.typeInfo))
                return false;
            attr->name = attrInfo.name;
            attr->nameLength = attrInfo.nameLength;
            NJS_CHECK_NAPI(env, napi_create_object(env, &element))
            if (!njsUtils_addTypeProperties(env, element, "type",
                    attrInfo.typeInfo.oracleTypeNum,
                    attr->typeInfo.objectType))
                return false;
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, attrInfo.name,
                    attrInfo.nameLength, &temp))
            objType->descriptors[i].name = temp;
            objType->descriptors[i].getter = njsDbObject_getAttrValue;
            objType->descriptors[i].setter = njsDbObject_setAttrValue;
            objType->descriptors[i].data = &objType->attributes[i];
            NJS_CHECK_NAPI(env, napi_set_property(env, attrs, temp, element))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType,
                "attributes", attrs))
        if (numProperties > 0) {
            NJS_CHECK_NAPI(env, napi_define_properties(env, jsObjectType,
                    numProperties, objType->descriptors))
        }
    }

    // keep a reference to the constructor
    NJS_CHECK_NAPI(env, napi_get_named_property(env, jsObjectType,
            "constructor", &temp))
    NJS_CHECK_NAPI(env, napi_create_reference(env, temp, 1,
            &objType->jsDbObjectConstructor))

    // keep a copy of the name to be used in error messages; include enough
    // space for the trailing NULL character even though it is never used
    objType->fqnLength = info->schemaLength + info->nameLength + 1;
    objType->fqn = malloc(objType->fqnLength + 1);
    if (!objType->fqn)
        return njsBaton_setError(baton, errInsufficientMemory);
    (void) snprintf(objType->fqn, objType->fqnLength + 1, "%.*s.%.*s",
            (int) info->schemaLength, info->schema, (int) info->nameLength,
            info->name);

    // set whether or not the class is a collection or not
    NJS_CHECK_NAPI(env, napi_get_boolean(env, info->isCollection, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, jsObjectType,
            "isCollection", temp))

    return true;
}


//-----------------------------------------------------------------------------
// njsDbObjectType_populateTypeInfo()
//   Populates type information. Acquires the object type, if needed. Modifies
// the native type to double for all dates.
//-----------------------------------------------------------------------------
static bool njsDbObjectType_populateTypeInfo(njsDataTypeInfo *info,
        njsBaton *baton, napi_env env, dpiDataTypeInfo *sourceInfo)
{
    napi_value temp;

    info->oracleTypeNum = sourceInfo->oracleTypeNum;
    info->nativeTypeNum = sourceInfo->defaultNativeTypeNum;
    if (info->oracleTypeNum == DPI_ORACLE_TYPE_DATE ||
            info->oracleTypeNum == DPI_ORACLE_TYPE_TIMESTAMP ||
            info->oracleTypeNum == DPI_ORACLE_TYPE_TIMESTAMP_TZ ||
            info->oracleTypeNum == DPI_ORACLE_TYPE_TIMESTAMP_LTZ) {
        info->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
    }
    if (sourceInfo->objectType) {
        return njsDbObject_getSubClass(baton, sourceInfo->objectType, env,
                &temp, &info->objectType);
    }
    return true;
}
