'use strict';

var j5 = require('johnny-five'),
  _ = require('lodash');

module.exports = function worker(server, opts) {
  require('./patch')(server);

  opts = opts || {};

  if (!opts.id) {
    return process.send({
      event: 'error',
      err: require('util').format('invalid data object: %j', opts)
    });
  }

  new j5.Board(_.extend(opts, {
    repl: false
  }))
    .on('ready', function () {
      process.send({
        event: 'ready',
        port: this.port
      });
    })
    .on('error', function (err) {
      process.send({
        event: 'error',
        err: err
      });
    });
};
