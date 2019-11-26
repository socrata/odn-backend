'use strict';

/**
 * Wrapper around memjs that uses promises instead of callbacks.
 */

const _ = require('lodash');
const memjs = require('memjs');

const Exception = require('./error');
const noCache = new Exception('cache not set up', 500);
const miss = key => new Exception(`cache miss: ${key}`, 500);

class Cache {
    constructor(configString, options) {
        this.client = memjs.Client.create(configString, options);
        this.flushOnStart();
    }

    /**
     * Flushes the cache if in production to prevent stale data.
     */
    flushOnStart() {
        if (process.isProduction) this.flush();
    }

    flush() {
        return new Promise((resolve, reject) => {
            if (_.isNil(this.client)) return reject(noCache);

            this.client.flush(error => {
                if (!_.isNil(error)) return reject(new Exception(`error flushing cache: ${error}`));
                resolve();
            });
        });
    }

    /**
     * Gets the key from the cache.
     */
    get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (error, value) => {
                if (value) return resolve(value.toString());
                if (_.isNil(error)) return reject(miss(key));
                return reject(error);
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
            this.client.set(key, value, { expires: expiration }, (error, value) => {
                if (value) return resolve();
                reject(error);
            });
        });
    }

    setJSON(key, value, expiration) {
        return this.set(key, JSON.stringify(value), expiration);
    }

    append(key, value) {
        return new Promise((resolve, reject) => {
            this.client.append(key, value, (error, value) => {
                if (_.isNil(error)) return resolve();
                reject(error);
            });
        });
    }
}

module.exports = Cache;

