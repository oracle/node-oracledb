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
 *  dpiEnv.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIENV_ORACLE
# define DPIENV_ORACLE


#include <string>


#ifndef DPICOMMON_ORACLE
# include <dpiCommon.h>
#endif

#ifndef DPIPOOL_ORACLE
# include <dpiPool.h>
#endif

#ifndef DPICONN_ORACLE
# include <dpiConn.h>
#endif

#define DPI_AL32UTF8         873

namespace dpi
{

using std::string;

class DateTimeArray;


/*---------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ---------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

class Env
{
 public:
                                // creation/termination

  static Env * createEnv( const string &drvName,
                          unsigned int charset = 0,
                          unsigned int ncharset = 0);

  virtual void terminate() = 0;

                                // properties
  virtual void poolMax(unsigned int poolMax) = 0;
  virtual unsigned int poolMax() const = 0;

  virtual void poolMin(unsigned int poolMin) = 0;
  virtual unsigned int poolMin() const = 0;

  virtual void poolIncrement(unsigned int poolMax) = 0;
  virtual unsigned int poolIncrement() const = 0;

  virtual void poolTimeout(unsigned int poolTimeout) = 0;
  virtual unsigned int poolTimeout() const = 0;

  virtual void externalAuth(bool externalAuth) = 0;
  virtual bool externalAuth() const = 0;

  virtual unsigned int clientcharset () const = 0;
  virtual unsigned int clientncharset () const = 0 ;

                                 // methods
  virtual SPool * createPool(const string &user, const string &password,
                             const string &connString,
                             int poolMax = -1, int poolMin = -1,
                             int poolIncrement = -1,
                             int poolTimeout = -1,
                             int stmtCacheSize = -1,
                             bool externalAuth = false,
                             bool homogeneous = true,
                        int poolPingInterval = DPI_NO_PING_INTERVAL ) = 0 ;
                     // default Ping Interval is assumed to be no-ping

  virtual Conn * getConnection(const string &user,
                               const string &password,
                               const string &connString,
                               int stmtCacheSize,
                               const string &connClass = "",
                               bool externalAuth = false,
                               DBPrivileges dbpriv = dbPrivNONE ) = 0;

                                // DateTime array
  virtual DateTimeArray * getDateTimeArray( OCIError *errh ) const = 0;
  virtual void            releaseDateTimeArray ( DateTimeArray *arr ) const =0;

                                 // handle and descriptor methods
  virtual DpiHandle * allocHandle(HandleType handleType) = 0;

  static void freeHandle(DpiHandle *handle, HandleType handleType);


  virtual Descriptor * allocDescriptor(DescriptorType descriptorType)
                              = 0;

  static void freeDescriptor(Descriptor *descriptor,
                             DescriptorType descriptorType);

  virtual void allocDescriptorArray(DescriptorType descriptorType,
                                    unsigned int arraySize,
                                    Descriptor **descriptorArray) = 0;

  static void freeDescriptorArray(Descriptor **descriptorArray,
                                  DescriptorType descriptorType);


  virtual DpiHandle * envHandle() const = 0;


protected:
                                // clients cannot do new and delete
  Env();

  virtual ~Env();


private:

};


} // end of namespace dpi


#endif                                              /* DPIENV_ORACLE */
