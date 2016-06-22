'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');

const errorController = require('./error');
const Relatives = require('./relatives');

const supportedRelations = ['parent', 'child', 'sibling', 'peer'];
const supportedRelationsSet = new Set(supportedRelations);

class OptionValidator {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.optionSet = new Set(options);
    }

    validate(value) {
        return new Promise((resolve, reject) => {
            if (this.optionSet.has(value)) {
                resolve(value);
            } else {
                reject({
                    message: `Unsupported ${this.name} ${value}. Must be one of: ${this.options.join(', ')}.`
                });
            }
        });
    }
}

class RequiredValidator {
    constructor(name) {
        this.name = name;
    }

    validate(value) {
        return new Promise((resolve, reject) => {
            if (value !== undefined) {
                resolve(value);
            } else {
                reject({
                    message: `${this.name} query parameter required but not found.`,
                });
            }
        });
    }
}

/*
new Validator(request.params.relation)


class Validator {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    oneOf(options) {
        if (_.contains(options, value)) return this;
        return

    }



}

const relation = new Validator('relation')
    .exists()
    .oneOf(['parent', 'child', 'sibling', 'peer'])
    .get();

const id = new Validator('id')
    .exists()
    .notEmpty()
    .get();

const limit = new Validator('limit')
    .optional(10)
    .toInt()
    .min(1)
    .max(100)
    .get();

validator.exists().oneOf(['parent', 'child', 'sibling', 'peer'])
*/

const relationValidator = new OptionValidator('relation', ['parent', 'child', 'sibling', 'peer']);
const idValidator = new RequiredValidator('id');
const limitValidator = new RequiredValidator('limit');
//const limitValidator = new RangeValidator('limit', 0, 100);

function validateRequest(request, response) {
    return Promise.all([
        relationValidator.validate(request.params.relation),
        idValidator.validate(request.query.id),
        limitValidator.validate(request.query.limit)
    ]);
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
        return new Promise((resolve, reject) => reject({
            message: `Invalid relation type: ${relation}`
        }));
    }
}

function getEntity(id) {
    return new Promise((resolve, reject) => {
        if (id === null || id === undefined) {
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
    validateRequest(request, response).then(([relation, id, limit]) => {
        getEntity(id).then(entity => {
            relationPromise(entity, relation, limit).then(json => {
                response.json(json);
            }, error => {
                errorController({message: error}, request, response, null, 400);
            });
        }, error => {
            errorController(error, request, response, null, 422);
        });
    }, error => {
        errorController(error, request, response, null, 400);
    });
};

