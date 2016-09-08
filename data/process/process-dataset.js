'use strict';

const _ = require('lodash');

const DatasetView = require('./dataset-view');
const Dataset = require('./dataset');

function processDataset(dataset, rowCallback) {
    const variableIDs = _.keys(dataset.variables);
    const datasetClient = Dataset.fromJSON(dataset);
    const datasetView = new DatasetView(datasetClient, {
        '$select': 'id,variable',
        '$group': 'id,variable',
        '$order': 'id,variable',
        '$where': `(value IS NOT NULL) AND (${whereIn('variable', variableIDs)})`
    });

    return datasetView.all(page => {
        page.forEach(row => {
            rowCallback({
                id: row.id,
                variable: `${dataset.id}.${row.variable}`
            });
        });
    });
}

function whereIn(column, values) {
    return `${column} in(${values.map(quote).join(',')})`;
}

function quote(string) {
    return `'${string}'`;
}

module.exports = processDataset;

