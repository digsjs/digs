'use strict';

var _ = require('lodash'),
  cluster = require('cluster'),
  pkg = require('../package.json'),
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
  this._opts = _(opts || {})
    .defaults({
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      retryTimeout: RETRY_TIMEOUT_MS
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

/**
 * @namespace Board.eventHandlers
 * @type {{online: Function}}
 */
Board.eventHandlers = {

  /**
   * Event handlers for Worker processes.
   * @namespace Board.eventHandlers.worker
   */
  worker: {
    /**
     * Create an event handler for the `online` event (sent from Worker)
     * @param {Board} board Board instance
     * @returns {onlineFactory~online} Actual handler
     */
    online: function onlineFactory(board) {
      /**
       * Attempts to retry if J5 board connection fails, and
       * the option is set.
       * @this Worker
       */
      return function online() {
        var retryTimeout = board._retryTimeout,
          connectionTimeout = board._connectionTimeout;
        board.log('debug',
          format('Worker connected with id "%d"', this.id));
        board._connection = setTimeout(function () {
          board.log('error',
            format('Connection timeout of %dms reached!', connectionTimeout));
          this.kill();
          if (retryTimeout) {
            board.log('info',
              format('Retrying connection in %dms', retryTimeout));
            board.connection = setTimeout(this.start.bind(this), retryTimeout);
          }
        }.bind(this), connectionTimeout);
      };
    },
    disconnected: function disconnectedFactory(board) {
      /**
       * @this Worker
       */
      return function disconnected() {
        board.log('debug', format('Worker process "%s" disconnected', this.id));
      };
    },
    message: function messageFactory(board) {
      return function message(data) {
        switch (data.event) {
          case 'ready':
            board.port = data.port;
            board.emit('ready', board);
            break;
          default:
          case 'error':
            board.emit('error', data.err);
            delete board.port;
            this.kill();
            break;
        }
      };
    }
  },
  /**
   * Events requiring a Server instance.
   * @namespace Board.eventHandlers.server
   */
  server: {
    error: function errorFactory(server) {
      return function error(err) {
        server.emit('error', err);
      };
    },
    ready: function readyFactory(server) {
      return function ready() {
        clearTimeout(this.connection);
        server.log('info',
          format('Board "%s" is ready on port "%s"', this.id, this.port));
        server.emit(format('%s.ready', pkg.name), this);
      };
    },
    log: function log(server) {
      var args = _(arguments)
        .toArray()
        .compact()
        .tap(function (argArray) {
          argArray[0] = [].concat(argArray[0], pkg.name);
        })
        .value();
      server.log.apply(server, args);
    }
  }
};

Board.prototype = _.create(EventEmitter.prototype, {

  /**
   * Emits event which will log something.  Use like `Server#log`.
   * @returns {boolean} If we have a listener
   */
  log: function log() {
    return this.emit.apply(this, ['log'].concat(_.toArray(arguments)));
  },

  /**
   * Starts the board by forking J5.
   * @returns {Board} This Board
   */
  start: function start() {
    var worker;
    this.log('debug', format('Forking for connection to "%s"', this.id));

    worker = this._worker = cluster.fork({
      opts: JSON.stringify(this._opts),
      plugin: pkg.name
    });

    _.each(Board.eventHandlers.worker, function (factoryFunc, name) {
      worker.on(name, factoryFunc(this));
    }, this);
    return this;
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
