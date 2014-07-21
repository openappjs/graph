var debug = require('debug')("oa-graph");
var uuid = require('node-uuid');
var Promise = require('bluebird');
var jsonld = require('jsonld').promises();
var _ = require('lodash');

var lib = require('./lib');

function Graph (options) {
  debug("constructor", options);

  this.db = Promise.promisifyAll(options.db);
  this.db.jsonld = Promise.promisifyAll(this.db.jsonld);

  this.name = options.name;

  if (this.types) {
    this.types = options.types;
  } else {
    this.types = require('oa-types')();
  }

  if (typeof options.type === 'string') {
    this.type = this.types.get(this.type);
  } else {
    this.type = this.types.use(options.type);
  }
}

Graph.prototype.find = function (params) {
  // TODO implement
  debug("find input", params);

  return this.db.searchAsync({
    subject: "",
  })
  .then(function (results) {
    debug("find output", results)
    return results;
  })
  ;
};

Graph.prototype.get = function (data, params) {
  debug("get input", data, params);

  data = lib.normalize(data);

  debug(".get(", data['@id'], this.type.context(), ")");

  return this.db.jsonld
  .getAsync(data['@id'], this.type.context())
  .then(function (result) {
    debug("get output", result)
    // TODO why is result an array?
    if (_.isArray(result)) {
      return result[0];
    }
    return result;
  })
  ;
};

Graph.prototype.create = function (data, params) {
  debug("create input", data, params);

  data = lib.normalize(data);
  data = lib.ensureType(data, this.type.name);
  data['@context'] = this.type.context();

  // TODO recurse into references so they
  // are not created as empty nodes

  debug(".put(", data, ")");
  
  return this.db.jsonld
  .putAsync(data)
  .then(function (result) {
    debug("create output", result)
    return result;
  })
  ;
};

Graph.prototype.update = function (data, params) {
  debug("update input", data, params);

  data = lib.normalize(data);
  data = lib.ensureType(data, this.type.name);
  data['@context'] = this.type.context();
  
  debug(".put(", data, ")");

  return this.db.jsonld
  .putAsync(data)
  .then(function (result) {
    debug("update output", result)
    return result;
  })
  ;
};

Graph.prototype.remove = function (data, params) {
  debug("remove input", data, params);

  data = lib.normalize(data);

  debug(".del(", data['@id'], ")");

  return this.db.jsonld
  .delAsync(data['@id'])
  .then(function () {
    debug("remove output", null)
    return null;
  })
  ;
};

Graph.isGraph = require('./isGraph');

module.exports = Graph;
