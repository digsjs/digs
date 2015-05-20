/**
 * @module models/component
 */

'use strict';

let BHEmitter = require('./bhemitter'),
  _ = require('lodash'),
  util = require('util');

let format = util.format,
  debug = require('debug')('brickhouse:models:component');

/**
 * @alias module:models/component
 */
class Component extends BHEmitter {
  /**
   *
   * @param {Hapi.Server} server Hapi Server instance
   * @param {Worker} worker Worker instance
   * @param {string} componentClass Johnny-Five class name
   * @param {Object} [opts={}] Options for the class constructor
   */
  constructor(server, worker, componentClass, opts) {
    super();

    this._worker = worker;
    this.componentClass = Component.normalize(componentClass);
    this.opts = _.defaults(opts || {}, {
      id: _.uniqueId(format('board-%s-', this.componentClass))
    });
    _.extend(this, {
      description: opts.description,
      id: opts.id
    });

    debug('Instantiated Component with id "%s"', this.id);
  }

  static normalize(componentClass) {
    return _.capitalize(_.camelCase(componentClass));
  }

  _send() {
    return this._worker.send.apply(this._worker, arguments);
  }

  _command(command, message) {
    return this._send(_.extend({
      command: command
    }, message));
  }

  _execute(id, method, args) {
    return this._send(_.extend({
      method: method,
      id: id,
      args: args
    }));
  }

  instantiate(callback) {
    return this._command('instantiate', {
      componentClass: this.componentClass,
      opts: this.opts
    })
      .bind(this)
      .then(function () {
        debug('Instantiated J5 Component with id "%s"', this.id);
        return this._command('dir', {
          id: this.id
        });
      })
      .get('methods')
      .then(function (methods) {
        this.methods = methods;
        _.mixin(this, _.map(methods, function (methodName) {
          return function (args, callback) {
            return this._execute(this.id, methodName, [].concat(args))
              .nodeify(callback);
          }.bind(this);
        }, this), {
          chain: false
        });
        debug('Attached methods to prototype: %s', methods.join(', '));
      })
      .nodeify(callback);
  }

  toJSON() {
    return _.pick(this, Component.fields);
  }

}

Component.fields = [
  'id',
  'methods',
  'componentClass',
  'description'
];

module.exports = Component;
