'use strict';

const _ = require('lodash');

class RadixTree {
    // takes a list of lists of characters e.g. [['a', 'b', 'c'], ['a, 'b', 'd']]
    constructor(list) {
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

    /*
    listChildren() {
        if (_.isEmpty(this.children)) return [];

        return _.flatMap(_.keys(this.children), character => {
            const child = this.children[character];
            return child.listChildren().map(grandchild => {
                return [character].concat(grandchild);
            });
        });
    }
    */

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

const tree = RadixTree.fromStrings(['seattle', 'washington', 'vancouver', 'seattle metro', 'new york']);
console.log(tree.contains('s'));
console.log(tree.contains('seattle'));
console.log(tree.contains('seattle a'));
console.log(tree.contains('a'));

console.log(tree.withPrefix('s'));
console.log(tree.withPrefix('seatt'));

