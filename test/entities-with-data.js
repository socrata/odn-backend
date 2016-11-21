
const _ = require('lodash');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

const Config = require('../app/config');

const entitiesWithData = require('../app/entities-with-data');
function withData(entities, variable) {
    return entitiesWithData(Config.app_token, entities, variable);
}

const washington = {id: '0400000US53'};

const detroit = {id: '1600000US2622000'};
const flint = {id: '1600000US2629000'};
const seattle = {id: '1600000US5363000'};
const sanFrancisco = {id: '1600000US0667000'};
const atlanta = {id: '1600000US1304000'};
const invalid = {id: 'invalid'};

const population = 'demographics.population.count';
const debt = 'finance.michigan_debt.debt_service';

describe('entities with data', () => {
    it('should return no entities if given no entities', () => {
        return withData([])
            .then(data => expect(data).to.be.empty);
    });

    it('should find data for washington population', () => {
        return withData([washington], population)
            .then(data => expect(data).to.deep.equal([washington]));
    });

    it('should find no data for washington debt', () => {
        return withData([washington], debt)
            .then(data => expect(data).to.be.empty);
    });

    it('should accept entities of different types', () => {
        return withData([washington, seattle], population)
            .then(data => expect(data).to.deep.equal([washington, seattle]));
    });

    it('should filter out entities with no data for the given variable', () => {
        return withData([detroit, seattle, flint, washington, atlanta], debt)
            .then(data => expect(data).to.deep.equal([detroit, flint]));
    });

    it('should filter out invalid entities', () => {
        return withData([invalid], population)
            .then(data => expect(data).to.be.empty);
    });

    it('should return no entities for an invalid variable', () => {
        return withData([washington], invalid)
            .then(data => expect(data).to.be.empty);
    });
});

