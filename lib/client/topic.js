'use strict';

let Joi = require('joi');
let digsUtil = require('digs-common/digs-util');
let _ = require('lodash');

const REQUEST_DELIMITER = '~';
const REQUEST_ID_PREFIX = 'req-';
const TOPIC_DELIMITER = '/';
const TOPIC_ID_PREFIX = 'topic-';
const DEFAULT_PROJECT = 'default';

let requestRegex =
  new RegExp(`${REQUEST_DELIMITER}(${REQUEST_ID_PREFIX}\\d+)$`);
let debug = require('debug')('digs-client:topic');

class Topic {

  /**
   * Generates a string representation of this topic for use later, if possible.
   * @param {string} path Fully-qualified topic or fragment
   * @param {Object} opts Options
   */
  constructor(path, opts) {
    let params = digsUtil.assertParams(arguments, Topic);
    path = params.path;
    opts = params.opts;

    _.extend(this, path && Topic.decompose(path), opts, {
      path: path
    });
    this._repr = Topic.repr(this);

    this._stats = {
      received: 0,
      published: 0
    };

    this.id = _.uniqueId(TOPIC_ID_PREFIX);
    debug(`${this._instanceId}: Instantiated topic "${this._repr}"`);
  }

  get stats() {
    return this._stats;
  }

  get _instanceId() {
    return `<${this.constructor.name}:${this.id}>`;
  }

  get event() {
    return Topic.event(this);
  }

  get response() {
    if (this.request) {
      return Topic.response(this);
    }
  }

  toString() {
    return this._repr;
  }

  update(obj) {
    _.extend(this, obj);
    this._repr = Topic.repr(this);
    return this;
  }

  static repr(opts) {
    let topic = _.compact([
      opts.namespace,
      opts.project,
      opts.clientId,
      opts.path,
      opts.wildcard
    ])
      .join(TOPIC_DELIMITER);

    if (opts.request) {
      topic = [topic, opts.reqId].join(REQUEST_DELIMITER);
    }

    return topic;
  }

  static event(topic) {
    let str = topic instanceof Topic ? topic.path : topic;
    return `topic:${str}`;
  }

  static response(topic) {
    let str = topic instanceof Topic ? topic.path : topic;
    return `response:${str}`;
  }

  static getRequestId(repr) {
    if (repr instanceof Topic) {
      return repr.reqId;
    }
    let groups;
    if ((groups = repr.match(requestRegex))) {
      return groups[1];
    }
  }

  static getWildcard(repr) {
    if (repr instanceof Topic) {
      return repr.wildcard;
    }
    let lastChar = repr.charAt(repr.length - 1);
    if (lastChar === '#' || lastChar === '+') {
      return lastChar;
    }
  }

  static isWild(repr) {
    return !!Topic.getWildcard(repr);
  }

  static isRequest(repr) {
    return !!Topic.getRequestId(repr);
  }

  static decompose(repr) {
    let params;
    try {
      params = digsUtil.assertParams(arguments, Topic.decompose);
    }
    catch (e) {
      return null;
    }

    repr = params.repr;

    let paths = repr.split(TOPIC_DELIMITER);
    let path = paths[3];
    let wildcard = Topic.getWildcard(repr);
    let reqId = Topic.getRequestId(repr);

    if (wildcard) {
      path = path.substring(0, path.length - 2) + TOPIC_DELIMITER;
    }
    if (reqId) {
      let lastPath = path.split(REQUEST_DELIMITER);
      if (lastPath.length > 1) {
        path = lastPath[0];
      }
      else {
        path = path.substring(0, _.lastIndexOf(REQUEST_DELIMITER));
      }
    }
    return new Topic(path, _.object([
      'namespace',
      'project',
      'clientId',
      'reqId',
      'wildcard',
      'request'
    ], paths.slice(0, 3).concat(reqId, wildcard, !!reqId)));
  }
}

Topic.schemata = [
  Joi.string()
    .regex(/^[^$\/][^\s]+$/, 'valid topic path name')
    .empty('')
    .description('An MQTT topic path')
    .label('path')
    .tags(['mqtt', 'topic']),
  Joi.object()
    .keys({
      namespace: Joi.string()
        .token()
        .default('digs')
        .description('Topic namespace')
        .label('opts.namespace')
        .tags(['mqtt', 'topic']),
      project: Joi.string()
        .token()
        .allow(null)
        .description('Topic project')
        .default(DEFAULT_PROJECT)
        .label('opts.project')
        .tags(['mqtt', 'topic']),
      clientId: Joi.string()
        .description('MQTT client ID')
        .label('opts.clientId')
        .tags(['mqtt', 'id']),
      id: Joi.string()
        .default(function () {
          return _.uniqueId(TOPIC_ID_PREFIX);
        }, 'Generated Topic ID')
        .label('opts.id')
        .description('ID of this Topic')
        .tags(['mqtt', 'id', 'topic']),
      wildcard: Joi.string()
        .regex(/^[#+]$/, 'valid wildcard')
        .description('MQTT wildcard (+ or #)')
        .label('opts.wildcard')
        .tags(['mqtt', 'wildcard']),
      request: Joi.boolean()
        .default(false)
        .description('Create a Digs Request; wait for a Digs Response in ' +
        'the queue')
        .label('opts.request')
        .tags(['mqtt', 'request']),
      reqId: Joi.when('request', {
        is: true,
        then: Joi.string()
          .default(function () {
            return _.uniqueId(REQUEST_ID_PREFIX);
          }, 'Generated Request ID')
      })
        .description('Digs Request identifier')
        .label('opts.reqId')
        .tags(['mqtt', 'id'])
    })
    .nand('wildcard', 'reqId')
    .description('Topic options')
    .tags(['mqtt', 'topic', 'options'])
    .label('opts')
];

Topic.decompose.schema = Joi.string()
  // TODO this depends on default topic delimiter and request delimiter
  .regex(/^([^\/]+?\/){2}(([^\/]+?)\/?)+([#+]|~.+)?$/, 'fully-qualified topic')
  .description('Fully-qualified MQTT topic')
  .tags(['mqtt', 'topic'])
  .label('repr');

module.exports = Topic;
