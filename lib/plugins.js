'use strict';

let Promise = require('bluebird');
let path = require('path');
let _ = require('lodash');
let pkg = require('../package.json');

const PACKAGE_JSON = 'package.json';
const PLUGIN_REGEX = new RegExp(`^${pkg.name}-?plugin$`);
const CHARSET = 'utf8';
const NODE_MODULES = 'node_modules';

let join = path.join;
let debug = require('debug')('digs:plugins');

let Plugins = {

  autoDetect: function autoDetect(cwd) {
    return Plugins.discoverPlugins(cwd)
      .then(Plugins.requirePlugins)
      .catch(function (err) {
        debug(`${this}: Could not autodetect plugins: ${err}`);
      });
  },

  discoverPlugins: function discoverPlugins(cwd) {
    let FSUtils = require('./fsutils');
    cwd = cwd || join(__dirname, '..');
    // find the parent package.json
    debug(`Discovering plugins within ${cwd}`);
    return FSUtils.findup(cwd, PACKAGE_JSON)
      .catch(function (err) {
        debug('package.json not found');
        return Promise.reject(err);
      })
      .then(function (parentPkgPath) {
        let readFile = FSUtils.fs.readFileAsync;
        // read it
        return readFile(join(parentPkgPath, PACKAGE_JSON), CHARSET)
          .then(function (pkgFile) {
            // map each dependency to its path within the parent
            // (siblings of this module)
            let pkg = JSON.parse(pkgFile);
            let pkgPaths = _.mapValues(pkg.dependencies,
              function (version, pkgName) {
                return join(parentPkgPath, NODE_MODULES, pkgName);
              });
            // read all the package.jsons for the deps
            return Promise.settle(_.map(pkgPaths, function (pkgPath) {
              return readFile(join(pkgPath, PACKAGE_JSON));
            }))
              .then(function (pkgPromises) {
                // get the ones that we found
                return _(pkgPromises)
                  .filter(function (pkgFile) {
                    let result = pkgFile.isFulfilled();
                    if (!result) {
                      debug(`Unable to read package file: ${pkgFile.reason()}`);
                    }
                    return result;
                  })
                  .map(function (pkgFile) {
                    return JSON.parse(pkgFile.value());
                  })
                  .filter(function (pkg) {
                    return _.find([].concat(pkg.keywords), function (keyword) {
                      return PLUGIN_REGEX.test(keyword);
                    });
                  })
                  .map(function (pkg) {
                    return pkgPaths[pkg.name];
                  })
                  .value();
              });
          });
      })
      .catch(function (err) {
        if (cwd !== path.join(__dirname, '..')) {
          debug('Failed to autodetect external plugins');
        }
        else {
          return Promise.reject(err);
        }
      });
  },

  requirePlugins(paths) {
    return Promise.settle(_.map(paths, Plugins.requirePlugin))
      .then(function (results) {
        return _(results)
          .filter(function (result) {
            var retval = result.isFulfilled();
            if (!retval) {
              debug(`Unable to read package file: ${result.reason()}`);
            }
            return retval;
          })
          .map(function (result) {
            return result.value();
          })
          .value();
      });
  },

  requirePlugin(modulePath) {
    return Promise.try(function () {
      debug(`Requiring module at ${modulePath}...`);
      return require(modulePath);
    });
  },

  load: function load(graph, registeredPlugins) {
    let order = graph.overallOrder();
    let plugins = _.map(order, function (pluginName) {
      return registeredPlugins[pluginName];
    }, this);
    return Promise.each(plugins, function (pluginInfo) {
      let metadata = pluginInfo.metadata;
      let pluginName = metadata.name;
      let defaults = metadata.defaults;

      if (defaults) {
        _.defaults(pluginInfo.opts, defaults);
      }

      return Promise.try(function () {
        debug(`Loading plugin "${pluginName}"...`);
        return pluginInfo.func(this, pluginInfo.opts);
      }.bind(this))
        .bind(this)
        .then(function (plugin) {
          debug(`Plugin "${pluginName}" loaded successfully`);
          return {
            name: pluginName,
            plugin: plugin
          };
        });
    }.bind(this));

  }
};

module.exports = Plugins;
