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

const { NavAddress, NavAddressList, NavDescription, NavDescriptionList } = require("./navNodes.js");
const { createNVPair } = require("./nvStrToNvPair.js");



/**
 * Class that holds all possible attributes under Description
 */
class ConnectDescription {
  constructor() {
    this.cOpts = new Array();
  }

  addConnectOption(opt) {
    this.cOpts.push(opt);
  }

  getConnectOptions() {
    return this.cOpts;
  }

}

/**
 * Class that holds a list of possible connection options.
 */
class ConnStrategy {
  constructor() {
    this.nextOptToTry = 0;
    this.retryCount = 0;
    this.lastRetryCounter = 0;
    this.lastRetryConnectDescription = 0;
    this.currentDescription = null;
    this.descriptionList = new Array();
    this.sBuf = new Array();
  }

  hasMoreOptions() {
    let cOptsSize = 0;

    for (let i = 0; i < this.descriptionList.length; ++i) {
      cOptsSize += this.descriptionList[i].getConnectOptions().length;
    }
    return (this.nextOptToTry < cOptsSize);
  }

  newConnectionDescription() {
    this.currentDescription = new ConnectDescription();
    return this.currentDescription;
  }

  getcurrentDescription() {
    return this.currentDescription;
  }

  closeDescription() {
    this.descriptionList.push(this.currentDescription);
    this.currentDescription = null;
  }
  /**
  * Execute the Connection Options from the array.  When a refuse packet is received from
  * server this method is called again and the next connect option is tried.
  */
  async execute(config) {
    /* Check for retryCount in the config if no retryCount exists in the description string */
    if (config != null) {
      if (this.retryCount == 0 && config.retryCount > 0) {
        this.retryCount = config.retryCount;
      }
    }
    /* We try the address list at least once and upto (1 + retryCount) times */
    for (let d = this.lastRetryConnectDescription; d < this.descriptionList.length; d++) {
      let desc = this.descriptionList[d];
      let cOpts = new Array();
      cOpts = desc.getConnectOptions();
      let delay = desc.delayInMillis;
      /* check for retryDelay in config if it doesn't exist in description string */
      if (config != null) {
        if ((delay == 0 || delay == undefined) && config.retryDelay > 0) {
          delay = config.retryDelay * 1000;
        }
      }
      for (let i = this.lastRetryCounter; i <= this.retryCount; ++i) {
        while (this.nextOptToTry < cOpts.length) {
          let copt = cOpts[this.nextOptToTry];
          this.lastRetryCounter = i;
          this.lastRetryConnectDescription = d;
          this.nextOptToTry++;
          return copt;
        }
        this.nextOptToTry = 0;
        // if we reached here then we are retrying other descriptor
        if (delay > 0 && i < this.retryCount) {
          await sleep(delay);
        }// end of (delay > 0)

      }// end of for(lastRetryCounter..retryCount)
      this.lastRetryCounter = 0; // reset after one description is completed
    }
    // if we get here, all options were tried and none are valid
    this.nextOptToTry = 1000;
    this.lastRetryCounter = 1000;
    throw new Error("All options tried");
  }
  // sleep time expects milliseconds


}
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}


/**
 * create different nodes (schemaobject) as per the given input.
 * @param {string} str - input description string
 * @returns {object} - returns a connection strategy object.
 */
async function createNode(str) {
  let nvpair;
  if (typeof str === 'string')
    nvpair = createNVPair(str);
  else
    nvpair = str; //Already a NVPair

  let arg = nvpair.name.toUpperCase();
  let navobj = null;
  switch (arg) {
    case "ADDRESS":
      navobj = new NavAddress();
      break;
    case "ADDRESS_LIST":
      navobj = new NavAddressList();
      break;
    case "DESCRIPTION":
      navobj = new NavDescription();
      break;
    case "DESCRIPTION_LIST":
      navobj = new NavDescriptionList();
      break;
  }
  navobj.initFromNVPair(nvpair);
  let cs = new ConnStrategy();
  await navobj.navigate(cs);
  return cs;
}
module.exports = { createNode };
