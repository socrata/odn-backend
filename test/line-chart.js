
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function chart(path) {
    return get(`http://localhost:3001/data/v1/chart/line/${path}`);
}

function population(path) {
    return chart(`demographics.population.count?${path}`);
}

function populationYear(path) {
    return population(`constraint=year&${path}`);
}

function populationUS(path) {
    return population(`entity_id=0100000US&${path}`);
}

describe('/data/v1/chart/line', () => {
    it('should require a variable', () => {
        return expect(chart('')).to.have.status(404);
    });

    it('should reject an invalid topic', () => {
        return expect(chart('invalid-variable?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid dataset', () => {
        return expect(chart('demographics.invalid-dataset?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid topic and dataset with no variable', () => {
        return expect(chart('demographics.population?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject an invalid variable', () => {
        return expect(chart('demographics.population.invalid-variable?entity_id=0100000US&constraint=year')).to.have.status(404);
    });

    it('should reject a valid variable followed by something else', () => {
        return expect(chart('demographics.population.count.something?entity_id=0100000US&constraint=year')).to.have.status(404);
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

    it('should return chart data for washington population over time', () => {
        return chart('demographics.population.count?entity_id=0400000US53&constraint=year').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(lineChartSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', 'Washington', 'forecast'],
                    ['2009']
                ]
            });
        });
    });
});

const lineChartSchema = {
    type: 'object',
    properties: {
        data: {
            type: 'array',
            items: {
                type: 'array'
            }
        },
        required: ['data']
    }
};

