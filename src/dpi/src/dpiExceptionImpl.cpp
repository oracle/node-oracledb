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
 *   dpiExceptionImpl.cpp - ExceptionImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the ExceptionImpl class which provides the
 *   implemenation of the Exception abstract class.
 *
 *****************************************************************************/


#include <sstream>
#include <iomanip>

using namespace std;


#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif






/*---------------------------------------------------------------------------
                     PRIVATE DATA
  ---------------------------------------------------------------------------*/

// don't forget to add comma for previously last message after you add a new
// error message

static const char *dpiErrors[] =
{
  "not an error",                                     // DpiErrNoError
  "internal error",                                   // DpiErrInternal
  "could not get OCI error message",                  // DpiErrUnkOciError
  "no OCI environment handle created",                // DpiErrNoEnv
  "invalid state while working with timestamp",       // DpiErrInvalidState
  "uninitialized state while working with timestamp", // DpiErrUninitialized
  "user and password should not be set when using external authentication", // DpiErrExtAuth
};




/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ExceptionImpl class for DPI errors only.

   PARAMETERS:
     errnum - DPI error number

   RETURNS:
     nothing

   NOTES:

 */

ExceptionImpl::ExceptionImpl(DpiError errnum):
  origin_("DPI"), errnum_(errnum)
{
  stringstream strstream;

  strstream << origin_ << "-" <<setfill('0')<<setw(3)<<errnum_ <<": ";
  strstream << dpiErrors[errnum - DpiErrNoError];

  message_ = strstream.str();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ExceptionImpl class.

   PARAMETERS:
     origin  - error origin
     errnum  - error number
     message - error message

   RETURNS:
     nothing

   NOTES:

 */

ExceptionImpl::ExceptionImpl(const char *origin, int errnum,
                             const char *message):
  origin_(origin), errnum_(errnum), message_(message)
{

}



/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the ExceptionImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

ExceptionImpl::~ExceptionImpl() throw ()
{

}



/*****************************************************************************/
/*
   DESCRIPTION
     Returns error message.

   PARAMETERS:
     none

   RETURNS:
     Error message

   NOTES:

 */

const char * ExceptionImpl::what() const throw()
{
  return message_.data();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Returns error number.

   PARAMETERS:
     none

   RETURNS:
     Error number

   NOTES:

 */

int ExceptionImpl::errnum() const throw()
{
  return errnum_;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Returns the origin of the error

   PARAMETERS:
     none

   RETURNS:
     Error origin

   NOTES:

 */

 const char * ExceptionImpl::origin() const throw()
{
  return origin_.data();
}



/* end of file dpiExceptionImpl.cpp */

