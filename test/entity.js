
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function entity(path) {
    return get(`http://localhost:3001/entity/v1/?${path}`);
}

describe('/entity/v1', () => {
    it('should return all entities when given no parameters', () => {
        return entity('').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.not.be.empty;
        });
    });

    it('should return all entities of a given type', () => {
        return entity('entity_type=region.state').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.not.be.empty;
            response.body.entities.forEach(entity => {
                expect(entity.type).to.equal('region.state');
            });
        });
    });

    it('should return no entities for an invalid type', () => {
        return entity('entity_type=invalid').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should return no entities for an empty type', () => {
        return entity('entity_type=').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should return exactly one entity for an id', () => {
        return entity('entity_id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.have.lengthOf(1);
        });
    });

    it('should return no entities for an invalid id', () => {
        return entity('entity_id=invalid').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should return no entities for an empty id', () => {
        return entity('entity_id=').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should return no entities for an empty name', () => {
        return entity('entity_name=').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should return no entities for an invalid name', () => {
        return entity('entity_name=asdfkjasdfkljasdfklj').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.be.empty;
        });
    });

    it('should find many entities for washington', () => {
        return entity('entity_name=washington').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.have.length.above(10);
        });
    });

    it('should find only one state for washington', () => {
        return entity('entity_name=washington&entity_type=region.state').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.entities).to.have.lengthOf(1);
        });
    });

    it('should find seattle metro and seattle city for seattle', () => {
        return entity('entity_name=seattle').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            const entities = response.body.entities;
            expect(entities).to.have.lengthOf(2);
            const ids = entities.map(_.property('id'));
            expect(ids).to.have.members(['310M200US42660', '1600000US5363000']);
        });
    });

    it('should find four metro areas for springfield', () => {
        return entity('entity_name=springfield&entity_type=region.msa').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            const entities = response.body.entities;
            expect(entities).to.have.lengthOf(4);
        });
    });

    it('should be case insensitive', () => {
        return Promise.all([
            entity('entity_name=WASHINGTON'),
            entity('entity_name=washington')
        ]).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(entitySchema);
            });

            const bodies = responses.map(_.property('body'));
            expect(bodies[0]).to.deep.equal(bodies[1]);
        });
    });
});

const entitySchema = {
    definitions: {
        entity: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name', 'type']
        }
    },
    type: 'object',
    properties: {
        entities: {
            type: 'array',
            etems: {'$ref': '#/definitions/entity'}
        }
    },
    required: ['entities']
};

