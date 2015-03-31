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


/*---------------------------------------------------------------------------
                     PUBLIC TYPES
  ---------------------------------------------------------------------------*/

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
                     DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen ) ;
  virtual void bind (const unsigned char *name, int nameLen,
                     unsigned short type, void *buf, DPI_SZ_TYPE bufSize, short *ind,
                     DPI_BUFLEN_TYPE *bufLen);

  virtual void execute ( int numIterations, bool isAutoCommit );

  virtual void define (unsigned int pos, unsigned short type, void *buf,
                       DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen);
  virtual void fetch (unsigned int numRows = 1);

  virtual const MetaData *getMetaData ();

  virtual OCIError *     getError () { return errh_;  }

  // Is the SQL statement DML or not ?
  virtual inline bool isDML ()
  {
    return ( ( stmtType_ == DpiStmtInsert ) ||
             ( stmtType_ == DpiStmtUpdate ) ||
             ( stmtType_ == DpiStmtDelete ) );
  }


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
};


#endif                                       /* DPISTMTIMPL_ORACLE */
