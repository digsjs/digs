/**
 * @module models/component
 */

'use strict';

let DigsEmitter = require('../common/digs-emitter'),
  _ = require('../common/lodash-mixins');

let debug = require('debug')('digs:models:component');

/**
 * @alias module:models/component
 */
class Component extends DigsEmitter {
  /**
   *
   * @param {Board} board Board instance
   * @param {string} componentClass Johnny-Five class name
   * @param {Object} [opts={}] Options for the class constructor
   */
  constructor(board, componentClass, opts) {
    super();

    this._board = board;
    this.componentClass = Component.normalize(componentClass);
    opts = opts || {};
    let name = opts.name || opts.id,
      id = opts.id =
        _.slugify(name) || _.uniqueId(_.format('%s-', this.componentClass));
    _.extend(this, {
      name: name || id,
      description: opts.description || name || id,
      id: id
    });
    delete opts.description;
    delete opts.name;
    this.opts = opts;
  }

  static normalize(componentClass) {
    return _.capitalize(_.camelCase(componentClass));
  }

  instantiate(callback) {
    return this._board.request('instantiate', {
      componentClass: this.componentClass,
      opts: this.opts
    })
      .bind(this)
      .then(function (data) {
        let id = data.id;
        this.id = id;
        debug('Instantiated J5 "%s" with id "%s"', data.componentClass, id);
        return this._board.request('dir', {
          id: id
        });
      })
      .get('methods')
      .then(function (methods) {
        this.methods = methods;
        _.each(methods, function (methodName) {
          this[methodName] = function (args, callback) {
            return this._board.request('execute', {
              id: this.id,
              method: methodName,
              args: [].concat(args)
            })
              .nodeify(callback);
          }.bind(this);
        }, this);
        debug('Attached methods to prototype: %s', methods.join(', '));
        return this;
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
  'description',
  'opts',
  'name'
];

module.exports = Component;
