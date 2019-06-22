//-----------------------------------------------------------------------------
//  testObjAttr.js
//    Test Cases for -Datavase0Object Attribute cases
//-----------------------------------------------------------------------------

//
// Assumptions:
//
//  1. The following type is type is created using sqlplus.
//
//  CREATE TYPE PERSON_TYP AS OBJECT (
//    IDNO  NUMBER,
//    FIRST_NAME VARCHAR2(30),
//    LAST_NAME  VARCHAR2(30),
//    EMAIL      VARCHAR2(100),
//    PHONE      VARCHAR2(30)
//  )
//  /
//
//  2, A table with this type is created as follows using sqlplus.
//
//  CREATE TABLE CONTACTS (
//    CONTACT PERSON_TYP,
//    CONTACT_DATE  DATE
//  );
//
//
//  3. The following type is create using SQLPLUS for Timestamp testing
//
//  CREATE OR REPLACE TYPE EMP_TYP AS OBJECT (
//    ENTRY TIMESTAMP,
//    EXIT  TIMESTAMP
//  );
//
//  4. A table with this type is created as follows using sqlplus
//
//  CREATE TABLE EE_TBL (
//    EETIMES  EE_TYP
//  );
//
//


const oracledb = require ('oracledb');
const async = require ('async');


/* async functions */

// To obtain DB connection based on configuration
var doconnect = function (cb) 
{
  var dbconfig =  {
    user          : process.env.NODE_ORACLEDB_USER || "hr",
    password      : process.env.NODE_ORACLEDB_PASSWORD || "hr",
    connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "inst183"
  };
  oracledb.getConnection (dbconfig, cb);
};



// Release the database connection
var dorelease = function (conn) 
{
  conn.release (function (err) {
    if (err) {
       console.error (err.message);
    }
    else {
      console.log ("... Connection released.");
    }
  });
};


// Test Case 1 - Object Insertion - with normal values for 
// both VARCHAR2 & NUMBER Types
var doInsert1 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';
  const personData = {
    IDNO : 201,
    FIRST_NAME : 'Chris',
    LAST_NAME : 'Jones',
    EMAIL : 'cjones@ora.com',
    PHONE : '1234567890'
  };

  console.log ( "insert1" );
  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType(personData);
    conn.execute ( sql, [person, new Date()], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
};



// Test Case 2 - Object Insertion - with null value for numeric
var doInsert2 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';
  const personData = {
    IDNO : null,
    FIRST_NAME : 'Chris',
    LAST_NAME : 'Jones',
    EMAIL : 'cjones@ora.com',
    PHONE : '1234567890'
  };

  console.log ( "insert2" );
  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType(personData);
    conn.execute ( sql, [person, new Date()], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
};


// Test Case 3 - Object Insertion - with null value for both numeric & string
// values
var doInsert3 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';
  const personData = {
    IDNO : null,
    FIRST_NAME : 'Chris',
    LAST_NAME : null,
    EMAIL : 'cjone@ora.com',
    PHONE : '1234567890'
  };

  console.log ("insert3" );

  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType(personData);
    conn.execute ( sql, [person,  new Date() ], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
};


// Test Case 4: Object Insertion - use undefined instead of null for
// numeric & string values
var doInsert4 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';
  const personData = {
    IDNO : undefined,
    FIRST_NAME : 'Chris',
    LAST_NAME : undefined,
    EMAIL : 'cjone@ora.com',
    PHONE : '1234567890'
  };

  console.log ("insert4" );

  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType(personData);
    conn.execute ( sql, [person,  new Date() ], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
};


// Test Case 5: Object Insertion - empty object - all attributes are NULL
var doInsert5 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';

  console.log ("insert5" );

  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType ( { } );                          
    conn.execute ( sql, [person,  new Date() ], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
};


// Test Case 6: Object Insertion - null object - entire object itself is null
var doInsert6 = function (conn, cb) {
  const sql = 'INSERT INTO CONTACTS VALUES ( :1, :2)';

  console.log ("insert6" );

  conn.getDbObjectType ("PERSON_TYP", function (err, objType) {
    const person = new objType ( { } );                          
    conn.execute ( sql, [{val : null, type : oracledb.DBOBJECT},
          new Date() ], function (err, result) {
      if (err) {
        console.error ( err.message );
        return;
      }
      console.log ( "Execution results : " + JSON.stringify (result));
      conn.commit (function (err) {
        if (err) {
          console.error ( err.message );
        }
      });
    });
  });
}


// Test Case 7: Object Insertion with TIMESTAMP type
var doInsert7 = function (conn, cb) 
{
  const sql = 'INSERT INTO EE_TBL VALUES (:1)';
  const eeData = {
    ENTRY : { year : 1986, month : 8, date : 18, hour : 12, min : 14,
              secs : 27, ms : 0 },
    EXIT :  { year : 1989, month : 3, date : 4, hour : 10, min : 27,
              secs : 16, ms : 201 }
  };

  console.log ("insert7");
  
  conn.getDbObjectType ("EE_TYP", function (err, objType) {
    const ee = new objType (eeData);
    conn.execute ( sql, [ee], function ( err, result ) {
       if ( err ) {
         console.error (err.message);
         return;
       }
       console.log ( "Execution results : " + JSON.stringify ( result));
       conn.commit ( function (err) {
         if (err) {
           console.error (err.message);
         }
       });
    });
                          
  });
  
}



