
const _ = require('lodash');

/**
 * Generate random URLs for load testing.
 */

const baseURL = 'http://localhost:3001';

const options = {
    app_token: ['TULfSVvj7mto3wKM3qW8dMj9L'],
    entity_id: ['0100000US', '0400000US53'],
    relation_type: ['parent', 'child', 'sibling', 'peer'],
    suggest_type: ['entity', 'category', 'publisher', 'question', 'dataset'],
    search_type: ['question', 'dataset'],
    query: ['seattle'],
    dataset_id: ['demographics.population'],
    variable: ['demographics.population.change', 'demographics.population.count'],
    constraint: ['year'],
    forecast: _.range(0, 10),
    describe: ['true', 'false'],
    year: _.range(2010, 2014)
};


const paths = [
    ['suggest/v1/{suggest_type}', ['query']],
    ['search/v1/{search_type}', ['entity_id', 'dataset_id']],
    ['entity/v1', ['entity_id']],
    ['entity/v1/{relation_type}', ['entity_id']],
    ['data/v1/availability', ['entity_id']],
    ['data/v1/constraint/{variable}', ['entity_id', 'constraint']],
    ['data/v1/values', ['variable', 'entity_id', 'forecast']],
    ['data/v1/map/new', ['variable', 'entity_id', 'year']]
];

function generateOption(type) {
    return _.sample(options[type]);
}

function generateParams(types) {
    types = types.concat(['app_token']);

    return _(types)
        .map(generateOption)
        .zip(types)
        .map(_.reverse)
        .map(parts => parts.join('='))
        .value()
        .join('&');
}

function generatePath(path) {
    return path.replace(/\{([^\{]*)\}/g, (match, optionType) => {
        return generateOption(optionType);
    });
}

function generateURL() {
    const [path, params] = _.sample(paths);

    return `${baseURL}/${generatePath(path)}?${generateParams(params)}`;
}


const args = process.argv.slice(2);

if (args.length !== 1) {
    console.log('Usage: node generate-urls.js {n}');
    console.log('  n - number of urls to generate');
} else {
    const [n] = args;

    _.times(n, generateURL).forEach(url => console.log(url));
}

