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
 * NAME
 *  dpiStmt.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPISTMT_ORACLE
# define DPISTMT_ORACLE

#ifndef OCI_ORACLE
# include <oci.h>
#endif

#if !defined(OCI_MAJOR_VERSION) || (OCI_MAJOR_VERSION < 11) || \
((OCI_MAJOR_VERSION == 11) && (OCI_MINOR_VERSION < 2))
#error Oracle 11.2 or later client libraries are required for building
#endif


#include <string>

namespace dpi
{

using std::string;



/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/


enum DpiStmtType
{
  DpiStmtUnknown = 0,
  DpiStmtSelect = 1,
  DpiStmtUpdate = 2,
  DpiStmtDelete = 3,
  DpiStmtInsert = 4,
  DpiStmtCreate = 5,
  DpiStmtDrop = 6,
  DpiStmtAlter = 7,
  DpiStmtBegin = 8,
  DpiStmtDeclare =9,
  DpiStmtCall = 10
};



typedef enum
{
  DpiVarChar = 1,
  DpiNumber = 2,
  DpiInteger = 3,               /* external only */
  DpiDouble = 4,                /* external only */
  DpiString = 5,                /* external only */
  DpiLong = 8,
  DpiDate = 12,
  DpiRaw = 23,
  DpiLongRaw = 24,
  DpiUnsignedInteger = 68,
  DpiRowid = 104,                /* internal only */
  DpiFixedChar = 96,
  DpiBinaryFloat = 100,         /* internal only */
  DpiBinaryDouble = 101,        /* internal only */
  DpiUDT = 108,                 /* internal only */
  DpiRef = 111,                 /* internal only */
  DpiClob = 112,
  DpiBlob = 113,
  DpiBfile = 114,
  DpiRSet = 116,
  DpiYearMonth = 182,           /* internal only */
  DpiDaySecond = 183,           /* internal only */
  DpiTimestamp = 187,           /* internal only */
  DpiTimestampTZ = 188,         /* internal only */
  DpiURowid = 208,              /* internal only */
  DpiTimestampLTZ = 232,        /* internal only */

  DpiTypeBase = 33 * 1024,
  DpiDateTimeArray,             /* external only */
  DpiIntervalArray              /* external only */
} DpiDataType;


/* OCI Stmt Handle state
 *  For REFCURSORS state should be DPI_STMT_STATE_EXECUTED
 */
#define DPI_STMT_STATE_UNDEFINED   (0)           // Undefined
#define DPI_STMT_STATE_INITIALIZED (1)           // Initialized
#define DPI_STMT_STATE_EXECUTED    (2)           // Executed
#define DPI_STMT_STATE_ENDOFFETCH  (3)           // End of Fetch



/*
 * For 11g/12c Compatability BIND/DEFINE calls expect ub8 in 12c & ub4 in 11g
 * Using this type makes is compile-time selction of 11g or 12c.
 */
#if OCI_MAJOR_VERSION >= 12
  #define  DPI_SZ_TYPE         sb8
  #define  DPI_USZ_TYPE        ub8
  #define  DPI_BUFLEN_TYPE     ub4
  #define  DPI_MAX_BUFLEN    (1024*1024*1024 - 2)  // max for binding: 1GB-2
  #define  DPIBINDBYPOS    OCIBindByPos2
  #define  DPIBINDBYNAME   OCIBindByName2
  #define  DPIDEFINEBYPOS  OCIDefineByPos2
  #define  DPIATTRROWCOUNT OCI_ATTR_UB8_ROW_COUNT
  #define  DPILOBREAD      OCILobRead2
  #define  DPILOBWRITE     OCILobWrite2
#else
  #define  DPI_SZ_TYPE         sb4
  #define  DPI_USZ_TYPE        ub4
  #define  DPI_BUFLEN_TYPE     ub2
  #define  DPI_MAX_BUFLEN      UB2MAXVAL
  #define  DPIBINDBYPOS    OCIBindByPos
  #define  DPIBINDBYNAME   OCIBindByName
  #define  DPIDEFINEBYPOS  OCIDefineByPos
  #define  DPIATTRROWCOUNT OCI_ATTR_ROW_COUNT
  #define  DPILOBREAD      OCILobRead
  #define  DPILOBWRITE     OCILobWrite
#endif


// Forward declaration
class Stmt;


// Application (Driver) level callback function prototype
typedef int (*bindcbtype) (void *ctx, DPI_SZ_TYPE nRows, unsigned int bndpos,
                       unsigned long iter,
                       unsigned long index, void **bufpp, void **alenp,
                       void **indpp, unsigned short **rcodepp,
                       unsigned char *piecep );

// Application (Driver) level callback funciton prototype
typedef int (*definecbtype) ( void *ctx, unsigned long iter,
                              void **bufpp, void **alenp, void **indpp,
                              unsigned short **rcodepp );



// Bind-Dynamic Context structure  - used for DML RETURNING case.
typedef struct
{
  bindcbtype    callbackfn;   /* Application specific callback */
  void*         data;         /* Data for application specific callback */
  unsigned long nrows;        /* number of rows affected by this DML */
  unsigned long iter;         /* iteration - used in Array Bind */
  unsigned int  bndpos;       /* position in the bind array */
  short         nullInd;      /* DML RETURNING: to pass null from inbind cbk */
  Stmt         *dpistmt;      /* DPI Statement Implementation */
} DpiBindCallbackCtx;


// Define-Dynamic Context structure - used for CLOB-as-STRING case
typedef struct
{
  definecbtype  callbackfn;                /* Application specific callback */
  void          *data;                       /* Define data for this column */
  void          *extData;    /* Extended data for this colum if any or NULL */
  unsigned long prevIter;     /* earlier iter, used to detect iter changing */
} DpiDefineCallbackCtx;


typedef struct MetaData
{
  unsigned char  *colName;       // column name
  unsigned int    colNameLen;    // length of column name
  unsigned short  dbType;        // database server type
  unsigned short  dbSize;        // size at database
  short           precision;     // precision
  signed   char   scale;         // scale, range starts from -127
  unsigned char   isNullable;    // is the column nullable?

  MetaData ()
    : colName ( NULL ), colNameLen ( 0 ), dbType ( 0 ), dbSize ( 0 ),
      precision ( 0 ), scale ( 0 ), isNullable ( 0 )
    {}
} MetaData;



class Stmt
{
public:
                                // termination
  virtual void release() = 0;

