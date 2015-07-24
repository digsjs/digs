'use strict';

let rewire = require('rewire');
let Digs = rewire('../../../lib');
let CoAPServer = require('coap').createServer;
let Promise = require('bluebird');
let _ = require('lodash');

describe('Digs', function() {

  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create('Digs');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('constructor', function() {
    it('should be an DigsEmitter instance', function() {
      expect(new Digs()).to.be.instanceOf(CoAPServer);
    });

    it('should set default opts', function() {
      let d = new Digs();
      expect(d._opts).to.eql({
        autoDetectPlugins: false,
        namespace: 'digs',
        pluginOptions: {},
        project: 'home',
        port: 5683,
        address: null
      });
    });

    it('should create a domain', function() {
      let d = new Digs();
      expect(d._domain).to.be.instanceOf(require('domain').Domain);
    });

    it('should create an empty object for plugins', function() {
      let d = new Digs();
      expect(d._unloadedPlugins).to.eql({});
    });

    it('should create a new DepGraph for plugins', function() {
      let d = new Digs();
      expect(d._graph).to.be.instanceOf(require('dependency-graph').DepGraph);
    });

    it('should create a placeholder for the "ready" promise', function() {
      let d = new Digs();
      expect(d._ready).to.be.null;
    });
  });

  describe('prototype', function() {
    let d;

    beforeEach(function() {
      d = new Digs();
    });

    describe('public', function() {
      describe('start()', function() {

        beforeEach(function() {
          sandbox.stub(d, '_listen').returns(Promise.resolve());
        });

        it('should autodetect external plugins', function() {
          d._opts.autoDetectPlugins = true;
          sandbox.stub(d, '_detect');
          return d.start()
            .then(function() {
              expect(d._detect).to.have.been.calledOnce;
            });
        });

        it('should load external plugins', function() {
          sandbox.stub(d, '_loadPlugins').returns(Promise.resolve([]));
          return d.start()
            .then(function() {
              expect(d._loadPlugins).to.have.been.calledOnce;
            });
        });
      });

      describe('use()', function() {

        function foo() {
        }

        foo.metadata = {
          name: 'foo'
        };
        function bar() {
        }

        bar.metadata = {
          name: 'bar',
          dependencies: 'foo'
        };

        beforeEach(function() {
          sandbox.stub(d._graph, 'addNode');
          sandbox.stub(d._graph, 'addDependency');
        });

        it('should call itself recursively if passed an array', function() {
          sandbox.spy(d, 'use');
          d.use([
            foo,
            bar
          ]);
          expect(d.use).to.have.been.calledThrice;
        });

        it('should use global opts if passed an array', function() {
          sandbox.spy(d, 'use');
          let opts = d._opts.pluginOptions;
          opts.foo = 'bar';
          opts.bar = 'baz';
          d.use([
            foo,
            bar
          ]);
          expect(d.use).to.have.been.calledWithExactly([foo, bar]);
          expect(d.use).to.have.been.calledWithExactly(foo, opts.foo);
          expect(d.use).to.have.been.calledWithExactly(bar, opts.bar);
        });

        it('should throw if name collision', function() {
          d.foo = 'bar';
          expect(function() {
            d.use(foo);
          }).to.throw;
        });

        it('should add the plugin to the unloaded plugins list', function() {
          d.use(foo);
          expect(d._unloadedPlugins.foo).to.eql({
            func: foo,
            opts: {}
          });
        });

        it('should add a graph node for each plugin', function() {
          d.use([foo, bar]);
          expect(d._graph.addNode).to.have.been.calledWithExactly('foo');
          expect(d._graph.addNode).to.have.been.calledWithExactly('bar');
        });

        it('should add a dependency if dependencies present', function() {
          d.use([foo, bar]);
          expect(d._graph.addDependency).to.have.been.calledWithExactly('bar',
            'foo');
        });
      });

      describe('pluginError()', function() {

        let expectation;

        function expectError(error) {
          expectation = sandbox.spy(function expectation(err) {
            expect(String(err)).to.equal(error);
          });

          d.on('error', expectation);
          return function() {
            d.removeListener('error', expectation);
          };
        }

        it('should emit "error" if called with a string', function() {
          let msg = 'foo';
          let restore = expectError(msg);
          d.pluginError(msg);
          restore();
          expect(expectation).to.have.been.calledWithExactly(msg);
        });

        it('should emit "error" if called with an Error', function() {
          let msg = 'foo';
          let restore = expectError(`Error: ${msg}`);
          let err = new Error(msg);
          d.pluginError(err);
          expect(expectation).to.have.been.calledWithExactly(err);
          restore();
        });

      });

      describe('properties', function() {

        describe('isReady', function() {

          it('should return false if not ready', function() {
            expect(d.isReady).to.be.false;
          });

          it('should return true if ready', function() {
            d._ready = Promise.resolve();
            expect(d.isReady).to.be.true;
          });
        });

        describe('id', function() {
          it('should return the id (project)', function() {
            expect(d.id).to.equal('home');
          });
        });

        describe('project', function() {
          it('should return the project', function() {
            expect(d.id).to.equal('home');
          });
        });

        describe('namespace', function() {
          it('should return the namespace', function() {
            expect(d.namespace).to.equal('digs');
          });
        });

      });
    });

    describe('private', function() {
      describe('_loadPlugins()', function() {
        let unloadedPlugins;
        let loadedPlugins;
        let Plugins = require('../../../lib/plugins');
        let EventEmitter = require('events').EventEmitter;

        beforeEach(function() {
          function pluginFunc() {
          }

          pluginFunc.metadata = {};
          unloadedPlugins = {
            foo: {
              func: pluginFunc,
              opts: {}
            }
          };
          loadedPlugins = _.map(unloadedPlugins, function(plugin, name) {
            return {
              name: name,
              instance: {},
              metadata: pluginFunc.metadata,
              domain: new EventEmitter()
            };
          });
          d._unloadedPlugins = unloadedPlugins;
          sandbox.stub(Plugins, 'load')
            .returns(Promise.resolve(loadedPlugins));
        });

        it('should load the unloaded plugins', function() {
          return expect(d._loadPlugins()).to.eventually.eql(loadedPlugins);
        });

        it('should zap the unloaded plugin map', function() {
          return d._loadPlugins()
            .then(function() {
              expect(d._unloadedPlugins).to.eql({});
            });
        });

        it('should publish its name on digs itself', function() {
          return d._loadPlugins()
            .then(function() {
              expect(d.foo).to.equal(_.first(loadedPlugins).instance);
            });
        });

        it('should complain on collision error', function() {
          d.foo = 'bar';
          sandbox.spy(d, 'collisionError');
          return expect(d._loadPlugins()).to.be
            .rejectedWith(`Error: ${d}: Conflicting plugin name(s): "foo"`)
            .then(function() {
              expect(d.collisionError).to.have.been.calledOnce;
            });
        });
      });

      describe('_detect()', function() {

        let context;
        let Plugins;
        let res;

        beforeEach(function() {
          sandbox.stub(d, 'use').returns(Promise.resolve());
          res = [
            {
              metadata: {
                name: 'bar'
              }
            }
          ];
          Plugins = {
            autoDetect: sandbox.stub().returns(Promise.resolve(res))
          };

          context = Digs.__with__({ Plugins: Plugins });
        });

        it('should call Plugins.autoDetect()', function() {
          return expect(context(function() {
            return d._detect();
          })).to.eventually.eql(res)
            .then(function() {
              expect(Plugins.autoDetect).to.have.been.calledOnce;
            });
        });

        it('should call use()', function() {
          return expect(context(function() {
            return d._detect();
          })).to.eventually.eql(res)
            .then(function() {
              expect(d.use).to.have.been.calledOnce;
            });
        });
      });
    });
  });
});

