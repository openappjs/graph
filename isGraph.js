module.exports = function (obj) {
  return !!(
    obj.name &&
    obj.db &&
    obj.types &&
    obj.type
  );
};
