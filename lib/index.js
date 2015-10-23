'use strict';

const common = require('digs-common');
const Promise = common.Promise;
const Glue = Promise.promisifyAll(require('glue'));
const path = require('path');
const _ = common.utils;
const fs = common.fs;
const yaml = require('yaml-js');
const debug = require('debug')('digs');

function digs(config, options, done) {
  config = config || {};
  options = options || {};

  const join = path.join;
  const root = join(__dirname, '..');
  const cwd = process.cwd();

  debug(`Root path: ${root}`);
  debug(`process.cwd(): ${cwd}`);

  if (!_.isEmpty(config.plugins)) {
    debug(`Raw config file plugin options:`, config.plugins);
  }

  config.plugins = _.map(config.plugins, (plugin) => {
    return _.mapKeys(plugin, (value, name) => {
      if (name.charAt(0) === '/' || name.charAt(0) === '.') {
        const retval = path.relative(root, join(cwd, name));
        debug(`Using local module "${name}" at path ${retval}`);
        return retval;
      }
      return name;
    });
  });

  debug('Reading server config...');
  return fs.readFileAsync(join(__dirname, 'server.yaml'), 'utf8')
    .then((serverConfig) => {
      _.extend(config, yaml.load(serverConfig));

      options.preConnections = (server, next) => {
        config.connections.push(require('hapi-coap-listener')(
          server,
          _.get(config, 'server.app.coap')));
        next();
      };

      options.relativeTo = root;

      debug('Final configuration:', config);
      debug('Glue options:', options);
      debug('End of debug output');

      return Glue.composeAsync(config, options);
    })
    .then((server) => {
      server.log('digs', 'Digs ready to start');
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
