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
 *   dpiLob.cpp  - Lob class Implemenation
 *
 * DESCRIPTION
 *   This file implmenets the Lob class.
 *
 * NOTES
 *  The Lob class methods are static functions providing wrappers over the
 *  corresponding OCI calls.
 *
 *****************************************************************************/

#ifndef DPILOB_ORACLE
# include <dpiLob.h>
#endif


#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif


using namespace dpi;


/*----------------------------------------------------------------------------
                     PUBLIC TYPES
  ----------------------------------------------------------------------------*/

/*******************************************************************************

  DESCRIPTION
    Read from the Lob Locator.

  PARAMETERS
    svch                - OCI service handle
    errh                - OCI error handle
    lobLocator          - Lob locator to be read

    byteAmount (IN/OUT) - IN: number of bytes to read
                          OUT: number of bytes read
                          Used for BLOB and BFILE always.
                          For CLOB, it is used only when charAmount is zero.

    charAmount (IN/OUT) - IN: number of characters to read. Set to zero if
                          interested in byteAmount only.
                          OUT: number of characters read
                          Ignored/undefined for BLOB and BFILE.

    offset              - 1-based absolute offset from the beginning of the
                          LOB. In bytes for BLOB and BFILE. In characters for
                          CLOB.

    buf           (OUT) - buffer where data is read

  RETURNS
    nothing

  NOTES

*/

void Lob::read(DpiHandle *svch, DpiHandle *errh, Descriptor *lobLocator,
               unsigned long long &byteAmount, unsigned long long &charAmount,
               unsigned long long offset, void *buf, unsigned long long bufl)
{
  ociCall(OCILobRead2((OCISvcCtx *)svch, (OCIError *)errh,
                      (OCILobLocator *)lobLocator,
                      (oraub8 *)&byteAmount, (oraub8 *)&charAmount,
                      offset, buf, (oraub8)(byteAmount ? byteAmount : bufl),
                      OCI_ONE_PIECE, NULL, NULL, 0, SQLCS_IMPLICIT),
          (OCIError *)errh);
}



/*******************************************************************************

  DESCRIPTION
    Write to the Lob Locator.

  PARAMETERS
    svch                - OCI service handle
    errh                - OCI error handle
    lobLocator          - Lob locator to be written

    byteAmount (IN/OUT) - IN: number of bytes to write
                          OUT: number of bytes actually written
                          Used for BLOB and BFILE always.
                          For CLOB, it is used only when charAmount is zero.

    charAmount (IN/OUT) - IN: number of characters to written. Set to zero if
                          interested in byteAmount only.
                          OUT: number of characters written
                          Ignored/undefined for BLOB and BFILE.

    offset              - 1-based absolute offset from the beginning of the
                          LOB. In bytes for BLOB and BFILE. In characters for
                          CLOB.

    buf                 - buffer where data is written from

  RETURNS
    nothing

  NOTES

*/

void Lob::write(DpiHandle *svch, DpiHandle *errh, Descriptor *lobLocator,
                unsigned long long &byteAmount, unsigned long long &charAmount,
                unsigned long long offset, void *buf, unsigned long long bufl)
{
  ociCall(OCILobWrite2((OCISvcCtx *)svch, (OCIError *)errh,
                      (OCILobLocator *)lobLocator,
                      (oraub8 *)&byteAmount, (oraub8 *)&charAmount,
                      offset, buf, (oraub8)(byteAmount ? byteAmount : bufl),
                      OCI_ONE_PIECE, NULL, NULL, 0, SQLCS_IMPLICIT),
          (OCIError *)errh);
}



/*******************************************************************************

  DESCRIPTION
    Get Lob chunk size

  PARAMETERS
    svch            - OCI service handle
    errh            - OCI error handle
    lobLocator      - Lob locator

    chunkSize (OUT) - chunk size

  RETURNS
    nothing

  NOTES

*/

