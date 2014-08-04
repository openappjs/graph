var jsonld = require('jsonld');

var RDFTYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
var RDFLANGSTRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
var XSDTYPE = 'http://www.w3.org/2001/XMLSchema#';

module.exports = function (db) {
  return function (params, callback) {
    return jsonld.toRDF(params, db.jsonld.options, function (err, triples) {
      if (err) { throw err; }
      var result = triples['@default'].map(function (triple) {
        return ['subject', 'predicate', 'object'].reduce(function(acc, key) {
          var node = triple[key];
          // uses type field set to 'blank node' by jsonld.js toRDF()
          if (node.type === 'blank node') {
            node.value = db.v('@id');
          }
          // preserve object data types using double quotation for literals
          // and don't keep data type for strings without defined language
          if(key === 'object' && triple.object.datatype){
            if(triple.object.datatype.match(XSDTYPE)){
              if(triple.object.datatype === 'http://www.w3.org/2001/XMLSchema#string'){
                node.value = '"' + triple.object.value + '"';
              } else {
                node.value = '"' + triple.object.value + '"^^<' + triple.object.datatype + '>';
              }
            } else if(triple.object.datatype.match(RDFLANGSTRING)){
              node.value = '"' + triple.object.value + '"@' + triple.object.language;
            }
          }
          acc[key] = node.value;
          return acc;
        }, {});
      });
      callback(null, result);
    });
  };
};
