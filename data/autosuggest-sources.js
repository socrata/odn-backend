
const _ = require('lodash');

const Config = require('../app/config');
const AutosuggestDataset = require('../app/suggest/autosuggest-dataset');
const Sources = require('../app/sources');

const declarations = {
    entity: {
        domain: Config.odn_data_domain,
        fxf: 's2z5-sxuw',
        column: 'name',
        encoded: ['id', 'type', 'rank'],
        sort: option => -parseFloat(option.fields.rank),
        transform: option => {
            return {
                id: option.fields.id,
                name: option.text,
                type: option.fields.type
            };
        }
    },

    question: {
        domain: Config.odn_data_domain,
        fxf: 'arys-69tf',
        column: 'question',
        encoded: ['regionName', 'regionID', 'regionPopulation',
                  'vector', 'source', 'variable', 'metric', 'index'],
        sort: option => {
            const population = parseFloat(option.fields.regionPopulation);
            const index = parseFloat(option.fields.index);
            return -(population - index);
        },
        transform: option => {
            return {
                entity: {
                    id: option.fields.regionID,
                    name: option.fields.regionName
                },
                vector: option.fields.vector,
                metric: option.fields.metric,
                variable_name: option.fields.variable,
                text: `What is the ${option.fields.variable} of ${option.fields.regionName}?`
            };
        }
    },

    dataset: {
        domain: Config.odn_data_domain,
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
        domain: Config.odn_data_domain,
        fxf: '8ae5-ghum',
        column: 'domain',
        transform: option => {
            return {
                name: option.text
            };
        }
    },

    category: {
        domain: Config.odn_data_domain,
        fxf: '864v-r7tf',
        column: 'category',
        transform: option => {
            return {
                name: option.text
            };
        }
    }
};

const occupationNames = {
    'media': 'Media',
    'engineering': 'Engineering',
    'office_and_administration': 'Office and Administration',
    'health_support': 'Health Support',
    'sales': 'Sales',
    'social_sciences': 'Social Sciences',
    'healthcare': 'Healthcare',
    'computers_and_math': 'Computers and Math',
    'repair': 'Repair',
    'material_moving': 'Material Moving',
    'construction_and_extraction': 'Construction and Extraction',
    'fire_fighting': 'Fire Fighting',
    'social_services': 'Social Services',
    'production': 'Production',
    'management': 'Management',
    'personal_care': 'Personal Care',
    'education': 'Education',
    'health_technicians': 'Health Technicians',
    'transportation': 'Transportation',
    'law_enforcement': 'Law Enforcement',
    'janitorial': 'Janitorial',
    'food_service': 'Food Service',
    'farming_fishing_forestry': 'Farming, Fishing, Foresty',
    'legal': 'Legal',
    'business_and_finance': 'Business and Finance'
};

const datasets = _.mapValues(declarations, (declaration, id) => {
    return new AutosuggestDataset(id, declaration.domain, declaration.fxf,
        declaration.column, declaration.encoded, declaration.sort,
        declaration.transform);
});

module.exports = datasets;

