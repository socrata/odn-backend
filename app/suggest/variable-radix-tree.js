'use strict';

const _ = require('lodash');

const ObjectRadixTree = require('./object-radix-tree');
const Constants = require('../constants');
const Sources = require('../sources');
const Stopwords = require('../stopwords');

module.exports = function() {
    const variables = Sources.variables()
        .map(variable => _.pick(variable, ['name', 'id', 'rank']));

    const tree = new ObjectRadixTree(variables, variableToNames, clean);
    tree.variables = variables;

    return tree;
};

function variableToNames(variable) {
    return Stopwords.importantWords(variable.name);
}

function clean(string) {
    return Stopwords.importantWords(string).join('');
}

