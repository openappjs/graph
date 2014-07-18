var _ = require('lodash');

module.exports = function (obj, type) {
  
  if (!obj['@type']) {

    obj['@type'] = type;
  }
  else if (_.isString(obj['@type']) &&
  obj['@type'] !== type) {
    
    obj['@type'] = [obj['@type'], type];
  }
  else if (_.isArray(obj['@type']) &&
  !_.contains(obj['@type'], type)) {

    obj['@type'].push(type);
  }

  return obj;
};
