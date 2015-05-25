/**
 * @module models/worker
 */

'use strict';

let BHEmitter = require('../common/bhemitter'),
  _ = require('lodash'),
  MQTTClient = require('../common/mqtt-client'),
  child_process = require('child_process'),
  Promise = require('bluebird');

const WORKER_PATH = require.resolve('../worker'),
  RETRY_MAX_TRIES = 3;

let debug = require('debug')('brickhouse:models:worker'),
  getPort = Promise.promisify(require('get-port'));

class ForkError extends Error {
  constructor(message, worker) {
    super(_.format('Board "%s" failed to fork after %d attempts: %s', worker.id,
      worker.retryTimeout, message));
  }
}

class NotReadyError extends Error {
  constructor(worker) {
    super(_.format('Board "%s" failed to get ready after max tries reached ' +
      '(%d)', worker.id, worker.retryMaxTries));
  }
}

/**
 * Wraps a `ChildProcess` object
 * @alias module:models/worker
 */
class Worker extends BHEmitter {

  /**
   * Sets some instance props.
   * @param {Hapi.Server} server Server instance
   * @param {Board} board Board instance
   */
  constructor(server, board) {
    super(server);
    this._board = board;
    this.ready = false;
    this.retryTimeout = board.retryTimeout;
    this._readyTimeout = board._readyTimeout;
    // TODO allow this option
    this.retryMaxTries = RETRY_MAX_TRIES;
    this._workerId = _.uniqueId(_.format('%s-', this._board.id));

    debug('Forking for connection to "%s"', board.id);
  }


  kill() {
    let proc = this._proc;
    if (proc && this.connected) {
      let pid = proc.pid;
      proc.kill();
      delete this._proc;
      debug('Killed worker with PID %d for Board "%s"', pid, this._board.id);
    }
  }

  _thenOnline() {
    return new Promise(function (resolve) {
      this.client.once('online', function () {
        debug('Slave online for "%s"', this._workerId);
        resolve();
      }.bind(this));
    }.bind(this));
  }

  /**
   * Forks a `ChildProcess`; attaches event listeners
   * @param {number} [attempt] Number of forking attempts
   * @returns {Worker} Worker process
   */
  fork(attempt) {
    attempt = attempt || 1;

    if (this._proc) {
      return this;
    }

    let address = this._board.plugin.mqttServer.address();

    this.client = new MQTTClient(this._workerId, address.address, address.port);

    this._proc = child_process.fork(WORKER_PATH, {
      env: _.extend({
        MQTT_PORT: address.port,
        MQTT_HOST: address.address,
        BRICKHOUSE_ID: this._workerId
      }, process.env)
    });

    return this._thenOnline()
      .bind(this)
      .then(function () {
        return this.client.request('init',
          _.omit(this._board.opts, 'components'));
      })
      .then(function (response) {
        debug('Board "%s" ready!', this.id);
        this.port = this._board.port || response.port;
        this.ready = true;
      });
  }

  request() {
    return this.client.request.apply(this.client, arguments);
  }

  publish() {
    return this.client.request.apply(this.client, arguments);
  }

  get connected() {
    return this._proc && this._proc.connected;
  }

  get id() {
    return this._board.id;
  }

}

module.exports = Worker;
