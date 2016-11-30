
// Genrate autosuggest from entities.

const _ = require('lodash');
const csv = require('fast-csv');
const fs = require('fs');

const Config = require('../../app/config');

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage: suggest-entity.js {entityPath} {outputPath}');
    console.log('  entityPath - path to a CSV file containing entities to process');
    console.log('  outputPath - path to a CSV file to output autosuggest');
} else {
    const [entityPath, outputPath] = args;

    csv
        .fromPath(entityPath, {headers: true})
        .transform(entity => {
            const name = entity.name;

            const fields = [entity.id, entity.type, entity.rank]
                .join(Config.suggest_separator);
            const encoded = new Buffer(fields).toString('base64');

            return {name: `${entity.name} ${encoded}`};
        })
        .pipe(csv.createWriteStream({headers: true}))
        .pipe(fs.createWriteStream(outputPath));
}

