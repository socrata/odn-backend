
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

const constraintSchema = {
    definitions: {
        permutation: {
            type: 'object',
            properties: {
                constraintValue: {type: 'string'},
                constraintURL: {type: 'string'}
            },
            required: ['constraintValue', 'constraintURL']
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
    return population(`id=0100000US&${path}`);
}

describe('/data/v1/constraint', () => {
    it('should require a variable', () => {
        return expect(constraint('')).to.have.status(404);
    });

    it('should reject an invalid topic', () => {
        return expect(constraint('invalid-variable?id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid dataset', () => {
        return expect(constraint('demographics.invalid-dataset?id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid topic and dataset with no variable', () => {
        return expect(constraint('demographics.population?id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid variable', () => {
        return expect(constraint('demographics.population.invalid-variable?id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid variable followed by something else', () => {
        return expect(constraint('demographics.population.count.something?id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should not accept an invalid id', () => {
        return expect(populationYear('id=invalid-id')).to.have.status(404);
    });

    it('should not accept a valid id followed by an invalid id', () => {
        return expect(populationYear('id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should not accept an invalid id followed by a valid id', () => {
        return expect(populationYear('id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should accept two valid ids', () => {
        return expect(populationYear('id=0100000US,0400000US53')).to.have.status(200);
    });

    it('should accept two valid ids with some white space', () => {
        return expect(populationYear('id=    0100000US   ,      0400000US53 ')).to.have.status(200);
    });

    it('should require a constraint', () => {
        return expect(populationUS('')).to.have.status(422);
    });

    it('should reject an invalid constraint', () => {
        return expect(populationUS('constraint=age')).to.have.status(404);
    });

    it('should return all years with population data for the united states', () => {
        return populationUS('constraint=year').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(constraintSchema);
            expect(response).to.comprise.of.json({
                'permutations': [
                    {
                        'constraintValue': '2009',
                        'constraintURL': "https://odn.data.socrata.com/resource/9jg8-ki9x.json?variable=count&%24where=id%20in('0100000US')&year=2009"
                    }
                ]
            });
        });
    });

    it('should generate working urls', () => {
        return populationUS('constraint=year').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(constraintSchema);

            const promises = response.body.permutations
                .map(option => get(option.constraintURL));
            return Promise.all(promises);
        }).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);
            });
        });
    });

    it('should require that the constraint is not ambiguous', () => {
        return constraint('economy.cost_of_living.index?constraint=component&id=310M200US42660').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should not allow constraining by the constraint options we are looking for', () => {
        return constraint('economy.cost_of_living.index?constraint=component&id=310M200US42660&component=Goods').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should allow constraining by another variable', () => {
        return constraint('economy.cost_of_living.index?constraint=component&id=310M200US42660&year=2013').then(response => {
            expect(response).to.have.status(200);
        });
    });
});

