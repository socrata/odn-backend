

const _ = require('lodash');
const mkdirp = require('mkdirp');

const Sources = require('../../app/sources');
const CSVWriter = require('./csv-writer');
const processDataset = require('./process-dataset');

const args = process.argv.slice(2);

if (args.length !== 1) {
    console.log('Usage: all-variables.js {directory}');
} else {
    const [directory] = args;

    mkdirp.sync(directory);

    const counts = {};

    _.values(Sources.topics).forEach(topic => {
        _.values(topic.datasets).forEach(dataset => {
            const path = `${directory}/${dataset.id.replace(/\W/, '-')}.csv`;
            const writer = new CSVWriter(path, ['id', 'variable', 'row_id']);
            counts[dataset.id] = 0;

            processDataset(dataset, row => {
                counts[dataset.id]++;
                if (counts[dataset.id] % 10000 === 0) printStatus(counts);

                row.row_id = [row.id, row.variable].join('-');
                writer.appendObject(row);
            }).then(() => {
                counts[dataset.id] = -1;
            }).catch(error => {
                throw error;
            });
        });
    });
}

function printStatus(counts) {
    console.log(counts);
}

