'use strict';

const _ = require('lodash');
const request = require('request-promise');
const querystring = require('querystring');
const memjs = require('memjs');
const crypto = require('crypto');

const Exception = require('./error');
const Constants = require('./constants');

const cache = memjs.Client.create(null, Constants.CACHE_OPTIONS);

class Request {
    /**
     * Generates a cache key for the given URL.
     * To get around the 250 character memcache key size limit,
     * a base64 encoded SHA512 hash is used for urls exceding 250 characters.
     */
    static key(url) {
        if (url.length <= 250) return url;
        return crypto.createHash('sha512').update(url).digest('base64');
    }

    static get(url, timeout) {
        return new Promise((resolve, reject) => {
            if (!cache) {
                Request.timeout(request(url), timeout).then(body => {
                    resolve(body);
                }).catch(error => {
                    const exception = new Exception(`error fetching ${url}`,
                            error.statusCode || 500);
                    exception.error = error;

                    reject(exception);
                });
            } else {
                const key = Request.key(_.isString(url) ? url : url.uri);

                cache.get(key, (error, value) => {
                    if (value) {
                        resolve(value);
                    } else {
                        Request.timeout(request(url), timeout).then(body => {
                            resolve(body);
                            if (!error) cache.set(key, body);
                        }).catch(error => {
                            const exception = new Exception(`error fetching ${url}`,
                                    error.statusCode || 500);
                            exception.error = error;

                            reject(exception);
                        });
                    }
                });
            }
        });
    }

    static getJSON(url, timeout) {
        return new Promise((resolve, reject) => {
            Request.get(url, timeout).then(value => {
                resolve(JSON.parse(value.toString()));
            }).catch(reject);
        });
    }

    static timeout(promise, milliseconds) {
        return Promise.race([Request._timeout(milliseconds), promise]);
    }

    static _timeout(milliseconds) {
        milliseconds = milliseconds || Constants.TIMEOUT_MS;

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(Exception.timeout('request timed out'));
            }, milliseconds);
        });
    }

    static buildURL(path, params) {
        const validParams = _.omitBy(params, _.isNil);
        const paramString = querystring.stringify(validParams);
        return `${path}${path[path.length - 1] == '?' ? '' : '?'}${paramString}`;
    }

    static whereIn(name, options) {
        return `${name} in (${options.map(quote).join(',')})`;
    }
}

function quote(string) {
    return `'${string}'`;
}

module.exports = Request;
