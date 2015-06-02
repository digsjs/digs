'use strict';

let Promise = require('bluebird'),
  _ = require('./common/lodash-mixins'),
  pipeEvent = require('pipe-event'),
  serialport = require('serialport'),
  DigsEmitter = require('./common/digs-emitter'),
  pkg = require('../package.json'),
  Board = require('./board/board');

let debug = require('debug')('digs:digs'),
  list = Promise.promisify(serialport.list),
  getPort = Promise.promisify(require('get-port'));

/**
 * Configuration object for a Board and its components.
 * @summary Board Definition
 * @typedef {Object} BoardDef
 */

let DEFAULTS = {
  mqtt: {
    broker: {
      port: 1833,
      host: 'localhost',
      type: 'internal'
    }
  },
  boards: {},
  namespace: pkg.name,
  project: 'home'
};

/**
 * Plugin class
 */
class Digs extends DigsEmitter {

  /**
   * Instantiates Digs plugin; configures Board(s) for use
   * @param {(Object.<string,BoardDef>|Array.<BoardDef>)} opts Board Definition
   *     objects; keyed on ID, or an Array
   * @constructor
   */
  constructor(opts) {
    super();

    /**
     * Plugin Configuration
     * @type {Object}
     */
    opts = _.merge(DEFAULTS, opts || {});
    _.extend(this, _.pick(opts, 'namespace', 'project'));

    /**
     * Mapping of {@link Board} {@link Board#id Board ID's} to Boards.
     * @type {Object.<string,Board>}
     */
    this.boards = _(opts.boards)
      .pick(function (value) {
        return _.isObject(value) && value !== '_' && !_.isArray(value) &&
          !_.isFunction(value);
      })
      .map(this.createBoard, this)
      .indexBy('id')
      .value();

    if (opts.mqtt.broker.type === 'internal') {
      debug('%s: using internal MQTT broker', this);
      this._brokerReady = new Promise(function (resolve, reject) {
        this.broker = require('digs-broker')(opts.mqtt)
          .on('listening', resolve)
          .on('error', reject);
      }.bind(this));
    } else {
      this._brokerReady = Promise.resolve();
    }

    this.opts = opts;
    debug('%s: instantiated w/ options:', this, this.opts);

    Digs.serialPorts()
      .then(function (ports) {
        debug('Serial ports', ports);
      });
  }

  get id() {
    return this.project;
  }

  static serialPorts(force) {
    let usbDb;
    if (this.ports && !force) {
      return Promise.resolve(this.ports);
    }
    try {
      usbDb = require('../data/usb-ids.json');
    }
    catch (ignored) {
      usbDb = null;
    }
    return list()
      .bind(this)
      .then(function (ports) {
        if (usbDb) {
          _.each(ports, function (port) {
            let vendor, product;
            if (port.vendorId && (vendor = usbDb[port.vendorId])) {
              port.vendor = vendor.name;
              if (port.productId &&
                (product = usbDb[port.vendorId].products[port.productId])) {
                port.product = product;
              }
            }
          });
        }
        debug('<Digs.serialPorts>: Found %d ports', ports.length);
        return (this.ports = ports);
      });
  }

  /**
   * Bootstraps a {@link Board} from a {@link BoardDef Board Definition}
   * @param {BoardDef} opts Board Definition
   * @param {?string} [id] Unique ID of board, if string
   * @returns {Board} New Board instance
   */
  createBoard(opts, id) {
    id = opts.id = (_.isString(id) && id) || opts.id || null;

    debug('%s: creating <%s#%s> w/ options:', this, Board.name, id, opts);

    let board = new Board(this, opts);
    pipeEvent('error', board, this);
    return board;
  }

  /**
   * Starts a Board.
   * @param {(Board|BoardDef|string)} [board] Board object, Board
   *     Definition, or Board ID.  If omitted, starts all Boards.
   * @param {string} [id] ID of Board, if `board` is a Board Definition.
   * @return {(Promise.<Board>|Promise.<Array.<Board>>)} Ready Board(s)
   */
  start(board, id) {
    return this._brokerReady
      .bind(this)
      .then(function () {
        if (_.isUndefined(board)) {
          debug('%s: starting all (%d) Boards', this, _.size(this.boards));
          return Promise.settle(_.map(this.boards, function (boardObj) {
            return boardObj.start()
              .bind(this)
              .catch(function (err) {
                this.warn(err);
              });
          }, this));
        }
        else if (_.isString(board)) {
          debug('%s: found Board with ID "%s"', this, board);
          board = this.boards[board];
        }
        else if (!(board instanceof Board)) {
          debug('%s: creating <%s#%s> from object:', this, Board.name, id,
            board);
          this.boards[board.id] = board = this.createBoard(board, id);
        }
        debug('%s: starting <%s#%s>', this, Board.name, board.id);
        return board.start();
      });
  }
}

Digs.version = pkg.version;
Digs.board = require('./board');
Digs.common = require('./common');
Digs.Peon = require('./peon');

module.exports = Digs;
