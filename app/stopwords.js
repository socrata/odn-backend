'use strict';

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
        return string
            .replace(/[\.,]/g, '')
            .replace(/[\\\/]/g, ' ')
            .toLowerCase()
            .split(' ')
            .filter(word => !this.stopwords.has(word));
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

