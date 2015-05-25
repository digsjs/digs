'use strict';

let mqtt = require('mqtt'),
  _ = require('lodash');

let debug = require('debug')('brickhouse:common:mqtt-server');

const DEFAULT_PORT = 1833;

function handler(client) {
  if (!this.clients) {
    this.clients = {};
  }

  client.on('connect', function (packet) {
    this.clients[packet.clientId] = client;
    client.id = packet.clientId;
    debug('CONNECT: client id: ' + client.id);
    client.subscriptions = [];
    client.connack({
      returnCode: 0
    });
  }.bind(this));

  client.on('subscribe', function (packet) {
    debug('SUBSCRIBE(%s): %j', client.id, packet);

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
    debug('PUBLISH(%s): %j', client.id, packet);
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
    client.pingresp();
  });

  client.on('disconnect', function () {
    client.stream.end();
  });

  client.on('close', function () {
    delete this.clients[client.id];
  }.bind(this));

  client.on('error', function (e) {
    client.stream.end();
    debug(e);
  });
}

function createServer(opts) {
  opts = _.defaults(opts || {}, {
    port: DEFAULT_PORT
  });
  return new mqtt.Server(handler)
    .listen(opts.port);
}

module.exports = createServer;
