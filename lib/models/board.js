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

    this.componentMap = {};
    debug('Instantiated board with id "%s"', this.opts.id);
  }

  /**
   * Instantiates a {@link Worker} instance.
   * @returns {Worker} New Worker instance
   * @private
   */
  _createWorker() {
    if (this._worker) {
      this.warn('Board "%s": Attempt to create worker when worker already ' +
        'exists', this.id);
      return this._worker;
    }

    return new Worker(this.server, this);
  }

  /**
   * Starts the board by forking J5.
   * @returns {Promise.<Board>} This Board
   */
  start(callback) {
    debug('Starting Board "%s"', this.id);
    if (this.ready) {
      debug('Board %s already ready', this.id);
      return Promise.resolve(this);
    }
    return new Promise(function (resolve, reject) {
      this._worker = this._createWorker()
        .once('ready', resolve)
        .once('timeout', reject)
        .once('error', reject);
      debug('Board "%s" instantiated Worker', this.id);
    }.bind(this))
      .bind(this)
      .then(function () {
        let components = this.opts.components;
        if (_.size(components)) {
          debug('Instantiating components');
          return Promise.settle(_.map(components,
            function (opts, componentClass) {
              return this.component(componentClass, opts)
                .bind(this)
                .catch(function (err) {
                  this.error('"%s" component with ID "%s" failed to ' +
                    'initialize: %j', err);
                  return Promise.reject(err);
                });
            }, this));
        }
        this.warn('No components configured!  Not much to do.');
      })
      .return(this)
      .nodeify(callback);
  }

  /**
   * Disconnects the J5 process.
   * @returns {Board} This Board.
   */
  stop() {
    if (this._worker && this._worker.connected) {
      this._worker.kill();
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

  /**
   * Readies a Component with specified J5 class and opts.
   * @param {string} componentClass J5 class
   * @param {(Object|Array)} [opts] Options to constructor
   * @returns {Component} New Component instance
   */
  component(componentClass, opts) {
    let component = new Component(this.server, this._worker, componentClass,
      opts);
    this.componentMap[component.id] = component;
    return component.instantiate()
      .return(component);
  }

  /**
   * If the Worker has been forked successfully
   * @returns {boolean} True if connected
   */
  get connected() {
    return !!(this._worker && this._worker.connected);
  }

  /**
   * If the Worker has been forked sucessfully and the J5 Board is ready
   * @returns {boolean} True if ready
   */
  get ready() {
    return !!(this.connected && this._worker.ready && this.port);
  }

  /**
   * The port of the Board (from the Worker)
   * @returns {string} Port of Board
   */
  get port() {
    return this._worker && this._worker.port;
  }

  get components() {
    return _.values(this.componentMap);
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
  'ready',
  'components'
];

module.exports = Board;
