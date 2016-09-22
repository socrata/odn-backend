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
     */
    constructor(objects) {
        this.objects = objects;
        this.idToObject = _.keyBy(objects, 'id');
        this.objectToNames = new MultiMap();

        objects.forEach(object => {
            objectToNames(object).forEach(name => {
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
        prefix = clean(prefix);
        const names = this.tree.withPrefix(prefix, limit);
        if (_.isEmpty(names)) return [];
        return _.flatMap(names, name => this.objectToNames.get(name));
    }

    withPhrase(phrase, limit) {
        const words = Stopwords.importantWords(phrase);
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

        return this.idsToObjects(withBestScore.map(_.property('id')));
    }

    idsToObjects(ids) {
        return ids.map(_.propertyOf(this.idToObject));
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

function objectToNames(object) {
    return Stopwords.importantWords(object.name);
}

function clean(string) {
    return Stopwords.importantWords(string).join('');
}

module.exports = ObjectRadixTree;

