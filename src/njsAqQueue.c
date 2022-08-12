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
//   njsAqQueue.c
//
// DESCRIPTION
//   AqQueue (Advanced Queuing Queue) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsAqQueue_deqMany);
static NJS_NAPI_METHOD(njsAqQueue_deqOne);
static NJS_NAPI_METHOD(njsAqQueue_enqMany);
static NJS_NAPI_METHOD(njsAqQueue_enqOne);

// asynchronous methods
static NJS_ASYNC_METHOD(njsAqQueue_deqManyAsync);
static NJS_ASYNC_METHOD(njsAqQueue_deqOneAsync);
static NJS_ASYNC_METHOD(njsAqQueue_enqManyAsync);
static NJS_ASYNC_METHOD(njsAqQueue_enqOneAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsAqQueue_deqManyPostAsync);
static NJS_ASYNC_POST_METHOD(njsAqQueue_deqOnePostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsAqQueue_deqManyProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsAqQueue_enqManyProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsAqQueue_enqOneProcessArgs);

// finalize
static NJS_NAPI_FINALIZE(njsAqQueue_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_deqMany", NULL, njsAqQueue_deqMany, NULL, NULL, NULL, napi_default,
            NULL },
    { "_deqOne", NULL, njsAqQueue_deqOne, NULL, NULL, NULL, napi_default,
            NULL },
    { "_enqMany", NULL, njsAqQueue_enqMany, NULL, NULL, NULL, napi_default,
            NULL },
    { "_enqOne", NULL, njsAqQueue_enqOne, NULL, NULL, NULL, napi_default,
            NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefAqQueue = {
    "AqQueue", sizeof(njsAqQueue), njsAqQueue_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsAqQueue_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);
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
        return njsBaton_setError(baton, errInsufficientMemory);

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
// njsAqQueue_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. The connection is also checked to see if it is open. If this fails
// for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsAqQueue_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsBaton *tempBaton;
    njsAqQueue *queue;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    queue = (njsAqQueue*) tempBaton->callingInstance;
    tempBaton->oracleDb = queue->conn->oracleDb;

    *baton = tempBaton;
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
    napi_value payloadObj, constructor, temp;
    napi_valuetype valueType;
    dpiMsgProps *tempHandle;
    bool found, isDbObject;
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

    // determine payload exists and is a string or buffer
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    switch (valueType) {
        case napi_string:
            payloadObj = value;
            break;
        case napi_object:
            NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                    baton->oracleDb->jsBaseDbObjectConstructor, &constructor))
            NJS_CHECK_NAPI(env, napi_instanceof(env, value, constructor,
                    &isDbObject))
            if (isDbObject || njsUtils_isBuffer(env, value)) {
                payloadObj = value;
            } else {
                NJS_CHECK_NAPI(env, napi_get_named_property(env, value,
                        "payload", &payloadObj))
                NJS_CHECK_NAPI(env, napi_typeof(env, payloadObj, &valueType))
                if (valueType == napi_string)
                    break;
                if (valueType == napi_object) {
                    NJS_CHECK_NAPI(env, napi_instanceof(env, payloadObj,
                            constructor, &isDbObject))
                    if (isDbObject || njsUtils_isBuffer(env, payloadObj))
                        break;
                    if (queue->payloadObjectType) {
                        NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                                queue->payloadObjectType->jsDbObjectConstructor,
                                &constructor))
                        NJS_CHECK_NAPI(env, napi_new_instance(env, constructor,
                                1, &payloadObj, &temp))
                        payloadObj = temp;
                        isDbObject = true;
                        break;
                    }
                }
                return njsBaton_setError(baton, errInvalidAqMessage);
            }
            break;
        default:
            return njsBaton_setError(baton, errInvalidAqMessage);
    }

    // create new ODPI-C message properties handle
    if (dpiConn_newMsgProps(queue->conn->handle, &tempHandle))
        return njsBaton_setErrorDPI(baton);
    *handle = tempHandle;

    // set payload
    if (valueType == napi_string) {
        buffer = NULL;
        if (!njsUtils_copyStringFromJS(env, payloadObj, &buffer,
                &bufferLength))
            return false;
        status = dpiMsgProps_setPayloadBytes(tempHandle, buffer,
                (uint32_t) bufferLength);
        free(buffer);
    } else if (isDbObject) {
        if (!njsDbObject_getInstance(baton->oracleDb, env, payloadObj, &obj))
            return false;
        status = dpiMsgProps_setPayloadObject(tempHandle, obj->handle);
    } else {
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, payloadObj,
                (void**) &buffer, &bufferLength))
        status = dpiMsgProps_setPayloadBytes(tempHandle, buffer,
                (uint32_t) bufferLength);
    }
    if (status < 0)
        return njsBaton_setErrorDPI(baton);

    // if value passed was the payload itself, nothing further to do
    if (payloadObj == value)
        return true;

    // set correlation, if applicable
    buffer = NULL;
    if (!njsBaton_getStringFromArg(baton, env, &value, 0, "correlation",
            &buffer, &bufferLength, &found))
        return false;
    if (found) {
        status = dpiMsgProps_setCorrelation(tempHandle, buffer,
                (uint32_t) bufferLength);
        free(buffer);
        if (status < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set delay, if applicable
    if (!njsBaton_getIntFromArg(baton, env, &value, 0, "delay", &intValue,
            &found))
        return false;
    if (found && dpiMsgProps_setDelay(tempHandle, intValue) < 0)
        return njsBaton_setErrorDPI(baton);

    // set exception queue, if applicable
    buffer = NULL;
    if (!njsBaton_getStringFromArg(baton, env, &value, 0, "exceptionQueue",
            &buffer, &bufferLength, &found))
        return false;
    if (found) {
        status = dpiMsgProps_setExceptionQ(tempHandle, buffer,
                (uint32_t) bufferLength);
        free(buffer);
        if (status < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // set expiration, if applicable
    if (!njsBaton_getIntFromArg(baton, env, &value, 0, "expiration", &intValue,
            &found))
        return false;
    if (found && dpiMsgProps_setExpiration(tempHandle, intValue) < 0)
        return njsBaton_setErrorDPI(baton);

    // set priority, if applicable
    if (!njsBaton_getIntFromArg(baton, env, &value, 0, "priority", &intValue,
            &found))
        return false;
    if (found && dpiMsgProps_setPriority(tempHandle, intValue) < 0)
        return njsBaton_setErrorDPI(baton);

    // set recipient list, if applicable
    if (!njsBaton_getStringArrayFromArg(baton, env, &value, 0, "recipients",
            &recipCount, &recipArr, &recipLengths, &found))
        return false;

    if (found && (recipCount > 0)) {
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
            conn->oracleDb->jsAqQueueConstructor, queueObj,
            (njsBaseInstance**) &queue))
        return false;

    // perform some initializations
    queue->handle = baton->dpiQueueHandle;
    baton->dpiQueueHandle = NULL;
    queue->conn = conn;

    // create the dequeue options object
    if (dpiQueue_getDeqOptions(queue->handle, &deqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, conn->oracleDb);
    if (!njsUtils_genericNew(env, &njsClassDefAqDeqOptions,
            conn->oracleDb->jsAqDeqOptionsConstructor, &deqOptionsObj,
            (njsBaseInstance**) &deqOptions))
        return false;
    if (dpiDeqOptions_addRef(deqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, conn->oracleDb);
    deqOptions->handle = deqOptionsHandle;
    deqOptions->oracleDb = conn->oracleDb;

    // create the enqueue options object
    if (dpiQueue_getEnqOptions(queue->handle, &enqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, conn->oracleDb);
    if (!njsUtils_genericNew(env, &njsClassDefAqEnqOptions,
            conn->oracleDb->jsAqEnqOptionsConstructor, &enqOptionsObj,
            (njsBaseInstance**) &enqOptions))
        return false;
    if (dpiEnqOptions_addRef(enqOptionsHandle) < 0)
        return njsUtils_throwErrorDPI(env, conn->oracleDb);
    enqOptions->handle = enqOptionsHandle;
    enqOptions->oracleDb = conn->oracleDb;
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
    typeNum = (queue->payloadObjectType) ? DPI_ORACLE_TYPE_OBJECT :
            DPI_ORACLE_TYPE_RAW;
    if (!njsUtils_addTypeProperties(env, *queueObj, "payloadType",
            typeNum, queue->payloadObjectType))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqMany()
//   Dequeue multiple messages from an AQ queue.
//
// PARAMETERS
//   - number specifying the maximum number of messages to dequeue
//-----------------------------------------------------------------------------
static napi_value njsAqQueue_deqMany(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsAqQueue_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsAqQueue_deqManyProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "DeqMany", njsAqQueue_deqManyAsync,
            njsAqQueue_deqManyPostAsync);
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqManyAsync()
//   Worker function for njsAqQueue_deqMany().
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqManyAsync(njsBaton *baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    baton->msgProps = calloc(baton->numMsgProps, sizeof(dpiMsgProps*));
    if (!baton->msgProps)
        return njsBaton_setError(baton, errInsufficientMemory);
    if (dpiQueue_deqMany(queue->handle, &baton->numMsgProps,
            baton->msgProps) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqManyPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqManyPostAsync(njsBaton *baton, napi_env env,
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
// njsAqQueue_deqManyProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqManyProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->numMsgProps))
        return false;
    if (baton->numMsgProps == 0)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqOne()
//   Dequeue a message from an AQ queue.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsAqQueue_deqOne(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsAqQueue_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "DeqOne", njsAqQueue_deqOneAsync,
            njsAqQueue_deqOnePostAsync);
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqOneAsync()
//   Worker function for njsAqQueue_deqOne().
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqOneAsync(njsBaton *baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (dpiQueue_deqOne(queue->handle, &baton->dpiMsgPropsHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_deqOnePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsAqQueue_deqOnePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (baton->dpiMsgPropsHandle) {
        if (!njsAqMessage_createFromHandle(baton, baton->dpiMsgPropsHandle,
                env, queue, result))
            return false;
        baton->dpiMsgPropsHandle = NULL;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqMany()
//   Enqueue multiple message into an AQ queue.
//
// PARAMETERS
//   - array of objects containing payload and options
//-----------------------------------------------------------------------------
static napi_value njsAqQueue_enqMany(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsAqQueue_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsAqQueue_enqManyProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "EnqMany", njsAqQueue_enqManyAsync,
            NULL);
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqManyAsync()
//   Worker function for njsAqQueue_enqMany().
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqManyAsync(njsBaton *baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (dpiQueue_enqMany(queue->handle, baton->numMsgProps,
            baton->msgProps) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqManyProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqManyProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;
    napi_value message;
    uint32_t i;
    bool check;

    NJS_CHECK_NAPI(env, napi_is_array(env, args[0], &check))
    if (!check)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);
    NJS_CHECK_NAPI(env, napi_get_array_length(env, args[0],
            &baton->numMsgProps))
    if (baton->numMsgProps == 0)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);
    baton->msgProps = calloc(baton->numMsgProps, sizeof(dpiMsgProps*));
    if (!baton->msgProps)
        return njsBaton_setError(baton, errInsufficientMemory);
    for (i = 0; i < baton->numMsgProps; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, args[0], i, &message))
        if (!njsAqQueue_createMessage(baton, queue, env, message,
                &baton->msgProps[i]))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqOne()
//   Enqueue a message into an AQ queue.
//
// PARAMETERS
//   - object containing payload and message properties
//-----------------------------------------------------------------------------
static napi_value njsAqQueue_enqOne(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsAqQueue_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsAqQueue_enqOneProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "EnqOne", njsAqQueue_enqOneAsync,
            NULL);
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqOneAsync()
//   Worker function for njsAqQueue_enqOne().
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqOneAsync(njsBaton *baton)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (dpiQueue_enqOne(queue->handle, baton->dpiMsgPropsHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsAqQueue_enqOneProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsAqQueue_enqOneProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    njsAqQueue *queue = (njsAqQueue*) baton->callingInstance;

    if (!njsAqQueue_createMessage(baton, queue, env, args[0],
            &baton->dpiMsgPropsHandle))
        return false;

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
