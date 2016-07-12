'use strict';

/**
 * Wrapper around memjs that uses promises instead of callbacks.
 */

const _ = require('lodash');
const memjs = require('memjs');

const Constants = require('./constants');

class Cache {
    constructor(configString, options) {
        this.client = memjs.Client.create(configString, options);
    }

    /**
     * Gets the key from the cache.
     */
    get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (error, value) => {
                if (value) resolve(value.toString());
                if (_.isNil(error)) reject(`key not found: ${key}`);
                reject(error);
            });
        });
    }

    getJSON(key) {
        return this.get(key).then(value => JSON.parse(value));
    }

    /**
     * Sets key to value.
     * Expires after expiration seconds.
     * Value cannot exceed one megabyte.megabyte.
     */
    set(key, value, expiration) {
        return new Promise((resolve, reject) => {
            this.client.set(key, value, (error, value) => {
                if (value) resolve();
                reject(error);
            }, expiration);
        });
    }

    setJSON(key, value, expiration) {
        return this.set(key, JSON.stringify(value), expiration);
    }

    append(key, value) {
        return new Promise((resolve, reject) => {
            this.client.append(key, JSON.stringify(value), (error, value) => {
                if (_.isNil(error)) resolve();
                reject(error);
            });
        });
    }
}

module.exports = new Cache(null, Constants.CACHE_OPTIONS);

