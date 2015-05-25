/* eslint-env mocha */
/* global expect */

'use strict';

let Hapi = require('hapi'),
  getPort = require('get-port'),
  Promise = require('bluebird'),
  pkg = require('../../package.json'),
  Board = require('../../lib/board/board'),
  routes = require('../../lib/routes');

getPort = Promise.promisify(getPort);

function setBoards(server, boards) {
  boards = boards || {};
  server.plugins[pkg.name] = {
    boards: boards
  };
}

describe('routes', function () {

  let server;

  before(function () {
    server = new Hapi.Server();
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

  describe('/boards', function () {
    it('should list no boards if none configured', function (done) {
      let options = {
        method: 'GET',
        url: '/boards'
      };

      setBoards(server);

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.eql(server.plugins[pkg.name].boards);
        done();
      });
    });

    it('should list a board if one is configured', function (done) {
      let options = {
        method: 'GET',
        url: '/boards'
      };

      setBoards(server, {
        slime: new Board(server, {id: 'slime'})
      });

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);
        // note the lack of a port
        expect(response.result).to.eql([{
          id: 'slime',
          connected: false,
          onReady: false
        }]);
        done();
      });
    });
  });

  describe('/board/{id}', function () {
    it('should pop a 404 if no board matching ID found', function (done) {
      let options = {
        method: 'GET',
        url: '/boards/slime'
      };

      setBoards(server);

      server.inject(options, function (response) {
        expect(response.statusCode).to.equal(404);
        expect(response.error).to.equal('Not Found');
        expect(response.onMessage).to.equal('Unknown board with ID "slime"');
        done();
      });
    });
  });
});
