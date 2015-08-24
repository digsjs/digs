'use strict';

let pkg = require('../package.json');
let Boom = require('boom');
let _ = require('digs-utils');
let common = require('./common');

function digsPlugin(digs, opts, done) {
  digs.route({
    method: '*',
    path: '/{p*}',
    handler: function notFound(req, reply) {
      reply(Boom.notFound());
    }
  });

  digs.route({
    method: 'POST',
    path: '/log/{tags*}',
    handler: function log(req, reply) {
      digs.log(req.params.tags.split('/'), req.payload);
      reply({success: true});
    },
    config: {
      tags: [
        'digs',
        'log'
      ]
    }
  });

  digs.log('digs', 'Digs plugin registered successfully');

  _.each(common, function expose(factory, name) {
    digs.method(name, _.partialRight(factory, digs));
  });

  done();
}

digsPlugin.attributes = {
  pkg: pkg,
  dependencies: [
    'good',
    'blipp'
  ]
};

digsPlugin.createServer = require('./server');

module.exports = digsPlugin;
