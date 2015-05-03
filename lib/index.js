'use strict';

var _ = require('lodash'),
  util = require('util'),
  cluster = require('cluster'),
  Board = require('./model'),
  pkg = require('../package.json');

var format = util.format;

function register(server, options, next) {
  if (cluster.isMaster) {
    options = options || {};

    let boards = _.map(options, function (boardConfig, id) {
      var board = new Board(_.extend(boardConfig, {id: id}));

      _.each(Board.eventHandlers.server, function (factoryFunc, name) {
        board.on(name, factoryFunc(server));
      });

      server.on('stop', function () {
        board.stop();
      });

      server.log('info', format('Created board with ID "%s"', id));

      return board.start();
    });

    server.expose({
      boards: boards,
      boardMap: _.indexBy(boards, 'id')
    });

    server.route(require('./routes'));

  }
  else {
    server.expose({
      work: require('./worker')
    });
  }

  next();
}

register.attributes = _.pick(pkg, 'name', 'version', 'description');

module.exports = register;
