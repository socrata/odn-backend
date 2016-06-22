'use strict';

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

function relationPromise(entity, relation) {
    if (relation === 'parent') {
        return Relatives.parents(entity);
    } else if (relation === 'child') {
        return Relatives.children(entity);
    } else if (relation === 'sibling') {
        return Relatives.siblings(entity);
    } else if (relation === 'peer') {
        return Relatives.peers(entity);
    } else {
        return new Promise((resolve, reject) => reject({
            message: `Invalid relation type: ${relation}`
        }));
    }
}

module.exports = (request, response) => {
    validateRequest(request, response).then(([relation, id, limit]) => {
        const entity = {
            id: '0400000US53',
            name: 'Washington',
            type: 'state'
        };

        relationPromise(entity, relation).then(json => {
            response.json(json);
        }, error => {
            console.log(error);
            errorController(error, request, response, null, 400);
        });
    }, error => {
        errorController(error, request, response, null, 400);
    });
};

