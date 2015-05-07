'use strict';

var pkg = require('../package.json'),
  Brickhouse = require('./brickhouse'),
  routes = require('./routes'),
  _ = require('lodash');

function register(server, opts, next) {

  var brickhouse = new Brickhouse(server, opts);

  server.expose({
    boards: brickhouse.boards
  });

  return brickhouse.start()
    .then(function () {
      server.route(routes);
    })
    .then(next);
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
