'use strict';

const _ = require('lodash');

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Request = require('../../../../request');
const Sources = require('../../../../sources');
const Constraint = require('../constraint/constraint');
const Forecast = require('./forecast');

function getDataset(request) {
    return new Promise((resolve, reject) => {
        const variableString = request.query.variable;
        if (_.isNil(variableString) || variableString === '')
            return resolve(null);

        const variableIDs = variableString.split(',');
        const tree = Sources.searchMany(variableIDs);

        if (_.isNil(tree))
            return reject(Exception.notFound(`variables not found: ${variableIDs}`));
        if (_.size(tree) > 1)
            return reject(Exception.invalidParam(`variables cannot span multiple topics: ${variableIDs}`));

        const topic = _.head(_.values(tree));

        if (_.size(topic.datasets) > 1)
            return reject(Exception.invalidParam(`variables cannot span multiple datasets: ${variableIDs}`));

        const dataset =  _.head(_.values(topic.datasets));
        const variables = _.values(dataset.variables);

        resolve(dataset);
    });
}

function getEntities(request) {
    return EntityLookup.byIDs(request.query.entity_id);
}

function getConstraints(request, dataset) {
    return new Promise((resolve, reject) => {
        const constraints = _.omit(request.query, ['variable', 'entity_id']);

        _.keys(constraints).forEach(constraint => {
            if (!_.includes(dataset.constraints, constraint))
                reject(Exception.notFound(`invalid constraint: ${constraint}`));
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
            return reject(Exception.invalidParam('must specify at least one variable'));

        const unspecifiedConstraints = dataset.constraints.filter(constraint => {
            return !(constraint in constraints);
        });

        if (unspecifiedConstraints.length > 1) return reject(Exception.invalidParam(
            `must specify values for all but one of: {unspecifiedConstraints.join(', ')}`));

        if (variables.length > 1 && unspecifiedConstraints.length !== 0)
            return reject(Exception.invalidParam(`To retrieve a values for multiple variables,
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

    Promise.all([getDataset(request), getEntities(request)]).then(([dataset, entities]) => {

        if (_.isNil(dataset))
            return errorHandler(Exception.invalidParam('must specify a variable'));

        getConstraints(request, dataset).then(constraints => {
            getUnspecified(dataset, constraints).then(unspecified => {
                getValuesURL(dataset, constraints, entities, unspecified)
                    .then(Request.getJSON)
                    .then(_.partial(getFrame, unspecified))
                    .then(frame => response.json(frame))
                    .catch(errorHandler);
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getFrame(unspecified, json) {
    const ids = _.uniq(json.map(_.property('id')));
    const header = [unspecified].concat(ids);

    const frame = _(json)
        .groupBy(unspecified)
        .toPairs()
        .map(([value, entities]) => {
            return [value].concat(ids.map(id => {
                const entity = _.find(entities, {id});
                if (_.isNil(entity)) return null;
                return parseFloat(entity.value) || entity.value;
            }));
        })
        .value();

    return Promise.resolve([header].concat(frame));
}

function getValuesURL(dataset, constraints, entities, unspecified) {
    let queries = [];
    if (entities.length > 0) queries.push(whereEntities(entities));
    const variables = _.values(dataset.variables);
    if (variables.length > 0) queries.push(whereVariables(variables));
    const $where = queries.join(' AND ');

    const params = _.assign({}, constraints, {
        $where: queries.join(' AND '),
        $select: ['id', 'value', unspecified].join(','),
        $order: `${unspecified}, id`
    });

    const url = Request.buildURL(dataset.url, params);
    return Promise.resolve(url);
}

function quote(string) {
    return `'${string}'`;
}

function whereIn(name, options) {
    return `${name} in (${options.map(quote).join(',')})`;
}

function whereEntities(entities) {
    if (entities.length === 0) return [];
    return whereIn('id', entities.map(_.property('id')));
}

function variableID(variable) {
    return _.last(variable.id.split('.'));
}

function whereVariables(variables) {
    if (variables.length === 0) return [];
    return whereIn('variable', variables.map(variableID));

}

