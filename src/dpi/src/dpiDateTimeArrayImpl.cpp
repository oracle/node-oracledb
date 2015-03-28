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
 *   dpiDateTimeArrayImpl.cpp  - DateTimeArrayImpl class Implemenation
 *
 * DESCRIPTION
 *   This file implmenets the wrapper over Oracle Database type
 *   DATE, TIMESTAMP, TIMESTAMP WITH TZ, TIMESTAMP WITH LOCAL TZ.
 *
 *****************************************************************************/

#include <string.h>

#ifndef ORATYPES
# include <oratypes.h>
#endif

#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif

#ifndef DPIDATEIMPL_ORACLE
# include <dpiDateTimeArrayImpl.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include "dpiExceptionImpl.h"
#endif

#define    DPI_UTC_TZ   "+00:00"
#define    DPI_BASE_YEAR  1970
#define    DPI_BASE_MONTH 1
#define    DPI_BASE_DATE  1
#define    DPI_BASE_HOUR  0
#define    DPI_BASE_MIN   0
#define    DPI_BASE_SEC   0
#define    DPI_BASE_FS    0

#include <iostream>

using namespace std;
using namespace dpi;

// Static member variable initialization - used to compute diff from
// given date/time.  The baseDate_ is 1970-1-1 0:0:0
OCIDateTime * DateTimeArrayImpl::baseDate_ = NULL;


/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/

/****************************************************************************
 * NAME           DateTimeArrayImpl::DateTimeArrayImpl
 *
 * DESCRIPTION    Constructor of DateTimeArrayImpl
 *
 * PARAMETERS
 *   envh         OCIEnv handle
 *   errh         OCIError handle
 *   stmt         dpi Stmt object
 *
 ****************************************************************************/
DateTimeArrayImpl::DateTimeArrayImpl (OCIEnv *envh, OCIError *errh,
                                      const Env* env)
  : env_(env), envh_ (envh), errh_ (errh), dbdatetime_(NULL)
{

}

/****************************************************************************
 * NAME           DateTimeArrayImpl::~DateTimeArrayImpl
 *
 * DESCRIPTION    Destructor of DateTimeArrayImpl
 *
 * PARAMETERS
 *
 ****************************************************************************/
DateTimeArrayImpl::~DateTimeArrayImpl ()
{
  if ( dbdatetime_ )
  {
    // TO release OCI Descriptor handle array and this class too.
    this -> release ();
  }
}

/****************************************************************************
 * NAME           DateTimeArrayImpl::init
 *
 * DESCRIPTION    initialization function to allocate OCI Descriptor array
 *
 * PARAMETERS
 *   nCount       # of descriptors required
 *
 ****************************************************************************/
void *DateTimeArrayImpl::init (int nCount)
{
  if ( !dbdatetime_ )
  {
    // allocate space to hold nCount pointers to OCIDateTime structure
    dbdatetime_ = (OCIDateTime**) new OCIDateTime*[nCount];
    sword rc;

    rc = OCIArrayDescriptorAlloc ( (dvoid *)envh_, (void **)&dbdatetime_[0],
                                   OCI_DTYPE_TIMESTAMP_LTZ,
                                   nCount, 0, (void **)0);
    if ( rc != OCI_SUCCESS )
      throw ExceptionImpl ( DpiErrInternal ) ;
  }
  else
  {
    /* descriptor array is to be allocated, if for some reason
     * it is non-null, then bail out.
     */
    throw ExceptionImpl (DpiErrInvalidState);
  }

  /* NOTE: OCI Descriptor array is returned as void * to be used in
   * bind, define calls, and methods of this class is used to set/get
   * timestamp
   */
  return (void *)dbdatetime_;
}

/****************************************************************************
 * NAME           DateTimeArrayImpl::release
 *
 * DESCRIPTION    cleanup OCI Descriptor array and this class
 *
 * PARAMETERS
 *
 ****************************************************************************/
void DateTimeArrayImpl::release ()
{
  // destroy OCI descriptor array if already allocated,
  // if not allocated, ignore.
  if ( dbdatetime_ )
  {
    OCIArrayDescriptorFree ((dvoid **)dbdatetime_, OCI_DTYPE_TIMESTAMP_LTZ);

    delete [] dbdatetime_;
    dbdatetime_ = NULL;
  }
  env_->releaseDateTimeArray ( this ) ;
}


/****************************************************************************
 * NAME           DateTimeArrayImpl::getDateTime
 *
 * DESCRIPTION    To obtain date/time value from descriptor based on
 *                given index as long double value
 *
 * PARAMETERS
 *    idx         index value.
 *
 ****************************************************************************/
