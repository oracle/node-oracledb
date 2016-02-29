/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'. 
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   44. plsqlBinding2.js
 *
 * DESCRIPTION
 *   Testing PL/SQL indexed tables (associative arrays).
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('44. plsqlBinding2.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var connection = null;
  beforeEach(function(done) {
    async.series([
      function(callback) {
        oracledb.getConnection(credential, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
        });
      },
      function createTab(callback) {
        var proc =  "BEGIN \n" +
                    "  DECLARE \n" +
                    "    e_table_exists EXCEPTION; \n" +
                    "    PRAGMA EXCEPTION_INIT(e_table_exists, -00942);\n " +
                    "   BEGIN \n" +
                    "     EXECUTE IMMEDIATE ('DROP TABLE waveheight'); \n" +
                    "   EXCEPTION \n" +
                    "     WHEN e_table_exists \n" +
                    "     THEN NULL; \n" +
                    "   END; \n" +
                    "   EXECUTE IMMEDIATE (' \n" +
                    "     CREATE TABLE waveheight (beach VARCHAR2(50), depth NUMBER)  \n" +  
                    "   '); \n" +   
                    "END; "; 

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );

      },
      function createPkg(callback) {
        var proc = "CREATE OR REPLACE PACKAGE beachpkg IS\n" +
                   "  TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                   "  TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER;\n" +
                   "  PROCEDURE array_in(beaches IN beachType, depths IN depthType);\n" +
                   "  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType); \n" +
                   "  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType); \n" +
                   "END;";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        var proc = "CREATE OR REPLACE PACKAGE BODY beachpkg IS \n" +
                   "  PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS \n" +
                   "  BEGIN \n" +
                   "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                   "      RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.'); \n" +
                   "    END IF; \n" + 
                   "    FORALL i IN INDICES OF beaches \n" +
                   "      INSERT INTO waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                   "  END; \n" +
                   "  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType) IS \n" +
                   "  BEGIN \n" +
                   "    SELECT beach, depth BULK COLLECT INTO beaches, depths FROM waveheight; \n" +
                   "  END; \n" +
                   "  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType) IS \n" +
                   "  BEGIN \n" +
                   "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                   "      RAISE_APPLICATION_ERROR(-20001, 'Array lenghts must match for this example.'); \n" +
                   "    END IF; \n" +
                   "    FORALL i IN INDICES OF beaches \n" +
                   "      INSERT INTO waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                   "      SELECT beach, depth BULK COLLECT INTO beaches, depths FROM waveheight ORDER BY 1; \n" +
                   "  END; \n  " +
                   "END;"; 

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }, 
      function(callback) {
        connection.commit(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  }) // before

  afterEach(function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE waveheight", 
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PACKAGE beachpkg",
          function(err) {
            should.not.exist(err); 
            callback();
          }
        );
      },
      function(callback) {
        connection.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
    ], done);
  }) // after

  it('44.1 example case', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:beach_in, :depth_in); END;",
          {
            beach_in: { type: oracledb.STRING, 
                        dir:  oracledb.BIND_IN,
                        val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
            depth_in: { type: oracledb.NUMBER,
                        dir:  oracledb.BIND_IN,
                        val:  [45, 30, 67]
                      }
          },
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:beach_out, :depth_out); END;",
          {
            beach_out: { type: oracledb.STRING,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3 },
            depth_out: { type: oracledb.NUMBER,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3 }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds.beach_out).should.eql([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]);
            (result.outBinds.depth_out).should.eql([45, 30, 67]);
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:beach_inout, :depth_inout); END;",
          {
            beach_inout: { type: oracledb.STRING, 
                           dir:  oracledb.BIND_INOUT,
                           val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
                           maxArraySize: 3},
            depth_inout: { type: oracledb.NUMBER, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [8, 3, 70],
                           maxArraySize: 3}
          },
          function(err, result) {
            should.not.exist(err);
            //console.log(result.outBinds);
            (result.outBinds.beach_inout).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]);
            (result.outBinds.depth_inout).should.eql([ 70, 3, 8 ]);
            callback();
          }
        );
      }
    ], done);
  }) // 44.1

  it('44.2 example case binding by position', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:1, :2); END;",
          [
            { type: oracledb.STRING, 
               dir:  oracledb.BIND_IN,
               val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
            { type: oracledb.NUMBER,
               dir:  oracledb.BIND_IN,
               val:  [45, 30, 67]
            }
          ],
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:1, :2); END;",
          [
            { type: oracledb.STRING,
              dir:  oracledb.BIND_OUT,
              maxArraySize: 3 },
            { type: oracledb.NUMBER,
              dir:  oracledb.BIND_OUT,
              maxArraySize: 3 }
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds[0]).should.eql([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]);
            (result.outBinds[1]).should.eql([45, 30, 67]);
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:1, :2); END;",
          [
            { type: oracledb.STRING, 
              dir:  oracledb.BIND_INOUT,
              val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
              maxArraySize: 3},
            { type: oracledb.NUMBER, 
              dir:  oracledb.BIND_INOUT,
              val:  [8, 3, 70],
              maxArraySize: 3}  
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds[0]).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]);
            (result.outBinds[1]).should.eql([ 70, 3, 8 ]);
            callback();
          }
        );
      }
    ], done);
  })
  
  it.skip('44.3 default binding type and direction with binding by name', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:beach_in, :depth_in); END;",
          {
            beach_in: { //type: oracledb.STRING, 
                        //dir:  oracledb.BIND_IN,
                        val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
            depth_in: { type: oracledb.NUMBER,
                        dir:  oracledb.BIND_IN,
                        val:  [45, 30, 67]
                      }
          },
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:beach_out, :depth_out); END;",
          {
            beach_out: { type: oracledb.STRING,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3 },
            depth_out: { type: oracledb.NUMBER,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3 }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds.beach_out).should.eql([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]);
            (result.outBinds.depth_out).should.eql([45, 30, 67]);
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:beach_inout, :depth_inout); END;",
          {
            beach_inout: { type: oracledb.STRING, 
                           dir:  oracledb.BIND_INOUT,
                           val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
                           maxArraySize: 3},
            depth_inout: { type: oracledb.NUMBER, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [8, 3, 70],
                           maxArraySize: 3}
          },
          function(err, result) {
            should.not.exist(err);
            //console.log(result.outBinds);
            (result.outBinds.beach_inout).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]);
            (result.outBinds.depth_inout).should.eql([ 70, 3, 8 ]);
            callback();
          }
        );
      }
    ], done);
  }) // 44.3

  it('44.4 default binding type and direction with binding by position', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:1, :2); END;",
          [
            { type: oracledb.STRING, 
               // dir:  oracledb.BIND_IN,
               val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
            { type: oracledb.NUMBER,
               dir:  oracledb.BIND_IN,
               val:  [45, 30, 67]
            }
          ],
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:1, :2); END;",
          [
            { type: oracledb.STRING,
              dir:  oracledb.BIND_OUT,
              maxArraySize: 3 },
            { type: oracledb.NUMBER,
              dir:  oracledb.BIND_OUT,
              maxArraySize: 3 }
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds[0]).should.eql([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]);
            (result.outBinds[1]).should.eql([45, 30, 67]);
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:1, :2); END;",
          [
            { type: oracledb.STRING, 
              dir:  oracledb.BIND_INOUT,
              val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
              maxArraySize: 3},
            { type: oracledb.NUMBER, 
              dir:  oracledb.BIND_INOUT,
              val:  [8, 3, 70],
              maxArraySize: 3}  
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds[0]).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]);
            (result.outBinds[1]).should.eql([ 70, 3, 8 ]);
            callback();
          }
        );
      }
    ], done);
  })

  it('44.5 null elements in String and Number arrays', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:beach_in, :depth_in); END;",
          {
            beach_in: { type: oracledb.STRING, 
                        dir:  oracledb.BIND_IN,
                        val:  ["Malibu Beach", "Bondi Beach", null, "Waikiki Beach", '', null] },
            depth_in: { type: oracledb.NUMBER,
                        dir:  oracledb.BIND_IN,
                        val:  [null, null, 45, 30, 67, null, ]
                      }
          },
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:beach_out, :depth_out); END;",
          {
            beach_out: { type: oracledb.STRING,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 10 },
            depth_out: { type: oracledb.NUMBER,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 10 }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds.beach_out).should.eql([ 'Malibu Beach', 'Bondi Beach', null, 'Waikiki Beach', null, null ]);
            (result.outBinds.depth_out).should.eql([ null, null, 45, 30, 67, null ]);
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:beach_inout, :depth_inout); END;",
          {
            beach_inout: { type: oracledb.STRING, 
                           dir:  oracledb.BIND_INOUT,
                           val:  ["Port Melbourne Beach", "Eighty Mile Beach", '', "Chesil Beach", null, ''],
                           maxArraySize: 10},
            depth_inout: { type: oracledb.NUMBER, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [null, 8, null, 3, null, 70],
                           maxArraySize: 10}
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.outBinds);
            (result.outBinds.beach_inout).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach', null, null, null ]);
            (result.outBinds.depth_inout).should.eql([ 3, 8, null, null, 70, null ]);
            callback();
          }
        );
      }
    ], done);
  }) // 44.5
  
  it('44.6 empty array for BIND_IN and BIND_INOUT', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:beach_in, :depth_in); END;",
          {
            beach_in: { type: oracledb.STRING, 
                        dir:  oracledb.BIND_IN,
                        val:  [] },
            depth_in: { type: oracledb.NUMBER,
                        dir:  oracledb.BIND_IN,
                        val:  []
                      }
          },
          function(err) {
            should.exist(err);
            (err.message).should.startWith('NJS-039');
            // NJS-039: empty array is not allowed for IN bind
            callback();
          }
        );
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:beach_inout, :depth_inout); END;",
          {
            beach_inout: { type: oracledb.STRING, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [],
                           maxArraySize: 0
                         },
            depth_inout: { type: oracledb.NUMBER, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [],
                           maxArraySize: 3}
          },
          function(err, result) {
            should.exist(err);
            (err.message).should.startWith('NJS-039');
            callback();
          }
        );
      }
    ], done);
  }) // 44.6

  it('44.7 empty array for BIND_OUT', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                      "  PROCEDURE test(p OUT stringsType);\n" +
                      "END;";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        var proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  PROCEDURE test(p OUT stringsType) IS BEGIN NULL; END;\n" +
                     "END;";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testpack.test(:0); END;",
          [
            {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxArraySize: 1}
          ],
          function(err, result) {
            should.not.exist(err);
            result.outBinds[0].should.eql([]);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PACKAGE oracledb_testpack",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  }) // 44.7

  it.skip('44.8 maxSize option applies to each elements of an array', function(done) {
    async.series([
      // Pass arrays of values to a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_in(:beach_in, :depth_in); END;",
          {
            beach_in: { type: oracledb.STRING, 
                        dir:  oracledb.BIND_IN,
                        val:  ["Malibu", "Bondi", "Waikiki"] },
            depth_in: { type: oracledb.NUMBER,
                        dir:  oracledb.BIND_IN,
                        val:  [45, 30, 67]
                      }
          },
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      // Fetch arrays of values from a PL/SQL procedure
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_out(:beach_out, :depth_out); END;",
          {
            beach_out: { type: oracledb.STRING,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3,
                         maxSize: 6 },
            depth_out: { type: oracledb.NUMBER,
                         dir:  oracledb.BIND_OUT,
                         maxArraySize: 3 }
          },
          function(err, result) {
            should.exist(err);
            (err.message).should.startWith('ORA-06502');
            // ORA-06502: PL/SQL: numeric or value error: host bind array too small
            callback();
          }
        );
      },
      function(callback) {
        connection.rollback(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      // Return input arrays sorted by beach name
      function(callback) {
        connection.execute(
          "BEGIN beachpkg.array_inout(:beach_inout, :depth_inout); END;",
          {
            beach_inout: { type: oracledb.STRING, 
                           dir:  oracledb.BIND_INOUT,
                           val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
                           maxArraySize: 3,
                           maxSize : 5},
            depth_inout: { type: oracledb.NUMBER, 
                           dir:  oracledb.BIND_INOUT,
                           val:  [8, 3, 70],
                           maxArraySize: 3}
          },
          function(err, result) {
            should.not.exist(err);
            //console.log(result.outBinds);
            (result.outBinds.beach_inout).should.eql([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]);
            (result.outBinds.depth_inout).should.eql([ 70, 3, 8 ]);
            callback();
          }
        );
      }
    ], done);
  }) // 44.8

})