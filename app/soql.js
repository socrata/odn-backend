'use strict';

const _ = require('lodash');

const Request = require('./request');
const Exception = require('./error');
const invalidAppToken = Exception.invalidAppToken;

const tokenKey = 'X-App-Token';

/**
 * Building SOQL queries.
 *
 */
class SOQL {
    constructor(url) {
        this.url = url;
        this.headers = {};
        this.query = {};
    }

    token(token) {
        this.headers[tokenKey] = token;
        return this;
    }

    select(column) {
        this.query.$select = join(',', this.query.$select, column);
        return this;
    }

    selectAs(column, alias) {
        return this.select(`${column} as ${alias}`);
    }

    limit(number) {
        this.query.$limit = number;
        return this;
    }

    offset(number) {
        this.query.$offset = number;
        return this;
    }

    where(condition) {
        this.query.$where = join(' AND ', this.query.$where, condition);
        return this;
    }

    whereIn(column, options) {
        return this.where(`${column} in (${options.map(quote).join(',')})`);
    }

    order(column, ordering) {
        this.query.$order = join(',', this.query.$order, join(' ', column, ordering));
        return this;
    }

    send() {
        const url = Request.buildURL(this.url, this.query);
        const options = {url, headers: this.headers};
        return Request.getJSON(options).catch(error => {
            if (error.statusCode === 403 && tokenKey in this.headers)
                return Promise.reject(invalidAppToken(this.headers[tokenKey]));
            return Promise.reject(error);
        });
    }
}

function join(separator) {
    return _(arguments)
        .values()
        .filter(_.negate(_.isNil))
        .tail()
        .join(separator);
}

function quote(string) {
    return `"${string}"`;
}

module.exports = SOQL;
