/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   dpiUtils.cpp - ConnImpl class implementation
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#include <stdio.h>
#include <string.h>

#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif


#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif

#ifdef WIN32
  #define  snprintf  _snprintf
#endif

#ifdef OCI_ERROR_MAXMSG_SIZE2
/* A bigger message size is defined from 11.2.0.3 onwards */
#define DPIUTILS_OCI_ERR_MAX_SIZE OCI_ERROR_MAXMSG_SIZE2
#else
#define DPIUTILS_OCI_ERR_MAX_SIZE OCI_ERROR_MAXMSG_SIZE
#endif

/*****************************************************************************/
/*
   DESCRIPTION
     Wrapper for ociCall and ociCallEnv.
     Abstraction for the redundant common functionality.

   PARAMETERS:
     rc      - OCI return code
     errh    - OCI error hanlde
     errType - error type

   RETURNS:
     nothing

   NOTES:
 */

static void ociCallCommon(sword rc, void *handle, ub4 errType)
{
  // OCI_SUCCESS_WITH_INFO - warnings are reported in some cases.
  // Treat these warnings as success as the OCI call succeeded and
  // ignore the error message
  if ( (rc == OCI_SUCCESS) || (rc == OCI_SUCCESS_WITH_INFO ) )
    return;

  if (rc == OCI_INVALID_HANDLE)
    throw ExceptionImpl(DpiOciInvalidHandle);

  OraText ociErrorMsg[DPIUTILS_OCI_ERR_MAX_SIZE];
  sb4     ociErrorNo = 0;
  memset(ociErrorMsg, 0, DPIUTILS_OCI_ERR_MAX_SIZE);

  rc = OCIErrorGet(handle, 1, NULL, &ociErrorNo, ociErrorMsg,
                   DPIUTILS_OCI_ERR_MAX_SIZE-1, errType);
  if (rc)
    throw ExceptionImpl(DpiErrUnkOciError);
  else
  {
    throw ExceptionImpl("ORA", ociErrorNo, (const char *)ociErrorMsg);
  }
}

/*---------------------------------------------------------------------------
                     PUBLIC FUNCTIONS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     This routine retrives the error information from the OCI error handle and
     throws ExceptionImpl with the information contained in the error handle.

   PARAMETERS:
     rc   - OCI return code
     errh - OCI error hanlde

   RETURNS:
     nothing

   NOTES:
 */

void ociCall(sword rc, OCIError *errh)
{
  ociCallCommon(rc, errh, OCI_HTYPE_ERROR);
}



/*****************************************************************************/
/*
   DESCRIPTION
     This routine retrives the error information from the OCI environment
     handle and throws ExceptionImpl with the information contained in the
     error handle.

   PARAMETERS:
     rc   - OCI return code
     envh - OCI environment hanlde

   RETURNS:
     nothing

   NOTES:

 */

void ociCallEnv(sword rc, OCIEnv *envh)
{
  ociCallCommon(rc, envh, OCI_HTYPE_ENV);
}




/* end of file dpiUtils.cpp */

