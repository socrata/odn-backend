'use strict';

const _ = require('lodash');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const server = Exception.server;

const SOQL = require('../../soql');
const Constants = require('../../constants');
const Sources = require('../../sources');
const Constraint = require('../constraint/constraint');
const Forecast = require('./forecast');
const Describe = require('./describe');
const format = require('./format');

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

    Promise.all([
        getDataset(request),
        getEntities(request),
        getFormat(request)
    ]).then(([dataset, entities, format]) => {

        if (_.isNil(dataset))
            return errorHandler(invalid('must specify a variable'));

        getConstraints(request, dataset).then(constraints => {
            getUnspecified(dataset, constraints).then(unspecified => {
                getValues(dataset, constraints, entities, unspecified, token).then(rows => {
                    if (rows.length === 0) throw notFound(`no data found for the given entities
                        with ${_(constraints).toPairs().map(pair => pair.join('=')).join(' and ')}`);

                    const descriptionPromise = getDescription(request, dataset, entities, constraints, unspecified, rows);
                    const framePromise = getFrame(unspecified, rows)
                        .then(_.partial(getForecast, request))
                        .then(_.curry(formatFrame)(format)(dataset)(unspecified)(entities));

                    Promise.all([descriptionPromise, framePromise]).then(([description, frame]) => {
                        response.json(_.assign(frame, description));
                    }).catch(errorHandler);
                }).catch(errorHandler);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

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

function getFormat(request) {
    return request.query.format === 'google' ? 'google' : null;
}

function formatFrame(format, dataset, unspecified, entities, frame) {
    if (format === 'google')
        return formatFrameGoogle(dataset, unspecified, entities, frame);
    return Promise.resolve(frame);
}

function formatFrameGoogle(dataset, unspecified, entities, frame) {
    const forecast = frame.data.length > 2 && _.last(frame.data[0]) === 'forecast' ? 1 : 0;
    const entityLookup = _.keyBy(entities, 'id');

    const columns = frame.data[0].map((column, index, columns) => {
        if (index === 0) {
            return {
                id: column,
                type: 'string'
            };
        } else if (index < columns.length - forecast) {
            return _.assign({
                id: column,
                type: 'number'
            }, column in entityLookup ? {
                label: entityLookup[column].name
            } : {});
        } else {
            return {
                id: column,
                type: 'boolean',
                role: 'certainty'
            };
        }
    });

    if (unspecified === 'variable') {
        const rows = _.tail(frame.data).map(row => {
            const variable = dataset.variables[row[0]];
            const formatter = format(variable.type);

            return {c: row.map((value, index) => {
                return _.assign({
                    v: value
                }, !(index > 0 && index < row.length - forecast) ? {} : {
                    f: formatter(value)
                }, index === 0 ? {
                    f: variable.name
                } : {});
            })};
        });

        return Promise.resolve({data: {rows, cols: columns}});
    } else {
        if (_.size(dataset.variables) !== 1)
            return Promise.reject(server('should not have multiple variables if constraint not specified'));
        const variable = _.first(_.values(dataset.variables));
        const formatter = format(variable.type);

        const rows = _.tail(frame.data).map(row => {
            return {c: row.map((value, index) => {
                return _.assign({
                    v: value
                }, (index > 0 && index < row.length - forecast) ? {
                    f: formatter(value)
                }: {});
            })};
        });

        return Promise.resolve({data: {rows, cols: columns}});
    }

    return Promise.resolve(frame);
}

function getConstraints(request, dataset) {
    return new Promise((resolve, reject) => {
        const constraints = _.omit(request.query, ['variable', 'entity_id', 'forecast', 'describe', 'app_token', 'format']);

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

