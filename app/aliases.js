'use strict';

const fs = require('fs');
const _ = require('lodash');

class Aliases {
    constructor(aliases) {
        this.aliases = {};

        aliases.forEach(group => {
            group.forEach(word => {
                this.aliases[lower(word)] = _.without(group, word);
            });
        });
    }

    get(word) {
        return this.aliases[lower(word)] || [];
    }
}

function lower(string) {
    return string.toLowerCase();
}

const aliasJSON = fs.readFileSync('data/aliases.json');
module.exports = new Aliases(JSON.parse(aliasJSON));

