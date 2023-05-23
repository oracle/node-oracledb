// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const constants = require('../constants');
const errors = require('../errors.js');

//---------------------------------------------------------------------------
// getMetadataMany(sql)
//
// Get metadata info for all the columns in the table
//---------------------------------------------------------------------------
function getMetadataMany(vars) {
  const metadata = [];
  for (const queryVar of vars) {
    metadata.push(queryVar.fetchInfo);
  }
  return metadata;
}

//---------------------------------------------------------------------------
// getOutBinds(sql)
//
// Get the outBinds for the sql
//---------------------------------------------------------------------------
function getOutBinds(bindVars, pos) {
  let bindByPos = (bindVars[0].name === undefined);
  let outBinds;
  if (bindByPos) {
    outBinds = [];
  } else {
    outBinds = {};
  }
  for (let i = 0; i < bindVars.length; i++) {
    if (bindVars[i].dir === constants.BIND_IN)
      continue;
    if (bindByPos) {
      outBinds.push(bindVars[i].values[pos]);
    } else {
      outBinds[bindVars[i].name] = bindVars[i].values[pos];
    }
  }
  return outBinds;
}

//---------------------------------------------------------------------------
// getExecuteManyOutBinds(sql)
//
// Get the outBinds for the sql when doing an executeMany call
//---------------------------------------------------------------------------
function getExecuteManyOutBinds(bindVars, numIters) {
  let numOutBinds = getNumOutBinds(bindVars);
  if (numOutBinds === 0) {
    return;
  }
  let outBinds = new Array(numIters).fill(null);
  for (let i = 0; i < numIters; i++) {
    outBinds[i] = getOutBinds(bindVars, i);
  }
  return outBinds;
}

//---------------------------------------------------------------------------
// getNumOutBinds(sql)
//
// Get the number of outBinds for the sql
//---------------------------------------------------------------------------
function getNumOutBinds(bindVars) {
  let numOutBinds = 0;
  for (let i = 0; i < bindVars.length; i++) {
    if (bindVars[i].dir !== constants.BIND_IN) {
      numOutBinds++;
    }
  }
  return numOutBinds;
}

//---------------------------------------------------------------------------
// getExecuteOutBinds(sql)
//
// Get the outBinds for the sql when doing an execute call
//---------------------------------------------------------------------------
function getExecuteOutBinds(bindVars) {
  let numOutBinds = getNumOutBinds(bindVars);
  if (numOutBinds === 0) {
    return;
  }
  return getOutBinds(bindVars, 0);
}

//---------------------------------------------------------------------------
// cleanSql(sql)
//
// Sanitize the sql to remove comment and redundant information
//---------------------------------------------------------------------------
function cleanSql(sql) {
  sql = sql.trim();
  sql = sql.replace(/\--.*(\n|$)/g, ""); // eslint-disable-line
  sql = sql.replace(/\/\\*[\S\n ]+\\*\//g, "");
  sql = sql.replace(/\s+/g, " ");
  return sql;
}

//---------------------------------------------------------------------------
// getOutBinds(sql)
//
// Get the bind variables from the bindInfoList of the statement object
//---------------------------------------------------------------------------
function getBindVars(statement) {
  let bindVars = [];
  for (const bindInfo of statement.bindInfoList) {
    bindVars.push(bindInfo.bindVar);
  }
  return bindVars;
}

//---------------------------------------------------------------------------
// checkProxyUserValidity()
//
// Check validity status for proxy authentication
//---------------------------------------------------------------------------
function checkProxyUserValidity(userName) {
  let schemaUser = '', proxyUser = '';
  let quoteFound = false, openSquareBracketFound = false;
  let lastQuoteFoundIndex = 0;
  let schemaUserStartIndex;
  let result = {
    status       : -1,
    proxyUser    : '',
    schemaUser   : ''
  };
  const userNameLength = userName.length;
  let index = 0, i, j;
  while (index < userNameLength) {
    // check for double quotes
    if (userName.charAt(index) === '"') {
      quoteFound = !quoteFound;
      lastQuoteFoundIndex = index;
    }

    // check for open square bracket
    if (userName.charAt(index) === '[' && !quoteFound) {
      openSquareBracketFound = true;
      // skip leading space and extract proxy user name
      if (lastQuoteFoundIndex != 0) {
        for (i = lastQuoteFoundIndex + 1; i < index; i++) {
          if (userName.charAt(i) !== ' ') {
            return result;
          }
        }

        for (i = 0; i <= lastQuoteFoundIndex; i++) {
          proxyUser += userName.charAt(i);
        }
      } else {
        for (i = 0; i < index; i++) {
          if (userName.charAt(i) !== ' ') {
            proxyUser += userName.charAt(i);
          } else {
            break;
          }
        }
      }
      break;
    }
    index++;
  }

  if (proxyUser.length === 0) {
    return result;
  } else {
    result.proxyUser = proxyUser;
  }

  // extract schema user
  index = index + 1;
  quoteFound = false;
  schemaUserStartIndex = index;
  lastQuoteFoundIndex = 0;
  while (index < userNameLength) {
    // check for double quotes
    if (userName.charAt(index) === '"') {
      quoteFound = !quoteFound;
      lastQuoteFoundIndex = index;
    }

    if (userName.charAt(index) === '[' && !quoteFound &&
        openSquareBracketFound) {
      return result;
    }

    if (userName.charAt(index) === ']' && !quoteFound) {
      if (lastQuoteFoundIndex != schemaUserStartIndex &&
          lastQuoteFoundIndex != 0) {
        for (i = schemaUserStartIndex; i <= lastQuoteFoundIndex; i++) {
          schemaUser += userName.charAt(i);
        }
        // check for character between double quotes and close brackets
        for (i = lastQuoteFoundIndex + 1; i < index; i++) {
          if (userName.charAt(i) != ' ') {
            return result;
          }
        }
      } else {
        // skip trailing spaces
        for (i = schemaUserStartIndex; i < index; i++) {
          if (userName.charAt(i) != ' ') {
            break;
          }
        }
        if (i == index) {
          return result;
        }

        for (j = i; j < index; j++) {
          schemaUser += userName[j];
        }
      }

      // check for character from [ till end of string
      for (i = index + 1; i < userNameLength; i++) {
        if (userName[i] != ' ') {
          return result;
        }
      }
    }
    index++;
  }

  if (schemaUser.length === 0) {
    return result;
  } else {
    result.schemaUser = schemaUser;
  }

  result.status = 0;
  return result;
}

//---------------------------------------------------------------------------
// checkCredentials()
//
// Check Credentials for Password Authentication
//---------------------------------------------------------------------------
function checkCredentials(params) {
  if (params.token === undefined) {
    if (params.externalAuth === true) {
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED, 'External Authentication');
    }
    if (params.password === undefined) {
      errors.throwErr(errors.ERR_MISSING_CREDENTIALS);
    }
  }
}

module.exports = {
  getMetadataMany,
  cleanSql,
  getExecuteOutBinds,
  getExecuteManyOutBinds,
  getOutBinds,
  getBindVars,
  checkProxyUserValidity,
  checkCredentials
};
