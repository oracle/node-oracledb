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
 *   dpiConnImpl.cpp - ConnImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the ConnImpl class which provides the implemenation of
 *   the Conn abstract class.
 *
 *****************************************************************************/

#ifndef ORATYPES
# include <oratypes.h>
#endif


#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif

#ifndef DPISTMTIMPL_ORACLE
# include <dpiStmtImpl.h>
#endif


#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif

#include <iostream>

using namespace std;




/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ConnImpl class created from an Env object.

   PARAMETERS:
     env           - parent Env object
     envh          - OCI envh
     stmtCacheSize - statement cache size
     user          - userid
     password      - password
     connString    - connect string

   RETURNS:
     nothing
 */

ConnImpl::ConnImpl(EnvImpl *env, OCIEnv *envh, bool externalAuth,
                   unsigned int stmtCacheSize,
                   const string &user, const string &password,
                   const string &connString, const string &connClass)

try :  env_(env), pool_(NULL),
       envh_(envh), errh_(NULL), auth_(NULL), svch_(NULL), sessh_(NULL),
       hasTxn_(false)
{
  ub4 mode = externalAuth ? OCI_SESSGET_CREDEXT : OCI_DEFAULT;

  ociCallEnv(OCIHandleAlloc((void *)envh_, (dvoid **)&errh_,
                            OCI_HTYPE_ERROR, 0, (dvoid **)0), envh_);

  ociCallEnv(OCIHandleAlloc((void *)envh_, (dvoid **)&auth_,
                            OCI_HTYPE_AUTHINFO, 0, (dvoid **)0), envh_);

  if (externalAuth)
  {
    if (password.length() || user.length())
      throw ExceptionImpl(DpiErrExtAuth);
  }
  else
  {
    ociCall(OCIAttrSet((void *)auth_, OCI_HTYPE_AUTHINFO,
                       (void *)user.data(), (ub4) user.length(),
                       OCI_ATTR_USERNAME, errh_), errh_);

    ociCall(OCIAttrSet((void *)auth_, OCI_HTYPE_AUTHINFO,
                       (void *)password.data(), (ub4) password.length(),
                       OCI_ATTR_PASSWORD, errh_), errh_);
  }

  // If connection class provided, set it on auth handle
  if (connClass.length() )
  {
    ociCall (OCIAttrSet ((void*)auth_, OCI_HTYPE_AUTHINFO,
                         (void *)connClass.data(), (ub4) connClass.length(),
                         OCI_ATTR_CONNECTION_CLASS, errh_), errh_);
  }

  ociCall(OCISessionGet(envh_, errh_, &svch_, auth_,
                        (OraText *)connString.data(),
                        (ub4) connString.length(), NULL, 0, NULL, NULL, NULL,
                        mode), errh_);

  ociCall(OCIAttrGet(svch_, OCI_HTYPE_SVCCTX, &sessh_,  0,
                     OCI_ATTR_SESSION, errh_),errh_);

  this->stmtCacheSize(stmtCacheSize);
}

