'use strict';

const _ = require('lodash');

const format = require('./format');

class Describe {
    static describe(dataset, entities, constraints, unspecified, rows) {
        return new Promise((resolve, reject) => {
            if (entities.length === 0) return resolve({});

            const variables = _.values(dataset.variables);

            if (unspecified === 'variable') {
                const descriptions = rows
                    .map(_.curry(getEntityAndVariable)(entities)(variables))
                    .map(_.curry(describe)(constraints));

                resolve({
                    description: descriptions.join(' ')
                });
            } else {
                resolve({});
            }
        });
    }
}

function describe(constraints, row) {
    const {variable, entity, value} = row;
    const formattedValue = format(variable.type)(value);

    return `The ${variable.name} of ${entity.name} is ${formattedValue}${describeConstraints(constraints)}.`;
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

function getEntityAndVariable(entities, variables, row) {
    return {
        value: row.value,
        entity: _.find(entities, {id: row.id}),
        variable: _.find(variables, variable => {
            return _.last(variable.id.split('.')) === row.variable;
        })
    };
}

module.exports = Describe;

