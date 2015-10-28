'use strict';

const common = require('digs-common');
const Promise = common.Promise;
const Glue = Promise.promisifyAll(require('glue'));
const path = require('path');
const _ = common.utils;
const fs = common.fs;
const yaml = require('yaml-js');
const debug = common.debug('digs:server');
const DigsObject = common.definitions.DigsObject;

function debugPatch(config) {
  debug('Monkeypatching Hapi debug functionality...');
  _.set(config, 'server.debug.log', _.keys(DigsObject.defaultLogColors));

  const consoleError = console.error;

  console.error = function digsDebug() {
    const args = _.toArray(arguments).map(arg => {
      if (_.isObject(arg)) {
        return _.dump(arg);
      }
      return _.trim(arg);
    });
    args.shift();

    return debug.apply(null, args);
  };

  return function restore() {
    console.error = consoleError;
  };
}

function digs(config, options, done) {
  config = config || {};
  options = options || {};

  const t = new Date().getTime();
  const join = path.join;
  const root = join(__dirname, '..');
  const cwd = process.cwd();
  const getConfig = _.partial(_.get, config);

  debug(`Raw config: \n${_.dump(config)}`);
  debug(`Root path: ${root}`);
  debug(`process.cwd(): ${cwd}`);

  config.plugins = _.map(config.plugins, (plugin) => {
    return _.mapKeys(plugin, (value, name) => {
      if (/^[/.]/.test(name)) {
        const retval = path.relative(root, join(cwd, name));
        debug(`Using local module "${name}" at path ${retval}`);
        return retval;
      }
      debug(`Using module "${name}"`);
      return name;
    });
  });

  debug('Reading server config...');
  const configPath = join(__dirname, 'server.yaml');
  return fs.readFileAsync(configPath, 'utf8')
    .then((serverConfig) => {
      let restore;

      _.merge(config, yaml.load(serverConfig));

      options.preConnections = (server, next) => {
        config.connections.push(require('hapi-coap-listener')(
          server, getConfig('server.app.coap')));
        next();
      };

      options.relativeTo = root;

      if (getConfig('server.app.debug') && !getConfig('server.debug.log')) {
        restore = debugPatch(config);
      }

      debug(`Final configuration:\n${_.dump(config)}`);
      debug(`Glue options:\n${_.dump(options)}`);

      return Glue.composeAsync(config, options)
        .then(server => {
          return [server, restore];
        });
    })
    .spread((server, restore) => {
      if (restore) {
        server.method('restoreConsoleError', restore, {
          callback: false
        });
        debug('Registered method to unpatch Hapi debug functionality');
      }
      return server;
    })
    .then(server => {
      return Promise.promisify(server.start, {
        context: server
      })()
      .then(() => {
        const delta = new Date().getTime() - t;
        server.log('info', `Digs ready in ${delta}ms.`);
      })
      .return(server);
    })
    .asCallback(done);
}

module.exports = digs;
