'use strict';

const _ = require('lodash');
const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const EntityLookup = require('../entity-lookup');
const Constants = require('../constants');
const SOQL = require('../soql');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([
        getID(request),
        getName(request),
        getType(request)
    ]).then(([id, name, type]) => {
        getEntities(id, name, type).then(entities => {
            entities = entities.map(entity => _.omit(entity, 'rank'));
            response.json({entities});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getEntities(id, name, type) {
    return new SOQL(Constants.ENTITY_URL)
        .equal('id', id)
        .equal('type', type)
        .order('rank', 'desc')
        .equal('name', _.isEmpty(name) ? name : null)
        .q(_.isEmpty(name) ? null : name)
        .send();
}

function getID(request) {
    return Promise.resolve(request.query.entity_id);
}

function getName(request) {
    return Promise.resolve(request.query.entity_name);
}

function getType(request) {
    return Promise.resolve(request.query.entity_type);
}

