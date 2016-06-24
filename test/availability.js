
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function availability(path) {
    return get(`http://localhost:3001/data/v1/availability/${path}`);
}

const availabilitySchema = {
    definitions: {
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
        topics: {
            type: 'array',
            items: {'$ref': '#/definitions/topic'}
        },
        required: ['topics']
    }
};

describe('/data/v1/availability', () => {
    it('should require id', () => {
        return expect(availability('')).to.have.status(422);
    });

    it('should not accept an invalid id', () => {
        return expect(availability('?id=invalid-id')).to.have.status(404);
    });

    it('should not accept a valid id followed by an invalid id', () => {
        return expect(availability('?id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should not accept an invalid id followed by a valid id', () => {
        return expect(availability('?id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should accept two valid ids', () => {
        return expect(availability('?id=0100000US,0400000US53')).to.have.status(200);
    });

    it('should accept two valid ids with some white space', () => {
        return expect(availability('?id=    0100000US   ,      0400000US53 ')).to.have.status(200);
    });

    it('should find available data for washington state', () => {
        return availability('?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': [
                    {
                        'id': 'demographics',
                        'name': 'Demographics',
                        'datasets': [
                            {
                                'id': 'demographics.population',
                                'name': 'Population',
                                'domain': 'odn.data.socrata.com',
                                'fxf': '1234-abcd',
                                'constraints': ['year', 'age'],
                                'variables': [
                                    {
                                        'id': 'demographics.population.count',
                                        'name': 'Population Count',
                                        'url': "https://odn.data.socrata.com/resource/1234-abcd?variable=count&$where=id in('0100000US','0400000US53')"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        });
    });
});

