'use strict';

let pkg = require('../package.json'),
  Brickhouse = require('./models/brickhouse'),
  _ = require('lodash');

function register(server, opts, next) {

  let brickhouse = new Brickhouse(server, opts);

  server.expose({
    boards: brickhouse.boards
  });

  return brickhouse.start()
    .then(function () {
      //server.route(routes);
    })
    .then(next);
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
