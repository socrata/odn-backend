'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const Constants = require('../constants');
const SOQL = require('../soql');

class EntitySuggest {
    constructor(entities) {
        this.id = 'entity';
        this.nameToEntities = getNameToEntities(entities);
        this.tree = RadixTree.fromStrings(_.keys(this.nameToEntities));
    }

    _get(query, limit) {
        if (_.isEmpty(query)) return [];
        query = clean(query);

        const names = this.tree.withPrefix(query);
        const entities = _.flatMap(names, _.propertyOf(this.nameToEntities));
        return entities.slice(0, limit);
    }

    get(query, limit) {
        const options = this._get(query, limit)
            .map(option => _.omit(option, 'rank'));
        return Promise.resolve({options});
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

module.exports = EntitySuggest;

