'use strict';

let Digs = require('../../../lib/digs'),
  DigsEmitter = require('digs-common/digs-emitter');

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

  });

});
