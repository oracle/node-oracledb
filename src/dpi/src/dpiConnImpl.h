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
 *  dpiconnImpl.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPICONNIMPL_ORACLE
# define DPICONNIMPL_ORACLE


#ifndef OCI_ORACLE
# include <oci.h>
#endif


#ifndef DPICONN_ORACLE
# include <dpiConn.h>
#endif


#ifndef DPIENVIMPL_ORACLE
# include <dpiEnvImpl.h>
#endif


#ifndef DPIPOOLIMPL_ORACLE
# include <dpiPoolImpl.h>
#endif


using namespace dpi;


class EnvImpl;
class PoolImpl;



/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

class ConnImpl : public Conn
{
 public:
                                // creation/termination

  ConnImpl(EnvImpl *env, OCIEnv *envh, bool externalAuth,
           unsigned int stmtCacheSize,
           const string &user, const string &password,
           const string &connString,
           const string &connClass);

  ConnImpl(PoolImpl *pool, OCIEnv *envh, bool externalAuth,
           OraText *poolName, ub4 poolNameLen, const string &connClass
           );

  virtual ~ConnImpl();

  virtual void release();

                                // interface properties
  virtual void stmtCacheSize(unsigned int stmtCacheSize);
  virtual unsigned int stmtCacheSize() const;

  virtual void clientId(const string &clientId);

  virtual void module(const string &module);

  virtual void action(const string &action);


                                // interface methods
  virtual Stmt* getStmt(const string &sql);

  virtual void releaseStmt(Stmt *stmt);

  virtual void commit();

  virtual void rollback();

  virtual void breakExecution();

  #if OCI_MAJOR_VERSION < 12
    inline void hasTxn(boolean connHasTxn)
    {
      // sets the flag used during connection release.
      hasTxn_ = connHasTxn;
    }
    inline boolean hasTxn()
    {
      // returns flag to denote active transactions.
      return hasTxn_;
    }
  #endif

private:

  void cleanup();


  EnvImpl     *env_;            // parent Env object
  PoolImpl    *pool_;           // parent pool object if created from a pool

  OCIEnv      *envh_;           // OCI enviornment handle
  OCIError    *errh_;           // OCI error handle
  OCIAuthInfo *auth_;           // OCI auth handle
  OCISvcCtx   *svch_;           // OCI service handle
  OCISession  *sessh_;          // OCI Session handle. Do not free this.
  boolean     hasTxn_;          // set if transaction is in progress
};




#endif                                              /* DPICONNIMPL_ORACLE */