catch (...)
{
  cleanup();
  throw;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ConnImpl class created from a Pool object.

   PARAMETERS:
     pool            - parent Pool object
     envh            - OCI envh
     stmtCacheSize   - statement cache size
     poolName        - name of the pool
     poolNameLen     - length of pool name
     connectionClass - connection class.

   RETURNS:
     nothing

   NOTES:
     This constructor to be used in session-pool scenarios.
 */

ConnImpl::ConnImpl(PoolImpl *pool, OCIEnv *envh, bool externalAuth,
                   OraText *poolName, ub4 poolNameLen, const string& connClass
                   )

try :  env_(NULL), pool_(pool),
       envh_(envh), errh_(NULL), auth_(NULL),
       svch_(NULL), sessh_(NULL), hasTxn_(false)
{
  ub4 mode = externalAuth ? (OCI_SESSGET_CREDEXT | OCI_SESSGET_SPOOL) :
                              OCI_SESSGET_SPOOL;
  ociCallEnv(OCIHandleAlloc((void *)envh_, (dvoid **)&errh_,
                            OCI_HTYPE_ERROR, 0, (dvoid **)0), envh_);
  ociCallEnv(OCIHandleAlloc((void *)envh_, (dvoid **)&auth_,
                            OCI_HTYPE_AUTHINFO, 0, (dvoid **)0), envh_);

  // If connection class provided, set it on auth handle
  if (connClass.length() )
  {
    ociCall (OCIAttrSet ((void*)auth_, OCI_HTYPE_AUTHINFO,
                         (void *)connClass.data(), (ub4) connClass.length(),
                         OCI_ATTR_CONNECTION_CLASS, errh_), errh_);
  }

  ociCall(OCISessionGet(envh_, errh_, &svch_, auth_,
                        poolName, poolNameLen,
                        NULL, 0, NULL, NULL, NULL,
                        mode), errh_);

  ociCall(OCIAttrGet(svch_, OCI_HTYPE_SVCCTX, &sessh_, 0, OCI_ATTR_SESSION,
                     errh_), errh_);
}

catch (...)
{
  cleanup ();
  throw;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the ConnImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

ConnImpl::~ConnImpl()
{
  cleanup();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Release the connection.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::release()
{
  #if OCI_MAJOR_VERSION >= 12
    ociCall(OCIAttrGet(sessh_, OCI_HTYPE_SESSION, &hasTxn_, NULL,
                       OCI_ATTR_TRANSACTION_IN_PROGRESS, errh_), errh_);
  #endif

  if(hasTxn_)
    rollback();

  if (pool_)
    pool_->releaseConnection(this);
  else if (env_)
    env_->releaseConnection(this);
}

/****************************************************************************
 * NAME
 *   releaseStmt
 *
 * DESCRIPTION
 *   To release Stmt object created
 *
 * PARAMETERS
 *   stmt  - DPI stmt object
 *
 * RETURNS
 *   -NONE-
 ****************************************************************************/
void ConnImpl::releaseStmt ( Stmt *stmt )
{
  if (stmt )
  {
    delete stmt;
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set statement cache size.

   PARAMETERS:
     stmtCacheSize - statement cache size

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::stmtCacheSize(unsigned int stmtCacheSize)
{
  ociCall(OCIAttrSet(svch_, OCI_HTYPE_SVCCTX,  &stmtCacheSize,  0,
                     OCI_ATTR_STMTCACHESIZE, errh_), errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get statement cache size.

   PARAMETERS:
     none

   RETURNS:
     statement cache size

   NOTES:

 */

unsigned int ConnImpl::stmtCacheSize() const
{
  unsigned int  stmtCacheSize = 0;

  ociCall(OCIAttrGet(svch_, OCI_HTYPE_SVCCTX, &stmtCacheSize, NULL,
                     OCI_ATTR_STMTCACHESIZE, errh_), errh_);

  return stmtCacheSize;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set client id.

   PARAMETERS:
     clientId - client id

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::clientId(const string &clientId)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)clientId.data(),
                     (ub4)clientId.length(), OCI_ATTR_CLIENT_IDENTIFIER, errh_),
          errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set the module.

   PARAMETERS:
     module - module

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::module(const string &module)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)module.data(),
                     (ub4) module.length(), OCI_ATTR_MODULE, errh_), errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set action.

   PARAMETERS:
     action - action

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::action(const string &action)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)action.data(),
                     (ub4) action.length(), OCI_ATTR_ACTION, errh_), errh_);
}






/*****************************************************************************/
/*
   DESCRIPTION
     Prepare & return the dpiStatement object

   PARAMETERS:
     sql - SQL statement

   RETURNS:
     nothing

   NOTES:

 */

Stmt* ConnImpl::getStmt (const string &sql)
{
  StmtImpl *stmt = new StmtImpl ( env_, envh_, this, svch_, sql);

  return stmt;
}



/*****************************************************************************/
/*
  DESCRIPTION
    Commit the transaction in progress

  PARAMETERS:
    -NONE-

  RETURNS
    -NONE_
*/
void ConnImpl::commit ()
{
  ociCall (OCITransCommit (svch_, errh_, OCI_DEFAULT), errh_);
}



/*****************************************************************************/
/*
  DESCRIPTION
    Rollback the transaction in progress

  PARAMETERS
    -NONE-

  RETUNRS:
    -NONE_
*/
void ConnImpl::rollback ()
{
  ociCall (OCITransRollback (svch_, errh_, OCI_DEFAULT), errh_);
}


/*****************************************************************************/
/*
  DESCRIPTION
    break (interrupt) the currently executing operation

  PARAMETERS
    -NONE-

  RETURNS:
    -NONE_
*/
void ConnImpl::breakExecution()
{
  if(svch_)
  {
    ociCall (OCIBreak (svch_, errh_), errh_);
  }
}


/*---------------------------------------------------------------------------
                          PRIVATE METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Cleanup for the ConnImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:
     The free OCI handles are set to NULL to so that in case someone tries to
     use a release Conn handle, they will get a reproducible seg-fault.
 */

void ConnImpl::cleanup()
{
  if (svch_)
  {
    OCISessionRelease(svch_, errh_, NULL, 0, OCI_DEFAULT);
    svch_ = NULL;
  }

  if (auth_)
  {
    OCIHandleFree (auth_, OCI_HTYPE_AUTHINFO);
    auth_ = NULL;
  }

  if (errh_)
  {
    OCIHandleFree(errh_, OCI_HTYPE_ERROR);
    errh_ = NULL;
  }
}




/* end of file dpiConnImpl.cpp */

