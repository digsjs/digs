'use strict';

var schema = require('./schema'),
  Boom = require('boom'),
  _ = require('lodash'),
  pkg = require('../package.json'),
  util = require('util');

var format = util.format,
  pluginName = pkg.name;

module.exports = [
  {
    method: 'GET',
    path: '/boards',
    handler: function boardsHandler(request, reply) {
      reply(request.server.plugins[pluginName].boards);
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
      var id = request.params.id.trim(),
        boardMap = request.server.plugins[pluginName],
        board;

      if (_.has(boardMap, id) && (board = boardMap[id])) {
        return reply(board);
      }

      reply(Boom.notFound(id &&
          format('Unknown board with ID "%s"', id)));
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
