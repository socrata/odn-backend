'use strict';

const _ = require('lodash');

const Sources = require('../../app/sources');
const CSVWriter = require('./csv-writer');
const processDataset = require('./process-dataset');

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage: variables.js {datasetID} {outputFile}');
} else {
    const [datasetID, outputFile] = args;

    const topicTree = Sources.search(datasetID);
    if (_.isNil(topicTree)) return console.error(`error: topic not found: ${datasetID}`);
    if (_.size(topicTree) !== 1) return console.error(`error: expected path to single dataset: ${datasetID}`);
    const topic = _.values(topicTree)[0];

    if (_.isEmpty(topic.datasets)) return console.error(`error: dataset not found: ${datasetID}`);
    if (_.size(topic.datasets) !== 1) return console.error(`error: expected path to dataset: ${datasetID}`);
    const dataset = _.values(topic.datasets)[0];
    const variableIDs = _.keys(dataset.variables);

    console.log(`found dataset: ${dataset.domain}:${dataset.fxf}`);
    console.log(`loading variables: ${variableIDs.join(', ')}`);

    const writer = new CSVWriter(outputFile, ['id', 'variable', 'row_id']);
    let rowsProcessed = 0;

    processDataset(dataset, row => {
        rowsProcessed++;
        if (rowsProcessed % 10000 === 0) console.log(`processed ${rowsProcessed} rows...`);

        row.row_id = [row.id, row.variable].join('-');
        writer.appendObject(row);
    }).then(() => {
        console.log('done');
    }).catch(error => {
        throw error;
    });
}

