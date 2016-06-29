'use strict';

const _ = require('lodash');
const fs = require('fs');
const stringify = require('csv-stringify');

class CSVWriter {
    constructor(path, fields) {
        this.path = path;
        this.fields = fields;

        this.output = fs.createWriteStream(path);
        this.append(fields);
    }

    append(values) {
        stringify([values], (error, data) => {
            if (_.isNil(error)) this.output.write(data);
        });
    }

    appendObject(object) {
        const values = _.map(this.fields, field => object[field]);
        this.append(values);
    }
}

module.exports = CSVWriter;

