'use strict';

const _ = require('lodash');

const Constants = require('./constants');
const Request = require('./request');
const Exception = require('./error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;

class EntityLookup {
    static byID(id) {
        if (_.isNil(id))
            return Promise.reject(invalid('id cannot be null'));

        const url = Request.buildURL(Constants.ENTITY_URL, {id});

        return Request.getJSON(url).then(entities => {
            if (entities.length === 0)
                return Promise.reject(notFound(`id not found: '${id}'`));
            return Promise.resolve(entities[0]);
        });
    }

    static byIDs(idString) {
        const ids = parseIDString(idString);
        return Promise.all(ids.map(EntityLookup.byID));
    }

    /**
     * Search for entities using full text search on name.
     */
    static byName(name, limit) {
        if (_.isNil(name) || limit === 0) return Promise.resolve([]);

        const url = Request.buildURL(Constants.ENTITY_URL, _.assign({
            $q: name,
            $order: 'rank desc'
        }, limit > 0 ? {$limit: limit} : {}));

        return Request.json(url);
    }
}

function parseIDString(idString) {
    if (!_.isString(idString)) return [];
    return _.uniq(idString.split(',').map(id => id.trim()));
}

module.exports = EntityLookup;

