'use strict';

let Promise = require('bluebird');
let FSUtils = require('../../../lib/fsutils');
let path = require('path');
let pkg = require('../../../package.json');

describe('Plugins', function () {

  const parentPkg = {
    dependencies: {
      foo: '1.0.0',
      bar: '0.1.0',
      baz: '9.9.9'
    }
  };
  const fooPkg = {
    name: 'foo',
    keywords: [`${pkg.name}-plugin`]
  };
  const barPkg = {
    name: 'bar'
  };
  const bazPkg = {
    name: 'baz',
    keywords: [`${pkg.name}plugin`]
  };

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Plugins');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('discoverPlugins', function () {

    let Plugins;
    let PARENT_DIR = path.join('some', 'path');
    let NODE_MODULES = 'node_modules';
    let PACKAGE_JSON = 'package.json';

    beforeEach(function () {
      sandbox.stub(FSUtils, 'findup')
        .returns(Promise.resolve(PARENT_DIR));

      sandbox.stub(FSUtils.fs, 'readFileAsync')
        .withArgs(path.join(PARENT_DIR, PACKAGE_JSON))
        .returns(Promise.resolve(JSON.stringify(parentPkg)))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'foo', PACKAGE_JSON))
        .returns(JSON.stringify(fooPkg))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'bar', PACKAGE_JSON))
        .returns(JSON.stringify(barPkg))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'baz', PACKAGE_JSON))
        .returns(JSON.stringify(bazPkg));

      Plugins = require('../../../lib/plugins');
    });

    it('should be a function', function () {
      expect(Plugins.discoverPlugins).to.be.a('function');
    });

    it('should return a list of plugin paths', function () {
      return Plugins.discoverPlugins()
        .then(function (result) {
          expect(result).to.eql([
            path.join(PARENT_DIR, NODE_MODULES, 'foo'),
            path.join(PARENT_DIR, NODE_MODULES, 'baz')
          ]);
        });
    });

  });
});
