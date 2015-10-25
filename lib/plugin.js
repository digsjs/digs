'use strict';

const pkg = require('../package.json');
const Boom = require('boom');

function digsPlugin(digs, opts, done) {
  digs.route({
    method: '*',
    path: '/{p*}',
    handler: (req, reply) => reply(Boom.notFound())
  });

  // TODO remove; replace w/ seneca
  digs.route({
    method: 'POST',
    path: '/log/{tags*}',
    handler: (req, reply) => {
      digs.log(req.params.tags.split('/'), req.payload);
      reply({
        success: true
      });
    },
    config: {
      tags: [
        'digs',
        'log'
      ]
    }
  });

  digs.log('debug', 'Digs plugin registered successfully');

  done();
}

digsPlugin.attributes = {
  pkg: pkg
};

module.exports = digsPlugin;
