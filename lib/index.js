'use strict';

let pkg = require('../package.json');
let Boom = require('boom');

function digs(server, opts, done) {
  server.route({
    method: '*',
    path: '/{p*}',
    handler: function(req, reply) {
      reply(Boom.notFound());
    }
  });

  server.select('coap').route({
    method: 'POST',
    path: '/log/{tags*}',
    handler: function(req, reply) {
      server.log(req.params.tags.split('/'), req.payload);
      reply({success: true});
    }
  });

  server.log('digs', 'Digs plugin registered successfully');

  done();
}

digs.attributes = {
  pkg: pkg,
  dependencies: [
    'good',
    'blipp'
  ]
};

digs.createServer = require('./server');

module.exports = digs;
