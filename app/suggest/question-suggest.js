'use strict';

const _ = require('lodash');

const Stopwords = require('../stopwords');

const THRESHOLD = 100;

class QuestionSuggest {
    constructor(entityRadixTree, variableRadixTree) {
        this.entityTree = entityRadixTree;
        this.variableTree = variableRadixTree;
    }

    get(query, limit) {
        const words = Stopwords.importantWords(query);

        const entities = _.flatMap(words, word => {
            const options = this.entityTree.withPrefix(word);
            return options.length > THRESHOLD ? [] : options;
        });

        const variables = _.flatMap(words, word => {
            const options = this.variableTree.withPrefix(word);
            return options.length > THRESHOLD ? [] : options;
        });

        console.log(entities);
        console.log(variables);
    }
}

const EntityRadixTree = require('./entity-radix-tree');
const VariableRadixTree = require('./variable-radix-tree');

Promise.all([
    EntityRadixTree.fromSOQL(),
    VariableRadixTree.fromSources()
]).then(([entityTree, variableTree]) => {
    const suggest = new QuestionSuggest(entityTree, variableTree);
    suggest.get('What is the gdp of seattle?');
});

module.exports = QuestionSuggest;

