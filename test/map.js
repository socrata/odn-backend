
const _ = require('lodash');
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function map(path) {
    return get(`http://localhost:3001/data/v1/map/${path}`);
}

const westernUS = '51.764656,-130.823135,33.697970,-107.310154';

describe('/data/v1/map', () => {
    it('should require a variable', () => {
        return expect(map('')).to.have.status(404);
    });

    it('should reject an invalid variable', () => {
        return expect(map('demographics.population.invalid?entity_type=region.state&scale=500000'))
            .to.have.status(404);
    });

    describe('population data for states in the western US', () => {
        let response, names;

        before(() => {
            response = map(`demographics.population.count?entity_type=region.state&scale=500000&bounds=${westernUS}&year=2013`);

            response.then(resp => {
                names = resp.body.geojson.features
                    .map(feature => feature.properties.name);
            });

            return response;
        });

        it('should return a 200', () => {
            expect(response).to.have.status(200);
            return chakram.wait();
        });

        it('should have summary statistics', () => {
            const stats = response.body.summary_statistics;
            expect(stats.minimum).to.equal(570134);
            expect(stats.maximum).to.equal(37659181);
            expect(stats.average).to.be.within(570134, 37659181);
        });

        it('should include states that are fully within the bounds', () => {
            expect(names).to.include.members(['Washington', 'Oregon', 'California', 'Idaho', 'Nevada', 'Utah']);
        });

        it('should include states that are partially within the bounds', () => {
            expect(names).to.include.members(['Arizona', 'New Mexico', 'Colorado', 'Wyoming', 'Montana']);
        });

        it('should not include states that are outside of the bounds', () => {
            expect(names).to.not.have.members(['Kansas', 'New York', 'Alaska', 'Florida', 'Nebraska']);
        });
    });
});

