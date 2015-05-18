/**
 * @module models/board
 */

'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  Component = require('./component'),
  Worker = require('./worker'),
  BHEmitter = require('./bhemitter');

let debug = require('debug')('brickhouse:models:board'),

  READY_TIMEOUT_MS = 1e4,
  RETRY_TIMEOUT_MS = 3e4;

/**
 * @typedef {Object} BoardOptions
 * @property {?string} id Unique identifier
 * @property {?string} port Port board is on.  If not specified, J5 will
 *     auto-detect.
 */

/**
 * @alias module:models/board
 */
class Board extends BHEmitter {

  /**
   * Sets opts and gives the Board a unique identifier, if necessary.
   * @summary Represents a development board connected to the brickhouse server.
   * @param {Hapi.Server} server Hapi Server instance
   * @param {BoardOptions} [opts] Options
   * @constructor
   */
  constructor(server, opts) {
    super(server);

    debug('Board constructor received options %j', opts);

    /**
     * Options for this Board.  Passed into Worker, which
     * instantiates a Johnny-Five `Board` instance with it.
     * @type {BoardOptions}
     */
    this.opts = _(opts || {})
      .defaults({
        readyTimeout: READY_TIMEOUT_MS,
        retryTimeout: RETRY_TIMEOUT_MS,
        id: _.uniqueId('board-')
      })
      .tap(function (opts) {

        /**
         * How long to wait for a "ready" event from Worker
         * @type {number|READY_TIMEOUT_MS}
         * @private
         */
        this.readyTimeout = opts.readyTimeout;

        /**
         * How long to wait after {@link this.readyTimeout} to
         * retry.
         * @type {number|RETRY_TIMEOUT_MS}
         * @private
         */
        this.retryTimeout = opts.retryTimeout;

        /**
         * Unique ID of this board
         * @type {string}
         */
        this.id = opts.id || _.uniqueId('board-');
      }.bind(this))
      // do not retain private options, since they will be
      // passed into johnny-five.Board
      .omit(function (value, key) {
        return key.charAt(0) === '_';
      })
      .value();

    debug('Instantiated board with id "%s"', this.opts.id);
  }

  /**
   * Instantiates a {@link Worker} instance.
   * @returns {Worker} New Worker instance
   * @private
   */
  _createWorker() {
    if (this.worker) {
      this.warn('Board "%s": Attempt to create worker when worker already ' +
        'exists', this.id);
      return this.worker;
    }

    return new Worker(this.server, this);
  }

  /**
   * Starts the board by forking J5.
   * @returns {Promise.<Board>} This Board
   */
  start() {
    debug('Starting Board "%s"', this.id);
    if (this.ready) {
      debug('Board %s already ready', this.id);
      return Promise.resolve(this);
    }
    return new Promise(function (resolve, reject) {
      this.once('ready', function () {
        resolve(this);
      })
        .once('timeout', reject)
        .once('error', reject);
      this.worker = this._createWorker();
      debug('Board "%s" instantiated Worker', this.id);
    }.bind(this));
  }

  /**
   * Disconnects the J5 process.
   * @returns {Board} This Board.
   */
  stop() {
    if (this.worker || !this.worker.isDead()) {
      this.worker.disconnect();
      this.info('Disconnected from "%s"', this.id);
    }
    return this;
  }

  /**
   * For `JSON.stringify()`; choose user-visible fields
   * @returns {Object} Object representation of this Board suitable for
   *     JSON.stringify()
   */
  toJSON() {
    return _.pick(this, Board.fields);
  }

  component(componentClass, opts) {
    return this.send('instantiate', {
      componentClass: componentClass,
      opts: opts
    })
      .bind(this)
      .then(function (message) {
        this.info('Connected %s with id "%s" to board "%s"', componentClass,
          message.id, this.id);
        return new Component(this, message.id);
      });
  }

  send(event, message) {
    // TODO queue if no worker?
    let worker;
    if ((worker = this.worker)) {
      let messageId = _.uniqueId('board-message-');
      message.$messageId = messageId;
      worker.send(_.extend({}, message, {
        event: event
      }));
      return new Promise(function (resolve) {
        // TODO timeout
        function handler(message) {
          if (message.$messageId === messageId) {
            resolve(message);
            worker.removeListener('message', handler);
          }
        }

        worker.on('message', handler);
      });
    }
    return Promise.reject('Worker not listening!');
  }

  get connected() {
    return !!(this.worker && this.worker.isConnected());
  }

  get ready() {
    return !!(this.connected && this.port);
  }
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

module.exports = Board;
