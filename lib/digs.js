'use strict';

let Promise = require('bluebird');
let _ = require('lodash');
let DigsEmitter = require('digs-common/digs-emitter');
let Plugins = require('./plugins');
let dependencyGraph = require('dependency-graph');
let pkg = require('../package.json');
let path = require('path');

let debug = require('debug')('digs:digs');
let DepGraph = dependencyGraph.DepGraph;

/**
 * Configuration object for a Board and its components.
 * @summary Board Definition
 * @typedef {Object} BoardDef
 */

/**
 * Default project
 */
const DEFAULT_PROJECT = 'home';
const DEFAULT_NAMESPACE = pkg.name;
const DEFAULT_AUTODETECT_PLUGINS = false;
const DEFAULT_PLUGINS = {};
/**
 * Default opts for Digs
 * @type {{mqtt: {broker: {port: number, host: string, type: string}},
     *     boards:
   *     {}, namespace: *, project: string}}
 */
const DEFAULTS = {
  namespace: DEFAULT_NAMESPACE,
  project: DEFAULT_PROJECT,
  autoDetectPlugins: DEFAULT_AUTODETECT_PLUGINS,
  plugins: DEFAULT_PLUGINS
};

/**
 * Plugin class
 */
class Digs extends DigsEmitter {

  /**
   * Instantiates Digs
   * @constructor
   */
  constructor(opts) {
    super();

    /**
     * Plugin Configuration
     * @type {Object}
     */
    opts = _.merge(DEFAULTS, opts || {});

    /**
     * Mapping of {@link Board} {@link Board#id Board ID's} to Boards.
     * @type {Object.<string,Board>}
     */
      //this.boards = _(opts.boards)
      //  .pick(function (value) {
      //    return _.isObject(value) && value !== '_' && !_.isArray(value) &&
      //      !_.isFunction(value);
      //  })
      //  .map(this.createBoard, this)
      //  .indexBy('id')
      //  .value();
      //
      //if (opts.mqtt.broker.type === 'internal') {
      //  debug('%s: using internal MQTT broker', this);
      //  this._brokerReady = new Promise(function (resolve, reject) {
      //    this.broker = digsBroker(opts.mqtt.broker.port,
      // opts.mqtt.broker.host) .on('listening', resolve) .on('error', reject);
      // }.bind(this)); } else { this._brokerReady = Promise.resolve(); }
      // this.opts = opts;

    this._opts = opts;
    this._registeredPlugins = {};
    this._graph = new DepGraph();

    this._autoDetected = Plugins.autoDetect()
      .bind(this)
      .then(function (plugins) {
        if (opts.autoDetectPlugins) {
          return Plugins.autoDetect(path.join(__dirname, '..', '..'))
            .then(function (externalPlugins) {
              return plugins.concat(externalPlugins);
            });
        }
        return plugins;
      })
      .then(this.use);

    debug(`${this}: instantiated w/ options:`, opts);

  }

  get ready() {
    return this._ready && this._ready.isFulfilled();
  }

  get id() {
    return this.project;
  }

  get project() {
    return this._opts.project;
  }

  get namespace() {
    return this._opts.namespace;
  }

  /**
   * Enables a plugin.
   * @param {Function} plugin
   * @param {Object} [opts]
   * @todo validate plugin
   */
  use(plugin, opts) {
    if (_.isArray(plugin)) {
      _.each(plugin, function (plug) {
        this.use(plug, this._opts[_.get(plug.metadata.name)]);
      }, this);
      return;
    }
    let graph = this._graph;
    let metadata = plugin.metadata;
    let pluginName = metadata.name;
    if (!_.has(this, pluginName)) {
      graph.addNode(pluginName);
      _.each([].concat(metadata.dependencies), function (dependency) {
        graph.addDependency(pluginName, dependency);
      });
      this._registeredPlugins[pluginName] = {
        func: plugin,
        opts: opts
      };
    }
    else {
      debug(`${this}: Conflicting plugin name "${pluginName}"`);
    }
  }

  //
  ///**
  // * Bootstraps a {@link Board} from a {@link BoardDef Board Definition}
  // * @param {BoardDef} opts Board Definition
  // * @param {?string} [id] Unique ID of board, if string
  // * @returns {Board} New Board instance
  // */
  //createBoard(opts, id) {
  //  id = opts.id = (_.isString(id) && id) || opts.id || null;
  //
  //  debug('%s: creating <%s#%s> w/ options:', this, Board.name, id, opts);
  //
  //  let board = new Board(this, opts);
  //  pipeEvent('error', board, this);
  //  return board;
  //}
  //
  ///**
  // * Starts a Board.
  // * @param {(Board|BoardDef|string)} [board] Board object, Board
  // *     Definition, or Board ID.  If omitted, starts all Boards.
  // * @param {string} [id] ID of Board, if `board` is a Board Definition.
  // * @return {(Promise.<Board>|Promise.<Array.<Board>>)} Ready Board(s)
  // */
  //start(board, id) {
  //  return this._brokerReady
  //    .bind(this)
  //    .then(function () {
  //      if (_.isUndefined(board)) {
  //        debug('%s: starting all (%d) Boards', this, _.size(this.boards));
  //        return Promise.settle(_.map(this.boards, function (boardObj) {
  //          return boardObj.start()
  //            .bind(this)
  //            .catch(function (err) {
  //              this.warn(err);
  //            });
  //        }, this));
  //      }
  //      else if (_.isString(board)) {
  //        debug('%s: found Board with ID "%s"', this, board);
  //        board = this.boards[board];
  //      }
  //      else if (!(board instanceof Board)) {
  //        debug('%s: creating <%s#%s> from object:', this, Board.name, id,
  //          board);
  //        this.boards[board.id] = board = this.createBoard(board, id);
  //      }
  //      debug('%s: starting <%s#%s>', this, Board.name, board.id);
  //      return board.start();
  //    });
  //}

  start() {
    this._autoDetected
      .bind(this)
      .then(function () {
        return Promise.load(this._graph, this._registeredPlugins);
      })
      .then(function (result) {
        _.each(result, function (instance) {
          this[instance.name] = instance.plugin;
          debug(`Successfully loaded plugin ${instance.name}`);
        });
      });
  }
}

Digs.version = pkg.version;

module.exports = Digs;
