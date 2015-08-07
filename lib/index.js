'use strict';

let _ = require('lodash');
let Hapi = require('hapi');
let Digs = require('./digs');
let connections = require('./connections');
let defaults = require('./defaults');

function createDigs(opts) {
  let options = defaults(opts);

  let digs = _.create(new Hapi.Server({
    app: {
      namespace: options.namespace,
      project: options.project
    },
    plugins: options.plugins,
    connections: options.connections
  }), Digs);

  _.each(connections, function createConnection(connect) {
    digs.connection(connect(digs, options));
  });

  digs._ready = digs._register([
    {
      register: require('good'),
      options: digs.settings.plugins.good
    }, {
      register: require('blipp'),
      options: {}
    }
  ])
    .then(function report() {
      digs.log('Digs bootstrapped');
    });

  return digs;
}

module.exports = createDigs;
