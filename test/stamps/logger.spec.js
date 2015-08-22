'use strict';

describe('stamps.DigsLogger', function() {
  const Server = require('hapi').Server;
  const DigsLogger = require('../../lib/stamps/logger');
  const _ = require('digs-utils');
  const chalk = require('chalk');

  chalk.enabled = false;

  const SERVER_CFG = {
    app: {
      namespace: 'digs',
      project: 'home'
    }
  };

  let sandbox;
  let digs;

  beforeEach(function() {
    sandbox = sinon.sandbox.create('DigsLogger');
    digs = new Server(SERVER_CFG);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should be a function', function() {
    expect(DigsLogger).to.be.a('function');
  });

  it('should use DigsObject', function() {
    expect(DigsLogger).to.throw();
    expect(DigsLogger({digs: digs})).not.to.throw;
  });

  it('should have a log() function', function() {
    expect(DigsLogger({digs: digs}).log).to.be.a('function');
  });

  it('should have convenience logging methods', function() {
    const dl = DigsLogger({digs: digs});
    expect(dl.debug).to.be.a('function');
    expect(dl.ok).to.be.a('function');
    expect(dl.info).to.be.a('function');
    expect(dl.warn).to.be.a('function');
    expect(dl.error).to.be.a('function');
  });

  describe('log()', function() {
    let dl;

    beforeEach(function() {
      dl = DigsLogger({digs: digs});
      sandbox.stub(dl.digs, 'log');
    });

    it('should not call digs.log() if no parameters passed', function() {
      dl.log();
      expect(dl.digs.log).not.to.have.been.called;
    });

    it('should call digs.log()', function() {
      dl.log('foo');
      expect(dl.digs.log).to.have.been.calledOnce;
    });

    it('should insert default tags', function() {
      dl.log('foo');
      expect(dl.digs.log).to.have.been.calledWithExactly([
        dl.namespace,
        dl.project
      ], 'foo');
    });

    it('should append any other tags to the list of tags', function() {
      dl.log('bar', 'foo');
      expect(dl.digs.log).to.have.been.calledWithExactly([
        dl.namespace,
        dl.project,
        'foo'
      ], 'bar');
    });

    describe('convenience methods', function() {
      _.each([
        'debug',
        'ok',
        'error',
        'info',
        'warn'
      ], function(methodName) {
        it(`should add "${methodName}" to the list of tags`, function() {
          dl[methodName]('foo');
          expect(dl.digs.log).to.have.been.calledWithExactly([
            dl.namespace,
            dl.project,
            methodName
          ], 'foo');
        });
      });
    });
  });
});
