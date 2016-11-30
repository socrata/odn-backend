'use strict';

const _ = require('lodash');

const Config = require('../../config');
const Cache = require('../../cache');
const cache = new Cache(null, Config.cache_options);

class Session {
    constructor(dataset, constraints, entityType, entities, token, id) {
        this.dataset = dataset;
        this.variable = _.first(_.values(dataset.variables));
        this.variable = _.values(dataset.variables)[0];
        this.constraints = constraints;
        this.entityType = entityType;
        this.entities = entities;
        this.token = token;
        this.id = id || generateID();
    }

    /**
     * Finds all of the entities that have not been sent at the zoom level
     * and marks them as sent.
     */
    notSent(ids, zoomLevel) {
        const key = this.cacheKey(zoomLevel);

        return cache.get(key).then(alreadySent => {
            const alreadySentSet = new Set(alreadySent.split(' '));
            const notSent = ids.filter(id => !alreadySentSet.has(id));

            cache.append(key, ` ${notSent.join(' ')}`).catch(error => {
                console.error(error);
            });

            return Promise.resolve(notSent);
        }).catch(error => {
            cache.set(key, ids.join(' ')).catch(error => {
                console.error(error);
            });

            return Promise.resolve(ids);
        });
    }

    cacheKey(zoomLevel) {
        return `session${this.id}zoom${zoomLevel}`;
    }
}

function generateID() {
    return Math.random().toString(36).substr(2);
}

module.exports = Session;

