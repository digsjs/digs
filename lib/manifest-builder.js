'use strict';

const common = require('digs-common');
const _ = common.utils;
const debug = common.debug('digs:manifest-builder');
const fs = common.fs;
const yaml = require('yaml-js');
const path = require('path');

module.exports = function buildManifest(manifest, root) {
  debug('Building manifest...');
  const cwd = process.cwd();
  debug(`cwd: ${cwd}`);

  manifest = _.defaults(manifest || {}, {
    server: {},
    plugins: [],
    connections: []
  });

  manifest.plugins = _.map(manifest.plugins, plugin => {
    return _.mapKeys(plugin, (value, name) => {
      return require.resolve(name);
    });
  });

  const configPath = path.join(__dirname, 'server.yaml');
  return fs.readFileAsync(configPath, 'utf8')
    .then(yaml.load)
    .then(serverManifest => {
      serverManifest.plugins = _.map(serverManifest.plugins, plugin => {
        return _.mapKeys(plugin, (value, name) => {
          if (name.charAt(0) === '.') {
            name = path.resolve(root, name);
          }
          return name;
        });
      });

      manifest.server = _.merge(serverManifest.server, manifest.server);

      manifest.connections.unshift.apply(manifest.connections,
        serverManifest.connections);

      manifest.plugins.unshift.apply(manifest.plugins, serverManifest.plugins);

      return manifest;
    });
};
