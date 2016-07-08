
const _ = require('lodash');
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function values(path) {
    return get(`http://localhost:3001/data/v1/values?${path}`);
}

function us(path) {
    return values(`entity_id=0100000US&year=2013&${path}`);
}

describe('/data/v1/values', () => {
    it('should require a variable', () => {
        return expect(values('')).to.have.status(422);
    });

    it('should accept an unambiguous dataset or topic in place of variables', () => {
        const equivalentPromises = [
            us('variable=demographics'),
            us('variable=demographics.population'),
            us('variable=demographics.population.change,demographics.population.count')
        ];

        return Promise.all(equivalentPromises).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(valuesSchema);
            });

            expect(responses[0].body).to.deep.equal(responses[1].body);
            expect(responses[1].body).to.deep.equal(responses[2].body);
        });
    });

    it('should not accept two variables from different datasets', () => {
        return expect(us('variable=demographics.population.change,education.education.percent_high_school_graduate'))
            .to.have.status(422);
    });

    it('should not accept an ambiguous topic', () => {
        return expect(us('variable=jobs'))
            .to.have.status(422);
    });

    it('should allow specifying just a variable', () => {
        return values('variable=demographics.population.change').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', '0100000US', '0200000US1'],
                    [2009]
                ]
            });
        });
    });

    it('should allow specifying a variable and year but no entities', () => {
        return values('variable=demographics.population.change&year=2013').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['variable']
                ]
            });
            expect(response.body.data).to.have.lengthOf(2);
        });
    });

    it('should allow specifying a variable, year, and entity', () => {
        return values('variable=demographics.population.count&year=2013&entity_id=0100000US').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.have.json({
                data: [
                    ['variable', '0100000US'],
                    ['count', 311536594]
                ]
            });
        });
    });

    it('should not allow multiple unfixed constraints', () => {
        return values('variable=jobs.occupations.employed').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should get all occupations for a given year', () => {
        return values('variable=jobs.occupations.employed&year=2013&entity_id=0100000US').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['occupation', '0100000US'],
                    ['Business and Finance'],
                    ['Computers and Math'],
                    ['Construction and Extraction'],
                    ['Education'],
                    ['Engineering']
                ]
            });
        });
    });

    it('should get all years for a given occupation', () => {
        return values('variable=jobs.occupations.employed&occupation=Food Service&entity_id=0100000US').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', '0100000US'],
                    [2013]
                ]
            });
        });
    });

    it('should allow specifying multiple variables if all constraints are fixed', () => {
        return values('variable=education.education&year=2013&entity_id=0100000US').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['variable', '0100000US'],
                    ['percent_high_school_graduate'],
                    ['percent_high_school_graduate_or_higher']
                ]
            });
        });
    });

    it('should not allow specifying multiple variables if some constraints are not fixed', () => {
        return values('variable=education.education&entity_id=0100000US').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should get population count for all years in washington state', () => {
        return values('variable=demographics.population.count&entity_id=0400000US53').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', '0400000US53'],
                    [2009],
                    [2010],
                    [2011],
                    [2012],
                    [2013]
                ]
            });
        });
    });

    it('should not be able to forecast multiple variables', () => {
        return values('variable=demographics.population&entity_id=0100000US&forecast=4').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should not be able to forecast a non-numerical type', () => {
        return values('variable=jobs.occupations.employed&entity_id=0100000US&year=2013&forecast=4').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should not accept a non-numerical forecast parameter', () => {
        return values('variable=demographics.population.count&entity_id=0100000US&forecast=asd').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should not accept a negative forecast parameter', () => {
        return values('variable=demographics.population.count&entity_id=0100000US&forecast=-1').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should not accept a huge forecast parameter', () => {
        return values('variable=demographics.population.count&entity_id=0100000US&forecast=100').then(response => {
            expect(response).to.have.status(422);
        });
    });

    it('should accept a zero forecast parameter and not forecast anything', () => {
        return values('variable=demographics.population.count&entity_id=0100000US&forecast=0').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', '0100000US']
                ]
            });
        });
    });

    it('should forecast population data', () => {
        return values('variable=demographics.population.count&entity_id=0100000US&forecast=3').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response).to.comprise.of.json({
                data: [
                    ['year', 'forecast', '0100000US'],
                    [2009, false],
                    [2010, false],
                    [2011, false],
                    [2012, false],
                    [2013, false],
                    [2014, true],
                    [2015, true],
                    [2016, true]
                ],
                forecast_info: {
                    algorithm_name: 'linear'
                }
            });
            expect(response.body.data).to.have.lengthOf(9);

            // make sure it predicts increasing population
            const values = _.tail(response.body.data).map(_.last);
            expect(values).to.deep.equal(_.sortBy(values));
        });
    });

    it('should default to not describing the data', () => {
        return values('variable=demographics.population&entity_id=0100000US&year=2013').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response.body).to.not.have.keys('description');
        });
    });

    it('should not describe the data if the describe parameter is set to false', () => {
        return values('variable=demographics.population&entity_id=0100000US&year=2013&describe=false').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response.body).to.not.have.keys('description');
        });
    });

    it('should describe the data if the describe parameter is set to true', () => {
        return values('variable=demographics.population&entity_id=0100000US&year=2013&describe=true').then(response => {
            expect(response).to.have.status(200);
			expect(response).to.have.schema(valuesSchema);
            expect(response.body).to.have.all.keys(['data', 'description']);
            expect(response.body.description).to.have.string('United States');
            expect(response.body.description).to.have.string('population');
            expect(response.body.description).to.have.string('annual population change');
            expect(response.body.description).to.have.string('2013');
        });
    });

    it('should not describe the data if no entities are specified', () => {
        return values('variable=demographics.population.count&year=2013&describe=true').then(response => {
            expect(response).to.have.status(422);
        });
    });


});

function header(response) {
    return response.body[0];
}

const valuesSchema = {
    type: 'object',
    properties: {
        data: {
            type: 'array',
            items: {
                type: 'array'
            }
        },
        description: {type: 'string'},
        forecast_info: {
            type: 'object',
            properties: {
                algorithm_name: {type: 'string'},
                algorithm_url: {type: 'string'}
            },
            required: ['algorithm_name', 'algorithm_url']
        },
        required: ['data']
    }
};

