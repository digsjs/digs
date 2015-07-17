'use strict';

let DigsEmitter = require('digs-common/digs-emitter');
let pipeEvent = require('pipe-event');
let Promise = require('bluebird');
let ascoltatori = Promise.promisifyAll(require('ascoltatori'));
let Topic = require('./topic');
let errors = require('digs-common/errors');
let _ = require('lodash');
let domain = require('domain');

let debug = require('debug')('digs:digs-client');

class DigsClient extends DigsEmitter {
  constructor(opts) {
    super();

    this._opts = opts = _.defaults(opts || {}, {
      monitor: `${opts.namespace}/${opts.project}/+`
    });

    this._ready = null;
    this._domain = domain.create();
    this._domain.add(this);

    this.id = opts.project;

    this._topics = {};

    debug(`${this}: Instantiated`);
  }

  get isReady() {
    return this._ready && this._ready.isFulfilled();
  }

  start() {
    if (this._ready) {
      return this._ready;
    }

    let opts = this._opts.broker;

    // TODO handle this with Joi
    switch (opts.type) {
      case 'amqp':
        opts.amqp = opts.amqp || require('amqp');
        break;
      case 'redis':
        opts.redis = opts.redis || require('redis');
        break;
      case 'zmq':
        opts.zmq = opts.zmq || require('zmq');
        break;
      case 'filesystem':
        opts.qlobber_fsq = opts.qlobber_fsq || require('qlobber-fsq');
        break;
      default:
        opts.mqtt = opts.mqtt || require('mqtt');
        break;
    }

    debug(`Using broker w/ type "${opts.type}"`);

    return (this._ready = ascoltatori.buildAsync(opts)
      .bind(this)
      .then(function(ascoltatore) {
        ascoltatore.registerDomain(this._domain);
        Promise.promisifyAll(ascoltatore);
        this._ascoltatore = ascoltatore;
        pipeEvent('closed', ascoltatore, this);
        let message = opts = {
          clientId: this.id
        };
        return this.publish('online', message, opts);
      })
      .then(function() {
        this.emit('ready');
      }));
  }

  /**
   * Retrieve a cached Topic or generate a new one.  If options are given
   * and `path` is a Topic, update the Topic with the new options.
   * @param {(Topic|string)} path Fully-qualified topic, fragment, or Topic
   * @param {Object} [opts] Options
   * @returns {Topic} Generated or cached Topic
   */
  _topic(path, opts) {

    function isTopic() {
      path.update(opts);
      this._topics[String(path)] = path;
      return path;
    }

    function isString() {
      opts = _.defaults(opts || {}, {
        namespace: this.namespace,
        project: this.project,
        clientId: this.id
      }, opts);

      let repr = Topic.repr(_.extend({
        path: path
      }, opts));

      let topic;

      return (topic = this._topics[repr]) ? topic : createTopic.call(this);
    }

    function isObject() {
      opts = path;
      path = '';
      return createTopic.call(this);
    }

    function createTopic() {
      let topic = new Topic(path, opts);
      this._topics[String(topic)] = topic;
      return topic;
    }

    if (path instanceof Topic) {
      return isTopic.call(this);
    }

    if (_.isString(path)) {
      return isString.call(this);
    }

    if (_.isObject(path)) {
      return isObject.call(this);
    }

    // TODO validate w joi
    throw new Error(`invalid path: ${JSON.stringify(path)}`);
  }

  subscribe(path, opts, callback) {
    if (_.isObject(path)) {
      opts = path;
      path = '';
    }
    if (_.isFunction(opts)) {
      callback = opts;
      opts = {};
    }
    let topic = String(this._topic(path, opts));
    return this._ascoltatore.subscribe(topic, function(message) {
      return callback(message, topic);
    });
  }

  disconnect() {
    return this._ascoltatore.close();
  }

  publish(path, message, opts) {
    let topic = this._topic(path, opts);
    try {
      message = JSON.stringify(message);
    } catch (e) {
      return this.emit('error', e);
    }
    debug(`${this}: publishing topic "${topic}" w/ Topic and message:`, {
      topic: _.omit(topic, function(value, key) {
        return _.isUndefined(value) || key.charAt(0) === '_';
      }),
      message: message
    });

    return this._ascoltatore.publishAsync(String(topic), message)
      .catch(function(err) {
        debug(err);
        throw err;
      });
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
      // TODO joi validation
      throw new errors.InvalidParameterError();
    }
    debug(`${this}: topic "${topic}" received w/ data:`, message);

    if (topic.request) {
      let queue = this._reqQueue;

      if (_.find(queue, {
          reqId: topic.reqId
        })) {
        this._pushRes(topic, message);
        return;
      }

      debug('%s: received incoming request "%s" for topic "%s"; emitting ' +
        'event "%s"', this, topic.reqId, topic, topic.event);

      this.emit(topic.event, message, function(response) {
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

  _enqueueRequest(topic, message) {
    let queue = this._reqQueue;
    queue.push({
      topic: topic,
      message: message
    });
    this.emit('enqueue-request', topic, message);

    // if we're the only thing in the queue, immediately process it
    if (queue.length === 1) {
      process.nextTick(function(queue) {
        this._publishNextRequest(queue);
        this.emit('process-request-queue');
      }.bind(this, queue));
    }

    return this;
  }

  _dequeueRequest() {
    let req = this._reqQueue.shift();
    this.emit('dequeue-request', req.topic, req.message);
    process.nextTick(function() {
      this._publishNextRequest();
      this.emit('process-request-queue');
    }.bind(this));
  }

  _publishNextRequest() {
    let req = _.first(this._reqQueue);
    if (req) {
      let topic = req.topic;
      debug(`${this}: processing request queue; publishing request
      "${topic.reqId}"`);
      this.publish(topic, req.message);
      this.emit('publish-request', topic, req.message);
      this._dequeueRequest();
    }
    else {
      this.emit('requests-published');
    }
  }

  _pushRes(topic, message) {
    let queue = this._resQueue;
    this._push(queue, topic, message);

    if (_.first(this._reqQueue).reqId === topic.reqId) {
      this._nextRes(queue);
    }
  }

  _shiftRes() {
    this._resQueue.shift();
    this._nextRes();
  }

  _nextRes() {
    let res = _.first(this._resQueue);
    if (res) {
      let topic = res.topic;
      debug(`${this}: response received for request "${topic.reqId}"
      for topic "${topic}"`);
      this.emit(topic.response, res.message);
      this._shiftRes();
    }
  }

}

DigsClient.Topic = Topic;
DigsClient.CLIENT_SUFFIX = 'digs-client-';

module.exports = DigsClient;
