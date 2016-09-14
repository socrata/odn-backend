'use strict';

const _ = require('lodash');

const recurseFields = ['datasets', 'variables', 'topics'];

/**
 * Paths must all be of length level.
 */
function pick(tree, paths, level) {
    level = level || 3;
    if (_.isEmpty(paths)) return tree;
    if (_.isEmpty(tree) && !_.isEmpty(paths)) return null;
    if (!_.isEmpty(paths.filter(path => path.length > level)))
        return null;

    const currentPaths = new Set(paths.map(_.first));
    const recurse = _.keys(tree).filter(key => currentPaths.has(key));

    if (level === 1) return _.pick(tree, recurse);

    const subpaths = paths.map(_.tail).filter(_.negate(_.isEmpty));

    const result = {};

    recurse.forEach(field => {
        const picked = {};

        recurseFields.forEach(recurseField => {
            const subtree = pick(tree[field][recurseField], subpaths, level - 1);
            if (_.size(subtree)) picked[recurseField] = subtree;
        });

        if (_.size(picked) === 0) return;

        _.assign(picked, _.omit(tree[field], recurseFields));
        result[field] = picked;
    });

    if (_.size(result)) return result;
    return null;
}

module.exports = pick;

