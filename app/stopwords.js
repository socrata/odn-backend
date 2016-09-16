'use strict';

const _ = require('lodash');
const fs = require('fs');

class Stopwords {
    /**
     * List of stopwords
     */
    constructor(stopwords) {
        this.stopwords = new Set(stopwords);
    }
    /**
     * Extracts all important words from a string ignoring all stopwords.
     */
    importantWords(string) {
        const words = string
            .toLowerCase()
            .match(/\b(\w+)\b/g);

        if (_.isEmpty(words)) return [];
        return words.filter(word => !this.stopwords.has(word));
    }

    /**
     * Strips all stopwords from the string.
     */
    strip(string) {
        return this.importantWords(string).join(' ');
    }
}

const stopwordsJSON = fs.readFileSync('data/stopwords.json');
module.exports = new Stopwords(JSON.parse(stopwordsJSON));

