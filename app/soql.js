'use strict';

const _ = require('lodash');

const Request = require('./request');
const Exception = require('./error');
const invalidAppToken = Exception.invalidAppToken;
const missingAppToken = Exception.missingAppToken;
const Constants = require('./constants');
const tokenKey = Constants.APP_TOKEN_HEADER;

/**
 * Building SOQL queries.
 *
 */
class SOQL {
    constructor(url, headers, query) {
        this.url = url;
        this.headers = headers || {};
        this.query = query || {};
    }

    token(token) {
        if (!_.isNil(token))
            this.headers[tokenKey] = token;
        return this;
    }

    select(column) {
        return this.append('$select', column, ',');
    }

    selectAs(column, alias) {
        if (_.isNil(column) || _.isNil(alias)) return this;
        return this.select(`${column} as ${alias}`);
    }

    limit(number) {
        return this.equal('$limit', number);
    }

    offset(number) {
        return this.equal('$offset', number);
    }

    where(condition) {
        return this.append('$where', condition, ' AND ');
    }

    whereIn(column, options) {
        if (_.isNil(column) || _.isNil(options) || options.length === 0) return this;
        return this.where(`${column} in (${options.map(quote).join(',')})`);
    }

    order(column, ordering) {
        if (_.isNil(column)) return this;
        return this.append('$order', join(' ', column, ordering), ',');
    }

    equal(column, value) {
        if (!(_.isNil(column) || _.isNil(value))) this.query[column] = value;
        return this;
    }

    equals(constraints) {
        _.forIn(constraints, (value, key) => this.equal(key, value));
        return this;
    }

    q(string) {
        return this.equal('$q', string);
    }

    group(column) {
        return this.append('$group', column, ',');
    }

    clone() {
        return new SOQL(this.url, _.cloneDeep(this.headers), _.cloneDeep(this.query));
    }

    send() {
        if (!(tokenKey in this.headers)) return Promise.reject(missingAppToken());
        if (!('$limit' in this.query)) this.query.$limit = 1000;
        const url = Request.buildURL(this.url, this.query);
        const options = {url, headers: this.headers};
        return Request.getJSON(options).catch(error => {
            if (error.statusCode === 403 && tokenKey in this.headers)
                return Promise.reject(invalidAppToken(this.headers[tokenKey]));
            return Promise.reject(error);
        });
    }

    append(column, value, separator) {
        if (_.isEmpty(column) || _.isEmpty(value) || _.isEmpty(separator)) return this;
        return this.equal(column, join(separator, this.query[column], value));
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
