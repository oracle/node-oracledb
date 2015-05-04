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

CREATE OR REPLACE PROCEDURE testproc (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
AS
BEGIN
  p_inout := p_in || p_inout;
  p_out := 101;
END;
/
SHOW ERRORS

-- JSON with Oracle Database 12.1.0.2
DROP TABLE j_purchaseorder;
CREATE TABLE j_purchaseorder
    (po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON));
