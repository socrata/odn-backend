'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');

const errorController = require('./error');
const Relatives = require('./relatives');

function validateRequest(request) {
    return new Promise((resolve, reject) => {
        const relation = request.params.relation;
        const id = request.query.id;
        const limitString = _.isNil(request.query.limit) ?
            Constants.RELATED_COUNT_DEFAULT : request.query.limit;

        if (isNaN(limitString))
            reject('limit must be an integer');
        const limit = parseInt(limitString);

        if (limit < 1)
            reject('limit must be at least 1');
        if (limit > Constants.RELATED_COUNT_MAX)
            reject(`limit cannot be greater than ${Constants.RELATED_COUNT_MAX}`);

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
        return new Promise((resolve, reject) => {
            reject(`invalid relation type: '${relation}', must be 'parent', 'child', 'sibling', or 'peer'`);
        });
    }
}

function getEntity(id) {
    return new Promise((resolve, reject) => {
        if (_.isNil(id)) {
            reject('id cannot be null');
        } else {
            const url = Request.buildURL(Constants.ENTITY_URL, {id});

            Request.getJSON(url).then(json => {
                if (json.length === 0) {
                    reject(`id not found: '${id}'`);
                } else if (json.length === 1) {
                    resolve(_.pick(json[0], ['id', 'name', 'type']));
                } else {
                    reject(`multiple entities found for id: '${id}'`);
                }
            });
        }
    });
}

module.exports = (request, response) => {
    validateRequest(request).then(([relation, id, limit]) => {
        getEntity(id).then(entity => {
            relationPromise(entity, relation, limit).then(json => {
                response.json(json);
            }, error => {
                errorController(error, request, response, null, 400);
            });
        }, error => {
            errorController(error, request, response, null, 422);
        });
    }, error => {
        errorController(error, request, response, null, 422);
    });
};

