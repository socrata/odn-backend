'use strict';

const _ = require('lodash');

const Constants = require('../../constants');
const Exception = require('../../controllers/error');
const Request = require('../../request');

class AutosuggestDataset {
    constructor(domain, fxf, column, fields, sort, transform) {
        this.domain = domain;
        this.fxf = fxf;
        this.column = column;
        this.fields = fields || [];
        this.sorted = !_.isNil(sort);
        this.sort = sort || _.identity;
        this.transform = transform || _.identity;

        this.baseURL = `https://${domain}/views/${fxf}/columns/${column}/suggest/`;

    }

    get(query, limit) {
        return new Promise((resolve, reject) => {
            const url = this._getURL(query, this.sorted ? limit * 3 : limit);

            return Request.getJSON(url).then(response => {
                this._decodeOptions(response.options).then(options => {
                    options = this._sortOptions(options).slice(0, limit);
                    options = options.map(this.transform);
                    resolve({options});
                }).catch(reject);
            }).catch(reject);
        });
    }

    _getURL(query, limit) {
        const path = this.baseURL + query;
        const params = {size: limit};
        return Request.buildURL(path, params);
    }

    _sortOptions(options) {
        if (!this.sorted) return options;
        return _.sortBy(options, this.sort);
    }

    _decodeOptions(options) {
        const decodedPromises = options
            .map(option => this._decode(option.text));

        return Promise.all(decodedPromises);
    }

    /**
     * Extracts hidden base64-encoded attributes from a string.
     * Returns an object with a field for each encoded attribute
     * as well as a text field with the original text minus the encoded blob.
     * Note that all this.fields will be strings and no float parsing is done.
     *
     * String in the form:
     *  United States MDEwMDAwMFVTOm5hdGlvbjozMTE1MzY1OTQ=
     * With the encoded this.fields:
     *  id, type, population
     * Will yield the following object:
     *
     * {
     *  text: 'United States',
     *  id: '0100000US1',
     *  type: 'nation',
     *  population: '314583290'
     * }
     */
    _decode(allText) {
        return new Promise((resolve, reject) => {
            if (this.fields.length > 0) {
                const index = allText.lastIndexOf(' ');
                if (index === -1)
                    reject(Exception.server(`expected hidden this.fields ${this.fields.join(', ')}
                                in ${allText} but found none`));

                const text = allText.substring(0, index);
                const base64 = allText.substring(index + 1);
                const decoded = Base64.decode(base64);
                const attributes = decoded.split(Constants.SUGGEST_SEPARATOR);

                if (attributes.length !== this.fields.length)
                    reject(Exception.server(`expected ${this.fields.length} hidden this.fields in
                                ${decoded} but found ${this.fields.length}`));

                resolve({text, fields: _.zipObject(this.fields, attributes)});
            } else {
                resolve({text: allText});
            }
        });
    }
}

class Base64 {
    static decode(encoded) {
        return new Buffer(encoded, 'base64').toString('ascii');
    }
}

module.exports = AutosuggestDataset;

