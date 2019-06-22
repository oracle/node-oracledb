/*
 create a SQL type as follows:
 
SQL> desc PERSON_TYP
Name                            Null? Type
-----------------------------------------------
IDNO                                   NUMBER
FIRST_NAME                             VARCHAR2(20)
LAST_NAME                              VARCHAR2(20)
EMAIL                                  VARCHAR2(20)
PHONE                                  VARCHAR2(20)


create a table with a column of this type
SQL> desc CONTACTS
Name                             Null?  Type
---------------------------------------------
CONTACT                                  PERSON_TYP
CONTACT_DATE                             DATE

*/
        
        
const oracledb = require ('oracledb');
//// const dbconfig = require ( './dbconfig.js');
var dbconfig = {
  user          : process.env.NODE_ORACLEDB_USER || "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD || "hr",
  connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "inst183"
};

oracledb.extendedMetaData = true;
oracledb.outFormat = oracledb.ARRAY;


const sql = "SELECT * FROM CONTACTS";


( async () => {
  try {
    const conn = await oracledb.getConnection ( dbconfig ) ;
    const results = await conn.execute ( sql ) ;
    
    console.log ( results ) ;
    const count = results.rows.length;

    for ( var row = 0 ; row < count ; row ++ ) {
      console.log ("Attribute from row " + row );
      var obj = results.rows[row][0];  // first row, first col
      console.log ("isCollection " + obj.isCollection );
      if (!obj.isCollection) {
        var attrs = obj.attributes;
        console.log ( "IDNO " + obj["IDNO"]);
        console.log ("FIRTNAME " + obj.FIRST_NAME ) ;
        console.log ("LASNAME " + obj.LAST_NAME);
        console.log ("EMAIL " + obj.EMAIL);
        console.log ("PHONE " + obj.PHONE);
        console.log ("HIRED_DATE " + obj.HIRED_DATE );
     }
      console.log ();
    }

    console.log ( "name "  + obj.name ) ;
    console.log ( "schema " + obj.schema );
    console.log ( "attr len " + obj.attributes.length);

    await conn.close ();
  }
  catch ( e )  {
    console.error ( e.message ) ;
  }
}) ();
