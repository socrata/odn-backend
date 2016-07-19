'use strict';

const _ = require('lodash');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const Availability = require('./availability');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    EntityLookup.byIDs(request.query.entity_id, token).then(entities => {
        if (entities.length === 0)
            return errorHandler(Exception.invalidParam('at least one id required'));

        Availability.get(entities, token).then(variables => {
            const topics = Availability.topicTree(variables, entities);
            response.json({topics});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

