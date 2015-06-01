'use strict';

let DigsEmitter = require('./common/digs-emitter'),
  j5 = require('johnny-five'),
  Joi = require('joi'),
  MQTTClient = require('./common/mqtt/client'),
  _ = require('./common/lodash-mixins'),
  Promise = require('bluebird'),
  pipeEvent = require('pipe-event');

process.on('unhandledRejection', function (err) {
  if (_.isFunction(process.send)) {
    process.send(err);
    /* eslint no-process-exit:0 */
    process.exit(1);
  } else {
    throw new Error(err);
  }
});


let BOARD_DEFAULTS = {
    repl: false,
    debug: false
  },
  debug = require('debug')('digs:worker:peon');

/**
 * @typedef {Object} Message
 */

/**
 * @typedef {Function} Command
 */

/**
 *
 */
class Peon extends DigsEmitter {
  constructor() {
    super();

    /**
     * Lookup of J5 Component IDs to the corresponding J5 Component object.
     * @type {Object.<string,Object>}
     */
    this.components = {};
    this.publisherId = process.env.DIGS_ID;
    this.id = this.publisherId + '-local';
    this.project = process.env.DIGS_PROJECT;

    debug('Instantiated Peon w/ PID %d and id "%s"', process.pid, this.id);
    debug('Relevant environment: ', _.pick(process.env, function (value, key) {
      return /^DIGS_/.test(key);
    }));
  }

  connect() {
    let env = process.env,
      host = env.DIGS_MQTT_HOST,
      port = _.parseInt(env.DIGS_MQTT_PORT);

    this.client = new MQTTClient({
      project: this.project,
      namespace: env.DIGS_NAMESPACE
    }, {
      id: this.id,
      host: host,
      port: port
    });

    this.client.subscribe({
      clientId: this.publisherId,
      project: this.project,
      wildcard: '#'
    });

    _.each(['init', 'instantiate', 'dir', 'execute'], function (funcName) {
      this.client.on('topic:' + funcName, function (message, reply) {
        let method = Promise.method(function (funcName, message) {
          return this[funcName](message);
        }.bind(this));

        method(funcName, message)
          .then(function (response) {
            try {
              JSON.stringify(response);
              reply(response);
            }
            catch (e) {
              reply({ success: true });
            }
          });
      }.bind(this));
    }, this);
  }

  /**
   * Get a list of all methods by either component class or component id.
   * @param {Request} message Message from parent
   * @param {string} [message.id] ID of component
   * @param {string} [message.componentClass] J5 class name
   * @type {Command}
   * @returns {{methods: Array.<string>}} List of methods
   */
  dir(message) {
    let id = message.id,
      componentClass = message.componentClass;

    debug('Gathering methods for component %s', id || componentClass);

    return {
      methods: _.filter((id ?
        _.functions(this.components[message.id]) :
        _.functions(j5[componentClass].prototype)), function (methodName) {
        // filter out private methods
        return methodName.charAt(0) !== '_';
      })
    };
  }

  /**
   * Initialize the Johnny-Five Board.  {@link BOARD_DEFAULTS} are applied, and
   * a unique ID with prefix `j5-board-` is generated if none present.
   * @param {Request} message Message object
   * @param {Object} message.opts Opts to pass to the Board instance
   * @returns {{id: string}} ID of Board object.
   */
  init(opts) {
    // TODO joi assert
    _.defaults(opts, {
      id: _.uniqueId('j5-board-')
    }, BOARD_DEFAULTS);

    debug('Initializing j5 Board with opts', opts);

    let board = this._board =
      new j5.Board(opts);

    return new Promise(function (resolve, reject) {
      board.on('ready', resolve)
        .on('error', reject);
    })
      .return(board.id);
  }

  /**
   * Returns {@link Peon#components}.
   * @returns {Peon.components} All instantiated components
   */
  components() {
    return this.components;
  }

  instantiate(message) {
    let componentClass = message.componentClass,
      Constructor = j5[componentClass],
      opts;
    if (!Constructor) {
      debug('unknown component');
      return;
    }

    opts = _.defaults(message.opts || {}, {
      id: _.uniqueId(_.format('%s-', this.componentClass)),
      board: this._board
    });

    debug('Attempting to instantiate a "%s" component', componentClass);

    try {
      this.components[opts.id] = new Constructor(opts);
    }
    catch (e) {
      debug('Failed to instantiate component class "%s": %s',
        componentClass, e.toString());
      debug(e);
      return;
    }

    return {
      id: opts.id,
      componentClass: componentClass
    };
  }

  execute(message) {
    let component = this.components[message.id];
    return component[message.method].apply(component, message.args);
  }
}

Peon.schemas = {
  commands: {
    dir: Joi.object().keys({
      id: Joi.string(),
      componentClass: Joi.string()
    }).xor('id', 'componentClass'),
    components: Joi.any(),
    instantiate: Joi.object().keys({
      componentClass: Joi.string().required(),
      opts: Joi.object()
    })
  }
};

module.exports = Peon;

if (require.main === module) {
  new Peon().connect();
}
