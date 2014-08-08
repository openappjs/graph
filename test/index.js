var env = process.env.NODE_ENV || 'test';

var expect = require('chai').expect;
var deleteStream = require('level-delete-stream');
var Map = require('es6-map');

describe("#Graph", function () {
  var leveldb, db;
  var Graph;
  var People, Resources, Groups, Memberships;

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
        "vocab": "http://open.vocab/",
      },
      context: "vocab:Person",
      properties: {
        name: {
          context: "vocab:name",
          type: "string",
        },
        bio: {
          context: "vocab:bio",
          type: "string",
        },
        resources: {
          context: "vocab:hasResource",
          reverse: "owner",
          $ref: "Resource",
        },
        memberships: {
          context: "vocab:hasMembership",
          reverse: "member",
          $ref: "Membership",
        },
      },
    });
    var ResourceType = types.use({
      id: "Resource",
      type: 'object',
      prefixes: {
        "vocab": "http://open.vocab/",
      },
      context: "vocab:Resource",
      properties: {
        name: {
          context: "vocab:name",
          type: "string",
        },
        owner: {
          context: "vocab:isOwner",
          $ref: "Person",
        },
      },
    });
    var GroupType = types.use({
      id: "Group",
      type: 'object',
      prefixes: {
        "vocab": "http://open.vocab/",
      },
      context: "vocab:Group",
      properties: {
        name: {
          context: "vocab:name",
          type: "string",
        },
        memberships: {
          context: "vocab:hasMembership",
          $ref: "Membership",
        },
      },
    });
    var MembershipType = types.use({
      id: "Membership",
      type: 'object',
      prefixes: {
        "vocab": "http://open.vocab/",
      },
      context: "vocab:Memberships",
      properties: {
        group: {
          context: "vocab:organization",
          $ref: "Group",
        },
        member: {
          context: "vocab:member",
          oneOf: [{
            $ref: "Person",
          }, {
            $ref: "Group",
          }],
        },
      },
    });
    var graphs = new Map();
    People = new Graph({
      id: "People",
      db: db,
      type: PersonType,
      graphs: graphs,
    });
    Resources = new Graph({
      id: "Resources",
      db: db,
      type: ResourceType,
      graphs: graphs,
    });
    Groups = new Graph({
      id: "Groups",
      db: db,
      type: GroupType,
      graphs: graphs,
    });
    Memberships = new Graph({
      id: "Memberships",
      db: db,
      type: MembershipType,
      graphs: graphs,
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

  describe("get", function () {
    var fixture = {
      name: "Mikey",
      bio: "a human from planet earth."
    };
    var id;

    beforeEach(function () {
      return People.create(fixture)
      .then(function (result) {
        id = result['@id'];
      })
      ;
    });

    it("should get with no params", function () {
      return People.get(id)
      .then(function (result) {
        expect(Object.keys(result)).to.have.length(6);
        expect(result).to.have.property('@context');
        expect(result).to.have.property('@id');
        expect(result).to.have.property('@type', "Person");
        expect(result).to.have.property('name', fixture.name);
        expect(result).to.have.property('bio', fixture.bio);
        expect(result.resources).to.deep.equal([]);
      })
      ;
    });

    it("should get with exclude params", function () {
      return People.get(id, {
        exclude: "bio",
      })
      .then(function (result) {
        console.log(result);
        expect(Object.keys(result)).to.have.length(5);
        expect(result).to.have.property('@context');
        expect(result).to.have.property('@id');
        expect(result).to.have.property('@type', "Person");
        expect(result).to.have.property('name', fixture.name);
        expect(result.resources).to.deep.equal([]);
      })
      ;
    });
  });

  describe("find", function () {
    it("should find based on simple query", function () {
      return People.create({
        name: "Mikey",
      })
      .then(function (person) {
        return People.find({
          query: {
            name: "Mikey",
          },
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
          query: {
            name: "Mikey",
          },
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
        expect(Object.keys(person.resources[0])).to.have.length(5);
        expect(person.resources[0]).to.have.property('@context');
        expect(person.resources[0]).to.have.property('@type', "Resource");
        expect(person.resources[0]).to.have.property('@id');
        expect(person.resources[0]).to.have.property('name', "RepRap Prusa Mendel");
        expect(person.resources[0].owner).to.deep.equal({ '@id': id });
      })
      ;
    });

    it("should have nested hasMany <> belongsTo relations", function () {

      var personId, groupId;

      // create person
      return People.create({
        name: "Mikey",
      })
      .then(function (person) {
        // save person id
        personId = person['@id'];
        // create resource with person as owner
        return Groups.create({
          name: "Open App Ecosystem",
        });
      })
      .then(function (group) {
        // save group id
        groupId = group['@id'];
        // create resource with person as owner
        return Memberships.create({
          group: groupId,
          member: personId,
        });
      })
      .then(function (membership) {
        // get person again
        return People.get(personId, {
          include: "memberships",
        });
      })
      .then(function (person) {
        expect(person).to.have.property('memberships');
        expect(Array.isArray(person.memberships)).to.be.true;
        expect(person.memberships).to.have.length(1);
        expect(Object.keys(person.memberships[0])).to.have.length(5);
        expect(person.memberships[0]).to.have.property('@context');
        expect(person.memberships[0]).to.have.property('@type', "Membership");
        expect(person.memberships[0]).to.have.property('@id');
        expect(person.memberships[0]).to.have.property('member');
        expect(person.memberships[0].member).to.deep.equal({ '@id': person.id });
        expect(person.memberships[0]).to.have.property('group');
        expect(Object.keys(person.memberships[0].group)).to.have.length(5);
        expect(person.memberships[0]).to.have.property('@context');
        expect(person.memberships[0]).to.have.property('@type', "Membership");
        expect(person.memberships[0]).to.have.property('@id');
        expect(person.memberships[0]).to.have.property('name', "Open App Ecosystem");
        expect(person.memberships[0].group).to.have.property('memberships');
        expect(Object.keys(person.memberships[0].group)).to.have.length(1);
        expect(person.memberships[0].group[0]).to.deep.equal({ '@id': group.id });
      })
      ;
    });
  });
});
