'use strict';

process.env.DEBUG = 'digs:plugins';

let Promise = require('bluebird');
let rewire = require('rewire');
let Plugins = rewire('../../../lib/plugins');
let path = require('path');
let pkg = require('../../../package.json');
let fs = require('fs');

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

  describe('discoverPlugins()', function () {

    let PARENT_DIR = path.join('some', 'path');
    let NODE_MODULES = 'node_modules';
    let PACKAGE_JSON = 'package.json';
    let CHARSET = 'utf8';

    beforeEach(function () {
      sandbox.stub(fs, 'readFileAsync')
        .withArgs(path.join(PARENT_DIR, PACKAGE_JSON), CHARSET)
        .returns(Promise.resolve(JSON.stringify(parentPkg)))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'foo', PACKAGE_JSON),
        CHARSET)
        .returns(Promise.resolve(JSON.stringify(fooPkg)))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'bar', PACKAGE_JSON),
        CHARSET)
        .returns(Promise.resolve(JSON.stringify(barPkg)))
        .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'baz', PACKAGE_JSON),
        CHARSET)
        .returns(Promise.resolve(JSON.stringify(bazPkg)));
      Plugins.__set__('findup',
        sandbox.stub().returns(Promise.resolve(PARENT_DIR)));
    });

    it('should be a function', function () {
      expect(Plugins.discoverPlugins).to.be.a('function');
    });

    it('should return a list of plugin paths', function () {
      return expect(Plugins.discoverPlugins()).to.eventually.eql([
        path.join(PARENT_DIR, NODE_MODULES, 'foo'),
        path.join(PARENT_DIR, NODE_MODULES, 'baz')
      ]);
    });

    it('should throw if parent package.json not present', function () {
      Plugins.__set__('findup',
        sandbox.stub().returns(Promise.reject('reasons')));

      return expect(Plugins.discoverPlugins()).to.eventually.be.rejected;
    });

    it('should ignore a dependency if the package.json cannot be read',
      function () {
        fs.readFileAsync.restore();
        sandbox.stub(fs, 'readFileAsync')
          .withArgs(path.join(PARENT_DIR, PACKAGE_JSON), CHARSET)
          .returns(Promise.resolve(JSON.stringify(parentPkg)))
          .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'foo', PACKAGE_JSON),
          CHARSET)
          .returns(Promise.reject('reasons'))
          .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'bar', PACKAGE_JSON),
          CHARSET)
          .returns(Promise.resolve(JSON.stringify(barPkg)))
          .withArgs(path.join(PARENT_DIR, NODE_MODULES, 'baz', PACKAGE_JSON),
          CHARSET)
          .returns(Promise.resolve(JSON.stringify(bazPkg)));

        return expect(Plugins.discoverPlugins()).to.eventually.eql([
          path.join(PARENT_DIR, NODE_MODULES, 'baz')
        ]);
      });
  });

  describe('autoDetect()', function () {

    beforeEach(function () {
      sandbox.stub(Plugins, 'discoverPlugins', function (cwd) {
        return Promise.resolve(cwd);
      });
      sandbox.stub(Plugins, 'requirePlugins', function (cwd) {
        return Promise.resolve(cwd);
      });
    });

    it('should call discoverPlugins and requirePlugins', function () {
      let dirpath = '/some/path';
      expect(Plugins.autoDetect(dirpath)).to.eventually.equal(dirpath)
        .then(function () {
          expect(Plugins.discoverPlugins).to.have.been
            .calledWithExactly(dirpath);
          expect(Plugins.requirePlugins).to.have.been
            .calledWithExactly(dirpath);
        });
    });

    it('should not throw if not passed a cwd', function () {
      expect(function () {
        Plugins.autoDetect();
      }).to.not.throw;
    });

    it('should catch any errors', function () {
      Plugins.discoverPlugins.restore();
      sandbox.stub(Plugins, 'discoverPlugins')
        .returns(Promise.reject());
      expect(Plugins.autoDetect()).to.eventually.be.rejected;
    });
  });

  describe('requirePlugin()', function () {

    it('should throw if not passed a path', function () {
      return expect(Plugins.requirePlugin).to.throw;
    });
  });
});
