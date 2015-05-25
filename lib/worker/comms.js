'use strict';

let _ = require('lodash');

let debug = require('debug')('brickhouse:worker:utils');

let comms = {
  reply: function (req, res) {
    let message = _.extend(res, {
      $messageId: req.$messageId
    });
    comms.send(message);
  },
  error: function error(msg) {
    let message = {
      event: 'log',
      level: 'error',
      msg: msg
    };
    comms.send(message);
    throw new Error(msg);
  },
  /**
   * Sends a message to the parent process.   Transmits {@link Board#id} with
   * every message.
   * @param {(string|Request)} event Event name or Message
   * @param {Request} [message] If `event` specified, more data to put in the
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

module.exports = comms;
