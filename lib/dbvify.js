var debug = require('debug')('opengraph:dbvify');
var _ = require('lodash');

var dbvify = function (obj, db) {
  debug("obj")
  var keys = Object.keys(obj);

  _.each(keys, function (key, index) {
    debug("key", key, "index", index);

    if (obj[key].substring(0, 1) === '?') {
      var variable = obj[key].substring(1);
      obj[key] = db.v(variable)
    }
  });

  return obj;
};

module.exports = dbvify;
