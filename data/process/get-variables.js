'use strict';

const Dataset = require('./dataset');
const DatasetView = require('./dataset-view');

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage: get-variables.js {domain} {fxf}');
} else {
    const [domain, fxf] = args;

    const dataset = new Dataset(domain, fxf);
    const datasetView = new DatasetView(dataset, {
        '$select': 'variable',
        '$group': 'variable'
    });

    datasetView.all(page => {
        const variables = page.map(row => row.variable);
        variables.sort();
        const rows = variables.map(variable => `"${variable}": {}`);
        console.log(rows.join(',\n'));
    });
}

