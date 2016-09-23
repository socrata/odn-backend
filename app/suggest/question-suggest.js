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

        const entities = this.getEntities(query, MAX_LIMIT);
        const variables = this.getVariables(query, MAX_LIMIT);

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
    return singleEntityQuestions(entities, variables).then(questions => {
        return Promise.resolve(comparisonQuestions(questions));
    });
}

function singleEntityQuestions(entities, variables) {
    return questionsWithDataQuery(entities, variables).then(rows => {
        let questions = [];

        variables.forEach(variable => {
            entities.forEach(entity => {
                if (_.find(rows, {id: entity.id, variable: variable.id}))
                    questions.push({variable, entity});
            });
        });

        return Promise.resolve(questions);
    });
}

function comparisonQuestions(singleEntityQuestions) {
    const groups = _.groupBy(singleEntityQuestions, question => {
        return question.entity.type + question.variable.id;
    });

    return _.flatMap(_.values(groups), group => {
        const variable = group[0].variable;
        const entities = group.map(_.property('entity'));

        if (entities.length === 2) return {variable, entities};
        return entities.map(entity => {
            return {variable, entities: [entity]};
        });
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

