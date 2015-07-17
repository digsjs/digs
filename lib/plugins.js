'use strict';

process.env.DEBUG = 'digs:plugins';

let Promise = require('bluebird');
let path = require('path');
let _ = require('lodash');
let pkg = require('../package.json');
let domain = require('domain');
let Joi = require('joi');
let findup = Promise.promisify(require('findup'));
let fs = require('fs');
let DigsUtil = require('digs-common/digs-util');
let DigsEmitter = require('digs-common/digs-emitter');

const PACKAGE_JSON = 'package.json';
const PLUGIN_REGEX = new RegExp(`^${pkg.name}-?plugin$`);
const CHARSET = 'utf8';
const NODE_MODULES = 'node_modules';

let join = path.join;
let debug = require('debug')('digs:plugins');
let errorize = DigsUtil.errorize;

Promise.promisifyAll(fs);

let Plugins = DigsEmitter.create({

  autoDetect(cwd) {
    return Plugins.discoverPlugins(cwd)
      .then(Plugins.requirePlugins)
      .catch(function (err) {
        throw errorize(err);
      });
  },

  discoverPlugins(cwd) {
    // find the parent package.json
    debug(`Discovering plugins within "${cwd}"`);
    return findup(cwd, PACKAGE_JSON)
      .catch(function (err) {
        debug('package.json not found');
        throw errorize(err);
      })
      .then(function (parentPkgPath) {
        let readFile = fs.readFileAsync;
        // read it
        let parentPkg = join(parentPkgPath, PACKAGE_JSON);
        debug(`Reading dependencies from "${parentPkg}"`);
        return readFile(parentPkg, CHARSET)
          .then(function (pkgFile) {
            // map each dependency to its path within the parent
            // (siblings of this module)
            let pkg = JSON.parse(pkgFile);
            let pkgPaths = _.mapValues(pkg.dependencies,
              function (version, pkgName) {
                return join(parentPkgPath, NODE_MODULES, pkgName);
              });
            let numDeps = _.size(pkgPaths);
            // read all the package.jsons for the deps
            debug(`Found ${numDeps} dependencies to examine`);
            return Promise.settle(_.map(pkgPaths, function (pkgPath) {
              return readFile(join(pkgPath, PACKAGE_JSON), CHARSET);
            }))
              .then(function (pkgPromises) {
                // get the ones that we found
                return _(pkgPromises)
                  .filter(function (pkgPromise) {
                    let result = pkgPromise.isFulfilled();
                    if (!result) {
                      debug(`Unable to read package file: ` +
                        `${pkgPromise.reason()}`);
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
                    debug(`Found plugin "${pkg.name}"`);
                    return pkgPaths[pkg.name];
                  })
                  .value();
              });
          });
      });
  },

  requirePlugins(paths) {
    return Promise.settle(_.map(paths, Plugins.requirePlugin))
      .then(function (results) {
        return _(results)
          .filter(function (result) {
            var retval = result.isFulfilled();
            if (!retval) {
              debug(`Unable to require module: ${result.reason()}`);
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
    debug(`Requiring module at ${modulePath}...`);
    return Promise.try(function () {
      return require(modulePath);
    })
      .then(function(pluginFunc) {
        if (!_.isObject(pluginFunc.metadata)) {
          throw new Error(`Invalid plugin at ${modulePath}`);
        }
        return pluginFunc;
      });
  },

  load(digs, graph, pluginMap) {
    let order = _.filter(graph.overallOrder(), function(pluginName) {
      return pluginMap[pluginName];
    });
    return Promise.map(order, function (moduleName) {
      let pluginInfo = pluginMap[moduleName];
      let metadata = pluginInfo.func.metadata;
      let defaults = metadata.defaults;
      let pluginName = metadata.name;
      let d = domain.create();

      if (defaults) {
        _.defaults(pluginInfo.opts, defaults);
      }

      debug(`Loading plugin "${pluginName}"...`);

      return new Promise(function (resolve, reject) {
        d.run(function () {
          Promise.try(function () {
            return pluginInfo.func(digs, pluginInfo.opts);
          })
            .then(function (instance) {
              resolve(instance);
            })
            .catch(function (err) {
              reject(err);
            });
        });
      })
        .then(function (instance) {
          debug(`Plugin "${pluginName}" loaded successfully`);
          return {
            instance: instance,
            name: pluginName,
            domain: d,
            metadata: metadata
          };
        });
    });
  }
});

Plugins.requirePlugin.schemata = [
  Joi.string()
    .required()
    .label('modulePath')
    .description('Path to module')
    .tags('plugins')
];

module.exports = Plugins;
