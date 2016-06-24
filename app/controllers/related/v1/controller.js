'use strict';

const _ = require('lodash');

const Constants = require('../../../constants');
const Request = require('../../../request');
const EntityLookup = require('../../../entity-lookup');
const Exception = require('../../error');
const Relatives = require('../relatives');

function validateRequest(request) {
    return new Promise((resolve, reject) => {
        const relation = request.params.relation;
        const id = request.query.id;
        const limitString = _.isNil(request.query.limit) ?
            Constants.RELATED_COUNT_DEFAULT : request.query.limit;

        if (isNaN(limitString))
            reject(Exception.invalidParam('limit must be an integer'));
        const limit = parseInt(limitString);

        if (limit < 1)
            reject(Exception.invalidParam('limit must be at least 1'));
        if (limit > Constants.RELATED_COUNT_MAX)
            reject(Exception.invalidParam(`limit cannot be greater than ${Constants.RELATED_COUNT_MAX}`));

        resolve([relation, id, limit]);
    });
}

function relationPromise(entity, relation, n) {
    if (relation === 'parent') {
        return Relatives.parents(entity, n);
    } else if (relation === 'child') {
        return Relatives.children(entity, n);
    } else if (relation === 'sibling') {
        return Relatives.siblings(entity, n);
    } else if (relation === 'peer') {
        return Relatives.peers(entity, n);
    } else {
        return Promise.reject(Exception.notFound(`relation type not found: '${relation}', \
must be 'parent', 'child', 'sibling', or 'peer'`));
    }
}

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    validateRequest(request).then(([relation, id, limit]) => {
        EntityLookup.byID(id).then(entity => {
            relationPromise(entity, relation, limit).then(json => {
                response.json(json);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

