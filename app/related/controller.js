'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');
const EntityLookup = require('../entity-lookup');
const Exception = require('../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Relatives = require('./relatives');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    Promise.all([
        getRelation(request),
        getLimit(request),
        getEntityID(request)
    ]).then(([relation, limit, entityID]) => {
        EntityLookup.byID(entityID, token).then(entity => {
            relationPromise(entity, relation, limit, token).then(json => {
                response.json(json);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function relationPromise(entity, relation, n, token) {
    if (relation === 'parent') {
        return Relatives.parents(entity, n, token);
    } else if (relation === 'child') {
        return Relatives.children(entity, n, token);
    } else if (relation === 'sibling') {
        return Relatives.siblings(entity, n, token);
    } else if (relation === 'peer') {
        return Relatives.peers(entity, n);
    } else {
        return Promise.reject(notFound(`relation type not found: ${relation}`));
    }
}

const validRelations = new Set(['parent', 'child', 'sibling', 'peer']);

function getRelation(request) {
    const relation = request.params.relation.toLowerCase();
    if (!validRelations.has(relation))
        return Promise.reject(notFound(`relation type not found: ${relation},
            must be one of ${validRelations}`));
    return Promise.resolve(relation);
}

function getEntityID(request) {
    const id = request.query.entity_id;
    if (_.isEmpty(id)) return Promise.reject(invalid(`entity id required`));
    return Promise.resolve(id);
}

function getLimit(request) {
    const limitString = _.isNil(request.query.limit) ?
        Constants.RELATED_COUNT_DEFAULT : request.query.limit;

    if (isNaN(limitString))
        return Promise.reject(invalid('limit must be an integer'));
    const limit = parseInt(limitString);

    if (limit < 1)
        return Promise.reject(invalid('limit must be at least 1'));
    if (limit > Constants.RELATED_COUNT_MAX)
        return Promise.reject(invalid(`limit cannot be greater than ${Constants.RELATED_COUNT_MAX}`));

    return Promise.resolve(limit);
}

