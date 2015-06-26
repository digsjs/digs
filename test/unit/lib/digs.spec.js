'use strict';

let Digs = require('../../../lib/digs');
let DigsEmitter = require('digs-common/digs-emitter');
let Promise = require('bluebird');
let path = require('path');

describe('Digs', function () {

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Digs');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should be an DigsEmitter instance', function () {
      expect(new Digs()).to.be.instanceOf(DigsEmitter);
    });

    it('should autodetect included plugins', function () {
      let Plugins = require('../../../lib/plugins');
      let plugin = { foo: 'bar' };
      sandbox.stub(Plugins, 'autoDetect').returns(Promise.resolve([plugin]));
      sandbox.stub(Digs.prototype, 'use');
      let digs = new Digs();
      return digs._autoDetected.then(function () {
        expect(Plugins.autoDetect).to.have.been.called;
        expect(digs.use).to.have.been.calledWith([plugin]);
      });
    });

    it('should autodetect external plugins', function () {
      let Plugins = require('../../../lib/plugins');
      let plugin = { foo: 'bar' };
      sandbox.stub(Plugins, 'autoDetect').returns(Promise.resolve([plugin]));
      sandbox.stub(Digs.prototype, 'use');
      let digs = new Digs({ autoDetectPlugins: true });
      return digs._autoDetected.then(function () {
        expect(Plugins.autoDetect).to.have.been.calledTwice;
        expect(Plugins.autoDetect.firstCall.args).to.eql([]);
        expect(Plugins.autoDetect.secondCall.args).to.eql([path.join(__dirname,
          '..',
          '..',
          '..',
          '..')]);
        expect(digs.use).to.have.been.calledWith([plugin, plugin]);
      });
    });

  });

});
