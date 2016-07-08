
const _ = require('lodash');

const Constants = require('../app/constants');
const AutosuggestDataset = require('../app/suggest/autosuggest-dataset');
const Sources = require('../app/sources');

const declarations = {
    entity: {
        domain: Constants.ODN_DATA_DOMAIN,
        fxf: '68ht-6puw',
        column: 'all',
        encoded: ['id', 'type', 'population'],
        sort: option => -parseFloat(option.fields.population),
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
        sort: option => {
            const population = parseFloat(option.fields.regionPopulation);
            const index = parseFloat(option.fields.index);
            return -(population - index);
        },
        transform: option => {
            const datasetID = option.fields.vector;
            const topicID = Sources.getTopic(datasetID);
            let variableID = option.fields.metric;

            const constraints = {};

            if (datasetID === 'occupations') {
                constraints.occupation = occupationNames[variableID] || variableID;
                variableID = 'percent_employed';
            }

            return _.assign({
                entity: {
                    id: option.fields.regionID,
                    name: option.fields.regionName
                },
                variable_id: [topicID, datasetID, variableID].join('.'),
                variable_name: option.fields.variable,
                text: `What is the ${option.fields.variable} of ${option.fields.regionName}?`
            }, _.isEmpty(constraints) ? {} : {constraints});
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

function urlEscape(string) {
    return string
        .replace(/,/g, '')
        .replace(/[ \/]/g, '_');
}

function path(elements) {
    return `http://opendatanetwork.com/${elements.map(urlEscape).join('/')}`;
}

const datasets = _.mapValues(declarations, declaration => {
    return new AutosuggestDataset(declaration.domain, declaration.fxf,
        declaration.column, declaration.encoded, declaration.sort,
        declaration.transform);
});

module.exports = datasets;

