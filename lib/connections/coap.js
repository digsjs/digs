'use strict';

let coap = require('coap');
let net = require('net');
let tmp = require('tmp');
let _ = require('lodash');

_.each(['Connection', 'Date'], coap.ignoreOption);

function createProxy(digs, opts) {
  opts = opts || {};

  if (_.isUndefined(digs)) {
    throw new Error('server instance required');
  }

  let coapServer = coap.createServer(opts);
  let coapProxyServer = new net.Server();

  coapServer.on('close', function onClose() {
    digs.log(['coap'], 'CoAP server closed');
    coapProxyServer.close();
  })
    .on('request', function onRequest(req, res) {
      digs.log(['coap'], `CoAP server received request for ${req.url}`);

      digs.select('coap').inject({
        method: req.method,
        headers: req.headers,
        url: req.url,
        payload: req.payload
      }, function(response) {
        res.code = response.statusCode;
        _.each(response.headers, function(value, key) {
          res.setOption(key, value);
        });
        res.end(response.rawPayload);
      });
    })
    .listen(function onListen() {
      digs.log(['coap'], 'CoAP server listening');
    });


  coapProxyServer.on('close', function() {
    digs.log(['coap'], 'CoAP proxy server closed');
    coapServer.close();
  });

  return coapProxyServer;
}

function connect(digs, options) {
  options = options || {};
  let opts = options.coap || {};
  return {
    listener: connect.createProxy(digs, opts),
    uri: `coap://${opts.address}:${opts.port}`,
    port: tmp.tmpNameSync(),
    labels: ['coap']
  };
}

connect.createProxy = createProxy;
module.exports = connect;
