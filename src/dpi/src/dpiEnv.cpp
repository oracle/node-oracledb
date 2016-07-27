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
 *   dpiEnv.cpp
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIENVIMPL_ORACLE
# include <dpiEnvImpl.h>
#endif


/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the Env class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

Env::Env()
{
}



/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the Env class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

Env::~Env()
{
}



/*****************************************************************************/
/*
   DESCRIPTION
     Create the Env object.

   PARAMETERS:
     drvName        - driver name
     charset        - charset id
     ncharset       - ncharset id

   RETURNS:
     nothing
 */
Env * Env::createEnv( const string& drvName,
                      unsigned int charset, unsigned int ncharset)
{
  return EnvImpl::createEnvImpl( drvName, charset, ncharset );
}



/*****************************************************************************/
/*
   DESCRIPTION
     Free an Dpi handle.

   PARAMETERS:
     handle - DPI handle to be freed
     handleType - Type of DPI handle to be freed

   RETURNS:
     nothing

   NOTES:

 */

void Env::freeHandle(DpiHandle *handle, HandleType handleType)
{
  OCIHandleFree(handle, handleType);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Free an Dpi descriptor.

   PARAMETERS:
     descriptor     - DPI descriptor to be freed
     descriptorType - Type of DPI descriptr to be freed

   RETURNS:
     nothing

   NOTES:

 */

void Env::freeDescriptor(Descriptor *descriptor,
                         DescriptorType descriptorType)
{
  OCIDescriptorFree(descriptor, descriptorType);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Free an Dpi descriptor array.

   PARAMETERS:
     descriptorArray - DPI descriptor to be freed
     descriptorType  - Type of DPI descriptr array to be freed

   RETURNS:
     nothing

   NOTES:

 */

void Env::freeDescriptorArray(Descriptor **descriptorArray,
                              DescriptorType descriptorType)
{
  OCIArrayDescriptorFree((void **)descriptorArray, descriptorType);
}



/* end of file dpiEnv.cpp */

