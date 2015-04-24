'use strict';

var assign = require('lodash.assign'),
  indexBy = require('lodash.indexby'),
  toArray = require('lodash.toarray'),
  each = require('lodash.foreach'),
  keys = require('lodash.keys'),
  map = require('lodash.map'),
  j5 = require('johnny-five'),
  Board = require('./board');

var DEFAULTS = Object.freeze({
  repl: false
}),
  pkg = require('../package.json')

module.exports = function register(server, options, next) {

  (function initJohnnyFive() {
    var boardProto = j5.Board.prototype;

    // redirect logs to server logs
    each(keys(boardProto.log.types), function (type) {
      boardProto[type] = (function (type) {
        return function () {
          var args = toArray(arguments).join(' ');
          server.log.apply(server, [type].concat(args));
        };
      }(type));
    });

  }());

  var boards = map([].concat(options), function (boardConfig) {
    return new Board(assign(boardConfig, DEFAULTS))
      .on('error', function (err) {
        server.emit('error', err);
      });
  });
  server.expose('boards', indexBy(boards, 'id'));
  server.on('stop', function () {
    board.stop();
  });

  next();
};

module.exports.attributes = {
  name: pkg.name,
  version: pkg.version
}
