'use strict';

let Promise = require('bluebird'),
  FSUtils = require('../../../lib/fsutils'),
  path = require('path'),
  pkg = require('../../../package.json');

describe('Plugins', function () {

  const parentPkg = {
      dependencies: {
        foo: '1.0.0',
        bar: '0.1.0',
        baz: '9.9.9'
      }
    },
    fooPkg = {
      name: 'foo',
      keywords: [`${pkg.name}-plugin`]
    },
    barPkg = {
      name: 'bar'
    },
    bazPkg = {
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

  describe('findPlugins', function () {

    let Plugins,
      PARENT_DIR = path.join('some', 'path'),
      NODE_MODULES = 'node_modules',
      PACKAGE_JSON = 'package.json';

    beforeEach(function () {
      sandbox.stub(FSUtils, 'findup')
        .returns(Promise.resolve(path.join(PARENT_DIR, PACKAGE_JSON)));

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

    it('should return a mapping of plugins to their main modules', function () {
      return Plugins.discoverPlugins()
        .then(function (result) {
          expect(result).to.eql({
            baz: path.join(PARENT_DIR, NODE_MODULES, 'baz'),
            foo: path.join(PARENT_DIR, NODE_MODULES, 'foo')
          });
        });
    });

    it('should accept a current working directory parameter', function () {
      return Plugins.discoverPlugins(PARENT_DIR)
        .then(function () {
          expect(FSUtils.findup).to.have.been.calledWith(PARENT_DIR);
        });
    });

  });
});
