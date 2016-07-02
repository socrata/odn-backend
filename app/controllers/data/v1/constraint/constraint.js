'use strict';

const _ = require('lodash');

const Availability = require('../availability/availability');
const Exception = require('../../../error');

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

function getVariable(dataset, path) {
    if (_.isNil(dataset)) return null;
    const id = _.last(path);
    return dataset.variables[id];
}

class Constraint {
    static parseID(entities, variableID) {
        const path = variableID.split('.');
        const topicTree = Availability.topicTree([variableID], entities);
        const dataset = getDataset(topicTree, path);
        const variable = getVariable(dataset, path);

        return [dataset, variable];
    }

    static validateConstraints(dataset, constraint, constraints) {
        return new Promise((resolve, reject) => {
            _.forIn(constraints, (value, name) => {
                if (!_.includes(dataset.constraints, name))
                    reject(Exception.notFound(`invalid constraint: ${name}.
                        Must be one of: ${dataset.constraints.join(', ')}`));
                if (name === constraint)
                    reject(Exception.invalidParam(`cannot specify a
                        value for ${constraint}`));
            });

            resolve();
        });
    }
}

module.exports = Constraint;

