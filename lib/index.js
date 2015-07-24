'use strict';

let path = require('path');
let domain = require('domain');
let Promise = require('bluebird');
let _ = require('lodash');
let dependencyGraph = require('dependency-graph');
let Router = require('router');

let DigsEmitter = require('digs-common/digs-emitter');
let CoAPServer = require('coap').createServer;
let Plugins = require('./plugins');
let pkg = require('../package.json');

let debug = require('debug')('digs');

const DEFAULTS = {
  namespace: pkg.name,
  project: 'home',
  autoDetectPlugins: false,
  pluginOptions: {},
  port: 5683,
  address: null
};

/**
 * Plugin class
 */
class Digs extends CoAPServer {

  /**
   * Instantiates Digs
   * @constructor
   */
  constructor(opts) {

    /**
     * Plugin Configuration
     * @type {Object}
     */
    opts = _.defaults(opts || {}, DEFAULTS);

    super(opts);

    DigsEmitter.createId(this);
    DigsEmitter.createValidatorProxies(this);

    this._opts = opts;
    this._domain = domain.create();
    this._domain.add(this);
    this._unloadedPlugins = {};
    this._plugins = {};
    this._graph = new dependencyGraph.DepGraph();
    this._ready = null;
    this.router = new Router();

    Object.defineProperty(this, 'id', {
      get: function() {
        return this.project;
      }
    });

    debug(`${this}: instantiated w/ options:`, opts);
  }

  toString() {
    return DigsEmitter.prototype.toString.apply(this, arguments);
  }

  when() {
    return DigsEmitter.prototype.when.apply(this, arguments);
  }

  _detect() {
    return Promise.bind(this)
      .then(function() {
        let parent = module;
        while (parent.parent) {
          parent = parent.parent;
        }
        return Plugins.autoDetect(path.dirname(parent.filename));
      })
      .each(function(plugin) {
        return this.use(plugin, this._opts.pluginOptions[plugin.metadata.name]);
      })
      .catch(function(err) {
        debug(`Failed to autodetect external plugins:`, err);
      });
  }

  get plugins() {
    return _.pluck(this._plugins, 'metadata');
  }

  get info() {
    return {
      namespace: this.namespace,
      project: this.project,
      plugins: this.plugins
    };
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

  get port() {
    return this._port;
  }

  get address() {
    return this._address || 'localhost';
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
        .map(function(name) {
          return `"${name}"`;
        })
        .join(', ');
    } else {
      conflicts = pluginName;
    }
    return new Error(`${this}: Conflicting plugin name(s): ${conflicts}`);
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
      _.each(plugin, function(p) {
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
      _.each([].concat(metadata.dependencies || []), function(dependency) {
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

  _listen() {
    let opts = this._opts;
    return Promise.promisify(this.listen, this)(opts.port, opts.address)
      .bind(this)
      .then(function() {
        this.on('request', function(req, res) {
          res.json = function json(value) {
            res.setOption('Content-Format', 'application/json');
            res.write(JSON.stringify(value));
          };

          this.router(req, res, function(err) {
            this.emit('error', err);
          }.bind(this));
        });

        this.router.get('/', function(req, res) {
          res.json(this.info);
          res.end();
        }.bind(this));

        debug(`${this}: CoAP server listening on ${this.address}:${this.port}`);
      });
  }

  stop() {
    return Promise.promisify(this.close, this)();
  }

  start() {
    if (this._ready) {
      return this._ready;
    }
    let opts = this._opts;
    let t = Date.now();
    let tasks = [];

    tasks.push(this._listen.bind(this));

    if (opts.autoDetectPlugins) {
      tasks.push(this._detect.bind(this));
    }

    tasks.push(this._loadPlugins.bind(this));

    return (this._ready = Promise.each(tasks, function(task) {
      return task();
    })
      .bind(this)
      .then(function(resolved) {
        let plugins = _.last(resolved);
        let delta = Date.now() - t;
        debug(`${this}: Started w/ ${plugins.length} plugins in ${delta}ms`);
        this.emit('ready');
      })
      .return(this));
  }

  _loadPlugins(plugins) {
    plugins = plugins || this._unloadedPlugins;

    if (_.isString(plugins)) {
      if (_.contains(this, plugins)) {
        return Promise.reject(this.collisionError(plugins));
      }
      plugins = _.pick(this._unloadedPlugins, plugins);
      if (!plugins) {
        debug(`${this}: Plugin "${plugins}" not found.  Did you use() it?`);
        return Promise.resolve([]);
      }
    }
    if (_.isObject(plugins)) {
      let size = _.size(plugins);
      if (!size) {
        if (plugins === this._unloadedPlugins) {
          debug(`${this}: No unloaded plugins found`);
        }
        return Promise.resolve([]);
      }
      debug(`${this}: Attempting to load ${size} plugin(s)`);
      let conflicts = _(plugins)
        .omit(function(plugin, pluginName) {
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
      .each(function(pluginData) {
        let pluginName = pluginData.name;
        Object.defineProperty(this, pluginName, {
          get: function() {
            return this._plugins[pluginName].instance;
          }
        });
        this._plugins[pluginName] = pluginData;

        pluginData.domain.on('error', function(err) {
          this.pluginError(err, pluginName, pluginData.metadata);
        }.bind(this));

        delete this._unloadedPlugins[pluginName];
      });
  }

  expose(name, func, args, ctx) {
    if (!_.isArray(args)) {
      ctx = args;
      args = null;
    }
    ctx = ctx || null;

    if (!this[name]) {
      if (args) {
        this[name] = func.bind(ctx, args);
      } else {
        this[name] = func.bind(ctx);
      }
    }
    throw new Error('name conflict');
  }

}

Digs.version = pkg.version;

module.exports = Digs;
