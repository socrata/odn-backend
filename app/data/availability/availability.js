'use strict';

const _ = require('lodash');

const Constants = require('../../constants');
const Request = require('../../request');
const Sources = require('../../sources');

class Availability {
    static get(entities) {
        return getVariables(entities).then(variables => {
            const availableVariables = variables
                .filter(variable => variable.count_variable == entities.length)
                .map(variable => variable.variable);

            return Promise.resolve(availableVariables);
        });
    }

    static topicTree(variables, entities) {
        let topics = Sources.searchMany(variables);

        if (_.isNil(topics)) return null;

        topics = Sources.mapVariables(topics, (variable, id, parents) => {
            const dataset = _.last(parents);
            const url = Request.buildURL(dataset.url, {
                'variable': _.last(variable.id.split('.')),
                '$where': getIDs(entities)
            });
            return _.assign(variable, {url});
        });

        topics = Sources.mapDatasets(topics, dataset => {
            return _.omit(dataset, 'searchTerms');
        });

        return topics;
    }
}

function getIDs(entities) {
    const entityIDs = entities.map(entity => entity.id);
    return `id in(${entityIDs.map(id => `'${id}'`).join(',')})`;
}

function getVariables(entities) {
    const url = Request.buildURL(Constants.VARIABLE_URL, {
        '$where': getIDs(entities),
        '$select': 'variable,count(variable)',
        '$group': 'variable'
    });

    return Request.getJSON(url);
}

module.exports = Availability;

