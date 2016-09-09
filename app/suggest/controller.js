'use strict';

const _ = require('lodash');

const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const Constants = require('../constants');
const Stopwords = require('./../stopwords');
const AutosuggestSources = require('../../data/autosuggest-sources');
const ParseRequest = require('../parse-request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    return Promise.all([
        getType(request),
        ParseRequest.getQuery(request),
        getLimit(request)
    ]).then(([type, query, limit]) => {
        query = Stopwords.strip(query);

        suggestPromise(type, query, limit).then(json => {
            response.json(json);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function suggestPromise(type, query, limit) {
    if (type in AutosuggestSources) {
        const source = AutosuggestSources[type];

        return source.get(query, limit);
    } else {
        return Promise.reject(Exception.notFound(`suggest type not found: '${type}',
            must be in ${_.keys(AutosuggestSources).join(', ')}`));
    }
}

function getType(request) {
    const type = request.params.type;

    if (_.isNil(type))
        return Promise.reject(invalid('type of result to suggest required'));

    return Promise.resolve(type.toLowerCase());
}

function getLimit(request) {
    return ParseRequest.getLimit(request,
            Constants.SUGGEST_COUNT_DEFAULT,
            Constants.SUGGEST_COUNT_MAX);
}

