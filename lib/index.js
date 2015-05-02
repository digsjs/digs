'use strict';

var _ = require('lodash'),
  util = require('util'),
  cluster = require('cluster'),
  Board = require('./model'),
  pkg = require('../package.json');

var CONNECTION_TIMEOUT_MS = 1e4, // 10s
  RETRY_MS = 3e4, // 30s
  format = util.format;

function register(server, options, next) {
  if (cluster.isMaster) {
    options = options || {};

    let boards = _.map(options, function (boardConfig, id) {
      var config = _(boardConfig)
          .omit('connectionTimeout', 'retry')
          .extend({id: id})
          .value(),
        timeout = boardConfig.connectionTimeout || CONNECTION_TIMEOUT_MS,
        retry = boardConfig.retry || RETRY_MS,
        board = new Board(config)
          .on('error', function (err) {
            server.emit('error', err);
          })
          .on('online',
          /**
           * @this Board
           */
          function (worker) {
            this.log('debug',
              format('Worker connected with id "%d"', worker.id));
            this._connection = setTimeout(function () {
              this.log('error',
                format('Connection timeout of %dms reached!', timeout));
              this._worker.disconnect();
              if (retry) {
                this.log('info', format('Retrying connection in %dms', retry));
                this._connection = setTimeout(this.start.bind(this), retry);
              }
            }.bind(this), timeout);
          })
          .on('ready', function () {
            clearTimeout(this._connection);
            server.log('info',
              format('Board "%s" is ready on port "%s"', this.id, this.port));
            server.emit(format('%s.ready', pkg.name), this);
          })
          .on('log', function () {
            var args = _(arguments)
              .toArray()
              .compact()
              .tap(function (argArray) {
                argArray[0] = [].concat(argArray[0], pkg.name);
              })
              .value();
            server.log.apply(server, args);
          });

      server.on('stop', function () {
        board.stop();
      });

      this.log('info', format('Created board with ID "%s"', id));

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
