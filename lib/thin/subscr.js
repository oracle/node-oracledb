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

const errors = require("../errors.js");
const constants = require("../constants.js");
const protocolUtils = require("./protocol/utils.js");
const protocolConstants = require("./protocol/constants.js");
const messages = require("./protocol/messages");

class ThinSubscrImpl {

  /**
   * Creates a thin subscription implementation instance.
   */
  constructor(connImpl, options) {
    this._connImpl = connImpl;
    this.callback = options.callback;
    this.namespace = options.namespace;
    this.name = options.name;
    this.timeout = options.timeout || 0;
    this.operations = options.operations || 0;
    this.qos = options.qos || 0;
    this.groupingClass = options.groupingClass || 0;
    this.groupingValue = options.groupingValue || 0;
    this.groupingType = options.groupingType || 0;
    this.regId = 0n;
    this.clientId = null;
    this._notifyConnImpl = null;
    this._notifyLoopPromise = null;
    this._unsubscribing = false;
    this._notifyLoopActive = false;
    this._listenerStopped = false;
    this._registered = false;
    this._onRetire = options._onRetire;
  }

  /**
   * Invokes the user callback safely for a decoded notification.
   */
  _invokeCallback(message) {
    if (typeof this.callback !== 'function') {
      return;
    }
    try {
      this.callback(message);
    } catch {
      // swallow callback exceptions so notification loop remains active
    }
  }

  /**
   * Retires a subscription after server deregistration or successful explicit
   * unsubscribe, removing the public entry that retains its callback.
   */
  _retire() {
    this._registered = false;
    this._notifyLoopActive = false;
    this._listenerStopped = false;
    if (this._onRetire) {
      this._onRetire(this);
      this._onRetire = null;
    }
  }

  /**
   * Closes and releases the dedicated EMON notification connection.
   */
  _closeNotifyConnection() {
    const notifyConnImpl = this._notifyConnImpl;
    this._notifyConnImpl = null;
    if (notifyConnImpl?.nscon) {
      notifyConnImpl.nscon.forceDisconnect();
    }
  }

  /**
   * Internal method that registers the subscription with the database
   * and stores returned IDs.
   */
  async _register() {
    const message = new messages.SubscrMessage(this._connImpl, this);
    await this._connImpl._protocol._processMessage(message);
    this.regId = message.registrationId;
    this.clientId = message.clientId;
    this._registered = true;
    this._listenerStopped = false;
  }

  /**
   * Marks the EMON listener as unavailable while retaining the server
   * registration for explicit unregister or same-name replacement. This is
   * used for abnormal/recovery cases, not normal notification completion.
   */
  _stopListener() {
    this._notifyLoopActive = false;
    this._listenerStopped = true;
  }

  /**
   * Internal method that registers a CQN query against an existing
   * subscription registration.
   */
  async _registerQuery(sql, binds) {
    const options = {
      _subscriptionRegId: this.regId,
      keepInStmtCache: false,
      autoCommit: false,
      resultSet: true,
      fetchArraySize: 1,
      prefetchRows: 1
    };
    options.connection = {
      _impl: this._connImpl,
      _getDbObjectClass: (dbObjectClass) => dbObjectClass
    };
    const statement = this._connImpl._prepare(sql, options);
    const internalTempLobs = [];
    let statementReturned = false;

    try {
      if (!statement.isQuery) {
        errors.throwErr(errors.ERR_NOT_A_QUERY);
      }
      const result = await this._connImpl._execute(statement, 1,
        binds || [], options, false, internalTempLobs);

      if (result?.resultSet) {
        await result.resultSet.close();
        statementReturned = true;
      }
    } finally {
      if (!statementReturned) {
        this._connImpl._returnStatement(statement);
      }

      for (const lob of internalTempLobs) {
        this._connImpl._tempLobsToClose.push(lob._locator);
        this._connImpl._tempLobsTotalSize += lob._locator.length;
      }
    }
  }

  /**
   * Starts the dedicated notification channel by establishing a separate EMON
   * connection, sending a single notify request, and launching the async
   * receive/decode loop until the subscription is unsubscribed, deregistered,
   * or the listener fails.
   */
  async _startNotifyLoop() {

    // Use a separate EMON connection for notifications.
    const notifyParams = await this._connImpl._getNotificationConnectParams();
    const NotifyConnImpl = this._connImpl.constructor;
    const notifyConnImpl = new NotifyConnImpl();

    // Marking it as notification connection so that we do not cache
    // connection parameters. Only the user-facing connection retains
    // obfuscated parameters for future notification connections.
    notifyConnImpl._isNotificationConnection = true;

    // Retain user-facing connection metadata on the internal connection.
    notifyConnImpl._connectString = this._connImpl._connectString;
    notifyConnImpl._user = this._connImpl._user;
    this._notifyConnImpl = notifyConnImpl;
    try {
      await notifyConnImpl.connect(notifyParams);

      // clientId links this listener to the registered subscription.
      const notifyMessage = new messages.NotifyMessage(notifyConnImpl, this);
      notifyMessage.clientId = this.clientId;
      await notifyConnImpl._protocol._encodeMessage(notifyMessage);

      // Unsubscribe, deregistration, or listener failure stops this loop and
      // closes the notification connection.
      this._notifyLoopActive = true;
      this._notifyLoopPromise = this._runNotifyLoop(notifyConnImpl,
        notifyMessage);
      this._notifyLoopPromise.catch(() => {
        // prevent unhandled rejection if listener fails asynchronously
      });
    } catch (err) {
      // Setup can fail before _runNotifyLoop() owns cleanup.
      if (this._notifyConnImpl === notifyConnImpl) {
        this._closeNotifyConnection();
      }
      throw err;
    }
  }

