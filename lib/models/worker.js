/**
 * @module models/worker
 */

'use strict';

const BHEmitter = require('./bhemitter'),
  _ = require('lodash'),
  util = require('util'),
  child_process = require('child_process'),
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
    this.board = board;
    this.retryTimeout = board.retryTimeout;
    this.readyTimeout = board.readyTimeout;

    debug('Forking for connection to "%s"', board.id);

    this._fork(board);
  }

  /**
   * Forks a `ChildProcess`; attaches event listeners
   * @param {Board} board Creator object
   * @returns {ChildProcess} Worker process
   */
  _fork(board) {
    let worker = this.worker = child_process.fork(WORKER_PATH, {
      env: _.extend(process.env, {
        BRICKHOUSE_BOARD: JSON.stringify(board)
      })
    });

    _.each(this._createListeners(board), function (listener, event) {
      worker.on(event, listener);
    });

    return worker;
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
              setTimeout(self._fork.bind(self, self.board), retryTimeout);
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
      board = self.board,
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
        let handler;
        data = data || {};
        debug('Received message', data);
        if (!data.$messageId) {
          if ((handler = messageHandlers[data.event])) {
            handler.call(this, data);
          }
          else {
            self.warn('Unknown event received from worker process: "%s"',
              data.event);
          }
        }
      }
    };
  }
}

module.exports = Worker;
