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
 *   dpiPoolImpl.cpp - PoolImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the PoolImpl class which provides the implemenation
 *   of the Pool abstract class.
 *
 *****************************************************************************/

#ifndef DPIENVIMPL_ORACLE
# include <dpiEnvImpl.h>
#endif

#ifndef DPIPOOLIMPL_ORACLE
# include <dpiPoolImpl.h>
#endif

#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif

#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif

#include<iostream>
using namespace std;


/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the PoolImpl class.

   PARAMETERS:
     env           - parent Environment object
     envh          - OCI envh
     user          - userid
     password      - password
     connString    - connect string
     poolMax       - maximum pool size
     poolMin       - minimum pool size
     poolIncrement - pool increment
     poolTimeout   - pool timeout
     stmtCacheSize - statement cache size
     homogeneous   - homogeneous or non-homogeneous pool

   RETURNS:
     nothing

   NOTES:

 */

PoolImpl::PoolImpl(EnvImpl *env, OCIEnv *envh,
                   const string &user, const string &password,
                   const string &connString, int poolMax,
                   int poolMin, int poolIncrement,
                   int poolTimeout, bool externalAuth, int stmtCacheSize,
                   bool homogeneous, int poolPingInterval )
  try : env_(env), externalAuth_(externalAuth), envh_(envh), errh_(NULL),
        spoolh_(NULL), poolName_(NULL), poolAuth_(NULL), poolMax_(0),
        poolPingInterval_(poolPingInterval)
{
  ub4 mode = OCI_DEFAULT;
  void *errh   = NULL;
  void *spoolh = NULL;
  void *poolAuth = NULL;

  unsigned char spoolMode = OCI_SPOOL_ATTRVAL_NOWAIT; // spoolMode is a ub1

  if ( homogeneous )
  {
    mode |= OCI_SPC_HOMOGENEOUS ;
  }

  if (externalAuth && (password.length() || user.length()))
      throw ExceptionImpl(DpiErrExtAuth);

  ociCallEnv(OCIHandleAlloc((void *)envh_, &errh,
                            OCI_HTYPE_ERROR, 0, (dvoid **)0), envh_);
  errh_ = ( OCIError * ) errh;

  ociCall(OCIHandleAlloc((void *)envh_, (dvoid **)&spoolh,
                         OCI_HTYPE_SPOOL, 0, (dvoid **)0), errh_);
  spoolh_ = ( OCISPool * ) spoolh;

  ociCall ( OCIHandleAlloc ( ( void * ) envh_, ( dvoid ** ) &poolAuth,
                             OCI_HTYPE_AUTHINFO, 0, ( dvoid ** ) 0 ), errh_ );

  poolAuth_ = ( OCIAuthInfo *) poolAuth;

  if ( !(env_->drvName()).empty() )
  {
    ociCall ( OCIAttrSet ( ( void * ) poolAuth_, OCI_HTYPE_AUTHINFO,
                           ( OraText * ) ( env_->drvName() ).c_str (),
                           ( ub4 ) ( ( env_->drvName() ).length () ),
                           OCI_ATTR_DRIVER_NAME, errh_ ), errh_ );
  }

  ociCall ( OCIAttrSet ( spoolh_, OCI_HTYPE_SPOOL, poolAuth_, 0,
                         OCI_ATTR_SPOOL_AUTH, errh_ ), errh_ );

  ociCall(OCISessionPoolCreate(envh_, errh_, spoolh_,
                               &poolName_, &poolNameLen_,
                               (OraText *)connString.c_str (),
                               (ub4) connString.length(),
                               poolMin, poolMax,
                               poolIncrement,
                               (OraText *)user.c_str (), (ub4) user.length(),
                               (OraText *)password.c_str (),
                               (ub4) password.length(),
                               mode), errh_ );

  this->poolTimeout(poolTimeout);
  this->stmtCacheSize(stmtCacheSize);
  poolMax_ = poolMax;

  /* In case of no free connections available, report error */
  ociCall (OCIAttrSet (spoolh_, OCI_HTYPE_SPOOL, &spoolMode,
                       sizeof (spoolMode), OCI_ATTR_SPOOL_GETMODE, errh_ ),
           errh_ ) ;

}

