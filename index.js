var uuid = require('node-uuid');
var Proto = require('uberproto');
var MoSQL = require('mongo-sql');
var OpenData = require('opendata');

var normalize = function (Data, data) {
  // if string, it must be id
  if (typeof data === 'string') {
    data = { id: data };
  }
  // OpenData-ify if not already
  if (!data.__OpenData) {
    data = Data(data);
  }
  return data
}

var Store = Proto.extend({

  init: function (options) {
    this.knex = options.knex;
    this.tableName = options.tableName;
    this.schema = options.schema;
    this.jjv = options.jjv;
    this.opendata = OpenData(this.jjv);
    this.Data = this.opendata(this.schema);
  },

  find: function (params) {
    return this.knex(this.tableName)
    .bind(this)
    .map(function (result) {
      return this.Data(result);
    })
    ;
  },

  get: function (data, params) {
    data = normalize(this.Data, data);

    return this.knex(this.tableName)
    .where('id', data.id)
    .limit(1)
    .bind(this)
    .then(function (results) {
      if (results.length === 0) {
        return null;
      }
      return this.Data(results[0]);
    })
    ;
  },

  create: function (data, params) {
    data = normalize(this.Data, data);

    if (!data.id) {
      data.id = uuid();
    }

    return this.knex(this.tableName)
    .insert(data.toJSON())
    .return(data)
    ;
  },

  update: function (data, params) {
    data = normalize(this.Data, data);

    // TODO recurse into memberships

    console.log(data);

    return this.knex(this.tableName)
    .where('id', data.id)
    .update(data.toJSON())
    .return(data)
    ;
  },

  remove: function (data, params) {
    data = normalize(this.Data, data);

    return this.knex(this.tableName)
    .where('id', data.id)
    .del()
    .return(null)
    ;
  },
});

module.exports = function () {
  return Proto.create.apply(Store, arguments);
};

module.exports.Store = Store;
