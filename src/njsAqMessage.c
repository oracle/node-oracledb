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
//   njsAqMessage.c
//
// DESCRIPTION
//   AqMessage (Advanced Queuing Message) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// getters
static NJS_NAPI_GETTER(njsAqMessage_getCorrelation);
static NJS_NAPI_GETTER(njsAqMessage_getDelay);
static NJS_NAPI_GETTER(njsAqMessage_getDeliveryMode);
static NJS_NAPI_GETTER(njsAqMessage_getExceptionQueue);
static NJS_NAPI_GETTER(njsAqMessage_getExpiration);
static NJS_NAPI_GETTER(njsAqMessage_getMsgId);
static NJS_NAPI_GETTER(njsAqMessage_getNumAttempts);
static NJS_NAPI_GETTER(njsAqMessage_getOriginalMsgId);
static NJS_NAPI_GETTER(njsAqMessage_getPayload);
static NJS_NAPI_GETTER(njsAqMessage_getPriority);
static NJS_NAPI_GETTER(njsAqMessage_getState);

// finalize
static NJS_NAPI_FINALIZE(njsAqMessage_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "correlation", NULL, NULL, njsAqMessage_getCorrelation, NULL, NULL,
            napi_enumerable, NULL },
    { "delay", NULL, NULL, njsAqMessage_getDelay, NULL, NULL, napi_enumerable,
            NULL },
    { "deliveryMode", NULL, NULL, njsAqMessage_getDeliveryMode, NULL, NULL,
            napi_enumerable, NULL },
    { "exceptionQueue", NULL, NULL, njsAqMessage_getExceptionQueue, NULL, NULL,
            napi_enumerable, NULL },
    { "expiration", NULL, NULL, njsAqMessage_getExpiration, NULL, NULL,
            napi_enumerable, NULL },
    { "msgId", NULL, NULL, njsAqMessage_getMsgId, NULL, NULL, napi_enumerable,
            NULL },
    { "numAttempts", NULL, NULL, njsAqMessage_getNumAttempts, NULL, NULL,
            napi_enumerable, NULL },
    { "originalMsgId", NULL, NULL, njsAqMessage_getOriginalMsgId, NULL, NULL,
            napi_enumerable, NULL },
    { "payload", NULL, NULL, njsAqMessage_getPayload, NULL, NULL,
            napi_enumerable, NULL },
    { "priority", NULL, NULL, njsAqMessage_getPriority, NULL, NULL,
            napi_enumerable, NULL },
    { "state", NULL, NULL, njsAqMessage_getState, NULL, NULL, napi_enumerable,
            NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_enumerable, NULL }
};

// class definition
const njsClassDef njsClassDefAqMessage = {
    "AqMessage", sizeof(njsAqMessage), njsAqMessage_finalize,
    njsClassProperties, NULL, true
};

// other methods used internally
static napi_value njsAqMessage_getBufferAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiMsgProps*, const char **, uint32_t *));
static napi_value njsAqMessage_getIntAttribute(napi_env env,
        napi_callback_info info, int (*getter)(dpiMsgProps*, int32_t *));
static napi_value njsAqMessage_getTextAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiMsgProps*, const char **, uint32_t *));


//-----------------------------------------------------------------------------
// njsAqMessage_createFromHandle()
//   Creates a new AQ message object given the ODPI-C handle.
//-----------------------------------------------------------------------------
bool njsAqMessage_createFromHandle(njsBaton *baton, dpiMsgProps *handle,
        napi_env env, njsAqQueue *queue, napi_value *messageObj)
{
    njsAqMessage *msg;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefAqMessage,
            baton->oracleDb->jsAqMessageConstructor, messageObj,
            (njsBaseInstance**) &msg))
        return false;

    // perform some initializations
    msg->handle = handle;
    msg->oracleDb = baton->oracleDb;
    msg->objectType = queue->payloadObjectType;

    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_finalize()
