'use strict';

module.exports = {
    definitions: {
        variable: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                description: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name', 'type'],
            additionalProperties: false
        },

        source: {
            type: 'object',
            properties: {
                name: {type: 'string'},
                url: {type: 'string'},
                source_url: {type: 'string'}
            },
            required: ['name', 'url']
        },

        dataset: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                domain: {type: 'string'},
                fxf: {type: 'string'},
                description: {type: 'string'},
                sources: {
                    type: 'array',
                    items: {'$ref': '#/definitions/source'},
                    minItems: 1
                },
                constraints: {
                    type: 'array',
                    items: {type: 'string'}
                },
                variables: {
                    type: 'object',
                    patternProperties: {
                        '.{1,}': {'$ref': '#/definitions/variable'}
                    }
                }
            },
            required: ['id', 'name', 'domain', 'fxf', 'constraints', 'variables', 'description']
        },

        topic: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Unique identifier for the topic e.g. demographics.population.',
                },
                name: {type: 'string'},
                topics: {
                    type: 'object',
                    patternProperties: {
                        '.{1,}': {'$ref': '#/definitions/topic'}
                    }
                },
                datasets: {
                    type: 'object',
                    patternProperties: {
                        '.{1,}': {'$ref': '#/definitions/dataset'}
                    }
                }
            },
            required: ['id', 'name']
        }
    },

    type: 'object',
    properties: {
        topics: {
            type: 'object',
            patternProperties: {
                '.{1,}': {'$ref': '#/definitions/topic'}
            }
        },
        required: ['topics']
    }
};

