/* Copyright (c) 2015, 2016, Oracle and/or its affiliates.
   All rights reserved. */

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

class Connection;
class ProtoILob;


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
  bool                isInOut;          // Date/Timestamp needs this info
  bool                isArray;
  unsigned int        maxArraySize;
  unsigned int        curArraySize;
  unsigned int        rowsReturned;     /* number rows returned for
                                           the bind (DML RETURNING) */
  dpi::DateTimeArray* dttmarr;

  Bind () : key(""), value(NULL), extvalue (NULL), len(NULL), len2(NULL),
            maxSize(0), type(0), ind(NULL), isOut(false), isInOut(false),
            isArray(false), maxArraySize(0), curArraySize(0),
            rowsReturned(0), dttmarr ( NULL )
  {}
}Bind;

/**
* Structure used for Query result
**/
typedef struct Define
{

  unsigned short     fetchType;
  DPI_SZ_TYPE        maxSize;
  void               *buf;             // will have the values from DB
  void               *extbuf;          // this field will be DPI calls
  DPI_BUFLEN_TYPE    *len;
  short              *ind;
  dpi::DateTimeArray *dttmarr;   // DPI Date time array of descriptor

  Define () :fetchType(0), maxSize(0), buf(NULL), extbuf(NULL),
             len(0), ind(0), dttmarr(NULL)
  {}
} Define;

/**
 * MetaInfo structure, this is parallel structure to Metadata
 *
 * NOTE:
 *
 * dbTYpe       - database table column data type (SQLT_xxx constants).
 * dpiFetchType - data type used with OCI calls after FetchAs/FetInfo rules
 *                applied used between DB layer and Driver
 * njsFetchType - data type reported to the application for this column -
 *                driver types (Oracledb.constants).
 **/
typedef struct MetaInfo
{
  std::string       name;                   // DB column name
  unsigned short    dbType;                 // DB column type
  unsigned short    dpiFetchType;           // Target fetchType for DPI
  short             njsFetchType;           // Target fetchType for NJS
  unsigned short    byteSize;               // Size In bytes at database
  short             precision;              // Precision
  signed   char     scale;                  // Scale, range starts from -127
  unsigned char     isNullable;             // Nullable

  MetaInfo ()
    : name(""), dbType(0), dpiFetchType(0), njsFetchType(NJS_DATATYPE_UNKNOWN),
      byteSize(0), precision(0), scale(0), isNullable(false)
  {}

} MetaInfo;

/**
 * This is a parallel structure to Bind and stores extended bind fields
 * in specific cases like refCursor
 **/
typedef struct ExtBind
{
  unsigned int numCols;          // number of columns
  MetaInfo     *mInfo;           // MetaInfo structure

  ExtBind ()
    : numCols ( 0 ), mInfo ( NULL )
    {}
}ExtBind;


/**
 * FetchInfo structure
 **/
typedef struct fetchInfo
{
  std::string name;                     /* DB Column name or expression name */
  DataType    type;                   /* Fetch this column as specfieid type */

  // Constructor to initialize member variables.
  fetchInfo ()
    : name (""), type ( NJS_DATATYPE_DEFAULT )
  {
  }

} FetchInfo;


