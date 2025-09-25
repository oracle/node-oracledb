// Copyright (c) 2019, 2025, Oracle and/or its affiliates.

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
//   njsAqQueue.c
//
// DESCRIPTION
//   AqQueue (Advanced Queuing Queue) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsAqQueue_deq);
NJS_NAPI_METHOD_DECL_ASYNC(njsAqQueue_enq);

// asynchronous methods
static NJS_ASYNC_METHOD(njsAqQueue_deqAsync);
static NJS_ASYNC_METHOD(njsAqQueue_enqAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsAqQueue_deqPostAsync);
static NJS_ASYNC_POST_METHOD(njsAqQueue_enqPostAsync);


// finalize
static NJS_NAPI_FINALIZE(njsAqQueue_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "deq", NULL, njsAqQueue_deq, NULL, NULL, NULL, napi_default,
            NULL },
    { "enq", NULL, njsAqQueue_enq, NULL, NULL, NULL, napi_default,
            NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqQueue = {
    "AqQueueImpl", sizeof(njsAqQueue), njsAqQueue_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsAqQueue_createMessage(njsBaton *baton, njsAqQueue *queue,
        napi_env env, napi_value value, dpiMsgProps **handle);
static bool njsAqQueue_setRecipients(njsBaton *baton, dpiMsgProps *handle,
        char **recipArr, uint32_t *recipLengths, uint32_t recipCount);


//----------------------------------------------------------------------------
// njsAqQueue_setRecipients()
//   To process the recipient list
//----------------------------------------------------------------------------
bool njsAqQueue_setRecipients(njsBaton *baton, dpiMsgProps *handle,
        char **recipArr, uint32_t *recipLengths, uint32_t recipCount)
{
    uint32_t i;
    int      status;

    dpiMsgRecipient *recipients = malloc(sizeof(dpiMsgRecipient) * recipCount);
    if (!recipients)
        return njsBaton_setErrorInsufficientMemory(baton);

    for (i = 0; i < recipCount; i++) {
        recipients[i].name = recipArr[i];
        recipients[i].nameLength = recipLengths[i];
    }
    status = dpiMsgProps_setRecipients(handle, recipients, recipCount);

    free(recipients);
    if (status < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_createMessage()
//   Creates a ODPI-C message properties handle which will be used to perform
// the actual enqueue operation. Each message must be a plain buffer or string
// (in which case all message properties are defaulted), or an object
// containing a "payload" property along with other properties specifying the
// properties to use during the enqueue.
//-----------------------------------------------------------------------------
static bool njsAqQueue_createMessage(njsBaton *baton, njsAqQueue *queue,
        napi_env env, napi_value value, dpiMsgProps **handle)
{
    napi_value payloadObj, tempObj;
    dpiMsgProps *tempHandle;
    bool isDbObject;
    size_t bufferLength;
    njsDbObject *obj;
    int32_t intValue;
    uint32_t recipCount = 0;
    char **recipArr = NULL;
    uint32_t *recipLengths = NULL;
    char *buffer;
    int status;
    bool ok = true;
    uint32_t i;
    njsJsonBuffer jsonBuffer;
    dpiJson *json;

    // create new ODPI-C message properties handle
    if (dpiConn_newMsgProps(queue->conn->handle, &tempHandle))
        return njsBaton_setErrorDPI(baton);
    *handle = tempHandle;

    // set payload
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "payload",
            &payloadObj))
    NJS_CHECK_NAPI(env, napi_instanceof(env, payloadObj,
            baton->jsContext.jsDbObjectConstructor, &isDbObject))
    if (isDbObject) {
        // DB Object
        if (!njsDbObject_getInstance(baton->globals, env, payloadObj, &obj))
            return false;
        status = dpiMsgProps_setPayloadObject(tempHandle, obj->handle);
    } else if (queue->isJson) {
        // JSON
        if (!njsJsonBuffer_fromValue(&jsonBuffer, env, payloadObj, &baton->jsContext))
            return false;
        if (dpiConn_newJson(queue->conn->handle, &json) < 0) {
            njsJsonBuffer_free(&jsonBuffer);
            return njsBaton_setErrorDPI(baton);
        }
        if (dpiJson_setValue(json, &jsonBuffer.topNode) < 0) {
            njsJsonBuffer_free(&jsonBuffer);
            dpiJson_release(json);
            return false;
        }
        status = dpiMsgProps_setPayloadJson(*handle, json);
        njsJsonBuffer_free(&jsonBuffer);
        dpiJson_release(json);
    } else {
        // RAW case
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, payloadObj,
                (void**) &buffer, &bufferLength))
        status = dpiMsgProps_setPayloadBytes(tempHandle, buffer,
                (uint32_t) bufferLength);
    }
    if (status < 0)
        return njsBaton_setErrorDPI(baton);

    // set correlation, if applicable
    buffer = NULL;
    if (!njsUtils_getNamedPropertyString(env, value, "correlation",
            &buffer, &bufferLength))
        return false;
    if (buffer) {
        status = dpiMsgProps_setCorrelation(tempHandle, buffer,
                (uint32_t) bufferLength);
        free(buffer);
        if (status < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set delay, if applicable
    if (!njsUtils_getNamedProperty(env, value, "delay", &tempObj))
        return false;
    if (tempObj) {
        NJS_CHECK_NAPI(env, napi_get_value_int32(env, tempObj, &intValue))
        if (dpiMsgProps_setDelay(tempHandle, intValue) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set exception queue, if applicable
    buffer = NULL;
    if (!njsUtils_getNamedPropertyString(env, value, "exceptionQueue",
            &buffer, &bufferLength))
        return false;
    if (buffer) {
        status = dpiMsgProps_setExceptionQ(tempHandle, buffer,
                (uint32_t) bufferLength);
        free(buffer);
        if (status < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set expiration, if applicable
    if (!njsUtils_getNamedProperty(env, value, "expiration", &tempObj))
        return false;
    if (tempObj) {
        NJS_CHECK_NAPI(env, napi_get_value_int32(env, tempObj, &intValue))
        if (dpiMsgProps_setExpiration(tempHandle, intValue) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set priority, if applicable
    if (!njsUtils_getNamedProperty(env, value, "priority", &tempObj))
        return false;
    if (tempObj) {
        NJS_CHECK_NAPI(env, napi_get_value_int32(env, tempObj, &intValue))
        if (dpiMsgProps_setPriority(tempHandle, intValue) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set recipient list, if applicable
    if (!njsUtils_getNamedPropertyStringArray(env, value, "recipients",
            &recipCount, &recipArr, &recipLengths))
        return false;
    if (recipCount > 0) {
        ok = njsAqQueue_setRecipients(baton, tempHandle, recipArr,
                 recipLengths, recipCount);
        for (i = 0; i < recipCount; i ++) {
            free(recipArr[i]);
        }
        free(recipArr);
        free(recipLengths);
    }

    return ok;
}


//-----------------------------------------------------------------------------
// njsAqQueue_createFromHandle()
//   Creates a new AQ queue object given the ODPI-C handle.
//-----------------------------------------------------------------------------
bool njsAqQueue_createFromHandle(njsBaton *baton, napi_env env,
        napi_value *queueObj)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    napi_value deqOptionsObj, enqOptionsObj, temp;
    napi_property_descriptor descriptors[4];
    dpiDeqOptions *deqOptionsHandle;
    dpiEnqOptions *enqOptionsHandle;
    njsAqDeqOptions *deqOptions;
    njsAqEnqOptions *enqOptions;
    njsAqQueue *queue;
    uint32_t typeNum;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefAqQueue,
            baton->globals->jsAqQueueConstructor, queueObj, (void**) &queue))
        return false;

    // perform some initializations
    queue->handle = baton->dpiQueueHandle;
    baton->dpiQueueHandle = NULL;
    queue->conn = conn;
    queue->isJson = baton->isJson;

    // create the dequeue options object
    if (dpiQueue_getDeqOptions(queue->handle, &deqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, baton->globals);
    if (!njsUtils_genericNew(env, &njsClassDefAqDeqOptions,
            baton->globals->jsAqDeqOptionsConstructor, &deqOptionsObj,
            (void**) &deqOptions))
        return false;
    if (dpiDeqOptions_addRef(deqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, baton->globals);
    deqOptions->handle = deqOptionsHandle;

    // create the enqueue options object
    if (dpiQueue_getEnqOptions(queue->handle, &enqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, baton->globals);
    if (!njsUtils_genericNew(env, &njsClassDefAqEnqOptions,
            baton->globals->jsAqEnqOptionsConstructor, &enqOptionsObj,
            (void**) &enqOptions))
        return false;
    if (dpiEnqOptions_addRef(enqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, baton->globals);
    enqOptions->handle = enqOptionsHandle;
    enqOptions->deliveryMode = DPI_MODE_MSG_PERSISTENT;

    // define properties for the connection (to ensure that it is not garbage
    // collected before the queue itself is) and for the dequeue and enqueue
    // options objects (for convenience)
    memset(descriptors, 0, sizeof(napi_property_descriptor) * 4);
    descriptors[0].utf8name = "_connection";
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &descriptors[0].value))
    descriptors[1].utf8name = "deqOptions";
    descriptors[1].value = deqOptionsObj;
    descriptors[1].attributes = napi_enumerable;
    descriptors[2].utf8name = "enqOptions";
    descriptors[2].value = enqOptionsObj;
    descriptors[2].attributes = napi_enumerable;
    descriptors[3].utf8name = "name";
    descriptors[3].attributes = napi_enumerable;
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, baton->name,
            baton->nameLength, &descriptors[3].value))
    NJS_CHECK_NAPI(env, napi_define_properties(env, *queueObj, 4,
            descriptors))

    // acquire object type class, if needed
    if (baton->dpiObjectTypeHandle && !njsDbObject_getSubClass(baton,
            baton->dpiObjectTypeHandle, env, &temp,
            &queue->payloadObjectType))
        return false;

    // add type properties
    typeNum = baton->isJson ?
                      DPI_ORACLE_TYPE_JSON :
                      (queue->payloadObjectType) ? DPI_ORACLE_TYPE_OBJECT :
                          DPI_ORACLE_TYPE_RAW;
    if (!njsUtils_addTypeProperties(env, *queueObj, "payloadType",
            typeNum, queue->payloadObjectType))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deq()
//   Dequeue messages from an AQ queue.
//
// PARAMETERS
//   - an array of one or more messages to dequeue
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsAqQueue_deq, 1, NULL)
{
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0],
            &baton->numMsgProps))
    return njsBaton_queueWork(baton, env, "Deq", njsAqQueue_deqAsync,
            njsAqQueue_deqPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqAsync()
//  Worker function for njsAqQueue_deqOne() & njsAqueue_deqMany()
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqAsync(njsBaton* baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    baton->msgProps = calloc(baton->numMsgProps, sizeof(dpiMsgProps*));
    if (!baton->msgProps)
        return njsBaton_setErrorInsufficientMemory(baton);
    if (baton->numMsgProps == 1) {
        if (dpiQueue_deqOne(queue->handle, &baton->msgProps[0]) < 0)
            return njsBaton_setErrorDPI(baton);

        // Handle the case when message queue is empty
        if (baton->msgProps[0] == NULL)
           baton->numMsgProps = 0;
    } else {
        // deqMany case
        if (dpiQueue_deqMany(queue->handle, &baton->numMsgProps,
                baton->msgProps) < 0)
            return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;
    napi_value temp;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numMsgProps,
            result))
    for (i = 0; i < baton->numMsgProps; i++) {
        if (!njsAqMessage_createFromHandle(baton, baton->msgProps[i], env,
                queue, &temp))
            return false;
        baton->msgProps[i] = NULL;
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, temp))
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enq()
//   Enqueue message(s) into an AQ queue.
//
// PARAMETERS
//   - array of one or more messages to enqueue
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsAqQueue_enq, 1, NULL)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;
    napi_value message;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_get_array_length(env, args[0],
            &baton->numMsgProps))
    baton->msgProps = calloc(baton->numMsgProps, sizeof(dpiMsgProps*));
    if (!baton->msgProps)
        return njsBaton_setErrorInsufficientMemory(baton);

    if (!njsBaton_setJsContext(baton, env))
        return false;
    for (i = 0; i < baton->numMsgProps; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, args[0], i, &message))
        if (!njsAqQueue_createMessage(baton, queue, env, message,
                &baton->msgProps[i]))
            return false;
    }
    return njsBaton_queueWork(baton, env, "Enq", njsAqQueue_enqAsync,
            njsAqQueue_enqPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqAsync()
//
//  Worker thread function for njsAqQueue_enqOne() & njsAqQueue_enqMany()
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqAsync(njsBaton *baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (baton->numMsgProps == 1) {
        // enqOne case
        if (dpiQueue_enqOne(queue->handle, baton->msgProps[0]) < 0)
            return njsBaton_setErrorDPI(baton);
    } else {
        // enqMany case
        if (dpiQueue_enqMany(queue->handle, baton->numMsgProps,
                baton->msgProps) < 0)
            return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqOnePostAsync()
//  Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;
    napi_value temp;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numMsgProps,
            result))

    for (i = 0; i < baton->numMsgProps; i++) {
        if (!njsAqMessage_createFromHandle(baton, baton->msgProps[i], env,
                queue, &temp))
            return false;
        baton->msgProps[i] = NULL;
        NJS_CHECK_NAPI(env, napi_set_element(env, *result, i, temp))
    }
    return true;
}

//-----------------------------------------------------------------------------
// njsAqQueue_finalize()
//   Invoked when the njsAqQueue object is garbage collected.
//-----------------------------------------------------------------------------
static void njsAqQueue_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsAqQueue *queue = (njsAqQueue*) finalizeData;

    if (queue->handle) {
        dpiQueue_release(queue->handle);
        queue->handle = NULL;
    }
    free(queue);
}
