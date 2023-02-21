.. _twopc:

***********************
Two-Phase Commits (TPC)
***********************

Node-oracledb functions such as :meth:`connection.tpcBegin()`
support distributed transactions. See `Two-Phase Commit Mechanism
<https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-8152084F-4760
-4B89-A91C-9A84F81C23D1>`__ in the Oracle Database documentation.

Distributed transaction protocols attempt to keep multiple data sources
consistent with one another by ensuring updates to the data sources
participating in a distributed transaction are all performed, or none of
them performed. These data sources, also called participants or resource
managers, may be traditional database systems, messaging systems, and
other systems that store state such as caches. A common class of
distributed transaction protocols are referred to as two-phase commit
protocols. These protocols split the commitment of a distributed
transaction into two distinct, separate phases.

During the first phase, the participants (data sources) are polled or
asked to vote on the outcome of the distributed transaction. This phase,
called the prepare phase, ensures agreement or consensus on the ability
for each participant to commit their portion of the transaction. When
asked to prepare, the participants respond positively if they can commit
their portion of the distributed transaction when requested or respond
that there were no changes, so they have no need to be committed. Once
all participants have responded to the first phase, the second phase of
the protocol can begin.

During the second phase of the protocol, called the commit phase, all of
the participants that indicated they needed to be committed are asked to
either commit their prepared changes or roll them back. If the decision
on the outcome of the distributed transaction was to commit the
transaction, each participant is asked to commit their changes. If the
decision was to abort or rollback the distributed transaction, each
participant is asked to rollback their changes.

While applications can coordinate these activities, it takes on
additional responsibilities to ensure the correct outcome of all
participants, even in the face of failures. These failures could be of
the application itself, one of the participants in the transaction, of
communication links, etc. In order to assure the atomic characteristics
of a distributed transaction, once the decision has been made to commit
the distributed transaction, this decision needs to be durably recorded
in case of failure. The application, as part of its steps for recovery
from a failure, now needs to check the durable log and notify the
participants of the outcome. Failures may be nested such that not only
might the application fail, one or more participants or connections to
participants might fail. All these scenarios require careful
consideration and remediation to ensure that all participants either
committed or rolled back their local updates.

As a result, most applications rely upon the services provided by a
transaction manager, also called a transaction coordinator. The purpose
of having a transaction manager perform this coordination is to
eliminate having to have each application perform these transaction
management functions. The application asks the transaction manager to
start a transaction. As additional participants or resource managers
join the transaction, they register with the transaction manager as
participants. When the original application decides the transaction is
to be committed or rolled back, it asks the transaction manager to
commit or rollback the transaction. If the application asked the
transaction to be rolled back, the transaction coordinator notifies all
participants to roll back. Otherwise, the transaction manager then
starts the two-phase commit protocol.

An example of an application managing the two-phase commit protocol is:

.. code-block:: javascript

   const oracledb = require('oracledb');
   const dbConfig1 = require('./dbconfig1.js');
   const dbConfig2 = require('./dbconfig2.js');

   async function run() {
     let connection1, connection2;

     let xid1 = {
       "formatId": 1,
       "globalTransactionId": "tx1",
       "branchQualifier": "br1"
     };

     let xid2 = {
       "formatId": 1,
       "globalTransactionId": "tx1",
       "branchQualifier": "br2"
     };

     try {

       connection1 = await oracledb.getConnection(dbConfig1);      // Connect to DB 1
       connection2 = await oracledb.getConnection(dbConfig2);      // Connect to DB 2

       await connection1.tpcBegin(xid1);                           // Start the transaction on DB 1
       await connection2.tpcBegin(xid2);                           // Start the transaction on DB 2

       // Perform some DML on each database
       await connection1.execute(
         `UPDATE customers SET balance = :1 WHERE cust_id = :2`,
         [150, 21]
       );
       await connection2.execute(
         `UPDATE customers SET balance = :1 WHERE cust_id = :2`,
         [250, 1]
       );

       const commitNeeded1 = await connection1.tpcPrepare(xid1);   // Prepare DB 1
       const commitNeeded2 = await connection2.tpcPrepare(xid2);   // Prepare DB 2
       //const commitNeeded2 = false;

       if (commitNeeded1) {                                        // Does DB 1 need committing?
         console.log("Committing connection 1");
         await connection1.tpcCommit(xid1);
       } else {
         console.log("Connection 1 does not need no committing");
       }

       if (commitNeeded2) {                                        // Does DB 2 need committing?
         console.log("Committing connection 2");
         await connection2.tpcCommit(xid2);
       } else {
         console.log("Connection 2 does not need no committing");
       }

     } catch (err) {
       console.error(err);
       // Rollback on error
       if (connection1) {
         console.log("Rolling back Connection 1");
         await connection1.tpcRollback(xid1);
       }
       if (connection2) {
         console.log("Rolling back Connection 2");
         await connection2.tpcRollback(xid2);
       }
     } finally {
       if (connection1) {
         try {
           await connection1.close();
         } catch (err) {
           console.error(err);
         }
       }
       if (connection2) {
         try {
           await connection2.close();
         } catch (err) {
           console.error(err);
         }
       }
     }
   }

   run();

The two-phase commit functions allow one process or connection to start
a transaction, and then a second to continue it. For example, if a table
contained a salary with initial value 100, then one process could start
a transaction, update the table, and then suspend the transaction:

.. code-block:: javascript

   connection = await oracledb.getConnection( {
     user          : "hr",
     password      : mypw,
     connectString : "localhost/orclpdb1"
   });

   const xid = {
     "formatId": 1,
     "globalTransactionId": "tx1",
     "branchQualifier": "br1"
   };

   await connection.tpcBegin(xid);
   result = await connection.execute('UPDATE mytable SET salary = salary * 1.1');  // 100 * 1.1 == 110
   await connection.tpcEnd(xid, oracledb.TPC_END_SUSPEND);
   await connection.close();

A second process could resume that same transaction by passing the same
XID:

.. code-block:: javascript

   connection = await oracledb.getConnection( {
     user          : "hr",
     password      : mypw,
     connectString : "localhost/orclpdb1"
   });

   const xid = {
     "formatId": 1,
     "globalTransactionId": "tx1",
     "branchQualifier": "br1"
   };

   await connection.tpcBegin(xid, oracledb.TPC_BEGIN_RESUME);
   result = await connection.execute('UPDATE mytable SET salary = salary * 3');  // 110 * 3 == 330
   await connection.tpcCommit(xid, true);
   await connection.close();

The table salary column now contains a value of 330 showing that both
UPDATE statements had taken place::

   SQL> select * from mytable;

       SALARY
   ----------
          330
