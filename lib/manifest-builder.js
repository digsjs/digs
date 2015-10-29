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

  const configPath = path.join(__dirname, 'server.yaml');
  return fs.readFileAsync(configPath, 'utf8')
    .then(yaml.load)
    .then(serverManifest => {
      _.merge(manifest.server, serverManifest.server);
      manifest.connections.push.apply(manifest.connections,
        serverManifest.connections);
      manifest.plugins = _(manifest.plugins)
        .concat(serverManifest.plugins)
        .map(plugin => {
          return _.mapKeys(plugin, (value, name) => {
            let retval;
            if (/^\./.test(name)) {
              retval = path.resolve(root, path.join(cwd, name));
              debug(`Using local module "${name}" at path ${retval}`);
            //} else if (/^\//.test(name)) {
            //  retval = path.relative(root, name);
            //  debug(`Using absolute module "${name}" at path ${retval}`);
            } else {
              retval = name;
              debug(`Using installed or absolute module "${name}"`);
            }
            return retval;
          });
        })
        .value();
      return manifest;
    });
};
