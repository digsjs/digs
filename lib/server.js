'use strict';

let Promise = require('bluebird');
let Glue = Promise.promisifyAll(require('glue'));
let path = require('path');
let fs = Promise.promisifyAll(require('graceful-fs'));
let _ = require('digs-utils');
let yaml = require('yaml-js');

function digs(config, options, done) {
  config = config || {};
  options = options || {};

  const root = path.join(__dirname, '..');

  config.plugins = _.map(config.plugins, function(plugin) {
    return _(plugin)
      .map(function(value, name) {
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

  _.extend(config,
    yaml.load(fs.readFileSync(path.join(__dirname, 'server.yaml'),
      'utf-8')), {});

  options.preConnections = function appendCoAPConnection(server, next) {
    config.connections.push(require('hapi-coap-listener')(server));
    next();
  };

  options.relativeTo = root;

  //return fs.
  return Glue.composeAsync(config, options)
    .then(function start(server) {
      server.log('digs', 'Digs bootstrapped');
      let t = new Date().getTime();
      return Promise.promisify(server.start, server)()
        .tap(function report() {
          let delta = new Date().getTime() - t;
          server.log('digs', `Digs started in ${delta}ms`);
        });
    })
    .nodeify(done);
}

module.exports = digs;
