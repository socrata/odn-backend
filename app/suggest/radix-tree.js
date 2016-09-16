'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const SOQL = require('../soql');

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
     * Note that this function will sort its input.
     */
    static fromStrings(strings) {
        strings.sort();
        return new RadixTree(strings.map(toCharacters));
    }
}

function toCharacters(string) {
    return string.split('');
}

function clean(string) {
    return string.replace(/[\W_]/g, '').toLowerCase();
}

const keypress = require('keypress');

keypress(process.stdin);

downloadEntities('region.place').then(entities => {
    const nameToEntities = getNameToEntities(entities);
    const tree = RadixTree.fromStrings(_.keys(nameToEntities));

    getInput(string => {
        string = clean(string);
        const names = _.isEmpty(string) ? [] : tree.withPrefix(string);
        console.log(`Found ${names.length} suggestions for "${string}"`);

        const entities = _(names)
            .flatMap(_.propertyOf(nameToEntities))
            .orderBy(['rank'], ['desc'])
            .value();

        entities.slice(0, 10).forEach(entity => {
            console.log(entity.name);
        });
    });
});

function getNameToEntities(entities) {
    const nameToEntities = {};

    entities.forEach(entity => {
        const name = clean(entity.name);
        if (name in nameToEntities) nameToEntities[name].push(entity);
        nameToEntities[name] = [entity];
    });

    return nameToEntities;
}

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

function downloadEntities(entityType) {
    return new SOQL(Constants.ENTITY_URL)
        .token(Constants.APP_TOKEN)
        .select('name,rank')
        .equal('type', entityType)
        .limit(50000)
        .send()
        .then(entities => {
            entities.forEach(entity => entity.rank = parseInt(entity.rank, 10));
            return Promise.resolve(entities);
        });
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

