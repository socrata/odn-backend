'use strict';

const _ = require('lodash');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const invalid = Exception.invalidParam;
const Availability = require('./availability');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    getEntityID(request).then(entityID => {
        EntityLookup.byIDs(entityID, token).then(entities => {
            if (entities.length === 0)
                return Promise.reject('at least one entity required');

            Availability.get(entities, token).then(variables => {
                const topics = Availability.topicTree(variables, entities);
                response.json({topics});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getEntityID(request) {
    const id = request.query.entity_id;
    if (_.isEmpty(id)) return Promise.reject(invalid(`entity id required`));
    return Promise.resolve(id);
}

