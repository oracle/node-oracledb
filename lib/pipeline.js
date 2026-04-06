// Copyright (c) 2026, Oracle and/or its affiliates.

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

const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const settings = require('./settings.js');

class Pipeline {
  constructor() {
    this.operations = []; // operations in pipeline.
  }

  _validExecOptions = [
    'autoCommit', 'fetchArraySize', 'maxRows', 'outFormat', 'prefetchRows'
  ];

  _validExecManyOptions = [...this._validExecOptions, 'bindDefs'];

  _checkOptions(opts, validOptions) {
    if (opts && typeof opts === 'object') {
      for (const [k,] of Object.entries(opts)) {
        if (!validOptions.includes(k))
          errors.throwErr(errors.ERR_PIPELINE_EXEC_OPTION_NOT_SUPPORTED, k);
      }
    }
  }

  _addOperation(opType, data = {}) {
    if (['execute', 'fetchOne', 'fetchMany', 'fetchAll'].includes(opType))
      this._checkOptions(data.options, this._validExecOptions);
    else if (opType === 'executeMany')
      this._checkOptions(data.options, this._validExecManyOptions);
    this.operations.push({ opType, ...data });
  }

  addExecute(statement, parameters = [], options = {}) {
    errors.assertParamValue(nodbUtil.isObject(options), 3);
    this._addOperation('execute', { statement, parameters, options });
  }

  addExecuteMany(statement, parameters, options = {}) {
    errors.assertParamValue(nodbUtil.isObject(options), 3);
    this._addOperation('executeMany', { statement, parameters, options });
  }

  addFetchOne(statement, parameters = [], options = {}, fetchLobs = true) {
    errors.assertParamValue(nodbUtil.isObject(options), 3);
    options.prefetchRows = options.prefetchRows ?? 1;
    options.fetchArraySize = options.fetchArraySize ?? 1;
    errors.assertParamValue(typeof fetchLobs === 'boolean', 4);
    this._addOperation('fetchOne', { statement, parameters, options,
      fetchLobs});
  }

  addFetchMany(statement, parameters = [], options = {},
    numRows = settings.fetchArraySize, fetchLobs = true) {
    errors.assertParamValue(nodbUtil.isObject(options), 3);
    options.prefetchRows = options.prefetchRows ?? numRows;
    if (numRows > 0)
      options.fetchArraySize = options.fetchArraySize ?? numRows;
    errors.assertParamValue(Number.isInteger(numRows) && numRows >= 0, 4);
    errors.assertParamValue(typeof fetchLobs === 'boolean', 5);
    this._addOperation('fetchMany', { statement, parameters, options,
      numRows, fetchLobs});
  }

  addFetchAll(statement, parameters = [], options = {},
    fetchArraySize, fetchLobs) {
    errors.assertParamValue(nodbUtil.isObject(options), 3);
    fetchArraySize = fetchArraySize ?? options.fetchArraySize ??
      settings.fetchArraySize;
    options.prefetchRows = options.prefetchRows ?? fetchArraySize;
    options.fetchArraySize = fetchArraySize;
    fetchLobs = fetchLobs ?? true;
    errors.assertParamValue(Number.isInteger(fetchArraySize) &&
    fetchArraySize > 0, 4);
    errors.assertParamValue(typeof fetchLobs === 'boolean', 5);
    this._addOperation('fetchAll', { statement, parameters, options,
      fetchArraySize, fetchLobs});
  }

  addCommit() {
    this._addOperation('commit', {});
  }

}

module.exports = Pipeline;
