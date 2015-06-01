'use strict';

let mqtt = require('mqtt'),
  _ = require('../lodash-mixins');

let debug = require('debug')('digs:common:mqtt:broker');

const DEFAULT_PORT = 1833,
  PING_NOTIFICATION_DEBOUNCE_MS = 30000,
  DEFAULT_HOST = 'localhost';

function _notifyPing(client) {
  debug('<mqtt.broker>: <%s#%s> is alive', client.constructor.name, client.id);
}

function end(client) {
  client.stream.end();
}

let notifyPing = _.debounce(_notifyPing, PING_NOTIFICATION_DEBOUNCE_MS);

function handler(client) {
  if (!this.clients) {
    this.clients = {};
  }

  client.on('connect', function (packet) {
    this.clients[packet.clientId] = client;
    client.id = packet.clientId;
    debug('<mqtt.broker>: <%s#%s> connected', client.constructor.name,
      client.id);
    client.subscriptions = [];
    client.connack({
      returnCode: 0
    });
  }.bind(this));

  client.on('subscribe', function (packet) {
    debug('<mqtt.broker>: <%s#%s> subscribing to topic(s):',
      this.constructor.name, this.id,
      _.pluck(packet.subscriptions, 'topic'));

    let granted = _.map(packet.subscriptions, function (subscription) {
      let qos = subscription.qos,
        topic = subscription.topic,
        rx = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') + '$');

      client.subscriptions.push(rx);
      return qos;
    });

    client.suback({
      messageId: packet.messageId,
      granted: granted
    });
  });

  client.on('publish', function (packet) {
    debug('<mqtt.broker>: <%s#%s> published topic "%s" w/ payload',
      client.constructor.name, client.id, packet.topic,
      packet.payload.toString());
    _.each(this.clients, function (client) {
      _.each(client.subscriptions, function (subscription) {
        if (subscription.test(packet.topic)) {
          client.publish({
            topic: packet.topic,
            payload: packet.payload
          });
          return false;
        }
      });
    });
  }.bind(this));

  client.on('pingreq', function () {
    notifyPing(this);
    this.pingresp();
  });

  client.on('disconnect', function () {
    debug('<mqtt.broker>: <%s#%s> disconnected', client.constructor.name,
      client.id);
    end(this);
  });

  client.on('close', function () {
    debug('<mqtt.broker>: deleted reference to <%s#%s>',
      client.constructor.name, client.id);
    delete this.clients[client.id];
  }.bind(this));

  client.on('error', function (e) {
    debug('<mqtt.broker>: received error from <%s#%s>', this.constructor.name,
      this.id, e);
    end(this);
  });
}

function createServer(opts) {
  opts = _.defaults(opts || {}, {
    port: DEFAULT_PORT,
    host: DEFAULT_HOST
  });
  let broker = new mqtt.Server(handler);
  debug('<mqtt.broker>: Instantiated local broker w/ opts:', opts);
  broker.listen(opts.port, opts.host, function () {
    let address = this.address();
    debug('<mqtt.broker>: Local broker listening on %s:%s', address.address,
      address.port);
  });
  return broker;
}

module.exports = createServer;
