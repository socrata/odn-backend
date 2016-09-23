'use strict';

const _ = require('lodash');

const ObjectRadixTree = require('./object-radix-tree');
const Constants = require('../constants');
const SOQL = require('../soql');
const Stopwords = require('../stopwords');

module.exports = function() {
    return downloadEntities().then(entities => {
        return Promise.resolve(new ObjectRadixTree(entities, normalize));
    });
};

function normalize(string) {
    return Stopwords.words(string.toLowerCase());
}

function downloadEntities() {
    const pages = 10;
    const pagesize = 10000;
    const query = new SOQL(Constants.ENTITY_URL)
        .token(Constants.APP_TOKEN)
        .order('rank', 'desc')
        .limit(pagesize);

    return Promise.all(_.range(pages).map(page => {
        return query.clone().offset(page * pagesize).send();
    })).then(entities => {
        entities = _.concat.apply(this, entities);
        entities.forEach(entity => entity.rank = parseInt(entity.rank, 10));
        return Promise.resolve(entities);
    });
}

