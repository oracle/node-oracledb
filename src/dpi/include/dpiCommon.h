/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

/*******************************************************************************
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
 *  dpiCommon.h
 *
 * DESCRIPTION
 *
 ******************************************************************************/

#ifndef DPICOMMON_ORACLE
# define DPICOMMON_ORACLE


namespace dpi
{


/*----------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ----------------------------------------------------------------------------*/


enum HandleType
{
  ErrorHandleType = 2  // OCI_HTYPE_ERROR
};



enum DescriptorType
{
  LobDescriptorType = 50    // OCI_TYPE_LOB
};



/*----------------------------------------------------------------------------
                     PUBLIC TYPES
  ----------------------------------------------------------------------------*/

struct DpiHandle;
struct Descriptor;


/* Utiltiy class containing common functions */
class Common
{
public:
  // To obtain the Oracle Client Library Version
  static void clientVersion (int *majorv, int *minorv, int *patchv,
                                        int *portv, int *portUpdv );
};



/*----------------------------------------------------------------------------
                     PUBLIC METHODS
  ----------------------------------------------------------------------------*/



} // end of namespace dpi


#endif                                              /* DPICOMMON_ORACLE */
