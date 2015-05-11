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
 *  dpiStmtImpl.h
 *
 * DESCRIPTION
 *
 *****************************************************************************/

#ifndef DPISTMTIMPL_ORACLE
# define DPISTMTIMPL_ORACLE

#ifndef DPISTMT_ORACLE
# include <dpiStmt.h>
#endif

#ifndef OCI_ORACLE
# include <oci.h>
#endif


using namespace dpi;


class EnvImpl;
class ConnImpl;
class StmtImpl;

/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/
typedef struct
{
  cbtype        callbackfn;   /* Application specific callback */
  void*         data;         /* Data for application specific callback */
  unsigned long nrows;        /* number of rows affected by this DML */
  unsigned long iter;         /* iteration - used in Array Bind */
  StmtImpl*     dpistmt;      /* DPI Statement Implementation */
} DpiCallbackCtx;


class StmtImpl : public Stmt
{
public:
  // Constructor & Destructor
  StmtImpl (EnvImpl *env, OCIEnv *envh, ConnImpl *conn, OCISvcCtx *svch,
            const string &sql);
  virtual ~StmtImpl ();

  // Attributes
  virtual DpiStmtType stmtType () const;
  virtual DPI_SZ_TYPE  rowsAffected () const;
  virtual unsigned int numCols() ;
  virtual unsigned int rowsFetched () const ;

  // Methods
  virtual void release ();

  virtual void bind (unsigned int pos, unsigned short type, void *buf,
                     DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen,
                     void *data, cbtype cb );

  virtual void bind (const unsigned char *name, int nameLen,
                     unsigned short type, void *buf, DPI_SZ_TYPE bufSize,
                     short *ind, DPI_BUFLEN_TYPE *bufLen,
                     void *data, cbtype cb);

  virtual void execute ( int numIterations, bool autoCommit );

  virtual void define (unsigned int pos, unsigned short type, void *buf,
                       DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen);
  virtual void fetch (unsigned int numRows = 1);

  virtual const MetaData *getMetaData ();

  virtual OCIError *     getError () { return errh_;  }

  // Is the SQL statement DML or not ?
  virtual inline bool isDML () const
  {
    return ( ( stmtType_ == DpiStmtInsert ) ||
             ( stmtType_ == DpiStmtUpdate ) ||
             ( stmtType_ == DpiStmtDelete ) );
  }

  virtual bool isReturning ();


  // OCI specific Callback to be used for dynamic binding (dummy for IN)
  static sb4 inbindCallback ( dvoid *ctxp, OCIBind *bindp, ub4 iter, ub4 index,
                              dvoid **bufpp, ub4 *alenpp, ub1 *piecep,
                              dvoid **indpp );

  // OCI specific callback to be used for dynamic binding
  static sb4 outbindCallback (dvoid *ctxp, OCIBind *bindp, ub4 iter, ub4 index,
                              dvoid **bufpp, ub4 **alenp, ub1 *piecep,
                              dvoid **indpp, ub2 **rcodepp );


private:
  void cleanup ();


private:
  // DPI objects
  ConnImpl       *conn_;            // parent Connection object

  // OCI Objects
  OCIError       *errh_;           // OCI Error object for this stmt execution
  OCISvcCtx      *svch_;           // OCI service handle
  OCIStmt        *stmth_;          // OCI Stmt handle

  unsigned int   numCols_;         // # of cols this stmt execution will return
  MetaData       *meta_;           // Meta data array
  DpiStmtType    stmtType_;        // Statement Type (Query, DML, ... )
  bool           isReturning_;     // Does the stmt has RETURNING INTO clause?
  bool           isReturningSet_;  // Has isReturning_ flag queried & set.
};


#endif                                       /* DPISTMTIMPL_ORACLE */
