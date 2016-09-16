'use strict';

const _ = require('lodash');

class EntitySuggest {
    constructor(entityRadixTree) {
        this.id = 'entity';
        this.tree = entityRadixTree;
    }

    get(query, limit) {
        const options = this.tree.withPrefix(query)
            .slice(0, limit)
            .map(option => _.omit(option, 'rank'));
        return Promise.resolve({options});
    }
}

module.exports = EntitySuggest;

