'use strict';

const _ = require('lodash');

class RadixTree {
    // takes a list of lists of characters e.g. [['a', 'b', 'c'], ['a, 'b', 'd']]
    constructor(list) {
        // Storing the list in each node will take a lot of memory,
        // we should probably reconstruct this list on demand instead.
        // This will cut memory usage at least in half.
        this.list = list;
        this.children = {};
        this.data = [];

        list.forEach(string => {
            if (string.length === 0) return this.data.push(1);
            const head = string[0];
            const tail = _.tail(string);

            if (head in this.children) this.children[head].push(tail);
            else this.children[head] = [tail];
        });

        this.children = _.mapValues(this.children, childList => new RadixTree(childList));
    }

    _contains(characters) {
        if (!(characters.length)) return false;

        const head = characters[0];
        const tail = _.tail(characters);

        if (characters.length === 1) return head in this.children;
        return head in this.children && this.children[head]._contains(tail);
    }

    contains(string) {
        return this._contains(toCharacters(string));
    }

    _withPrefix(characters) {
        if (!(characters.length)) {
            return this.list;
        } else if (characters[0] in this.children) {
            const child = this.children[characters[0]];
            return child._withPrefix(_.tail(characters));
        } else {
            return [];
        }
    }

    withPrefix(string) {
        return this._withPrefix(toCharacters(string)).map(substring => {
            return string + substring.join('');
        });
    }

    /**
     * Creates a RadixTree from a list of strings.
     */
    static fromStrings(strings) {
        return new RadixTree(strings.map(toCharacters));
    }
}

function toCharacters(string) {
    return string.split('');
}

module.exports = RadixTree;

