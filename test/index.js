var env = process.env.NODE_ENV || 'test';

var expect = require('chai').expect;
var deleteStream = require('level-delete-stream');

describe("#Graph", function () {
  var leveldb, db;
  var Graph;
  var People, Resources;

  before(function () {
    var level = require('level-test')();
    leveldb = level(env+'.db');
    db = require('levelgraph-jsonld')(
      require('levelgraph')(leveldb)
    , {
      base: "http://open.app/",
    });

    Graph = require('../');

    var types = require('oa-types')();
    var PersonType = types.use({
      id: "Person",
      type: 'object',
      prefixes: {
        "": "http://open.vocab/",
      },
      properties: {
        name: {
          context: "name",
          type: "string",
        },
        resources: {
          context: "hasResource",
          reverse: "owner",
          $ref: "Resource",
        },
      },
    });
    var ResourceType = types.use({
      id: "Resource",
      type: 'object',
      prefixes: {
        "": "http://open.vocab/",
      },
      properties: {
        name: {
          context: "name",
          type: "string",
        },
        owner: {
          context: "isOwner",
          $ref: "Person",
        },
      },
    });
    People = new Graph({
      id: "People",
      db: db,
      type: PersonType,
    });
    Resources = new Graph({
      id: "Resources",
      db: db,
      type: ResourceType,
    });
  });

  beforeEach(function (done) {
    return leveldb.createKeyStream()
    .pipe(deleteStream(leveldb, done))
  });

  describe("Graph.isGraph()", function () {

    it("of simple graph should be true", function () {
      var graph = new Graph({
        id: "Things",
        db: db,
        type: {
          id: "Thing",
          type: 'object',
          properties: {
            description: {
              type: 'string',
            },
          },
        },
      });
      expect(Graph.isGraph(graph)).to.be.true;
    });
  });

  describe("find", function () {
    it("should find based on simple query", function () {
      return People.create({
        name: "Mikey",
      })
      .then(function (person) {
        return People.find({
          name: "Mikey",
        });
      })
      .then(function (results) {
        expect(Array.isArray(results)).to.be.true;
        expect(results).to.have.length(1);
        expect(results[0]).to.have.property('@type', "Person");
        expect(results[0]).to.have.property('name', "Mikey");
      })
      ;
    });

    it("should implicitly add type to simple query", function () {
      return Resources.create({
        name: "Mikey",
      })
      .then(function () {
        return People.create({
          name: "Mikey",
        })
      })
      .then(function (person) {
        return People.find({
          name: "Mikey",
        });
      })
      .then(function (results) {
        expect(Array.isArray(results)).to.be.true;
        expect(results).to.have.length(1);
        expect(results[0]).to.have.property('@type', "Person");
        expect(results[0]).to.have.property('name', "Mikey");
      })
      ;
    });
  });


  describe("relations", function () {

    it("should have hasMany <> belongsTo relation", function () {

      var id;

      // create person
      return People.create({
        name: "Mikey",
      })
      .then(function (person) {
        // save person id
        id = person['@id'];
        // create resource with person as owner
        return Resources.create({
          name: "RepRap Prusa Mendel",
          owner: id,
        });
      })
      .then(function (resource) {
        // get person again
        return People.get(id);
      })
      .then(function (person) {
        expect(person).to.have.property('resources');
        expect(Array.isArray(person.resources)).to.be.true;
        expect(person.resources).to.have.length(1);
        expect(person.resources[0]).to.have.property('@id');
        expect(person.resources[0]).to.have.property('name', "RepRap Prusa Mendel");
        expect(person.resources[0].owner).to.deep.equal({ '@id': id });
      });
    });
  });
});
