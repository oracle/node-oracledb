const oracledb = require('oracledb');

const config = {
    user: "hr",
    password: "hr",
    connectString: "inst183"
};

const id = 4;
const dtNow = Date.Now;
const personData = {
  HIRED_DATE : Date.Now,
  IDNO : 201,
  FIRST_NAME : "Chris", 
  LAST_NAME : "Jones", 
  EMAIL : "cjones@ora.com",
  PHONE: "1234567890"
};
//const dtNow = Date.Now;

const sql = 'insert into CONTACTS values (:1, :2)';

(async() => {
    const conn = await oracledb.getConnection(config);
    const dbObjectType = await conn.getDbObjectType("PERSON_TYP");
    console.log ( "PERSON DATA : " + JSON.stringify ( personData) ) ;
    console.log ( "PERSONData.HIRED_DATE : " + personData.HIRED_DATE ) ;
    
    const person = new dbObjectType(personData);
    const result = await conn.execute(sql, [person, 1001]);
    console.log("insert successful:", result);
    await conn.commit();
    await conn.close();
})();
