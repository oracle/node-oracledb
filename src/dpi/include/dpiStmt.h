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

using std::string;

namespace dpi
{


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
  DpiRowid = 69,                /* internal only */
  DpiFixedChar = 96,
  DpiBinaryFloat = 100,         /* internal only */
  DpiBinaryDouble = 101,        /* internal only */
  DpiUDT = 108,                 /* internal only */
  DpiRef = 111,                 /* internal only */
  DpiClob = 112,
  DpiBlob = 113,
  DpiBfile = 114,
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

/*
 * For 11g/12c Compatability BIND/DEFINE calls expect ub8 in 12c & ub4 in 11g
 * Using this type makes is compile-time selction of 11g or 12c.
 */
#if OCI_MAJOR_VERSION >= 12
  #define  DPI_SZ_TYPE         sb8
  #define  DPI_BUFLEN_TYPE     ub4
  #define  DPIBINDBYPOS    OCIBindByPos2
  #define  DPIBINDBYNAME   OCIBindByName2
  #define  DPIDEFINEBYPOS  OCIDefineByPos2
  #define  DPIATTRROWCOUNT OCI_ATTR_UB8_ROW_COUNT
#else
  #define  DPI_SZ_TYPE         sb4
  #define  DPI_BUFLEN_TYPE     ub2
  #define  DPIBINDBYPOS    OCIBindByPos
  #define  DPIBINDBYNAME   OCIBindByName
  #define  DPIDEFINEBYPOS  OCIDefineByPos
  #define  DPIATTRROWCOUNT OCI_ATTR_ROW_COUNT
#endif


typedef struct
{
  unsigned char  *colName;       // column name
  unsigned int    colNameLen;    // length of column name
  unsigned short  dbType;        // database server type
  unsigned short  dbSize;        // size at database
  unsigned int    precision;     // precision
  char            scale;         // scale
  unsigned char   isNullable;    // is the column nullable?
} MetaData;


// Application (Driver) level callback function prototype
typedef int (*cbtype) (void *ctx, DPI_SZ_TYPE nRows, unsigned long iter,
                       unsigned long index, dvoid **bufpp, void **alenp,
                       dvoid **indpp, unsigned short **rcodepp,
                       unsigned char *piecep );

class Stmt
{
public:
                                // termination
  virtual void release() = 0;

                                // properties
  virtual DpiStmtType stmtType() const = 0;

  virtual bool        isDML() const = 0 ;

  virtual bool        isReturning() = 0 ;

  virtual DPI_SZ_TYPE  rowsAffected() const = 0;

  virtual unsigned int numCols() = 0;

                                // methods
  virtual void bind(unsigned int pos, unsigned short type, void  *buf,
                    DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen,
                    void *data, cbtype cb = NULL ) = 0;

  virtual void bind(const unsigned char *name, int nameLen,
                    unsigned short type,  void *buf, DPI_SZ_TYPE  bufSize,
                    short *ind, DPI_BUFLEN_TYPE *bufLen,
                    void *data, cbtype cb = NULL ) = 0;

  virtual void execute ( int numIterations, bool autoCommit = false) = 0;

  virtual void define(unsigned int pos, unsigned short type, void *buf,
                      DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen) = 0;

  virtual void fetch(unsigned int numRows = 1) = 0;

  virtual const MetaData * getMetaData() = 0;

  virtual unsigned int rowsFetched() const = 0;

  virtual OCIError *getError () = 0;


  virtual ~Stmt(){};

protected:
                                // clients cannot do new and delete
  Stmt(){};

private:

};


} // end of namespace dpi


#endif                                              /* DPISTMT_ORACLE */
