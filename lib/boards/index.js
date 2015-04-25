'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/boards/',
    handler: function (req, reply) {
      reply([]);
    },
    config: {
      description: 'List Boards',
      notes: 'Lists all configured Boards',
      tags: ['api']
    },
    response: {
      schema: require('./boards.schema')
    }
  }
];
