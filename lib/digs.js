'use strict';

let path = require('path');
let domain = require('domain');
let url = require('url');

let Promise = require('bluebird');
let _ = require('lodash');
let dependencyGraph = require('dependency-graph');

let DigsEmitter = require('digs-common/digs-emitter');

let Plugins = require('./plugins');
let pkg = require('../package.json');
let DigsClient = require('./client');

let debug = require('debug')('digs:digs');

const INTERNAL_BROKER_MODULE = 'digs-mqtt-broker';

const DEFAULTS = {
  namespace: pkg.name,
  project: 'home',
  autoDetectPlugins: false,
  pluginOptions: {},
  broker: {
    type: INTERNAL_BROKER_MODULE,
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
    this._client = null;
    this._ready = null;

    Object.defineProperty(this, 'id', {
      get: function() {
        return this.project;
      }
    });

    debug(`${this}: instantiated w/ options:`, opts);
  }

  _detect() {
    return Promise.bind(this)
      .then(function () {
        return Plugins.autoDetect(path.join(__dirname, '..', '..'));
      })
      .then(this.use)
      .catch(function (err) {
        debug(`Failed to autodetect external plugins: ${err}`);
      });
  }

  get isReady() {
    return !!this._ready && this._ready.isFulfilled();
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

  /**
   * If one or more plugins conflict with existing properties of this instance
   * (or up its prototype chain), we'll call this function and throw the
   * Error returned by it.
   * @param {(Array|string)} pluginName The problem plugin name(s)
   * @returns {Error} Error which reports the offending name(s)
   */
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

  _initInternalBroker() {
    return Promise.bind(this)
      .then(function () {
        let opts = this._opts.broker;
        if (opts.type === INTERNAL_BROKER_MODULE) {
          debug(`Starting internal broker`);

          let urlObj = url.parse(opts.url);
          opts.mqtt = opts.mqtt || require('mqtt');

          this.use(require(INTERNAL_BROKER_MODULE), {
            host: urlObj.hostname,
            port: _.parseInt(urlObj.port)
          });

          return this.loadPlugins(INTERNAL_BROKER_MODULE);
        }
      });
  }

  _initClient() {
    return Promise.bind(this)
      .then(function () {
        let client = this._client = new DigsClient({
          project: this.project,
          namespace: this.namespace,
          broker: this._opts.broker
        });
        return client.start();
      });
  }


  /**
   * Enables a plugin.
   * @param {Function} plugin Plugin function
   * @param {Object} [opts] Opts for plugin
   * @todo validate plugin
   * @throws If the plugin name conflicts with an existing property of this
   * instance
   * @see collisionError
   * @returns {Digs} This instance
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
    let opts = this._opts;
    let t = Date.now();
    let tasks = [];

    if (opts.broker.type === 'digs-mqtt-broker') {
      tasks.push(this._initInternalBroker.bind(this));
    }

    tasks.push(this._initClient.bind(this));

    if (opts.autoDetectPlugins) {
      tasks.push(this._detect.bind(this));
    }

    tasks.push(this.loadPlugins.bind(this));

    return (this._ready = Promise.map(tasks, function (task) {
      return task();
    })
      .bind(this)
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
        debug(`Successfully loaded plugin ${pluginName}`);
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
