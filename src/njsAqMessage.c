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
//   njsAqMessage.c
//
// DESCRIPTION
//   AqMessage (Advanced Queuing Message) class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getCorrelation);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getDelay);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getDeliveryMode);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getExceptionQueue);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getExpiration);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getMsgId);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getNumAttempts);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getOriginalMsgId);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getPayload);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getPriority);
NJS_NAPI_METHOD_DECL_SYNC(njsAqMessage_getState);

// finalize
static NJS_NAPI_FINALIZE(njsAqMessage_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "getCorrelation", NULL, njsAqMessage_getCorrelation, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getDelay", NULL, njsAqMessage_getDelay, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getDeliveryMode", NULL, njsAqMessage_getDeliveryMode, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getExceptionQueue", NULL, njsAqMessage_getExceptionQueue, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "getExpiration", NULL, njsAqMessage_getExpiration, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getMsgId", NULL, njsAqMessage_getMsgId, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getNumAttempts", NULL, njsAqMessage_getNumAttempts, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getOriginalMsgId", NULL, njsAqMessage_getOriginalMsgId, NULL, NULL,
            NULL, napi_enumerable, NULL },
    { "getPayload", NULL, njsAqMessage_getPayload, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getPriority", NULL, njsAqMessage_getPriority, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { "getState", NULL, njsAqMessage_getState, NULL, NULL, NULL,
            napi_enumerable, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_enumerable, NULL }
};

// class definition
const njsClassDef njsClassDefAqMessage = {
    "AqMessageImpl", sizeof(njsAqMessage), njsAqMessage_finalize,
    njsClassProperties, false
};


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
            baton->globals->jsAqMessageConstructor, messageObj, (void**) &msg))
        return false;

    // perform some initializations
    msg->handle = handle;
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
// njsAqMessage_getCorrelation()
//   Get accessor of "correlation" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getCorrelation, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiMsgProps_getCorrelation(message->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getDelay()
//   Get accessor of "delay" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getDelay, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    int32_t value;

    if (dpiMsgProps_getDelay(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_int32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getDeliveryMode()
//   Get accessor of "deliveryMode" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getDeliveryMode, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint16_t value;

    if (dpiMsgProps_getDeliveryMode(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getExceptionQueue()
//   Get accessor of "exceptionQueue" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getExceptionQueue, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiMsgProps_getExceptionQ(message->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getExpiration()
//   Get accessor of "expiration" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getExpiration, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    int32_t value;

    if (dpiMsgProps_getExpiration(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_int32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getMsgId()
//   Get accessor of "msgId" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getMsgId, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiMsgProps_getMsgId(message->handle, &value, &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, valueLength, value, NULL,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getNumAttempts()
//   Get accessor of "numAttempts" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getNumAttempts, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    int32_t value;

    if (dpiMsgProps_getNumAttempts(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_int32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getOriginalMsgId()
//   Get accessor of "originalMsgId" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getOriginalMsgId, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (dpiMsgProps_getOriginalMsgId(message->handle, &value,
            &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, valueLength, value, NULL,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getPayload()
//   Get accessor of "payload" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getPayload, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t valueLength;
    dpiObject *objHandle;
    const char *value;

    if (dpiMsgProps_getPayload(message->handle, &objHandle, &value,
            &valueLength) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (objHandle)
        return njsDbObject_new(message->objectType, objHandle, env, globals,
                returnValue);
    NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, valueLength, value, NULL,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getPriority()
//   Get accessor of "priority" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getPriority, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    int32_t value;

    if (dpiMsgProps_getPriority(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_int32(env, value, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsAqMessage_getState()
//   Get accessor of "state" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsAqMessage_getState, 0, NULL)
{
    njsAqMessage *message = (njsAqMessage*) callingInstance;
    uint32_t value;

    if (dpiMsgProps_getState(message->handle, &value) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    return true;
}
