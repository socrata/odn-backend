'use strict';

const _ = require('lodash');

const Sources = require('../../app/sources');
const DatasetView = require('./dataset-view');
const Dataset = require('./dataset');
const CSVWriter = require('./csv-writer');

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
    const datasetJSON = _.values(topic.datasets)[0];

    console.log(`found dataset: ${datasetJSON.domain}:${datasetJSON.fxf}`);

    const dataset = Dataset.fromJSON(datasetJSON);
    const datasetView = new DatasetView(dataset, {
        '$select': 'id,variable',
        '$group': 'id,variable',
        '$where': 'value IS NOT NULL'
    });
    const csvWriter = new CSVWriter(outputFile, ['id', 'variable']);

    let rowsProcessed = 0;
    datasetView.all(page => {
        rowsProcessed += page.length;
        console.log(`processed ${rowsProcessed} variables...`);

        page.forEach(row => {
            row.variable = `${datasetID}.${row.variable}`;
            csvWriter.appendObject(row);
        });
    });
}

