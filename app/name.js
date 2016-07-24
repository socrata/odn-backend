
const fs = require('fs');

/**
 * Name from ID.
 *
 * population_of_region => Population of Region
 */
module.exports = id => {
    return id
        .split(/[-_\s]+/)
        .map(capitalize)
        .map(formatNumber)
        .join(' ');
};

const uncapitalizedJSON = fs.readFileSync('data/uncapitalized.json');
const uncapitalized = new Set(JSON.parse(uncapitalizedJSON));

function capitalize(word) {
    return word.replace(/(.)(.*)/g, (all, first, rest) => {
        if (uncapitalized.has(all.toLowerCase())) return all;
        return `${first.toUpperCase()}${rest}`;
    });
}

function formatNumber(string) {
    return string
        .replace(/\d+/g, number => parseInt(number, 10).toLocaleString());
}

