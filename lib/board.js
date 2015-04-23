'use strict';

var j5 = require('johnny-five'),
  create = require('lodash.create'),
  uniqueId = require('lodash.uniqueid'),
  events = require('events');

var EventEmitter = events.EventEmitter;

var Board = function Board(opts) {
  EventEmitter.call(this);
  this._opts = opts;
  this.id = opts.id || uniqueId('board');
};

Board.prototype = create(EventEmitter, {
  start: function start() {
    this._board = new j5.Board(opts)
      .on('ready', function () {
        this.emit('ready', this._board);
      // TODO: instantiate configured component objects
      }.bind(this))
      .on('error', function (err) {
        this.emit('error', err);
      });
  },
  stop: function () {
    this._board = null;
  }
});
