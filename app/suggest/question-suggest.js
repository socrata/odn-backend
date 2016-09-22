'use strict';

const _ = require('lodash');

const Stopwords = require('../stopwords');
const lowercase = require('../lowercase');
const Constants = require('../constants');
const SOQL = require('../soql');

const THRESHOLD = 100;
const MAX_LIMIT = 10;

class QuestionSuggest {
    constructor(entityRadixTree, variableRadixTree) {
        this.entityTree = entityRadixTree;
        this.variableTree = variableRadixTree;
    }

    get(query, limit) {
        if (limit > MAX_LIMIT) limit = MAX_LIMIT;

        const words = Stopwords.importantWords(query);

        const entities = this.getEntities(words, limit);
        const variables = this.getVariables(words, limit);

        return questionsWithData(entities, variables)
            .then(questions => Promise.resolve({options: questions.slice(0, limit)}));
    }

    getEntities(words, limit) {
        let entities = allWithPrefix(this.entityTree, words);
        if (!(entities.length)) entities = this.entityTree.entities;

        return entities
            .slice(0, limit)
            .map(entity => _.omit(entity, ['rank']));
    }

    getVariables(words, limit) {
        let variables = allWithPrefix(this.variableTree, words);
        if (!(variables.length)) variables = this.variableTree.variables;

        return _(variables)
            .slice(0, limit)
            .map(variable => _.omit(variable, ['rank']))
            .map(variable => _.extend(variable, {name: lowercase(variable.name)}))
            .value();
    }
}

function allWithPrefix(tree, words) {
    const allMatches = _.flatMap(words, word => {
        const options = tree.withPrefix(word, THRESHOLD);
        return options.length >= THRESHOLD ? [] : options;
    });

    const idToObject = _.keyBy(allMatches, 'id');

    return _(allMatches)
        .countBy('id')
        .toPairs()
        .orderBy('1', 'desc')
        .map(_.first)
        .map(_.propertyOf(idToObject))
        .value();
}

function questionsWithData(entities, variables) {
    return questionsWithDataQuery(entities, variables).then(rows => {
        const questions = [];

        entities.forEach(entity => {
            variables.forEach(variable => {
                if (_.find(rows, {id: entity.id, variable: variable.id}))
                    questions.push({entity, variable});
            });
        });

        return Promise.resolve(questions);
    });
}

function questionsWithDataQuery(entities, variables) {
    return new SOQL(Constants.VARIABLE_URL)
        .token(Constants.APP_TOKEN)
        .whereEntities(entities)
        .whereIn('variable', variables.map(_.property('id')))
        .select('id,variable')
        .send();
}

module.exports = QuestionSuggest;

