/* Copyright (c) 2015, 2017, Oracle and/or its affiliates.
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

// Max number of bytes allowed for PLSQL STRING/BUFFER arguments
#define NJS_THRESHOLD_SIZE_PLSQL_STRING_ARG 32767

// Extended bind type
typedef enum
{
  NJS_EXTBIND_DEFAULT   = 0,        /* Default case no data yet to determine */
  NJS_EXTBIND_REFCURSOR = 1,                     /* REFCURSOR case, OUT Bind */
  NJS_EXTBIND_LOB       = 2, /* LOB Bind IN case -large data - temp lob case */
  NJS_EXTBIND_DMLRETCB  = 3, /* DML Returning case context used for callback */
} ExtBindType;



// Enumeration to identify which struct of union is used in ExtDefine.
typedef enum
{
  NJS_EXTDEFINE_UNDEFINED = 0,                            /* Not defined yet */
  NJS_EXTDEFINE_CONVERT_LOB = 1,     /* Used as part of lob As String/buffer */
} ExtDefineType;



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

  unsigned short       fetchType;
  DPI_SZ_TYPE          maxSize;
  void                 *buf;             // will have the values from DB
  void                 *extbuf;          // this field will be DPI calls
  DPI_BUFLEN_TYPE      *len;
  short                *ind;
  dpi::DateTimeArray   *dttmarr;   // DPI Date time array of descriptor

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
  ExtBindType extBindType;

  union
  {
    // Specific to REFCURSOR case
    struct
    {
      unsigned int numCols;            // number of columns
      MetaInfo     *mInfo;             // MetaInfo structure
    } extRefCursor;

    // Specific to LOB case
    struct
    {
      void *value;             // Stores extra bind reference
      bool isStringBuffer2LOB; // Specifies whether string or buffer Converted
                               // to LOB or not
      DPI_SZ_TYPE maxSize;     // Size for the OUT or IN OUT bind value

    } extLob;

    // Specific to DML Returning case, callback ctx
    struct
    {
      DpiBindCallbackCtx *ctx;
    } extDMLReturnCbCtx;

  } fields;

  ExtBind ( ExtBindType extbindType )
  {
    this->extBindType = extbindType;

    switch ( extbindType )
    {
    case NJS_EXTBIND_REFCURSOR:
      this -> fields.extRefCursor.numCols = 0;
      this -> fields.extRefCursor.mInfo = 0 ;
      break;

    case NJS_EXTBIND_LOB:
      this -> fields.extLob.value = NULL;
      this -> fields.extLob.isStringBuffer2LOB = false;
      break;

    case NJS_EXTBIND_DMLRETCB:
      this -> fields.extDMLReturnCbCtx.ctx = NULL;
      break;

    default:  // Should never hit here!
      break;
    }
  }
} ExtBind;


/**
 * Extension to Define struct - to store type specific data here and keep
 * Define as generic as possible
 */
typedef struct ExtDefine
{
  ExtDefineType extDefType; /* which type of ext-define data used */

  // containter for type specific data
  union
  {
    // Fields required for Fetch-Clob-As-String case or Fetch-Blob-As-Buffer
    struct
    {
      void *ctx;                    /* Context pointer used by the call back */
      DPI_BUFLEN_TYPE cLen;         /* cummulative length from each callback */
      unsigned int    *len2;        /* size of the buffer for each row */
    } extConvertLob ;
  } fields;

  ExtDefine ( ExtDefineType type )
  {
      extDefType = type;
      if ( type == NJS_EXTDEFINE_CONVERT_LOB )
      {
        fields.extConvertLob.ctx = NULL ;
        fields.extConvertLob.cLen = 0;
        fields.extConvertLob.len2 = NULL;
      }
  }
} ExtDefine;


/*
 * RESETEXTDEFINE4NEXTFETCH macro resets one field in ExtDefine struct
 * allowing the struct to be reused for subsequent fetch calls.  The indexing
 * starts with 0 for every fetch and the callback can be called multiple
 * times for the same row, based on data-size, a scenario,
 * where maxSize is set to 1, and using resultSet Interface (or queryStream),
 * the state of extDefine gets confused without this reset
 */
#define RESETEXTDEFINE4NEXTFETCH(extDefine)                             \
  {                                                                     \
    if ( extDefine )                                                    \
    {                                                                   \
      DpiDefineCallbackCtx *ctx = (DpiDefineCallbackCtx *)              \
                                  extDefine->fields.extConvertLob.ctx ; \
      ctx->prevIter = -1;                                               \
    }                                                                   \
  }                                                                     \




/**
 * FetchInfo structure
 **/
typedef struct fetchInfo
{
  std::string colName;                  /* DB Column name or expression name */
  DataType    njsType;                /* Fetch this column as specfieid type */

  // Constructor to initialize member variables.
  fetchInfo ()
    : colName (""), njsType ( NJS_DATATYPE_DEFAULT )
  {
  }

} FetchInfo;


/**
 * LobInfo struct
 **/
