'use strict';

const _ = require('lodash');
const fs = require('fs');
const stringify = require('csv-stringify');

const DatasetView = require('./dataset-view');
const Dataset = require('./dataset');

const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: transpose.js {dataset domain} {nbe dataset fxf} {output file} {optional fields in each row}');
    return;
}

const [domain, fxf, path] = args;
const fields = args.length === 3 ?
    ['id', 'name', 'type', 'year'] :
    args.slice(3);

const dataset = new Dataset(domain, fxf);
const view = new DatasetView(dataset, {});

const variableFields = ['variable', 'value'];

const output = fs.createWriteStream(path);

function writeRow(values) {
    stringify([values], (error, data) => {
        output.write(data);
    });
}

writeRow(fields.concat(variableFields));

view.all(rows => {
    console.log(`processing ${rows.length} rows...`);

    rows.forEach(row => {
        const fieldValues = fields.map(_.propertyOf(row));
        const variables = _.xor(fields, _.keys(row));

        variables.forEach(variable => {
            const values = fieldValues.concat([variable, row[variable]]);
            writeRow(values);
        });
    });
});

