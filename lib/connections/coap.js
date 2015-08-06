'use strict';

let coap = require('coap');
let net = require('net');
let tmp = require('tmp');

function createProxy() {
  let coapServer = coap.createServer();

  let server = new net.Server();

  coapServer.on('close', function onClose() {
    server.close();
  });
  coapServer.listen(function onList() {
    coapServer.on('request', function onRequest(req, res) {
      server.emit('request', req, res);
    });
  });

  return server;
}

function connect(opts) {
  return {
    listener: createProxy(),
    port: tmp.tmpNameSync(),
    uri: `coap://${opts.coap.address}:${opts.coap.port}`,
    labels: ['coap']
  };
}

module.exports = connect;
