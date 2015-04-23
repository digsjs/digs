'use strict';

var path = require('path'),
  assign = require('lodash.assign'),
  indexBy = require('lodash.indexby'),
  map = require('lodash.map'),
  Board = require('./board');

var DEFAULTS = Object.freeze({
  repl: false
});

module.exports = {
  register: function register(server, options, next) {
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
  },
  attributes: require(path.join('..', 'package.json'))
};
