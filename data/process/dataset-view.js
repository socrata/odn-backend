'use strict';

class DatasetView {
    constructor(dataset, params) {
        this.dataset = dataset;
        this.params = params;
        this.pageSize = 10000;
        this.pageNumber = 0;
        this.done = false;
    }

    /**
     * Get a promise with the next page of results in the view.
     */
    next() {
        if (this.done) return Promise.reject('done');

        const result = this.dataset.getPage(this.pageNumber, this.pageSize, this.params).then(results => {
            if (results.length < this.pageSize) this.done = true;
            return Promise.resolve(results);
        });

        this.pageNumber++;
        return result;
    }

    /**
     * Pipe the entire view to the given callback.
     */
    all(callback) {
        return this.next().then(response => {
            callback(response);
            return this.all(callback);
        }).catch(error => {
            if (error === 'done') return Promise.resolve();
            return Promise.reject(error);
        });
    }
}

module.exports = DatasetView;

