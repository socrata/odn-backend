'use strict';

const _ = require('lodash');
const fs = require('fs');
const util = require('util');

const Constants = require('./constants');
const name = require('./name');
const pick = require('./pick');

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

function readJSON(path) {
    return JSON.parse(fs.readFileSync(path));
}

class Sources {
    constructor(json, attributions) {
        this.topics = mapTree(json, (value, key, parents) => {
            if (!_.includes(['topics', 'datasets', 'variables'], key)) {
                value.id = parents.length === 0 ? key : `${_.last(parents).id}.${key}`;

                if (!('name' in value))
                    value.name = name(key);
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
            dataset.constraintOrdering = _.fromPairs(dataset.constraints.filter(_.isArray));
            dataset.constraints = dataset.constraints.map(stringOrTuple => {
                if (_.isArray(stringOrTuple)) return _.first(stringOrTuple);
                return stringOrTuple;
            });

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

    variables() {
        return _.flatMap(_.values(this.topics), topic => {
            return _.flatMap(_.values(topic.datasets), dataset => {
                return _.values(dataset.variables).map((variable, index) => {
                    variable.rank = index;
                    return variable;
                });
            });
        });
    }

    static fromFile(sourcePath, attributionPath) {
        return new Sources(readJSON(sourcePath), readJSON(attributionPath));
    }
}

function path(relative) {
    return `${__dirname}/${relative}`;
}

module.exports = Sources.fromFile(path('../data/sources.json'), path('../data/attributions.json'));

