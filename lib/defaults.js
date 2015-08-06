'use strict';

let _ = require('lodash');
let pkg = require('../package.json');

const COAP_DEFAULTS = {
  port: 5683,
  address: 'localhost'
};

const HTTP_DEFAULTS = {
  port: 9090,
  address: 'localhost'
};

const PLUGINS_DEFAULTS = {
  good: {
    reporters: [
      {
        reporter: require('good-console'),
        events: {
          log: '*',
          response: '*',
          ops: '*',
          request: '*',
          error: '*'
        },
        config: {
          utc: false,
          format: 'D MMM HH:mm:ss'
        }
      }
    ]
  }
};

const CONNECTIONS_DEFAULTS = {
  router: {
    stripTrailingSlash: true
  }
};

const DEFAULTS = {
  namespace: pkg.name,
  project: 'home',
  plugins: {},
  coap: {},
  http: {},
  connections: {}
};

function defaults(opts) {
  let options = _.cloneDeep(opts);
  options = _.defaults(options || {}, DEFAULTS);
  options.coap = _.defaults(options.coap, COAP_DEFAULTS);
  options.http = _.defaults(options.http, HTTP_DEFAULTS);
  options.plugins = _.defaults(options.plugins, PLUGINS_DEFAULTS);
  options.connections = _.defaults(options.router, CONNECTIONS_DEFAULTS);
  return options;
}

module.exports = defaults;
