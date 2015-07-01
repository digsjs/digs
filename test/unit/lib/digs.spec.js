'use strict';

let Digs = require('../../../lib/digs');
let DigsEmitter = require('digs-common/digs-emitter');
let Promise = require('bluebird');
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
        namespace: 'home',
        pluginOptions: {},
        project: 'digs'
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

    it('should create a placeholder for an ascoltatore', function () {
      let d = new Digs();
      expect(d._ascoltatore).to.be.null;
    });

    it('should autostart if autoStart option passed', function () {
      sandbox.stub(Digs.prototype, 'start');
      let d = new Digs({ autoStart: true });
      expect(d.start).to.have.been.calledOnce;
    });
  });

  describe('start()', function () {

    it('should init the broker', function () {
      let d = new Digs();
      sandbox.stub(d, '_initBroker');
      return d.start()
        .then(function () {
          expect(d._initBroker).to.have.been.calledOnce;
        });
    });

    it('should autodetect external plugins', function () {
      let d = new Digs({ autoDetectPlugins: true });
      sandbox.stub(d, '_initBroker');
      sandbox.stub(d, '_detect');
      return d.start()
        .then(function () {
          expect(d._detect).to.have.been.calledOnce;
        });
    });

    it('should load external plugins', function () {
      let d = new Digs();
      sandbox.stub(d, '_initBroker');
      sandbox.stub(d, 'loadPlugins').returns(Promise.resolve([]));
      return d.start()
        .then(function () {
          expect(d.loadPlugins).to.have.been.calledOnce;
        });
    });
  });

  describe('_initBroker()', function () {

    let digsMqttBroker = require('digs-mqtt-broker');
    let d;
    let instance = {};

    beforeEach(function () {
      d = new Digs();
      sandbox.stub(d, 'use');
      sandbox.stub(d, 'loadPlugins')
        .returns(Promise.resolve([{ instance: instance }]));
    });

    it('should use the DigsMQTTBroker by default', function () {
      return expect(d._initBroker()).to.eventually.eql([
        {
          instance: instance
        }
      ])
        .then(function () {
          expect(d.use).to.have.been.calledWith(digsMqttBroker, {
            host: 'localhost',
            port: 1883
          });
          expect(d.loadPlugins).to.have.been.calledWith(d, d._graph,
            'digs-mqtt-broker');
        });
    });
  });

  describe('loadPlugins()', function () {
    let d;
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
      d = new Digs();
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
    let d;

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
      d = new Digs();
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
});
