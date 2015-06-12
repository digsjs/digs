/**
 * @module models/worker
 */

'use strict';

let DigsEmitter = require('digs-common/digs-emitter'),
  _ = require('lodash'),
  DigsClient = require('digs-client'),
  child_process = require('child_process'),
  errors = require('digs-common/errors'),
  Promise = require('bluebird');

const PEON_PATH = require.resolve('../peon');

let debug = require('debug')('digs:board:worker');

/**
 * Wraps a `ChildProcess` object
 * @alias module:models/worker
 */
class Worker extends DigsEmitter {

  /**
   * Sets some instance props.
   * @param {Board} board Board instance
   */
  constructor(board) {
    super();

    this._board = board;
    this._proc = null;

    this.ready = false;
    this.client = null;

    debug('%s: instantiated', this);
  }

  kill() {
    let proc = this._proc;
    if (proc && this.connected) {
      let pid = proc.pid;
      proc.kill();
      this._proc = null;
      debug('%s: Killed worker with PID %d', this, pid);
    }
  }

  /**
   * Forks a `ChildProcess`; attaches event listeners
   * @param {number} [attempt] Number of forking attempts
   * @returns {Worker} Worker process
   */
  fork(attempt) {
    // TODO retry attempts
    attempt = attempt || 1;

    if (this.client || this._proc) {
      throw new Error('Fork in progress');
    }

    let digs = this._board.digs;
    let address = digs.broker.address();
    let proc, client,
      board = this._board;

    return new Promise(function (resolve, reject) {
      function cleanup(err) {
        debug(err);
        client.removeAllListeners();
        proc.removeAllListeners();
        return client.disconnect()
          .finally(function () {
            debug('%s: DigsClient terminated', board);
            return new Promise(function (resolve) {
              function _resolve() {
                debug('%s: ChildProcess destroyed', board);
                resolve();
              }

              proc.once('exit', _resolve)
                .once('error', _resolve)
                .kill();
            });
          })
          .then(function () {
            reject(err);
          });
      }

      client = this.client =
        new DigsClient({
          id: this.id,
          host: address.address,
          port: address.port,
          project: digs.project,
          namespace: digs.namespace
        })
          .once('error', cleanup)
          .once('close', cleanup)
          .once('topic:online', function (message) {
            let clientId = message.clientId;
            debug('%s: Local client "%s" online', this, clientId);
            proc.removeListener('disconnect', reject);
            resolve(clientId);
          });

      client.subscribe({
        clientId: `${this.id}-local`,
        project: digs.project,
        wildcard: '#'
      });

      proc = this._proc = child_process.fork(PEON_PATH, {
        env: _.extend({
          DIGS_MQTT_PORT: address.port,
          DIGS_MQTT_HOST: address.address,
          DIGS_ID: this.id,
          DIGS_NAMESPACE: digs.namespace,
          DIGS_PROJECT: digs.project
        }, process.env)
      })
        .once('error', function (err) {
          if (attempt < this.retryMaxTries) {
            this.fork(++attempt);
          }
          cleanup(new errors.ForkError(err, this));
        }.bind(this))
        .once('disconnect', cleanup);
    }.bind(this))
      .bind(this)
      .catch(function (err) {
        delete this._proc;
        delete this.client;
        debug(err);
        return Promise.reject(err);
      })
      .then(function () {
        return new Promise(function (resolve, reject) {
          this.client.request('init',
            _.omit(this._board.opts, 'components', 'options'))
            .then(resolve);

          this._proc.once('message', function (err) {
            debug(err);
            reject(new errors.ForkError(err, this._board));
          }.bind(this));
        }.bind(this));
      })
      .then(function (response) {
        if (response.id) {
          debug('Board "%s" ready!', this.id);
          this.port = this._board.port || response.port;
          this.ready = true;
        } else {
          throw new errors.ForkError(`Failed to initialize Board "${this.id}"`);
        }
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

  get  retryMaxTries() {
    return this._board.retryMaxTries;
  }
}

module.exports = Worker;
