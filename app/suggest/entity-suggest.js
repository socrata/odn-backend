'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const Constants = require('../constants');
const SOQL = require('../soql');

class EntitySuggest {
    constructor(entityRadixTree) {
        this.id = 'entity';
        this.tree = entityRadixTree;
    }

    get(query, limit) {
        const options = this.tree.get(query)
            .slice(0, limit)
            .map(option => _.omit(option, 'rank'));
        return Promise.resolve({options});
    }
}

module.exports = EntitySuggest;

