'use strict';

const _ = require('lodash');
const fs = require('fs');
const util = require('util');

const Constants = require('../app/constants');

/**
 * Paths must all be the same length.
 */
function pick(tree, paths) {
    if (_.isEmpty(paths)) return tree;
    if (_.isEmpty(tree) && !_.isEmpty(paths)) return null;

    const o = {};

    const grouped = _(paths)
        .filter(_.negate(_.isEmpty))
        .groupBy(_.first)
        .value();

    let invalid = false;
    _.forIn(grouped, (subpaths, key) => {
        if (!(key in tree)) {
            invalid = true;
            return;
        }

        subpaths = subpaths.map(_.tail);
        const subtree = tree[key];
        if (subpaths[0].length === 0) {
            o[key] = subtree;
            return;
        }

        const recurse = ['datasets', 'variables', 'topics']
            .filter(field => field in subtree);
        if (recurse.length === 0) {
            invalid = true;
            return;
        }
        o[key] = _.omit(subtree, recurse);

        recurse.forEach(field => {
            const pickedSubtree = pick(subtree[field], subpaths);
            if (_.isNil(pickedSubtree)) {
                invalid = true;
                return;
            }

            o[key][field] = pickedSubtree;
        });
    });

    return invalid ? null : o;
}

function mapTree(tree, iteratee, parents) {
    parents = parents || [];
    parents = parents.slice(0);
    if ('topics' in tree || 'datasets' in tree || 'variables' in tree)
        parents.push(tree);

    return _.mapValues(tree, (value, key) => {
        if (_.isPlainObject(value)) {
            return mapTree(iteratee(value, key, parents), iteratee, parents);
        } else {
            return value;
        }
    });
}

function getPath(id) {
    return id.split('.');
}

function formatName(id) {
    return id
        .replace(/[_-]/g, ' ')
        .replace(/\b(\w)(\w{3,})/g, (all, first, rest) => `${first.toUpperCase()}${rest}`)
        .replace(/\b\d+\b/g, number => parseInt(number).toLocaleString());
}

function readJSON(path) {
    return JSON.parse(fs.readFileSync(path));
}

class Sources {
    constructor(json, attributions) {
        this.topics = mapTree(json, (value, key, parents) => {
            if (!_.includes(['topics', 'datasets', 'variables'], key)) {
                value.id = parents.length === 0 ? key : `${_.last(parents).id}.${key}`;

                if (!('name' in value))
                    value.name = formatName(key);
            }

            return value;
        });

        this.topics = this.mapDatasets(this.topics, dataset => {
            if (!('domain' in dataset))
                dataset.domain = Constants.ODN_DATA_DOMAIN;
            if (!('searchTerms' in dataset))
                dataset.searchTerms = [];
            if (!('description' in dataset))
                dataset.description = '';

            dataset.url = `https://${dataset.domain}/resource/${dataset.fxf}.json`;
            dataset.sources = dataset.sources.map(source => {
                if (_.isArray(source))
                    return _.assign({}, attributions[source[0]], {source_url: source[1]});
                return attributions[source];
            });

            return dataset;
        });

        this.topics = this.mapVariables(this.topics, variable => {
            if (!('type' in variable))
                variable.type = 'number';

            return variable;
        });
    }

    getTopics() {
        return _.cloneDeep(this.topics);
    }

    search(id) {
        return this.searchMany([id]);
    }

    searchMany(ids) {
        return pick(this.topics, ids.map(getPath));
    }

    mapVariables(tree, iteratee) {
        return mapTree(tree, (value, key, parents) => {
            if (parents.length === 0) return value;
            const parentNode = _.last(parents);
            const isVariable = 'variables' in parentNode &&
                key in parentNode.variables;
            if (isVariable) return iteratee(value, key, parents);
            return value;
        });
    }

    mapDatasets(tree, iteratee) {
        return mapTree(tree, (value, key, parents) => {
            if ('variables' in value)
                return iteratee(value, key, parents);
            return value;
        });
    }

    getTopic(datasetID) {
        return _.findKey(this.topics, topic => datasetID in topic.datasets);
    }

    static fromFile(sourcePath, attributionPath) {
        return new Sources(readJSON(sourcePath), readJSON(attributionPath));
    }
}

module.exports = Sources.fromFile('data/sources.json', 'data/attributions.json');

