'use strict';

let path = require('path');
let url = require('url');
let domain = require('domain');

let Promise = require('bluebird');
let _ = require('lodash');
let dependencyGraph = require('dependency-graph');

let DigsEmitter = require('digs-common/digs-emitter');

let Plugins = require('./plugins');
let pkg = require('../package.json');

let debug = require('debug')('digs:digs');

const DEFAULTS = {
  namespace: 'home',
  project: pkg.name,
  autoDetectPlugins: false,
  autoStart: false,
  pluginOptions: {},
  broker: {
    type: 'digs-mqtt-broker',
    json: false,
    url: 'mqtt://localhost:1883'
  }
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
    opts = _.defaults(opts || {}, DEFAULTS);
    opts.broker = _.defaults(opts.broker, DEFAULTS.broker);

    this._opts = opts;
    this._domain = domain.create();
    this._domain.add(this);
    this._unloadedPlugins = {};
    this._graph = new dependencyGraph.DepGraph();
    this._broker = null;
    this._ascoltatore = null;

    debug(`${this}: instantiated w/ options:`, opts);

    if (opts.autoStart) {
      this.start();
    }
  }

  _detect() {
    return Promise.bind(this)
      .then(function () {
        return Plugins.autoDetect(path.join(__dirname, '..', '..'));
      })
      .then(this.use);
  }

  get isReady() {
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
   * When a plugin emits an error or throws an exception, it is handled within
   * a unique domain.  That domain's `error` event handler call this function.
   * @param {*} err Could be anything really
   * @param {string} pluginName This should be present
   * @param {Object} metadata This should be present as well
   */
  pluginError(err, pluginName, metadata) {
    if (_.isError(err)) {
      debug(`Plugin "${pluginName}" died with error: ${err.message}
      * Error name        : ${err.constructor.name}
      * Explicitly thrown : ${err.domainThrown}
      * Plugin metadata   : ${metadata}`);
    } else {
      debug(`Plugin "${pluginName}" emitted error: ${err}
      * Plugin metadata   : ${metadata}`);
    }
    this.emit('error', err);
  }

  collisionError(pluginName) {
    let conflicts;
    if (_.isArray(pluginName)) {
      conflicts = _(pluginName)
        .map(function (name) {
          return `"${name}"`;
        })
        .join(', ');
    } else {
      conflicts = pluginName;
    }
    return new Error(`${this}: Conflicting plugin name(s): ${conflicts}`);
  }

  _initBroker() {

    let opts = this._opts.broker;
    // TODO handle this with Joi
    switch (opts.type) {
      case 'amqp':
        opts.amqp = opts.amqp || require('amqp');
        break;
      case 'redis':
        opts.redis = opts.redis || require('redis');
        break;
      case 'zmq':
        opts.zmq = opts.zmq || require('zmq');
        break;
      case 'filesystem':
        opts.qlobber_fsq = opts.qlobber_fsq || require('qlobber-fsq');
        break;
      default:
        opts.mqtt = opts.mqtt || require('mqtt');
        break;
    }

    debug(`Using broker "${opts.type}"`);

    return Promise.bind(this)
      .then(function () {
        if (opts.type === 'digs-mqtt-broker') {
          let urlObj = url.parse(opts.url);

          this.use(require('digs-mqtt-broker'), {
            host: urlObj.hostname,
            port: _.parseInt(urlObj.port)
          });

          return this.loadPlugins('digs-mqtt-broker');
        }
      });
  }

  /**
   * Enables a plugin.
   * @param {Function} plugin
   * @param {Object} [opts]
   * @todo validate plugin
   */
  use(plugin, opts) {
    if (_.isArray(plugin)) {
      _.each(plugin, function (p) {
        this.use(p, this._opts.pluginOptions[p.metadata.name]);
      }, this);
      return this;
    }

    let graph = this._graph;
    let metadata = plugin.metadata;
    let pluginName = metadata.name;

    debug(`Using plugin "${pluginName}"`);

    if (_.isUndefined(this[pluginName])) {
      graph.addNode(pluginName);
      _.each([].concat(metadata.dependencies || []), function (dependency) {
        graph.addDependency(pluginName, dependency);
      });
      this._unloadedPlugins[pluginName] = {
        func: plugin,
        opts: opts || {}
      };
      return this;
    }

    throw this.collisionError(pluginName);
  }

  start() {
    if (this._ready) {
      return this._ready;
    }
    let t = Date.now();
    let tasks = [this._initBroker.bind(this)];

    if (this._opts.autoDetectPlugins) {
      tasks.push(this._detect.bind(this));
    }

    return (this._ready = Promise.each(tasks, function (task) {
      return task();
    })
      .bind(this)
      .then(function () {
        return this.loadPlugins();
      })
      .then(function (plugins) {
        let delta = Date.now() - t;
        debug(`Digs started w/ ${plugins.length} plugins in ${delta}ms`);
        this.emit('ready');
      })
      .return(this));
  }

  loadPlugins(plugins) {
    plugins = plugins || this._unloadedPlugins;
    if (!_.size(this._unloadedPlugins)) {
      return Promise.resolve([]);
    }
    if (_.isString(plugins) && _.contains(this, plugins)) {
      return Promise.reject(this.collisionError(plugins));
    }
    if (_.isObject(plugins)) {
      let conflicts = _(plugins)
        .omit(function (plugin, pluginName) {
          return _.isUndefined(this[pluginName]);
        }, this)
        .keys()
        .value();
      if (conflicts.length) {
        return Promise.reject(this.collisionError(conflicts));
      }
    }
    return Plugins.load(this, this._graph, plugins)
      .bind(this)
      .each(function (plugin) {
        let pluginName = plugin.name;
        this[pluginName] = plugin.instance;

        plugin.domain.on('error', function (err) {
          this.pluginError(err, pluginName, plugin.metadata);
        }.bind(this));

        delete this._unloadedPlugins[pluginName];
        debug(`
        Successfully
        loaded
        plugin ${pluginName}`);
      });
  }

  static create(opts, callback) {
    let d = new Digs(opts);
    return d.start()
      .nodeify(callback);
  }
}

Digs.version = pkg.version;

module.exports = Digs;
