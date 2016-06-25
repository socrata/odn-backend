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
                return _.assign({}, node, {
                    topics: search(node.topics, subpath),
                    datasets: search(node.datasets, subpath)
                });
            });
    }
}

function getPath(id) {
    return id.split('.');
}

class Sources {
    constructor(json) {
        this.topics = json;
    }

    search(datasetID) {
        return search(this.topics, getPath(datasetID));
    }

    searchMany(datasetIDs) {
        const trees = datasetIDs.map(id => this.search(id));

        return _.merge.apply(this, trees);
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

module.exports = Sources.fromFile('data/sources.json');

