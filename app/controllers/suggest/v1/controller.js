'use strict';

const _ = require('lodash');

const Exception = require('../../error');
const Constants = require('../../../constants');
const Suggest = require('../suggest');
const AutosuggestSources = require('../../../../data/autosuggest-sources');

function validateRequest(request) {
    return new Promise((resolve, reject) => {
        const type = request.params.type;

        if (_.isNil(type))
            reject(Exception.invalidParam('type of result to suggest required'));

        const query = request.query.query;

        if (_.isNil(query))
            reject(Exception.invalidParam('query parameter required'));

        const limitString = _.isNil(request.query.limit) ?
            Constants.SUGGEST_COUNT_DEFAULT : request.query.limit;

        if (isNaN(limitString))
            reject(Exception.invalidParam('limit must be an integer'));
        const limit = parseInt(limitString);

        if (limit < 1)
            reject(Exception.invalidParam('limit must be at least 1'));
        if (limit > Constants.SUGGEST_COUNT_MAX)
            reject(Exception.invalidParam(`limit cannot be greater than ${Constants.SUGGEST_COUNT_MAX}`));

        resolve([type, query, limit]);
    });
}

function suggestPromise(type, query, limit) {
    if (type in AutosuggestSources) {
        const source = AutosuggestSources[type];

        return source.get(query, limit);
    } else {
        return Promise.reject(Exception.notFound(`suggest type not found: '${type}',
            must be in ${_.keys(AutosuggestSources).join(', ')}`));
    }
}

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    validateRequest(request).then(([type, query, limit]) => {
        suggestPromise(type, query, limit).then(json => {
            console.log(json);
            response.json(json);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