/**
* Baton for Asynchronous Connection methods
**/
typedef struct eBaton
{
  uv_work_t                 req;
  std::string               sql;
  std::string               error;
  dpi::Env*                 dpienv;
  dpi::Conn*                dpiconn;
  Connection                *njsconn;
  DPI_USZ_TYPE              rowsAffected;
  unsigned int              maxRows;
  unsigned int              prefetchRows;
  bool                      getRS;
  bool                      autoCommit;
  unsigned int              rowsFetched;
  unsigned int              outFormat;
  unsigned int              numCols;
  dpi::Stmt                 *dpistmt;
  dpi::DpiStmtType          st;
  bool                      stmtIsReturning;
  std::vector<Bind*>        binds;
  std::vector<ExtBind*>     extBinds;
  unsigned int              numOutBinds;    // # of out binds used for DML return
  Define                    *defines;
  unsigned int              fetchAsStringTypesCount;
  DataType                  *fetchAsStringTypes;  // Global by type settings
  unsigned int              fetchInfoCount;       // Conversion requested count
  FetchInfo                 *fetchInfo;           // Conversion meta data
  Nan::Persistent<Function> cb;
  RefCounter                counter;
  Nan::Persistent<Object>   jsConn;
  bool                      extendedMetaData;
  MetaInfo                  *mInfo;

  eBaton( unsigned int& count, Local<Function> callback,
           Local<Object> jsConnObj ) :
             sql(""), error(""), dpienv(NULL), dpiconn(NULL), njsconn(NULL),
             rowsAffected(0), maxRows(0), prefetchRows(0),
             getRS(false), autoCommit(false), rowsFetched(0), outFormat(0),
             numCols(0), dpistmt(NULL), st(DpiStmtUnknown),
             stmtIsReturning (false), numOutBinds(0), defines(NULL),
             fetchAsStringTypesCount (0), fetchAsStringTypes(NULL),
             fetchInfoCount(0), fetchInfo(NULL), counter ( count ),
             extendedMetaData(false), mInfo(NULL)
  {
    cb.Reset( callback );
    jsConn.Reset ( jsConnObj );
  }

  ~eBaton ()
   {
     cb.Reset ();
     jsConn.Reset ();
     if( !binds.empty() )
     {
       for( unsigned int index = 0 ;index < binds.size(); index++ )
       {
         // do not free refcursor type.
         if( binds[index]->value && binds[index]->type != DpiRSet )
         {
           free(binds[index]->value);
         }
         if ( binds[index]->extvalue )
         {
           free ( binds[index]->extvalue );
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
         delete binds[index];
       }
     }
     if( !extBinds.empty() )
     {
       for( unsigned int index = 0 ;index < extBinds.size(); index++ )
       {
         if ( extBinds[index] )
         {
           if ( extBinds[index]->mInfo )
           {
             delete [] extBinds[index]->mInfo;
           }
           delete extBinds[index];
         }
       }
       extBinds.clear ();
     }
     if( mInfo && !getRS )
     {
        delete [] mInfo;
     }
     if( defines && !getRS ) // To reuse fetch Buffers of ResultSet
     {
       for( unsigned int i=0; i<numCols; i++ )
       {
         if ((defines[i].fetchType == DpiClob) ||
             (defines[i].fetchType == DpiBlob) ||
             (defines[i].fetchType == DpiBfile))
         {
           for (unsigned int j = 0; j < maxRows; j++)
           {
                 // free all those unused descriptors that were never fetched.

             if (((Descriptor **)(defines[i].buf))[j])
               Env::freeDescriptor(((Descriptor **)(defines[i].buf))[j],
                                   LobDescriptorType);
           }
         }

         free(defines[i].buf);
         free(defines[i].len);
         free(defines[i].ind);
       }
       delete [] defines;
     }
     if ( fetchInfo && !getRS )
     {
       delete [] fetchInfo;
     }

     if ( fetchAsStringTypes && !getRS )
     {
       free (fetchAsStringTypes);
     }
   }
}eBaton;

class Connection: public Nan::ObjectWrap
{
public:
  void setConnection ( dpi::Conn*, Oracledb* oracledb, Local<Object> obj );
  static Nan::Persistent<FunctionTemplate> connectionTemplate_s;
  static void Init (Handle<Object> target);
  static Local<Value> GetRows (eBaton* executeBaton);
  static Local<Value> GetMetaData ( const MetaInfo*    mInfo,
                                    const unsigned int numCols,
                                    const bool         extendedMetaData );
  static void DoDefines ( eBaton* executeBaton );
  static void DoFetch (eBaton* executeBaton);
  static void CopyMetaData ( MetaInfo*            mInfo,
                             eBaton*              executeBaton,
                             const                MetaData* meta,
                             const unsigned int   numCols );
  bool isValid() { return isValid_; }
  dpi::Conn* getDpiConn() { return dpiconn_; }

  /*
   * Counters to see whether connection is busy or not with LOB, ResultSet or
   * DB operations. This counters incremented and decremented for each
   * operation and used to prevent releasing busy connection.
   */
  inline unsigned int& LOBCount ()   { return lobCount_; }
  inline unsigned int& RSCount  ()   { return rsCount_;  }
  inline unsigned int& DBCount  ()   { return dbCount_;  }

  Oracledb* oracledb_;

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
  static NAN_GETTER(GetStmtCacheSize);
  static NAN_GETTER(GetClientId);
  static NAN_GETTER(GetModule);
  static NAN_GETTER(GetAction);
  static NAN_GETTER(GetOracleServerVersion);

  // Define Setter Accessors to properties
  static NAN_SETTER(SetStmtCacheSize);
  static NAN_SETTER(SetClientId);
  static NAN_SETTER(SetModule);
  static NAN_SETTER(SetAction);
  static NAN_SETTER(SetOracleServerVersion);

  static void connectionPropertyException(Connection* njsConn,
                                          NJSErrorType errType,
                                          string property);

  // Define Connection Constructor
  Connection ();
  ~Connection ();


  static void PrepareAndBind (eBaton* executeBaton);

  static unsigned short SourceDBType2TargetDBType ( unsigned srcType );
  static boolean MapByName ( eBaton *executeBaton,
                              std::string &name,
                              unsigned short &targetType );


  static boolean MapByType ( eBaton *executeBaton, unsigned short &targetType);

  static unsigned short GetTargetType ( eBaton *executeBaton,
                                         std::string &name,
                                        unsigned short defaultType);

  static void ProcessBinds (Nan::NAN_METHOD_ARGS_TYPE args, unsigned int index,
                            eBaton* executeBaton);
  static void ProcessOptions (Nan::NAN_METHOD_ARGS_TYPE args, unsigned int index,
                              eBaton* executeBaton);
  static void ProcessCallback (Nan::NAN_METHOD_ARGS_TYPE args, unsigned int index,
                               eBaton* executeBaton);
  static void GetExecuteBaton (Nan::NAN_METHOD_ARGS_TYPE args, eBaton* executeBaton);
  static void GetOptions (Handle<Object> options, eBaton* executeBaton);
  static void GetBinds (Handle<Object> bindobj, eBaton* executeBaton);
  static void GetBinds (Handle<Array> bindarray, eBaton* executeBaton);
  static void GetBindUnit (Local<Value> bindtypes, Bind* bind, bool array,
                           eBaton* executeBaton);
  static void GetInBindParams(Local<Value> v8val, Bind *bind, eBaton *executeBaton);
  static void GetInBindParamsScalar(Local<Value> v8val, Bind *bind, eBaton *executeBaton);
  static void GetInBindParamsArray(Local<Array> v8vals, Bind *bind, eBaton *executeBaton);
  static bool AllocateBindArray(unsigned short dataType, Bind* bind, eBaton *executeBaton, size_t *arrayElementSize);

  static void GetOutBindParams (unsigned short dataType, Bind* bind,
                                eBaton* executeBaton);
  static NJSErrorType Descr2Double ( Define* defines, unsigned int numCols,
                                     unsigned int rowsFetched, bool getRS );
  static void Descr2protoILob ( eBaton *executeBaton, unsigned int numCols,
                                unsigned int rowsFetched );
  static v8::Local<v8::Value> GetOutBinds (eBaton* executeBaton);
  static v8::Local<v8::Value> GetOutBindArray (eBaton* executeBaton);
  static v8::Local<v8::Value> GetOutBindObject (eBaton* executeBaton);
  static v8::Local<v8::Value> GetArrayValue (eBaton *executeBaton,
                                              Bind *bind, unsigned long count);
  // to convert DB value to v8::Value
  static v8::Local<v8::Value> GetValue (eBaton *executeBaton,
                                         bool isQuery,
                                         unsigned int index,
                                         unsigned int row = 0);
  // for primitive types (Number, String and Date)
  static v8::Local<v8::Value> GetValueCommon (eBaton *executeBaton,
                                         short ind,
                                         unsigned short type,
                                         void* val, DPI_BUFLEN_TYPE len);
  // for refcursor
  static v8::Local<v8::Value> GetValueRefCursor ( eBaton  *executeBaton,
                                                  Bind    *bind,
                                                  ExtBind *extBinds );
  // for lobs
  static v8::Local<v8::Value> GetValueLob (eBaton *executeBaton,
                                            Bind *bind);
  static void UpdateDateValue ( eBaton *executeBaton, unsigned int index );
  static void v8Date2OraDate(v8::Local<v8::Value> val, Bind *bind);
  static ConnectionBusyStatus getConnectionBusyStatus ( Connection *conn );

  // Callback/Utility function used to allocate buffer(s) for Bind Structs
  static void cbDynBufferAllocate ( void *ctx, bool dmlReturning,
                                    unsigned int nRows,
                                    unsigned int bndpos );

  // Callback used in DML-Return SQL statements to
  // identify block of memeory for each row.
  static int  cbDynBufferGet ( void *ctx, DPI_SZ_TYPE nRows,
                               unsigned int bndpos,
                               unsigned long iter, unsigned long index,
                               dvoid **bufpp, void **alenpp, void **indpp,
                               unsigned short **rcode, unsigned char *piecep );

  // Callback used in DML-Return SQL statements to
  // identify block of memeory for each row.
  static int  cbNullInBind ( void *ctx, DPI_SZ_TYPE nRows,
                               unsigned int bndpos,
                               unsigned long iter, unsigned long index,
                               dvoid **bufpp, void **alenpp, void **indpp,
                               unsigned short **rcode, unsigned char *piecep );

  // NewLob Method on Connection class
  static v8::Local<v8::Value> NewLob(eBaton* executeBaton,
                                      ProtoILob *protoILob);

  static inline ValueType GetValueType ( v8::Local<v8::Value> v )
  {
    ValueType type = NJS_VALUETYPE_INVALID;

    if ( v->IsUndefined () || v->IsNull () )
    {
      type = NJS_VALUETYPE_NULL;
    }
    else if ( v->IsString () )
    {
      type = NJS_VALUETYPE_STRING;
    }
    else if ( v->IsInt32 () )
    {
      type = NJS_VALUETYPE_INTEGER;
    }
    else if ( v->IsUint32 () )
    {
      type = NJS_VALUETYPE_UINTEGER;
    }
    else if ( v->IsNumber () )
    {
      type = NJS_VALUETYPE_NUMBER;
    }
    else if ( v->IsDate () )
    {
      type = NJS_VALUETYPE_DATE;
    }
    else if ( v->IsObject () )
    {
      type = NJS_VALUETYPE_OBJECT;
    }

    return type;
  }


  dpi::Conn*     dpiconn_;
  bool           isValid_;
  unsigned int   oracleServerVersion_;
  /*
   * Counters to see whether connection is busy or not with LOB, ResultSet or
   * DB operations. This counters used to prevent releasing busy connection.
   */
  unsigned int              lobCount_;    // LOB operations counter
  unsigned int              rsCount_;     // ResultSet operations counter
  unsigned int              dbCount_;     // Connection or DB operations counter
  Nan::Persistent<Object>   jsParent_;

};


#endif                       /** __NJSCONNECTION_H__ **/
