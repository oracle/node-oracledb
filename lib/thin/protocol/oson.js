// Copyright (c) 2023, Oracle and/or its affiliates.

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

const { BaseBuffer, GrowableBuffer } = require('./buffer.js');
const { Buffer } = require('buffer');
const constants = require("./constants.js");
const errors = require("../../errors.js");
const types = require("../../types.js");
const util = require("util");

/**
 * Class used for decodeing
 */
class OsonDecoder extends BaseBuffer {

  //---------------------------------------------------------------------------
  // _decodeContainerNode()
  //
  // Decodes a container node (object or array) from the tree segment and
  // returns the JavaScript equivalent.
  //---------------------------------------------------------------------------
  _decodeContainerNode(nodeType) {

    // determine the number of children by examining the 4th and 5th most
    // significant bits of the node type; determine the offsets in the tree
    // segment to the field ids array and the value offsets array
    let container, offsetsPos, fieldIdsPos;
    let numChildren = this._getNumChildren(nodeType);
    const isObject = ((nodeType & 0x40) === 0);
    if (numChildren === undefined) {
      const offset = this._getOffset(nodeType);
      offsetsPos = this.pos;
      this.pos = this.treeSegPos + offset;
      const sharedNodeType = this.readUInt8();
      numChildren = this._getNumChildren(sharedNodeType);
      container = (isObject) ? {} : new Array(numChildren);
      fieldIdsPos = this.pos;
    } else if (isObject) {
      container = {};
      fieldIdsPos = this.pos;
      offsetsPos = this.pos + this.fieldIdLength * numChildren;
    } else {
      container = new Array(numChildren);
      offsetsPos = this.pos;
    }

    for (let i = 0; i < numChildren; i++) {
      let name;
      if (isObject) {
        let fieldId;
        if (this.fieldIdLength === 1) {
          fieldId = this.buf[fieldIdsPos];
        } else if (this.fieldIdLength == 2) {
          fieldId = this.buf.readUInt16BE(fieldIdsPos);
        } else {
          fieldId = this.buf.readUInt32BE(fieldIdsPos);
        }
        name = this.fieldNames[fieldId - 1];
        fieldIdsPos += this.fieldIdLength;
      }
      this.pos = offsetsPos;
      const offset = this._getOffset(nodeType);
      offsetsPos = this.pos;
      this.pos = this.treeSegPos + offset;
      if (isObject) {
        container[name] = this._decodeNode();
      } else {
        container[i] = this._decodeNode();
      }
    }

    return container;
  }

