'use strict';

const _ = require('lodash');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const invalid = Exception.invalidParam;
const Availability = require('./availability');
const ParseRequest = require('../../parse-request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    ParseRequest.getEntities(request).then(entities => {
        if (entities.length === 0)
            return Promise.reject(invalid('at least one entity required'));

        Availability.get(entities, token).then(variables => {
            if (_.isEmpty(variables)) return response.json({topics: {}});

            const topics = Availability.topicTree(variables, entities);
            response.json({topics});
        }).catch(errorHandler);
    }).catch(errorHandler);
};


