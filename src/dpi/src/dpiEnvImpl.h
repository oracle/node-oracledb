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
 *  dpiEnvImpl.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIENVIMPL_ORACLE
# define DPIENVIMPL_ORACLE


#ifndef OCI_ORACLE
# include <oci.h>
#endif


#ifndef DPIENV_ORACLE
# include <dpiEnv.h>
#endif


#ifndef DPIPOOLIMPL_ORACLE
# include <dpiPoolImpl.h>
#endif


#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif


using namespace dpi;


class ConnImpl;



/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/


class EnvImpl : public Env
{
 public:
                               // creation/termination
  EnvImpl( const string &drvName,
           unsigned int charset,
           unsigned int ncharset);

  virtual ~EnvImpl();

  static EnvImpl * createEnvImpl( const string& drvName,
                                  unsigned int charset,
                                  unsigned int ncharset);

  virtual void terminate();

                                // interface properties
  virtual void poolMax(unsigned int poolMax);
  virtual unsigned int poolMax() const;

  virtual void poolMin(unsigned int poolMin);
  virtual unsigned int poolMin() const;

  virtual void poolIncrement(unsigned int poolIncrement);
  virtual unsigned int poolIncrement() const;

  virtual void poolTimeout(unsigned int poolTimeout);
  virtual unsigned int poolTimeout() const;

  virtual const string & drvName();

  virtual void externalAuth(bool externalAuth);
  virtual bool externalAuth() const;

  virtual void isEventEnabled(bool isEventEnabled);
  virtual bool isEventEnabled() const;

  virtual unsigned int clientcharset () const;
  virtual unsigned int clientncharset () const;

                                // interface  methods
  virtual SPool * createPool(const string &user, const string &password,
                             const string &connString,
                             int poolMax, int poolMin,
                             int poolIncrement,
                             int poolTimeout,
                             int stmtCacheSize,
                             bool externalAuth,
                             bool homogeneous,
                             int poolPingInterval );

  virtual Conn * getConnection(const string &user, const string &password,
                               const string &connString, int stmtCacheSize,
                               const string &connClass,
                               bool externalAuth, DBPrivileges dbPriv);


                                // internal methods
  virtual void terminatePool(PoolImpl *pool);

  virtual void releaseConnection(ConnImpl *conn);

                                // DateTime array
  virtual DateTimeArray* getDateTimeArray ( OCIError *errh ) const ;
  virtual void           releaseDateTimeArray ( DateTimeArray *arr ) const ;


  virtual DpiHandle * allocHandle(HandleType handleType);

  virtual Descriptor * allocDescriptor(DescriptorType descriptorType);

  virtual void allocDescriptorArray(DescriptorType descriptorType,
                                    unsigned int arraySize,
                                    Descriptor *descriptorArray[]);

  virtual DpiHandle * envHandle() const;


private:

  static void terminateEnvImpl(EnvImpl *env);

  void cleanup();

  OCIEnv      *envh_;           // OCI enviornment handle
  unsigned int poolMax_;        // max pool size
  unsigned int poolMin_;        // min pool size
  unsigned int poolIncrement_;  // pool increment
  unsigned int poolTimeout_;    // pool timeout

  bool         externalAuth_;   // doing external authentication
  bool         isEventEnabled_; // EVENTS are enabled

  unsigned int stmtCacheSize_;  // statement cache size
  string       drvName_;        // driver name

  unsigned int charset_;        // charset id
  unsigned int ncharset_;       // ncharset id
 };




#endif                                              /* DPIENVIMPL_ORACLE */
