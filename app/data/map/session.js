'use strict';

class Session {
    constructor(dataset, constraints, entityType) {
        this.dataset = dataset;
        this.constraints = constraints;
        this.entityType = entityType;
        this.sentIDs = {};
    }

    /**
     * Finds all of the entities that have not been sent at the zoom level
     * and marks them as sent.
     */
    notSent(ids, zoomLevel) {
        if (!(zoomLevel in this.sentIDs))
            this.sentIDs[zoomLevel] = new Set();

        const alreadySent = this.sentIDs[zoomLevel];
        const notSent = ids.filter(id => !alreadySent.has(id));
        notSent.forEach(id => alreadySent.add(id));
        return notSent;
    }
}

module.exports = Session;

