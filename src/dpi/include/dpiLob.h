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
 *  dpiLob.h - Lob class interface
 *
 * DESCRIPTION
 *   This file defines the interface for the Lob class.
 *
 * NOTES
 *  The Lob class methods are static functions providing wrappers over the
 *  corresponding OCI calls.
 *
 ******************************************************************************/

#ifndef DPILOB_ORACLE
# define DPILOB_ORACLE

#ifndef OCI_ORACLE
# include <oci.h>
#endif

#ifndef DPICOMMON_ORACLE
# include <dpiCommon.h>
#endif


namespace dpi
{

/*----------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ----------------------------------------------------------------------------*/


/*----------------------------------------------------------------------------
                     PUBLIC TYPES
  ----------------------------------------------------------------------------*/


/*******************************************************************************
 * NAME     Lob
 *
 * DESCRIPTION  Interface definiton for Lob
 *
 * METHODS
 *   read - read the Lob
 *
 ******************************************************************************/

class Lob
{
 public:

  static void read(DpiHandle *svch, DpiHandle *errh, Descriptor *lobLocator,
                   unsigned long long &byteAmount,
                   unsigned long long &charAmount,
                   unsigned long long offset,
                   void *buf,
                   unsigned long long bufl);

  static void write(DpiHandle *svch, DpiHandle *errh, Descriptor *lobLocator,
                    unsigned long long &byteAmount,
                    unsigned long long &charAmount,
                    unsigned long long offset,
                    void *buf,
                    unsigned long long bufl);

  static unsigned int chunkSize(DpiHandle *svch, DpiHandle *errh,
                                Descriptor *lobLocator);

  static unsigned long long length(DpiHandle *svch, DpiHandle *errh,
                              Descriptor *lobLocator);

  static void cacheDescriptor ( DpiHandle *svch, DpiHandle *errh,
                                Descriptor *srcLocator,
                                Descriptor **dstLocator );

  static void createTempLob ( DpiHandle *svch, DpiHandle *errh,
                              Descriptor *lobLocator, unsigned char lobType );

  static void freeTempLob   ( DpiHandle  *svch, DpiHandle *errh,
                              Descriptor *lobLocator );

  static boolean isTempLob  ( DpiHandle *envh, DpiHandle *errh,
                              Descriptor *lobLocator );
};


}                                           // namespace dpi

#endif                                      // ifdef DPILOB_ORACLE