  //---------------------------------------------------------------------------
  // _decodeNode()
  //
  // Decodes a node from the tree segment and returns the JavaScript
  // equivalent.
  //---------------------------------------------------------------------------
  _decodeNode() {

    // if the most significant bit is set the node refers to a container
    const nodeType = this.readUInt8();
    if (nodeType & 0x80) {
      return this._decodeContainerNode(nodeType);
    }

    // handle simple scalars
    if (nodeType === constants.TNS_JSON_TYPE_NULL) {
      return null;
    } else if (nodeType === constants.TNS_JSON_TYPE_TRUE) {
      return true;
    } else if (nodeType === constants.TNS_JSON_TYPE_FALSE) {
      return false;

    // handle fixed length scalars
    } else if (nodeType === constants.TNS_JSON_TYPE_DATE ||
        nodeType === constants.TNS_JSON_TYPE_TIMESTAMP7) {
      return this.parseOracleDate(this.readBytes(7));
    } else if (nodeType === constants.TNS_JSON_TYPE_TIMESTAMP) {
      return this.parseOracleDate(this.readBytes(11));
    } else if (nodeType === constants.TNS_JSON_TYPE_TIMESTAMP_TZ) {
      return this.parseOracleDate(this.readBytes(13));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_FLOAT) {
      return this.parseBinaryFloat(this.readBytes(4));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_DOUBLE) {
      return this.parseBinaryDouble(this.readBytes(8));

    // handle scalars with lengths stored outside the node itself
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT8) {
      return this.readBytes(this.readUInt8()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT16) {
      return this.readBytes(this.readUInt16BE()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_STRING_LENGTH_UINT32) {
      return this.readBytes(this.readUInt32BE()).toString();
    } else if (nodeType === constants.TNS_JSON_TYPE_NUMBER_LENGTH_UINT8) {
      return parseFloat(this.readOracleNumber());
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT16) {
      return Buffer.from(this.readBytes(this.readUInt16BE()));
    } else if (nodeType === constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT32) {
      return Buffer.from(this.readBytes(this.readUInt32BE()));
    }

    // handle number/decimal with length stored inside the node itself
    const typeBits = nodeType & 0xf0;
    if (typeBits === 0x20 || typeBits === 0x60) {
      const len = nodeType & 0x0f;
      return parseFloat(this.parseOracleNumber(this.readBytes(len + 1)));

    // handle integer with length stored inside the node itself
    } else if (typeBits === 0x40 || typeBits === 0x50) {
      const len = nodeType & 0x0f;
      return parseFloat(this.parseOracleNumber(this.readBytes(len)));

    // handle string with length stored inside the node itself
    } else if ((nodeType & 0xe0) == 0) {
      if (nodeType === 0)
        return '';
      return this.readBytes(nodeType).toString();
    }

    errors.throwErr(errors.ERR_UNSUPPORTED_DATA_TYPE_IN_JSON, nodeType);
  }

  //---------------------------------------------------------------------------
  // _getNumChildren()
  //
  // Returns the number of children a container has. This is determined by
  // looking at the 4th and 5th most significant bits of the node type.
  //
  //   00 - number of children is uint8_t
  //   01 - number of children is uint16_t
  //   10 - number of children is uint32_t
  //   11 - field ids are shared with another object whose offset follows
  //
  // In the latter case the value undefined is returned and the number of
  // children must be read from the shared object at the specified offset.
  //---------------------------------------------------------------------------
  _getNumChildren(nodeType) {
    const childrenBits = (nodeType & 0x18);
    if (childrenBits === 0) {
      return this.readUInt8();
    } else if (childrenBits === 0x08) {
      return this.readUInt16BE();
    } else if (childrenBits === 0x10) {
      return this.readUInt32BE();
    }
  }

  //---------------------------------------------------------------------------
  // _getOffset()
  //
  // Returns an offset. The offset will be either a 16-bit or 32-bit value
  // depending on the value of the 3rd significant bit of the node type.
  //---------------------------------------------------------------------------
  _getOffset(nodeType) {
    if (nodeType & 0x20) {
      return this.readUInt32BE();
    } else {
      return this.readUInt16BE();
    }
  }

  //---------------------------------------------------------------------------
  // decode()
  //
  // Decodes the OSON and returns a JavaScript object corresponding to its
  // contents.
  //---------------------------------------------------------------------------
  decode() {

    // parse root header
    const magic = this.readBytes(3);
    if (magic[0] !== constants.TNS_JSON_MAGIC_BYTE_1 ||
        magic[1] !== constants.TNS_JSON_MAGIC_BYTE_2 ||
        magic[2] !== constants.TNS_JSON_MAGIC_BYTE_3) {
      errors.throwErr(errors.ERR_UNEXPECTED_DATA, magic.toString('hex'));
    }
    const version = this.readUInt8();
    if (version !== constants.TNS_JSON_VERSION) {
      errors.throwErr(errors.ERR_OSON_VERSION_NOT_SUPPORTED, version);
    }
    const flags = this.readUInt16BE();

    // scalar values are much simpler
    if (flags & constants.TNS_JSON_FLAG_IS_SCALAR) {
      if (flags & constants.TNS_JSON_FLAG_TREE_SEG_UINT32) {
        this.skipBytes(4);
      } else {
        this.skipBytes(2);
      }
      return this._decodeNode();
    }

    // determine the number of field names
    let numFieldNames;
    if (flags & constants.TNS_JSON_FLAG_NUM_FNAMES_UINT32) {
      numFieldNames = this.readUInt32BE();
      this.fieldIdLength = 4;
    } else if (flags & constants.TNS_JSON_FLAG_NUM_FNAMES_UINT16) {
      numFieldNames = this.readUInt16BE();
      this.fieldIdLength = 2;
    } else {
      numFieldNames = this.readUInt8();
      this.fieldIdLength = 1;
    }

    // determine the size of the field names segment
    let fieldNameOffsetsSize, fieldNamesSegSize;
    if (flags & constants.TNS_JSON_FLAG_FNAMES_SEG_UINT32) {
      fieldNameOffsetsSize = 4;
      fieldNamesSegSize = this.readUInt32BE();
    } else {
      fieldNameOffsetsSize = 2;
      fieldNamesSegSize = this.readUInt16BE();
    }

    // skip the size of the tree segment
    if (flags & constants.TNS_JSON_FLAG_TREE_SEG_UINT32) {
      this.skipBytes(4);
    } else {
      this.skipBytes(2);
    }

    // skip the number of "tiny" nodes
    this.skipBytes(2);

    // skip the hash id array
    let hashIdSize;
    if (flags & constants.TNS_JSON_FLAG_HASH_ID_UINT8) {
      hashIdSize = 1;
    } else if (flags & constants.TNS_JSON_FLAG_HASH_ID_UINT16) {
      hashIdSize = 2;
    } else {
      hashIdSize = 4;
    }
    this.skipBytes(numFieldNames * hashIdSize);

    // skip over the field name offsets and field names
    let fieldNameOffsetsPos = this.pos;
    this.skipBytes(numFieldNames * fieldNameOffsetsSize);
    const fieldNamesPos = this.pos;
    this.skipBytes(fieldNamesSegSize);

    // determine the names of the fields
    this.fieldNames = new Array(numFieldNames);
    for (let i = 0; i < numFieldNames; i++) {
      let offset = fieldNamesPos;
      if (flags & constants.TNS_JSON_FLAG_FNAMES_SEG_UINT32) {
        offset += this.buf.readUInt32BE(fieldNameOffsetsPos);
        fieldNameOffsetsPos += 4;
      } else {
        offset += this.buf.readUInt16BE(fieldNameOffsetsPos);
        fieldNameOffsetsPos += 2;
      }
      const len = this.buf[offset];
      const name = this.buf.subarray(offset + 1, offset + len + 1).toString();
      this.fieldNames[i] = name;
    }

    // determine tree segment position in the buffer
    this.treeSegPos = this.pos;

    // decode the root node
    return this._decodeNode();
  }

}

class OsonFieldName {

  constructor(name) {
    this.name = name;
    this.nameBytes = Buffer.from(name);
    if (this.nameBytes.length > 255) {
      errors.throwErr(errors.ERR_OSON_FIELD_NAME_LIMITATION);
    }
    this.hashId = BigInt(0x811C9DC5);
    const multiplier = BigInt(16777619);
    const mask = BigInt(0xffffffff);
    for (let i = 0; i < this.nameBytes.length; i++) {
      const c = BigInt(this.nameBytes[i]);
      this.hashId = ((this.hashId ^ c) * multiplier) & mask;
    }
    this.hashId = Number(this.hashId) & 0xff;
  }

}

class OsonFieldNamesSegment extends GrowableBuffer {

  constructor(value) {
    super();
    this.fieldNamesMap = new Map();
    this.fieldNames = [];
    this._examineNode(value);
    this._processFieldNames();
  }

  //---------------------------------------------------------------------------
  // _exmaineNode()
  //
  // Examines the value. If it contains fields, unique names are retained. The
  // values are then examined to see if they also contain fields. Arrays are
  // examined to determine they contain elements that contain fields.
  //---------------------------------------------------------------------------
  _examineNode(value) {
    if (Array.isArray(value)) {
      for (let element of value) {
        this._examineNode(element);
      }
    } else if (value && Array.isArray(value.fields)) {
      for (let i = 0; i < value.fields.length; i++) {
        const name = value.fields[i];
        const element = value.values[i];
        if (!this.fieldNamesMap.has(name)) {
          const fieldName = new OsonFieldName(name);
          this.fieldNamesMap.set(name, fieldName);
          this.fieldNames.push(fieldName);
          fieldName.offset = this.pos;
          this.writeUInt8(fieldName.nameBytes.length);
          this.writeBytes(fieldName.nameBytes);
        }
        this._examineNode(element);
      }
    }
  }

  //---------------------------------------------------------------------------
  // _processFieldNames()
  //
  // Processes the field names in preparation for encoding within OSON.
  //---------------------------------------------------------------------------
  _processFieldNames() {
    this.fieldNames.sort((a, b) => {
      if (a.hashId < b.hashId)
        return -1;
      if (a.hashId > b.hashId)
        return 1;
      if (a.nameBytes.length < b.nameBytes.length)
        return -1;
      if (a.nameBytes.length > b.nameBytes.length)
        return 1;
      if (a.name < b.name)
        return -1;
      if (a.name > b.name)
        return 1;
      return 0;
    });
    for (let i = 0; i < this.fieldNames.length; i++) {
      this.fieldNames[i].fieldId = i + 1;
    }
    if (this.fieldNames.length < 256) {
      this.fieldIdSize = 1;
    } else if (this.fieldNames.length < 65536) {
      this.fieldIdSize = 2;
    } else {
      this.fieldIdSize = 4;
    }
  }

}

class OsonTreeSegment extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // _encodeArray()
  //
  // Encodes an array in the OSON tree segment.
  //---------------------------------------------------------------------------
  _encodeArray(value, fnamesSeg) {
    this._encodeContainer(constants.TNS_JSON_TYPE_ARRAY, value.length);
    let offsetsBufPos = 0;
    const offsetsBuf = this.reserveBytes(value.length * 4);
    for (let element of value) {
      offsetsBuf.writeUInt32BE(this.pos, offsetsBufPos);
      offsetsBufPos += 4;
      this.encodeNode(element, fnamesSeg);
    }
  }

  //---------------------------------------------------------------------------
  // _encodeContainer()
  //
  // Encodes the first part of a container (array or object) in the OSON tree
  // segment.
  //---------------------------------------------------------------------------
  _encodeContainer(nodeType, numChildren) {
    nodeType |= 0x20;                   // use uint32_t for offsets
    if (numChildren > 65535) {
      nodeType |= 0x10;                 // num children is uint32_t
    } else if (numChildren > 255) {
      nodeType |= 0x08;                 // num children is uint16_t
    }
    this.writeUInt8(nodeType);
    if (numChildren < 256) {
      this.writeUInt8(numChildren);
    } else if (numChildren < 65536) {
      this.writeUInt16BE(numChildren);
    } else {
      this.writeUInt32BE(numChildren);
    }
  }

  //---------------------------------------------------------------------------
  // _encodeObject()
  //
  // Encodes an object in the OSON tree segment.
  //---------------------------------------------------------------------------
  _encodeObject(value, fnamesSeg) {
    const numChildren = value.values.length;
    this._encodeContainer(constants.TNS_JSON_TYPE_OBJECT, numChildren);
    let fieldIdOffset = 0;
    let valueOffset = numChildren * fnamesSeg.fieldIdSize;
    const buf = this.reserveBytes(numChildren * (fnamesSeg.fieldIdSize + 4));
    for (let i = 0; i < value.fields.length; i++) {
      const fieldName = fnamesSeg.fieldNamesMap.get(value.fields[i]);
      if (fnamesSeg.fieldIdSize == 1) {
        buf[fieldIdOffset] = fieldName.fieldId;
      } else if (fnamesSeg.fieldIdSize == 2) {
        buf.writeUInt16BE(fieldName.fieldId, fieldIdOffset);
      } else {
        buf.writeUInt32BE(fieldName.fieldId, fieldIdOffset);
      }
      buf.writeUInt32BE(this.pos, valueOffset);
      fieldIdOffset += fnamesSeg.fieldIdSize;
      valueOffset += 4;
      this.encodeNode(value.values[i], fnamesSeg);
    }
  }

  //---------------------------------------------------------------------------
  // encodeNode()
  //
  // Encodes a value (node) in the OSON tree segment.
  //---------------------------------------------------------------------------
  encodeNode(value, fnamesSeg) {

    // handle null
    if (value === undefined || value === null) {
      this.writeUInt8(constants.TNS_JSON_TYPE_NULL);

    // handle booleans
    } else if (typeof value === 'boolean') {
      if (value) {
        this.writeUInt8(constants.TNS_JSON_TYPE_TRUE);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_FALSE);
      }

    // handle numbers
    } else if (typeof value === 'number') {
      this.writeUInt8(constants.TNS_JSON_TYPE_NUMBER_LENGTH_UINT8);
      this.writeOracleNumber(value.toString());

    // handle strings
    } else if (typeof value === 'string') {
      const buf = Buffer.from(value);
      if (buf.length < 256) {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT8);
        this.writeUInt8(buf.length);
      } else if (buf.length < 65536) {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT16);
        this.writeUInt16BE(buf.length);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_STRING_LENGTH_UINT32);
        this.writeUInt32BE(buf.length);
      }
      if (buf.length > 0) {
        this.writeBytes(buf);
      }

    // handle dates
    } else if (util.isDate(value)) {
      if (value.getUTCMilliseconds() === 0) {
        this.writeUInt8(constants.TNS_JSON_TYPE_TIMESTAMP7);
        this.writeOracleDate(value, types.DB_TYPE_DATE, false);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_TIMESTAMP);
        this.writeOracleDate(value, types.DB_TYPE_TIMESTAMP, false);
      }

    // handle buffers
    } else if (Buffer.isBuffer(value)) {
      if (value.length < 65536) {
        this.writeUInt8(constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT16);
        this.writeUInt16BE(value.length);
      } else {
        this.writeUInt8(constants.TNS_JSON_TYPE_BINARY_LENGTH_UINT32);
        this.writeUInt32BE(value.length);
      }
      this.writeBytes(value);

    // handle arrays
    } else if (Array.isArray(value)) {
      this._encodeArray(value, fnamesSeg);

    // handle objects
    } else {
      this._encodeObject(value, fnamesSeg);
    }

  }

}

