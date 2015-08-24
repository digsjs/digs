'use strict';

let pkg = require('../package.json');
let Boom = require('boom');
let stamps = require('./stamps');
let _ = require('digs-utils');

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

  _.each(stamps, digs.method, digs);

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
