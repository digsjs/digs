'use strict';

const common = require('digs-common');
const Promise = common.Promise;
const Glue = Promise.promisifyAll(require('glue'));
const path = require('path');
const _ = common.utils;
const fs = common.fs;
const yaml = require('yaml-js');

function digs(config, options, done) {
  config = config || {};
  options = options || {};

  const join = path.join;
  const root = join(__dirname, '..');
  const cwd = process.cwd();

  config.plugins = _.map(config.plugins, (plugin) => {
    return _(plugin)
      .map((value, name) => {
        if (name.charAt(0) === '/' || name.charAt(0) === '.') {
          name = path.relative(root, join(cwd, name));
        } else {
          name = join(cwd, 'node_modules', name);
        }
        return [name, value];
      })
      .object()
      .value();
  });

  return fs.readFileAsync(path.join(__dirname, 'server.yaml'), 'utf-8')
    .then((serverConfig) => {
      _.extend(config, yaml.load(serverConfig));

      options.preConnections = (server, next) => {
        config.connections.push(require('hapi-coap-listener')(server));
        next();
      };

      options.relativeTo = root;

      return Glue.composeAsync(config, options);
    })
    .then((server) => {
      server.log('digs', 'Digs bootstrapped');
      const t = new Date().getTime();
      return Promise.promisify(server.start, server)()
        .then(() => {
          const delta = new Date().getTime() - t;
          server.log('digs', `Digs started in ${delta}ms`);
        })
        .return(server);
    })
    .nodeify(done);
}

module.exports = digs;
