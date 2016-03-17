/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   demo.sql
 *
 * DESCRIPTION
 *   Create database objects for the examples
 *
 *   Scripts to create Oracle Database's traditional sample schemas can
 *   be found at: https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

SET ECHO ON

-- For plsqlproc.js example for bind parameters
CREATE OR REPLACE PROCEDURE testproc (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
AS
BEGIN
  p_inout := p_in || p_inout;
  p_out := 101;
END;
/
SHOW ERRORS

-- For plsqlfunc.js example on calling a PL/SQL function
CREATE OR REPLACE FUNCTION testfunc (p1_in IN VARCHAR2, p2_in IN VARCHAR2) RETURN VARCHAR2
AS
BEGIN
  RETURN p1_in || p2_in;
END;
/
SHOW ERRORS

-- For refcursor.js example of REF CURSORS
CREATE OR REPLACE PROCEDURE get_emp_rs (p_sal IN NUMBER, p_recordset OUT SYS_REFCURSOR)
AS
BEGIN
  OPEN p_recordset FOR
    SELECT first_name, salary, hire_date
    FROM   employees
    WHERE  salary > p_sal;
END;
/
SHOW ERRORS

-- For plsqlarray.js example for PL/SQL 'INDEX BY' array binds
DROP TABLE waveheight;
CREATE TABLE waveheight (beach VARCHAR2(50), depth NUMBER);

CREATE OR REPLACE PACKAGE beachpkg IS
  TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;
  TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER;
  PROCEDURE array_in(beaches IN beachType, depths IN depthType);
  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType);
  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType);
END;
/
SHOW ERRORS

CREATE OR REPLACE PACKAGE BODY beachpkg IS

  -- Insert array values into a table
  PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS
  BEGIN
    IF beaches.COUNT <> depths.COUNT THEN
       RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.');
    END IF;
    FORALL i IN INDICES OF beaches
      INSERT INTO waveheight (beach, depth) VALUES (beaches(i), depths(i));
  END;

  -- Return the values from a table
  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType) IS
  BEGIN
    SELECT beach, depth BULK COLLECT INTO beaches, depths FROM waveheight;
  END;

  -- Return the arguments sorted
  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType) IS
  BEGIN
    IF beaches.COUNT <> depths.COUNT THEN
       RAISE_APPLICATION_ERROR(-20001, 'Array lengths must match for this example.');
    END IF;
    FORALL i IN INDICES OF beaches
      INSERT INTO waveheight (beach, depth) VALUES (beaches(i), depths(i));
    SELECT beach, depth BULK COLLECT INTO beaches, depths FROM waveheight ORDER BY 1;
  END;

END;
/
SHOW ERRORS

-- For selectjson.js example of JSON datatype. Requires Oracle Database 12.1.0.2
DROP TABLE j_purchaseorder;
-- Note if your applications always insert valid JSON, you may delete
-- the IS JSON check to remove its additional validation overhead.
CREATE TABLE j_purchaseorder (po_document VARCHAR2(4000) CHECK (po_document IS JSON));
INSERT INTO j_purchaseorder (po_document) VALUES ('{"userId":3,"userName":"Alison","location":"Australia"}');
COMMIT;

-- For selectjsonclob.js example of JSON datatype.  Requires Oracle Database 12.1.0.2
DROP TABLE j_purchaseorder_c;
-- The extra CHECK clause 'or length(po_document) = 0' clause allows
-- EMPTY_CLOB() to be inserted into the table.  The extra clause is
-- not needed if you have a database patch for bug 21636362.  The
-- extra 'or' clause will stop the table appearing in
-- USER_JSON_COLUMNS.  EMPTY_CLOB() is currently needed by
-- node-oracledb for inserting CLOB data.
CREATE TABLE j_purchaseorder_c (po_document CLOB CHECK (po_document IS JSON or length(po_document) = 0));
INSERT INTO j_purchaseorder_c (po_document) VALUES ('{"userId":4,"userName":"Changjie","location":"China"}');
COMMIT;

-- For DML RETURNING aka RETURNING INTO examples
DROP TABLE dmlrupdtab;
CREATE TABLE dmlrupdtab (id NUMBER, name VARCHAR2(40));
INSERT INTO dmlrupdtab VALUES (1001, 'Venkat');
INSERT INTO dmlrupdtab VALUES (1002, 'Neeharika');
COMMIT;

-- For LOB examples
DROP TABLE mylobs;
CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);

-- For DBMS_OUTPUT example dbmsoutputpipe.js
CREATE OR REPLACE TYPE dorow AS TABLE OF VARCHAR2(32767);
/
SHOW ERRORS

CREATE OR REPLACE FUNCTION mydofetch RETURN dorow PIPELINED IS
line VARCHAR2(32767);
status INTEGER;
BEGIN LOOP
  DBMS_OUTPUT.GET_LINE(line, status);
  EXIT WHEN status = 1;
  PIPE ROW (line);
END LOOP;
END;
/
SHOW ERRORS

-- For raw1.js
DROP TABLE myraw;
CREATE TABLE myraw (r RAW(64));
