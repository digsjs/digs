'use strict';

let pkg = require('../package.json'),
  _ = require('lodash');

const DEFAULTS = {};

let debug = require('debug')('brickhouse:config'),
  pkgName = pkg.name,
  configured = false,
  config = {
    configure: function configure(force) {
      if (configured && !force) {
        return config;
      }
      debug('Parsing RC file(s) for app "%s"', pkgName);
      _.extend(config, require('rc')(pkgName, DEFAULTS, null,
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
        }));
      configured = true;
      return config;
    }
  };

module.exports = config;
