'use strict';

function main(env) {

  var j5 = require('johnny-five'),
    util = require('util'),
    _ = require('lodash');

  var format = util.format,
    board, opts, id, commands, methods,
    components = {};

  function reply(request, response) {
    process.send(_.extend(response, {
      _messageId: request._messageId
    }));
  }

  methods = _.memoize(function methods(id) {
    return _.functions(components[id]);
  }, function resolver(id) {
    if (!components[id]) {
      delete methods.cache[id];
    }
    return id;
  });

  function error(msg) {
    process.send({
      event: 'error',
      err: msg
    });
    throw new Error(msg);
  }

  require('./patch');

  opts = env.opts;
  id = env.id;

  if (!id || !opts) {
    error(format('Invalid environment: %j', env));
  }

  commands = Object.freeze({
    dir: function dir(msg) {
      return {
        methods: methods(components[msg.id])
      };
    },
    instantiate: function instantiate(msg) {
      var componentClass = msg.componentClass,
        Constructor = j5[componentClass],
        opts;

      if (!Constructor) {
        return {
          event: 'warning',
          err: format('Unknown component "%s"', componentClass)
        };
      }

      opts = _.defaults(msg.opts || {}, {
        id: _.uniqueId(format('board-%s-', componentClass.toLowerCase())),
        board: board
      });

      try {
        components[opts.id] = new Constructor(opts);
      }
      catch (e) {
        return {
          event: 'warning',
          err: e.toString()
        };
      }

      return {
        event: 'data',
        value: {
          id: opts.id,
          componentClass: componentClass
        }
      };
    }
  });

  process.on('message', function (msg) {
    var func, component;

    process.send({
      event: 'log',
      tags: 'debug',
      msg: format('Received msg: %j', msg)
    });

    // look for any built-in commands first
    if (_.isFunction(func = commands[msg.event])) {
      return reply(msg, func(msg));
    }

    // otherwise, we are going to dispatch a function in some component
    // if the component exists.
    if (!(component = components[msg.id])) {
      return reply(msg, {
        event: 'warning',
        err: format('No component with ID "%s" found', msg.id)
      });
    }

    // ok, so if we have a component, we need to ensure the method exists
    if (!_.isFunction(func = methods(msg.id)[msg.event])) {
      return reply(msg, {
        event: 'warning',
        err: format('Component with ID "%s" has no method "%s"', msg.id,
          msg.event)
      });
    }

    // actually run the function, and reply w/ its return value.
    try {
      reply(msg, {
        event: 'data',
        value: func.apply(component, [].concat(msg.args))
      });
    }
    // oops, the method barfed for reasons.
    catch (e) {
      reply(msg, {
        event: 'warning',
        err: e.toString()
      });
    }
  });

  board = new j5.Board(_.extend(opts, {
    repl: false
  }))
    .on('ready', function () {
      process.send({
        event: 'ready',
        port: this.port
      });
    })
    .on('error', function (err) {
      error(err);
    });
}

if (require.main === module) {
  main(process.env);
}
