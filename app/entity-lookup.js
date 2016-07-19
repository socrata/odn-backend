'use strict';

const _ = require('lodash');

const Constants = require('./constants');
const SOQL = require('./soql');
const Exception = require('./error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;

class EntityLookup {
    static byID(id) {
        if (_.isNil(id))
            return Promise.reject(invalid('id cannot be null'));

        return new SOQL(Constants.ENTITY_URL)
            .equal('id', id)
            .send()
            .then(entities => {
                if (entities.length === 0)
                    return Promise.reject(notFound(`id not found: '${id}'`));
                return Promise.resolve(entities[0]);
            });
    }

    static byIDs(idString) {
        const ids = parseIDString(idString);
        return Promise.all(ids.map(EntityLookup.byID));
    }
}

function parseIDString(idString) {
    if (!_.isString(idString)) return [];
    return _.uniq(idString.split(',').map(id => id.trim()));
}

module.exports = EntityLookup;

