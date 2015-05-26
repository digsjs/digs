/**
 * @module common/digs-emitter
 */

'use strict';

let events = require('events'),
  pkg = require('../../package.json'),
  _ = require('./lodash-mixins');

let debug = require('debug')('digs:models:digs-emitter');

class DigsEmitter extends events.EventEmitter {

  constructor(server) {
    super();
    this.server = server;
  }

  log(level, tags, message) {
    let identifiers;
    level = level || 'info';
    identifiers = [
      level,
      pkg.name,
      this.constructor.name.toLowerCase()
    ];
    if (arguments.length >= 3) {
      tags = identifiers.concat(tags);
      message = _.toArray(arguments).slice(2);
    } else {
      tags = identifiers;
      message = _.toArray(arguments).slice(1);
    }
    message = _.format.apply(null, message);
    debug = this.debug || debug;
    debug('%s: %s', level.toUpperCase(), message);
    return this.server.log.apply(this.server, [tags].concat(message));
  }
}

DigsEmitter.logLevels = [
  'info',
  'warn',
  'error'
];

_.each(DigsEmitter.logLevels, function (level) {
  DigsEmitter.prototype[level] = function () {
    this.log.apply(this, [level].concat(_.toArray(arguments)));
  };
});

module.exports = DigsEmitter;
