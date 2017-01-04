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
 *  dpiException.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIEXCEPTION_ORACLE
# define DPIEXCEPTION_ORACLE


#include <exception>



namespace dpi
{


/*----------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ----------------------------------------------------------------------------*/

enum DpiError                          // error type
{
  DpiErrNoError   = 0,
  DpiErrInternal,
  DpiErrUnkOciError,
  DpiErrNoEnv,
  DpiErrInvalidState,
  DpiErrUninitialized,
  DpiErrExtAuth,
  DpiOciInvalidHandle,  // "Invalid OCI Handle/Descriptor or invalid parameter for OCI handle/descriptor allocation call"
  DpiErrMemAllocFail,   // "Memory allocation failed"
  DpiErrNullValue,      // "Unexpected NULL value"
};



/*----------------------------------------------------------------------------
                     PUBLIC TYPES
  ----------------------------------------------------------------------------*/

class Exception : public std::exception
{
 public:
                                // creation/termination
  Exception(){};

  virtual ~Exception() throw();

  virtual const char * what() const throw() = 0;

  virtual int    errnum() const throw() = 0;

  virtual const char * origin() const throw() = 0;

private:

};


} // end of namespace dpi


#endif                                              /* DPIEXCEPTION_ORACLE */
