// Copyright (c) 2019, 2023, Oracle and/or its affiliates.

//----------------------------------------------------------------------------
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

const Lob = require('./lob.js');
const impl = require('./impl');
const errors = require('./errors.js');
const types = require('./types.js');
const util = require('util');

// define base database object class; instances of this class are never
// instantiated; instead, classes subclassed from this one will be
// instantiated; a cache of these classes are maintained on each connection
class BaseDbObject {

  //---------------------------------------------------------------------------
  // _getAttrValue()
  //
  // Returns the value of the given attribute on the object.
  //---------------------------------------------------------------------------
  _getAttrValue(attr) {
    const value = this._impl.getAttrValue(attr);
    return this._transformValueOut(value, attr.typeClass);
  }

  //---------------------------------------------------------------------------
  // _setAttrValue()
  //
  // Sets the value of the attribute on the object to the given value.
  //---------------------------------------------------------------------------
  _setAttrValue(attr, value) {
    const info = {
      fqn: this._objType.fqn,
      attrName: attr.name,
      type: attr.type,
      typeClass: attr.typeClass
    };
    const options = {allowArray: false};
    value = transformer.transformValueIn(info, value, options);
    this._impl.setAttrValue(attr, value);
  }

  //---------------------------------------------------------------------------
  // _toPojo()
  //
  // Returns the database object as a plain Javascript object.
  //---------------------------------------------------------------------------
  _toPojo() {
    if (this.isCollection) {
      const result = this.getValues();
      if (this.elementType === types.DB_TYPE_OBJECT) {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i]._toPojo();
        }
      }
      return (result);
    }
    const result = {};
    for (const name in this.attributes) {
      let value = this[name];
      if (value instanceof BaseDbObject) {
        value = value._toPojo();
      }
      result[name] = value;
    }
    return (result);
  }

  //---------------------------------------------------------------------------
  // _transformValueOut()
  //
  // Transforms a value going out to the caller from the implementation.
  //---------------------------------------------------------------------------
  _transformValueOut(value, cls) {
    let outValue = value;
    if (value instanceof impl.LobImpl) {
      outValue = new Lob();
      outValue._setup(value, true);
    } else if (value instanceof impl.DbObjectImpl) {
      outValue = Object.create(cls.prototype);
      outValue._impl = value;
      if (outValue.isCollection) {
        outValue = new Proxy(outValue, BaseDbObject._collectionProxyHandler);
      }
    }
    return outValue;
  }

  //---------------------------------------------------------------------------
  // append()
  //
  // Appends an element to the collection.
  //---------------------------------------------------------------------------
  append(value) {
    errors.assertArgCount(arguments, 1, 1);
    const info = {
      fqn: this._objType.fqn,
      type: this._objType.elementType,
      typeClass: this._objType.elementTypeClass
    };
    const options = {allowArray: false};
    value = transformer.transformValueIn(info, value, options);
    this._impl.append(value);
  }

  //---------------------------------------------------------------------------
  // attributes
  //
  // Property for the attributes stored on the object type.
  //---------------------------------------------------------------------------
  get attributes() {
    if (!this._attributes) {
      const implAttrs = this._objType.attributes || [];
      const attrs = {};
      for (let i = 0; i < implAttrs.length; i++) {
        const implAttr = implAttrs[i];
        const attr = {
          type: implAttr.type,
          typeName: implAttr.typeName
        };
        if (implAttr.typeClass) {
          attr.typeClass = implAttr.typeClass;
        }
        attrs[implAttr.name] = attr;
      }
      this._attributes = attrs;
    }
    return this._attributes;
  }

  //---------------------------------------------------------------------------
  // deleteElement()
  //
  // Deletes the element in a collection at the specified index.
  //---------------------------------------------------------------------------
  deleteElement(index) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(index), 1);
    return this._impl.deleteElement(index);
  }

  //---------------------------------------------------------------------------
  // elementType
  //
  // Property for the element type, if the database object type is a
  // collection. It will be one of the DB_TYPE_ constants.
  //---------------------------------------------------------------------------
  get elementType() {
    return this._objType.elementType;
  }

  //---------------------------------------------------------------------------
  // elementTypeClass
  //
  // Property for the element type class, if the database object type is a
  // collection and the elements in the collection refer to database objects.
  //---------------------------------------------------------------------------
  get elementTypeClass() {
    return this._objType.elementTypeClass;
  }

  //---------------------------------------------------------------------------
  // elementTypeName
  //
  // Property for the element type name, if the database object type is a
  // collection.
  //---------------------------------------------------------------------------
  get elementTypeName() {
    return this._objType.elementTypeName;
  }

  //---------------------------------------------------------------------------
  // fqn
  //
  // Property for the fully qualified name of the database object type in the
  // form: <schema>.<name>.
  //---------------------------------------------------------------------------
  get fqn() {
    return this._objType.fqn;
  }

  //---------------------------------------------------------------------------
  // getElement()
  //
  // Returns the element in a collection at the specified index.
  //---------------------------------------------------------------------------
  getElement(index) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(index), 1);
    const value = this._impl.getElement(index);
    return this._transformValueOut(value, this.elementTypeClass);
  }

  //---------------------------------------------------------------------------
  // getKeys()
  //
  // Returns an array of the keys of the collection.
  //---------------------------------------------------------------------------
  getKeys() {
    errors.assertArgCount(arguments, 0, 0);
    return this._impl.getKeys();
  }

  //---------------------------------------------------------------------------
  // getFirstIndex()
  //
  // Returns the first index in the collection.
  //---------------------------------------------------------------------------
  getFirstIndex() {
    errors.assertArgCount(arguments, 0, 0);
    return this._impl.getFirstIndex();
  }

  //---------------------------------------------------------------------------
  // getLastIndex()
  //
  // Returns the last index in the collection.
  //---------------------------------------------------------------------------
  getLastIndex() {
    errors.assertArgCount(arguments, 0, 0);
    return this._impl.getLastIndex();
  }

  //---------------------------------------------------------------------------
  // getNextIndex()
  //
  // Returns the next index in the collection.
  //---------------------------------------------------------------------------
  getNextIndex(index) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(index), 1);
    return this._impl.getNextIndex(index);
  }

  //---------------------------------------------------------------------------
  // getPrevIndex()
  //
  // Returns the previous index in the collection.
  //---------------------------------------------------------------------------
  getPrevIndex(index) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(index), 1);
    return this._impl.getPrevIndex(index);
  }

  //---------------------------------------------------------------------------
  // getValues()
  //
  // Returns the elements in a collection.
  //---------------------------------------------------------------------------
  getValues() {
    errors.assertArgCount(arguments, 0, 0);
    const values = this._impl.getValues();
    for (let i = 0; i < values.length; i++) {
      values[i] = this._transformValueOut(values[i], this.elementTypeClass);
    }
    return values;
  }

  //---------------------------------------------------------------------------
  // hasElement()
  //
  // Returns a boolean indicating if an element exists at the specified index.
  //---------------------------------------------------------------------------
  hasElement(index) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(index), 1);
    return this._impl.hasElement(index);
  }

  //---------------------------------------------------------------------------
  // isCollection
  //
  // Property indicating if the object is a collection or not.
  //---------------------------------------------------------------------------
  get isCollection() {
    return this._objType.isCollection;
  }

  //---------------------------------------------------------------------------
  // name
  //
  // Property for the name of the database object type.
  //---------------------------------------------------------------------------
  get name() {
    return this._objType.name;
  }

  //---------------------------------------------------------------------------
  // schema
  //
  // Property for the schema of the database object type.
  //---------------------------------------------------------------------------
  get schema() {
    return this._objType.schema;
  }

  //---------------------------------------------------------------------------
  // packageName
  //
  // Property for the packageName of the database object type.
  //---------------------------------------------------------------------------
  get packageName() {
    return this._objType.packageName;
  }

  //---------------------------------------------------------------------------
  // setElement()
  //
  // Sets the element in the collection at the specified index to the given
  // value.
  //---------------------------------------------------------------------------
  setElement(index, value) {
    errors.assertArgCount(arguments, 2, 2);
    errors.assertParamValue(Number.isInteger(index), 1);
    const info = {
      fqn: this._objType.fqn,
      type: this._objType.elementType,
      typeClass: this._objType.elementTypeClass
    };
    const options = {allowArray: false};
    value = transformer.transformValueIn(info, value, options);
    this._impl.setElement(index, value);
  }

  //---------------------------------------------------------------------------
  // trim()
  //
  // Trims the specified number of elements from the end of the collection.
  //---------------------------------------------------------------------------
  trim(numToTrim) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(numToTrim) && numToTrim >= 0, 1);
    this._impl.trim(numToTrim);
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

// method for transforming the error
function transformErr(func) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (err) {
      throw errors.transformErr(err, errors.transformErr);
    }
  };
}

// method for wrapping the functions so that any errors thrown are transformed
function wrapFns(proto) {
  for (let i = 1; i < arguments.length; i++) {
    const name = arguments[i];
    proto[name] = transformErr(proto[name]);
  }
}

wrapFns(BaseDbObject.prototype,
  "_getAttrValue",
  "_setAttrValue",
  "append",
  "deleteElement",
  "getElement",
  "getKeys",
  "getFirstIndex",
  "getLastIndex",
  "getNextIndex",
  "getPrevIndex",
  "getValues",
  "hasElement",
  "setElement",
  "trim"
);

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

// load this after the module exports are set so that it is available
const transformer = require('./transformer.js');
