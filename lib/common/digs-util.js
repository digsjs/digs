'use strict';

let _ = require('lodash'),
  Joi = require('joi'),
  ass = require('assert'), // this is not a political statement.
  errors = require('./errors');

let InvalidParameterError = errors.InvalidParameterError,
  debug = require('debug')('digs:common:digs-util');

let digsUtil = {
  validate: function validate(value, schema) {
    if (arguments.length < 2) {
      throw new InvalidParameterError();
    }
    return Joi.validate(value, schema);
  },
  validateParams: function validateParams(args, schemata) {

    let retval = {
      errors: null,
      values: null
    };

    function compile(result, label) {
      if (result.error) {
        retval.errors = retval.errors || {};
        retval.errors[label] = result.error;
      }
      if (result.value) {
        retval.values = retval.values || {};
        retval.values[label] = result.value;
      }
    }

    if (arguments.length < 2) {
      throw new InvalidParameterError();
    }

    args = _.toArray(args);
    if (_.isFunction(schemata)) {
      if (schemata.schema) {
        schemata = [].concat(schemata.schema);
      } else {
        schemata = schemata.schemata;
      }
    }
    if (!schemata) {
      throw new InvalidParameterError();
    }

    debug('<validateParams>: validating args: %j', args);

    _.each(args, function (arg, pos) {
      let schema = schemata[pos];
      if (schema) {
        let desc = Joi.describe(schema),
          label = desc.label;
        if (label) {
          return compile(digsUtil.validate(arg, schema), label);
        }
        compile(digsUtil.validate(arg, schema), pos);
      }
    });

    return retval;
  },

  assertParams: function assertParams() {
    let retval = digsUtil.validateParams.apply(null, arguments);
    if (retval.errors) {
      let msg = _.toArray(retval.errors).join('\n');
      throw new InvalidParameterError(msg);
    }
    return retval.values;
  },

  assert: function assert() {
    if (arguments.length > 1) {
      let retval = digsUtil.validate.apply(null, arguments);
      ass(retval.error === null);
      return retval.value;
    }
    ass(arguments[0]);
  }
};

module.exports = digsUtil;
