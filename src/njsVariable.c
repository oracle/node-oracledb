// Copyright (c) 2019, 2023, Oracle and/or its affiliates.

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
//   njsVariable.c
//
// DESCRIPTION
//   Implementation of methods for variables.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// forward declarations for functions only used in this file
static void njsVariable_freeBuffer(njsVariableBuffer *buffer);
static bool njsVariable_processBuffer(njsVariable *var,
        njsVariableBuffer *buffer, njsBaton *baton);
static bool njsVariable_processBufferJS(njsVariable *var,
        njsVariableBuffer *buffer, napi_env env, njsBaton *baton);
static bool njsVariable_setFromString(njsVariable *var, uint32_t pos,
        napi_env env, napi_value value, njsBaton *baton);


//-----------------------------------------------------------------------------
// njsVariable_createBuffer()
//   Creates the buffer and ODPI-C variable used for binding data.
//-----------------------------------------------------------------------------
bool njsVariable_createBuffer(njsVariable *var, njsConnection *conn,
        njsBaton *baton)
{
    dpiData *data;
    uint32_t i;

    // determine native type to use
    switch (var->varTypeNum) {
        case DPI_ORACLE_TYPE_VARCHAR:
        case DPI_ORACLE_TYPE_NVARCHAR:
        case DPI_ORACLE_TYPE_CHAR:
        case DPI_ORACLE_TYPE_NCHAR:
        case DPI_ORACLE_TYPE_RAW:
        case DPI_ORACLE_TYPE_LONG_NVARCHAR:
        case DPI_ORACLE_TYPE_LONG_VARCHAR:
        case DPI_ORACLE_TYPE_LONG_RAW:
        case DPI_ORACLE_TYPE_XMLTYPE:
            var->nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            break;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            var->nativeTypeNum = DPI_NATIVE_TYPE_FLOAT;
            break;
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
        case DPI_ORACLE_TYPE_NUMBER:
            var->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            break;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            var->nativeTypeNum = DPI_NATIVE_TYPE_TIMESTAMP;
            break;
        case DPI_ORACLE_TYPE_STMT:
            var->nativeTypeNum = DPI_NATIVE_TYPE_STMT;
            break;
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
        case DPI_ORACLE_TYPE_BLOB:
            var->nativeTypeNum = DPI_NATIVE_TYPE_LOB;
            break;
        case NJS_DATATYPE_BOOLEAN:
            var->nativeTypeNum = DPI_NATIVE_TYPE_BOOLEAN;
            break;
        case DPI_ORACLE_TYPE_OBJECT:
            var->nativeTypeNum = DPI_NATIVE_TYPE_OBJECT;
            break;
        case DPI_ORACLE_TYPE_JSON:
            var->nativeTypeNum = DPI_NATIVE_TYPE_JSON;
            break;
        case DPI_ORACLE_TYPE_NATIVE_INT:
            var->nativeTypeNum = DPI_NATIVE_TYPE_INT64;
            break;
        case DPI_ORACLE_TYPE_ROWID:
            var->nativeTypeNum = DPI_NATIVE_TYPE_ROWID;
            break;
    }

    // allocate buffer
    var->buffer = calloc(1, sizeof(njsVariableBuffer));
    if (!var->buffer)
        return njsBaton_setErrorInsufficientMemory(baton);

    // create ODPI-C variable
    if (dpiConn_newVar(conn->handle, var->varTypeNum, var->nativeTypeNum,
            var->maxArraySize, var->maxSize, 1, var->isArray,
            var->dpiObjectTypeHandle, &var->dpiVarHandle,
            &var->buffer->dpiVarData) < 0)
        return njsBaton_setErrorDPI(baton);

    // for cursors, set the prefetch value, if it differs from the default;
    // also mark the variable as not null in order for the prefetch rows to
    // take effect
    if (var->nativeTypeNum == DPI_NATIVE_TYPE_STMT &&
            baton->prefetchRows != DPI_DEFAULT_PREFETCH_ROWS) {
        for (i = 0; i < var->maxArraySize; i++) {
            data = &var->buffer->dpiVarData[i];
            data->isNull = 0;
            if (dpiStmt_setPrefetchRows(data->value.asStmt,
                    baton->prefetchRows) < 0)
                return njsBaton_setErrorDPI(baton);
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_free()
//   Frees the contents of the variable.
//-----------------------------------------------------------------------------
void njsVariable_free(njsVariable *var)
{
    uint32_t i;

    NJS_FREE_AND_CLEAR(var->name);
    if (var->dpiVarHandle) {
        dpiVar_release(var->dpiVarHandle);
        var->dpiVarHandle = NULL;
    }
    if (var->buffer) {
        njsVariable_freeBuffer(var->buffer);
        free(var->buffer);
        var->buffer = NULL;
    }
    if (var->dmlReturningBuffers) {
        for (i = 0; i < var->numDmlReturningBuffers; i++)
            njsVariable_freeBuffer(&var->dmlReturningBuffers[i]);
        free(var->dmlReturningBuffers);
        var->dmlReturningBuffers = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsVariable_freeBuffer()
//   Frees the contents of the variable buffer.
//-----------------------------------------------------------------------------
static void njsVariable_freeBuffer(njsVariableBuffer *buffer)
{
    uint32_t i;

    if (buffer->lobs) {
        for (i = 0; i < buffer->numElements; i++) {
            if (buffer->lobs[i].handle) {
                dpiLob_release(buffer->lobs[i].handle);
                buffer->lobs[i].handle = NULL;
            }
        }
        free(buffer->lobs);
        buffer->lobs = NULL;
    }

    if (buffer->queryVars) {
        for (i = 0; i < buffer->numQueryVars; i++)
            njsVariable_free(&buffer->queryVars[i]);
        free(buffer->queryVars);
        buffer->queryVars = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsVariable_getArrayValue()
//   Get the value from the variable as an array.
//-----------------------------------------------------------------------------
bool njsVariable_getArrayValue(njsVariable *var, njsConnection *conn,
        uint32_t pos, njsBaton *baton, napi_env env, napi_value *value)
{
    njsVariableBuffer *buffer = var->buffer;
    napi_value element;
    uint32_t i;

    // create array of the required length
    if (var->dmlReturningBuffers)
        buffer = &var->dmlReturningBuffers[pos];
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, buffer->numElements,
            value))

    // populate array
    for (i = 0; i < buffer->numElements; i++) {
        if (!njsVariable_getScalarValue(var, conn, buffer, i, baton, env,
                &element))
            return false;
        NJS_CHECK_NAPI(env, napi_set_element(env, *value, i, element))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_getMetadataMany()
//   Return metadata about many variables.
//-----------------------------------------------------------------------------
bool njsVariable_getMetadataMany(njsVariable *vars, uint32_t numVars,
        napi_env env, napi_value *metadata)
{
    napi_value column;
    uint32_t i;

    // create array of the specified length
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, numVars, metadata))

    // process each of the variables in the array
    for (i = 0; i < numVars; i++) {
        if (!njsVariable_getMetadataOne(&vars[i], env, &column))
            return false;
        NJS_CHECK_NAPI(env, napi_set_element(env, *metadata, i, column))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_getMetadataOne()
//   Return metadata about a particular variable.
//-----------------------------------------------------------------------------
bool njsVariable_getMetadataOne(njsVariable *var, napi_env env,
        napi_value *metadata)
{
    napi_value temp;
    napi_value annObject, key, value;
    uint32_t i;

    // create object to store metadata on
    NJS_CHECK_NAPI(env, napi_create_object(env, metadata))

    // store name
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, var->name,
            var->nameLength, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata, "name", temp))

    // store database type, name and class, as needed
    if (!njsUtils_addTypeProperties(env, *metadata, "dbType",
            var->dbTypeNum, var->objectType))
        return false;

    // store nullable
    NJS_CHECK_NAPI(env, napi_get_boolean(env, var->isNullable, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata, "nullable",
            temp))

    // store isJson
    NJS_CHECK_NAPI(env, napi_get_boolean(env, var->isJson, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata, "isJson",
            temp))

    // store isOson
    NJS_CHECK_NAPI(env, napi_get_boolean(env, var->isOson, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata, "isOson",
            temp))

    // store domainSchema
    if (var->domainSchemaLength) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, var->domainSchema,
                var->domainSchemaLength, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata,
                "domainSchema", temp))
    }

    // store domainName
    if (var->domainNameLength) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, var->domainName,
                var->domainNameLength, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata,
                "domainName", temp))
    }

    if (var->numAnnotations) {
        NJS_CHECK_NAPI(env, napi_create_object(env, &annObject))
        for (i = 0; i < var->numAnnotations; i++) {
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    var->dpiAnnotations[i].value,
                    var->dpiAnnotations[i].valueLength, &value))
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    var->dpiAnnotations[i].key,
                    var->dpiAnnotations[i].keyLength, &key))
            NJS_CHECK_NAPI(env, napi_set_property(env, annObject, key, value))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata,
                "annotations", annObject))
    }

    // store size in bytes, if applicable
    switch (var->dbTypeNum) {
        case DPI_ORACLE_TYPE_VARCHAR:
        case DPI_ORACLE_TYPE_NVARCHAR:
        case DPI_ORACLE_TYPE_CHAR:
        case DPI_ORACLE_TYPE_NCHAR:
        case DPI_ORACLE_TYPE_RAW:
            NJS_CHECK_NAPI(env, napi_create_uint32(env, var->dbSizeInBytes,
                    &temp))
            NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata,
                    "byteSize", temp))
            break;
        default:
            break;
    }

    // store precision, if applicable
    switch (var->dbTypeNum) {
        case DPI_ORACLE_TYPE_NUMBER:
        case DPI_ORACLE_TYPE_TIMESTAMP:
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            NJS_CHECK_NAPI(env, napi_create_int32(env, var->precision, &temp))
            NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata,
                    "precision", temp))
            break;
        default:
            break;
    }

    // store scale, if applicable
    if (var->dbTypeNum == DPI_ORACLE_TYPE_NUMBER) {
        NJS_CHECK_NAPI(env, napi_create_int32(env, var->scale, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *metadata, "scale",
                temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_getScalarValue()
//   Get the value from the variable at the specified position in the variable.
//-----------------------------------------------------------------------------
bool njsVariable_getScalarValue(njsVariable *var, njsConnection *conn,
        njsVariableBuffer *buffer, uint32_t pos, njsBaton *baton, napi_env env,
        napi_value *value)
{
    uint32_t bufferRowIndex, rowidValueLength;
    const char *rowidValue;
    dpiJsonNode *topNode;
    dpiData *data;

    // get the value from ODPI-C
    bufferRowIndex = baton->bufferRowIndex + pos;
    data = &buffer->dpiVarData[bufferRowIndex];

    // handle null values
    if (data->isNull) {
        NJS_CHECK_NAPI(env, napi_get_null(env, value))
        return true;
    }

    // handle all other values
    switch (var->nativeTypeNum) {
        case DPI_NATIVE_TYPE_INT64:
            NJS_CHECK_NAPI(env, napi_create_int64(env, data->value.asInt64,
                    value))
            break;
        case DPI_NATIVE_TYPE_FLOAT:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asFloat,
                    value))
            break;
        case DPI_NATIVE_TYPE_TIMESTAMP:
            if (!njsUtils_getDateValue(var->varTypeNum, env,
                    baton->jsMakeDateFn, &data->value.asTimestamp, value))
                return false;
            break;
        case DPI_NATIVE_TYPE_DOUBLE:
            NJS_CHECK_NAPI(env, napi_create_double(env, data->value.asDouble,
                    value))
            break;
        case DPI_NATIVE_TYPE_BYTES:
            if (data->value.asBytes.length > var->maxSize)
                return njsBaton_setErrorInsufficientBufferForBinds(baton);
            if (data->value.asBytes.length == 0) {
                NJS_CHECK_NAPI(env, napi_get_null(env, value))
            } else if (var->varTypeNum == DPI_ORACLE_TYPE_RAW ||
                    var->varTypeNum == DPI_ORACLE_TYPE_LONG_RAW) {
                NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                        data->value.asBytes.length, data->value.asBytes.ptr,
                        NULL, value))
            } else {
                NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                        data->value.asBytes.ptr, data->value.asBytes.length,
                        value))
            }
            break;
        case DPI_NATIVE_TYPE_LOB:
            return njsLob_new(baton->globals, &buffer->lobs[pos], env,
                    baton->jsCallingObj, value);
        case DPI_NATIVE_TYPE_STMT:
            if (dpiStmt_addRef(data->value.asStmt) < 0)
                return njsBaton_setErrorDPI(baton);
            if (!njsResultSet_new(baton, env, conn, data->value.asStmt,
                    buffer->queryVars, buffer->numQueryVars, value)) {
                dpiStmt_release(data->value.asStmt);
                return false;
            }
            // only nested cursors need to have their variables retained; for
            // regular cursors, the variables must be tranferred to the result
            // set and deleted there once the result set is closed
            if (baton->callingInstance == (void*) conn) {
                buffer->queryVars = NULL;
                buffer->numQueryVars = 0;
            }
            break;
        case DPI_NATIVE_TYPE_ROWID:
            if (dpiRowid_getStringValue(data->value.asRowid, &rowidValue,
                    &rowidValueLength) < 0)
                return njsBaton_setErrorDPI(baton);
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, rowidValue,
                    rowidValueLength, value))
            break;
        case DPI_NATIVE_TYPE_BOOLEAN:
            NJS_CHECK_NAPI(env, napi_get_boolean(env, data->value.asBoolean,
                    value))
            break;
        case DPI_NATIVE_TYPE_OBJECT:
            if (!njsDbObject_new(var->objectType, data->value.asObject,
                    env, baton->globals, value))
                return false;
            break;
        case DPI_NATIVE_TYPE_JSON:
            if (dpiJson_getValue(data->value.asJson, DPI_JSON_OPT_DEFAULT,
                    &topNode) < 0)
                return njsBaton_setErrorDPI(baton);
            return njsBaton_getJsonNodeValue(baton, topNode, env, value);
        default:
            break;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_initForQuery()
