// Copyright (c) 2019, 2021, Oracle and/or its affiliates.  All rights reserved.
//
//----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const util = require('util');

// define base database object class; instances of this class are never
// instantiated; instead, classes subclassed from this one will be
// instantiated; a cache of these classes are maintained on each connection
class BaseDbObject {

  // extend class with promisified functions
  _extend(oracledb) {
    this._oracledb = oracledb;
  }

  // initialize object with value
  _initialize(initialValue) {
    if (this.isCollection) {
      for (let i = 0; i < initialValue.length; i++) {
        this.append(initialValue[i]);
      }
    } else {
      Object.assign(this, initialValue);
    }
  }

  // return as a plain object
  _toPojo() {
    if (this.isCollection) {
      const result = this.getValues();
      if (this.elementType == this._oracledb.DB_TYPE_OBJECT) {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i]._toPojo();
        }
      }
      return (result);
    }
    const result = {};
    for (let name in this.attributes) {
      let value = this[name];
      if (value instanceof BaseDbObject) {
        value = value._toPojo();
      }
      result[name] = value;
    }
    return (result);
  }

  // custom inspection routine
  [util.inspect.custom](depth, options) {
    return ('[' + this.fqn + '] ' + util.inspect(this._toPojo(), options));
  }

  [Symbol.iterator]() {
    if (this.isCollection) {
      const values = this.getValues();
      return (values[Symbol.iterator]());
    }
    throw TypeError("obj is not iterable");
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number':
        return (NaN);
      default:
        return ('[' + this.fqn + '] ' + util.inspect(this._toPojo(), {}));
    }
  }

  get [Symbol.toStringTag]() {
    return (this.fqn);
  }

  toJSON() {
    return (this._toPojo());
  }

}


// define proxy handler used for collections
BaseDbObject._collectionProxyHandler = {

  deleteProperty(target, prop) {
    if (typeof prop === 'string') {
      const index = +prop;
      if (!isNaN(index)) {
        return (target.deleteElement(index));
      }
    }
    return (delete target[prop]);
  },

  get(target, prop) {
    if (typeof prop === 'string') {

      // when binding collections, we must be consistent in getting the target
      // of the proxy, since napi_wrap() called on the proxy will not be
      // available when calling napi_unwrap() on the target; this property
      // forces the target to get returned
      if (prop === '_target') {
        return (target);
      }
      const index = +prop;
      if (!isNaN(index)) {
        return (target.getElement(index));
      }
    }
    const value = target[prop];
    if (typeof value === 'function') {
      return (value.bind(target));
    }
    return (value);
  },

  set(target, prop, value) {
    if (typeof prop === 'string') {
      const index = +prop;
      if (!isNaN(index)) {
        target.setElement(index, value);
        return (true);
      }
    }
    target[prop] = value;
    return (true);
  }

};


module.exports = BaseDbObject;
