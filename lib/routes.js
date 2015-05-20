'use strict';

let schema = require('./schema'),
  Boom = require('boom'),
  _ = require('lodash'),
  pkg = require('../package.json'),
  util = require('util');

let format = util.format,
  pluginName = pkg.name;

module.exports = [
  {
    method: 'GET',
    path: '/boards',
    handler: function boardsHandler(request, reply) {
      reply(_.values(request.server.plugins[pluginName].boards));
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
      let id = request.params.id.trim(),
        boards = request.server.plugins[pluginName].boards,
        board;

      if ((board = boards[id])) {
        return reply(board);
      }

      reply(Boom.notFound(format('Unknown board with ID "%s"', id)));
    },
    config: {
      description: 'Get Board',
      notes: 'Get detail for a single Board',
      tags: ['api'],
      response: {
        schema: schema.board
      }
    }
  },
  {
    method: 'GET',
    path: '/board/{id}/{componentId}',
    handler: function componentHandler(request, reply) {
      let id = request.params.id.trim(),
        componentId = request.params.componentId.trim(),
        boards = request.server.plugins[pluginName].boards,
        board;

      if ((board = boards[id]) && board.componentMap[componentId]) {
        return reply(board.componentMap[componentId]);
      }

      reply(Boom.notFound(id &&
        format('Unknown board with ID "%s"', id)));
    },
    config: {
      description: 'Get Component',
      notes: 'Get detail for a single Component on a Board',
      tags: ['api']
      //response: {
      //  schema: schema.board
      //}
    }
  }
];
