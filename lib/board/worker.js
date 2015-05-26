/**
 * @module models/worker
 */

'use strict';

let DigsEmitter = require('../common/digs-emitter'),
  _ = require('../common/lodash-mixins'),
  MQTTClient = require('../common/mqtt/client'),
  child_process = require('child_process'),
  Promise = require('bluebird');

const WORKER_PATH = require.resolve('../worker');

let debug = require('debug')('digs:models:worker'),
  getPort = Promise.promisify(require('get-port'));

/**
 * Wraps a `ChildProcess` object
 * @alias module:models/worker
 */
class Worker extends DigsEmitter {

  /**
   * Sets some instance props.
   * @param {Hapi.Server} server Server instance
   * @param {Board} board Board instance
   */
  constructor(server, board) {
    super(server);

    this._board = board;
    this._proc = null;

    this.ready = false;
    this.client = null;

    debug('Forking for connection to "%s"', board.id);
  }

  kill() {
    let proc = this._proc;
    if (proc && this.connected) {
      let pid = proc.pid;
      proc.kill();
      this._proc = null;
      debug('Killed worker with PID %d for Board "%s"', pid, this.id);
    }
  }

  _thenOnline() {
    return new Promise(function (resolve) {
      this.client.once('online', function () {
        debug('Slave online for "%s"', this.id);
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
    // TODO retry attempts
    attempt = attempt || 1;

    if (this._proc) {
      return this;
    }

    let address = this._board.plugin.mqttServer.address();

    this.client = new MQTTClient(this.id, address.address, address.port);

    this._proc = child_process.fork(WORKER_PATH, {
      env: _.extend({
        DIGS_MQTT_PORT: address.port,
        DIGS_MQTT_HOST: address.address,
        DIGS_ID: this.id
      }, process.env)
    });

    return this._thenOnline()
      .bind(this)
      .then(function () {
        return this.client.request('init',
          _.omit(this._board.opts, 'components', 'options'));
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

  get readyTimeout() {
    return this._board.readyTimeout;
  }

  get retryInterval() {
    return this._board.retryInterval;
  }

  get retryMaxTries() {
    return this._board.retryMaxTries;
  }
}

module.exports = Worker;