long double DateTimeArrayImpl::getDateTime ( const int idx )
{
  sword rc = 0;
  long double dbl = 0.0;

  if ( dbdatetime_ )
  {
    OCIInterval *interval = NULL ;
    OCINumber    ociNumber;

    rc = OCIDescriptorAlloc ( (dvoid *) envh_, (dvoid **)&interval,
                              OCI_DTYPE_INTERVAL_DS, 0, (dvoid **)0);
    if (rc)
    {
      throw ExceptionImpl ( DpiErrInternal );
    }

    /* Get diff of date/timestamp */
    rc = OCIDateTimeSubtract ( envh_, errh_, dbdatetime_[idx], baseDate_,
                                    interval);
    ociCall ( rc, errh_ ) ;

    /* Convert interval to number */
    ociCall ( OCIIntervalToNumber ( envh_, errh_, interval, &ociNumber ),
              errh_ ) ;

    /* Convert interval number to long-double value */
    ociCall ( OCINumberToReal ( errh_, &ociNumber, sizeof (long double),
                                (void *)&dbl), errh_);
    if ( interval )
    {
      OCIDescriptorFree ( interval, OCI_DTYPE_INTERVAL_DS );
    }
  }
  else
  {
     // dbdatetime_ has to be allocated by now using init(),
     // if not bail out.
    throw ExceptionImpl ( DpiErrUninitialized );
  }
  return dbl;
}


/****************************************************************************
 * NAME           DateTimeArrayImpl::setDateTime
 *
 * DESCRIPTION    To set date/time value on descriptor based on
 *                given index from long double value
 *
 * PARAMETERS
 *    idx         index value.
 *
 ****************************************************************************/
void DateTimeArrayImpl::setDateTime ( const int idx, long double days)
{
  if ( dbdatetime_ )
  {
    OCIInterval *interval= NULL;
    OCINumber    ociNumber;
    sword        rc = OCI_SUCCESS ;

    rc = OCIDescriptorAlloc ( (dvoid *) envh_, (dvoid **)&interval,
                              OCI_DTYPE_INTERVAL_DS, 0, (dvoid **)0);
    if (rc)
    {
      throw ExceptionImpl ( DpiErrInternal );
    }

    // Convert the given long-double value to OCINumber
    ociCall ( OCINumberFromReal ( errh_, &days, sizeof ( long double ),
                                  &ociNumber ), errh_);

    // Convert the number value to interval
    ociCall ( OCIIntervalFromNumber ( envh_, errh_, interval, &ociNumber ),
              errh_);

    // Add the interval to the basedate.
    ociCall ( OCIDateTimeIntervalAdd ( envh_, errh_, baseDate_, interval,
                                       dbdatetime_[idx] ), errh_ ) ;

    if ( interval )
    {
      OCIDescriptorFree ( interval, OCI_DTYPE_INTERVAL_DS );
    }
  }
  else
  {
    throw ExceptionImpl ( DpiErrUninitialized );
  }
}


/****************************************************************************
 * NAME           DateTimeArrayImpl::initBaseDate
 *
 * DESCRIPTION    To initialize one time initialization of basedate, interval
 *
 * PARAMETERS
 *    envh        OCI Env Handle
 *
 * NOTE:
 * v8::Date uses # of milliseconds counted from 1970-1-1 0:0:0.  To compute
 * # of seconds, need to find the difference from basedate, and compute
 * to milliseconds.  This baseDate is used for execution cycle, instead of
 * creating every time, create it one time and use it.
 ****************************************************************************/
void DateTimeArrayImpl::initBaseDate ( OCIEnv *envh )
{
  sword    rc = OCI_SUCCESS ;
  OCIError *errh = (OCIError *)0;

  // If baseDate is not allocated, allocate and init
  if ( !baseDate_ )
  {
    rc = OCIDescriptorAlloc ( (dvoid *)envh, (dvoid **)&baseDate_,
                                  OCI_DTYPE_TIMESTAMP_LTZ, 0,
                                  (dvoid **)0);

    if ( !rc )  // OCI_SUCCESS case
    {
      /*
       * NOTE:
       *  This is one time initialization expected to be done along with
       *  OCI Env creation(one time).  At this point of time, errh is not yet
       *  created by OCI Env, create a local one, use and destroy
       */
      ociCallEnv(OCIHandleAlloc((void *)envh, (dvoid **)&errh,
                            OCI_HTYPE_ERROR, 0, (dvoid **)0), envh);
        // Base date is 1970-1-1 00:00:00
      ociCall ( OCIDateTimeConstruct (envh, errh, baseDate_,
                                      DPI_BASE_YEAR, DPI_BASE_MONTH,
                                      DPI_BASE_DATE, DPI_BASE_HOUR,
                                      DPI_BASE_MIN, DPI_BASE_SEC, DPI_BASE_FS,
                                      (OraText * )DPI_UTC_TZ,
                                      strlen ( DPI_UTC_TZ ) ),
                errh);

      // Free the allocated error handle
      if (errh)
      {
        OCIHandleFree(errh, OCI_HTYPE_ERROR);
        errh = NULL;
      }
    }
    else
    {
      throw ExceptionImpl ( DpiErrInternal ) ;
    }
  }
}


/****************************************************************************
 * NAME           DateTimeArrayImpl::cleanBaseDate
 *
 * DESCRIPTION    To cleanup OCI descriptors for baseDate/interval.
 *
 * PARAMETERS
 *
 *
 ****************************************************************************/
void DateTimeArrayImpl::cleanBaseDate ()
{
  if ( baseDate_ )
  {
    OCIDescriptorFree ( baseDate_, OCI_DTYPE_TIMESTAMP_LTZ );
    baseDate_ = NULL ;
  }
}


/* end of dpiDateTimeArrayImpl.cpp  */
