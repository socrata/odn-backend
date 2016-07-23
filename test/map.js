
const _ = require('lodash');
const WebSocket = require('ws');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function map(path) {
    return get(`http://localhost:3001/data/v1/map/values?${path}`);
}

function mapWS(path) {
    return new WebSocket(`ws://localhost:3001/data/v1/map/values`);
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

        it('should reject an invalid region', () => {
            return expect(newMap('entity_id=invalid&variable=demographics.population.count&year=2013'))
                .to.have.status(404);
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
                    expect(stats.names).to.deep.equal(['minimum', '', 'lower quartile', '', 'average', '', 'upper quartile', '', 'maximum']);
                    expect(stats.values).to.have.lengthOf(9);
                    expect(stats.values).to.be.ascending;
                    expect(stats.values_formatted).to.have.lengthOf(9);
                    expect(_.first(stats.values_formatted)).to.equal('570,134');
                    expect(_.last(stats.values_formatted)).to.equal('37,659,181');
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

        it('should work for the 98122 ZIP code', () => {
            return expect(newMap('entity_id=8600000US98122&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for Seattle, WA', () => {
            return expect(newMap('entity_id=1600000US5363000&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for King County, WA', () => {
            return expect(newMap('entity_id=0500000US53033&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for the Seattle Metro Area', () => {
            return expect(newMap('entity_id=310M200US42660&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for Washington State', () => {
            return expect(newMap('entity_id=0400000US53&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for the Pacific Division', () => {
            return expect(newMap('entity_id=0300000US9&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for the West Region', () => {
            return expect(newMap('entity_id=0200000US4&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
        });

        it('should work for the United States', () => {
            return expect(newMap('entity_id=0100000US&variable=demographics.population.count&year=2013'))
                .to.have.status(200);
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

    describe('/data/v1/map/values over http', () => {
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
            return newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(newMapSchema);

                const sessionID = response.body.session_id;

                const urls = _.range(1, 18).filter(n => n % 2).map(zoomLevel => {
                    return `session_id=${sessionID}&bounds=${washingtonOregon}&zoom_level=${zoomLevel}`;
                });

                return Promise.all(urls.map(map)).then(responses => {
                    const allIDs = responses.map(response => {
                        expect(response).to.have.status(200);
                        expect(response).to.have.schema(mapValuesSchema);

                        return response.body.geojson.features.map(_.property('properties.id'));
                    });

                    const baseIDs = allIDs[0];
                    allIDs.slice(1).forEach(ids => {
                        expect(ids).to.have.members(baseIDs);
                    });

                    return chakram.wait();
                });
            });
        });

        it('should always return data for the selected entities if it is available', () => {
            // Loomis is a town in northern washington with only 138 people
            return newMap('entity_id=1600000US5340350&variable=demographics.population.count&year=2013').then(sessionResponse => {
                const sessionID = sessionResponse.body.session_id;

                return map(`session_id=${sessionID}&bounds=${westernUS}&zoom_level=5`).then(valuesResponse => {
                    expect(valuesResponse).to.have.status(200);
                    expect(valuesResponse).to.have.schema(mapValuesSchema);

                    const ids = valuesResponse.body.geojson.features.map(feature => feature.properties.id);
                    return expect(ids).to.include.members(['1600000US5340350']);
                });
            });
        });
    });

    describe('/data/v1/map/values over websocket', () => {
        let response, sessionID, ws;

        before(() => {
            return newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                expect(response).to.have.status(200);
                response = response;
                sessionID = response.body.session_id;

                ws = mapWS();
                return new Promise((resolve, reject) => {
                    ws.on('open', () => {
                        resolve();
                    });
                });
            });
        });

        it('should return an error if the message is not JSON', () => {
            ws.send('invalid-json');

            return next(ws).then(response => {
                expect(response.type).to.equal('error');
                expect(response.message).to.equal('invalid-json');
            });
        });

        it('should return an error if the message is missing parameters', () => {
            ws.send(JSON.stringify({}));

            return next(ws).then(response => {
                expect(response.type).to.equal('error');
            });
        });

        it('should return geojson for a valid request', () => {
            ws.send(JSON.stringify({
                session_id: sessionID,
                zoom_level: 4,
                bounds: washingtonOregon.split(',')
            }));

            return next(ws).then(response => {
                expect(response.type).to.equal('geojson');
                expect(response.message).to.exist;
                expect(response.geojson).to.exist;
            });
        });
    });
});

// Promise with the next response of the websocket in JSON.
function next(socket) {
    return new Promise((resolve, reject) => {
        socket.on('message', data => {
            resolve(JSON.parse(data));
        });
    });
}

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
                names: {
                    type: 'array',
                    items: {type: 'string'}
                },
                values: {
                    type: 'array',
                    items: {type: 'number'}
                },
                values_formatted: {
                    type: 'array',
                    items: {type: 'string'}
                }
            },
            required: ['names', 'values', 'values_formatted']
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
        }
    },
    required: ['session_id', 'summary_statistics', 'bounds']
};

const mapValuesSchema = {
    type: 'object',
    properties: {
        geojson: {
            type: 'object',
            properties: {
                crs: {type: 'object'},
                type: {type: 'string'},
                features: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: {type: 'string'},
                            geometry: {type: 'object'},
                            properties: {
                                type: 'object',
                                properties: {
                                    id: {type: 'string'},
                                    name: {type: 'string'},
                                    value: {type: 'string'},
                                    value_formatted: {type: 'string'}
                                },
                                required: ['id', 'name', 'value', 'value_formatted']
                            }
                        },
                        required: ['type', 'geometry', 'properties']
                    }
                }
            },
            required: ['crs', 'features', 'type']
        },
    },
    required: ['geojson']
};


