'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const MultiMap = require('./multi-map');
const Constants = require('../constants');
const SOQL = require('../soql');

class ObjectRadixTree {
    /**
     * Creates a new ObjectRadixTree.
     *  objects: List of objects
     *  objectToNames: Function that maps an object to a list of strings.
     *  normalize: Function that normalizes object names.
     *      For example, by removing whitespace.
     */
    constructor(objects, objectToNames, normalize) {
        this.normalize = normalize || _.identity;

        this.objectToNames = new MultiMap();
        objects.forEach(object => {
            objectToNames(object).forEach(name => {
                this.objectToNames.add(this.normalize(name), object);
            });
        });

        this.tree = RadixTree.fromStrings([...this.objectToNames.keys()]);
    }

    /**
     * Returns a list of up to limit objects whose names
     * match the normalized prefix.
     */
    withPrefix(prefix, limit) {
        if (_.isEmpty(prefix)) return [];
        prefix = this.normalize(prefix);
        const names = this.tree.withPrefix(prefix, limit);
        if (_.isEmpty(names)) return [];
        return _.flatMap(names, name => this.objectToNames.get(name));
    }
}

module.exports = ObjectRadixTree;

