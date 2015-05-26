'use strict';

let pkg = require('../package.json'),
  Digs = require('./digs'),
  Promise = require('bluebird'),
  _ = require('./common/lodash-mixins');

Promise.longStackTraces();

function register(server, opts, next) {

  let digs = new Digs(server, opts);

  server.expose('boards', digs.boards);

  return digs.start()
    .then(function () {
      server.route(require('./routes')(opts.routes));
    })
    .then(next);
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
