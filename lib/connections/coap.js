'use strict';

let coap = require('coap');
let net = require('net');
let tmp = require('tmp');
let _ = require('lodash');

function createProxy(digs, opts) {
  opts = opts || {};
  opts.coap = opts.coap || {};

  if (_.isUndefined(digs)) {
    throw new Error('server instance required');
  }

  let coapServer = coap.createServer(opts.coap);
  let coapProxyServer = new net.Server();

  coapServer.on('close', function onClose() {
    coapProxyServer.close();
  })
    .on('request', function onRequest(req, res) {
      digs.log([
        'digs',
        'coap'
      ],
        `CoAP server received request for ${req.path}`);
      coapProxyServer.emit('request', req, res);
    })
    .listen(function onListen() {
      digs.log(['digs', 'coap'], 'CoAP server listening');
    });

  coapProxyServer.on('close', function() {
    coapServer.close();
  });

  return coapProxyServer;
}

function connect(digs, opts) {
  let port = tmp.tmpNameSync();
  return {
    listener: connect.createProxy(digs, opts, port),
    port: port,
    labels: ['coap']
  };
}

connect.createProxy = createProxy;
module.exports = connect;
