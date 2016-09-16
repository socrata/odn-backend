'use strict';

const _ = require('lodash');

const Stopwords = require('../stopwords');
const lowercase = require('../lowercase');

const THRESHOLD = 100;

class QuestionSuggest {
    constructor(entityRadixTree, variableRadixTree) {
        this.entityTree = entityRadixTree;
        this.variableTree = variableRadixTree;
    }

    get(query, limit) {
        const words = Stopwords.importantWords(query);

        const entities = this.getEntities(words);
        const variables = this.getVariables(words);
        const questions = combinations(entities, variables, limit)
            .map(pairToQuestion);

        return Promise.resolve({options: questions});
    }

    getEntities(words) {
        return _(words).flatMap(word => {
                const options = this.entityTree.withPrefix(word);
                return options.length > THRESHOLD ? [] : options;
            })
            .orderBy(['rank'], ['desc'])
            .map(entity => _.omit(entity, ['rank']))
            .value();
    }

    getVariables(words) {
        let variables = _(words).flatMap(word => {
                const options = this.variableTree.withPrefix(word);
                return options.length > THRESHOLD ? [] : options;
            })
            .uniqBy('id')
            .value();

        if (!(variables.length)) variables = this.variableTree.variables;

        return _(variables)
            .orderBy(['rank'], ['asc'])
            .map(variable => _.omit(variable, ['rank']))
            .map(variable => _.extend(variable, {name: lowercase(variable.name)}))
            .value();
    }
}

function pairToQuestion([entity, variable]) {
    return {entity, variable};
}

// combinations([1, 2], [3, 4], 3) => [[1, 3], [1, 4], [2, 3]]
// This would be so clean is Haskell with lazy evaluation
function combinations(listA, listB, limit) {
    if (_.isEmpty(listA) || _.isEmpty(listB) || limit === 0) return [];
    let n = 0;
    const pairs = [];
    listA.forEach(a => {
        listB.forEach(b => {
            if (n >= limit) return;
            pairs.push([a, b]);
            n++;
        });
    });

    return pairs;
}

const EntityRadixTree = require('./entity-radix-tree');
const VariableRadixTree = require('./variable-radix-tree');

Promise.all([
    EntityRadixTree.fromSOQL(),
    VariableRadixTree.fromSources()
]).then(([entityTree, variableTree]) => {
    const suggest = new QuestionSuggest(entityTree, variableTree);
    suggest.get('What is the population of sea', 5);
});

module.exports = QuestionSuggest;

