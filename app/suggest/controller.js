'use strict';

const _ = require('lodash');

const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const Config = require('../config');
const Stopwords = require('./../stopwords');
const AutosuggestSources = require('../../data/autosuggest-sources');
const ParseRequest = require('../parse-request');
const entitiesWithData = require('../entities-with-data');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    return Promise.all([
        getQuery(request),
        getAutosuggestSource(request),
        getLimit(request)
    ]).then(([query, autosuggestSource, limit]) => {
        const variableID = request.query.variable_id;

        autosuggestSource.get(query, limit).then(options => {
            if (autosuggestSource.id === 'entity' && !_.isEmpty(variableID)) {
                entitiesWithData(token, options.options, variableID).then(entities => {
                    response.json({options: entities});
                }).catch(errorHandler);
            } else {
                response.json(options);
            }
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getQuery(request) {
    return ParseRequest.getQuery(request)
        .then(query => Promise.resolve(Stopwords.strip(query)));
}

function getAutosuggestSource(request) {
    let type = request.params.type;

    if (_.isNil(type))
        return Promise.reject(invalid('type of result to suggest required'));

    type = type.toLowerCase();

    if (type in AutosuggestSources)
        return Promise.resolve(AutosuggestSources[type]);

    return Promise.reject(Exception.notFound(`suggest type not found: '${type}',
        must be in ${_.keys(AutosuggestSources).join(', ')}`));
}

function getLimit(request) {
    return ParseRequest.getLimit(request,
            Config.suggest_count_default,
            Config.suggest_count_max);
}

