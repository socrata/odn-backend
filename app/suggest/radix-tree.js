'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const SOQL = require('../soql');

class RadixTree {
    // takes a list of lists of characters e.g. [['a', 'b', 'c'], ['a, 'b', 'd']]
    constructor(list) {
        // Storing the list in each node will take a lot of memory,
        // we should probably reconstruct this list on demand instead.
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
        return this._contains(clean(string));
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
        return this._withPrefix(clean(string)).map(substring => {
            return string + substring.join('');
        });
    }

    /**
     * Creates a RadixTree from a list of strings.
     * Note that this function will sort its input.
     */
    static fromStrings(strings) {
        strings.sort();
        return new RadixTree(strings.map(clean));
    }
}

function clean(string) {
    return string
        .replace(/[\W_]/g, '')
        .toLowerCase()
        .split('');
}

const keypress = require('keypress');

keypress(process.stdin);

downloadEntities('region.place').then(treeFromEntities).then(tree => {
    console.log('tree initialized');
    console.log(process.memoryUsage());

    getInput(string => {
        const results = tree.withPrefix(string);
        console.log(`Found ${results.length} suggestions for "${string}"`);
        console.log(results.slice(0, 10));
    });
});

function getInput(callback) {
    let buffer = '';

    process.stdin.on('keypress', (character, key) => {
        if (_.isNil(key)) return;
        if (key.ctrl && key.name === 'c') process.exit();
        if (key.name === 'backspace' && buffer.length > 0)
            buffer = buffer.substring(0, buffer.length - 1);
        else if (character)
            buffer = buffer + character;
        callback(buffer);
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
}

function treeFromEntities(entities) {
    const names = entities.map(_.property('name'));
    const tree = RadixTree.fromStrings(names);
    return Promise.resolve(tree);
}

function downloadEntities(entityType) {
    return new SOQL(Constants.ENTITY_URL)
        .token(Constants.APP_TOKEN)
        .select('name')
        .equal('type', entityType)
        .limit(50000)
        .send();
}

/*
const tree = RadixTree.fromStrings(['seattle', 'washington', 'vancouver', 'seattle metro', 'new york']);
console.log(tree.contains('s'));
console.log(tree.contains('seattle'));
console.log(tree.contains('seattle a'));
console.log(tree.contains('a'));

console.log(tree.withPrefix('s'));
console.log(tree.withPrefix('seatt'));
*/

