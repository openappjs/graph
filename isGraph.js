module.exports = function (obj) {
  return !!(
    obj.id &&
    obj.db &&
    obj.types &&
    obj.type
  );
};
