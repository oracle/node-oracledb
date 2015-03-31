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
 *  dpiUtils.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIUTILS_ORACLE
# define DPIUTILS_ORACLE


#ifndef OCI_ORACLE
# include <oci.h>
#endif




/*---------------------------------------------------------------------------
                     PUBLIC CONSTANTS AND MACROS
  ---------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------
                     PUBLIC FUNCTIONS
  ---------------------------------------------------------------------------*/
void ociCall(sword rc, OCIError *errh);

void ociCallEnv(sword rc, OCIEnv *envh);

void getDriverName ( char *name, unsigned int namelen );





#endif                                              /* DPIUTILS_ORACLE */
