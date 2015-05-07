'use strict';

var _ = require('lodash'),
  child_process = require('child_process'),
  Promise = require('bluebird'),
  Component = require('./component'),
  path = require('path'),
  util = require('util'),
  events = require('events');

var EventEmitter = events.EventEmitter,
  format = util.format,

  CONNECTION_TIMEOUT_MS = 1e4,
  RETRY_TIMEOUT_MS = 3e4;

/**
 * @typedef {Object} BoardOptions
 * @property {?string} id Unique identifier
 * @property {?string} port Port board is on.  If not specified, J5 will
 *     auto-detect.
 */

/**
 * Sets opts and gives the Board a unique identifier, if necessary.
 * @summary Represents a development board connected to the brickhouse server.
 * @param {BoardOptions} [opts] Options
 * @constructor
 */
function Board(opts) {
  EventEmitter.call(this);
  this.opts = _(opts || {})
    .defaults({
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      retryTimeout: RETRY_TIMEOUT_MS,
      id: _.uniqueId('board-')
    })
    .tap(function (opts) {
      this._connectionTimeout = opts.connectionTimeout;
      this._retryTimeout = opts.retryTimeout;
      this.id = opts.id || _.uniqueId('board-');
    }.bind(this))
    .omit('connectionTimeout', 'retryTimeout')
    .value();
}

/**
 * @namespace Board.fields
 * @type {string[]} Fields to output when a Board is marshalled to JSON
 */
Board.fields = [
  'id',
  'port',
  'connected',
  'ready'
];

Board.prototype = _.create(EventEmitter.prototype, {

  /**
   * Emits event which will log something.  Use like `Server#log`.
   */
  log: function log() {
     this.emit.apply(this, ['log'].concat(_.toArray(arguments)));
  },

  /**
   * Starts the board by forking J5.
   * @returns {Promise.<Board>} This Board
   */
  start: function start() {
    var self = this;
    if (this.ready) {
      return Promise.resolve(this);
    }
    return new Promise(function (resolve, reject) {
      var worker;

      self.once('ready', function () {
        resolve(this);
      })
        .once('timeout', reject)
        .once('error', reject);

      self.log('debug', format('Forking for connection to "%s"', self.id));

      child_process.fork(path.join(__dirname, 'worker'), {
        env: {
          opts: self.opts,
          id: self.id
        }
      });

      _.each(require('./events').worker, function (factoryFunc, name) {
        worker.on(name, factoryFunc(this));
      }, self);

    });
  },

  /**
   * Disconnects the J5 process.
   * @returns {Board} This Board.
   */
  stop: function stop() {
    if (this._worker || !this._worker.isDead()) {
      this._worker.disconnect();
      this.log('info', format('Disconnected from "%s"', this.id));
    }
    return this;
  },

  /**
   * For `JSON.stringify()`; choose user-visible fields
   * @returns {Object} Object representation of this Board suitable for
   *     JSON.stringify()
   */
  toJSON: function toJSON() {
    return _.pick(this, Board.fields);
  },

  instantiate: function instantiate(componentClass, opts) {
    return this.send('instantiate', {
      componentClass: componentClass,
      opts: opts
    })
      .bind(this)
      .then(function (message) {
        this.log('info',
          format('Connected %s with id "%s" to board "%s"', componentClass,
            message.id, this.id));
        return new Component(this, message.id);
      });
  },

  send: function send(event, message) {
    // TODO queue if no worker?
    var worker;
    if ((worker = this._worker)) {
      let messageId = _.uniqueId('board-message-');
      message._messageId = messageId;
      worker.send(_.extend({}, message, {
        event: event
      }));
      return new Promise(function (resolve) {
        // TODO timeout
        function handler(message) {
          if (message._messageId === messageId) {
            resolve(message);
            worker.removeListener('message', handler);
          }
        }

        worker.on('message', handler);
      });
    }
    return Promise.reject('Worker not listening!');
  }
});

Object.defineProperties(Board.prototype, {
  connected: {
    get: function () {
      return !!(this._worker && this._worker.isConnected());
    },
    enumerable: true
  },
  ready: {
    get: function () {
      return !!(this.connected && this.port);
    },
    enumerable: true
  }
});

module.exports = Board;
