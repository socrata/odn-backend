
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

require('chai').use(require('chai-sorted'));

const constraintSchema = {
    definitions: {
        permutation: {
            type: 'object',
            properties: {
                constraint_value: {type: 'string'}
            },
            required: ['constraint_value'],
            additionalProperties: false
        }
    },

    type: 'object',
    properties: {
        permutations: {
            type: 'array',
            items: {'$ref': '#/definitions/permutation'}
        },
        required: ['permutations']
    }
};

function constraint(path) {
    return get(`http://localhost:3001/data/v1/constraint/${path}`);
}

function population(path) {
    return constraint(`demographics.population.count?${path}`);
}

function populationYear(path) {
    return population(`constraint=year&${path}`);
}

function populationUS(path) {
    return population(`entity_id=0100000US&${path}`);
}

describe('/data/v1/constraint', () => {
    it('should require a variable', () => {
        return expect(constraint('')).to.have.status(404);
    });

    it('should reject an invalid topic', () => {
        return expect(constraint('invalid-variable?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid dataset', () => {
        return expect(constraint('demographics.invalid-dataset?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid topic and dataset with no variable', () => {
        return expect(constraint('demographics.population?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid variable', () => {
        return expect(constraint('demographics.population.invalid-variable?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid variable followed by something else', () => {
        return expect(constraint('demographics.population.count.something?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should not accept an invalid id', () => {
        return expect(populationYear('entity_id=invalid-id')).to.have.status(404);
    });

    it('should not accept a valid id followed by an invalid id', () => {
        return expect(populationYear('entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should not accept an invalid id followed by a valid id', () => {
        return expect(populationYear('entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should accept two valid ids', () => {
        return expect(populationYear('entity_id=0100000US,0400000US53')).to.have.status(200);
    });

    it('should accept two valid ids with some white space', () => {
        return expect(populationYear('entity_id=    0100000US   ,      0400000US53 ')).to.have.status(200);
    });

    it('should require a constraint', () => {
        return expect(populationUS('')).to.have.status(422);
    });

    it('should reject an invalid constraint', () => {
        return expect(populationUS('constraint=age')).to.have.status(404);
    });

    it('should return all years with population data for the united states in descending order', () => {
        return populationUS('constraint=year').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(constraintSchema);
            expect(response).to.comprise.of.json({
                'permutations': [
                    {
                        'constraint_value': '2009'
                    }
                ]
            });
            const years = response.body.permutations.map(_.property('constraint_value'));
<<<<<<< HEAD
            expect(years).to.deep.equal(['2014','2013', '2012', '2011', '2010', '2009']);
=======
            expect(years).to.deep.equal(['2014', '2013', '2012', '2011', '2010', '2009']);
>>>>>>> 758f79440500cc260049b67c7b061664797d9627
        });
    });

    it('should not allow constraining by the constraint options we are looking for', () => {
        return constraint('economy.cost_of_living.index?constraint=component&entity_id=310M200US42660&component=Goods').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should allow constraining by another variable', () => {
        return constraint('economy.cost_of_living.index?constraint=component&entity_id=310M200US42660&year=2013').then(response => {
            expect(response).to.have.status(200);
        });
    });
});