// Test Case 8: Object Insertion with TIMESTAMP type - empty JSON
var doInsert8 = function (conn, cb) 
{
  console.log ("insert8");

  const sql = 'INSERT INTO EE_TBL VALUES (:1)';
  conn.getDbObjectType ("EE_TYP", function (err, objType) {
                          const ee = new objType ( {});
    conn.execute ( sql, [ee], function ( err, result ) {
       if ( err ) {
         console.error (err.message);
         return;
       }
       console.log ( "Execution results : " + JSON.stringify ( result));
       conn.commit ( function (err) {
         if (err) {
           console.error (err.message);
         }
       });
    });
                          
  });
  
}



// Test Case 9: Object Insertion with TIMESTAMP type - null values
var doInsert9 = function (conn, cb) 
{
  console.log ( "insert9" );

  const sql = 'INSERT INTO EE_TBL VALUES (:1)';

  conn.getDbObjectType ("EE_TYP", function (err, objType) {
          const ee = new objType ( { ENTRY: null, EXIT : null});
    conn.execute ( sql, [ee], function ( err, result ) {
       if ( err ) {
         console.error (err.message);
         return;
       }
       console.log ( "Execution results : " + JSON.stringify ( result));
       conn.commit ( function (err) {
         if (err) {
           console.error (err.message);
         }
       });
    });
                          
  });
  
}



// Test Case 10: Object Insertion with TIMESTAMP type - undefined value
var doInsert10 = function (conn, cb) 
{
  console.log ( "insert10");

  const sql = 'INSERT INTO EE_TBL VALUES (:1)';

  conn.getDbObjectType ("EE_TYP", function (err, objType) {
    const ee = new objType ( {ENTRY : undefined, EXIT : undefined});
    conn.execute ( sql, [ee], function ( err, result ) {
       if ( err ) {
         console.error (err.message);
         return;
       }
       console.log ( "Execution results : " + JSON.stringify ( result));
       conn.commit ( function (err) {
         if (err) {
           console.error (err.message);
         }
       });
    });
                          
  });
  
}


// Test Case 11 : SELECT QUERY with objects - with normal, null values of
// attributes of NUMBER & VARCHAR2 types.
var doSelect1 = function (conn, cb) 
{
  console.log ( "insert11" );

  const sql = 'SELECT * FROM CONTACTS';
  conn.execute ( sql, function (err, result) {
    if ( err) {
       console.error ( err.message );
       return;
    }
    console.log ( "Results : " + JSON.stringify ( result ));
    console.log ();
    const count = result.rows.length;
    console.log ( "RowCount : " + count ) ;
    console.log ( );
    for ( var row = 0 ; row < count; row ++)  {
      console.log ( "Row : " + row );
      var obj = result.rows[row][0];   // first col is OBJECT type
      if(!obj.isCollection ) {
        console.log ( "IDNO " + obj['IDNO']);
        console.log ("FIRTNAME " + obj.FIRST_NAME ) ;
        console.log ("LASNAME " + obj.LAST_NAME);
        console.log ("EMAIL " + obj.EMAIL);
        console.log ("PHONE " + obj.PHONE);
      }
      console.log ();
    }
  });
};


// Test Case 12 : SELECT Query with Objects with TIMESTAMP type
var doSelect2 = function (conn, cb) {
  console.log ( "insert12" );

  const sql = 'SELECT * FROM EE_TBL';
  conn.execute (sql, function (err, results) {
    if (err) {
       console.error ( err.message ) ;
       return;
    }
    console.log ("Results : " + JSON.stringify (results));
    for (var row = 0; row < results.rows.length; row ++ ) {
      var obj = results.rows[row][0];
      if (!obj.isCollection) {
        console.log ( "ENTRY : " + obj.ENTRY );
        console.log ( "EXIT : " + obj.EXIT );
      }
    }
    console.log ();
  });
}


async.waterfall (
  [
    doconnect,
    doInsert1,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

    

async.waterfall (
  [
    doconnect,
    doInsert2,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

    
async.waterfall (
  [
    doconnect,
    doInsert3,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert4,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert5,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);


async.waterfall (
  [
    doconnect,
    doInsert6,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert7,
    dorelease
  ],
  function ( err, conn) {
    if (err) {
      console.error ("In waterfall err cb: ==", err, "<==" );
    }
    if ( conn ) {
      doRelease ( conn );
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert8,
    dorelease
  ],
  function ( err, conn) {
    if (err) {
      console.error ("In waterfall err cb: ==", err, "<==" );
    }
    if ( conn ) {
      doRelease ( conn );
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert9,
    dorelease
  ],
  function ( err, conn) {
    if (err) {
      console.error ("In waterfall err cb: ==", err, "<==" );
    }
    if ( conn ) {
      doRelease ( conn );
    }
  }
);

async.waterfall (
  [
    doconnect,
    doInsert10,
    dorelease
  ],
  function ( err, conn) {
    if (err) {
      console.error ("In waterfall err cb: ==", err, "<==" );
    }
    if ( conn ) {
      doRelease ( conn );
    }
  }
);


async.waterfall (
  [
    doconnect,
    doSelect1,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);





async.waterfall (
  [
    doconnect,
    doSelect2,
    dorelease
  ],
  function ( err, conn ) {
    if (err) {
      console.error ("In waterfall err cb : ==", err, "<==" );
    }
    if (conn) {
      dorelease(conn);
    }
  }
);

