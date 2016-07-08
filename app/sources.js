'use strict';

const _ = require('lodash');
const fs = require('fs');

const Constants = require('../app/constants');

function trim(tree, path) {
    if (path.length === 0) return tree;

    const id = path[0];
    if (path.length === 1) {
        const subtree = id in tree ? _.pick(tree, [id]) : null;
        return subtree;
    }

    const subtree = tree[id];
    if (_.isNil(subtree)) return null;
    const recurseFields = ['topics', 'datasets', 'variables'];
    const trimmed = _.omit(subtree, recurseFields);
    const subpath = path.slice(1);

    let good = false;
    recurseFields.forEach(field => {
        if (field in subtree) {
            const trimmedSubtree = trim(subtree[field], subpath);
            if (!_.isNil(trimmedSubtree)) {
                trimmed[field] = trimmedSubtree;
                good = true;
            }
        }
    });

    return good ? {[id]: trimmed} : null;
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

    search(datasetID) {
        return trim(this.getTopics(), getPath(datasetID));
    }

    searchMany(datasetIDs) {
        const trees = datasetIDs.map(id => this.search(id));
        if (_.some(trees, _.isNil)) return null;
        return _.merge.apply(this, trees);
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

