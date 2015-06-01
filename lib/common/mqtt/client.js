'use strict';

let DigsEmitter = require('../digs-emitter'),
  mqtt = require('mqtt'),
  Topic = require('./topic'),
  errors = require('../errors'),
  pipeEvent = require('pipe-event'),
  Promise = require('bluebird'),
  _ = require('../lodash-mixins');

// TODO allow configuration of all of these
const DEFAULT_HOST = 'localhost',
  DEFAULT_PORT = 1833;

let debug = require('debug')('digs:common:mqtt:client');

class MQTTClient extends DigsEmitter {
  constructor(digs, opts) {
    super();

    opts = opts || {};
    _.defaults(opts, {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      id: _.uniqueId([digs.namepsace, digs.project, 'client', ''].join('-'))
    });

    if (opts.host === '::') {
      opts.host = DEFAULT_HOST;
    }

    _.extend(this, opts);

    this.digs = digs;
    this._reqQueue = [];
    this._topics = {};

    let connectionOpts = {
      clientId: this.id,
      host: this.host,
      port: this.port
    };

    debug('%s: instantiated', this, _.pick(this, 'host', 'port', 'id'));
    debug('%s: connecting to local MQTT broker @ %s:%d', this, this.host,
      this.port);

    this.conn = mqtt.connect(connectionOpts)
      .on('connect', function () {
        debug('%s: connected to local MQTT broker @ %s:%d', this, this.host,
          this.port);

        this.emit('connected', this);

        if (this.mode) {
          this.subscribeAll();
        }

        this.publish('online', {
          clientId: this.id
        }, {
          clientId: this.id
        });
      }.bind(this))
      .on('message', this._onMessage.bind(this));

    // TODO patch at prototype level
    this.conn.publish = Promise.promisify(this.conn.publish, this.conn);

    pipeEvent(['error', 'close'], this.conn, this);
  }

  /**
   * Retrieve a cached Topic or generate a new one
   * @param {(Topic|string)} path
   * @param {Object} [opts] Options
   * @returns {Topic} Generated or cached Topic
   */
  _topic(path, opts) {

    if (path instanceof Topic) {
      path.update(opts);
      this._topics[String(path)] = path;
      return path;
    }

    if (_.isString(path)) {
      opts = _.defaults({
        namespace: this.digs.namespace,
        project: this.digs.project,
        clientId: this.id
      }, opts);
      let repr = Topic.repr(_.extend({
        path: path
      }, opts));

      if (this._topics[repr]) {
        return this._topics[repr];
      }
    }
    else if (_.isObject(path)) {
      opts = path;
      path = '';
    }
    else {
      throw new Error(_.format('invalid topic: %j', path));
    }

    let topic = new Topic(path, opts);
    this._topics[String(topic)] = topic;
    return topic;
  }

  subscribe(path, opts) {
    let topic = this._topic(path, opts);
    return this.conn.subscribe(String(topic));
  }

  disconnect() {
    if (this.conn && this.conn.connected) {
      return Promise.promisify(this.conn.end, this.conn)();
    }
    return Promise.resolve();
  }

  publish(path, message, opts) {
    let topic = this._topic(path, opts);
    try {
      message = JSON.stringify(message);
    } catch (e) {
      return this.emit('error', e);
    }
    debug('%s: publishing topic "%s" w/ Topic and message:', this, topic,
      {
        topic: _.omit(topic, function (value, key) {
          return _.isUndefined(value) || key.charAt(0) === '_';
        }),
        message: message
      });

    return this.conn.publish(String(topic),
      message)
      .catch(function (err) {
        debug(err);
        throw err;
      });
  }

  request(path, message) {
    let topic = this._topic(path, {
      request: true
    });
    let reqId = topic.reqId;
    debug('%s: created request "%s" on topic "%s"', this, reqId, topic);
    this._push(topic, message);
    return new Promise(function (resolve) {
      debug('%s: waiting for response for request "%s" on topic "%s"', this,
        reqId, topic);
      this.on(topic.event, function (message) {
        debug('%s: response "%s" on topic "%s" received', this, reqId,
          topic.toString());
        resolve(message);
        this._reqQueue.shift();
        this._next();
      });
    }.bind(this));
  }

  _onMessage(repr, message) {
    try {
      message = JSON.parse(String(message)) || null;
    }
    catch (e) {
      throw new Error('Malformed message');
    }

    let topic = Topic.decompose(repr);
    if (topic === null) {
      throw new errors.InvalidParameterError();
    }
    debug('%s: topic "%s" received w/ data:', this, topic, message);

    if (topic.request) {

      if (this._reqQueue.length &&
        topic.reqId === _.first(this._reqQueue).reqId) {
        debug('%s: response received for request "%s" for topic "%s"', this,
          topic.reqId, topic);
        this.emit(topic.response, message);
        return;
      }

      debug('%s: received incoming request "%s" for topic "%s"; emitting ' +
        'event "%s"', this, topic.reqId, topic, topic.event);

      this.emit(topic.event, message, function (response) {
        debug('%s: responding to incoming request "%s" for topic "%s"', this,
          topic.reqId, topic);
        this.publish(topic, response, {
          clientId: this.id
        });
      }.bind(this));

      return;
    }
    this.emit(topic.event, message);
  }

  _push(topic, message) {
    this._reqQueue.push({
      message: message,
      topic: topic
    });
    if (this._reqQueue.length === 1) {
      this._next();
    }
  }

  _next() {
    let req = _.first(this._reqQueue);
    if (req) {
      debug('%s: processing request queue; publishing request "%s"', this,
        req.topic.reqId);
      return this.publish(req.topic, req.message);
    }
  }

}

module.exports = MQTTClient;
