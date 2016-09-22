'use strict';

const _ = require('lodash');

const Stopwords = require('../stopwords');
const lowercase = require('../lowercase');
const Constants = require('../constants');
const SOQL = require('../soql');

const MAX_LIMIT = 10;

class QuestionSuggest {
    constructor(entityRadixTree, variableRadixTree) {
        this.entityTree = entityRadixTree;
        this.variableTree = variableRadixTree;
    }

    get(query, limit) {
        if (limit > MAX_LIMIT) limit = MAX_LIMIT;

        const entities = this.getEntities(query, limit);
        const variables = this.getVariables(query, limit);

        return questionsWithData(entities, variables)
            .then(questions => Promise.resolve({options: questions.slice(0, limit)}));
    }

    getEntities(phrase, limit) {
        return this.entityTree.withPhrase(phrase, limit)
            .map(entity => _.omit(entity, ['rank']));
    }

    getVariables(phrase, limit) {
        return this.variableTree.withPhrase(phrase, limit)
            .map(variable => _.omit(variable, ['rank']))
            .map(variable => _.extend(variable, {name: lowercase(variable.name)}));
    }
}

function questionsWithData(entities, variables) {
    return questionsWithDataQuery(entities, variables).then(rows => {
        const questions = [];

        variables.forEach(variable => {
            entities.forEach(entity => {
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

