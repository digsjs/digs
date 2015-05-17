'use strict';

let debug = require('debug')('brickhouse:config');

let DEFAULTS = {};

module.exports = (function() {
  let name = require('../package.json').name;
  debug('Parsing RC file(s) for app "%s"', name);
  return require('rc')(name, DEFAULTS, null,
    function (content, file) {
      try {
        if ((file && /\.ya?ml$/.test(file)) || /^---\s*\n/.test(content)) {
          debug('Found YAML RC file');
          return require('js-yaml').safeLoad(content);
        }
        else if ((file && /\.json$/.test(file)) || /^\s*\{/.test(content)) {
          debug('Found JSON RC file');
          return JSON.parse(content);
        }
        debug('Defaulting to INI');
        return require('ini').parse(content);
      } catch (e) {
        console.error('Error parsing brickhouse rc file(s)');
        throw e;
      }
    });
}());
