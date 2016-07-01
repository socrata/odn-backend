
const _ = require('lodash');

const Constants = require('../app/constants');
const AutosuggestDataset = require('../app/controllers/suggest/autosuggest-dataset');

const declarations = {
    entity: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: '68ht-6puw',
        column: 'all',
        encoded: ['id', 'type', 'population'],
        sort: [['population'], ['desc']],
        transform: option => {
            return {
                id: option.fields.id,
                name: option.text,
                type: `region.${option.fields.type}`
            };
        }
    },

    question: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: '234x-8y9w',
        column: 'question',
        encoded: ['regionName', 'regionID', 'regionPopulation',
                  'vector', 'source', 'variable', 'metric', 'index'],
        sort: [['population', 'index'], ['desc', 'desc']],
        transform: option => {
            return {
                text: `What is the ${option.fields.variable} of ${option.fields.regionName}?`,
                variable: [option.fields.source, option.fields.variable].join('.'),
                entity: {
                    id: option.fields.regionID,
                    name: option.fields.regionName,
                }
            };
        }
    },

    dataset: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: 'fpum-bjbr',
        column: 'encoded',
        encoded: ['domain', 'fxf'],
        transform: option => {
            return {
                name: option.text,
                domain: option.fields.domain,
                fxf: option.fields.fxf
            };
        }
    },

    publisher: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: '8ae5-ghum',
        column: 'domain',
        transform: option => {
            return {
                name: option.text
            };
        }
    },

    category: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: '864v-r7tf',
        column: 'category',
        transform: option => {
            return {
                name: option.text
            };
        }
    }
};

const datasets = _.mapValues(declarations, declaration => {
    return new AutosuggestDataset(declaration.domain, declaration.fxf,
        declaration.column, declaration.encoded, declaration.sort,
        declaration.transform);
});

module.exports = datasets;

