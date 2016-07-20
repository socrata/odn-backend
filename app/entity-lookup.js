'use strict';

const _ = require('lodash');

const Constants = require('./constants');
const SOQL = require('./soql');
const Exception = require('./error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;

class EntityLookup {
    static byID(id, token) {
        if (_.isNil(id))
            return Promise.reject(invalid('entity_id cannot be null'));

        return new SOQL(Constants.ENTITY_URL)
            .token(token)
            .equal('id', id)
            .send()
            .then(entities => {
                if (entities.length === 0)
                    return Promise.reject(notFound(`entity_id not found: '${id}'`));
                return Promise.resolve(entities[0]);
            });
    }

    static byIDs(idString, token) {
        const ids = parseIDString(idString);
        return Promise.all(ids.map(id => EntityLookup.byID(id, token)));
    }
}

function parseIDString(idString) {
    if (!_.isString(idString)) return [];
    return _.uniq(idString.split(',').map(id => id.trim()));
}

module.exports = EntityLookup;