//   Invoked when the njsAqMessage object is garbage collected.
//-----------------------------------------------------------------------------
static void njsAqMessage_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsAqMessage *msg = (njsAqMessage*) finalizeData;

    if (msg->handle) {
        dpiMsgProps_release(msg->handle);
        msg->handle = NULL;
    }
    free(msg);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getBufferAttribute()
//   Get accessor of buffer properties.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getBufferAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiMsgProps*, const char **, uint32_t *))
{
    njsAqMessage *message;
    uint32_t valueLength;
    const char *value;
    napi_value result;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &message))
        return NULL;
    if ((*getter)(message->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, message->oracleDb);
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
// njsAqMessage_getCorrelation()
//   Get accessor of "correlation" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getCorrelation(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getTextAttribute(env, info,
            dpiMsgProps_getCorrelation);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getDelay()
//   Get accessor of "delay" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getDelay(napi_env env, napi_callback_info info)
{
    return njsAqMessage_getIntAttribute(env, info, dpiMsgProps_getDelay);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getDeliveryMode()
//   Get accessor of "deliveryMode" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getDeliveryMode(napi_env env,
        napi_callback_info info)
{
    njsAqMessage *message;
    uint16_t value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &message))
        return NULL;
    if (dpiMsgProps_getDeliveryMode(message->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, message->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getExceptionQueue()
//   Get accessor of "exceptionQueue" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getExceptionQueue(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getTextAttribute(env, info,
            dpiMsgProps_getExceptionQ);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getExpiration()
//   Get accessor of "expiration" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getExpiration(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getIntAttribute(env, info, dpiMsgProps_getExpiration);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getIntAttribute()
//   Get accessor of integer properties.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getIntAttribute(napi_env env,
        napi_callback_info info, int (*getter)(dpiMsgProps*, int32_t *))
{
    njsAqMessage *message;
    int32_t value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &message))
        return NULL;
    if ((*getter)(message->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, message->oracleDb);
        return NULL;
    }
    return njsUtils_convertToInt(env, value);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getMsgId()
//   Get accessor of "msgId" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getMsgId(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getBufferAttribute(env, info,
            dpiMsgProps_getMsgId);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getNumAttempts()
//   Get accessor of "numAttempts" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getNumAttempts(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getIntAttribute(env, info, dpiMsgProps_getNumAttempts);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getOriginalMsgId()
//   Get accessor of "originalMsgId" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getOriginalMsgId(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getBufferAttribute(env, info,
            dpiMsgProps_getOriginalMsgId);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getPayload()
//   Get accessor of "payload" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getPayload(napi_env env,
        napi_callback_info info)
{
    napi_value payloadObj;
    uint32_t valueLength;
    dpiObject *objHandle;
    const char *value;
    njsAqMessage *msg;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &msg))
        return NULL;
    if (dpiMsgProps_getPayload(msg->handle, &objHandle, &value,
            &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, msg->oracleDb);
        return NULL;
    }
    if (objHandle) {
        if (!njsDbObject_new(msg->objectType, objHandle, env, &payloadObj))
            return NULL;
    }  else {
        if (napi_create_buffer_copy(env, valueLength, value, NULL,
                &payloadObj) != napi_ok) {
            njsUtils_genericThrowError(env);
            return NULL;
        }
    }
    return payloadObj;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getPriority()
//   Get accessor of "priority" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getPriority(napi_env env,
        napi_callback_info info)
{
    return njsAqMessage_getIntAttribute(env, info, dpiMsgProps_getPriority);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getState()
//   Get accessor of "state" property.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getState(napi_env env,
        napi_callback_info info)
{
    njsAqMessage *message;
    uint32_t value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &message))
        return NULL;
    if (dpiMsgProps_getState(message->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, message->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsAqMessage_getTextAttribute()
//   Get accessor of text properties.
//-----------------------------------------------------------------------------
static napi_value njsAqMessage_getTextAttribute(napi_env env,
        napi_callback_info info,
        int (*getter)(dpiMsgProps*, const char **, uint32_t *))
{
    njsAqMessage *message;
    uint32_t valueLength;
    const char *value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &message))
        return NULL;
    if ((*getter)(message->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, message->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
}
