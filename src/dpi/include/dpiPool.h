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
 *  dpiPool.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIPOOL_ORACLE
# define DPIPOOL_ORACLE


#include <string>


#ifndef DPICONN_ORACLE
# include <dpiConn.h>
#endif


using std::string;



namespace dpi
{


/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

class SPool
{
 public:
                                // termination
  virtual void terminate() = 0;

                                // readonly properties
  virtual unsigned int connectionsOpen() const = 0;

  virtual unsigned int connectionsInUse() const = 0;


                                // methods
  virtual Conn * getConnection( const std::string &connClass = "" ) = 0;


protected:
                                // clients cannot do new and delete
  SPool(){};

  virtual ~SPool(){};

private:

};


} // end of namespace dpi




#endif                                              /* DPIPOOL_ORACLE */
