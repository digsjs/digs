/**
 * @module common/request
 */

'use strict';

let Joi = require('joi'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  util = require('util');

const MESSAGE_EVENT = 'message',
  PREFIX = 'msg',
  DEFAULT_TIMEOUT = 2000;

let validate = Promise.promisify(Joi.validate),
  format = util.format,
  debug = require('debug')('brickhouse:common:request');

class TimeoutError extends Error {
  constructor(request, ms) {
    super(format('Request "%s" timed out', request.id));
    this.ms = ms;
  }

  toString() {
    return format('%s (%dms)', this.message, this.ms);
  }
}

/**
 * Represents a Request sent to a child process.  Expects a response from the
 * child process.
 */
class Request {

  /**
   * Set internals and a give this Request a unique identifier.
   * @param {Object} message Raw message
   */
  constructor(message) {
    _.defaults(message, {
      type: message.type,
      data: message.data,
      id: _.uniqueId(format('%s-%s-', PREFIX, process.pid)),
      origin: process.pid,
      proc: null,
      offset: null
    });
    _.extend(this, message);
  }

  /**
   * Returns an event handler for the `message` event of `proc`.
   * @param {ChildProcess} proc Child process
   * @param {Function} success Function to call when `proc` response
   * @param {Function} failure Function to call if `proc` does not respond
   * @param {number} [timeout] How long to wait for response (in ms).  Defaults
   *     to {@link DEFAULT_TIMEOUT}.
   * @returns {Function} `message` event handler
   * @private
   */
  _handle(proc, success, failure, timeout) {
    let t;

    function cancel() {
      proc.removeListener(MESSAGE_EVENT, handler);
    }

    let handler = function (response) {
      if (response.type === this.type && response.id === this.id) {
        clearTimeout(t);
        cancel();
        success(response.data);
      }
    }.bind(this);
    timeout = _.isUndefined(timeout) ? DEFAULT_TIMEOUT : timeout;
    if (timeout) {
      t = setTimeout(function () {
        cancel();
        failure(new TimeoutError(this, timeout));
      }.bind(this), timeout);
    }
    return handler;
  }

  /**
   * Send this Request to `proc`.  Abort after `timeout` ms.
   * @param {ChildProcess} [proc] Child process to send this Request to
   * @param {number} [timeout] How long to wait for response (in ms).  Defaults
   *     to {@link DEFAULT_TIMEOUT}.
   * @returns {Promise.<*>} Promise resolved with response data
   */
  send(proc, timeout) {
    this.offset = Date.now();
    return validate(this, Request.schema)
      .bind(this)
      .then(function (request) {
        return new Promise(function (resolve, reject) {
          proc.on('message', this._handle(proc, resolve, reject, timeout));
          debug('Sending Request from process w/ PID %d', this.origin, request);
          proc.send(request);
        }.bind(this));
      });
  }

  /**
   * Return a function which callee can use to send {@link Request Requests}
   * easily
   * @param {(ChildProcess|process)} proc (Child) process to send Request to
   * @param {number} [timeout] How long to wait for reply (in ms).  Defaults to
   *     {@link DEFAULT_TIMEOUT}.
   * @returns {Function} {@link Request.request} with `proc` and `timeout`
   *     arguments bound
   */
  static requester(proc, timeout) {

    /**
     * Create a new {@link Request} and send it.
     *
     * This function is a bit awkward; use {@link Request.requester} instead.
     * @param {ChildProcess} proc Child process to send Request to
     * @param {(number|string)} [timeout] How long to wait for reply (in ms).
     *     If string, considered to be `type`, and defaults to
     *     {@link DEFAULT_TIMEOUT}.
     * @param {string} type Request type (TODO: document enumeration)
     * @param {*} [data] Data to send with Request
     * @returns {Promise.<*>} Promise resolved with response data
     */
    function request(proc, timeout, type, data) {
      if (_.isString(timeout)) {
        data = type;
        type = timeout;
        timeout = DEFAULT_TIMEOUT;
      }
      let req = new Request({
        type: type,
        data: data
      });
      return req.send(proc, timeout);
    }

    return _.partial(request, proc, timeout);
  }

  static commander(proc, timeout) {
    function command(proc, timeout, name, args) {
      if (_.isString(timeout)) {
        args = name;
        name = timeout;
        timeout = DEFAULT_TIMEOUT;
      }
      let req = new Request({
        type: 'command',
        data: {
          args: args,
          name: name
        }
      });
      return req.send(proc, timeout);
    }

    return _.partial(command, proc, timeout);
  }


  reply(data, proc, timeout) {
    proc = proc || this.proc;
    this.data = data;
    this.send(proc, timeout);
  }
}

Request.schema = Joi.object()
  .keys({
    id: Joi.string()
      .regex(new RegExp(format('^%s-\\d+-\\d+$', PREFIX)), 'id')
      .example(format('%s-12345-42', PREFIX))
      .description('Unique identifier'),
    offset: Joi.date()
      .example(1432445243494)
      .description('When Request was sent'),
    data: Joi.when('type', {
      is: 'command',
      then: Joi.object()
        .keys({
          name: Joi.string(),
          args: Joi.any()
        })
        .requiredKeys('name')
        .description('Command Request data'),
      otherwise: Joi.any()
    })
      .description('Data for Request'),
    type: Joi.string()
      .description('Type of Request'),
    origin: Joi.number()
      .description('PID of process originating Request'),
    proc: Joi.strip()
  })
  .requiredKeys('id', 'type', 'origin');


Request.TimeoutError = TimeoutError;

module.exports = Request;
