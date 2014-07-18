var debug = require('debug')("oa-graph");
var uuid = require('node-uuid');
var Promise = require('bluebird');
var jsonld = require('jsonld').promises();

var lib = require('./lib');

var normalize = function (data) {
  // if string, it must be id
  if (typeof data === 'string') {
    data = { '@id': data };
  }
  return data;
}

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

  if (typeof this.type === 'string') {
    this.type = this.types.get(this.type);
  } else {
    this.types.set(options.type);
    this.type = this.types.get(options.type.name);
  }
}

Graph.prototype.find = function (params) {
  debug("find", params);
  return this.db.searchAsync({
    subject: "",
  })
  .bind(this)
  .map(function (result) {
    return this.data(result);
  })
  .then(function (results) {
    debug("find output", results)
    return results;
  })
  ;
};

Graph.prototype.get = function (data, params) {
  data = normalize(data);
  debug("get input", data, params);

  return this.db.jsonld
  .getAsync(data['@id'], this.type.context())
  .then(function (result) {
    debug("get output", result)
    return result;
  })
  ;
};

Graph.prototype.create = function (data, params) {
  data = normalize(data);
  data = lib.ensureType(data, this.type.name);
  debug("create", data, params);

  // TODO recurse into memberships

  return this.db.jsonld
  .putAsync(data)
  .then(function (result) {
    debug("create output", result)
    return result;
  })
  ;
};

Graph.prototype.update = function (data, params) {
  data = normalize(data);
  data = lib.ensureType(data, this.type.name);
  debug("update input", data, params);

  // TODO recurse into memberships

  return this.db.jsonld
  .putAsync(data)
  .then(function (result) {
    debug("update output", result)
    return result;
  })
  ;
};

Graph.prototype.remove = function (data, params) {
  data = normalize(data);
  debug("remove", data, params);

  return this.db.jsonld
  .del(data['@id'])
  .return(null)
  ;
};

module.exports = Graph;
