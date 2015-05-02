'use strict';

var j5 = require('johnny-five'),
  _ = require('lodash'),
  cluster = require('cluster'),
  pkg = require('../package.json'),
  util = require('util'),
  events = require('events');

var EventEmitter = events.EventEmitter,
  format = util.format;

function Board(opts) {
  EventEmitter.call(this);
  this._opts = opts;
  this.id = opts.id || _.uniqueId('board-');
}

Board.prototype = _.create(EventEmitter.prototype, {
  log: function log() {
    this.emit.apply(this, ['log'].concat(_.toArray(arguments)));
  },
  start: function start() {
    var self = this;
    this.log('debug', format('Forking for connection to "%s"', this.id));

    self._worker = cluster.fork({
      opts: JSON.stringify(self._opts),
      plugin: pkg.name
    })
      .on('online', function () {
        self.emit('online', this);
      })
      .on('disconnected',
      /**
       * @this Worker
       */
      function () {
        self.log('debug', format('Worker process "%s" disconnected', this.id));
      })
      .on('message', function (data) {
        switch (data.event) {
          case 'ready':
            self.port = data.port;
            self.emit('ready', self);
            break;
          default:
          case 'error':
            self.emit('error', data.err);
            this.kill();
            break;
        }
      });
    return this;
  },
  stop: function () {
    if (this._worker || !this._worker.isDead()) {
      this._worker.disconnect();
      this.log('info', format('Disconnected from "%s"', this.id));
    }
  },
  toJSON: function () {
    return _.pick(this, 'id', 'port', 'connected');
  }
});

Object.defineProperties(Board.prototype, {
  connected: {
    get: function () {
      return this._worker && this._worker.isConnected();
    }
  }
});

module.exports = Board;
