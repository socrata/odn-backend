'use strict';

const _ = require('lodash');
const fs = require('fs');
const request = require('request-promise');

const declarationSchema = require('./declaration-schema');
const Request = require('../../app/request');

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

class DatasetView {
    constructor(dataset, params) {
        this.dataset = dataset;
        this.params = params;
        this.pageSize = 50000;
        this.pageNumber = 0;
        this.done = false;
    }

    /**
     * Get a promise with the next page of results in the view.
     */
    next() {
        return new Promise((resolve, reject) => {
            if (this.done) {
                reject('done');
            } else {
                this.dataset.getPage(this.pageNumber, this.pageSize, this.params).then(results => {
                    if (results.length < this.pageSize) this.done = true;
                    resolve(results);
                }).catch(reject);

                this.pageNumber++;
            }
        });
    }

    /**
     * Pipe the entire view to the given callback.
     */
    all(callback) {
        this.next().then(response => {
            callback(response);
            this.all(callback);
        }).catch(error => {
            if (error !== 'done') console.log(error);
        });
    }

    rowsProcessed() {
        return this.pageSize * this.pageNumber;
    }
}

class Dataset {
    constructor(domain, fxf) {
        this.domain = domain;
        this.fxf = fxf;
        this.path = `https://${domain}/resource/${fxf}.json`;
    }

    getPage(pageNumber, pageSize, params) {
        const url = Request.buildURL(this.path, _.assign({}, params, {
            '$offset': pageNumber * pageSize,
            '$limit': pageSize
        }));

        return new Promise((resolve, reject) => {
            request(url).then(response => {
                resolve(JSON.parse(response.toString()));
            }).catch(reject);
        });
    }

    static fromJSON(json) {
        return new Dataset(json.domain, json.fxf);
    }
}

class Declaration {
    constructor(json) {
        this.topics = json;
    }

    getDataset(datasetID) {
        const path = datasetID.split('.');
        const dataset = get(this.topics, path);
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

class CSVWriter {
    constructor(path, fields) {
        this.path = path;
        this.fields = fields;
        this.append(fields);
    }

    append(values) {
        const rowString = values.map(value => `"${value}"`).join(',');
        fs.appendFileSync(this.path, `${rowString}\n`);
    }

    appendObject(object) {
        const values = _.map(this.fields, field => object[field]);
        this.append(values);
    }
}

const declaration = Declaration.fromFile('declaration.json');

const datasetID = 'demographics.population';
const dataset = declaration.getDataset(datasetID);
const datasetView = new DatasetView(dataset, {
    '$select': 'id,variable'
});

const csvWriter = new CSVWriter('variables.csv', ['id', 'variable']);
datasetView.all(page => {
    console.log(`processed ${datasetView.rowsProcessed()} rows...`);

    page.forEach(row => {
        row.variable = `${datasetID}.${row.variable}`;
        csvWriter.appendObject(row);
    });
});

