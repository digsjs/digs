'use strict';

let events = require('events'),
  _ = require('./lodash-mixins');

class DigsEmitter extends events.EventEmitter {
  toString() {
    return _.format('<%s#%s>', this.constructor.name, this.id);
  }
}

module.exports = DigsEmitter;
