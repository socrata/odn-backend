'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const Constants = require('../constants');
const Sources = require('../sources');
const Stopwords = require('../stopwords');

class VariableRadixTree {
    constructor(variables) {
        this.variables = variables;
        this.nameToEntities = getNameToEntities(variables);
        this.tree = RadixTree.fromStrings(_.keys(this.nameToEntities));
    }

    withPrefix(prefix) {
        if (_.isEmpty(prefix)) return [];
        prefix = clean(prefix);
        const names = this.tree.withPrefix(prefix);
        return _.flatMap(names, _.propertyOf(this.nameToEntities));
    }

    static fromSources() {
        const variables = Sources.variables()
            .map(variable => _.pick(variable, ['name', 'id', 'rank']));
        return new VariableRadixTree(variables);
    }
}

function getNameToEntities(entities) {
    const nameToEntities = {};

    entities.forEach(entity => {
        [entity.name].concat(Stopwords.importantWords(entity.name)).forEach(name => {
            if (name in nameToEntities) nameToEntities[name].push(entity);
            else nameToEntities[name] = [entity];
        });
    });

    return nameToEntities;
}

function clean(string) {
    return Stopwords.importantWords(string).join('');
}

module.exports = VariableRadixTree;