                                // properties
  virtual DpiStmtType stmtType() const = 0;

  // If NJS layer doesn't set any value, default prefetch is done by OCI.
  virtual void prefetchRows ( unsigned int prefetchRows ) = 0;

  virtual bool        isReturning() = 0 ;

  virtual DPI_USZ_TYPE rowsAffected () const = 0;

  virtual unsigned int numCols() = 0;

                                // methods
  virtual void bind(unsigned int pos, unsigned short type, void  *buf,
                    DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen,
                    unsigned int maxarr_len, unsigned int *curelen,
                    DpiBindCallbackCtx *ctx = NULL) = 0;

  virtual void bind(const unsigned char *name, int nameLen,
                    unsigned int bndpos,
                    unsigned short type,  void *buf, DPI_SZ_TYPE  bufSize,
                    short *ind, DPI_BUFLEN_TYPE *bufLen,
                    unsigned int maxarr_len, unsigned int *curelen,
                    DpiBindCallbackCtx *ctx = NULL ) = 0;

  virtual void execute ( int numIterations, bool autoCommit = false) = 0;

  virtual void define(unsigned int pos, unsigned short type, void *buf,
                      DPI_SZ_TYPE bufSize, short *ind,
                      DPI_BUFLEN_TYPE *bufLen,
                      DpiDefineCallbackCtx *ctx = NULL ) = 0;

  virtual void fetch(unsigned int numRows = 1) = 0;


/*
 * The returned pointer to MetaData struct should not be freed by the caller
 * since this will be freed as part of StmtImpl::release()
 */
  virtual const MetaData * getMetaData( bool extendedMetaData ) = 0;

  virtual unsigned int rowsFetched() const = 0;

  virtual OCIError *getError () = 0;

  virtual unsigned int getState () = 0;

  virtual ~Stmt(){};

protected:
                                // clients cannot do new and delete
  Stmt(){};

private:

};


} // end of namespace dpi


#endif                                              /* DPISTMT_ORACLE */
