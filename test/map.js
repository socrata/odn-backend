
const _ = require('lodash');
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function map(path) {
    return get(`http://localhost:3001/data/v1/map/values?${path}`);
}

function newMap(path) {
    return get(`http://localhost:3001/data/v1/map/new?${path}`);
}

const westernUS = '51.764656,-130.823135,33.697970,-107.310154';
const washingtonOregon = '46.566384,-123.178097,44.828523,-120.092243';

describe('/data/v1/map', () => {
    describe('/new', () => {
        it('should require paramaters', () => {
            return expect(newMap(''))
                .to.have.status(422);
        });

        it('should require an entity', () => {
            return expect(newMap('variable=demographics.population.change'))
                .to.have.status(422);
        });

        it('should require a variable', () => {
            return expect(newMap('entity_id=0400000US53'))
                .to.have.status(422);
        });

        it('should reject an invalid variable', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics.population.invalid'))
                .to.have.status(404);
        });

        it('should reject an ambiguous dataset path', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics.population'))
                .to.have.status(422);
        });

        it('should reject an ambiguous topic path', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics'))
                .to.have.status(422);
        });

        it('should require that all constraints are specified', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics.population.count'))
                .to.have.status(422);
        });

        it('should not allow invalid constraints', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics.population.count&year=2013&invali=invalid'))
                .to.have.status(422);
        });

        it('should reject two regions of different types', () => {
            return expect(newMap('entity_id=0400000US53,0100000US&variable=demographics.population.count&year=2013'))
                .to.have.status(422);
        });

        describe('with population for washington and colorado in 2013', () => {
            let response, sessionID;

            before(() => {
                response = newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                    expect(response).to.have.status(200);
                    sessionID = response.body.session_id;
                    return Promise.resolve(response);
                });

                return response;
            });

            it('should return a 200', () => {
                return expect(response).to.have.status(200);
            });

            it('should have the right schema', () => {
                return expect(response).to.have.schema(newMapSchema);
            });

            it('should have correct summary statistics', () => {
                return response.then(response => {
                    const stats = response.body.summary_statistics;
                    expect(stats.minimum).to.equal(570134);
                    expect(stats.maximum).to.equal(37659181);
                    expect(stats.average).to.be.within(570134, 37659181);
                    return chakram.wait();
                });
            });

            describe('getting states in the western US', () => {
                let valuesResponse, names;

                before(() => {
                    return response.then(response => {
                        return map(`session_id=${sessionID}&bounds=${westernUS}&zoom_level=6`).then(resp => {
                            expect(resp).to.have.status(200);
                            valuesResponse = resp;
                            names = resp.body.geojson.features
                                .map(feature => feature.properties.name);
                            return resp;
                        });
                    });
                });

                it('should return a 200', () => {
                    return expect(valuesResponse).to.have.status(200);
                });

                it('should include states that are fully within the bounds', () => {
                    return expect(names).to.include.members(['Washington', 'Oregon', 'California', 'Idaho', 'Nevada', 'Utah']);
                });

                it('should include states that are partially within the bounds', () => {
                    return expect(names).to.include.members(['Arizona', 'New Mexico', 'Colorado', 'Wyoming', 'Montana']);
                });

                it('should not include states that are outside of the bounds', () => {
                    return expect(names).to.not.have.members(['Kansas', 'New York', 'Alaska', 'Florida', 'Nebraska']);
                });
            });
        });

        it('should return unique session ids', () => {
            const path = 'entity_id=0400000US53&variable=demographics.population.count&year=2013';
            const promises = _.times(10, () => newMap(path));

            return Promise.all(promises).then(responses => {
                const sessionIDs = responses.map(response => response.body.session_id);
                return expect(sessionIDs).to.deep.equal(_.uniq(sessionIDs));
            });
        });
    });

    describe('/values', () => {
        let response, sessionID;

        before(() => {
            return newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                expect(response).to.have.status(200);
                response = response;
                sessionID = response.body.session_id;
                return response;
            });
        });

        it('should require parameters', () => {
            return expect(map('')).to.have.status(422);
        });

        it('should require zoom level', () => {
            return expect(map(`session_id=${sessionID}&bounds=${westernUS}`))
                .to.have.status(422);
        });

        it('should require bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5`))
                .to.have.status(422);
        });

        it('should require a session id', () => {
            return expect(map(`zoom_level=5&bounds=${westernUS}`))
                .to.have.status(422);
        });

        it('should reject an invalid session id', () => {
            return expect(map(`zoom_level=5&bounds=${westernUS}&session_id=1`))
                .to.have.status(404);
        });

        it('should reject a negative zoom level', () => {
            return expect(map(`session_id=${sessionID}&bounds=${westernUS}&zoom_level=-1`))
                .to.have.status(422);
        });

        it('should reject a large zoom level', () => {
            return expect(map(`session_id=${sessionID}&bounds=${westernUS}&zoom_level=19`))
                .to.have.status(422);
        });

        it('should reject a non-numeric zoom level', () => {
            return expect(map(`session_id=${sessionID}&bounds=${westernUS}&zoom_level=a`))
                .to.have.status(422);
        });

        it('should reject a single number as bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5&bounds=50`))
                .to.have.status(422);
        });

        it('should reject a single coordinate as bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5&bounds=50,50`))
                .to.have.status(422);
        });

        it('should reject three numbers as bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5&bounds=50,50,60`))
                .to.have.status(422);
        });

        it('should reject more than two coordinates as bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5&bounds=50,50,60,60,10`))
                .to.have.status(422);
        });

        it('should reject invalid coordinates as bounds', () => {
            return expect(map(`session_id=${sessionID}&zoom_level=5&bounds=1000,50,60,60`))
                .to.have.status(422);
        });

        it('should not return the same data twice', () => {
            const url = `session_id=${sessionID}&bounds=${westernUS}&zoom_level=6`;

            return map(url)
                .then(() => map(url))
                .then(response => {
                    return expect(response.body.geojson.features).to.be.empty;
                });
        });

        it('should return the same entities for different zoom levels', () => {
            const urls = _.range(1, 18).map(zoomLevel => {
                return `session_id=${sessionID}&bounds=${washingtonOregon}&zoom_level=${zoomLevel}`;
            });

            return Promise.all(urls.map(map)).then(responses => {
                const allIDs = responses.map(response => {
                    return response.body.geojson.features.map(_.property('id'));
                });

                const baseIDs = allIDs[0];
                allIDs.slice(0).forEach(ids => {
                    expect(baseIDs).to.have.members(baseIDs);
                });

                return chakram.wait();
            });
        });
    });
});

const newMapSchema = {
    type: 'object',
    properties: {
        session_id: {
            type: 'string',
            pattern: '[a-z0-9]+',
            minLength: 10
        },
        summary_statistics: {
            type: 'object',
            properties: {
                minimum: {type: 'number'},
                average: {type: 'number'},
                maximum: {type: 'number'}
            },
            required: ['minimum', 'average', 'maximum']
        },
        bounds: {
            type: 'array',
            items: {
                type: 'array',
                items: {type: 'number'},
                minItems: 2,
                maxItems: 2
            },
            minItems: 2,
            maxItems: 2
        },
        required: ['session_id', 'summary_statistics', 'bounds']
    }
};


