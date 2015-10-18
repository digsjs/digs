'use strict';

const pkg = require('../package.json');
const Boom = require('boom');
const common = require('digs-common');
const _ = common.utils;
const definitions = common.definitions;

function digsPlugin(digs, opts, done) {
  digs.route({
    method: '*',
    path: '/{p*}',
    handler: (req, reply) => reply(Boom.notFound())
  });

  digs.route({
    method: 'POST',
    path: '/log/{tags*}',
    handler: (req, reply) => {
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

  _.each(definitions, (factory, name) => {
    digs.method(name, _.partialRight(factory, digs));
  });

  done();
}

digsPlugin.attributes = {
  pkg: pkg,
  dependencies: [
    'good',
    'blipp',
    'digs-data'
  ]
};

digsPlugin.createServer = require('./server');

module.exports = digsPlugin;
