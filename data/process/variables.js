'use strict';

const Declaration = require('./declaration');
const DatasetView = require('./dataset-view');
const CSVWriter = require('./csv-writer');

const args = process.argv.slice(2);

if (args.length !== 3) {
    console.log('Usage: variables.js {declarationFile} {datasetID} {outputFile}');
} else {
    const [declarationFile, datasetID, outputFile] = args;

    const declaration = Declaration.fromFile(declarationFile);
    const dataset = declaration.getDataset(datasetID);
    console.log(`found dataset: ${dataset.domain}:${dataset.fxf}`);

    const datasetView = new DatasetView(dataset, {
        '$select': 'id,variable'
    });
    const csvWriter = new CSVWriter(outputFile, ['id', 'variable']);

    let rowsProcessed = 0;
    datasetView.all(page => {
        rowsProcessed += page.length;
        console.log(`processed ${rowsProcessed} rows...`);

        page.forEach(row => {
            row.variable = `${datasetID}.${row.variable}`;
            csvWriter.appendObject(row);
        });
    });
}