catch (...)
{
  cleanup();
  throw;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the PoolImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

PoolImpl::~PoolImpl()
{
  cleanup();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Terminate the Pool object.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

void PoolImpl::terminate()
{
  if (poolName_)
  {
    ociCall( OCISessionPoolDestroy( spoolh_, errh_, OCI_DEFAULT), errh_);
    poolName_ = NULL;
  }
  env_->terminatePool(this);
}


/*****************************************************************************/
/*
   DESCRIPTION
     Set the pool timeout.

   PARAMETERS:
     poolTimeout - pool timeout

   RETURNS:
     nothing

   NOTES:

 */

void PoolImpl::poolTimeout(unsigned int poolTimeout)
{
  ociCall(OCIAttrSet(spoolh_, OCI_HTYPE_SPOOL,  &poolTimeout,  0,
                     OCI_ATTR_SPOOL_TIMEOUT, errh_), errh_);
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

void PoolImpl::stmtCacheSize(unsigned int stmtCacheSize)
{
  ociCall(OCIAttrSet(spoolh_, OCI_HTYPE_SPOOL,  &stmtCacheSize,  0,
                     OCI_ATTR_SPOOL_STMTCACHESIZE, errh_), errh_);
}




/*****************************************************************************/
/*
   DESCRIPTION
     Get the number of currently open connections.

   PARAMETERS:
     none

   RETURNS:
     number of currently open connections

   NOTES:

 */

unsigned int PoolImpl::connectionsOpen() const
{
  ub4 openConnections = 0;

  ociCall(OCIAttrGet(spoolh_, OCI_HTYPE_SPOOL,  &openConnections,  0,
                     OCI_ATTR_SPOOL_OPEN_COUNT, errh_), errh_);
  return openConnections;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get the number of currently in use (checked-out) connections.

   PARAMETERS:
     none

   RETURNS:
     number of currently in use (checked-out) connections

   NOTES:

 */

unsigned int PoolImpl::connectionsInUse() const
{
  ub4 inUse = 0;

  ociCall(OCIAttrGet(spoolh_, OCI_HTYPE_SPOOL,  &inUse,  0,
                     OCI_ATTR_SPOOL_BUSY_COUNT, errh_), errh_);
  return inUse;

}


/*****************************************************************************/
/*
   DESCRIPTION
     Get the PoolMax specified while creating the session-ppol.

   PARAMETERS
     -None-

   RETURNS
     poolMax provided while creating the pool

   NOTES:
     -None-
*/
int PoolImpl::poolMax () const
{
  return poolMax_;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get connection.

   PARAMETERS:
     connectionClass - connection class.
     user            - user name in case of non-homogeneous pool
     password        - password in case of non-homogenous pool
     tag             - session tag name
     any             - match tag name as MATCHANY or MATCHEXACT
     dbPriv          - DB Privileges (SYSDBA or none)


   RETURNS:
     created connection

   NOTES:

 */

Conn * PoolImpl::getConnection ( const std::string& connClass,
                                 const std::string& user,
                                 const std::string& password,
                                 const std::string& tag,
                                 const boolean matchAnyTag,
                                 const DBPrivileges dbPriv )
{
  Conn *conn = new ConnImpl(this, envh_, externalAuth_, poolName_,
                            poolNameLen_, connClass, user, password, tag,
                            matchAnyTag, dbPriv, poolPingInterval_ );
  return conn;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Release the connection.

   PARAMETERS:
     conn - connection to be release.

   RETURNS:
     nothing

   NOTES:

 */

void PoolImpl::releaseConnection(ConnImpl *conn)
{
  delete conn;
}




  /*---------------------------------------------------------------------------
                          PRIVATE METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Cleanup for the PoolImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:
     The free OCI handles are set to NULL to so that in case someone tries to
     use a released Pool handle, they will get a reproducible seg-fault.
 */

void PoolImpl::cleanup()
{
  if ( poolAuth_ )
  {
    OCIHandleFree (poolAuth_, OCI_HTYPE_AUTHINFO );
    poolAuth_ = NULL;
  }

  if (poolName_)
  {
    // Ignore errors thrown.
    OCISessionPoolDestroy( spoolh_, errh_, OCI_DEFAULT);
    poolName_ = NULL;
  }

  if (spoolh_)
  {
    OCIHandleFree ( spoolh_, OCI_HTYPE_SPOOL);
    spoolh_ = NULL;
  }

  if (errh_)
  {
    OCIHandleFree ( errh_, OCI_HTYPE_ERROR );
    errh_ = NULL ;
  }

}




/* end of file dpiPoolImpl.cpp */

