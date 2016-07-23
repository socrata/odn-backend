
const name = require('../app/name');

const chakram = require('chakram');
const expect = chakram.expect;

describe('name', () => {
    it('should capitalize the first letter of each word', () => {
        expect(name('lane-aasen')).to.equal('Lane Aasen');
    });

    it('should accept any amount of white space between words', () => {
        expect(name('lane  -       _      francisco__--__   aasen'))
            .to.equal('Lane Francisco Aasen');
    });

    it('should not capitalize small words', () => {
        expect(name('this-is-a-variable-name-with-a-lot-of-small-words-in-it'))
            .to.equal('This is a Variable Name with a Lot of Small Words in it');
    });

    it('should format numbers', () => {
        expect(name('12345')).to.equal('12,345');
    });
});

