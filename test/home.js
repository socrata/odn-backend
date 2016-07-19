
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function url(path) {
    return `http://localhost:3001${path}`;
}

describe('/', () => {
    it('should give a 200', () => {
        return expect(get(url('/'))).to.have.status(200);
    });

    it('should have cors enabled', () => {
        return expect(get(url('/'))).to.have.header('access-control-allow-origin', '*');
    });
});

