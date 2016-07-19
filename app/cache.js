'use strict';

/**
 * Wrapper around memjs that uses promises instead of callbacks.
 */

const _ = require('lodash');
const memjs = require('memjs');

const Constants = require('./constants');
const Exception = require('./error');
const noCache = new Exception('cache not set up', 500);
const miss = key => new Exception(`cache miss: ${key}`, 500);


class Cache {
    constructor(configString, options) {
        this.client = memjs.Client.create(configString, options);
    }

    /**
     * Gets the key from the cache.
     */
    get(key) {
        return new Promise((resolve, reject) => {
            if (_.isNil(this.client))
                return reject(noCache());

            this.client.get(key, (error, value) => {
                if (value) return resolve(value.toString());
                if (_.isNil(error)) return reject(miss(key));
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
            if (_.isNil(this.client))
                return reject(noCache());

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
            if (_.isNil(this.client))
                return reject(noCache());

            this.client.append(key, value, (error, value) => {
                if (_.isNil(error)) resolve();
                reject(error);
            });
        });
    }
}

module.exports = new Cache(null, Constants.CACHE_OPTIONS);

