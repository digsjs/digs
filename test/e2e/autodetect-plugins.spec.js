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

  it('should autodetect internal plugins', function () {
    let digs = new Digs();
    return digs._autoDetected.then(function () {
      expect(digs._registeredPlugins.digsBroker.func)
        .to.equal(require('digs-broker'));
    });
  });

  it('should load internal plugins', function () {
    let digs = new Digs();
    return digs.start()
      .then(function () {
        expect(digs.digsBroker).to.be
          .instanceOf(require('digs-broker').DigsBroker);
      });
  });

});
