'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');
const EntityLookup = require('../entity-lookup');
const Exception = require('../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Relatives = require('./relatives');
const ParseRequest = require('../parse-request');
const entitiesWithData = require('../entities-with-data');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    Promise.all([
        getRelation(request),
        getLimit(request)
    ]).then(([relation, limit]) => {
        ParseRequest.getEntity(request).then(entity => {
            relationPromise(entity, relation, limit, token).then(result => {
                const variableID = request.query.variable_id;

                if (_.isEmpty(variableID)) return response.json(result);

                filterRelated(token, result.relatives, variableID).then(relatives => {
                    response.json({relatives});
                }).catch(errorHandler);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function filterRelated(token, groups, variableID) {
    return Promise.all(groups.map(group => filterGroup(token, variableID, group)));
}

function filterGroup(token, variableID, group) {
    return entitiesWithData(token, group.entities, variableID).then(entities => {
        return Promise.resolve({
            entities,
            type: group.type
        });
    });
}

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

const validRelationsList = ['parent', 'child', 'sibling', 'peer'];
const validRelations = new Set(validRelationsList);

function getRelation(request) {
    const relation = request.params.relation.toLowerCase();
    if (!validRelations.has(relation))
        return Promise.reject(notFound(`relation type not found: ${relation},
            must be one of ${validRelationsList.join(', ')}`));
    return Promise.resolve(relation);
}

function getEntityID(request) {
    const id = request.query.entity_id;
    if (_.isEmpty(id)) return Promise.reject(invalid(`entity id required`));
    return Promise.resolve(id);
}

function getLimit(request) {
    return ParseRequest.getLimit(request,
            Constants.RELATED_COUNT_DEFAULT, Constants.RELATED_COUNT_MAX);
}

