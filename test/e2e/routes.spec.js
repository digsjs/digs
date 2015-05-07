/* eslint-env mocha */
/* global expect */

'use strict';

var Hapi = require('hapi'),
  getPort = require('get-port'),
  Promise = require('bluebird'),
  pkg = require('../../package.json'),
  Board = require('../../lib/model'),
  routes = require('../../lib/routes');

getPort = Promise.promisify(getPort);

describe('routes', function () {

  var server;

  before(function () {
    server = new Hapi.Server();
    Promise.promisifyAll(server);
    return getPort()
      .then(function (port) {
        server.connection({port: port});
        return server.route(routes);
      });
  });

  after(function () {
    return server.stop({timeout: 0});
  });

  afterEach(function () {
    delete server.plugins[pkg.name];
  });

  describe('boards', function () {
    it('should list no boards if none configured', function (done) {
      var options = {
        method: 'GET',
        url: '/boards'
      };

      server.plugins[pkg.name] = {
        boards: []
      };

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.eql(server.plugins[pkg.name].boards);
        done();
      });
    });

    it('should list a board if one is configured', function (done) {
      var options = {
        method: 'GET',
        url: '/boards'
      };

      server.plugins[pkg.name] = {
        boards: [new Board({id: 'slime', port: '/dev/derp'})]
      };

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        // note the lack of a port
        expect(JSON.parse(response.payload)).to.eql([{
          id: 'slime',
          connected: false,
          ready: false
        }]);
        done();
      });
    });
  });
});
