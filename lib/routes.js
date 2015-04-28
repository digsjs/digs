'use strict';

var schema = require('./schema'),
  Boom = require('boom'),
  util = require('util');

var format = util.format;

module.exports = [
  {
    method: 'GET',
    path: '/boards',
    handler: function boardsHandler(request, reply) {
      reply(request.server.plugins['brickhouse-board'].boards);
    },
    config: {
      description: 'List Boards',
      notes: 'Lists all configured Boards',
      tags: ['api'],
      response: {
        schema: schema.boards
      }
    }
  },
  {
    method: 'GET',
    path: '/board/{id}',
    handler: function boardHandler(request, reply) {
      var id = request.params.id,
        board = request.server.plugins['brickhouse-board'].boardMap[id];
      if (!board) {
        return reply(Boom.notFound(format('Unknown board with ID "%s"', id)));
      }
      reply(board)
    },
    config: {
      description: 'Get Board',
      notes: 'Get detail for a single Board',
      tags: ['api'],
      response: {
        schema: schema.board
      }
    }
  }
];
