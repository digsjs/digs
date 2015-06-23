'use strict';

let Promise = require('bluebird'),
  path = require('path'),
  _ = require('lodash'),
  FSUtils = require('./fsutils'),
  pkg = require('../package.json');

const PACKAGE_JSON = 'package.json',
  PLUGIN_REGEX = new RegExp(`^${pkg.name}-?plugin$`),
  CHARSET = 'utf8',
  NODE_MODULES = 'node_modules';

let join = path.join,
  debug = require('debug')('digs:plugins');

let Plugins = {

  discoverPlugins: function discoverPlugins(cwd) {
    cwd = cwd || join(__dirname, '..');
    // find the parent package.json
    debug('<digs.plugins>: Discovering plugins');
    return FSUtils.findup(cwd, PACKAGE_JSON)
      .then(function (parentPkgPath) {
        let readFile = FSUtils.fs.readFileAsync;
        // read it
        return readFile(parentPkgPath, CHARSET)
          .then(function (pkgFile) {
            // map each dependency to its path within the parent
            // (siblings of this module)
            let pkg = JSON.parse(pkgFile),
              pkgPaths = _.mapValues(pkg.dependencies,
                function (version, pkgName) {
                  return join(path.dirname(parentPkgPath), NODE_MODULES,
                    pkgName);
                });
            // read all the package.jsons for the deps
            return Promise.settle(_.map(pkgPaths, function (pkgPath) {
              return readFile(join(pkgPath, PACKAGE_JSON));
            }))
              .then(function (pkgPromises) {
                // get the ones that we found
                let pkgs = _(pkgPromises)
                  .filter(function (pkgFile) {
                    return pkgFile.isFulfilled();
                  })
                  .map(function (pkgFile) {
                    return JSON.parse(pkgFile.value());
                  })
                  .value();
                // look for the relevant keyword(s) and get the names
                // of the plugin packages, then map these to their paths
                return _(pkgs)
                  .filter(function (pkg) {
                    return _.find(_.toArray(pkg.keywords),
                      function (keyword) {
                        return PLUGIN_REGEX.test(keyword);
                      });
                  })
                  .map(function (pkg) {
                    return pkgPaths[pkg.name];
                  })
                  .value();

              });
          });
      });
  },

  requirePlugins(paths) {
    debug('<digs.Plugins>: loading plugins...');
    return Promise.settle(_.map(paths, Plugins.requirePlugin))
      .then(function (results) {
        return _(results)
          .filter(function (result) {
            return result.isFulfilled();
          })
          .map(function (result) {
            return result.value();
          })
          .values();
      });
  },

  requirePlugin(modulePath) {
    return Promise.try(function () {
      return require(modulePath);
    });
  }
};

module.exports = Plugins;
