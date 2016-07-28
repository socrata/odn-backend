'use strict';

const _ = require('lodash');

const Constants = require('../../constants');
const Sources = require('../../sources');
const SOQL = require('../../soql');

class Availability {
    static get(entities, token) {
        return getVariables(entities, token).then(variables => {
            const availableVariables = variables
                .filter(variable => variable.count_variable == entities.length)
                .map(variable => variable.variable);

            return Promise.resolve(availableVariables);
        });
    }

    static topicTree(variables, entities) {
        let topics = Sources.searchMany(variables);

        if (_.isNil(topics)) return null;

        topics = Sources.mapDatasets(topics, dataset => {
            return _.omit(dataset, 'searchTerms');
        });

        return topics;
    }
}

function getVariables(entities, token) {
    return new SOQL(Constants.VARIABLE_URL)
        .token(token)
        .whereEntities(entities)
        .select('variable')
        .select('count(variable)')
        .group('variable')
        .send();
}

module.exports = Availability;

