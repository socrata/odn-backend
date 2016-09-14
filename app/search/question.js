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
        ParseRequest.getQuery(request),
        ParseRequest.getLimit(request),
        ParseRequest.getOffset(request)
    ]).then(([query, limit, offset]) => {
        searchQuestions(query, limit, offset, token).then(questions => {
            response.json({questions});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function searchQuestions(query, limit, offset, token) {
    return new SOQL(`https://${question.domain}/resource/${question.fxf}.json`)
        .token(token)
        .select('question')
        .q(query)
        .order('regionPopulation', 'desc')
        .order('variableIndex', 'asc')
        .order('source', 'desc')
        .offset(offset)
        .limit(limit)
        .send()
        .then(response => {
            return question.decode(response.map(_.property('question')))
                .then(options => question.transform(options));
        });
}

