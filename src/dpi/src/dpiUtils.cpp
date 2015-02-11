/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
  if (!rc)
    return;
  
  OraText ociErrorMsg[OCI_ERROR_MAXMSG_SIZE];
  sb4     ociErrorNo = 0;
  memset(ociErrorMsg, 0, OCI_ERROR_MAXMSG_SIZE);
  
  rc = OCIErrorGet(errh, 1, NULL, &ociErrorNo, ociErrorMsg,
                   OCI_ERROR_MAXMSG_SIZE-1, OCI_HTYPE_ERROR);
  if (rc)
    throw ExceptionImpl(DpiErrUnkOciError);
  else
  {
    ociErrorMsg[strlen((char*)ociErrorMsg)-1]=0; //strip off newline
    throw ExceptionImpl("ORA", ociErrorNo, (const char *)ociErrorMsg);
  }
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
  if (!rc)
    return;
  
  OraText ociErrorMsg[OCI_ERROR_MAXMSG_SIZE];
  sb4     ociErrorNo = 0;
  memset(ociErrorMsg, 0, OCI_ERROR_MAXMSG_SIZE);
  
  rc = OCIErrorGet(envh, 1, NULL, &ociErrorNo, ociErrorMsg,
                   OCI_ERROR_MAXMSG_SIZE-1, OCI_HTYPE_ENV);
  if (rc)
    throw ExceptionImpl(DpiErrUnkOciError);
  else
  {
    ociErrorMsg[strlen((char*)ociErrorMsg)-1]=0; //strip off newline
    throw ExceptionImpl("ORA", ociErrorNo, (const char *)ociErrorMsg);
  }
}

/*****************************************************************************/
/*
  DESCRIPTION
    This routine composes the driver name with version number to register with
    Database server.
    
  PARAMETERS
    name     - name of the driver (node-oracledb).
    namelen  - buffer length for name.
  
  RETURNS
    NONE
  
  NOTES:
    This function expects a buffer of size DPI_DRIVER_NAME_LEN, composed
    name will be filled in this buffer and returned.
*/
void getDriverName (char *name, unsigned int namelen)
{
  // Clear the buffer
  memset ( name, 0, namelen ) ;
  
  // Compose the driver name+version
  snprintf ( name, namelen, "%s %d.%d.%d",
             DPI_DRIVER_NAME, 
             (DPI_DRIVER_VERSION / 10000 ),
             (DPI_DRIVER_VERSION / 100 ),
             (DPI_DRIVER_VERSION % 100 )
             );  
}



/* end of file dpiUtils.cpp */

