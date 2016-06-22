'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');

const Exception = require('./error');
const Relatives = require('./relatives');

function validateRequest(request) {
    return new Promise((resolve, reject) => {
        const relation = request.params.relation;
        const id = request.query.id;
        const limitString = _.isNil(request.query.limit) ?
            Constants.RELATED_COUNT_DEFAULT : request.query.limit;

        if (isNaN(limitString))
            reject(Exception.client('limit must be an integer', 422));
        const limit = parseInt(limitString);

        if (limit < 1)
            reject(Exception.client('limit must be at least 1'));
        if (limit > Constants.RELATED_COUNT_MAX)
            reject(Exception.client(`limit cannot be greater than ${Constants.RELATED_COUNT_MAX}`));

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
        return Promise.reject(Exception.client(`invalid relation type: '${relation}', \
must be 'parent', 'child', 'sibling', or 'peer'`, 422));
    }
}

function getEntity(id) {
    return new Promise((resolve, reject) => {
        if (_.isNil(id)) {
            reject(Exception.client('id cannot be null'));
        } else {
            const url = Request.buildURL(Constants.ENTITY_URL, {id});

            Request.getJSON(url).then(json => {
                if (json.length === 0) {
                    reject(Exception.client(`id not found: '${id}'`));
                } else if (json.length === 1) {
                    resolve(_.pick(json[0], ['id', 'name', 'type']));
                } else {
                    reject(Exception.client(`multiple entities found for id: '${id}'`));
                }
            }).catch(reject);
        }
    });
}

const handleReject = (error) => {
    console.log(error);
};

module.exports = (request, response) => {
    const error = new Exception(request, response);

    validateRequest(request).then(([relation, id, limit]) => {
        getEntity(id).then(entity => {
            relationPromise(entity, relation, limit).then(json => {
                response.json(json);
            }).catch(error.reject(422));
        }).catch(error.reject(422));
    }).catch(error.reject(422));
};

