'use strict';

const _ = require('lodash');
const fs = require('fs');

function get(tree, path) {
    if (path.length === 0) {
        return null;
    } else if (path.length === 1) {
        const id = path[0];
        return _.find(tree, {id});
    } else {
        const topicID = path[0];
        const topic = _.find(tree, {id: topicID});
        if (_.isNil(topic)) return topic;

        const topics = topic.topics || [];
        const datasets = topic.datasets || [];
        const subPath = path.slice(1);
        return get(topics.concat(datasets), subPath);
    }
}

function search(tree, path) {
    if (_.isNil(tree)) return [];

    if (path.length === 0) {
        return tree;
    } else if (path.length === 1) {
        const id = path[0];
        return [_.find(tree, {id})];
    } else {
        const id = path[0];
        const subpath = path.slice(1);

        return tree
            .filter(node => node.id === id)
            .map(node => {
                const filteredNode = _.cloneDeep(node);
                if (filteredNode.topics)
                    filteredNode.topics = search(node.topics, subpath);
                if (filteredNode.datasets)
                    filteredNode.datasets = search(node.datasets, subpath);
                if (filteredNode.variables)
                    filteredNode.variables = search(node.variables, subpath);

                return filteredNode;
            });
    }
}

function trim(tree, path) {
    if (_.isNil(tree)) return tree;
    if (path.length === 0) return tree;

    const id = path[0];
    const subtree = tree[id];
    if (path.length === 1) return {[id]: subtree};

    const subpath = path.slice(1);
    if ('topics' in subtree) subtree.topics = trim(subtree.topics, subpath);
    if ('variables' in subtree) subtree.variables = trim(subtree.variables, subpath);
    if ('datasets' in subtree) subtree.datasets = trim(subtree.datasets, subpath);

    return tree;
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

class Sources {
    constructor(json) {
        this.topics = mapTree(json, (value, key, parents) => {
            if (!_.includes(['topics', 'datasets', 'variables'], key)) {
                const path = parents.length === 0 ? key :
                    `${_.last(parents).id}.${key}`;

                const augmented = _.assign(value, {id: path});
                if ('variables' in value)
                    augmented.url = `https://${value.domain}/resource/${value.fxf}.json`;

                return augmented;
            }
            return value;
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

        return _.merge.apply(this, trees);
    }

    mapVariables(tree, iteratee) {
        return mapTree(tree, (value, key, parents) => {
            const isLeaf = !_.some(_.values(value).map(_.isObject));
            if (isLeaf) return iteratee(value, key, parents);
            return value;
        });
    }

    getDataset(datasetID) {
        const path = getPath(datasetID);
        return get(this.topics, path) || {};
    }

    getTree(datasetIDs) {
        const paths = datasetIDs.map(getPath);
    }

    static fromFile(path) {
        const declarationJSON = JSON.parse(fs.readFileSync(path));
        return new Sources(declarationJSON);
    }
}

module.exports = Sources.fromFile('data/sources-map.json');

