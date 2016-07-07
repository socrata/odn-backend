
const _ = require('lodash');
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

const availabilitySchema = require('../data/process/declaration-schema');

function availability(path) {
    return get(`http://localhost:3001/data/v1/availability/${path}`);
}

describe('/data/v1/availability', () => {
    it('should require id', () => {
        return expect(availability('')).to.have.status(422);
    });

    it('should not accept an invalid id', () => {
        return expect(availability('?entity_id=invalid-id')).to.have.status(404);
    });

    it('should not accept a valid id followed by an invalid id', () => {
        return expect(availability('?entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should not accept an invalid id followed by a valid id', () => {
        return expect(availability('?entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should accept two valid ids', () => {
        return expect(availability('?entity_id=0100000US,0400000US53')).to.have.status(200);
    });

    it('should accept two valid ids with some white space', () => {
        return expect(availability('?entity_id=    0100000US   ,      0400000US53 ')).to.have.status(200);
    });

    it('should find available data for the united states and washington state', () => {
        return availability('?entity_id=0100000US,0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': {
                    'demographics': {
                        'id': 'demographics',
                        'name': 'Demographics',
                        'datasets': {
                            'population': {
                                'id': 'demographics.population',
                                'name': 'Population',
                                'domain': 'odn.data.socrata.com',
                                'fxf': '9jg8-ki9x',
                                'constraints': ['year'],
                                'variables': {
                                    'count': {
                                        'id': 'demographics.population.count',
                                        'name': 'Population Count',
                                        'url': "https://odn.data.socrata.com/resource/9jg8-ki9x.json?variable=count&%24where=id%20in('0100000US'%2C'0400000US53')",
                                    },
                                    'change': {
                                        'id': 'demographics.population.change',
                                        'name': 'Population Change',
                                        'description': 'Percent change from the previous year'
                                    }
                                }
                            }
                        }
                    }
                }
            });
        });
    });

    it('should find population and education expenditure data for washington state', () => {
        return availability('?entity_id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': {
                    'demographics': {
                        'datasets': {
                            'population': {}
                        }
                    },
                    'education': {
                        'datasets': {
                            'education_expenditures': {}
                        }
                    }
                }
            });
        });
    });

    it('should find population and education expenditure data for washington, colorado, and montana', () => {
        return availability('?entity_id=0400000US53,0400000US08,0400000US30').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': {
                    'demographics': {
                        'datasets': {
                            'population': {}
                        }
                    },
                    'education': {
                        'datasets': {
                            'education_expenditures': {}
                        }
                    }
                }
            });
        });
    });

    it('should find health indicator data for south carolina', () => {
        return availability('?entity_id=0400000US45').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': {
                    'health': {
                        'datasets': {
                            'health_indicators': {}
                        }
                    }
                }
            });
        });
    });

    it('should not include search terms for datasets', () => {
        return availability('?entity_id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response.body.topics.demographics.datasets.population)
                .to.not.have.keys('searchTerms');
        });
    });

    it('should include sources with source urls', () => {
        return availability('?entity_id=0400000US45').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);
            expect(response).to.comprise.of.json({
                'topics': {
                    'health': {
                        'datasets': {
                            'health_indicators': {
                                'sources': [
                                    {
                                        'name': 'Centers for Disease Control and Prevention',
                                        'url': 'http://www.cdc.gov/',
                                        'source_url': 'http://www.cdc.gov/brfss/'
                                    }
                                ]
                            }
                        }
                    }
                }
            });
        });
    });

    it('should generate working variable urls', () => {
        return availability('?entity_id=0100000US,0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(availabilitySchema);

            const variableURLs = [];
            _.forIn(response.body.topics, topic => {
                _.forIn(topic.datasets, dataset => {
                    _.forIn(dataset.variables, variable => {
                        variableURLs.push(variable.url);
                    });
                });
            });

            return Promise.all(variableURLs.map(get));
        }).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);

                const ids = response.body.map(_.property('id'));
                expect(ids).to.have.members(['0100000US', '0400000US53']);
            });
        });
    });
});

