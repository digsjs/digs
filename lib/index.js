'use strict';

var extend = require('lodash.assign'),
  indexBy = require('lodash.indexby'),
  toArray = require('lodash.toarray'),
  each = require('lodash.foreach'),
  keys = require('lodash.keys'),
  map = require('lodash.map'),
  j5 = require('johnny-five'),
  board = require('./board'),
  pkg = require('../package.json');

var DEFAULTS = Object.freeze({
  repl: false
}),
  Board = board.Board;

module.exports = function register(server, options, next) {

  (function initJohnnyFive() {
    var boardProto = j5.Board.prototype;

    // redirect logs to server logs
    each(keys(boardProto.log.types), function (type) {
      boardProto[type] = (function (type) {
        return function () {
          server.log.apply(server, [type].concat(toArray(arguments).join(': ')));
        };
      }(type));
    });

  }());

  var boards = map([].concat(options), function (boardConfig) {
    var b = new Board(extend(boardConfig, DEFAULTS))
      .on('error', function (err) {
        server.emit('error', err);
      });
    return b;
  });

  server.expose('boards', indexBy(boards, 'id'));
  server.on('stop', function () {
    board.stop();
  });

  server.route(require('./boards'));

  next();
};

module.exports.attributes = {
  name: pkg.name,
  version: pkg.version
};
