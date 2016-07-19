
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;

const Sources = require('../app/sources');

describe('sources', () => {
    it('should return a topic', () => {
        const tree = Sources.search('demographics');
        expect(_.keys(tree)).to.deep.equal(['demographics']);
    });

    it('should return a dataset', () => {
        const tree = Sources.search('demographics.population');
        expect(_.keys(tree)).to.deep.equal(['demographics']);
        expect(_.keys(tree.demographics.datasets)).to.deep.equal(['population']);
    });

    it('should return a variable', () => {
        const tree = Sources.search('demographics.population.count');
        expect(_.keys(tree)).to.deep.equal(['demographics']);
        expect(_.keys(tree.demographics.datasets)).to.deep.equal(['population']);
        expect(_.keys(tree.demographics.datasets.population.variables)).to.deep.equal(['count']);
    });

    it('should handle a path that is too deep', () => {
        const tree = Sources.search('demographics.population.count.too.deep');
        expect(tree).to.not.exist;
    });

    it('should handle an invalid variable', () => {
        const tree = Sources.search('demographics.population.invalid');
        expect(tree).to.not.exist;
    });

    it('should handle an invalid topic', () => {
        const tree = Sources.search('invalid');
        expect(tree).to.not.exist;
    });

    it('should handle an invalid topic with some dataset', () => {
        const tree = Sources.search('invalid.dataset');
        expect(tree).to.not.exist;
    });

    it('should handle a deep invalid path', () => {
        const tree = Sources.search('invalid.invalid.invalid.a.b.c');
        expect(tree).to.not.exist;
    });
});

