'use strict';

const _ = require('lodash');

const format = require('./format');

class Describe {
    static describe(dataset, entities, constraints, unspecified, rows) {
        return new Promise((resolve, reject) => {
            if (entities.length === 0) return resolve({});

            const descriptions = rows
                .map(getData(dataset, entities, constraints, unspecified))
                .map(describe);

            resolve({
                description: descriptions.join(' ')
            });
        });
    }
}

function getData(dataset, entities, constraints, unspecified) {
    const variables = _.values(dataset.variables);

    if (unspecified === 'variable') {
        return row => {
            return {
                constraints,
                value: row.value,
                entity: _.find(entities, {id: row.id}),
                variable: _.find(variables, variable => {
                    return _.last(variable.id.split('.')) === row.variable;
                })
            };
        };
    } else {
        return row => {
            return {
                constraints: _.pick(row, dataset.constraints),
                value: row.value,
                entity: _.find(entities, {id: row.id}),
                variable: variables[0]
            };
        };
    }
}

function describe(row) {
    const {variable, entity, value, constraints} = row;
    const formattedValue = format(variable.type)(value);

    return `The ${variable.name} of ${entity.name} was ${formattedValue}${describeConstraints(constraints)}.`;
}

function describeConstraints(constraints) {
    if (_.size(constraints) === 0) return '';

    const descriptions = _(constraints)
        .toPairs()
        .map(describeConstraint)
        .value();

    return ` for ${englishJoin(descriptions)}`;
}

function describeConstraint([name, value]) {
    return `the ${name} of ${value}`;
}

function englishJoin(elements) {
    if (elements.length === 0) {
        return '';
    } else if (elements.length === 1) {
        return elements[0];
    } else if (elements.length === 2) {
        return elements.join(' and ');
    } else {
        return englishJoin([elements.slice(0, 2).join(', ')].concat(elements.slice(2)));
    }
}

module.exports = Describe;

