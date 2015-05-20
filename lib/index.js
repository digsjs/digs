'use strict';

let pkg = require('../package.json'),
  Brickhouse = require('./models/brickhouse'),
  Promise = require('bluebird'),
  _ = require('lodash');

Promise.longStackTraces();

function register(server, opts, next) {

  let brickhouse = new Brickhouse(server, opts);

  server.expose('boards', brickhouse.boards);

  return brickhouse.start()
    .then(function () {
      server.route(require('./routes'));
    })
    .then(next);
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
