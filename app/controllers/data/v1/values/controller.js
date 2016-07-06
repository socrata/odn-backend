'use strict';

const _ = require('lodash');

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Request = require('../../../../request');
const Sources = require('../../../../sources');
const Constraint = require('../constraint/constraint');
const Forecast = require('./forecast');

function getVariables(request) {
    return new Promise((resolve, reject) => {
        const variableString = request.query.variable;
        if (_.isNil(variableString) || variableString === '')
            return resolve([null, null, []]);

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

        resolve([topic, dataset, variables]);
    });
}

function getEntities(request) {
    return EntityLookup.byIDs(request.query.entity_id);
}

function getConstraints(request, dataset) {
    return new Promise((resolve, reject) => {
        const constraints = _.omit(request.query, ['variable', 'entity_id']);

        _.keys(constraints).forEach(constraint => {
            if (!_.contains(dataset.constraints, constraint))
                reject(Exception.notFound(`invalid constraint: ${constraint}`));
        });

        resolve(constraints);
    });
}

function get(entities) {
    return {
        $where: `id in ${entities.map(_.property('id'))}`
    };
}


module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([getVariables(request), getEntities(request)])
        .then(([[topic, dataset, variables], entities]) => {

        if (_.isNil(dataset))
            return errorHandler(Exception.invalidParam('must specify a dataset or variable'));

        getConstraints(request, dataset).then(constraints => {
            const specified = [entities.length > 0, variables.length > 0]
                .concat(dataset.constraints.map(constraint => constraint in constraints));

            if (_.filter(specified, _.negate(_.identity)).length > 1)
                return errorHandler(Exception.invalidParam(
                    `must specify values for all but one of:
                    ${['entity_id', 'variable'].concat(dataset.constraints).join(', ')}`));

            let queries = [];
            if (entities.length > 0) queries.push(whereEntities(entities));
            if (variables.length > 0) queries.push(whereVariables(variables));
            const $where = queries.join(' AND ');

            const params = _.assign({}, constraints, {$where});
            const url = Request.buildURL(dataset.url, params);
            console.log(url);

            response.json({});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

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

