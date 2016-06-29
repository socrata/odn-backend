'use strict';

const _ = require('lodash');
const fs = require('fs');
const stringify = require('csv-stringify');

const DatasetView = require('./dataset-view');
const Dataset = require('./dataset');

const args = process.argv.slice(2);

if (args.length < 3 || args.length > 5) {
    console.log('Usage: transpose.js {dataset domain} {nbe dataset fxf} {output file} "{optional: fields}" "{optional: ignored variables}"');
    return;
}

const [domain, fxf, path] = args;
const fields = args.length < 4 ? ['id', 'name', 'type', 'year'] : args[3].split(',');
const ignoredVariables = args.length < 5 ? [] : args[4].split(',');

const dataset = new Dataset(domain, fxf);
const view = new DatasetView(dataset, {});

const variableFields = ['variable', 'value'];

const output = fs.createWriteStream(path);

function writeRow(values) {
    stringify([values], (error, data) => {
        if (_.isNil(error)) output.write(data);
    });
}

writeRow(fields.concat(variableFields));

view.all(rows => {
    console.log(`processing ${rows.length} rows...`);

    rows.forEach(row => {
        const fieldValues = fields.map(_.propertyOf(row));
        const variables = _.xor(fields, _.keys(row))
            .filter(variable => !_.includes(ignoredVariables, variable));

        variables.forEach(variable => {
            const values = fieldValues.concat([variable, row[variable]]);
            writeRow(values);
        });
    });
});

