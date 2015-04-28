'use strict';

var extend = require('lodash.assign'),
  indexBy = require('lodash.indexby'),
  toArray = require('lodash.toarray'),
  each = require('lodash.foreach'),
  keys = require('lodash.keys'),
  map = require('lodash.map'),
  j5 = require('johnny-five'),
  util = require('util'),

  Board = require('./model'),
  pkg = require('../package.json');

var DEFAULTS = Object.freeze({
  repl: false
}),
  format = util.format;

module.exports = function register(server, options, next) {

  var boards;
  (function patchJ5() {
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

  boards = map(options || {}, function (boardConfig, id) {
    var b = new Board(extend(boardConfig, DEFAULTS, {
      id: id
    }))
      .on('error', function (err) {
        server.emit('error', err);
      });
    server.on('stop', function () {
      b.stop();
    });
    server.log('info', format('Created board with ID "%s"', id));
    return b;
  });

  server.expose({
    boards: boards,
    boardMap: indexBy(boards, 'id')
  });

  server.route(require('./routes'));

  next();
};

module.exports.attributes = {
  name: pkg.name,
  version: pkg.version
};
