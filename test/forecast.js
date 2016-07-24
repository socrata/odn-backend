
const chakram = require('chakram');
const expect = chakram.expect;

const Forecast = require('../app/data/values/forecast');
const linear = Forecast.linear;

describe('forecast', () => {
    it('should work with zero steps', () => {
        expect(linear(0, [1,2,3])).to.be.empty;
    });

    it('should work with an empty series', () => {
        expect(linear(10, [])).to.be.empty;
    });

    it('should work with a length one series', () => {
        expect(linear(2, [1])).to.deep.equal([1,1]);
    });

    it('should work with a simple ascending series', () => {
        expect(linear(3, [1,2,3])).to.deep.equal([4,5,6]);
    });
});

