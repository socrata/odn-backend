
const chakram = require('chakram');

function url(path) {
    return `http://localhost:3001${path}`;
}

describe('/', () => {
    it('Should give a 200', () => {
        const response = chakram.get(url('/'));
        return chakram.expect(response).to.have.status(200);
    });
});

