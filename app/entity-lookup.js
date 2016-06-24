'use strict';

const _ = require('lodash');

const Constants = require('./constants');
const Request = require('./request');
const Exception = require('./controllers/error');

class EntityLookup {
    static byID(id) {
        return new Promise((resolve, reject) => {
            if (_.isNil(id)) {
                reject(Exception.invalidParam('id cannot be null'));
            } else {
                const url = Request.buildURL(Constants.ENTITY_URL, {id});

                Request.getJSON(url).then(json => {
                    if (json.length === 0) {
                        reject(Exception.notFound(`id not found: '${id}'`));
                    } else {
                        resolve(_.pick(json[0], ['id', 'name', 'type']));
                    }
                }).catch(reject);
            }
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