unsigned int Lob::chunkSize(DpiHandle *svch, DpiHandle *errh,
                            Descriptor *lobLocator)
{
  unsigned int chunkSize = 0;

  ociCall(OCILobGetChunkSize((OCISvcCtx *)svch, (OCIError *)errh,
                             (OCILobLocator *)lobLocator, &chunkSize),
          (OCIError *)errh);

  return chunkSize;
}



/*******************************************************************************

  DESCRIPTION
    Get Lob length

  PARAMETERS
    svch         - OCI service handle
    errh         - OCI error handle
    lobLocator   - Lob locator

    length (OUT) - length

  RETURNS
    nothing

  NOTES

*/

unsigned long long Lob::length(DpiHandle *svch, DpiHandle *errh,
                          Descriptor *lobLocator)
{
  oraub8 length = 0;

  ociCall(OCILobGetLength2((OCISvcCtx *)svch, (OCIError *)errh,
                           (OCILobLocator *)lobLocator, (oraub8 *)&length),
          (OCIError *)errh);

  return (unsigned long long)length;
}


/*******************************************************************************

  DESCRIPTION
    Assigns one LOB locator to another

  PARAMETERS
    svch            - OCI service handle
    errh            - OCI error handle
    srcLocator      - The LOB locator to copy from
    dstLocator      - The LOB locator to copy to


  RETURNS
    nothing

  NOTES

*/
void Lob::cacheDescriptor ( DpiHandle *svch, DpiHandle *errh,
                            Descriptor *srcLocator, Descriptor **dstLocator )
{
  ociCall ( OCILobLocatorAssign ( ( OCISvcCtx * ) svch, ( OCIError * ) errh,
                                  ( OCILobLocator * ) srcLocator,
                                  ( OCILobLocator ** ) dstLocator ),
            ( OCIError * ) errh );
}


/*******************************************************************************

  DESCRIPTION
    Creates a temporary LOB

  PARAMETERS
    svch            - OCI service handle
    errh            - OCI error handle
    lobLocator      - Lob locator
    lobType         - The type of LOB to create.
                      OCI_TEMP_BLOB - For a temporary BLOB
                      OCI_TEMP_CLOB - For a temporary CLOB


  RETURNS
    nothing

*/
void Lob::createTempLob ( DpiHandle *svch, DpiHandle *errh,
                          Descriptor *lobLocator, unsigned char lobType )
{
  ociCall ( OCILobCreateTemporary( ( OCISvcCtx * ) svch, ( OCIError * ) errh,
                                   ( OCILobLocator * ) lobLocator,
                                   ( ub2 ) OCI_DEFAULT, SQLCS_IMPLICIT,
                                   ( ub1 )lobType, false,
                                   OCI_DURATION_SESSION ),
            ( OCIError * ) errh );
}


/*******************************************************************************

  DESCRIPTION
    Frees a temporary LOB

  PARAMETERS
    svch            - OCI service handle
    errh            - OCI error handle
    lobLocator      - Lob locator


  RETURNS
    nothing

*/
void Lob::freeTempLob ( DpiHandle *svch, DpiHandle *errh,
                        Descriptor *lobLocator )
{
  ociCall ( OCILobFreeTemporary ( ( OCISvcCtx * ) svch, ( OCIError * ) errh,
                                  ( OCILobLocator * ) lobLocator ),
            ( OCIError * ) errh );
}


/*******************************************************************************

  DESCRIPTION
    Check whether given LOB is temporary or not

  PARAMETERS
    envh            - OCI ENV handle
    errh            - OCI error handle
    lobLocator      - Lob locator


  RETURNS
    boolean -  true if LOB is temporary
               false otherwise
*/
boolean Lob::isTempLob ( DpiHandle *envh, DpiHandle *errh,
                         Descriptor *lobLocator )
{
  boolean isTemporary = FALSE;

  ociCall ( OCILobIsTemporary ( ( OCIEnv * ) envh, ( OCIError * ) errh,
                                ( OCILobLocator * ) lobLocator, &isTemporary ),
            ( OCIError * ) errh );

  return isTemporary;
}


/* end of dpiDateTimeArrayImpl.cpp  */
