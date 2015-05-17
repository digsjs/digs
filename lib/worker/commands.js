'use strict';

var commands = Object.freeze({
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

module.exports = commands;
