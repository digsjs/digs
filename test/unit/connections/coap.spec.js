'use strict';

describe('connections/coap', function() {
  let coap = require('../../../lib/connections/coap');
  let net = require('net');
  let sandbox;
  let digs;

  beforeEach(function() {
    sandbox = sinon.sandbox.create('connections/coap');
    digs = {
      log: sandbox.stub()
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('createProxy', function() {
    let nodeCoap = require('coap');
    let createProxy = coap.createProxy;
    let req;
    let res;

    function getCoAPServer() {
      return nodeCoap.createServer.firstCall.returnValue;
    }

    beforeEach(function() {
      sandbox.stub(nodeCoap.createServer.prototype, 'listen').callsArg(0);
      req = {
        path: '/some/path'
      };
      res = {};
    });

    it('should create a CoAPServer', function() {
      sandbox.spy(nodeCoap, 'createServer');
      createProxy(digs);
      expect(nodeCoap.createServer).to.have.been.calledOnce;
    });

    it('should create a TCP server', function() {
      expect(createProxy(digs)).to.be.instanceof(net.Server);
    });

    it('should throw if no server instance passed', function() {
      expect(createProxy).to.throw(Error);
    });

    describe('CoAPServer "close" event', function() {
      it('should also close the TCP server', function(done) {
        sandbox.spy(nodeCoap, 'createServer');
        let tcpServer = createProxy(digs);
        let coapServer = getCoAPServer();
        sandbox.restore(nodeCoap, 'createServer');
        expect(coapServer).to.be.instanceof(nodeCoap.createServer);
        let stub = sandbox.stub();
        tcpServer.on('close', stub);
        coapServer._sock = require('dgram').createSocket('udp4');
        coapServer.close();
        process.nextTick(function() {
          expect(stub).to.have.been.calledOnce;
          done();
        });
      });
    });

    describe('TCP server "close" event', function() {
      it('should also close the CoAPServer', function(done) {
        sandbox.spy(nodeCoap, 'createServer');
        let tcpServer = createProxy(digs);
        let coapServer = getCoAPServer();
        sandbox.restore(nodeCoap, 'createServer');
        expect(coapServer).to.be.instanceof(nodeCoap.createServer);
        let stub = sandbox.stub();
        coapServer.on('close', stub);
        coapServer._sock = require('dgram').createSocket('udp4');
        tcpServer.close();
        process.nextTick(function() {
          expect(stub).to.have.been.calledOnce;
          done();
        });
      });
    });

    describe('CoAPServer "request" event', function() {
      beforeEach(function() {
        sandbox.stub(net.Server.prototype, 'emit');
        sandbox.spy(nodeCoap, 'createServer');
      });

      it('should emit a "request" event to the TCP server', function() {
        let tcpServer = createProxy(digs);
        let coapServer = getCoAPServer();
        coapServer.emit('request', req, res);
        expect(tcpServer.emit).to.have.been.calledWithExactly('request',
          req,
          res);
      });

      it('should log something', function() {
        createProxy(digs);
        let coapServer = getCoAPServer();
        coapServer.emit('request', req, res);
        expect(digs.log).to.have.been.called;
      });
    });

    describe('listen() callback', function() {
      beforeEach(function() {
        sandbox.spy(nodeCoap, 'createServer');
      });

      it('should call CoAPServer.prototype.listen()', function() {
        createProxy(digs);
        let coapServer = getCoAPServer();
        expect(coapServer.listen).to.have.been.calledOnce;
      });

      it('should log something', function() {
        createProxy(digs);
        let coapServer = getCoAPServer();
        coapServer.emit('request', req, res);
        expect(digs.log).to.have.been.called;
      });
    });
  });

  describe('connect()', function() {
    beforeEach(function() {
      sandbox.stub(require('tmp'), 'tmpNameSync').returns('/some/path');
      sandbox.stub(coap, 'createProxy').returns({});
    });

    it('should call createProxy()', function() {
      coap();
      expect(coap.createProxy).to.have.been.calledOnce;
    });

    it('should return a Hapi connection configuration object', function() {
      expect(coap()).to.eql({
        listener: {},
        port: '/some/path',
        labels: ['coap']
      });
    });
  });
});
