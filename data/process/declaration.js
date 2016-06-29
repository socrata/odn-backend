'use strict';

const _ = require('lodash');
const fs = require('fs');

const declarationSchema = require('./declaration-schema');
const Dataset = require('./dataset');

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

function getDataset(tree, path) {
    if (path.length === 0) return null;
    if (path.length === 1) return tree.datasets[path[0]];
    return getDataset(tree[path[0]], path.slice(1));
}

class Declaration {
    constructor(json) {
        this.topics = json;
    }

    getDataset(datasetID) {
        const path = datasetID.split('.');
        const dataset = getDataset(this.topics, path);
        if (_.isNil(dataset)) return null;
        return Dataset.fromJSON(dataset);
    }

    getVariables(datasetID) {
        const dataset = this.getDataset(datasetID);
        if (_.isNil(dataset)) return null;
    }

    static fromFile(path) {
        const declarationJSON = JSON.parse(fs.readFileSync(path));
        return new Declaration(declarationJSON);
    }
}

module.exports = Declaration;

