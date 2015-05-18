'use strict';

let Peon = require('./peon'),
  utils = require('./utils'),
  logMessages = require('./log-messages'),
  pipeEvent = require('pipe-event'),
  _ = require('lodash');

let send = utils.send,
  error = utils.error,
  env = process.env,
  debug = require('debug')('brickhouse:worker'),
  board;

require('./patch');

function main() {
  let peon;

  if (!env.BRICKHOUSE_BOARD) {
    error(logMessages.missingEnv());
  }
  try {
    board = JSON.parse(env.BRICKHOUSE_BOARD);
    debug('Got Board data', board);
  } catch (e) {
    error(logMessages.invalidEnv());
  }

  peon = new Peon(board)
    .on('error', function (err) {
      debug('FATAL', err);
      error(err);
    })
    .on('online', function () {
      let message = {
        id: this.board.id
      };
      debug('ONLINE', message);
      send('online', message);
    })
    .on('ready', function () {
      let message = {
        port: this.board.port,
        id: this.board.id
      };
      debug('READY', message);
      send('ready', message);
    })
    .on('log', function (level, msg) {
      let message = {
        level: level,
        msg: msg
      };
      debug(level.toUppercase(), msg);
      send('log', message);
    });

  pipeEvent(['message'], process, peon);

}


if (require.main === module) {
  main();
}
