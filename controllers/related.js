'use strict';

const errorController = require('./error');

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


module.exports = (request, response) => {
    validateRequest(request, response).then(([relation, id, limit]) => {
        console.log(relation);
        response.send('asd');
    }, error => {
        errorController(error, request, response, null, 400);
    });
};

