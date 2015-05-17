'use strict';

const j5 = require('johnny-five'),
  util = require('util'),
  utils = require('./utils'),
  _ = require('lodash');

let reply = utils.reply,
  send = utils.send,
  error = utils.error,
  format = util.format,
  opts, id, commands, methods, board,
  components = {},
  env = process.env,
  debug = require('debug')('brickhouse:worker');

process.on('error', function (err) {
  error(err);
});

methods = _.memoize(function methods(id) {
  return _.functions(components[id]);
}, function resolver(id) {
  if (!components[id]) {
    delete methods.cache[id];
  }
  return id;
});

require('./patch');

if (!env.BRICKHOUSE_BOARD) {
  error('Environment missing "BRICKHOUSE_BOARD" property');
}
try {
  board = JSON.parse(env.BRICKHOUSE_BOARD);
} catch (e) {
  error('Invalid (non-JSON) "BRICKHOUSE_BOARD" environment variable');
}

debug('Board "%s" ChildProcess online', board.id);

send({
  event: 'online',
  id: board.id
});


process.on('message', function (msg) {
  let func, component;

  send({
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

board = new j5.Board(_.extend(board, {
  repl: false
}))
  .on('ready', function () {
    send({
      event: 'ready',
      port: this.port
    });
  })
  .on('error', function (err) {
    error(err);
  });
