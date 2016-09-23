'use strict';

const _ = require('lodash');

const ObjectRadixTree = require('./object-radix-tree');
const Constants = require('../constants');
const Sources = require('../sources');
const Stopwords = require('../stopwords');

module.exports = function() {
    const variables = Sources.variables()
        .map(variable => _.pick(variable, ['name', 'id', 'rank']));

    return new ObjectRadixTree(variables, normalize);
};

function normalize(string) {
    return Stopwords.importantWords(string);
}

