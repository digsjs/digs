'use strict';

let _ = require('lodash');
let Server = require('hapi').Server;
let connections = require('./connections');
let defaults = require('./defaults');
let Promise = require('bluebird');
let errorist = require('errorist');

function createDigs(opts) {
  let options = defaults(opts);

  let digs = new Server({
    app: {
      namespace: options.namespace,
      project: options.project
    },
    plugins: options.plugins,
    connections: options.connections
  })
    .on('ready', function() {
      digs.log('digs', 'Digs ready to start');
    });

  _.each(connections, function createConnection(connect) {
    digs.connection(connect(digs, options));
  });

  let pluginSettings = digs.settings.plugins;
  digs.app.ready =
    Promise.map(_.keys(pluginSettings).concat('./digs'), function(name) {
      return new Promise(function(resolve, reject) {
        digs.register({
          register: require(name),
          options: pluginSettings[name]
        }, function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      })
        .then(function() {
          digs.log('digs', `Registered plugin "${name}"`);
        });
    })
      .catch(function(err) {
        let error = errorist(err);
        digs.log(['digs', 'fatal'], error);
        digs.emit('error', error);
      })
      .then(function report() {
        digs.emit('ready');
      });

  return digs;
}

module.exports = createDigs;
