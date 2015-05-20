/**
 * @module models/worker
 */

'use strict';

const BHEmitter = require('./bhemitter'),
  _ = require('lodash'),
  util = require('util'),
  child_process = require('child_process'),
  Promise = require('bluebird'),
  path = require('path');

const debug = require('debug')('brickhouse:models:worker'),
  format = util.format,
  WORKER_PATH = path.join(__dirname, '..', 'worker');

/**
 * Wraps a `ChildProcess` object
 * @alias module:models/worker
 */
class Worker extends BHEmitter {

  constructor(server, board) {
    super(server);

    this.debug = debug;
    this._board = board;
    this.retryTimeout = board.retryTimeout;
    this.readyTimeout = board.readyTimeout;

    debug('Forking for connection to "%s"', board.id);

    this._fork(board);
  }

  kill() {
    if (this._worker && this.connected) {
      let pid = this._worker.pid;
      this._worker.kill();
      delete this._worker;
      debug('Killed worker with PID %d for Board "%s"', pid, this._board.id);
    }
  }

  /**
   * Forks a `ChildProcess`; attaches event listeners
   * @param {Board} board Creator object
   * @returns {ChildProcess} Worker process
   */
  _fork(board) {
    let worker = this._worker = child_process.fork(WORKER_PATH, {
      env: _.extend(process.env, {
        BRICKHOUSE_BOARD: JSON.stringify(board)
      })
    });

    debug('Forked worker with PID %d for Board "%s"', worker.pid, this._board.id);
    _.each(this._createListeners(), function (listener, event) {
      worker.on(event, listener);
    });

    return worker;
  }

  /**
   * Provides flimsy request/response communication to a child process.
   * A unique identifier is embedded into every message sent; the Worker process
   * must respond with the same identifier, regardless of the outcome.
   * @param {(string|*)} event Event name or Message
   * @param {*} [message] Message
   * @returns {Promise.<*>} Response from Worker
   */
  send(event, message) {
    // TODO queue if no worker?
    let worker;
    if ((worker = this._worker)) {
      let messageId = _.uniqueId('board-msg-');
      if (_.isObject(event)) {
        message = event;
        event = undefined;
      }
      _.extend(message, {
        $messageId: messageId,
        event: event
      });
      let promise = new Promise(function (messageId) {
        return function (resolve) {
          // TODO timeout
          function handler(response) {
            if (response.$messageId === messageId) {
              debug('Received reply', response);
              resolve(response);
              worker.removeListener('message', handler);
            }
          }

          worker.on('message', handler);
        };
      }(messageId));
      debug('Sending message', message);
      worker.send(message);
      return promise;
    }
    return Promise.reject('Worker not listening!');
  }

  /**
   * Creates handlers for various "events" when `message` event
   * is emitted by our `ChildProcess`
   * @returns {Object.<string,Function>} Mapping of "event" to handler
   * @private
   */
  _createMessageHandlers() {
    let self = this;
    return {
      online: function (data) {
        let retryTimeout = self.retryTimeout,
          readyTimeout = self.readyTimeout;
        debug('Board "%s" worker online', data.id);
        self.connected = true;
        self.readyTimeout = setTimeout(function () {
          self.log('error',
            format('Connection timeout of %dms reached; killing ' +
              'worker process', readyTimeout));

          this.kill();

          // TODO max retries
          if (retryTimeout) {
            self.log('info',
              format('Retrying connection in %dms', retryTimeout));
            self.readyTimeout =
              setTimeout(self._fork.bind(self, self._worker), retryTimeout);
          } else {
            self.emit('timeout');
          }
        }.bind(this), readyTimeout);
      },
      ready: function (data) {
        if (self.readyTimeout) {
          clearTimeout(self.readyTimeout);
        }
        self.port = data.port;
        self.emit('ready', self);
      },
      log: function (data) {
        if (data.level && !_.isFunction(self[data.level])) {
          self.error('Invalid log level received via message: %j', data);
        }
        if (data.tags) {
          self.log(data.level, data.tags, data.msg);
          return;
        }
        self.log(data.level, data.msg);
      },
      exit: function () {
        self.connected = self.ready = false;
      }
    };
  }

  /**
   * Creates listeners for events emitted from our `ChildProcess`
   * object.
   * @returns {Object.<string,Function>} Map of events to listener functions
   * @private
   */
  _createListeners() {
    let self = this,
      board = self._worker,
      messageHandlers = self._createMessageHandlers();

    return {
      exit: function (code) {
        debug('Board "%s" worker exited with code %d', board.id, code);
      },
      error: function (err) {
        board.emit('error', err);
        // TODO necessary?
        this.kill();
      },
      message: function (data) {
        data = data || {};
        if (!data.$messageId) {
          debug('Received message from ChildProcess', data);
          let handler;
          if ((handler = messageHandlers[data.event])) {
            debug('Executing message handler for event "%s"', data.event);
            handler.call(this, data);
          }
          else {
            self.warn('Unknown event received: "%s"', data.event);
          }
        }
      }
    };
  }
}

module.exports = Worker;
