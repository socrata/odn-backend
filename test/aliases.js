
const chakram = require('chakram');
const expect = chakram.expect;

const Aliases = require('../app/aliases');

describe('alias', () => {
    it('should alias WA to Washington', () => {
        return expect(Aliases.get('WA')).to.have.members(['Washington']);
    });

    it('should alias Washington to WA', () => {
        return expect(Aliases.get('Washington')).to.have.members(['WA']);
    });

    it('should be case insensitive', () => {
        return expect(Aliases.get('OrEgoN')).to.equal(Aliases.get('oregon'));
    });

    it('should work for multiple words', () => {
        return expect(Aliases.get('New York')).to.have.members(['NY']);
    });

    it('should return no results for an empty string', () => {
        return expect(Aliases.get('')).to.be.empty;
    });

    it('should return no results for a string with no aliases', () => {
        return expect(Aliases.get('asdjkhadsfkjasdfjkasdf')).to.be.empty;
    });
});

