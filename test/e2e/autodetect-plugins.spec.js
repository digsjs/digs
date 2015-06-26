'use strict';

let Digs = require('../../lib/digs');

describe('plugin autodetection', function () {

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('plugin autodetection');
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should autodetect plugins', function () {
    let digs = new Digs({ autoDetectPlugins: true });
    return digs._autoDetected.then(function () {
      expect(digs._registeredPlugins.digsBroker.func)
        .to.equal(require('digs-broker'));
    });
  });

});
