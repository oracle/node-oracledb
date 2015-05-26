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
 * This file uses NAN:
 *
 * Copyright (c) 2015 NAN contributors
 * 
 * NAN contributors listed at https://github.com/rvagg/nan#contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
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
  std::string         key;
  void*               value;
  void*               extvalue;
  DPI_BUFLEN_TYPE     *len;            // actual length IN/OUT  for bind APIs
  unsigned int        *len2;           // used for DML returning
  DPI_SZ_TYPE         maxSize;
  unsigned short      type;
  short               *ind;
  bool                isOut;
  dpi::DateTimeArray* dttmarr;

  Bind () : key(""), value(NULL), extvalue (NULL), len(NULL), len2(NULL),
            maxSize(0), type(0), ind(NULL), isOut(false), dttmarr ( NULL )
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
  bool          autoCommit;
  unsigned int  rowsFetched;
  unsigned int  outFormat;
  unsigned int  numCols;
  dpi::Stmt     *dpistmt;
  dpi::DpiStmtType     st;
  bool                 stmtIsReturning;
  std::vector<Bind*>   binds;
  unsigned int         numOutBinds;    // # of out binds used for DML return
  std::string          *columnNames;
  Define               *defines;
  Persistent<Function> cb;

  eBaton() : sql(""), error(""), dpienv(NULL), dpiconn(NULL),
             rowsAffected(0), maxRows(0), autoCommit(false),
             rowsFetched(0), outFormat(0), numCols(0), dpistmt(NULL),
             st(DpiStmtUnknown), stmtIsReturning (false), numOutBinds(0),
             columnNames(NULL), defines(NULL)
  {}

  ~eBaton ()
   {
     NanDisposePersistent(cb);
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
           if ( binds[index]->ind )
           {
             free ( binds[index]->ind );
           }
           if ( binds[index]->len )
           {
             free ( binds[index]->len );
           }
           if ( binds[index]->len2 )
           {
             free ( binds[index]->len2 ) ;
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
  static NAN_METHOD(New);
  // Execute Method on Connection class
  static NAN_METHOD(Execute);
  static void Async_Execute (uv_work_t *req);
  static void Async_AfterExecute (uv_work_t *req);

  // Release Method on Connection class
  static NAN_METHOD(Release);
  static void Async_Release(uv_work_t *req);
  static void Async_AfterRelease (uv_work_t *req);

  // Commit Method on Connection class
  static NAN_METHOD(Commit);
  static void Async_Commit (uv_work_t *req);
  static void Async_AfterCommit (uv_work_t *req);

  // Rollback Method on Connection class
  static NAN_METHOD(Rollback);
  static void Async_Rollback (uv_work_t *req);
  static void Async_AfterRollback (uv_work_t *req);

  // BreakMethod on Connection class
  static NAN_METHOD(Break);
  static void Async_Break(uv_work_t *req);
  static void Async_AfterBreak (uv_work_t *req);

  // Define Getter Accessors to properties
  static NAN_PROPERTY_GETTER(GetStmtCacheSize);
  static NAN_PROPERTY_GETTER(GetClientId);
  static NAN_PROPERTY_GETTER(GetModule);
  static NAN_PROPERTY_GETTER(GetAction);

  // Define Setter Accessors to properties
  static NAN_SETTER(SetStmtCacheSize);
  static NAN_SETTER(SetClientId);
  static NAN_SETTER(SetModule);
  static NAN_SETTER(SetAction);

  static void connectionPropertyException(Connection* njsConn, 
                                          NJSErrorType errType,
                                          string property);

  Connection ();
  ~Connection ();


  static void PrepareAndBind (eBaton* executeBaton);
  static void GetDefines (eBaton* executeBaton);
  static void ProcessBinds (_NAN_METHOD_ARGS, unsigned int index,
                            eBaton* executeBaton);
  static void ProcessOptions (_NAN_METHOD_ARGS, unsigned int index,
                              eBaton* executeBaton);
  static void ProcessCallback (_NAN_METHOD_ARGS, unsigned int index,
                               eBaton* executeBaton);
  static void GetExecuteBaton (_NAN_METHOD_ARGS, eBaton* executeBaton);
  static void GetOptions (Handle<Object> options, eBaton* executeBaton);
  static void GetBinds (Handle<Object> bindobj, eBaton* executeBaton);
  static void GetBinds (Handle<Array> bindarray, eBaton* executeBaton);
  static void GetBindUnit (Handle<Value> bindtypes, Bind* bind,
                           eBaton* executeBaton);
  static void GetInBindParams (Handle<Value> bindtypes, Bind* bind,
                                     eBaton* executeBaton, BindType bindType);
  static void GetOutBindParams (unsigned short dataType, Bind* bind,
                                eBaton* executeBaton);
  static v8::Handle<v8::Value> GetOutBinds (eBaton* executeBaton);
  static v8::Handle<v8::Value> GetOutBindArray ( std::vector<Bind*> &binds,
                                                 unsigned int outCount,
                                                 bool bDMLReturn = false,
                                                 unsigned long rowcount = 1);
  static v8::Handle<v8::Value> GetOutBindObject (std::vector<Bind*> &binds,
                                                 bool bDMLReturn = false,
                                                 unsigned long rowcount = 1);
  static v8::Handle<v8::Value> GetRows (eBaton* executeBaton);
  static v8::Handle<v8::Value> GetMetaData (std::string* columnNames,
                                            unsigned int numCols);
  static v8::Handle<v8::Value> GetArrayValue (Bind *bind, unsigned long count);
  static v8::Handle<v8::Value> GetValue (short ind, unsigned short type, void* val,
                                         DPI_BUFLEN_TYPE len,
                                         DPI_SZ_TYPE maxSize = -1);
  static void UpdateDateValue ( eBaton *executeBaton );
  static void v8Date2OraDate ( v8::Handle<v8::Value>, Bind *bind);

  // Callback/Utility function used to allocate buffer(s) for Bind Structs
  static void cbDynBufferAllocate ( void *ctx, bool dmlReturning,
                                    unsigned int nRows );

  // Callback used in DML-Return SQL statements to
  // identify block of memeory for each row.
  static int  cbDynBufferGet ( void *ctx, DPI_SZ_TYPE nRows,

                               unsigned long iter, unsigned long index,
                               dvoid **bufpp, void **alenpp, void **indpp,
                               unsigned short **rcode, unsigned char *piecep );

  dpi::Conn* dpiconn_;
  bool isValid_;
  Oracledb* oracledb_;

};


#endif                       /** __NJSCONNECTION_H__ **/
