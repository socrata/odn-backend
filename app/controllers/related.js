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
            reject(Exception.client('limit must be at least 1', 422));
        if (limit > Constants.RELATED_COUNT_MAX)
            reject(Exception.client(`limit cannot be greater than ${Constants.RELATED_COUNT_MAX}`, 422));

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
        return Promise.reject(Exception.client(`relation type not found: '${relation}', \
must be 'parent', 'child', 'sibling', or 'peer'`, 404));
    }
}

function getEntity(id) {
    return new Promise((resolve, reject) => {
        if (_.isNil(id)) {
            reject(Exception.client('id cannot be null', 422));
        } else {
            const url = Request.buildURL(Constants.ENTITY_URL, {id});

            Request.getJSON(url).then(json => {
                if (json.length === 0) {
                    reject(Exception.client(`id not found: '${id}'`, 404));
                } else {
                    resolve(_.pick(json[0], ['id', 'name', 'type']));
                }
            }).catch(reject);
        }
    });
}

module.exports = (request, response) => {
    const error = new Exception(request, response);

    validateRequest(request).then(([relation, id, limit]) => {
        getEntity(id).then(entity => {
            relationPromise(entity, relation, limit).then(json => {
                response.json(json);
            }).catch(error.reject());
        }).catch(error.reject());
    }).catch(error.reject());
};

