'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const Constants = require('../constants');
const SOQL = require('../soql');

class EntitySuggest {
    constructor(entities) {
        this.nameToEntities = getNameToEntities(entities);
        this.tree = RadixTree.fromStrings(_.keys(this.nameToEntities));
    }

    get(query, limit) {
        if (_.isEmpty(query)) return [];
        query = clean(query);

        const names = this.tree.withPrefix(query);
        const entities = _(names)
            .flatMap(_.propertyOf(this.nameToEntities))
            .orderBy(['rank'], ['desc'])
            .value();

        return Promise.resolve(entities.slice(0, limit));
    }

    static fromSOQL() {
        return downloadEntities().then(entities => {
            return Promise.resolve(new EntitySuggest(entities));
        });
    }
}

function getNameToEntities(entities) {
    const nameToEntities = {};

    entities.forEach(entity => {
        const name = clean(entity.name);
        if (name in nameToEntities) nameToEntities[name].push(entity);
        nameToEntities[name] = [entity];
    });

    return nameToEntities;
}

function clean(string) {
    return string.replace(/[\W_]/g, '').toLowerCase();
}

function downloadEntities() {
    const pages = 10;
    const pagesize = 10000;
    const query = new SOQL(Constants.ENTITY_URL)
        .token(Constants.APP_TOKEN)
        .select('id,name,rank')
        .order('id')
        .limit(pagesize);

    return Promise.all(_.range(pages).map(page => {
        return query.clone().offset(page * pagesize).send();
    })).then(entities => {
        entities = _.concat.apply(this, entities);
        entities.forEach(entity => entity.rank = parseInt(entity.rank, 10));
        return Promise.resolve(entities);
    });
}

module.exports = EntitySuggest;

