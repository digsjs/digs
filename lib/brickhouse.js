'use strict';

let Board = require('./board'),
  events = require('events'),
  Hapi = require('hapi'),
  pkg = require('../package.json'),
  util = require('util'),
  _ = require('lodash');

const NAME = pkg.name;

let format = util.format;

/**
 * Configuration object for a Board and its components.
 * @summary Board Definition
 * @typedef {Object} BoardDef
 */

class Brickhouse extends events.EventEmitter {

  /**
   * Instantiates Brickhouse plugin; configures Board(s) for use
   * @param {Hapi.Server} server Hapi server instance
   * @param {(Object.<string,BoardDef>|Array.<BoardDef>)} opts Board Definition
   *     objects; keyed on ID, or an Array
   * @constructor
   */
  constructor(server, opts) {
    super();

    if (!(server instanceof Hapi.Server)) {
      throw new Error('Invalid parameters');
    }

    this._server = server;
    this._opts = opts || {};

    this.boards = _(this._opts)
      .map(this.createBoard, this)
      .indexBy('id')
      .value();

  }

  log() {
    arguments[0] = [NAME].concat(arguments[0]);
    return this._server.log.apply(this._server, arguments);
  }

  /**
   * Bootstraps a Board from a Board Definition
   * @param {BoardDef} config Board Definition
   * @param {?string} [id] Unique ID of board, if string
   */
  createBoard(config, id) {
    let board,
      self = this,
      server = this._server;

    id = _.isString(id) || config.id || null;

    board = new Board(_.extend({}, config, {id: id}))
      .on('error', function (err) {
        self.emit('error', err);
      })
      .on('ready', function () {
        self.log('info',
          format('Board "%s" is ready on port "%s"', this.id, this.port));
        self.emit('ready', this);
      })
      .on('log', function () {
        self.log.apply(self, arguments);
      });

    server.on('stop', function () {
      board.stop();
    });

    self.log('info', format('Created board with ID "%s"', id));
  }

  /**
   * Starts a board
   * @param {(Board|BoardDef|string)} board Board object, Board Definition, or
   *     Board ID
   * @param {string} [id] ID of Board, if `board` is a Board Definition.
   * @return {Promise.<Board>} Ready Board
   */
  start(board, id) {
    if (_.isString(board)) {
      board = this.boards[board];
    }
    else if (!(board instanceof Board)) {
      board = this.createBoard(board, id);
      this.boards[board.id] = board;
    }
    return board.start();
  }
}

Brickhouse.NAME = NAME;

module.exports = Brickhouse;
