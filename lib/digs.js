'use strict';

let Server = require('hapi').Server;
let Promise = require('bluebird');

let Digs = {
  start(done) {
    return this._ready
      .bind(this)
      .then(function start() {
        this.log('Starting Digs...');
        return Promise.promisify(Server.prototype.start).call(this)
          .return(this.connections);
      })
      .each(function report(connection) {
        this.log(`Digs online at ${connection.info.uri}`);
      })
      .return(this)
      .nodeify(done);
  },

  log(tags, data) {
    if (arguments.length === 1) {
      data = tags;
      tags = this.settings.app.namespace;
    } else {
      tags = [this.settings.app.namespace].concat(tags);
    }
    return Server.prototype.log.call(this, tags, data);
  },

  register(plugins, options, callback) {
    return this._ready
      .bind(this)
      .then(function registerOnReady() {
        return this._register(plugins, options);
      })
      .nodeify(callback);
  },

  _register(plugins, options) {
    return new Promise(function register(resolve, reject) {
      Server.prototype.register.call(this,
        plugins,
        options || {},
        function callback(err, value) {
          if (err) {
            return reject(err);
          }
          resolve(value);
        });
    }.bind(this));
  }
};

module.exports = Digs;
