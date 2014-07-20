var _ = require('lodash');

module.exports = function (data) {
  // if string, it must be id
  if (typeof data === 'string') {
    data = { '@id': data };
  } else {
    data = _.clone(data);
  }
  return data;
}
