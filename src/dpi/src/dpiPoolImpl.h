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
 *  dpiPoolImpl.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPIPOOLIMPL_ORACLE
# define DPIPOOLIMPL_ORACLE


#ifndef DPIPOOL_ORACLE
# include <dpiPool.h>
#endif


#ifndef DPIENVIMPL_ORACLE
# include <dpiEnvImpl.h>
#endif


#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif


using namespace dpi;


class EnvImpl;
class ConnImpl;



/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

class PoolImpl : public SPool
{
 public:

                               // creation/termination
  PoolImpl(EnvImpl *env, OCIEnv *envh,
           const string &user, const string &password,
           const string &connString,
           int poolMax, int poolMin, int poolIncrement, int poolTimeout,
           bool externalAuth, int stmtCacheSize);

  virtual ~PoolImpl();

  virtual void terminate();

                                // interface properties
  virtual void poolTimeout( unsigned int poolTimeout);
  virtual void stmtCacheSize( unsigned int stmtCacheSize );
  virtual unsigned int connectionsOpen() const;
  virtual unsigned int connectionsInUse() const;

                                // interface methods
  virtual Conn * getConnection( const std::string& connClass );

                                // internal methods
  virtual void releaseConnection(ConnImpl *conn);

 private:

  void cleanup();

  EnvImpl     *env_;            // parent Env object
  bool         externalAuth_;   // doing external authentication
  OCIEnv      *envh_;           // OCI enviornment handle
  OCIError    *errh_;           // OCI error handle
  OCISPool    *spoolh_;         // OCI session pool handle
  OraText     *poolName_;       // pool name
  ub4          poolNameLen_;    // pool name length
};




#endif                                              /* DPIPOOLIMPL_ORACLE */
