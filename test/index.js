var env = process.env.NODE_ENV || 'test';

var expect = require('chai').expect;
var deleteStream = require('level-delete-stream');

describe("#Graph", function () {
  var leveldb, db;
  var Graph;

  before(function () {
    var level = require('level-test')();
    leveldb = level(env+'.db');
    db = require('levelgraph-jsonld')(
      require('levelgraph')(leveldb)
    , {
      base: "http://open.app/",
    });
  });

  beforeEach(function (done) {
    return leveldb.createKeyStream()
    .pipe(deleteStream(leveldb, done))
  });

  it("should load module", function () {
    Graph = require('../');
    expect(Graph).to.exist;
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
});
