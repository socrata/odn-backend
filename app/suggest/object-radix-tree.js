'use strict';

const _ = require('lodash');

const RadixTree = require('./radix-tree');
const MultiMap = require('./multi-map');
const Constants = require('../constants');
const SOQL = require('../soql');
const Stopwords = require('../stopwords');

const THRESHOLD = 100;

class ObjectRadixTree {
    /**
     * Creates a new ObjectRadixTree.
     *  objects: List of objects with id and name attributes.
     *  normalize: Breaks a phrase into words.
     */
    constructor(objects, normalize) {
        this.objects = objects;
        this.idToObject = _.keyBy(objects, 'id');
        this.normalize = normalize;
        this.objectToNames = new MultiMap();

        objects.forEach(object => {
            normalize(object.name).forEach(name => {
                this.objectToNames.add((name), object);
            });
        });

        this.tree = RadixTree.fromStrings([...this.objectToNames.keys()]);
    }

    /**
     * Returns a list of up to limit objects whose names match the prefix.
     */
    withPrefix(prefix, limit) {
        if (_.isEmpty(prefix)) return [];

        const names = this.tree.withPrefix(prefix, limit);

        if (_.isEmpty(names)) return [];

        return _.flatMap(names, name => this.objectToNames.get(name));
            /*
            return this.objectToNames.get(name).map(candidate => {
                const score = name === 'metro' ? 0.5 : 1.0;
                return {candidate, score};
            });
        });
        */
    }

    withPhrase(phrase, limit) {
        const words = this.normalize(phrase);
        let candidates = this.getCandidates(words);
        if (!(candidates.length)) candidates = this.objects;
        return this.rankCandidates(candidates).slice(0, limit);
    }

    getCandidates(words) {
        return _.flatMap(words, word => {
            return this.withPrefix(word, THRESHOLD);
        });
    }

    rankCandidates(candidates) {
        if (!(candidates.length)) return [];

        const scores = scoreCandidates(candidates);
        const bestScore = scores[0].score;
        const withBestScore = scores
            .filter(candidate => candidate.score === bestScore);

        // Restore filtering
        const objects = this.idsToObjects(scores.map(_.property('id')));
        return objects;
    }

    idsToObjects(ids) {
        return ids.map(_.propertyOf(this.idToObject));
    }
}

function scoreCandidates(candidates) {
    return _(candidates)
        .countBy('id')
        /*
        .groupBy('candidate.id')
        .mapValues(scores => _.sumBy(scores, 'score'))
        */
        .toPairs()
        .map(([id, score]) => {
            return {id, score};
        })
        .orderBy('score', 'desc')
        .value();
}

// We need to strip stopwords for variable names but not entity names.
function objectToNames(object) {
    return toWords(object.name).map(clean);
}

function clean(string) {
    return string.toLowerCase();
}

function toWords(phrase) {
    return phrase.match(/\b(\w+)\b/g);
}

module.exports = ObjectRadixTree;

