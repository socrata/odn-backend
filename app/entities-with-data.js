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
function entitiesWithData(token, entities, variable) {
    if (_.isEmpty(entities))
        return Promise.resolve(entities);
    if (_.isNil(variable))
        return Promise.reject(server('variable required for entitiesWithData'));

    return getEntityIDsWithData(token, entities, variable).then(entityIDs => {
        const entityIDSet = new Set(entityIDs);

        return Promise.resolve(entities.filter(entity => entityIDSet.has(entity.id)));
    });
}

function getEntityIDsWithData(token, entities, variable) {
    return new SOQL(Constants.VARIABLE_URL)
        .token(token)
        .whereEntities(entities)
        .equal('variable', variable.id)
        .select('id')
        .send()
        .then(rows => rows.map(_.property('id')));
}

module.exports = entitiesWithData;

