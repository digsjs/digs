'use strict';

let events = require('events'),
  j5 = require('johnny-five'),
  Joi = require('joi'),
  _ = require('lodash'),
  util = require('util'),
  logMessages = require('./log-messages'),
  pipeEvent = require('pipe-event'),
  utils = require('./utils');

let DEFAULTS = {
    repl: false
  },
  format = util.format,
  debug = require('debug')('brickhouse:worker:peon'),
  reply = utils.reply;

/**
 * @typedef {Object} Message
 */

/**
 * @typedef {Function} Command
 */

/**
 *
 */
class Peon extends events.EventEmitter {
  constructor(opts) {
    super();

    this.components = {};
    this.board = new j5.Board(_.extend(opts, DEFAULTS));
    pipeEvent(['ready', 'error'], this.board, this);

    this.on('message', function (message) {
      let command = message.command,
        methodName = message.method,
        response;

      this.send('log', {
        tags: 'debug',
        msg: logMessages.receivedMessage(message)
      });

      if (_.isFunction(this[command])) {
        response = this[command](message);
      }
      else if (message.id) {
        let component;
        if ((component = this.components[message.id])) {
          let method;
          if ((method = component[methodName]) && _.isFunction(method)) {
            try {
              response = method.apply(component, [].concat(message.args)) || {};
              Joi.assert(response, Joi.object());
            } catch (err) {
              reply(message, {
                event: 'log',
                level: 'warn',
                msg: err.toString()
              });
              return;
            }
          } else {
            reply(message, {
              event: 'log',
              level: 'warn',
              msg: logMessages.invalidComponentMethod(message.id,
                message.command)
            });
            return;
          }
        } else {
          reply(message, {
            event: 'log',
            level: 'warn',
            msg: logMessages.missingComponent(message.id)
          });
          return;
        }
      }

      reply(message, {
        event: 'response',
        response: response
      });
    });

    this.commands = this._commandFactory();

    this.emit('online');

    debug('Board "%s" ChildProcess online', this.board.id);

  }

  log(level) {
    let args = _.toArray(arguments).slice(1);
    this.emit.apply(this, ['log', level].concat(format.apply(null, args)));
  }

  _commandFactory() {
    return _.mapValues(Peon.commands, function (func, name) {
      return function (message) {
        try {
          Joi.assert(message, Peon.schemas[name], 'Invalid message');
          return func.call(this, message);
        } catch (e) {
          this.warn(e.message);
        }
      }.bind(this);
    }, this);
  }

}

_.each(['info', 'warn'], function (level) {
  Peon.prototype[level] = function () {
    this.log.apply(this, [level].concat(_.toArray(arguments)));
  };
});

Peon.commands = {
  /**
   * Get a list of all methods by either component class or component id.
   * @param {Message} message Message from parent
   * @type {Command}
   * @returns {{methods: Array.<string>}} List of methods
   */
  dir: function dir(message) {
    let id = message.id,
      componentClass = message.componentClass;

    return {
      methods: id ?
        _.functions(this.components[message.id]) :
        _.functions(j5[componentClass].prototype)
    };
  },
  components: function components() {
    return this.components;
  },

  instantiate: function instantiate(message) {
    let componentClass = message.componentClass,
      Constructor = j5[componentClass],
      opts;
    
    if (!Constructor) {
      this.warn(logMessages.unknownComponent(componentClass));
      return;
    }

    opts = _.defaults({}, opts, {
      id: _.uniqueId(format('board-%s-', componentClass.toLowerCase())),
      board: this.board
    });

    try {
      this.components[opts.id] = new Constructor(opts);
    }
    catch (e) {
      this.warn('Failed to instantiate component class "%s": %s',
        componentClass, e.toString());
      return;
    }

    return {
      id: opts.id,
      componentClass: componentClass
    };
  }
};

Peon.schemas = {
  dir: Joi.object().keys({
    id: Joi.string(),
    componentClass: Joi.string()
  }).xor('id', 'componentClass'),
  components: Joi.any(),
  instantiate: Joi.object().keys({
    componentClass: Joi.string().required(),
    opts: Joi.object()
  })
};

module.exports = Peon;
