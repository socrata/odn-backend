'use strict';

const _ = require('lodash');
const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const Sources = require('../sources');
const Stopwords = require('../stopwords');
const Aliases = require('../aliases');
const Config = require('../config');
const Request = require('../request');
const ParseRequest = require('../parse-request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([
        ParseRequest.getLimit(request),
        ParseRequest.getOffset(request),
        ParseRequest.getDataset(request)
    ]).then(([limit, offset, dataset]) => {
        if (limit === 0) return response.json({datasets: []});

        ParseRequest.getEntities(request).then(entities => {
            const searchTerms = _.isNil(dataset) ? [] : dataset.searchTerms || [];
            searchDatasets(entities, searchTerms, limit, offset).then(datasets => {
                response.json({datasets});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function searchDatasets(entities, searchTerms, limit, offset) {
    const url = Request.buildURL(Config.catalog_url, _.assign({
        limit,
        offset,
        only: 'datasets',
        q: q(entities, searchTerms)
    }));

    const options = {
        url,
        headers: {
            'User-Agent': Config.catalog_user_agent
        }
    };

    return Request.getJSON(options).then(results => {
        const datasets = results.results.map(getDataset);
        return Promise.resolve(datasets);
    });
}

function getDataset(result) {
    const resource = result.resource;
    const fxf = resource.nbe_fxf || resource.id;
    const domain = result.metadata.domain;

    return _.assign(_.pick(resource, ['name', 'description', 'attribution']), {
        fxf,
        domain,
        domain_url: `http://${domain}`,
        dataset_url: result.permalink,
        dev_docs_url: `https://dev.socrata.com/foundry/${domain}/${fxf}`,
        updated_at: resource.updatedAt,
        created_at: resource.createdAt,
        categories: result.classification.categories
    });
}

function q(entities, searchTerms) {
    return [
        ...entities.map(queryEntity),
        ...searchTerms.map(quote)
    ].join(' ');
}

function queryEntity(entity) {
    const words = split(entity.name)
        .filter(_.negate(stopword));
    const aliased = words.map(word => Aliases.get(word).concat([word]).map(quote));
    const grouped = _(aliased)
        .groupBy(_.size)
        .values()
        .value();
    return _.flattenDeep(grouped).join(' ');
}

function split(phrase) {
    return phrase
        .replace(/[-_\/\\]/g, ' ')
        .replace(/[,\)\(]/g, '')
        .replace(/\s+/g, ' ')
        .split(' ');
}

function stopword(word) {
    return _.includes(['Metro', 'Area'], word);
}

function and(queries) {
    return queryJoin(queries, ' AND ');
}

function or(queries) {
    return queryJoin(queries, ' OR ');
}

function queryJoin(queries, join) {
    if (queries.length === 0) return '';
    queries = queries.filter(query => !(_.isNil(query) || _.isEmpty(query)));
    if (queries.length === 1) return queries[0];
    return paren(queries.join(join));
}

function quote(word) {
    const control = /^(OR|AND)$/i;
    const whitespace = /\s/;
    if (control.test(word) || word.search(whitespace) > -1) return `"${word}"`;
    return word;
}

function paren(query) {
    if (_.isEmpty(query)) return null;
    return `(${query})`;
}

