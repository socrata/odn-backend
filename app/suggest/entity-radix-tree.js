'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const Constants = require('../constants');
const SOQL = require('../soql');

class EntityRadixTree {
    constructor(entities) {
        this.nameToEntities = getNameToEntities(entities);
        this.tree = RadixTree.fromStrings(_.keys(this.nameToEntities));
    }

    withPrefix(prefix) {
        if (_.isEmpty(prefix)) return [];
        prefix = clean(prefix);
        const names = this.tree.withPrefix(prefix);
        return _.flatMap(names, _.propertyOf(this.nameToEntities));
    }

    static fromSOQL() {
        return downloadEntities().then(entities => {
            return Promise.resolve(new EntityRadixTree(entities));
        });
    }
}

function getNameToEntities(entities) {
    const nameToEntities = {};

    entities.forEach(entity => {
        const name = clean(entity.name);
        if (name in nameToEntities) nameToEntities[name].push(entity);
        else nameToEntities[name] = [entity];
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

module.exports = EntityRadixTree;

