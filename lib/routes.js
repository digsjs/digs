'use strict';

let schema = require('./schema'),
  Boom = require('boom'),
  _ = require('lodash'),
  pkg = require('../package.json');

let debug = require('debug')('brickhouse:routes');

const PLUGIN = pkg.name;

module.exports = function routes(opts) {
  opts = _.defaults(opts, {
    basePath: PLUGIN
  });

  let path = _.partial(_.format, '/%s%s', opts.basePath);

  return [
    {
      method: 'GET',
      path: path('/'),
      handler: function boardsHandler(request, reply) {
        reply(request.server.plugins[PLUGIN].boards);
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
      path: path('/{id}'),
      handler: function boardHandler(request, reply) {
        let id = request.params.id.trim(),
          boards = request.server.plugins[PLUGIN].boards,
          board;

        if ((board = boards[id])) {
          return reply(board);
        }

        reply(Boom.notFound(_.format('Unknown board with ID "%s"', id)));
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
      path: path('/{id}/{componentId}'),
      handler: function componentHandler(request, reply) {
        let id = request.params.id.trim(),
          componentId = request.params.componentId.trim(),
          boards = request.server.plugins[PLUGIN].boards,
          board;

        if ((board = boards[id]) && board.componentMap[componentId]) {
          return reply(board.componentMap[componentId]);
        }

        reply(Boom.notFound(id && _.format('Unknown board with ID "%s"', id)));
      },
      config: {
        description: 'Get Component',
        notes: 'Get detail for a single Component on a Board',
        tags: ['api']
      }
    },
    {
      method: 'POST',
      path: path('/{id}/{componentId}/{method}'),
      handler: function componentHandler(request, reply) {
        let id = request.params.id.trim(),
          componentId = request.params.componentId.trim(),
          method = request.params.method,
          boards = request.server.plugins[PLUGIN].boards,
          board, component;

        if ((board = boards[id]) &&
          (component = board.componentMap[componentId])) {

          if (_.isFunction(component[method])) {
            return component[method]()
              .then(function (result) {
                debug('Replying with result', result);
                reply(result);
              }, function (err) {
                reply(Boom.notFound(_.format('Error calling method "%s": %s',
                  method,
                  err)));
              });
          }
          return reply(Boom.notFound(_.format('No such method "%s"', method)));
        }

        reply(Boom.notFound(id && _.format('Unknown board with ID "%s"', id)));
      },
      config: {
        description: 'Get Component',
        notes: 'Get detail for a single Component on a Board',
        tags: ['api']
      }
    }

  ];
};
