'use strict';

const _ = require('lodash');
const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const EntityLookup = require('../entity-lookup');
const Sources = require('../sources');
const Stopwords = require('../stopwords');
const Constants = require('../constants');
const Request = require('../request');
const SuggestSources = require('../../data/autosuggest-sources');
const question = SuggestSources.question;

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([
        getEntities(request),
        getDataset(request),
        getLimit(request),
        getOffset(request)
    ]).then(([entities, dataset, limit, offset]) => {
        searchQuestions(entities, dataset, limit, offset).then(questions => {
            response.json({questions});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function searchQuestions(entities, dataset, limit, offset) {
    const url = Request.buildURL(`https://${question.domain}/resource/${question.fxf}.json`, _.assign({
        $select: 'question',
        $order: 'regionPopulation desc,variableIndex asc,source desc',
        $offset: offset,
        $limit: limit
    }, entities.length === 0 ? {} : {
        $where: Request.whereIn('regionID', entities.map(_.property('id'))),
    }, _.isNil(dataset) ? {} : {
        source: _.last(dataset.id.split('.'))
    }));

    return Request.getJSON(url).then(response => {
        return question.decode(response.map(_.property('question')))
            .then(options => question.transform(options));
    });
}

function getDataset(request) {
    const datasetID = request.query.dataset_id;
    if (_.isNil(datasetID)) return Promise.resolve(null);
    if (datasetID === '') return Promise.reject(notFound('dataset_id cannot be empty'));

    const tree = Sources.search(datasetID);
    if (_.isNil(tree))
        return Promise.reject(notFound(`dataset not found: ${datasetID}`));

    const topic = _.first(_.values(tree));
    if (_.size(topic.datasets) !== 1)
        return Promise.reject(invalid(`expected variable but found topic: ${datasetID}`));

    const dataset = _.first(_.values(topic.datasets));
    return Promise.resolve(dataset);
}

function getEntities(request) {
    const ids = request.query.entity_id;
    if (_.isNil(ids)) return Promise.resolve([]);
    if (ids === '') return Promise.reject(notFound('entity_id cannot be empty'));
    return EntityLookup.byIDs(ids);
}

function getQuery(request) {
    return Promise.resolve(request.query.query || '');
}

function getOffset(request) {
    return getPositiveInteger('offset', request.query.offset, 0);
}

function getLimit(request) {
    return getPositiveInteger('limit', request.query.limit, Constants.CATALOG_LIMIT_DEFAULT).then(limit => {
        if (limit > Constants.CATALOG_LIMIT_MAX)
            return Promise.reject(invalid(`limit cannot be greater than ${Constants.CATALOG_LIMIT_MAX}`));
        return Promise.resolve(limit);
    });
}

function getPositiveInteger(name, value, defaultValue) {
    if (_.isNil(value)) return Promise.resolve(defaultValue);

    value = parseInt(value);
    if (isNaN(value)) return Promise.reject(invalid(`${name} must be an integer`));
    if (value < 0) return Promise.reject(invalid(`${name} must be greater than or equal to zero`));

    return Promise.resolve(value);
}

