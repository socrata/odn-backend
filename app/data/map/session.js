'use strict';

const cache = require('../../cache');
const Constants = require('../../constants');

class Session {
    constructor(dataset, constraints, entityType, entities, id) {
        this.dataset = dataset;
        this.constraints = constraints;
        this.entityType = entityType;
        this.entities = entities;
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