class OsonEncoder extends GrowableBuffer {

  //---------------------------------------------------------------------------
  // encode()
  //
  // Encodes the value as OSON and returns a buffer containing the OSON bytes.
  //---------------------------------------------------------------------------
  encode(value) {

    // determine flags to use
    let fnamesSeg;
    let flags = constants.TNS_JSON_FLAG_INLINE_LEAF;
    if (Array.isArray(value) || (value && Array.isArray(value.fields))) {
      flags |= constants.TNS_JSON_FLAG_HASH_ID_UINT8 |
        constants.TNS_JSON_FLAG_TINY_NODES_STAT;
      fnamesSeg = new OsonFieldNamesSegment(value);
      if (fnamesSeg.fieldNames.length > 65535) {
        flags |= constants.TNS_JSON_FLAG_NUM_FNAMES_UINT32;
      } else if (fnamesSeg.fieldNames.length > 255) {
        flags |= constants.TNS_JSON_FLAG_NUM_FNAMES_UINT16;
      }
      if (fnamesSeg.pos > 65535) {
        flags |= constants.TNS_JSON_FLAG_FNAMES_SEG_UINT32;
      }
    } else {
      flags |= constants.TNS_JSON_FLAG_IS_SCALAR;
    }

    // encode values into the tree segment
    const treeSeg = new OsonTreeSegment();
    treeSeg.encodeNode(value, fnamesSeg);
    if (treeSeg.pos > 65535) {
      flags |= constants.TNS_JSON_FLAG_TREE_SEG_UINT32;
    }

    // write initial header
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_1);
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_2);
    this.writeUInt8(constants.TNS_JSON_MAGIC_BYTE_3);
    this.writeUInt8(constants.TNS_JSON_VERSION);
    this.writeUInt16BE(flags);

    // write extended header (when value is not scalar)
    if (fnamesSeg) {

      // write number of field names
      if (fnamesSeg.fieldNames.length < 256) {
        this.writeUInt8(fnamesSeg.fieldNames.length);
      } else if (fnamesSeg.fieldNames.length < 65536) {
        this.writeUInt16BE(fnamesSeg.fieldNames.length);
      } else {
        this.writeUInt32BE(fnamesSeg.fieldNames.length);
      }

      // write size of field names segment
      if (fnamesSeg.pos < 65536) {
        this.writeUInt16BE(fnamesSeg.pos);
      } else {
        this.writeUInt32BE(fnamesSeg.pos);
      }

    }

    // write size of tree segment
    if (treeSeg.pos < 65536) {
      this.writeUInt16BE(treeSeg.pos);
    } else {
      this.writeUInt32BE(treeSeg.pos);
    }

    // write remainder of header and any data (when value is not scalar)
    if (fnamesSeg) {

      // write number of "tiny" nodes (always zero)
      this.writeUInt16BE(0);

      // write array of hash ids
      for (let fieldName of fnamesSeg.fieldNames) {
        this.writeUInt8(fieldName.hashId);
      }

      // write array of field name offsets
      for (let fieldName of fnamesSeg.fieldNames) {
        if (fnamesSeg.pos < 65536) {
          this.writeUInt16BE(fieldName.offset);
        } else {
          this.writeUInt32BE(fieldName.offset);
        }
      }

      // write field names
      if (fnamesSeg.pos > 0) {
        this.writeBytes(fnamesSeg.buf.subarray(0, fnamesSeg.pos));
      }

    }

    // write tree segment data
    this.writeBytes(treeSeg.buf.subarray(0, treeSeg.pos));

    return this.buf.subarray(0, this.pos);
  }

}

module.exports = {
  OsonDecoder,
  OsonEncoder
};