typedef struct LobInfo
{
  Descriptor    *lobLocator;
  unsigned char lobType;

  // Constructor to initialize member variables.
  LobInfo ( unsigned char type )
    : lobLocator ( NULL ), lobType ( type )
  {
  }
} LobInfo;

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
  std::vector<ExtDefine*>   extDefines;
  unsigned int              fetchAsStringTypesCount;
  DataType                  *fetchAsStringTypes;  // Global by type settings
  unsigned int              fetchAsBufferTypesCount;
  DataType                  *fetchAsBufferTypes;
  unsigned int              fetchInfoCount;       // Conversion requested count
  FetchInfo                 *fetchInfo;           // Conversion meta data
  Nan::Persistent<Function> cb;
  RefCounter                counter;
  Nan::Persistent<Object>   jsConn;
  bool                      extendedMetaData;
  MetaInfo                  *mInfo;
  LobInfo                   *lobInfo;
  std::vector<Nan::Persistent<Object>*>
                            persistentRefs; // Persistent Refs to JS Objects

  eBaton( unsigned int& count, Local<Function> callback,
           Local<Object> jsConnObj ) :
             sql(""), error(""), dpienv(NULL), dpiconn(NULL), njsconn(NULL),
             rowsAffected(0), maxRows(0), prefetchRows(0),
             getRS(false), autoCommit(false), rowsFetched(0), outFormat(0),
             numCols(0), dpistmt(NULL), st(DpiStmtUnknown),
             stmtIsReturning (false), numOutBinds(0), defines(NULL),
             fetchAsStringTypesCount (0), fetchAsStringTypes(NULL),
             fetchAsBufferTypesCount (0), fetchAsBufferTypes(NULL),
             fetchInfoCount(0), fetchInfo(NULL), counter ( count ),
             extendedMetaData(false), mInfo(NULL), lobInfo(NULL)
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
           switch ( extBinds[index]->extBindType )
           {
           case NJS_EXTBIND_REFCURSOR:
             if ( extBinds[index]->fields.extRefCursor.mInfo )
             {
               delete [] extBinds[index]->fields.extRefCursor.mInfo;
             }
             break;
           case NJS_EXTBIND_LOB:
             if ( extBinds[index]->fields.extLob.value )
             {
               free ( extBinds[index]->fields.extLob.value );
             }
             break;
           case NJS_EXTBIND_DMLRETCB:
             if ( extBinds[index]->fields.extDMLReturnCbCtx.ctx )
             {
               free ( extBinds[index]->fields.extDMLReturnCbCtx.ctx ) ;
             }
             break;

           case NJS_EXTBIND_DEFAULT:
           default:
             break;
           }
         }
         delete extBinds[index];
       }
       extBinds.clear ();
     }
     if( !persistentRefs.empty() )
     {
       for( unsigned int index = 0 ;index < persistentRefs.size();
            index++ )
       {
         persistentRefs[index]->Reset ();
         delete persistentRefs[index];
       }
       persistentRefs.clear ();
     }

     if ( lobInfo )
     {
       if ( lobInfo->lobLocator )
       {
         free ( lobInfo->lobLocator );
       }
       delete lobInfo;
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

         // If Clob data was fetched as String, deallocate each buffer
         if ( (defines[i].fetchType == dpi::DpiVarChar) &&
              mInfo[i].dbType == dpi::DpiClob )
         {
           for ( unsigned int j = 0 ; j < maxRows ; j ++ )
           {
             free ( ((char **)(defines[i].buf))[j] );
           }
         }

         // If Blob data was fetched as Buffer, deallocate each buffer
         if ( (defines[i].fetchType == dpi::DpiRaw) &&
              mInfo[i].dbType == dpi::DpiBlob )
         {
           for ( unsigned int j = 0 ; j < maxRows ; j ++ )
           {
             free ( ((char **)(defines[i].buf))[j] );
           }
         }

         /*
          * Buf and indicator will be allocated in all cases.
          * len will NOT be allocated for CLOB-as-STRING/BLOB-as-BUFFER
          * scenarios. For consistency check all fields before deallocating
          */
         if ( defines[i].buf )
         {
           free(defines[i].buf);
         }
         if ( defines[i].len )
         {
           free(defines[i].len);
         }
         if ( defines[i].ind )
         {
           free(defines[i].ind);
         }
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
     // Clear the extended-define structures if non-resultset case
     if ( extDefines.size() > 0  && !getRS )
     {
       for ( unsigned int i = 0 ; i < numCols ; i ++ )
       {
         // If not applicable the it will be NULL
         if ( extDefines[i] )
         {
           // Fetch-Clob-As_string case
           if ( extDefines[i]->extDefType == NJS_EXTDEFINE_CONVERT_LOB )
           {
             free ( extDefines[i]->fields.extConvertLob.ctx );
             extDefines[i]->fields.extConvertLob.ctx = NULL ;
             free ( extDefines[i]->fields.extConvertLob.len2 );
             extDefines[i]->fields.extConvertLob.len2 = NULL ;
             delete extDefines[i];
           }
         }
       }
     }
     if( mInfo && !getRS )
     {
        delete [] mInfo;
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

  // Reference counter for child temp Lob objects
  inline unsigned int* TempLOBCount ()   { return &tempLobCount_; }

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

  // CreateLob Method on Connection class
  static NAN_METHOD(CreateLob);
  static void Async_CreateLob(uv_work_t *req);
  static void Async_AfterCreateLob (uv_work_t *req);

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

  static void ConvertStringOrBuffer2LOB ( eBaton* executeBaton,
                                                unsigned int index );

  static void String2CLOB ( eBaton* executeBaton, unsigned int index );

  static void Buffer2BLOB ( eBaton* executeBaton, unsigned int index );

  static void StringOrBuffer2LOB ( eBaton* executeBaton, unsigned int index,
                                   unsigned char lobType );

  static void Descr2StringOrBuffer ( eBaton* executeBaton );

  static void CLOB2String ( eBaton* executeBaton, unsigned int index );

  static void BLOB2Buffer ( eBaton* executeBaton, unsigned int index );

  static void LOB2StringOrBuffer ( eBaton* executeBaton, unsigned int index,
                                   unsigned long long byteAmount,
                                   unsigned long long charAmount );

  static void PrepareLOBsForBind ( eBaton* executeBaton, unsigned int index );

  static unsigned short SourceDBType2TargetDBType ( unsigned srcType );
  static boolean MapByName ( eBaton *executeBaton,
                              std::string &name,
                             unsigned short &targetType);

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
  static v8::Local<v8::Value> ToV8ArrayValue (eBaton *executeBaton,
                                              Bind *bind, unsigned long count);
  // to convert DB value to v8::Value
  static v8::Local<v8::Value> ToV8Value (eBaton *executeBaton,
                                         bool isQuery,
                                         unsigned int index,
                                         unsigned int row = 0);

  static v8::Local<v8::Value> Define2V8Value ( eBaton    *executeBaton,
                                                   unsigned  int col,
                                                   unsigned  int row,
                                                   Define    *define,
                                                   ExtDefine *extDefine );

  static v8::Local<v8::Value> Bind2V8Value (
                                             eBaton       *executeBaton,
                                             Bind         *bind,
                                             unsigned int row ) ;

  // for refcursor
  static v8::Local<v8::Value> RefCursor2V8Value ( eBaton  *executeBaton,
                                                  Bind    *bind,
                                                  ExtBind *extBinds );
  // for lobs
  static v8::Local<v8::Value> Lob2V8Value (eBaton *executeBaton,
                                            Bind *bind);
  static void UpdateDateValue ( eBaton *executeBaton, Bind *bind, unsigned int nRows );
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
                               void **bufpp, void **alenpp, void **indpp,
                               unsigned short **rcode, unsigned char *piecep );

  // Callback used in CLOB-as-STRING/BLOB-as-BUFFER scenarios to dynamically
  // allocate memory for each row (in chunks) of this column.
  static int  cbDynDefine ( void *ctx, unsigned int iter,
                            void **bufpp, unsigned int **alenpp,
                            void **indpp, unsigned short **rcodepp );

  // Callback used in DML-Return SQL statements to
  // identify block of memeory for each row.
  static int  cbNullInBind ( void *ctx, DPI_SZ_TYPE nRows,
                               unsigned int bndpos,
                               unsigned long iter, unsigned long index,
                               void **bufpp, void **alenpp, void **indpp,
                               unsigned short **rcode, unsigned char *piecep );

  // NewLob Method on Connection class
   static v8::Local<v8::Value> NewLob( eBaton*   executeBaton,
                                      ProtoILob *protoILob,
                                      bool      isAutoCloseLob = true );

  /*
   * Inline function to identify v8 type from given v8::value
   */
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

  /*
   * large-value for PL/SQL procedure use tempLob if underling column type
   * is LOB, whether to use that feature for this bind or not
   */
  static inline bool IsValue2TempLob ( eBaton *executeBaton,
                                       unsigned int index )
  {
    bool ret = false;

    Bind *bind = executeBaton->binds[index];

    if ( !bind->isOut && !bind->isInOut )    // IN Bind case
    {
      // for non-NULL values with provided value len > threshold
      if ( ( * ( bind-> ind ) != -1 )  &&
           ( * ( bind-> len ) > NJS_THRESHOLD_SIZE_PLSQL_STRING_ARG ) )
      ret = true;
    }
    else if ( bind->isOut && !bind->isInOut )  // OUT Bind case
    {
      // Expected size is greater than threshold
      if ( bind -> maxSize > NJS_THRESHOLD_SIZE_PLSQL_STRING_ARG )
      {
        ret = true;
      }
    }
    else if ( bind->isInOut )
    {
      // For INOUT bind, either the given value len or expected size is
      // greater than threshold
      if ( max ( ( DPI_SZ_TYPE ) *( bind->len ), bind->maxSize ) >
           NJS_THRESHOLD_SIZE_PLSQL_STRING_ARG )
      {
        ret = true;
      }
    }

    return ret;
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
  unsigned int              tempLobCount_;// temp LOB counter
  Nan::Persistent<Object>   jsParent_;

};


#endif                       /** __NJSCONNECTION_H__ **/
