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
    }

    /**
     * Finds all of the entities in the tree which match the whole phrase.
     *
     * For example, "seattle" matches "Seattle, WA" but "seattle population" does not.
     */
    match(phrase, limit) {
        const words = this.normalize(phrase);
        const candidates = this.getCandidates(words)
            .filter(candidate => candidate.score === words.length);

        return this.lookupCandidates(candidates, limit);
    }

    withPhrase(phrase, limit) {
        const words = this.normalize(phrase);
        const candidates = this.getCandidates(words);

        if (!(candidates.length)) return [];

        const bestScore = candidates[0].score;
        const withBestScore = candidates
            .filter(candidate => candidate.score > bestScore / 2);

        return this.lookupCandidates(withBestScore, limit);
    }

    /**
     * Generates a list of candidate objects from a list of words.
     * Each candidate has a score which is the number of times that
     * a reference to it appears in the phrase.
     */
    getCandidates(words) {
        let candidates = _.flatMap(words, word => this.withPrefix(word, THRESHOLD));
        if (!(candidates.length)) candidates = this.objects;
        return scoreCandidates(candidates);
    }

    lookupCandidates(candidates, limit) {
        return candidates
            .slice(0, limit)
            .map(candidate => this.idToObject[candidate.id]);
    }
}

function scoreCandidates(candidates) {
    return _(candidates)
        .countBy('id')
        .toPairs()
        .map(([id, score]) => {
            return {id, score};
        })
        .orderBy('score', 'desc')
        .value();
}

module.exports = ObjectRadixTree;

