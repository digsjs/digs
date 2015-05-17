'use strict';

let _ = require('lodash');

let debug = require('debug')('brickhouse:worker:utils');

let utils = {
  reply: function (req, res) {
    let message = _.extend(res, {
      $messageId: req.$messageId
    });
    utils.send(message);
    debug('REPLY', message);
  },
  error: function error(msg) {
    let message = {
      event: 'log',
      level: 'error',
      msg: msg
    };
    process.send(message);
    debug('ERROR', msg);
    /* eslint no-process-exit:0 */
    process.exit(1);
  },
  send: function (res) {
    let message = _.extend({
      id: JSON.parse(process.env.BRICKHOUSE_BOARD).id
    }, res);
    process.send(message);
    debug('SEND', message);
  }
};

module.exports = utils;
