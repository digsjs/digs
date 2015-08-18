'use strict';

let stampit = require('stampit');
let DigsObject = require('./object');
let chalk = require('chalk');
let _ = require('digs-utils');

const logMethods = _.mapValues({
    debug: 'black',
    ok: 'green',
    error: 'red',
    info: 'blue',
    warn: 'yellow'
  },
  function logMethod(color, methodName) {
    return function logProxy(data, tags) {
      return this.log(chalk[color](data), [methodName].concat(tags || []));
    };
  });

function log(data, tags) {
  if (!arguments.length) {
    return;
  }
  tags = [this.namespace, this.project].concat(tags || []);
  this.digs.log(tags, data);
}

const DigsLogger = stampit.methods(_.extend({
  log: log
}, logMethods))
  .compose(DigsObject);

module.exports = DigsLogger;
