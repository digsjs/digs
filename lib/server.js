'use strict';

let common = require('digs-common');
let Promise = common.Promise;
let Glue = Promise.promisifyAll(require('glue'));
let path = require('path');
let _ = common.utils;
let fs = common.fs;
let yaml = require('yaml-js');

function digs(config, options, done) {
  config = config || {};
  options = options || {};

  const root = path.join(__dirname, '..');

  config.plugins = _.map(config.plugins, function createPluginHash(plugin) {
    return _(plugin)
      .map(function buildPath(value, name) {
        if (name.charAt(0) === '/' || name.charAt(0) === '.') {
          name = path.relative(root, path.join(process.cwd(), name));
        } else {
          name = path.join(process.cwd(), 'node_modules', name);
        }
        return [name, value];
      })
      .object()
      .value();
  });

  return fs.readFileAsync(path.join(__dirname, 'server.yaml'), 'utf-8')
    .then(function loadServerConfig(serverConfig) {
      _.extend(config, yaml.load(serverConfig));

      options.preConnections = function appendCoAPConnection(server, next) {
        config.connections.push(require('hapi-coap-listener')(server));
        next();
      };

      options.relativeTo = root;

      return Glue.composeAsync(config, options);
    })
    .then(function start(server) {
      server.log('digs', 'Digs bootstrapped');
      const t = new Date().getTime();
      return Promise.promisify(server.start, server)()
        .then(function report() {
          const delta = new Date().getTime() - t;
          server.log('digs', `Digs started in ${delta}ms`);
        })
        .return(server);
    })
    .nodeify(done);
}

module.exports = digs;
