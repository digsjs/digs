'use strict';

let BHEmitter = require('./bhemitter'),
  Promise = require('bluebird'),
  _ = require('lodash'),

  Board = require('./board'),
  pkg = require('../../package.json');

const NAME = pkg.name;

let debug = require('debug')('brickhouse:models:brickhouse');

/**
 * Configuration object for a Board and its components.
 * @summary Board Definition
 * @typedef {Object} BoardDef
 */

/**
 * Plugin class
 */
class Brickhouse extends BHEmitter {

  /**
   * Instantiates Brickhouse plugin; configures Board(s) for use
   * @param {Hapi.Server} server Hapi server instance
   * @param {(Object.<string,BoardDef>|Array.<BoardDef>)} opts Board Definition
   *     objects; keyed on ID, or an Array
   * @constructor
   */
  constructor(server, opts) {
    super(server);

    /**
     * Plugin Configuration
     * @type {Object}
     */
    this.opts = opts;

    /**
     * Mapping of {@link Board} {@link Board#id Board ID's} to Boards.
     * @type {Object.<string,Board>}
     */
    this.boards = _(this.opts)
      .pick(function (value) {
        return _.isObject(value) && value !== '_' && !_.isArray(value) &&
          !_.isFunction(value);
      })
      .tap(function (value) {
        debug('Found raw board config %j', value);
      })
      .map(this.createBoard, this)
      .indexBy('id')
      .value();

    debug('Instantiated Brickhouse plugin with options:', this.opts);
  }

  /**
   * Bootstraps a {@link Board} from a {@link BoardDef Board Definition}
   * @param {BoardDef} opts Board Definition
   * @param {?string} [id] Unique ID of board, if string
   * @returns {Board} New Board instance
   */
  createBoard(opts, id) {
    let board,
      self = this,
      server = this.server;

    debug('Brickhouse#createBoard called with ID "%s" and opts:', id, opts);

    id = opts.id = (_.isString(id) && id) || opts.id || null;

    board = new Board(server, opts)
      .on('error', function (err) {
        self.emit('error', err);
      })
      .on('ready', function () {
        self.info('Board "%s" is ready on port "%s"', this.id, this.port);
        self.emit('ready', this);
      });

    server.on('stop', function () {
      board.stop();
    });

    self.info('Created board with ID "%s"', id);

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
    if (_.isUndefined(board)) {
      debug('Starting all Boards (%d)', _.size(this.boards));
      return Promise.settle(_.map(this.boards, function (boardObj) {
        return boardObj.start()
          .bind(this)
          .catch(function (err) {
            this.warn(err);
          });
      }, this));
    }
    else if (_.isString(board)) {
      board = this.boards[board];
    }
    else if (!(board instanceof Board)) {
      board = this.createBoard(board, id);
      this.boards[board.id] = board;
    }
    debug('Starting board "%s"', board.id);
    return board.start();
  }
}

Brickhouse.NAME = NAME;

module.exports = Brickhouse;
