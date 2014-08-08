var debug = require('debug')("oa-graph");
var uuid = require('node-uuid');
var Promise = require('bluebird');
var jsonld = require('jsonld').promises();
var _ = require('lodash');
var Map = require('es6-map');

var lib = require('./lib');

function Graph (options) {
  debug("constructor", options);

  this.db = Promise.promisifyAll(options.db);
  this.db.jsonld = Promise.promisifyAll(this.db.jsonld);

  this.id = options.id;

  if (options.types) {
    this.types = options.types;
  } else {
    this.types = require('oa-types')();
  }

  if (typeof options.type === 'string') {
    this.type = this.types.get(options.type);
  } else {
    this.type = this.types.use(options.type);
  }

  if (options.graphs) {
    this.graphs = options.graphs;
    this.graphs.set(this.type.id, this);
  }

  this.queryize = Promise.promisify(lib.queryize(this.db));
}

Graph.prototype.find = function (params) {
  debug("find input", params);

  params = params || {};
  params.query = params.query || {};

  params.query['@context'] = this.type.context();
  params.query['@type'] = params.query['@type'] || this.type.id;

  return this.queryize(params.query)
  .bind(this)
  .then(function (query) {
    debug("find query", query);
    return this.db.searchAsync(query);
  })
  .map(function (result) {
    return this.get(result['@id'], {
      exclude: params.exclude,
      include: params.include,
    });
  })
  .then(function (results) {
    debug("find output", results);
    return results;
  })
  ;
};

// TODO params can specify properties to not return
Graph.prototype.get = function (data, params) {
  debug("get input", data, params);
  data = lib.normalize(data);
  params = params || {};
  params.include = params.include || [];
  params.exclude = params.exclude || [];

  // get context of type
  var context = this.type.context();

  debug(".get(", data['@id'], context, ")");

  return this.db.jsonld
  .getAsync(data['@id'], context)
  .bind(this)
  .then(function (result) {
    // TODO why is result an array?
    if (_.isArray(result)) {
      result = result[0];
    }
    // exclude any given properties from result
    result = _.omit(result, params.exclude);
    // include relations
    var relations = _.pick(this.type.relations, params.include);
    // for any not included relations, change id to { '@id': ... }
    _.each(result, function (value, name) {
      if (_.contains(_.keys(this.type.relations), name) &&
          !_.contains(params.include, name)) {
        result[name] = { '@id': result[name] };
      }
    }.bind(this));
    // for each included relation, get promise of relation
    _.each(relations, function (schema, name) {
      result[name] = this.relation(result['@id'], name, schema);
    }.bind(this));
    // exclude any given properties
    result = _.omit(result, params.exclude);
    // fulfill promises
    return Promise.props(result);
  })
  .then(function (result) {
    debug("get output", result)
    return result;
  })
  ;
};

Graph.prototype.create = function (data, params) {
  debug("create input", data, params);

  data = lib.normalize(data);
  data = lib.ensureType(data, this.type.id);
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
  data = lib.ensureType(data, this.type.id);
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

Graph.prototype.relation = function (id, property, schema) {
  debug("relation", id, property, schema);
  
  if (schema.reverse) {

    var query = {};
    query[schema.reverse] = id;

    debug("relation query", query);

    return this.graphs.get(schema.$ref).find({
      query: query,
    })
    ;
  }
}

Graph.isGraph = require('./isGraph');

module.exports = Graph;
