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
 *  dpiDateTimeArray.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIDATETIMEARRAY_ORACLE
# define DPIDATETIMEARRAY_ORACLE

#include <string>


namespace dpi
{
/*---------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

/*************************************************************************
 * Name     DateTimeArray
 *
 * DESCRIPTION  Interface definiton for DateTime as Array of Descriptors
 *
 * Methods
 *    init      - to allocate specified number of descritpors
 *    release   - deallocate the descriptors allocated and call the parent
 *                object to destroy this object also.  one time use only.
 *    getDateTime to return a double value
 *    setDateTime to set Date/Time from double value
 *
 ************************************************************************/
class DateTimeArray
{
public:
  // To allocate an array of descriptors
  virtual void* init ( int nCount ) = 0;
  // To dealloate the descriptors and this calss
  virtual void  release () = 0 ;

  // Date/time as double value # of seconds from 1970-1-1 00:00:00
  virtual long double getDateTime ( const int idx ) = 0;
  virtual void setDateTime ( const int idx, long double ms) = 0;

  // Destructor
  virtual ~DateTimeArray() {};
};

}                                           // namespace dpi

#endif                                      // ifdef DPIDATETIMEARRAY_ORACLE
