
const variableSchema = {
    definitions: {
        entity: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name', 'type']
        },

        variable: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                url: {type: 'string'}
            },
            required: ['id', 'name', 'url']
        },

        dataset: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                domain: {type: 'string'},
                fxf: {type: 'string'},
                constraints: {
                    type: 'array',
                    items: {type: 'string'}
                },
                variables: {
                    type: 'array',
                    items: {'$ref': '#/definitions/variable'}
                }
            },
            required: ['id', 'name', 'domain', 'fxf', 'constraints', 'variables']
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
                    type: 'array',
                    description: 'Subtypes of this type.',
                    items: {'$ref': '#/definitions/topic'}
                },
                datasets: {
                    type: 'array',
                    description: 'Datasets associated with this type.',
                    items: {'$ref': '#/defintions/dataset'}
                }
            },
            required: ['id', 'name']
        }
    },

    type: 'object',
    properties: {
        entities: {
            type: 'array',
            items: {'$ref': '#/definitions/entity'}
        },
        topics: {
            type: 'array',
            items: {'$ref': '#/definitions/topic'}
        },
        required: ['entities', 'topics']
    }
};

