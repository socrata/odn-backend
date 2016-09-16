'use strict';

function lowercase(string) {
    return string.replace(/\w*/g, lowercaseWord);
}

function lowercaseWord(word) {
    if (word.length === 0 || (word.length > 2 && isAllCaps(word))) return word;
    return word.toLowerCase();
}

function isAllCaps(word) {
    return /^[^a-z]*$/.test(word);
}

module.exports = lowercase;

