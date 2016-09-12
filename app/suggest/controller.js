'use strict';

const _ = require('lodash');

const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const Constants = require('../constants');
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
        getLimit(request),
        getVariable(request)
    ]).then(([query, autosuggestSource, limit, variable]) => {
        autosuggestSource.get(query, limit).then(options => {
            if (autosuggestSource.id === 'entity' && !_.isNil(variable)) {
                entitiesWithData(token, options.options, variable).then(entities => {
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
            Constants.SUGGEST_COUNT_DEFAULT,
            Constants.SUGGEST_COUNT_MAX);
}

function getVariable(request) {
    const id = request.query.variable_id;
    return Promise.resolve(_.isEmpty(id) ? null : {id});
}

