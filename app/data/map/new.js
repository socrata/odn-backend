'use strict';

const _ = require('lodash');

const Exception = require('../../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const EntityLookup = require('../../entity-lookup');
const Sources = require('../../sources');
const Constants = require('../../constants');
const SOQL = require('../../soql');
const Session = require('./session');
const SessionManager = require('./session-manager');
const format = require('../values/format');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    Promise.all([
        getEntities(request),
        getDataset(request),
        getConstraints(request)
    ]).then(([entities, dataset, constraints]) => {
        const entityType = entities[0].type;

        if (!(entityType in Constants.GEO_URLS))
            return Promise.reject(notFound(`no geodata for entity of type: ${entityType}`));

        checkConstraints(dataset, constraints).then(() => {
            Promise.all([
                getSessionID(dataset, constraints, entityType, entities, token),
                getBoundingBox(entities, entityType, token),
                getSummaryStatistics(dataset, constraints, entityType, token)
            ]).then(([sessionID, boundingBox, summaryStats]) => {
                response.json({
                    session_id: sessionID,
                    bounds: boundingBox,
                    summary_statistics: summaryStats
                });
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getSessionID(dataset, constraints, entityType, entities, token) {
    const session = new Session(dataset, constraints, entityType, entities, token);
    return SessionManager.add(session);
}

function getBoundingBox(entities, entityType, token) {
    const ids = entities.map(_.property('id'));
    return new SOQL(`${Constants.GEO_URLS[entityType]}.json`)
        .token(token)
        .whereIn('id', ids)
        .select('extent(the_geom)')
        .send()
        .then(response => {
            response = response[0];

            if (_.isEmpty(response))
                return Promise.reject(notFound(`no geodata found for ids: ${ids}`));

            const coordinates = response
                .extent_the_geom
                .coordinates[0][0]
                .slice(0, 4)
                .map(_.reverse);
            const sw = coordinates[0];
            const ne = coordinates[2];

            return Promise.resolve([sw, ne]);
        });
}

function getSummaryStatistics(dataset, constraints, entityType, token) {
    const variable = _.values(dataset.variables)[0];
    const formatter = format(variable.type);
    const dotStripedType = _.last(entityType.split('.'));
    const types = [entityType, dotStripedType];
    if (entityType === 'place' || dotStripedType === 'place') {
        types.push('city', 'county', 'township', 'village');
    }

    const baseQuery = new SOQL(dataset.url)
        .token(token)
        .whereIn('type', types)
        .equal('variable', _.last(variable.id.split('.')))
        .equals(constraints);

    return getCount(baseQuery).then(count => {
        const indexes = getIndexes(count);

        return Promise.all(indexes.map(index => getAtIndex(baseQuery, index))).then(values => {
            return Promise.resolve({
                values: values.map(parseFloat),
                values_formatted: values.map(formatter),
                names: Constants.SUMMARY_STAT_NAMES
            });
        });
    });
}

function getAtIndex(baseQuery, index) {
    return baseQuery
        .clone()
        .select('value')
        .offset(index)
        .limit(1)
        .order('value')
        .send()
        .then(response => {
            if (response.length === 0)
                return Promise.reject(notFound('no data found to generate map'));
            return Promise.resolve(response[0].value);
        });
}

// given n, find indexes of minimum, lower quartile, median, upper quartile, maximum
function getIndexes(count) {
    const steps = Constants.SUMMARY_STAT_STEPS;
    const mid = _.range(1, steps - 1).map(n => Math.floor(count * n / (steps - 1)));
    return _.concat(0, mid, count < 1 ? 0 : count - 1);
}

function getCount(baseQuery) {
    return baseQuery
        .clone()
        .selectAs('count(value)', 'count')
        .send()
        .then(response => Promise.resolve(response[0].count || 0));
}

function getEntities(request) {
    const ids = request.query.entity_id;

    if (_.isNil(ids))
        return Promise.reject(invalid('parameter entity_id required'));

    return EntityLookup.byIDs(ids, request.token).then(entities => {
        if (entities.length === 0)
            return Promise.reject(notFound(`entities not found: ${ids}`));

        const types = _.uniq(entities.map(_.property('type')));

        if (types.length !== 1)
            return Promise.reject(invalid(`expected entities of one type
                but found entities of multiple types: ${types.join(', ')}`));

        return Promise.resolve(entities);
    });
}

function getDataset(request) {
    return new Promise((resolve, reject) => {
        const path = request.query.variable;

        if (_.isNil(path))
            return reject(invalid('parameter variable required'));

        const tree = Sources.search(path);

        if (_.isNil(tree))
            return reject(notFound(`variable not found: ${path}`));

        const topic = _.first(_.values(tree));

        if (_.size(topic.datasets) !== 1)
            return reject(invalid(`expected path to variable but found path to topic: ${path}`));

        const dataset = _.first(_.values(topic.datasets));

        if (_.size(dataset.variables) !== 1)
            return reject(invalid(`expected path to variable but found path to dataset: ${path}`));

        resolve(dataset);
    });
}

function getConstraints(request) {
    return _.omit(request.query, ['entity_id', 'variable', 'app_token']);
}

function checkConstraints(dataset, constraints) {
    const constraintNames = _.keys(constraints);
    const missing = _.difference(dataset.constraints, constraintNames);

    if (missing.length !== 0)
        return Promise.reject(invalid(`must specify values for constraints: ${missing}`));

    const unknown = _.difference(constraintNames, dataset.constraints);

    if (unknown.length !== 0)
        return Promise.reject(invalid(`invalid constraint: ${unknown}`));

    return Promise.resolve();
}

