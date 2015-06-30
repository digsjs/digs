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

  it.skip('should autodetect external plugins', function () {
    let d = new Digs({ autoDetectPlugins: true });
    return d.start().then(function () {
      expect(d._unloadedPlugins['digs-mqtt-broker'].func)
        .to.equal(require('digs-mqtt-broker'));
    });
  });
});
