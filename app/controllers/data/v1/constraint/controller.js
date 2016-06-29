'use strict';

const _ = require('lodash');
const querystring = require('querystring');

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Availability = require('../availability/availability');
const Request = require('../../../../request');

function getVariable(tree, path) {
    if (_.isNil(path) || _.isNil(tree) || path.length === 0) return null;
    if (path.length === 1) return null;

    const id = path[0];
    const subtree = tree[id];
    if (path.length === 2 && 'variables' in subtree) return subtree.variables[path[1]];

    const subpath = _.tail(path);
    if ('topics' in subtree) return getVariable(subtree.topics, subpath);
    if ('datasets' in subtree) return getVariable(subtree.datasets, subpath);

    return null;
}

function getDataset(tree, path) {
    if (_.isNil(path) || _.isNil(tree) || path.length === 0) return null;
    if (path.length === 1) return null;

    const id = path[0];
    const subtree = tree[id];
    if (path.length === 2 && 'variables' in subtree) return subtree;

    const subpath = _.tail(path);
    if ('topics' in subtree) return getDataset(subtree.topics, subpath);
    if ('datasets' in subtree) return getDataset(subtree.datasets, subpath);

    return null;
}

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    const variableID = request.params.variable;
    if (_.isNil(variableID) || variableID === '')
        return errorHandler(Exception.invalidParam('variable required'));

    const constraint = request.query.constraint;
    if (_.isNil(constraint) || constraint === '')
        return errorHandler(Exception.invalidParam('constraint required'));

    EntityLookup.byIDs(request.query.id).then(entities => {
        if (entities.length === 0)
            return errorHandler(Exception.invalidParam('at least one id required'));

        const topicTree = Availability.topicTree([variableID], entities);

        const variable = getVariable(topicTree, variableID.split('.'));
        if (_.isNil(variable))
            return errorHandler(Exception.notFound(`invalid variable id: ${variableID}`));

        const dataset = getDataset(topicTree, variableID.split('.'));
        if (!_.includes(dataset.constraints, constraint))
            return errorHandler(Exception.notFound(`invalid constraint: ${constraint}. Must be one of ${dataset.constraints.join(', ')}`));

        const constraints = _.omit(request.query, ['id', 'constraint']);
        let error = false;
        _.forIn(constraints, (value, name) => {
            if (error) return;

            if (!_.includes(dataset.constraints, name)) {
                error = true;
                return errorHandler(Exception.notFound(`invalid constraint: ${name}. Must be one of ${dataset.constraints.join(', ')}`));
            }

            if (name === constraint) {
                error = true;
                return errorHandler(Exception.invalidParam(`cannot specify a value for ${constraint}`));
            }
        });
        if (error) return;

        if (_.keys(constraints).length !== dataset.constraints.length - 1)
            return errorHandler(Exception.invalidParam(`ambiguous input. must specify values for ${_.without(dataset.constraints, constraint).join(', ')}`));

        const params = _.assign({
            '$group': constraint,
            '$select': constraint,
            '$order': `${constraint} ASC`
        }, constraints);

        const url = `${variable.url}&${querystring.stringify(params)}`;
        Request.getJSON(url).then(json => {
            const options = json.map(option => {
                const value = option[constraint];
                const params = _.assign({
                    [constraint]: value,
                }, constraints);

                return {
                    constraintValue: value,
                    constraintURL: `${variable.url}&${querystring.stringify(params)}`
                };
            });

            response.json({permutations: options});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

