/**
 * @module models/bhemitter
 */

'use strict';

let events = require('events'),
  pkg = require('../../package.json'),
  _ = require('lodash'),
  util = require('util');

let format = util.format,
  debug = require('debug')('brickhouse:models:bhemitter');

class BHEmitter extends events.EventEmitter {

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
    message = format.apply(null, message);
    debug = this.debug || debug;
    debug('%s: %s', level.toUpperCase(), message);
    return this.server.log.apply(this.server, [tags].concat(message));
  }
}

BHEmitter.logLevels = [
  'info',
  'warn',
  'error'
];

_.each(BHEmitter.logLevels, function (level) {
  BHEmitter.prototype[level] = function () {
    this.log.apply(this, [level].concat(_.toArray(arguments)));
  };
});

module.exports = BHEmitter;
