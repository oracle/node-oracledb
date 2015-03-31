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
 *  dpiDateTimeImpl.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIDATETIMEARRAYIMPL_ORACLE
# define DPIDATEARRAYIMPL_ORACLE
#endif

#ifndef DPISTMT_ORACLE
# include <dpiEnv.h>
#endif

#ifndef OCIDATETIMEARRAY_ORACLE
# include <dpiDateTimeArray.h>
#endif



namespace dpi
{

class Env;


/********************************************************************
 * Name     : DateTimeArrayImpl
 *
 * Descriptoin : Implementation of DateTimeArray interface
 *
 * NOTE: One time use only, once release() called the class will be
 * destroyed
 */
class DateTimeArrayImpl : public DateTimeArray
{
public:
  DateTimeArrayImpl ( OCIEnv *envh, OCIError *err, const Env* env);
  virtual ~DateTimeArrayImpl ();

  //DateTimeArray methods
  virtual void* init (int nCount) ;
  virtual void  release ();

  // Date/Time as double value # of seconds from 1970-1-1 00:00:00
  virtual long double getDateTime ( const int idx ) ;
  virtual void setDateTime ( const int idx, long double ms);

public:
  static void initBaseDate ( OCIEnv *envh);
  static void cleanBaseDate ();

private:
  static OCIDateTime *baseDate_;   // Base date 1970-1-1 0:0:0

private:
  // DPI parent object
  const Env      *env_;

  // OCI Handles
  OCIEnv   *envh_;
  OCIError *errh_;

  // OCI Descriptor array
  OCIDateTime  **dbdatetime_;

};

};
