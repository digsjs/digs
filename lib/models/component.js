'use strict';

var events = require('events'),
  _ = require('lodash');

var EventEmitter = events.EventEmitter;

function Component(config, id) {

  if (!(this instanceof Component)) {
    return new Component(config, id);
  }

  /**
   * @type {Board}
   */
  this.board = board;
  this.id = id;
}

Component.prototype = _.create(EventEmitter.prototype, {
  /**
   * Returns an object of potential methods to call
   * @returns {Promise.<Object>}
   */
  dir: function dir() {
    return this.board.send('dir', {
      id: this.id
    });
  }

});

module.exports = Component;
