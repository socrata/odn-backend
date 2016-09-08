'use strict';

/**
 * A simple file cache meant for storing large, static entries such as
 * Socrata datasets.
 */

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs-promise');
const mkdirp = require('mkdirp');

class FileCache {
    constructor(directory) {
        this.directory = directory;
        mkdirp.sync(directory);
        this.keys = new Set(getKeys(directory));
    }

    get(key) {
        key = fileName(key);

        if (this.keys.has(key)) return this.read(key);
        return Promise.reject();
    }

    set(key, value) {
        key = fileName(key);

        return this.write(key, value).then(() => {
            this.keys.add(key);
            return Promise.resolve();
        });
    }

    read(key) {
        return fsp.readFile(this.path(key));
    }

    write(key, value) {
        return fsp.writeFile(this.path(key), value);
    }

    path(key) {
        return `${this.directory}/${key}`;
    }
}

function fileName(key) {
    return crypto.createHash('sha512').update(key).digest('base64').replace(/\W/g, '');
}

function getKeys(directory) {
    const filenames = fs.readdirSync(directory);
    return filenames;
}

module.exports = FileCache;

