'use strict';

let events = require('events'),
  mqtt = require('mqtt'),
  pipeEvent = require('pipe-event'),
  Promise = require('bluebird'),
  _ = require('./mixins');

const MASTER = 'master',
  SLAVE = 'slave',
  DEFAULT_MODE = MASTER,
  DEFAULT_HOST = 'localhost',
  DEFAULT_PORT = 1833,
  REQUEST_DELIMITER = ':',
  REQUEST_PREFIX = 'req';

let REQUEST_REGEX = new RegExp(_.format('%s%s-\\d+$', REQUEST_DELIMITER,
    REQUEST_PREFIX)),
  debug = require('debug')('brickhouse:common:mqtt-client');

class MQTTClient extends events.EventEmitter {
  constructor(id, host, port, mode) {
    super();
    this.host = host || DEFAULT_HOST;
    this.port = port || DEFAULT_PORT;
    this.mode = mode || DEFAULT_MODE;
    this.id = id;
    this._reqQueue = [];

    this.conn = mqtt.connect({
      host: this.host,
      port: this.port
    })
      .on('connect', this._onConnect.bind(this))
      .on('message', this._onMessage.bind(this));

    pipeEvent('error', this.conn, this);
  }

  _onConnect() {
    debug('Client "%s" connected to MQTT server at host %s and port %d ' +
      'in "%s" mode', this.id, this.host, this.port, this.mode);
    let topic = _.format('%s/%s/+', this.id,
      this.mode === SLAVE ? MASTER : SLAVE);
    debug('Client "%s" listening for topic "%s"', this.id, topic);
    this.conn.subscribe(topic);
    this.publish('online');
  }

  _onMessage(topic, message) {
    var data;
    let str = message.toString();
    try {
      data = str ? JSON.parse(str) : null;
    }
    catch (e) {
      throw new Error('Malformed message');
    }
    let path = topic.split('/');

    debug('Client received "%s"', topic, data);

    if (REQUEST_REGEX.test(_.last(path))) {
      let tuple = path.pop().split(REQUEST_DELIMITER),
        reqId = tuple[1],
        request = _.first(this._reqQueue);
      topic = tuple[0];
      if (request && request.id === reqId) {
        // response
        this.emit(_.format('response-%s', reqId), data);
      } else if (!_.contains(this._reqQueue, reqId)) {
        // incoming request
        debug('Incoming request "%s" with topic "%s" received', reqId, topic);
        this.emit(topic, data, function (response) {
          debug('Responding to request "%s"', reqId);
          this.publish(_.format('%s%s%s', topic, REQUEST_DELIMITER, reqId),
            response);
        }.bind(this));
      } else {
        this.emit('error', 'Invalid request ID received: %s', reqId);
      }
    } else {
      topic = _.last(path);
      debug('Received topic "%s"', topic);
      this.emit(topic, data);
    }
  }

  _push(topic, message, id) {
    this._reqQueue.push({
      id: id,
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
      debug('Processing request "%s"', req.id);
      this.publish(_.format('%s%s%s', req.topic, REQUEST_DELIMITER, req.id),
        req.message);
    }
  }

  publish(topic, message) {
    topic = _.format('%s/%s/%s', this.id, this.mode, topic);
    try {
      message = JSON.stringify(message);
    } catch (e) {
      return this.emit('error', e);
    }
    debug('Publishing topic "%s"', topic, message);
    return this.conn.publish(topic, message, function (err) {
      if (err) {
        this.emit('error', err);
      }
    }.bind(this));
  }

  request(topic, message) {
    let id = _.uniqueId(REQUEST_PREFIX + '-');
    debug('Created request "%s" on topic "%s"', id, topic);
    this._push(topic, message, id);
    return new Promise(function (resolve) {
      debug('Waiting for response for request "%s"', id);
      this.on(_.format('response-%s', id), function (data) {
        debug('Response "%s" successfully received', id);
        resolve(data);
        this._reqQueue.shift();
        this._next();
      });
    }.bind(this));
  }
}

module.exports = MQTTClient;
