'use strict';

const _ = require('lodash');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;

const SOQL = require('../../soql');
const Constants = require('../../constants');
const Sources = require('../../sources');
const Constraint = require('../constraint/constraint');
const Forecast = require('./forecast');
const Describe = require('./describe');

function getDataset(request) {
    return new Promise((resolve, reject) => {
        const variableString = request.query.variable;
        if (_.isNil(variableString) || variableString === '')
            return resolve(null);

        const variableIDs = variableString.split(',');
        const tree = Sources.searchMany(variableIDs);

        if (_.isNil(tree))
            return reject(notFound(`variables not found: ${variableIDs}`));
        if (_.size(tree) > 1)
            return reject(invalid(`variables cannot span multiple topics: ${variableIDs}`));

        const topic = _.head(_.values(tree));

        if (_.size(topic.datasets) > 1)
            return reject(invalid(`variables cannot span multiple datasets: ${variableIDs}`));

        const dataset =  _.head(_.values(topic.datasets));
        const variables = _.values(dataset.variables);

        resolve(dataset);
    });
}

function getEntities(request) {
    return EntityLookup.byIDs(request.query.entity_id, request.token);
}

function getConstraints(request, dataset) {
    return new Promise((resolve, reject) => {
        const constraints = _.omit(request.query, ['variable', 'entity_id', 'forecast', 'describe', 'app_token']);

        _.keys(constraints).forEach(constraint => {
            if (!_.includes(dataset.constraints, constraint))
                reject(notFound(`invalid constraint: ${constraint}`));
        });

        resolve(constraints);
    });
}

/**
 * Finds the unspecified parameter or 'variable' if all parameters are specified.
 */
function getUnspecified(dataset, constraints) {
    return new Promise((resolve, reject) => {
        const variables = _.values(dataset.variables);
        if (variables.length === 0)
            return reject(invalid('must specify at least one variable'));

        const unspecifiedConstraints = dataset.constraints.filter(constraint => {
            return !(constraint in constraints);
        });

        if (unspecifiedConstraints.length > 1) return reject(invalid(
            `must specify values for all but one of: ${unspecifiedConstraints.join(', ')}`));

        if (variables.length > 1 && unspecifiedConstraints.length !== 0)
            return reject(invalid(`To retrieve a values for multiple variables,
                specify values for all constraints: ${unspecifiedConstraints.join(', ')}`));

        if (variables.length > 1 || unspecifiedConstraints.length === 0)
            return resolve('variable');

        return resolve(unspecifiedConstraints[0]);
    });
}

/**
 * Specify any number of entities
 *
 * Generates a data frame in the form:
 *
 * [{variable or constraint name},{entity id},{entity_id}...],
 * [{variable or constraint value},{value for entity},{value for entity}],
 * ...
 *
 * The data frame can be constrained by variables, entities, or dataset
 * constraints.
 */
module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    Promise.all([getDataset(request), getEntities(request)]).then(([dataset, entities]) => {

        if (_.isNil(dataset))
            return errorHandler(invalid('must specify a variable'));

        getConstraints(request, dataset).then(constraints => {
            getUnspecified(dataset, constraints).then(unspecified => {
                getValues(dataset, constraints, entities, unspecified, token).then(rows => {
                    if (rows.length === 0) throw notFound(`no data found for the given entities
                        with ${_(constraints).toPairs().map(pair => pair.join('=')).join(' and ')}`);

                    const descriptionPromise = getDescription(request, dataset, entities, constraints, unspecified, rows);
                    const framePromise = getFrame(unspecified, rows)
                        .then(_.partial(getForecast, request));

                    Promise.all([descriptionPromise, framePromise]).then(([description, frame]) => {
                        response.json(_.assign(frame, description));
                    }).catch(errorHandler);
                }).catch(errorHandler);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getDescription(request, dataset, entities, constraints, unspecified, rows) {
    if (request.query.describe === 'true')
        return Describe.describe(dataset, entities, constraints, unspecified, rows);
    return Promise.resolve({});
}

function getFrame(unspecified, json) {
    const ids = _.uniq(json.map(_.property('id')));
    const header = [unspecified].concat(ids);

    const frame = _(json)
        .groupBy(unspecified)
        .toPairs()
        .map(([value, entities]) => {
            return [parseNumber(value)].concat(ids.map(id => {
                const entity = _.find(entities, {id});
                if (_.isNil(entity)) return null;
                return parseNumber(entity.value);
            }));
        })
        .value();

    return Promise.resolve({data: [header].concat(frame)});
}

// Parses the value as a number if possible.
function parseNumber(value) {
    const asNumber = parseFloat(value);
    if (isNaN(asNumber)) return value;
    return asNumber;
}

function getForecast(request, frame) {
    return getForecastSteps(request)
        .then(_.partial(forecast, frame));
}

function forecast(response, steps) {
    const frame = response.data;
    return new Promise((resolve, reject) => {
        if (steps === 0) return resolve(response);

        const header = _.first(frame);
        if (header[0] === 'variable')
            return reject(invalid('cannot forecast data for multiple variables'));

        const body = _.tail(frame);
        if (body.length === 0) return resolve(response);
        if (!_.isNumber(body[0][0]))
            return reject(invalid('cannot forecast data for a non-numerical type'));

        const forecastHeader = header.concat(['forecast']);
        const forecastBody = _(body)
            .unzip()
            .map(series => series.concat(Forecast.linear(steps, series)))
            .concat([_.times(body.length + steps, index => index >= body.length)])
            .unzip()
            .value();
        const forecastFrame = [forecastHeader].concat(forecastBody);
        const forecastInfo = {
            algorithm_name: 'linear',
            algorithm_url: 'https://en.wikipedia.org/wiki/Extrapolation#Linear_extrapolation'
        };

        resolve(_.assign(response, {data: forecastFrame, forecast_info: forecastInfo}));
    });
}

function getForecastSteps(request) {
    return new Promise((resolve, reject) => {
        const forecast = request.query.forecast;

        if (_.isNil(forecast))
            return resolve(0);

        const forecastNumber = parseInt(forecast, 10);
        if (isNaN(forecastNumber))
            return reject(invalid(`forecast parameter must be a positive integer: ${forecast}`));
        if (forecastNumber < 0)
            return reject(invalid('forecast parameter cannot be negative'));
        if (forecastNumber > Constants.FORECAST_STEPS_MAX)
            return reject(invalid(`forecast parameter cannot be greater than ${Constants.FORECAST_STEPS_MAX}`));

        resolve(forecastNumber);
    });
}

function getValues(dataset, constraints, entities, unspecified, token) {
    return new SOQL(dataset.url)
        .token(token)
        .whereIn('id', entities.map(_.property('id')))
        .whereIn('variable', _.values(dataset.variables).map(variableID))
        .select('id')
        .select('value')
        .select(unspecified)
        .order(unspecified)
        .order('id')
        .equals(constraints)
        .send();
}

function variableID(variable) {
    return _.last(variable.id.split('.'));
}

