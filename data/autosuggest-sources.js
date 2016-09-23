
const _ = require('lodash');

const Constants = require('../app/constants');
const AutosuggestDataset = require('../app/suggest/autosuggest-dataset');
const Sources = require('../app/sources');

const declarations = {
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

const datasets = _.mapValues(declarations, (declaration, id) => {
    return new AutosuggestDataset(id, declaration.domain, declaration.fxf,
        declaration.column, declaration.encoded, declaration.sort,
        declaration.transform);
});

module.exports = datasets;

