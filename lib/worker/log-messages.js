'use strict';

let _ = require('lodash'),
  util = require('util');

let format = util.format;

let messages = {
  missingEnv: 'Environment missing "BRICKHOUSE_BOARD" property',
  invalidEnv: 'Invalid (non-JSON) "BRICKHOUSE_BOARD" environment variable',
  receivedMessage: function receivedMessage(message) {
    return ['Received message', message];
  },
  missingComponent: function missingComponent(id) {
    return ['No component with ID "%s" found', id];
  },
  invalidComponentMethod: function invalidComponentMethod(id, event) {
    return ['Component with ID "%s" has no method "%s"', id, event];
  },
  unknownComponent: function unknownComponent(klass) {
    return ['Unknown component "%s"', klass];
  }
};

messages = _.mapValues(messages, function (func) {
  if (!_.isFunction(func)) {
    return function() {
      return func;
    };
  }
  return function () {
    return format.apply(null, func.call(null, arguments));
  };
});

module.exports = messages;
