#!/usr/bin/env node

'use strict';

var Hapi = require('hapi');

var server = new Hapi.Server();

server.connection({
  port: 8080
});

server.register({
  register: require('..')
}, function (err) {
  if (err) {
    throw new Error(err);
  }
  server.start(function () {
    console.log('brickhouse server listening at ', server.info.uri);
  });
});
