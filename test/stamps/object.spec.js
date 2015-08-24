'use strict';

describe('stamps.DigsObject', function() {
  const Server = require('hapi').Server;
  const DigsObject = require('../../lib/stamps/object');
  const SERVER_CFG = {
    app: {
      namespace: 'digs',
      project: 'home'
    }
  };
  let sandbox;
  let digs;

  beforeEach(function() {
    sandbox = sinon.sandbox.create('DigsObject');
    digs = new Server(SERVER_CFG);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should be a function', function() {
    expect(DigsObject).to.be.a('function');
  });

  it('should throw if not passed a parameter', function() {
    expect(DigsObject).to.throw(Error);
  });

  it('should throw if not passed a "digs" param and value with ' +
    '"namespace" and "project" app settings',
    function() {
      expect(function() {
        DigsObject({});
      }).to.throw(Error);
    });

  it('should not throw if passed a "digs" param and value with ' +
    '"namespace" and "project" app settings', function() {
    expect(function() {
      DigsObject({}, digs);
    }).not.to.throw();
  });

  it('should use an EventEmitter', function() {
    expect(DigsObject({}, digs).on).to.be.a('function');
    expect(DigsObject({}, digs).emit).to.be.a('function');
  });

  it('should have a "namespace" property', function() {
    expect(DigsObject({}, digs).namespace).to
      .equal(SERVER_CFG.app.namespace);
  });

  it('should have a "project" property', function() {
    expect(DigsObject({}, digs).project).to.equal(SERVER_CFG.app.project);
  });

  it('should have a digs property', function() {
    expect(DigsObject({}, digs).digs).to.equal(digs);
  });
});
