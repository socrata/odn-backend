'use strict';

const _ = require('lodash');

const Config = require('../config');
const Exception = require('../error');
const Request = require('../request');

class AutosuggestDataset {
    constructor(id, domain, fxf, column, fields, sortFunc, transformFunc) {
        this.id = id;
        this.domain = domain;
        this.fxf = fxf;
        this.column = column;
        this.fields = fields || [];
        this.sorted = !_.isNil(sortFunc);
        this.sortFunc = sortFunc || _.identity;
        this.transformFunc = transformFunc || _.identity;

        this.baseURL = `https://${domain}/views/${fxf}/columns/${column}/suggest/`;

    }

    get(query, limit) {
        const newLimit = this.sorted && Config.suggest_count_sorted > limit ?
            Config.suggest_count_sorted : limit;
        const url = this._getURL(query, newLimit);

        return Request.getJSON(url).then(response => {
            return this.decode(response.options.map(_.property('text')))
                .then(options => this.sort(options))
                .then(options => this.truncate(options, limit))
                .then(options => this.transform(options))
                .then(options => Promise.resolve({options}));
        });
    }

    decode(options) {
        return this._decodeOptions(options);
    }

    sort(options) {
        return Promise.resolve(this._sortOptions(options));
    }

    truncate(options, limit) {
        return Promise.resolve(options.slice(0, limit));
    }

    transform(options) {
        return Promise.resolve(options.map(this.transformFunc));
    }

    _getURL(query, limit) {
        const path = this.baseURL + query;
        const params = {size: limit};
        return Request.buildURL(path, params);
    }

    _sortOptions(options) {
        if (!this.sorted) return options;
        return _.sortBy(options, this.sortFunc);
    }

    _decodeOptions(options) {
        const decodedPromises = options
            .map(option => this._decode(option));

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
                    reject(Exception.server(`expected hidden fields ${this.fields.join(', ')}
                                in ${allText} but found none`));

                const text = allText.substring(0, index);
                const base64 = allText.substring(index + 1);
                const decoded = Base64.decode(base64);
                const attributes = decoded.split(Config.suggest_separator);

                if (attributes.length !== this.fields.length)
                    reject(Exception.server(`expected ${this.fields.length} hidden fields in
                                ${decoded} but found ${attributes.length}`));

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

