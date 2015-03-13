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
 *  njsConnection.h
 *
 * DESCRIPTION
 *  Connection class
 *
 *****************************************************************************/

#ifndef __NJSCONNECTION_H__
#define __NJSCONNECTION_H__

#include <node.h>
#include <string>
#include <vector>
#include "dpi.h"
#include "njsUtils.h"
#include "njsOracle.h"

using namespace v8;
using namespace node;
using namespace dpi;

/**
* Structure used for binds 
**/
typedef struct Bind
{
  std::string       key;
  void*             value;
  void*             extvalue;
  DPI_BUFLEN_TYPE       len;
  DPI_SZ_TYPE           maxSize;
  unsigned short    type;
  short             ind;
  bool              isOut;
  dpi::DateTimeArray *dttmarr;
 
  Bind () : key(""), value(NULL), extvalue (NULL), len(0), maxSize(0),
            type(0), ind(0), isOut(false), dttmarr ( NULL ) 
  {}
}Bind;

/**
* Structure used for Query result 
**/
typedef struct Define
{
 
  unsigned short fetchType;                                    
  DPI_SZ_TYPE        maxSize;                                 
  void         *buf;             // will have the values from DB
  void         *extbuf;          // this field will be DPI calls
  DPI_BUFLEN_TYPE  *len;
  short        *ind;
  dpi::DateTimeArray *dttmarr;   // DPI Date time array of descriptor
 
  Define () :fetchType(0), maxSize(0), buf(NULL), extbuf(NULL),
             len(0), ind(0), dttmarr(NULL)
  {}
} Define;

/**
* Baton for Asynchronous Connection methods
**/
typedef struct eBaton
{
  uv_work_t     req;
  std::string   sql;
  std::string   error;
  dpi::Env*     dpienv;
  dpi::Conn*    dpiconn;     
  DPI_SZ_TYPE   rowsAffected;
  unsigned int  maxRows;
  bool          isAutoCommit;
  unsigned int  rowsFetched;
  unsigned int  outFormat;
  unsigned int  numCols;
  dpi::Stmt     *dpistmt;
  dpi::DpiStmtType     st;
  std::vector<Bind*>   binds;
  std::string          *columnNames;
  Define               *defines;
  Persistent<Function> cb;
 
  eBaton() : sql(""), error(""), dpienv(NULL), dpiconn(NULL), 
             rowsAffected(0), maxRows(0), isAutoCommit(false), 
             rowsFetched(0), outFormat(0), numCols(0), dpistmt(NULL),
             st(DpiStmtUnknown), columnNames(NULL), defines(NULL) 
  {}

  ~eBaton ()
   {
     cb.Dispose();
     if( !binds.empty() )
     {
       for( unsigned int index = 0 ;index < binds.size(); index++ )
       {
         // donot free date value here, it is done in DateTimeArray functions
         if(binds[index]->type != DpiTimestampLTZ ) 
         {
           if( binds[index]->value ) 
           {
             free(binds[index]->value);
           }
           if ( binds[index]->extvalue )
           {
             free ( binds[index]->value );
           }
         }
         delete binds[index];
       }
     }
     if( columnNames )
       delete [] columnNames;
     if( defines )
     {
       for( unsigned int i=0; i<numCols; i++ )
       {
         free(defines[i].buf);
         free(defines[i].len);
         free(defines[i].ind);
       }
       delete [] defines;       
     }
   } 
}eBaton;

class Connection: public ObjectWrap
{ 
public:
 
  void setConnection (dpi::Conn*, Oracledb* oracledb);
  // Define Connection Constructor
  static Persistent<FunctionTemplate> connectionTemplate_s;
  static void Init (Handle<Object> target);
 
private:
  static Handle<Value>  New (const Arguments& args);

  // Execute Method on Connection class
  static Handle<Value>  Execute (const Arguments& args);
  static void Async_Execute (uv_work_t *req);
  static void Async_AfterExecute (uv_work_t *req);
 
  // Release Method on Connection class
  static Handle<Value>  Release (const Arguments& args);
  static void Async_Release (uv_work_t *req);
  static void Async_AfterRelease (uv_work_t *req);
 
  // Commit Method on Connection class
  static Handle<Value>  Commit (const Arguments& args);
  static void Async_Commit (uv_work_t *req);
  static void Async_AfterCommit (uv_work_t *req);
 
  // Rollback Method on Connection class
  static Handle<Value>  Rollback (const Arguments& args);
  static void Async_Rollback (uv_work_t *req);
  static void Async_AfterRollback (uv_work_t *req);
 
  // BreakMethod on Connection class
  static Handle<Value>  Break (const Arguments& args);
  static void Async_Break (uv_work_t *req);
  static void Async_AfterBreak (uv_work_t *req);

  // Define Getter Accessors to properties
  static Handle<Value> GetStmtCacheSize (Local<String> property,
                                    const AccessorInfo& info);
  static Handle<Value> GetClientId (Local<String> property,
                                     const AccessorInfo& info);
  static Handle<Value> GetModule (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> GetAction (Local<String> property,
                                   const AccessorInfo& info);
     
  // Define Setter Accessors to properties
  static void SetStmtCacheSize (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetClientId (Local<String> property,Local<Value> value,
                            const AccessorInfo& info);
  static void SetModule (Local<String> property,Local<Value> value,
                          const AccessorInfo& info);
  static void SetAction (Local<String> property,Local<Value> value,
                          const AccessorInfo& info);

  static void connectionPropertyException(const AccessorInfo& info, 
                                          NJSErrorType errType,
                                          string property);
    
  Connection ();
  ~Connection ();
   
  
  static void PrepareAndBind (eBaton* executeBaton);
  static void GetDefines (eBaton* executeBaton);
  static void ProcessBinds (const Arguments& args, unsigned int index,
                            eBaton* executeBaton);
  static void ProcessOptions (const Arguments& args, unsigned int index,
                              eBaton* executeBaton);
  static void ProcessCallback (const Arguments& args, unsigned int index,
                               eBaton* executeBaton);
  static void GetExecuteBaton (const Arguments& args, eBaton* executeBaton);
  static void GetOptions (Handle<Object> options, eBaton* executeBaton);
  static void GetBinds (Handle<Object> bindobj, eBaton* executeBaton);
  static void GetBinds (Handle<Array> bindarray, eBaton* executeBaton);
  static void GetBindUnit (Handle<Value> bindtypes, Bind* bind,
                           eBaton* executeBaton);
  static void GetInBindParams (Handle<Value> bindtypes, Bind* bind,
                                     eBaton* executeBaton, BindType bindType);
  static void GetOutBindParams (unsigned short dataType, Bind* bind, 
                                eBaton* executeBaton);
  static Handle<Value> GetOutBinds (eBaton* executeBaton);
  static Handle<Value> GetOutBindArray ( std::vector<Bind*> binds, unsigned int outCount);
  static Handle<Value> GetOutBindObject (std::vector<Bind*> binds);  
  static Handle<Value> GetRows (eBaton* executeBaton);
  static Handle<Value> GetValue (short ind, unsigned short type, void* val,
                                 DPI_BUFLEN_TYPE len);
  static void UpdateDateValue ( eBaton *executeBaton );
  static void v8Date2OraDate ( v8::Handle<v8::Value>, Bind *bind);

  dpi::Conn* dpiconn_;
  bool isValid_;
  Oracledb* oracledb_;

};


#endif                       /** __NJSCONNECTION_H__ **/
