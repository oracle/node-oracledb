/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   sql.js
 *
 * DESCRIPTION
 *   generate sql
 *****************************************************************************/
'use strict';

const sql = exports;
module.exports = sql;

sql.createTable = function(tableName, dataType) {
  let element = dataType;

  if (dataType === "CHAR") {
    element = element + "(1000)";
  }
  if (dataType === "NCHAR") {
    element = element + "(1000)";
  }
  if (dataType === "VARCHAR2") {
    element = element + "(1000)";
  }
  if (dataType === "RAW") {
    element = element + "(1000)";
  }

  const sql = `BEGIN
                 DECLARE
                      e_table_missing EXCEPTION;
                      PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
                  BEGIN
                      EXECUTE IMMEDIATE ('DROP TABLE ` + tableName + ` PURGE' );
                  EXCEPTION
                      WHEN e_table_missing
                      THEN NULL;
                  END;
                  EXECUTE IMMEDIATE ( '
                      CREATE TABLE ` + tableName + ` (
                          id        NUMBER,
                          content   ` + element + `
                      )
                  ');
               END;`;
  return sql;
};
