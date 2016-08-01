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
 *   dpiCommon.cpp - Common class implementation
 *
 * DESCRIPTION
 *   This file implements the Common class which has implementation which
 *   are independant of any OCI objects.
 *
 *****************************************************************************/

#ifndef OCI_ORACLE
# include <oci.h>
#endif

#ifndef DPICOMMON_ORACLE
# include <dpiCommon.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif


/*****************************************************************************/
/*
  DESCRIPTION
    To obtain Oracle Client Library (OCI) version

  PARAMETERS
    majorv
    minorv
    patchv
    portv
    portUpdv

  RETURNS
    -NONE-

  NOTES:
    The values will map as Oracle Version like 12.1.0.2.0 - five component
    version of Oracle Client Library
*/
void Common::clientVersion ( int *majorv, int *minorv, int *patchv,
                                int *portv, int *portUpdv )
{
  if ( !majorv || !minorv || !patchv || !portv || !portUpdv )
    throw ExceptionImpl ( DpiErrNullValue );

  OCIClientVersion ( majorv, minorv, patchv, portv, portUpdv );
}
