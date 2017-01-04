/* Copyright (c) 2015, 2016 Oracle and/or its affiliates.
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

class StmtImpl : public Stmt
{
public:
  // Constructor & Destructor
  StmtImpl (OCIEnv *envh, ConnImpl *conn, OCISvcCtx *svch,
            const string &sql);
  virtual ~StmtImpl ();

  // Attributes
  virtual DpiStmtType stmtType () const;
  virtual DPI_USZ_TYPE  rowsAffected () const;
  virtual unsigned int numCols() ;
  virtual void prefetchRows( unsigned int prefetchRows ) ;
  virtual unsigned int rowsFetched () const ;

  // Methods
  virtual void release ();

  virtual void bind (unsigned int pos, unsigned short type, void *buf,
                     DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen,
                     unsigned int maxarr_len, unsigned int *curelen,
                     DpiBindCallbackCtx *ctx);

  virtual void bind (const unsigned char *name, int nameLen,
                     unsigned int bndpos,
                     unsigned short type, void *buf, DPI_SZ_TYPE bufSize,
                     short *ind, DPI_BUFLEN_TYPE *bufLen,
                     unsigned int maxarr_len, unsigned int *curelen,
                     DpiBindCallbackCtx *ctx);

  virtual void execute ( int numIterations, bool autoCommit );

  virtual void define (unsigned int pos, unsigned short type, void *buf,
                       DPI_SZ_TYPE bufSize, short *ind,
                       DPI_BUFLEN_TYPE *bufLen,
                       DpiDefineCallbackCtx *ctx );
  virtual void fetch (unsigned int numRows = 1);


/*
 * The returned pointer to MetaData struct should not be freed by the caller
 * since this will be freed as part of StmtImpl::release()
 */
  virtual const MetaData *getMetaData ( bool extendedMetaData );

  virtual OCIError *     getError () { return errh_;  }

  virtual unsigned int  getState ();

  virtual bool isReturning ();


  // OCI specific Callback to be used for dynamic binding (dummy for IN)
  static sb4 inbindCallback ( void *ctxp, OCIBind *bindp, ub4 iter, ub4 index,
                              void **bufpp, ub4 *alenpp, ub1 *piecep,
                              void **indpp );

  // OCI specific callback to be used for dynamic binding
  static sb4 outbindCallback (void *ctxp, OCIBind *bindp, ub4 iter, ub4 index,
                              void **bufpp, ub4 **alenp, ub1 *piecep,
                              void **indpp, ub2 **rcodepp );

  static sb4 defineCallback ( void *ctxp, OCIDefine *definep, ub4 iter,
                              void **bufpp, ub4 **alenpp, ub1 *piecep,
                              void **indpp, ub2 **rcodepp );

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
  unsigned short stmtType_;        // Statement Type (Query, DML, ... )
  bool           isReturning_;     // Does the stmt has RETURNING INTO clause?
  bool           isReturningSet_;  // Has isReturning_ flag queried & set.
  bool           refCursor_;       // refCursor or not.
  ub4            state_;           // OCI Stmt State
};


#endif                                       /* DPISTMTIMPL_ORACLE */
