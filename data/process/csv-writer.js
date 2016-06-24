'use strict';

const _ = require('lodash');
const fs = require('fs');

class CSVWriter {
    constructor(path, fields) {
        this.path = path;
        this.fields = fields;
        this.append(fields);
    }

    append(values) {
        const rowString = values.map(value => `"${value}"`).join(',');
        fs.appendFileSync(this.path, `${rowString}\n`);
    }

    appendObject(object) {
        const values = _.map(this.fields, field => object[field]);
        this.append(values);
    }
}

module.exports = CSVWriter;

