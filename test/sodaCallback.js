/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   166. sodaCallback.js
 *
 * DESCRIPTION
 *   SODA tests in calback format.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbconfig = require('./dbconfig.js');

describe('166. sodaCallback.js', function() {

  var isRunnable;

  before(function(done) {
    var conn, soda, collNames;

    function checkRunnable(cb) {
      var clientRunnable, serverRunnable;

      if (oracledb.oracleClientVersion < 1803000000) {
        clientRunnable = false;
      } else {
        clientRunnable = true;
      }

      oracledb.getConnection(dbconfig, function(err, connection) {
        if (err) cb(err);

        if (connection.oracleServerVersion < 1803000000) {
          serverRunnable = false;
        } else {
          serverRunnable = true;
        }

        if (clientRunnable && serverRunnable) {
          isRunnable = true;
        } else {
          isRunnable = false;
        }

        connection.close(function(err) {
          if (err) cb(err);
          cb(null);
        });
      });
    } // checkRunnable()

    checkRunnable(function(err) {
      should.not.exist(err);
      if (!isRunnable) {
        done();
      } else {
        async.series([
          function(cb) {
            oracledb.getConnection(dbconfig, function(err, connection) {
              should.not.exist(err);
              conn = connection;
              cb();
            });
          },
          function(cb) {
            soda = conn.getSodaDatabase();
            should.exist(soda);
            cb();
          },
          function(cb) {
            soda.getCollectionNames(function(err, names) {
              should.not.exist(err);
              collNames = names;
              cb();
            });
          },
          function(cb) {
            if (collNames.length == 0) {
              cb();
            } else {
              console.log("existing collections: ");
              console.log(collNames);
              cleanupCollections(collNames, cb);
            }
          },
          function(cb) {
            conn.close(function(err) {
              should.not.exist(err);
              cb();
            });
          }
        ], done);
      }
    });
    //if (!runnable) this.skip();

    function cleanupCollections(names, callback) {
      async.forEach(names, function(item, cb) {
        should.exist(soda);

        soda.openCollection(item, function(err, collection) {
          should.not.exist(err);

          collection.drop(function(err, res) {
            should.not.exist(err);

            if (res.dropped) {
              console.log("Succeed to drop collection", item);
            } else {
              console.log("Fail to drop collection", item);
            }
            cb();
          });

        });
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    } // cleanupCollection()

  }); // before();

  it('166.1 create a collection, then drop it', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var conn, soda, coll;
      var t_collName = "soda_test_166_1";
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbconfig,
            function(err, connection) {
              should.not.exist(err);
              conn = connection;
              cb();
            }
          );
        },
        function(cb) {
          soda = conn.getSodaDatabase();
          should.exist(soda);
          cb();
        },
        function(cb) {
          soda.createCollection(t_collName, function(err, collection) {
            should.not.exist(err);
            coll = collection;
            cb();
          });
        },
        function(cb) {
          soda.getCollectionNames(function(err, collNames) {
            should.not.exist(err);
            should.strictEqual(collNames[0], t_collName);
            cb();
          });
        },
        function(cb) {
          soda.openCollection(t_collName, function(err, collection) {
            should.not.exist(err);
            coll = collection;
            cb();
          });
        },
        function(cb) {
          coll.drop(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          conn.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }
  }); // 166.1

  it('166.2 the callback version of "examples/soda1.js" case', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var conn, soda, coll;
      var myKey;
      var t_content1 = { name: "Matilda", address: {city: "Melbourne"} };
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbconfig,
            function(err, connection) {
              should.not.exist(err);
              conn = connection;
              cb();
            }
          );
        },
        function(cb) {
          soda = conn.getSodaDatabase();
          should.exist(soda);
          cb();
        },
        function(cb) { // Create a new SODA collection
          var t_collName = "soda_test_166_2";
          soda.createCollection(t_collName, function(err, collection) {
            should.not.exist(err);
            coll = collection;
            cb();
          });
        },
        function(cb) { // Create a index
          var indexSpec = {
            "name": "CITY_IDX",
            "fields": [
              {
                "path": "address.city",
                "datatype": "string",
                "order": "asc"
              }
            ]
          };

          coll.createIndex(indexSpec, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) { // Insert a document

          coll.insertOneAndGet(t_content1, function(err, doc) {
            should.not.exist(err);
            myKey = doc.key;
            should.exist(myKey);
            (myKey).should.be.a.String();
            cb();
          });
        },
        function(cb) { // Fetch the document back
          coll.find().key(myKey).getOne(function(err, document) {
            should.not.exist(err);
            var content = document.getContent();
            should.deepEqual(content, t_content1);

            var contentStr = document.getContentAsString();
            (contentStr).should.be.a.String();
            should.strictEqual( JSON.stringify(content), contentStr );
            cb();
          });
        },
        function(cb) { // Replace documet content
          var content = { name: "Matilda", address: {city: "Sydney"} };
          coll.find().key(myKey).replaceOne(content, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        // Insert some more documents without caring about their keys
        function(cb) {
          var content = { name: "Venkat", address: {city: "Bengaluru"} };
          coll.insertOne(content, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          var content = { name: "May", address: {city: "London"} };
          coll.insertOne(content, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          var content = { name: "Sally-Ann", address: {city: "San Francisco"} };
          coll.insertOne(content, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        // Find all documents with city names starting with 'S'
        function(cb) {
          coll.find()
            .filter({"address.city": {"$like": "S%"}})
            .getDocuments(function(err, documents) {
              should.not.exist(err);
              for (let i = 0; i < documents.length; i++) {
                let content = documents[i].getContent();
                (['Sydney', 'San Francisco']).should.containEql(content.address.city);
              }
              cb();
            });
        },
        function(cb) { // Count all documents
          coll.find().count(function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.count, 4);
            cb();
          });
        },
        function(cb) { // Remove documents with cities containing 'o'
          coll.find().filter({"address.city": {"$regex": ".*o.*"}})
            .remove(function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.count, 2);
              cb();
            });
        },
        function(cb) { // Count all documents
          coll.find().count(function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.count, 2);
            cb();
          });
        },
        function(cb) { // Commit changes
          conn.commit(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) { // Drop the collection
          coll.drop(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          conn.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }
  }); // 166.2
});