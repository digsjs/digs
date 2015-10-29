'use strict';

const common = require('digs-common');
const Promise = common.Promise;
const Glue = Promise.promisifyAll(require('glue'));
const path = require('path');
const _ = common.utils;
const debug = common.debug('digs:server');
const debugPatcher = require('./debug-patcher');

function digs(userManifest, options, done) {
  const t = new Date().getTime();
  const root = path.join(__dirname, '..');
  debug(`Root path: ${root}`);

  debug(`Raw user manifest: \n${_.dump(userManifest)}`);

  return require('./manifest-builder')(userManifest, root)
    .then(manifest => {
      const getManifest = _.partial(_.get, manifest);

      function isDebugMode() {
        return getManifest('server.app.debug') &&
          !getManifest('server.debug.log');
      }

      debug('Configuring Glue options...');
      options = _.defaults(options || {}, {
        relativeTo: root,
        preConnections: (server, next) => {
          const coapOpts = getManifest('server.app.coap');
          if (coapOpts) {
            debug(`Passing options to hapi-coap-listener: ${_.dump(coapOpts)}`);
            require('hapi-coap-listener')(server, coapOpts)
              .then(connectionOpts => {
                manifest.connections.push(connectionOpts);
                next();
              }, next);
          } else {
            next();
          }
        }
      });

      if (isDebugMode) {
        debugPatcher.patch(manifest);
      }

      debug(`Final manifest:\n${_.dump(manifest)}`);
      debug(`Glue options:\n${_.dump(options)}`);

      return Glue.composeAsync(manifest, options)
        .tap(server => {
          server.app.debug = {
            manifest: manifest
          };

          server.method('isDebugMode', isDebugMode, {
            callback: false
          });

          if (isDebugMode) {
            debugPatcher.registerRestore(server);
          }
        });
    })
    .then(server => {
      Promise.promisifyAll(server, {
        context: server
      });

      return server.startAsync()
        .return(server);
    })
    .then(server => {
      const delta = new Date().getTime() - t;
      server.log('info', `Digs ready in ${delta}ms.`);
      return server;
    })
    .asCallback(done);
}

module.exports = digs;
