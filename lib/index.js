'use strict';

let pkg = require('../package.json'),
  Brickhouse = require('./brickhouse'),
  Promise = require('bluebird'),
  _ = require('./common/mixins');

Promise.longStackTraces();

function register(server, opts, next) {

  let brickhouse = new Brickhouse(server, opts);

  server.expose('boards', brickhouse.boards);

  return brickhouse.start()
    .then(function () {
      server.route(require('./routes')(opts.routes));
    })
    .then(next);
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
