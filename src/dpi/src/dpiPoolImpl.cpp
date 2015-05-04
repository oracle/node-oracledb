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
 *   dpiPoolImpl.cpp - PoolImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the PoolImpl class which provides the implemenation
 *   of the Pool abstract class.
 *
 *****************************************************************************/


#ifndef ORATYPES
# include <oratypes.h>
#endif


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

   RETURNS:
     nothing

   NOTES:

 */

PoolImpl::PoolImpl(EnvImpl *env, OCIEnv *envh,
                   const string &user, const string &password,
                   const string &connString, int poolMax,
                   int poolMin, int poolIncrement,
                   int poolTimeout, bool externalAuth, int stmtCacheSize)
  try : env_(env), externalAuth_(externalAuth), envh_(envh), errh_(NULL),
        spoolh_(NULL), poolName_(NULL)
{
  ub4 mode = externalAuth ? OCI_DEFAULT : OCI_SPC_HOMOGENEOUS;

  unsigned char spoolMode = OCI_SPOOL_ATTRVAL_NOWAIT; // spoolMode is a ub1

  if (externalAuth && (password.length() || user.length()))
      throw ExceptionImpl(DpiErrExtAuth);

  ociCallEnv(OCIHandleAlloc((void *)envh_, (dvoid **)&errh_,
                            OCI_HTYPE_ERROR, 0, (dvoid **)0), envh_);

  ociCall(OCIHandleAlloc((void *)envh_, (dvoid **)&spoolh_,
                         OCI_HTYPE_SPOOL, 0, (dvoid **)0), errh_);

  ociCall(OCISessionPoolCreate(envh_, errh_, spoolh_,
                               &poolName_, &poolNameLen_,
                               (OraText *)connString.data (),
                               (ub4) connString.length(),
                               poolMin, poolMax,
                               poolIncrement,
                               (OraText *)user.data (), (ub4) user.length(),
                               (OraText *)password.data (),
                               (ub4) password.length(),
                               mode), errh_ );

  this->poolTimeout(poolTimeout);
  this->stmtCacheSize(stmtCacheSize);

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
     Get connection.

   PARAMETERS:
     connectionClass - connection class.
                       If specified as empty string, then no connection class

   RETURNS:
     created connection

   NOTES:

 */

Conn * PoolImpl::getConnection ( const std::string& connClass)
{
  Conn *conn = new ConnImpl(this, envh_, externalAuth_,
                            poolName_, poolNameLen_, connClass
                            );
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

