
const _ = require('lodash');

const Config = require('./config');
const EntityLookup = require('./entity-lookup');
const Exception = require('./error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const Sources = require('./sources');

// TODO: refactor into object with request field and instance methods
class ParseRequest {
    static getInteger(request, name, defaultValue, min, max) {
        let value = request.query[name];

        if (_.isNil(value) && _.isNil(defaultValue))
            return Promise.reject(invalid(`${name} parameter required`));
        if (_.isNil(value)) return Promise.resolve(defaultValue);

        value = parseInt(value, 10);
        if (isNaN(value)) return Promise.reject(invalid(`${name} must be an integer`));

        if (!_.isNil(min) && value < min)
            return Promise.reject(invalid(`${name} must be greater than or equal to ${min}`));
        if (!_.isNil(max) && value > max)
            return Promise.reject(invalid(`${name} must be less than or equal to ${max}`));

        return Promise.resolve(value);
    }

    static getOffset(request) {
        return ParseRequest.getInteger(request, 'offset', 0, 0);
    }

    static getLimit(request, defaultValue, max) {
        if (_.isNil(defaultValue)) defaultValue = Config.catalog_limit_default;
        if (_.isNil(max)) max = Config.catalog_limit_max;
        return ParseRequest.getInteger(request, 'limit', defaultValue, 0, max);
    }

    static getEntity(request) {
        const id = request.query.entity_id;
        if (_.isEmpty(id)) return Promise.reject(invalid(`entity id required`));
        return EntityLookup.byID(id, request.token);
    }

    static getEntities(request) {
        const ids = request.query.entity_id;
        if (_.isNil(ids)) return Promise.resolve([]);
        if (ids === '') return Promise.reject(notFound('entity_id cannot be empty'));
        return EntityLookup.byIDs(ids, request.token);
    }

    static getDataset(request) {
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

    static getQuery(request) {
        const query = request.query.query;

        if (_.isNil(query))
            return Promise.reject(invalid('query parameter required'));

        return Promise.resolve(query);
    }
}

module.exports = ParseRequest;

