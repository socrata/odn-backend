
const _ = require('lodash');
const WebSocket = require('ws');
const io = require('socket.io-client');
const chakram = require('chakram');
const expect = chakram.expect;
const should = chakram.should;
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
                let names;

                before(() => {
                    return response.then(response => {
                        return openSocket('http://localhost:3001', {
                            transports: ['websocket'],
                            'force new connection': true
                        }).then(socket => {
                            socket.send(JSON.stringify({
                                session_id: sessionID,
                                bounds: westernUS,
                                zoom_level: 6
                            }));

                            return new SocketIterator(socket).next().then(resp => {
                                names = resp.geojson.features
                                    .map(feature => feature.properties.name);
                            });
                        });
                    });
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

    describe('/data/v1/map/values', () => {
        let response, sessionID, socket, send, messages;

        before(done => {
            const mapCreated = newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                expect(response).to.have.status(200);
                response = response;
                sessionID = response.body.session_id;
                return Promise.resolve();
            });

            const socketOpened = openSocket('http://localhost:3001', {
                transports: ['websocket'],
                'force new connection': true
            }).then(socketIO => {
                socket = socketIO;
                send = message => socket.send(JSON.stringify(message));
                messages = new SocketIterator(socket);
                return Promise.resolve();
            });

            Promise.all([mapCreated, socketOpened])
                .then(() => done())
                .catch(error => done(error));
        });

        it('should reject invalid JSON', () => {
            socket.send('asd');

            return messages.next().then(response => {
                expect(response.message).to.equal('asd');
                expect(response.type).to.equal('error');
                expect(response.error.statusCode).to.equal(422);
                expect(response.error.message).to.contain('invalid JSON');
            });
        });

        it('should require parameters', () => {
            send({});

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should require zoom level', () => {
            send({
                session_id: sessionID,
                bounds: westernUS
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should require bounds', () => {
            send({
                session_id: sessionID,
                zoom_level: 5
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should require a session id', () => {
            send({
                zoom_level: 5,
                bounds: westernUS
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject an invalid session id', () => {
            send({
                zoom_level: 5,
                bounds: westernUS,
                session_id: 1
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(404);
            });
        });

        it('should reject a negative zoom level', () => {
            send({
                zoom_level: -1,
                bounds: westernUS,
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject a large zoom level', () => {
            send({
                zoom_level: 19,
                bounds: westernUS,
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject a non-numeric zoom level', () => {
            send({
                zoom_level: 'a',
                bounds: westernUS,
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject a single number as bounds', () => {
            send({
                zoom_level: 5,
                bounds: 50,
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject a single coordinate as bounds', () => {
            send({
                zoom_level: 5,
                bounds: '50,50',
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject three numbers as bounds', () => {
            send({
                zoom_level: 5,
                bounds: '50,50,50',
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject more than two coordinates as bounds', () => {
            send({
                zoom_level: 5,
                bounds: '50,50,60,60,10',
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should reject invalid coordinates as bounds', () => {
            send({
                zoom_level: 5,
                bounds: '1000,50,60,60',
                session_id: sessionID
            });

            return messages.next().then(response => {
                expect(response.error.statusCode).to.equal(422);
            });
        });

        it('should return the same entities for different zoom levels', () => {
            return newMap('entity_id=0400000US53,0400000US08&variable=demographics.population.count&year=2013').then(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(newMapSchema);

                const sessionID = response.body.session_id;

                const zoomLevels = _.range(1, 18).filter(n => n % 2);

                zoomLevels.map(zoomLevel => {
                    return {
                        session_id: sessionID,
                        bounds: washingtonOregon,
                        zoom_level: zoomLevel
                    };
                }).forEach(send);

                return Promise.all(zoomLevels.map(() => messages.next())).then(responses => {
                    const allIDs = responses.map(response => {
                        return response.geojson.features.map(_.property('properties.id'));
                    });

                    const baseIDs = allIDs[0];
                    allIDs.slice(1).forEach(ids => {
                        expect(ids).to.have.members(baseIDs);
                    });

                    return chakram.wait();
                });
            });
        });
    });
});

function openSocket(url, options) {
    return new Promise((resolve, reject) => {
        const socket = io.connect(url, options || {});
        socket.on('connect', () => resolve(socket));
        socket.on('error', reject);
    });
}

class SocketIterator {
    constructor(socket) {
        this.socket = socket;
        this.callbacks = [];
        this.messages = [];

        this.socket.on('message', message => {
            this.messages.push(message);
            this.update();
        });
    }

    next() {
        return new Promise((resolve, reject) => {
            this.callbacks.push(message => resolve(JSON.parse(message)));
            this.update();
        });
    }

    update() {
        if (this.callbacks.length > 0 && this.messages.length > 0)
            this.callbacks.shift()(this.messages.shift());
    }
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