//   Initialize query variables using the metadata from the query as a
// template.
//-----------------------------------------------------------------------------
bool njsVariable_initForQuery(njsVariable *vars, uint32_t numVars,
        dpiStmt *handle, njsBaton *baton)
{
    dpiQueryInfo queryInfo;
    uint32_t i;

    for (i = 0; i < numVars; i++) {
        vars[i].pos = i + 1;
        vars[i].isArray = false;
        vars[i].bindDir = NJS_BIND_OUT;
        if (dpiStmt_getQueryInfo(handle, vars[i].pos, &queryInfo) < 0)
            return njsBaton_setErrorDPI(baton);
        vars[i].name = malloc(queryInfo.nameLength);
        if (!vars[i].name)
            return njsBaton_setErrorInsufficientMemory(baton);
        memcpy(vars[i].name, queryInfo.name, queryInfo.nameLength);
        vars[i].nameLength = queryInfo.nameLength;
        vars[i].maxArraySize = baton->fetchArraySize;
        vars[i].dbSizeInBytes = queryInfo.typeInfo.dbSizeInBytes;
        vars[i].maxSize = queryInfo.typeInfo.clientSizeInBytes;
        vars[i].precision = queryInfo.typeInfo.precision +
                queryInfo.typeInfo.fsPrecision;
        vars[i].scale = queryInfo.typeInfo.scale;
        vars[i].isNullable = queryInfo.nullOk;
        vars[i].dbTypeNum = queryInfo.typeInfo.oracleTypeNum;
        if (queryInfo.typeInfo.objectType)
            vars[i].dpiObjectTypeHandle = queryInfo.typeInfo.objectType;
        vars[i].isJson = queryInfo.typeInfo.isJson;
        vars[i].isOson = queryInfo.typeInfo.isOson;
        if (queryInfo.typeInfo.domainSchemaLength) {
            vars[i].domainSchemaLength = queryInfo.typeInfo.domainSchemaLength;
            vars[i].domainSchema = queryInfo.typeInfo.domainSchema;
        }
        if (queryInfo.typeInfo.domainNameLength) {
            vars[i].domainNameLength = queryInfo.typeInfo.domainNameLength;
            vars[i].domainName = queryInfo.typeInfo.domainName;
        }
        vars[i].numAnnotations = queryInfo.typeInfo.numAnnotations;
        if (queryInfo.typeInfo.annotations) {
            vars[i].dpiAnnotations = queryInfo.typeInfo.annotations;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_initForQueryJS()
//   Perform any further initialization of query variables that needs to be
// done within JavaScript. This includes acquiring the object type constructors
// for all object types fetched by this query.
//-----------------------------------------------------------------------------
bool njsVariable_initForQueryJS(njsVariable *vars, uint32_t numVars,
        napi_env env, njsBaton *baton)
{
    napi_value temp;
    uint32_t i;

    for (i = 0; i < numVars; i++) {
        if (vars[i].dpiObjectTypeHandle) {
            if (!njsDbObject_getSubClass(baton, vars[i].dpiObjectTypeHandle,
                    env, &temp, &vars[i].objectType))
                return false;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_process()
//   Process variables used during binding or fetching. REF cursors must have
// their query variables defined and LOBs must be initially processed in order
// to have as much work as possible done in the worker thread and to avoid any
// round trips.
//-----------------------------------------------------------------------------
bool njsVariable_process(njsVariable *vars, uint32_t numVars, uint32_t numRows,
        njsBaton *baton)
{
    njsVariableBuffer *buffer;
    uint32_t col, row, i;
    njsVariable *var;

    for (col = 0; col < numVars; col++) {
        var = &vars[col];
        var->buffer->numElements = numRows;
        if (var->bindDir == NJS_BIND_IN)
            continue;

        // clear DML returning buffers if any exist
        if (var->dmlReturningBuffers) {
            for (i = 0; i < var->numDmlReturningBuffers; i++)
                njsVariable_freeBuffer(&var->dmlReturningBuffers[i]);
            free(var->dmlReturningBuffers);
            var->dmlReturningBuffers = NULL;
        }

        // for arrays, determine the number of elements in the array
        if (var->isArray) {
            if (dpiVar_getNumElementsInArray(var->dpiVarHandle,
                    &var->buffer->numElements) < 0)
                return njsBaton_setErrorDPI(baton);

        // for DML returning statements, each row has its own set of rows, so
        // acquire those from ODPI-C and store them in variable buffers for
        // later processing
        } else if (baton->stmtInfo.isReturning &&
                var->bindDir == NJS_BIND_OUT) {
            var->numDmlReturningBuffers = numRows;
            var->dmlReturningBuffers = calloc(numRows,
                    sizeof(njsVariableBuffer));
            if (!var->dmlReturningBuffers)
                return njsBaton_setErrorInsufficientMemory(baton);
            for (row = 0; row < numRows; row++) {
                buffer = &var->dmlReturningBuffers[row];
                if (dpiVar_getReturnedData(var->dpiVarHandle, row,
                        &buffer->numElements, &buffer->dpiVarData) < 0)
                    return njsBaton_setErrorDPI(baton);
                if (!njsVariable_processBuffer(var, buffer, baton))
                    return false;
            }
        }

        // process the main buffer if DML returning is not in effect
        if (!var->dmlReturningBuffers &&
                !njsVariable_processBuffer(var, var->buffer, baton))
            return false;

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_processJS()
//   Process variables used during binding or fetching in preparation for
// use in JavaScript. All object types must have their constructors acquired
// so REF cursors are examined to see if any object types are present.
//-----------------------------------------------------------------------------
bool njsVariable_processJS(njsVariable *vars, uint32_t numVars, napi_env env,
        njsBaton *baton)
{
    njsVariableBuffer *buffer;
    njsVariable *var;
    uint32_t i, j;

    for (i = 0; i < numVars; i++) {
        var = &vars[i];
        if (var->bindDir != NJS_BIND_OUT &&
                var->varTypeNum != DPI_ORACLE_TYPE_STMT)
            continue;
        if (!var->dmlReturningBuffers) {
            if (!njsVariable_processBufferJS(var, var->buffer, env, baton))
                return false;
        } else {
            for (j = 0; j < var->numDmlReturningBuffers; j++) {
                buffer = &var->dmlReturningBuffers[j];
                if (!njsVariable_processBufferJS(var, buffer, env, baton))
                    return false;
            }
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_processBuffer()
//   Process a variable buffer. REF cursors must have their query variables
// defined and LOBs must be initially processed in order to have as much work
// as possible done in the worker thread and avoid any round trips.
//-----------------------------------------------------------------------------
static bool njsVariable_processBuffer(njsVariable *var,
        njsVariableBuffer *buffer, njsBaton *baton)
{
    uint32_t i, elementIndex;
    njsLobBuffer *lob;
    dpiStmt *stmt;
    dpiData *data;

    switch (var->varTypeNum) {
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
        case DPI_ORACLE_TYPE_BLOB:
            NJS_FREE_AND_CLEAR(buffer->lobs);
            if (buffer->numElements == 0)
                break;
            buffer->lobs = calloc(buffer->numElements, sizeof(njsLobBuffer));
            if (!buffer->lobs)
                return njsBaton_setErrorInsufficientMemory(baton);
            for (i = 0; i < buffer->numElements; i++) {
                lob = &buffer->lobs[i];
                lob->dataType = var->varTypeNum;
                elementIndex = baton->bufferRowIndex + i;
                data = &buffer->dpiVarData[elementIndex];
                if (data->isNull)
                    continue;
                if (dpiLob_addRef(data->value.asLOB) < 0)
                    return njsBaton_setErrorDPI(baton);
                lob->handle = data->value.asLOB;
                if (!njsLob_populateBuffer(baton, lob))
                    return false;
            }
            break;
        case DPI_ORACLE_TYPE_STMT:
            // if no rows have been fetched or query variables have already
            // been set up for a nested cursor, no need to do anything further
            if (buffer->numElements == 0 || buffer->queryVars)
                break;
            stmt = buffer->dpiVarData->value.asStmt;
            if (dpiStmt_getNumQueryColumns(stmt, &buffer->numQueryVars) < 0)
                return njsBaton_setErrorDPI(baton);
            buffer->queryVars = calloc(buffer->numQueryVars,
                    sizeof(njsVariable));
            if (!buffer->queryVars)
                return njsBaton_setErrorInsufficientMemory(baton);
            if (!njsVariable_initForQuery(buffer->queryVars,
                    buffer->numQueryVars, stmt, baton))
                return false;
            break;
        default:
            break;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_processBufferJS()
//   Process a variable buffer in preparation for use in JavaScript. In
// particular, this acquires object type constructors as required for REF
// cursors.
//-----------------------------------------------------------------------------
static bool njsVariable_processBufferJS(njsVariable *var,
        njsVariableBuffer *buffer, napi_env env, njsBaton *baton)
{
    if (var->varTypeNum == DPI_ORACLE_TYPE_STMT) {
        if (!njsVariable_initForQueryJS(buffer->queryVars,
                buffer->numQueryVars, env, baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsVariable_setScalarValue()
//   Set the value of the variable from the specified Javascript object at the
// given position.
//-----------------------------------------------------------------------------
bool njsVariable_setScalarValue(njsVariable *var, uint32_t pos, napi_env env,
        napi_value value, njsBaton *baton)
{
    napi_valuetype valueType;
    njsJsonBuffer jsonBuffer;
    njsResultSet *resultSet;
    dpiLob *tempLobHandle;
    size_t bufferLength;
    double tempDouble;
    njsDbObject *obj;
    dpiData *data;
    void *buffer;
    njsLob *lob;
    bool check;

    // initialization
    data = &var->buffer->dpiVarData[pos];
    data->isNull = 0;

    // handle binding to JSON values; the types of values that can be stored in
    // a JSON value are managed independently
    if (var->varTypeNum == DPI_ORACLE_TYPE_JSON) {
        if (!njsJsonBuffer_fromValue(&jsonBuffer, env, value, baton)) {
            njsJsonBuffer_free(&jsonBuffer);
            return false;
        }
        if (dpiJson_setValue(data->value.asJson, &jsonBuffer.topNode) < 0) {
            njsJsonBuffer_free(&jsonBuffer);
            return false;
        }
        njsJsonBuffer_free(&jsonBuffer);
        return true;
    }

    // nulls and undefined in JS are mapped to NULL in Oracle; no checks needed
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    if (valueType == napi_undefined || valueType == napi_null) {
        data->isNull = 1;
        return true;
    }

    // handle binding numbers
    if (valueType == napi_number) {
        NJS_CHECK_NAPI(env, napi_get_value_double(env, value, &tempDouble))
        if (var->varTypeNum == DPI_ORACLE_TYPE_NATIVE_FLOAT) {
            data->value.asFloat = (float) tempDouble;
        } else if (var->varTypeNum == DPI_ORACLE_TYPE_NATIVE_INT) {
            data->value.asInt64 = (int64_t) tempDouble;
        } else {
            data->value.asDouble = tempDouble;
        }
        return true;
    }

    // handle binding strings
    if (valueType == napi_string)
        return njsVariable_setFromString(var, pos, env, value, baton);

    // handle binding booleans
    if (valueType == napi_boolean) {
        NJS_CHECK_NAPI(env, napi_get_value_bool(env, value,
                (bool*) &data->value.asBoolean))
        return true;
    }

    // handle buffers
    NJS_CHECK_NAPI(env, napi_is_buffer(env, value, &check))
    if (check) {
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value, &buffer,
                &bufferLength))
        if (dpiVar_setFromBytes(var->dpiVarHandle, pos, buffer,
                (uint32_t) bufferLength) < 0)
            return njsBaton_setErrorDPI(baton);
        return true;
    }

    // handle binding dates
    NJS_CHECK_NAPI(env, napi_is_date(env, value, &check))
    if (check) {
        return njsUtils_setDateValue(var->varTypeNum, env, value,
                baton->jsGetDateComponentsFn, &data->value.asTimestamp);
    }

    // handle binding cursors
    NJS_CHECK_NAPI(env, napi_instanceof(env, value,
            baton->jsResultSetConstructor, &check))
    if (check) {
        NJS_CHECK_NAPI(env, napi_unwrap(env, value, (void**) &resultSet))
        if (dpiVar_setFromStmt(var->dpiVarHandle, pos,
                resultSet->handle) < 0)
            return njsBaton_setErrorDPI(baton);
        return true;
    }

    // handle binding LOBs
    NJS_CHECK_NAPI(env, napi_instanceof(env, value,
            baton->jsLobConstructor, &check))
    if (check) {

        // get LOB instance
        NJS_CHECK_NAPI(env, napi_unwrap(env, value, (void**) &lob))
        tempLobHandle = lob->handle;

        // for INOUT binds a copy of the LOB is made and the copy bound
        // the original IN value is also closed
        if (var->bindDir == NJS_BIND_INOUT) {
            if (dpiLob_copy(lob->handle, &tempLobHandle) < 0)
                return njsBaton_setErrorDPI(baton);
            if (dpiLob_release(lob->handle) < 0)
                return njsBaton_setErrorDPI(baton);
            lob->handle = NULL;
        }

        // perform the bind
        if (dpiVar_setFromLob(var->dpiVarHandle, pos, tempLobHandle) < 0) {
            njsBaton_setErrorDPI(baton);
            if (!lob->handle)
                dpiLob_release(tempLobHandle);
            return false;
        }
        if (!lob->handle)
            dpiLob_release(tempLobHandle);
        return true;

    }

    // handle binding database objects
    NJS_CHECK_NAPI(env, napi_instanceof(env, value,
            baton->jsDbObjectConstructor, &check))
    if (check) {
        if (!njsDbObject_getInstance(baton->globals, env, value, &obj))
            return false;
        if (dpiVar_setFromObject(var->dpiVarHandle, pos, obj->handle) < 0)
            return njsBaton_setErrorDPI(baton);
        var->objectType = obj->type;
        return true;
    }

    return njsUtils_genericThrowError(env, __FILE__, __LINE__);
}


//-----------------------------------------------------------------------------
// njsVariable_setFromString()
//   Set the value of the variable from the specified Javascript string. At
// this point it is known that the Javascript value is indeed a string and that
// the variable can support it.
//-----------------------------------------------------------------------------
static bool njsVariable_setFromString(njsVariable *var, uint32_t pos,
        napi_env env, napi_value value, njsBaton *baton)
{
    size_t bufferLength;
    char *buffer;

    // determine length of string
    NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, value, NULL, 0,
            &bufferLength))

    // allocate memory for the buffer
    buffer = malloc(bufferLength + 1);
    if (!buffer)
        return njsBaton_setErrorInsufficientMemory(baton);

    // get the string value
    if (napi_get_value_string_utf8(env, value, buffer, bufferLength + 1,
            &bufferLength) != napi_ok) {
        free(buffer);
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);
    }

    // write it to the variable
    if (dpiVar_setFromBytes(var->dpiVarHandle, pos, buffer,
            (uint32_t) bufferLength) < 0) {
        free(buffer);
        return njsBaton_setErrorDPI(baton);
    }

    free(buffer);
    return true;
}
