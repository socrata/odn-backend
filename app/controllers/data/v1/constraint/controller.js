'use strict';

const _ = require('lodash');

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Availability = require('../availability/availability');

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

        response.json({});
    }).catch(errorHandler);
};

