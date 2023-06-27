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

const {createNVPair, findValue} = require("./nvStrToNvPair.js");
const fs = require('fs');
const process = require('process');
const readline = require('readline');
const errors = require("../../errors.js");

/**
 * Returns File path of the tnsnames.ora if it exists.
 */
function tnsnamesFilePath(configDir) {
  let filePathVal = null;
  let tnsAdminVal = process.env.TNS_ADMIN;
  if (configDir) {
    filePathVal = configDir + '/tnsnames.ora';
    if (fs.existsSync(filePathVal)) {
      return filePathVal;
    } else {
      errors.throwErr(errors.ERR_TNS_NAMES_FILE_MISSING, configDir);
    }
  } else {
    if (!tnsAdminVal) {
      errors.throwErr(errors.ERR_NO_CONFIG_DIR);
    } else {
      filePathVal = tnsAdminVal;
      filePathVal += '/tnsnames.ora';
      if (!fs.existsSync(filePathVal)) {
        errors.throwErr(errors.ERR_TNS_NAMES_FILE_MISSING, tnsAdminVal);
      }
    }
    return filePathVal;
  }
}

let prevmtime = 0;

class NLParamParser {
  /**
 * Reads the given file line by line and stores the
 * network service names mapped to connect descriptors in the hashtable.
 * @param {string} file_path
 * @returns {Promise}
 */
  async initializeNlpa(file_path) {
    let stat = fs.statSync(file_path);

    if (!(stat.mtime - prevmtime)) {
      /* File has been read */
      return this.ht;
    }

    // Creating a readable stream from file
    // readline module reads line by line
    // but from a readable stream only.
    const file = readline.createInterface({
      input: fs.createReadStream(file_path),
      output: process.stdout,
      terminal: false
    });
    this.ht = new Map();

    const start = async () =>{
      let nvElem = "";
      for await (let line of file) {
        if (line.length == 0) {   // ignore empty lines
          continue;
        } else if (line[0] == '#') {  // comment line
          continue;
        } else if ((line[0] == ' ') ||    // continued input on new line
                    (line[0] == '\t') ||
                    (line[0] == ')') ||
                    (line[0] == '(')) {
          line = line.replace(/\s+/g, '');
          line = this.checkNLPforComments(line);
          if (line.length == 0)
            continue;
          else {
            nvElem = nvElem + line;
          }

        } else {  // new NV Element starting here
          if (nvElem.length == 0) {

            line = this.checkNLPforComments(line);
            nvElem = nvElem + line;

          } else if (nvElem.length != 0) {
            this.addNLPListElement(nvElem); // Add Parameter to Hashtable
            nvElem = ""; // Clear first, before storing current line

            line = this.checkNLPforComments(line);
            nvElem = nvElem + line;
          }
        }
      }
      if (nvElem.length != 0) { // at eof, still one more parameter to read
        this.addNLPListElement(nvElem);
        nvElem = "";      // clear nvElem buffer after added
      }
      prevmtime = stat.mtime;
      return this.ht;
    };
    return await start();
  }

  /**
   * Given a string, this method looks if the '#' character is present.
   * If true, the line is truncated from that point onwards until the end
   * of the line; else, the original line is returned unchanged.
   *
   * @param  str     The String that is going to be tested for inline comments
   * @return String  The modified String returned
   */
  checkNLPforComments(str) {
    let str1 = new Array(str.length);

    for (let i = 0; i < str.length; i++) {
      let current_char = str[i];
      if (current_char == '#') {
        if (i != 0) {
          break; // No need to continue. Return the line
        } else {
          // Entire line is a comment
          return "";
        }
      } else
        str1.push(current_char);
    }
    return str1.join('');
  }
  /**
    * adds name value pairs from the input buffer into the hash table.
    * @param {string} ibuf
    */
  addNLPListElement(ibuf) {
    let res = ibuf.split(/\r?\n/).filter(element => element);
    for (let i = 0; i < res.length; i++) {
      if (res[i].charAt(0) != '(') {
        res[i] = '(' + res[i] + ')';
      }
      let nvp = createNVPair(res[i]);
      let name = nvp.name;
      let uname = name.toUpperCase();
      nvp.name = uname;
      const unames = uname.split(","); //multiple aliases (alias1, alias2, alias3)
      for (let i = 0; i < unames.length; i++) {
        this.ht.set(unames[i], nvp);
      }
    }
  }


  toString() {
    let out = "";
    this.ht.forEach((value) => {
      out = out + value.toString() + "\n";
    });
    return out;
  }
  /**
    * if key is address/port then it returns the port value from the
    * address NVPAIR.
    * @param {string} key
    * @returns {string}
   */
  findValueOf(key) {
    let myarr = key.split('/');
    return (findValue(this.ht.get(myarr[0].toUpperCase()), myarr));
  }

}

module.exports = {
  NLParamParser,
  tnsnamesFilePath
};
