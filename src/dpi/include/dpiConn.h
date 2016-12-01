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
 *  dpiconn.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPICONN_ORACLE
# define DPICONN_ORACLE

#ifndef DPILOB_ORACLE
# include <dpiLob.h>
#endif

#ifndef DPISTMT_ORACLE
# include <dpiStmt.h>
#endif


#include <string>

#include <time.h>


namespace dpi
{

using std::string;


/*---------------------------------------------------------------------------
                     PUBLIC CONSTANTS
  ---------------------------------------------------------------------------*/
// Enumeration for Database Privileges
typedef enum
{
  dbPrivNONE = 0,                                             // None specified
  dbPrivSYSDBA,                                                       // SYSDBA
} DBPrivileges;



/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/



class Conn
{
public:
                                // termination

  virtual void release( const string &tag = "", boolean retag = false ) = 0;

                                // properties
  virtual void stmtCacheSize(unsigned int stmtCacheSize) = 0;
  virtual unsigned int stmtCacheSize() const = 0;

  virtual void lobPrefetchSize(unsigned int lobPrefetchSize) = 0;
  virtual unsigned int lobPrefetchSize() const = 0;

  virtual void clientId(const string &clientId) = 0;

  virtual void module(const string &module) = 0;

  virtual void action(const string &action) = 0;

                              // Session Tag
  // In case of pooled-connections & tagged sessions, did we get session
  // with provided Tag
  virtual boolean tagMatched () = 0;
  // In case of pooled-connections & tagged sessions, session tag at
  // session acquiring time
  virtual std::string &tag () = 0;

                                // methods
  virtual Stmt* getStmt (const string &sql="") = 0;

  virtual void commit() = 0;

  virtual void rollback() = 0;

  virtual void breakExecution() = 0;

  virtual DpiHandle *getSvch () = 0;

  virtual DpiHandle *getErrh () = 0;

  virtual unsigned int getServerVersion () = 0;

  virtual unsigned int getVarCharByteExpansionRatio () = 0;

  virtual unsigned int getLOBCharExpansionRatio () = 0;

  virtual void setErrState ( int errNum ) = 0;

protected:
                                // clients cannot do new and delete
  Conn(){};

  virtual ~Conn(){};


private:

};


} // end of namespace dpi


#endif                                              /* DPICONN_ORACLE */