  /**
   * Runs the notification receive/decode loop for the dedicated channel.
   */
  async _runNotifyLoop(notifyConnImpl, notifyMessage) {
    const protocol = notifyConnImpl._protocol;
    const readBuf = protocol.readBuf;
    try {
      notifyMessage.preProcess();
      await readBuf.waitForPackets();

      // Decode records as packets arrive until unsubscribe or deregistration.
      while (this._notifyLoopActive) {
        try {
          notifyMessage.decode(readBuf);
        } catch (err) {
          if (err instanceof protocolUtils.OutOfPacketsError) {
            await readBuf.waitForPackets();
            readBuf.restorePoint();
            continue;
          }
          if (!this._unsubscribing) {

            // Listener failure while still subscribed is unexpected.
            // Throw the error.
            throw err;
          }

          // Listener interruption during explicit unsubscribe is expected.
          return;
        }
      }
    } catch (err) {
      if (!this._unsubscribing) {
        // The server registration can still exist after an EMON failure. Keep
        // it in the public registry so unsubscribe() can deregister it.
        this._stopListener();
      }
      throw err;
    } finally {
      // Close the EMON connection whenever the loop ends without going
      // through unsubscribe(), so its socket cannot keep the Node.js event
      // loop alive.
      if (this._notifyConnImpl === notifyConnImpl) {
        this._notifyLoopActive = false;
        this._closeNotifyConnection();
      }
    }
  }

  /**
   * Internal method for creating a subscription. Each new subscription uses a
   * dedicated client-initiated EMON connection to receive notifications. CQN
   * registrations with the same name reuse this listener to add queries.
   */
  async subscribe(options) {
    if (this.namespace === constants.SUBSCR_NAMESPACE_AQ && !this.qos) {
      // Default AQ registrations request query notifications.
      this.qos = constants.SUBSCR_QOS_QUERY;
    }
    await this._register();
    try {
      await this._startNotifyLoop();
      if (this.namespace === constants.SUBSCR_NAMESPACE_DBCHANGE) {
        await this._registerQuery(options.sql, options.binds);
      }
    } catch (err) {
      try {
        await this.unsubscribe(this._connImpl);
      } catch {
        // preserve the original subscribe failure
      }
      throw err;
    }
  }

  /**
   * Registers an additional query for an existing DBCHANGE subscription.
   */
  async registerQuery(options) {
    if (this.namespace === constants.SUBSCR_NAMESPACE_AQ) {
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED,
        "registering a query on AQ subscriptions");
    }
    if (!this._registered || this._listenerStopped) {
      errors.throwErr(errors.ERR_INVALID_SUBSCR);
    }
    await this._registerQuery(options.sql, options.binds);
  }

  /**
   * Internal method for destroying the subscription.
   */
  async unsubscribe(connImpl) {
    if (!this.regId) {
      errors.throwErr(errors.ERR_INVALID_SUBSCR);
    }
    this._unsubscribing = true;
    let unregisterError;
    let shouldRetire = false;
    try {
      if (this._registered) {
        const message = new messages.SubscrMessage(connImpl, this);
        message.opCode = protocolConstants.TNS_SUBSCR_OP_UNREGISTER;
        message.registrationId = this.regId;
        message.clientId = this.clientId;
        await connImpl._protocol._processMessage(message);
      }
      shouldRetire = true;
    } catch (err) {
      unregisterError = err;
      if (err.code === errors.getErr(errors.ERR_INVALID_SUBSCR).code) {
        // The server already discarded this registration. Remove the public
        // entry as well so its callback is not retained and the name can be
        // subscribed again.
        shouldRetire = true;
      }
    } finally {
      this._notifyLoopActive = false;
      if (shouldRetire) {
        this._retire();
        this.regId = 0n;
        this.clientId = null;
      } else {
        // The EMON socket is closed below, so this registration cannot be
        // reused without first creating a replacement listener. Retain the
        // registration so the caller can retry UNREGISTER.
        this._stopListener();
      }
      // Interrupt the background wait by force-closing the notification socket.
      this._closeNotifyConnection();
      if (this._notifyLoopPromise) {
        try {
          await this._notifyLoopPromise;
        } catch {
          // ignore listener errors during explicit unsubscribe
        }
        this._notifyLoopPromise = null;
      }
      if (!shouldRetire) {
        this._unsubscribing = false;
      }
    }
    if (unregisterError) {
      throw unregisterError;
    }
  }
}

module.exports = ThinSubscrImpl;
