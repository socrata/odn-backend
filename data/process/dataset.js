'use strict';

const _ = require('lodash');
const request = require('request-promise');

const Request = require('../../app/request');

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

        return new Promise((resolve, reject) => {
            request(url).then(response => {
                resolve(JSON.parse(response.toString()));
            }).catch(reject);
        });
    }

    static fromJSON(json) {
        return new Dataset(json.domain, json.fxf);
    }
}

module.exports = Dataset;

