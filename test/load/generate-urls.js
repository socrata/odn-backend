
const _ = require('lodash');
const request = require('request-promise');

const SOQL = require('../../app/soql');
const Constants = require('../../app/constants');

/**
 * Generate random URLs for load testing.
 */

const baseURL = 'http://localhost:3001';

const options = {
    app_token: ['TULfSVvj7mto3wKM3qW8dMj9L'],
    relation_type: ['parent', 'child', 'sibling', 'peer'],
    suggest_type: ['entity', 'category', 'publisher', 'question', 'dataset'],
    search_type: ['question', 'dataset'],
    query: ['seattle', 'crime', 'washington', '', 'a', 'b', 'publisher', 'category', 'health', 'king', 'new york', 'fun', 'cool data', 'wow'],
    dataset_id: ['demographics.population'],
    variable: ['demographics.population.change', 'demographics.population.count'],
    constraint: ['year'],
    forecast: _.range(0, 10),
    describe: ['true', 'false'],
    year: _.range(2010, 2014),
    zoom_level: _.range(1, 18),
    bounds: () => {
        const nwLat = _.random(24.396308, 49.384358, true);
        const seLat = _.random(24.396308, nwLat, true);

        const nwLong = _.random(-124.848974, -66.885444, true);
        const seLong = _.random(nwLong, -66.885444, true);

        return [nwLat, nwLong, seLat, seLong].join(',');
    }
};

const paths = [
    ['suggest/v1/{suggest_type}', ['query']],
    ['search/v1/{search_type}', ['entity_id', 'dataset_id']],
    ['entity/v1', ['entity_id']],
    ['entity/v1/{relation_type}', ['entity_id']],
    ['data/v1/availability', ['entity_id']],
    ['data/v1/constraint/{variable}', ['entity_id', 'constraint']],
    ['data/v1/values', ['variable', 'entity_id', 'forecast']],
    ['data/v1/map/new', ['variable', 'entity_id', 'year']],
    ['data/v1/map/values', ['session_id', 'zoom_level', 'bounds']]
];

function setup() {
    return generateEntities()
        .then(entities => {
            options.entity_id = entities;
            return Promise.resolve();
        })
        .then(() => generateMapSessions(10))
        .then(sessions => {
            options.session_id = sessions;
            return Promise.resolve();
        });
}

function generateEntities() {
    return new SOQL(Constants.ENTITY_URL)
        .token(options.app_token[0])
        .select('id')
        .send()
        .then(entities => {
            return Promise.resolve(entities.map(_.property('id')));
        });
}

function generateMapSessions(n) {
    const path = ['data/v1/map/new', ['variable', 'entity_id', 'year']];
    return Promise.all(_.times(n, () => request(generateURL(path)))).then(responses => {
        return Promise.resolve(responses.map(JSON.parse).map(_.property('session_id')));
    });
}

function generateOption(type) {
    const a = options[type];

    if (_.isArray(a)) return _.sample(options[type]);
    if (_.isFunction(a)) return a.apply(this);
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

function generateURL(tuple) {
    const [path, params] = tuple;
    return `${baseURL}/${generatePath(path)}?${generateParams(params)}`;
}

function randomURL() {
    return generateURL(_.sample(paths));
}

const args = process.argv.slice(2);

if (args.length !== 1) {
    console.log('Usage: node generate-urls.js {n}');
    console.log('  n - number of urls to generate');
} else {
    const [n] = args;

    setup().then(() => {
        _.times(n, randomURL).forEach(url => console.log(url));
        process.exit(0);
    }).catch(error => console.error(error));
}

