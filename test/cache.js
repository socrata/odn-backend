
const _ = require('lodash');
const chai = require('chai');
const chaiPromise = require('chai-as-promised');

chai.use(chaiPromise);
const expect = chai.expect;
const assert = chai.assert;

const Cache = require('../app/cache');

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');

function randomString(length) {
    return _.sampleSize(characters, length).join('');
}

function generateKey() {
    return randomString(10);
}

describe('cache', () => {
    describe('properly configured client', () => {
        const cache = new Cache();

        describe('get', () => {
            const key = generateKey();

            it('should be rejected if the key has not been set', () => {
                return cache.get(key)
                    .catch(error => expect(error.message).to.contain('miss'));
            });
        });

        describe('set', () => {
            const key = generateKey();

            it('should set the key', () => {
                return cache.set(key, 'abc')
                    .then(() => cache.get(key))
                    .then(value => expect(value).to.equal('abc'));
            });
        });

        describe('with JSON', () => {
            const key = generateKey();

            before(() => {
                return cache.setJSON(key, {a: 1});
            });

            it('should use JSON to encode objects', () => {
                return cache.get(key)
                    .then(value => expect(value).to.equal('{"a":1}'));
            });

            it('should decode JSON objects', () => {
                return cache.getJSON(key)
                    .then(value => expect(value).to.deep.equal({a: 1}));
            });
        });

        describe('append', () => {
            const key = generateKey();

            it('should fail if the key does not exist', () => {
                return cache.append(generateKey(), 'a')
                    .catch(() => assert(true));
            });

            it('should append to a valid key', () => {
                return cache.set(key, 'a')
                    .then(() => cache.append(key, 'b'))
                    .then(() => cache.append(key, 'c'))
                    .then(() => cache.get(key))
                    .then(value => expect(value).to.equal('abc'));
            });
        });
    });

    describe('improperly configured client', () => {
        const cache = new Cache('invalid-address');

        it('should not get a key', () => {
            return cache.get('a')
                .catch(() => assert(true));
        });
    });
});

