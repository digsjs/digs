'use strict';

const common = require('digs-common');
const debug = common.debug('digs:debug-patcher');
const DigsObject = common.definitions.DigsObject;
const _ = common.utils;
const consoleError = console.error;

function patch(manifest) {
  _.set(manifest, 'server.debug.log', _.keys(DigsObject.defaultLogColors));

  console.error = function digsDebug() {
    const args = _(arguments)
      .toArray()
      .map(arg => {
        if (_.isObject(arg)) {
          return _.dump(arg);
        }
        return _.trim(arg);
      })
      .value();
    args.shift();
    return debug.apply(null, args);
  };

  debug('Monkeypatched Hapi debug functionality');
}

function restore() {
  console.error = consoleError;
}

function registerRestore(server) {
  function die(err) {
    restore();
    throw err;
  }

  process.on('uncaughtException', die);
  process.on('unhandledRejection', die);
  process.on('exit', restore);
  server.on('stop', restore);

  server.method('restoreConsoleError', restore, {
    callback: false
  });
  debug('Registered method to unpatch Hapi debug functionality');
}

module.exports = {
  patch: patch,
  registerRestore: registerRestore
};
