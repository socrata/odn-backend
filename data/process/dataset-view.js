'use strict';

class DatasetView {
    constructor(dataset, params) {
        this.dataset = dataset;
        this.params = params;
        this.pageSize = 50000;
        this.pageNumber = 0;
        this.done = false;
    }

    /**
     * Get a promise with the next page of results in the view.
     */
    next() {
        return new Promise((resolve, reject) => {
            if (this.done) {
                reject('done');
            } else {
                this.dataset.getPage(this.pageNumber, this.pageSize, this.params).then(results => {
                    if (results.length < this.pageSize) this.done = true;
                    resolve(results);
                }).catch(reject);

                this.pageNumber++;
            }
        });
    }

    /**
     * Pipe the entire view to the given callback.
     */
    all(callback) {
        this.next().then(response => {
            callback(response);
            this.all(callback);
        }).catch(error => {
            console.log(error);
        });
    }
}

module.exports = DatasetView;

