/**
 * @module models/component
 */

'use strict';

let BHEmitter = require('./bhemitter');

/**
 * @alias module:models/component
 */
class Component extends BHEmitter {
  /**
   *
   * @param {Hapi.Server} server Hapi Server instance
   * @param {Board} board Board instance
   * @param {string} klass Johnny-Five class
   * @param {Object} [opts={}] Options for the class constructor
   */
  constructor(server, board, klass, opts) {
    super();
    if (!(this instanceof Component)) {
      return new Component(server, board, opts);
    }

    if (!klass) {
      throw new Error('Invalid parameters');
    }

    this.klass = klass;
    this.board = board;
    this.opts = opts || {};
  }

  /**
   * Returns an object of potential methods to call
   * @returns {Promise.<Object>}
   */
  dir() {
    return this.board.send('dir', {
      id: this.id
    });
  }
}

module.exports = Component;
