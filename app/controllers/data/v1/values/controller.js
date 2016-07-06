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
            if (!_.includes(dataset.constraints, constraint))
                reject(Exception.notFound(`invalid constraint: ${constraint}`));
        });

        resolve(constraints);
    });
}

/**
 * Specify any number of entities
 */
module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([getVariables(request), getEntities(request)])
        .then(([[topic, dataset, variables], entities]) => {

        if (_.isNil(dataset))
            return errorHandler(Exception.invalidParam('must specify a dataset or variable'));

        getConstraints(request, dataset).then(constraints => {
            const constraintsSpecified = dataset.constraints.map(constraint => {
                return [constraint, constraint in constraints];
            });
            const specified = [['variable', variables.length == 1]].concat(constraintsSpecified);

            if (_.filter(specified, _.negate(_.last)).length > 1)
                return errorHandler(Exception.invalidParam(
                    `must specify singluar values for all but one of:
                    ${specified.map(_.first).join(', ')}`));

            let queries = [];
            if (entities.length > 0) queries.push(whereEntities(entities));
            if (variables.length > 0) queries.push(whereVariables(variables));
            const $where = queries.join(' AND ');

            const unspecified = _.first(_.find(specified, _.negate(_.last))) || 'variable';

            const params = _.assign({}, constraints, {
                $where: queries.join(' AND '),
                $select: ['id', 'value', unspecified].join(','),
                $order: `${unspecified}, id`
            });

            const url = Request.buildURL(dataset.url, params);

            Request.getJSON(url).then(data => {
                const ids = _.uniq(data.map(_.property('id')));
                const header = [unspecified].concat(ids);

                const frame = _(data)
                    .groupBy(unspecified)
                    .toPairs()
                    .map(([value, entities]) => {
                        return [value].concat(ids.map(id => {
                            const entity = _.find(entities, {id});
                            if (_.isNil(entity)) return null;
                            return entity.value;
                        }));
                    })
                    .value();

                response.json([header].concat(frame));
            }).catch(errorHandler);
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

