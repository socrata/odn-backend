'use strict';

const _ = require('lodash');
const request = require('request-promise');

const Request = require('../../app/request');
const FileCache = require('./file-cache');
const cache = new FileCache('.dataset-cache');

class Dataset {
    constructor(domain, fxf) {
        this.domain = domain;
        this.fxf = fxf;
        this.path = `https://${domain}/resource/${fxf}.json`;
    }

    getPage(pageNumber, pageSize, params) {
        const url = Request.buildURL(this.path, _.assign({}, params, {
            '$offset': pageNumber * pageSize,
            '$limit': pageSize
        }));

        return getJSON(url);
    }

    static fromJSON(json) {
        return new Dataset(json.domain, json.fxf);
    }
}

function getJSON(url) {
    return cache.get(url).catch(() => {
        return request(url).then(response => {
            cache.set(url, response).catch(error => {
                console.log(error);
            });

            return Promise.resolve(response);
        });
    }).then(buffer => {
        return Promise.resolve(bufferToJSON(buffer));
    });
}

function bufferToJSON(buffer) {
    return Promise.resolve(JSON.parse(buffer.toString()));
}

module.exports = Dataset;

