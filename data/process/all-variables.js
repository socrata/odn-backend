

const _ = require('lodash');
const mkdirp = require('mkdirp');
const clear = require('clear');

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
    const completed = [];
    let hasError = false;

    _.values(Sources.topics).forEach(topic => {
        _.values(topic.datasets).forEach(dataset => {
            const path = `${directory}/${dataset.id.replace(/\W/, '-')}.csv`;
            const writer = new CSVWriter(path, ['id', 'variable', 'row_id']);
            counts[dataset.id] = 0;

            processDataset(dataset, row => {
                counts[dataset.id]++;
                if (counts[dataset.id] % 10000 === 0 && !hasError)
                    printStatus(counts, completed);

                row.row_id = [row.id, row.variable].join('-');
                writer.appendObject(row);
            }).then(() => {
                delete counts[dataset.id];
                completed.push(dataset.id);
                printStatus(counts, completed);
            }).catch(error => {
                hasError = true;
                throw error;
            });
        });
    });
}

function printStatus(counts, completed) {
    clear();

    if (_.size(counts) > 0) console.log(`processing ${_.size(counts)} datasets: `);
    _.forOwn(counts, (count, dataset) => {
        console.log(`  ${dataset}: ${count}`);
    });

    if (completed.length > 0) console.log(`completed processing ${completed.length} datasets: `);
    completed.forEach(dataset => {
        console.log(`  ${dataset}`);
    });

}

