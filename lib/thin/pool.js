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

const PoolImpl = require('../impl/pool.js');
const ThinConnectionImpl = require('./connection.js');
const protocolUtil = require('./protocol/utils.js');
const errors = require('../errors.js');
const settings = require('../settings.js');
const util = require('../util.js');
const thinUtil = require('./util.js');
const {getConnectionInfo} = require('./sqlnet/networkSession.js');
const crypto = require('crypto');
const EventEmitter = require('events');

class ThinPoolImpl extends PoolImpl {

  _init(params) {
    if (!params.homogeneous) {
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED, 'Heterogeneous Pooling');
    }
    thinUtil.checkCredentials(params);

    this._availableObjects = [];
    this._name = 'node-thin';
    this._poolMin = params.poolMin;
    this._poolMax = params.poolMax;
    this._poolIncrement = params.poolIncrement;
    this._poolTimeout = params.poolTimeout;
    this._poolPingInterval = params.poolPingInterval;
    this._stmtCacheSize = params.stmtCacheSize;

    // The user Config filterd from common layer is cached except
    // sensitive data as sensitive data is obfuscated in the pool
    // and de-obfuscated as necessary.
    this._userConfig = params;
    this._freeConnectionList = [];
    this._usedConnectionList = new Set();
    this._password = params.password;
    this._walletPassword = params.walletPassword;
    this._obfuscatedPassword = [];
    this._obfuscatedWalletPassword = [];
    this._token = params.token;
    this._obfuscatedToken = [];
    this._privateKey = params.privateKey;
    this._obfuscatedPrivateKey = [];
    this._schedulerJob = null;
    // password obfuscation
    if (this._password !== undefined) {
      let obj = protocolUtil.setObfuscatedValue(this._password);
      this._password = obj.value;
      this._obfuscatedPassword = obj.obfuscatedValue;
      this._userConfig.password = null;
    }
    // wallet password obfuscation
    if (this._walletPassword !== undefined) {
      let obj = protocolUtil.setObfuscatedValue(this._walletPassword);
      this._walletPassword = obj.value;
      this._obfuscatedWalletPassword = obj.obfuscatedValue;
      this._userConfig.walletPassword = null;
    }
    // token obfuscation
    if (this._token !== undefined) {
      let obj = protocolUtil.setObfuscatedValue(this._token);
      this._token = obj.value;
      this._obfuscatedToken = obj.obfuscatedValue;
      this._userConfig.token = null;
    }
    // privateKey obfuscation
    if (this._privateKey !== undefined) {
      let obj = protocolUtil.setObfuscatedValue(this._privateKey);
      this._privateKey = obj.value;
      this._obfuscatedPrivateKey = obj.obfuscatedValue;
      this._userConfig.privateKey = null;
    }
    this._accessTokenFn = params.accessTokenFn;
    this._isDRCPEnabled = false;
    this.eventEmitter = new EventEmitter();
    // listener to remove dead or idle connections
    this.eventEmitter.on('_removePoolConnection', async (connImpl) => {
      await this._destroy(connImpl);
    });
  }

  //---------------------------------------------------------------------------
  // create pool with specified parameters and miminum number of connections as
  // specified by poolMin
  //---------------------------------------------------------------------------
  async create(params) {
    this._init(params);
    this._userConfig._connInfo =
      await getConnectionInfo(params);
    this._isDRCPEnabled =
      String(this._userConfig._connInfo[0]).toLowerCase() === 'pooled';
    // generate connection class when none is provided by user
    if (this._isDRCPEnabled && settings.connectionClass === '') {
      this._generateConnectionClass();
    }

    // create minimum connections
    await this._growPool(this._poolMin);
  }

  //---------------------------------------------------------------------------
  // set new token and private key in pool
  //---------------------------------------------------------------------------
  setAccessToken(params) {
    if (params.token) {
      this._token = params.token;
      let objToken = protocolUtil.setObfuscatedValue(this._token);
      this._token = objToken.value;
      this._obfuscatedToken = objToken.obfuscatedValue;
    }
    if (params.privateKey) {
      this._privateKey = params.privateKey;
      let objKey = protocolUtil.setObfuscatedValue(this._privateKey);
      this._privateKey = objKey.value;
      this._obfuscatedPrivateKey = objKey.obfuscatedValue;
    }
  }

  //---------------------------------------------------------------------------
  // credentials are obfuscated and stored in an object(userConfig) during
  // pool creation. _getConnAttrs() method is used to deobfuscate encrypted
  // credentials for creating new connections
  //---------------------------------------------------------------------------
  async _getConnAttrs() {
    let accessToken;
    const clonedAttrs = Object.assign({}, this._userConfig);
    if (clonedAttrs.password === null) {
      clonedAttrs.password = protocolUtil.getDeobfuscatedValue(this._password,
        this._obfuscatedPassword);
    }
    if (clonedAttrs.walletPassword === null) {
      clonedAttrs.walletPassword =
        protocolUtil.getDeobfuscatedValue(this._walletPassword,
          this._obfuscatedWalletPassword);
    }
    if (clonedAttrs.token === null) {
      clonedAttrs.token =
        protocolUtil.getDeobfuscatedValue(this._token, this._obfuscatedToken);
      if (util.isTokenExpired(clonedAttrs.token)) {
        if (typeof this._accessTokenFn === 'function') {
          accessToken = await this._accessTokenFn(true);
          if (typeof accessToken === 'string') {
            clonedAttrs.token = accessToken;
            if (util.isTokenExpired(clonedAttrs.token)) {
              // OAuth2 token is expired
              errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
            } else {
              // update pool with OAuth2 token
              let obj = protocolUtil.setObfuscatedValue(clonedAttrs.token);
              this._token = obj.value;
              this._obfuscatedToken = obj.obfuscatedValue;
            }
          } else if (typeof accessToken === 'object') {
            clonedAttrs.token = accessToken.token;
            clonedAttrs.privateKey = accessToken.privateKey;
            if (util.isTokenExpired(clonedAttrs.token)) {
              // IAM token is expired
              errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
            } else {
              // update pool with IAM token and private key
              let objToken = protocolUtil.setObfuscatedValue(clonedAttrs.token);
              this._token = objToken.value;
              this._obfuscatedToken = objToken.obfuscatedValue;

              let objKey = protocolUtil.setObfuscatedValue(clonedAttrs.privateKey);
              this._privateKey = objKey.value;
              this._obfuscatedPrivateKey = objKey.obfuscatedValue;
            }
          }
        } else {
          errors.throwErr(errors.ERR_TOKEN_HAS_EXPIRED);
        }
      }
    }
    if (clonedAttrs.privateKey === null) {
      clonedAttrs.privateKey =
        protocolUtil.getDeobfuscatedValue(this._privateKey,
          this._obfuscatedPrivateKey);
    }
    return clonedAttrs;
  }

  //---------------------------------------------------------------------------
  // return available connection if present in pool else
  // create new connection and return it
  //---------------------------------------------------------------------------
  async getConnection() {
    if (settings.connectionClass !== '') {
      this._userConfig.connectionClass = settings.connectionClass;
    }
    return await this.acquire();
  }

  //---------------------------------------------------------------------------
  // destroy connection when pool close operation is called
  //---------------------------------------------------------------------------
  async _destroy(connection) {
    if (connection.nscon.ntAdapter.connected) {
      connection._dropSess = true;
      await connection.close();
    }
  }

  //---------------------------------------------------------------------------
  // close pool by destroying available connections
  //---------------------------------------------------------------------------
  async close(obj) {
    // clear scheduled job
    if (this._schedulerJob) {
      clearTimeout(this._schedulerJob);
      this._schedulerJob = null;
    }
    return await this.destroyAllNow(obj);
  }

  //---------------------------------------------------------------------------
  // returns poolMax from configuration
  //---------------------------------------------------------------------------
  getPoolMax() {
    return this._poolMax;
  }

  //---------------------------------------------------------------------------
  // returns poolMin from configuration
  //---------------------------------------------------------------------------
  getPoolMin() {
    return this._poolMin;
  }

  //---------------------------------------------------------------------------
  // get number of used connection
  //---------------------------------------------------------------------------
  getConnectionsInUse() {
    return this._usedConnectionList.size;
  }

  //---------------------------------------------------------------------------
  // get number of free connection
  //---------------------------------------------------------------------------
  getConnectionsOpen() {
    return this._freeConnectionList.length + this._usedConnectionList.size;
  }

  //---------------------------------------------------------------------------
  // returns poolIncrement from configuration
  //---------------------------------------------------------------------------
  getPoolIncrement() {
    return this._poolIncrement;
  }

  //---------------------------------------------------------------------------
  // returns maximum number of connections allowed per shard in the pool
  //---------------------------------------------------------------------------
  getPoolMaxPerShard() {
    return;
  }

  //---------------------------------------------------------------------------
  // returns the pool ping interval (seconds)
  //---------------------------------------------------------------------------
  getPoolPingInterval() {
    return this._poolPingInterval;
  }

  //---------------------------------------------------------------------------
  // returns the pool timeout
  //---------------------------------------------------------------------------
  getPoolTimeout() {
    return this._poolTimeout;
  }

  //---------------------------------------------------------------------------
  // returns whether the SODA metadata cache is enabled or not
  //---------------------------------------------------------------------------
  getSodaMetaDataCache() {
    return;
  }

  //---------------------------------------------------------------------------
  // returns the statement cache size associate with the pool
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    return this._stmtCacheSize;
  }

  //---------------------------------------------------------------------------
  // _growPool()
  //
  // Grows the pool to include the specified number of connections.
  //---------------------------------------------------------------------------
  async _growPool(numConns) {
    const clonedAttrs = await this._getConnAttrs();
    while (numConns > 0) {
      const conn = new ThinConnectionImpl();
      conn._pool = this;
      await conn.connect(clonedAttrs);
      conn._newSession = true;
      conn._dropSess = false;
      conn._lastTimeUsed = Date.now();
      this._freeConnectionList.push(conn);
      numConns--;
    }
  }

  //---------------------------------------------------------------------------
  // _setScheduler()
  //
  // set scheduler to scan and remove idle connections
  //---------------------------------------------------------------------------
  _setScheduler() {
    if (!this._schedulerJob && this._poolTimeout > 0 &&
        this._freeConnectionList.length > 0 &&
        (this._freeConnectionList.length + this._usedConnectionList.size >
        this._poolMin)) {
      this._schedulerJob = setTimeout(() => {
        this._scanIdleConnection();
      }, this._poolTimeout * 1000);
    }
  }

  //---------------------------------------------------------------------------
  // scanIdleConnection()
  //
  // scan connection list and removes idle connections from pool
  //---------------------------------------------------------------------------
  _scanIdleConnection() {
    while ((this._usedConnectionList.size + this._freeConnectionList.length) >
        this._poolMin && this._freeConnectionList.length > 0) {
      const conn = this._freeConnectionList[this._freeConnectionList.length - 1];
      if (Date.now() - conn._lastTimeUsed < this._poolTimeout * 1000) {
        break;
      }

      this.eventEmitter.emit('_removePoolConnection', conn);
      this._freeConnectionList.pop();
    }

    this._schedulerJob = null;
    this._setScheduler();
  }

  //---------------------------------------------------------------------------
  // acquire()
  //
  // acquire a connection from connection pool
  //---------------------------------------------------------------------------
  async acquire() {

    // return first connection from the free list that passes health checks
    while (this._freeConnectionList.length > 0) {
      const conn = this._freeConnectionList.pop();

      // if connection is unhealthy, drop it from the pool
      if (!conn.isHealthy()) {
        this.eventEmitter.emit('_removePoolConnection', conn);
        continue;
      }

      // perform a ping, if necessary; a ping interval less than 0 disables
      // pings; a ping interval of 0 forces a ping for each use of the
      // connection and a value greater than 0 will be performed if the
      // connection has not been used for that period of time; if the ping is
      // unsuccessful, drop the connection from the pool
      let requiresPing = false;
      if (this._poolPingInterval === 0) {
        requiresPing = true;
      } else if (this._poolPingInterval > 0) {
        const elapsed = Date.now() - conn._lastTimeUsed;
        if (elapsed > this._poolPingInterval * 1000)
          requiresPing = true;
      }
      if (requiresPing) {
        try {
          await conn.ping();
        } catch {
          this.eventEmitter.emit('_removePoolConnection', conn);
          continue;
        }
      }

      // connection has passed health checks, return it immediately
      this._usedConnectionList.add(conn);
      return conn;

    }

    // no free connections exist at this point; if less than poolMin
    // connections exist, grow the pool to poolMin again; otherwise, increase
    // the pool by poolIncrement up to poolMax
    if (this._usedConnectionList.size < this._poolMin) {
      await this._growPool(this._poolMin - this._usedConnectionList.size);
    } else {
      const sizeAvailable = this._poolMax - this._usedConnectionList.size;
      await this._growPool(Math.min(this._poolIncrement, sizeAvailable));
      if (this._poolIncrement > 1 && sizeAvailable > 1) {
        this._setScheduler();
      }
    }

    // return a connection from the ones that were just built
    const conn = this._freeConnectionList.pop();
    this._usedConnectionList.add(conn);
    return conn;
  }

  // release connection to connection pool
  release(conn) {
    this._usedConnectionList.delete(conn);
    if (conn.nscon.connected) {
      conn._lastTimeUsed = Date.now();
      conn._newSession = false;
      this._freeConnectionList.push(conn);
    }
    this._setScheduler();
  }

  //---------------------------------------------------------------------------
  // destroyAllNow()
  //
  // called during pool close operation and close any available connection
  // available in connection pool
  //---------------------------------------------------------------------------
  async destroyAllNow(obj) {
    let conn;
    while (this._freeConnectionList.length !== 0) {
      conn = this._freeConnectionList.pop();
      await this._destroy(conn);
    }

    if (obj.forceClose) {
      for (const item of this._usedConnectionList) {
        await this._destroy(item);
        this._usedConnectionList.delete(item);
      }
    }

    if (this._usedConnectionList.size !== 0) {
      errors.throwErr(errors.ERR_POOL_HAS_BUSY_CONNECTIONS);
    }

    this.eventEmitter.removeAllListeners();
  }

  //---------------------------------------------------------------------------
  // _generateConnectionClass()
  //
  // generate connection class for drcp if none is provided by user
  //---------------------------------------------------------------------------
  _generateConnectionClass() {
    this._userConfig.connectionClass = crypto.randomBytes(16).toString('base64');
    this._userConfig.connectionClass = "NJS:" + this._userConfig.connectionClass;
  }
}

module.exports = ThinPoolImpl;
