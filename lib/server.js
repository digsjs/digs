'use strict';

let Promise = require('bluebird');
let Glue = Promise.promisifyAll(require('glue'));

function digs(config, options, done) {
  options = options || {};
  options.preConnections = function appendCoAPConnection(server, next) {
    config.connections.push(require('hapi-coap-listener')(server));
    next();
  };

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
