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
  /**
   * Sends a message to the parent process.   Transmits {@link Board#id} with
   * every message.
   * @param {(string|Message)} event Event name or Message
   * @param {Message} [message] If `event` specified, more data to put in the
   * `Message`.
   */
  send: function (event, message) {
    debug('SEND', event, message);
    if (!_.isString(event)) {
      process.send(event);
    }
    else {
      process.send(_.extend({}, message, {
        event: event
      }));
    }
  }
};

module.exports = utils;
