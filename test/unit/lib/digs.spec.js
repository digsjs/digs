'use strict';

let rewire = require('rewire');
let Digs = rewire('../../../lib/digs');
let DigsEmitter = require('digs-common/digs-emitter');
let Promise = require('bluebird');
let path = require('path');
let _ = require('lodash');

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

    it('should set default opts', function () {
      let d = new Digs();
      expect(d._opts).to.eql({
        autoDetectPlugins: false,
        autoStart: false,
        broker: {
          json: false,
          type: 'digs-mqtt-broker',
          url: 'mqtt://localhost:1883'
        },
        namespace: 'digs',
        pluginOptions: {},
        project: 'home'
      });
    });

    it('should create a domain', function () {
      let d = new Digs();
      expect(d._domain).to.be.instanceOf(require('domain').Domain);
    });

    it('should create an empty object for plugins', function () {
      let d = new Digs();
      expect(d._unloadedPlugins).to.eql({});
    });

    it('should create a new DepGraph for plugins', function () {
      let d = new Digs();
      expect(d._graph).to.be.instanceOf(require('dependency-graph').DepGraph);
    });

    it('should create a placeholder for the internal broker', function () {
      let d = new Digs();
      expect(d._broker).to.be.null;
    });

    it('should create a placeholder for a client', function () {
      let d = new Digs();
      expect(d._client).to.be.null;
    });

    it('should autostart if autoStart option passed', function () {
      sandbox.stub(Digs.prototype, 'start');
      let d = new Digs({ autoStart: true });
      expect(d.start).to.have.been.calledOnce;
    });

    it('should create a placeholder for the "ready" promise', function () {
      let d = new Digs();
      expect(d._ready).to.be.null;
    });
  });

  describe('prototype', function () {
    let d;

    beforeEach(function () {
      d = new Digs();
    });

    describe('public', function () {
      describe('start()', function () {

        it('should init the broker', function () {
          sandbox.stub(d, '_initInternalBroker');
          return d.start()
            .then(function () {
              expect(d._initInternalBroker).to.have.been.calledOnce;
            });
        });

        it('should autodetect external plugins', function () {
          d._opts.autoDetectPlugins = true;
          sandbox.stub(d, '_initInternalBroker');
          sandbox.stub(d, '_detect');
          return d.start()
            .then(function () {
              expect(d._detect).to.have.been.calledOnce;
            });
        });

        it('should load external plugins', function () {
          sandbox.stub(d, '_initInternalBroker');
          sandbox.stub(d, 'loadPlugins').returns(Promise.resolve([]));
          return d.start()
            .then(function () {
              expect(d.loadPlugins).to.have.been.calledOnce;
            });
        });
      });
      describe('loadPlugins()', function () {
        let unloadedPlugins;
        let loadedPlugins;
        let Plugins = require('../../../lib/plugins');
        let EventEmitter = require('events').EventEmitter;

        beforeEach(function () {
          function pluginFunc() {
          }

          pluginFunc.metadata = {};
          unloadedPlugins = {
            foo: {
              func: pluginFunc,
              opts: {}
            }
          };
          loadedPlugins = _.map(unloadedPlugins, function (plugin, name) {
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

        it('should load the unloaded plugins', function () {
          return expect(d.loadPlugins()).to.eventually.eql(loadedPlugins);
        });

        it('should zap the unloaded plugin map', function () {
          return d.loadPlugins()
            .then(function () {
              expect(d._unloadedPlugins).to.eql({});
            });
        });

        it('should publish its name on digs itself', function () {
          return d.loadPlugins()
            .then(function () {
              expect(d.foo).to.equal(_.first(loadedPlugins).instance);
            });
        });

        it('should complain on collision error', function () {
          d.foo = 'bar';
          sandbox.spy(d, 'collisionError');
          return expect(d.loadPlugins()).to.be
            .rejectedWith(`Error: ${d}: Conflicting plugin name(s): "foo"`)
            .then(function () {
              expect(d.collisionError).to.have.been.calledOnce;
            });
        });
      });
      describe('use()', function () {

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

        beforeEach(function () {
          sandbox.stub(d._graph, 'addNode');
          sandbox.stub(d._graph, 'addDependency');
        });

        it('should call itself recursively if passed an array', function () {
          sandbox.spy(d, 'use');
          d.use([
            foo,
            bar
          ]);
          expect(d.use).to.have.been.calledThrice;
        });

        it('should use global opts if passed an array', function () {
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

        it('should throw if name collision', function () {
          d.foo = 'bar';
          expect(function () {
            d.use(foo);
          }).to.throw;
        });

        it('should add the plugin to the unloaded plugins list', function () {
          d.use(foo);
          expect(d._unloadedPlugins.foo).to.eql({
            func: foo,
            opts: {}
          });
        });

        it('should add a graph node for each plugin', function () {
          d.use([foo, bar]);
          expect(d._graph.addNode).to.have.been.calledWithExactly('foo');
          expect(d._graph.addNode).to.have.been.calledWithExactly('bar');
        });

        it('should add a dependency if dependencies present', function () {
          d.use([foo, bar]);
          expect(d._graph.addDependency).to.have.been.calledWithExactly('bar',
            'foo');
        });
      });
      describe('pluginError()', function () {

        let expectation;

        function expectError(error) {
          expectation = sandbox.spy(function expectation(err) {
            expect(String(err)).to.equal(error);
          });

          d.on('error', expectation);
          return function () {
            d.removeListener('error', expectation);
          };
        }

        it('should emit "error" if called with a string', function () {
          let msg = 'foo';
          let restore = expectError(msg);
          d.pluginError(msg);
          restore();
          expect(expectation).to.have.been.calledWithExactly(msg);
        });

        it('should emit "error" if called with an Error', function () {
          let msg = 'foo';
          let restore = expectError(`Error: ${msg}`);
          let err = new Error(msg);
          d.pluginError(err);
          expect(expectation).to.have.been.calledWithExactly(err);
          restore();
        });

      });
      describe('properties', function () {

        describe('isReady', function () {

          it('should return false if not ready', function () {
            expect(d.isReady).to.be.false;
          });

          it('should return true if ready', function () {
            d._ready = Promise.resolve();
            expect(d.isReady).to.be.true;
          });
        });

        describe('id', function () {
          it('should return the id (project)', function () {
            expect(d.id).to.equal('home');
          });
        });

        describe('project', function () {
          it('should return the project', function () {
            expect(d.id).to.equal('home');
          });
        });

        describe('namespace', function () {
          it('should return the namespace', function () {
            expect(d.namespace).to.equal('digs');
          });
        });

      });
    });

    describe('private', function () {
      describe('_initInternalBroker()', function () {

        let digsMqttBroker = require('digs-mqtt-broker');
        let instance = {};

        beforeEach(function () {
          sandbox.stub(d, 'use');
          sandbox.stub(d, 'loadPlugins')
            .returns(Promise.resolve([{ instance: instance }]));
        });

        it('should use the DigsMQTTBroker by default', function () {
          return expect(d._initInternalBroker()).to.eventually.eql([
            {
              instance: instance
            }
          ])
            .then(function () {
              expect(d.use).to.have.been.calledWith(digsMqttBroker, {
                host: 'localhost',
                port: 1883
              });
              expect(d.loadPlugins).to.have.been.calledWith('digs-mqtt-broker');
            });
        });
      });
      describe('_detect()', function () {

        let context;
        let Plugins;

        beforeEach(function () {
          sandbox.stub(d, 'use').returns(Promise.resolve('foo'));

          Plugins = {
            autoDetect: sandbox.stub().returns(Promise.resolve('bar'))
          };

          context = Digs.__with__({ Plugins: Plugins });
        });

        it('should call Plugins.autoDetect()', function () {
          return expect(context(function () {
            return d._detect();
          })).to.eventually.equal('foo')
            .then(function () {
              expect(Plugins.autoDetect).to.have.been
                .calledWithExactly(path.join(__dirname,
                  '..',
                  '..',
                  '..',
                  '..'));
            });
        });

        it('should call use()', function () {
          return expect(context(function () {
            return d._detect();
          })).to.eventually.equal('foo')
            .then(function () {
              expect(d.use).to.have.been.calledWithExactly('bar');
            });
        });
      });
    });


  });

});

