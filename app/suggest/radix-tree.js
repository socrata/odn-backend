'use strict';

const _ = require('lodash');

class RadixTree {
    /**
     * Creates a radix tree from a list of lists of characters.
     *
     * Maintains ordering of the list.
     */
    constructor(list) {
        // Mapping from character to child radix tree.
        this.children = new Map();
        this.leaf = false;

        list.forEach(string => {
            if (string.length === 0) {
                this.leaf = true;
                return;
            }

            const head = string[0];
            const tail = _.tail(string);

            if (!(this.children.has(head))) this.children.set(head, []);
            this.children.get(head).push(tail);
        });

        for (const [key, childList] of this.children.entries()) {
            this.children.set(key, new RadixTree(childList));
        }
    }

    /**
     * Returns an iterator over all nodes in the tree in order of insertion.
     */
    * entries(buffer) {
        buffer = buffer || [];

        if (this.leaf) yield buffer;

        if (!_.isEmpty(this.children)) {
            for (const [character, childTree] of this.children) {
                yield * childTree.entries(buffer.concat(character));
            }
        }
    }

    /**
     * Returns up to limit strings in the tree with the given prefix.
     * If the string is null or undefined, this will return an empty list.
     * If limit is not provided or is not an integer, results will not be limited.
     */
    withPrefix(string, limit) {
        if (_.isNil(string)) return [];
        const tree = this._withPrefix(toCharacters(string));
        if (_.isNil(tree)) return [];

        return take(tree.entries(), limit).map(characters => {
            return string + characters.join('');
        });
    }

    /**
     * Returns the subtree with the given prefix or null if no such tree exists.
     */
    _withPrefix(characters) {
        if (_.isNil(characters)) return null;
        if (!(characters.length)) return this;
        if (!(this.children.has(characters[0]))) return null;
        return this.children.get(characters[0])._withPrefix(_.tail(characters));
    }

    /**
     * Creates a RadixTree from a list of strings.
     */
    static fromStrings(strings) {
        return new RadixTree(strings.map(toCharacters));
    }
}

/**
 * String to list of characters.
 */
function toCharacters(string) {
    return string.split('');
}

/**
 * Takes limit elements from the generator and returns them as a list.
 *
 * If limit is not provided or not an integer, returns all items in the generator
 * which could be infinite.
 */
function take(generator, limit) {
    let values = [];
    const limited = _.isInteger(limit);

    for (const value of generator) {
        if (limited && values.length >= limit) return values;
        values.push(value);
    }

    return values;
}

module.exports = RadixTree;

