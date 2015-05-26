/**
 * @module board/board
 */

'use strict';

let _ = require('../common/lodash-mixins'),
  Promise = require('bluebird'),
  Component = require('./component'),
  Worker = require('./worker'),
  DigsEmitter = require('../common/digs-emitter');

let debug = require('debug')('digs:models:board');

const RETRY_MAX_TRIES = 3,
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
class Board extends DigsEmitter {

  /**
   * Sets opts and gives the Board a unique identifier, if necessary.
   * @summary Represents a development board connected to the digs server.
   * @param {Hapi.Server} server Hapi Server instance
   * @param {Digs} plugin Digs instance
   * @param {BoardOptions} [opts] Options
   * @constructor
   */
  constructor(server, plugin, opts) {
    super(server);

    debug('Board constructor received options %j', opts);

    this.plugin = plugin;
    opts = opts || {};

    // `options` are options for this Board
    _.defaults(opts, {
      id: _.uniqueId('board-'),
      options: {}
    });

    opts.name = opts.id;
    opts.id = _.slugify(opts.id);

    _.defaults(opts.options, {
      readyTimeout: READY_TIMEOUT_MS,
      retryInterval: RETRY_TIMEOUT_MS,
      retryMaxTries: RETRY_MAX_TRIES
    });

    // assign relevant opts.options to self, including some stuff from opts
    _.extend(this, opts.options, _.pick(opts, 'id', 'name', 'description'));

    // opts will be passed into j5
    this.opts = _.omit(opts, 'options');

    this.componentMap = {};

    debug('Instantiated board with id "%s"', this.id);
  }


  /**
   * Starts the board by forking J5.
   * @param {Function} [callback] Optional callback if not using Promises
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
    return {
      id: this.id,
      port: this.port,
      connected: this.connected,
      ready: this.ready,
      components: _.keys(this.componentMap),
      opts: _.omit(this.opts, 'components')
    };
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

    return new Component(this.server, this, componentClass, opts).instantiate()
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

module.exports = Board;
