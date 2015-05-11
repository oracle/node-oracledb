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
 *   dpiEnvImpl.cpp - EnvImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the EnvImpl class which provides the implemenation of
 *   the Env abstract class.
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


#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif


#ifndef DPIDATETIMEARRAYIMPL_ORACLE
# include <dpiDateTimeArrayImpl.h>
#endif


#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif



/*---------------------------------------------------------------------------
                     PRIVATE CONSTANTS
  ---------------------------------------------------------------------------*/

static const int kPoolMax = 10;
static const int kPoolMin = 1;
static const int kPoolIncrement = 1;
static const int kPoolTimeout = 120;
static const int kStmtCacheSize = 60;




/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the EnvImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

EnvImpl::EnvImpl()

try : envh_(NULL), poolMax_(kPoolMax), poolMin_(kPoolMin),
      poolIncrement_(kPoolIncrement), poolTimeout_(kPoolTimeout),
      externalAuth_(false),  stmtCacheSize_(kStmtCacheSize)
{

  sword rc = OCIEnvCreate (&envh_, OCI_THREADED | OCI_OBJECT, NULL, NULL,
                           NULL, NULL, 0, NULL);
  if (rc)
  {
    if (envh_)
      ociCallEnv(rc, envh_);
    else
      throw ExceptionImpl(DpiErrNoEnv);
  }

  DateTimeArrayImpl::initBaseDate ( envh_ ) ;
}

catch (...)
{
  cleanup();
  throw;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the EnvImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

EnvImpl::~EnvImpl()
{
  cleanup();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Create the Env object.

   PARAMETERS:
     envAttrs - environment attributes

   RETURNS:
     nothing
 */

EnvImpl * EnvImpl::createEnvImpl()
{
  return new EnvImpl();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Terminate the Env object.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::terminate()
{
  EnvImpl::terminateEnvImpl(this);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set the maximum pool size.

   PARAMETERS:
     poolMax - maximum pool size

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::poolMax(unsigned int poolMax)
{
  poolMax_ = poolMax;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get the maximum pool size.

   PARAMETERS:
     none

   RETURNS:
     maximum pool size

   NOTES:

 */

unsigned int EnvImpl::poolMax() const
{
  return poolMax_;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set the minumum pool size.

   PARAMETERS:
     poolMin - minimum pool size

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::poolMin(unsigned int poolMin)
{
  poolMin_ = poolMin;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get the minimum pool size.

   PARAMETERS:
     none

   RETURNS:
     mainimum pool size

   NOTES:

 */

unsigned int EnvImpl::poolMin() const
{
  return poolMin_;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set the pool increment.

   PARAMETERS:
     poolIncrement - pool increment

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::poolIncrement(unsigned int poolIncrement)
{
  poolIncrement_= poolIncrement;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get the pool increment.

   PARAMETERS:
     none

   RETURNS:
     pool increment

   NOTES:

 */

unsigned int EnvImpl::poolIncrement() const
{
  return poolIncrement_;
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

void EnvImpl::poolTimeout(unsigned int poolTimeout)
{
  poolTimeout_ = poolTimeout;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get the pool timeout.

   PARAMETERS:
     none

   RETURNS:
     pool timeout

   NOTES:

 */

unsigned int EnvImpl::poolTimeout() const
{
  return poolTimeout_;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Specify external authentication.

   PARAMETERS:
    externalAuth  - true if using external authentication
                      false if not useing external authentication

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::externalAuth(bool externalAuth)
{
  externalAuth_ = externalAuth;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Is external authentication being used?

   PARAMETERS:
    none

   RETURNS:
     true if using external authentication
     false otherwise

   NOTES:

 */

bool EnvImpl::externalAuth() const
{
  return externalAuth_;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Specify EVENTS mode.

   PARAMETERS:
    isEventEnabled  - true if EVENTS mode enabled
                      false if EVENTS mode not enabled

   RETURNS:
     nothing
 */

void EnvImpl::isEventEnabled(bool isEventEnabled)
{
  isEventEnabled_ = isEventEnabled;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Is EVENTS mode enabled?

   PARAMETERS:
    none

   RETURNS:
     true if EVENTS mode enabled
     false otherwise

   NOTES:

 */

bool EnvImpl::isEventEnabled() const
{
  return isEventEnabled_;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Create the Pool object.

   PARAMETERS:
     user          - userid
     password      - password
     connString    - connect string
     poolMax       - Max number of connections for session pool
     poolMin       - Min number of connections for session pool
     poolIncrement - Increment count for session pool

   RETURNS:
     created pool

   NOTES:

 */

SPool * EnvImpl::createPool(const string &user, const string &password,
                            const string &connString,
                            int poolMax, int poolMin, int poolIncrement,
                            int poolTimeout, int stmtCacheSize,
                            bool externalAuth)
{
  return new PoolImpl(this, envh_, user, password, connString,
                      (poolMax == -1) ? poolMax_ : poolMax,
                      (poolMin == -1) ? poolMin_ : poolMin,
                      (poolIncrement == -1) ? poolIncrement_ :
                                              poolIncrement,
                      (poolTimeout == -1) ? poolTimeout_ :
                                            poolTimeout,
                      externalAuth,
                      (stmtCacheSize == -1) ? stmtCacheSize_ :
                      stmtCacheSize);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get connection.

   PARAMETERS:
     user       - userid
     password   - password
     connString - connect string
     connAttrs  - connection attributes

   RETURNS:
     created connection
 */

Conn * EnvImpl::getConnection(const string &user, const string &password,
                              const string &connString,
                              int stmtCacheSize, const string &connClass,
                              bool externalAuth)
{
  return (Conn *)new ConnImpl(this, envh_, externalAuth,
                              (stmtCacheSize == -1) ? stmtCacheSize_ :
                                                      stmtCacheSize,
                              user, password,
                              connString, connClass);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Terminated the pool.

   PARAMETERS:
     pool - connectionpool to be terminated.

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::terminatePool(PoolImpl *pool)
{
  delete pool;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Release the connection.

   PARAMETERS:
     conn - connection to be terminated.

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::releaseConnection(ConnImpl *conn)
{
  delete conn;
}




  /*---------------------------------------------------------------------------
                          PRIVATE METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Terminated the Env object.

   PARAMETERS:
     env - Env object to be terminated.

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::terminateEnvImpl(EnvImpl *env)
{
  DateTimeArrayImpl::cleanBaseDate ();
  delete env;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Cleanup for the EnvImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

void EnvImpl::cleanup()
{
  if (envh_)
  {
    OCIHandleFree(envh_, OCI_HTYPE_ENV);
    envh_ = NULL;               // reproducible seg-faults in case someone uses
                                // a deleted Env
  }
}


/****************************************************************************/
/*
  NAME
    getDateTimeArray

  DESCRIPTION
    To obtain an DPI class which represents date/timestamp as descriptor
    array

  RETURNS:
    DateTimeArray *  -

  NOTE:
    DatetimeArray uses error object created in StmtImpl instead of creating
    separate one, this is ok, as the date/timestamp will be part of SQL
    statement execution only.
*/
DateTimeArray* EnvImpl::getDateTimeArray (OCIError *errh) const
{
  return new DateTimeArrayImpl ( envh_, errh, this ) ;
}


/****************************************************************************/
/*
  NAME
    releaseDateTimeArray

  DESCRIPTION
    To release datetimeArray object and related resources

  RETURNS:
    NONE
*/
void EnvImpl::releaseDateTimeArray ( DateTimeArray *arr )  const
{
  if ( arr )
    delete arr;
}




/* end of file dpiEnvImpl.cpp */

