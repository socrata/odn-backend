'use strict';

/**
 * Maps a key to list of values.
 * Maintains order of insertion.
 */
class MultiMap {
    constructor() {
        this.map = new Map();
    }

    add(key, value) {
        if (!(this.map.has(key))) this.map.set(key, []);
        this.map.get(key).push(value);
    }

    get(key) {
        return this.map.get(key);
    }

    keys() {
        return this.map.keys();
    }
}

module.exports = MultiMap;

