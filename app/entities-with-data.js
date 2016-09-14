'use strict';

const _ = require('lodash');

const Constants = require('./constants');
const SOQL = require('./soql');
const Exception = require('./error');
const server = Exception.server;

/**
 * Takes a list of entities and a variable and returns a list of entities
 * that have data for the given variable.
 *
 * Requires a valid app token.
 */
function entitiesWithData(token, entities, variableID) {
    if (_.isEmpty(entities))
        return Promise.resolve(entities);
    if (_.isNil(variableID))
        return Promise.reject(server('variableID required for entitiesWithData'));

    return getEntityIDsWithData(token, entities, variableID).then(entityIDs => {
        const entityIDSet = new Set(entityIDs);

        return Promise.resolve(entities.filter(entity => entityIDSet.has(entity.id)));
    });
}

function getEntityIDsWithData(token, entities, variableID) {
    return new SOQL(Constants.VARIABLE_URL)
        .token(token)
        .whereEntities(entities)
        .equal('variable', variableID)
        .select('id')
        .send()
        .then(rows => rows.map(_.property('id')));
}

module.exports = entitiesWithData;

