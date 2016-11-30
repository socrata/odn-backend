
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = chakram.get;
const getWithToken = require('./get');
const Config = require('../app/config');

const url = 'http://localhost:3001/data/v1/availability?entity_id=0400000US53';

describe('app token', () => {
    it('should not be required on home page', () => {
        return expect(get('http://localhost:3001/')).to.have.status(200);
    });

    it('should return a 403 if absent', () => {
        return expect(get(url)).to.have.status(403);
    });

    it('should return a 403 if invalid', () => {
        return get(url, {
            headers: {
                [Config.app_token_header]: 'invalid-app-token'
            }
        }).then(response => {
            return expect(response).to.have.status(403);
        });
    });

    it('should accept app token as header', () => {
        return expect(getWithToken(url)).to.have.status(200);
    });

    it('should accept app token as parameter', () => {
        return expect(get(`${url}&app_token=${Config.app_token}`)).to.have.status(200);
    });
});



