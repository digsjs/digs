/**
 * @module models/board
 */

'use strict';

const _ = require('lodash'),
  Promise = require('bluebird'),
  slugify = require('../common/slugify'),
  Component = require('./component'),
  Worker = require('./worker'),
  BHEmitter = require('./../common/bhemitter');

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
   * @param {Brickhouse} plugin Brickhouse instance
   * @param {BoardOptions} [opts] Options
   * @constructor
   */
  constructor(server, plugin, opts) {
    super(server);

    debug('Board constructor received options %j', opts);

    this.plugin = plugin;

    /**
     * Options for this Board.  Passed into Worker, which
     * instantiates a Johnny-Five `Board` instance with it.
     * @type {BoardOptions}
     */
    this.opts = _(opts || {})
      .defaults({
        _readyTimeout: READY_TIMEOUT_MS,
        _retryTimeout: RETRY_TIMEOUT_MS,
        id: _.uniqueId('board-')
      })
      .tap(function (opts) {

        /**
         * How long to wait for a "ready" event from Worker
         * @type {number|READY_TIMEOUT_MS}
         * @private
         */
        this._readyTimeout = opts._readyTimeout;

        /**
         * How long to wait after {@link this._readyTimeout} to
         * retry.
         * @type {number|RETRY_TIMEOUT_MS}
         * @private
         */
        this._retryTimeout = opts._retryTimeout;

        /**
         * Unique ID of this board
         * @type {string}
         */
        this.id = opts.id ? slugify(opts.id) : _.uniqueId('board-');
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
   * Starts the board by forking J5.
   * @returns {Promise.<Board>} This Board
   */
  start(callback) {
    let worker;
    debug('Starting Board "%s"', this.id);
    if (this._worker) {
      // warn?
      debug('Board "%s" already has a Worker instance', this.id);
      return Promise.resolve(this);
    }
    worker = this._worker = new Worker(this.server, this);
    return worker.fork()
      .bind(this)
      .then(function () {
        let components = this.opts.components,
          size = _.size(components);
        if (size) {
          debug('Instantiating %d components', size);
          return _.map(components, function (opts, idx) {
            if (!_.isNumber(idx)) {
              opts.id = idx;
            }
            return this.component(opts.class, _.omit(opts, 'class'))
              .bind(this)
              .catch(function (err) {
                this.error('"%s" component with ID "%s" failed to ' +
                  'initialize: %j', err);
                return Promise.reject(err);
              });
          }, this);
        }
        this.warn('No components configured!  Not much to do.');
      })
      .then(function (instantiations) {
        if (instantiations) {
          return Promise.settle(instantiations);
        }
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
    debug('Instantiating a "%s" with opts:', componentClass,
      _.omit(opts, 'board'));

    let component = new Component(this.server, this, componentClass, opts);
    return component.instantiate()
      .bind(this)
      .then(function (component) {
        return (this.componentMap[component.id] = component);
      });
  }

  request() {
    return this._worker.request.apply(this._worker, arguments);
  }

  publish() {
    return this._worker.publish.apply(this._worker, arguments);
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
    return this.connected && this._worker.ready;
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
