'use strict';

const _ = require('lodash');

const Exception = require('../error');
const SOQL = require('../soql');
const SuggestSources = require('../../data/autosuggest-sources');
const question = SuggestSources.question;
const ParseRequest = require('../parse-request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    Promise.all([
        ParseRequest.getEntities(request),
        ParseRequest.getDataset(request),
        ParseRequest.getLimit(request),
        ParseRequest.getOffset(request)
    ]).then(([entities, dataset, limit, offset]) => {
        searchQuestions(entities, dataset, limit, offset, token).then(questions => {
            response.json({questions});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function searchQuestions(entities, dataset, limit, offset, token) {
    return new SOQL(`https://${question.domain}/resource/${question.fxf}.json`)
        .token(token)
        .select('question')
        .order('regionPopulation', 'desc')
        .order('variableIndex', 'asc')
        .order('source', 'desc')
        .offset(offset)
        .limit(limit)
        .whereIn('regionID', entities.map(_.property('id')))
        .equal('source', _.isNil(dataset) ? null : _.last(dataset.id.split('.')))
        .send()
        .then(response => {
            return question.decode(response.map(_.property('question')))
                .then(options => question.transform(options));
        });
}

