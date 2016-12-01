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



/*
 * The maximum byte expansion ratio from any DB character to
 * AL32UTF8 is known to be 3-times
 */
#define DPI_WORST_CASE_BYTE_CONVERSION_RATIO    3

/*
 * No byte expansion required if DB has AL32UTF8 charset since client is
 * always AL32UTF8
 */
#define DPI_BEST_CASE_BYTE_CONVERSION_RATIO     1

/*
 * The maximum character expansion ratio from any DB character to
 * AL32UTF8 is known to be 4-times for LOBs
 */
#define DPI_WORST_CASE_CHAR_CONVERSION_RATIO    4

/*
 * No character expansion required if DB has AL32UTF8 charset since client is
 * always AL32UTF8
 */
#define DPI_BEST_CASE_CHAR_CONVERSION_RATIO     1

// Context property name used to store the last-accessed-time of the
// connection.  This time and pingInterval are used to decide whether to
// ping or not
#define DPI_TIME_2_PING_NAME       "TIME_2_PING"

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
           const string &connClass,
           DBPrivileges dbPriv );

  ConnImpl(PoolImpl *pool, OCIEnv *envh, bool externalAuth,
           OraText *poolName, ub4 poolNameLen, const string &connClass,
           const string &user, const string &password, const string &tag,
           const boolean matchAny, const DBPrivileges dbPriv,
           int pingInterval = DPI_NO_PING_INTERVAL );

  virtual ~ConnImpl();

  virtual void release( const string &tag, boolean retag);

                                // interface properties
  virtual void stmtCacheSize(unsigned int stmtCacheSize);
  virtual unsigned int stmtCacheSize() const;

  virtual void lobPrefetchSize(unsigned int lobPrefetchSize);
  virtual unsigned int lobPrefetchSize() const;

  virtual void clientId(const string &clientId);

  virtual void module(const string &module);

  virtual void action(const string &action);

  // Connection with requested tag returned or not?
  virtual boolean tagMatched ()  { return tagMatched_; }

  // tag associated with connection
  virtual std::string& tag ()    { return outTag_;     }

  virtual unsigned int getVarCharByteExpansionRatio ();

  virtual unsigned int getLOBCharExpansionRatio ();

                              // interface methods
  virtual Stmt* getStmt(const string &sql);

  virtual void releaseStmt(Stmt *stmt);

  virtual void commit();

  virtual void rollback();

  virtual void breakExecution();

  virtual DpiHandle *getSvch (){return (DpiHandle *)svch_;};

  virtual DpiHandle *getErrh (){return (DpiHandle *)errh_;};

  virtual void setErrState ( int errNum );

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

    virtual unsigned int getServerVersion () ;

private:

  void initConnImpl( bool pool, bool externalAuth, const string& connClass,
                     OraText *poolNmRconnStr, ub4 nameLen,
                     const string &user, const string &password,
                     const string &tag, boolean any, std::string &curTag,
                     boolean &found, DBPrivileges dbPriv );

  void cleanup();

  EnvImpl      *env_;           // parent Env object
  PoolImpl     *pool_;          // parent pool object if created from a pool
  OCIEnv       *envh_;          // OCI enviornment handle
  OCIError     *errh_;          // OCI error handle
  OCIAuthInfo  *auth_;          // OCI auth handle
  OCISvcCtx    *svch_;          // OCI service handle
  OCISession   *sessh_;         // OCI Session handle. Do not free this.
  boolean      hasTxn_;         // set if transaction is in progress
  int          csRatio_;        // character expansion ratio
  int          lobCSRatio_;     // character expansion ratio for LOBs
  OCIServer    *srvh_;          // OCI server handle
  bool         dropConn_;       // Set flag in case of unusable connection
  string       inTag_;          // To fetch connections with specified inTag_
  string       outTag_;         // When connection is given, what is tag val
  string       relTag_;         // Release connectih specified tag
  boolean      retag_;          // How to retag? (update, ignore)
  boolean      tagMatched_;     // connection is of same tag as requested?
  int          pingInterval_;   // Time to elapse before checking for aliveness
  long         *lasttick_;      // next ping time if time elapsed.
  static string s_propPingName_;// Property name used in Context APIs
};




#endif                                              /* DPICONNIMPL_ORACLE */
