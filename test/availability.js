
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

const availabilitySchema = require('../data/sources/declaration-schema');

function availability(path) {
    return get(`http://localhost:3001/data/v1/availability/${path}`);
}

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

    it('should find available data for the united states and washington state', () => {
        return availability('?id=0100000US,0400000US53').then(response => {
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
                                        'url': "https://odn.data.socrata.com/resource/9jg8-ki9x.json?variable=count&%24where=id%20in('0100000US'%2C'0400000US53')"
                                    }
                                }
                            }
                        }
                    }
                }
            });
        });
    });
});

