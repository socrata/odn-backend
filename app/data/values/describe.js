'use strict';

const _ = require('lodash');
const Exception = require('../../error');
const invalid = Exception.invalidParam;

const format = require('./format');

class Describe {
    static describe(dataset, entities, constraints, unspecified, rows) {
        return new Promise((resolve, reject) => {
            if (entities.length === 0) return reject(invalid(
                'must specify entities to get a description'));

            const descriptions = rows
                .map(getData(dataset, entities, constraints, unspecified))
                .map(describe);

            resolve({
                description: descriptions.join(' ')
            });
        });
    }

    static describeForecast(frame, entities, variable) {
        const description = subframes(frame, true)
            .map((frame, index) => describeFrame(frame, entities[index], variable));
        return Promise.resolve(description);
    }
}

function describeFrame(frame, entity, variable) {
    const growth = growthRate(frame);
    const first = frame[0];
    const last = lastMeasured(frame);
    const forecast = _.last(frame);
    const formatter = format(variable.type);

    return `The last measured ${variable.name}
        for ${entity.name} was ${formatter(last[1])} for ${last[0]}.
        ${entity.name} experienced an average growth rate of ${format('percent')(growth)}
        from our first statistic recorded in ${first[0]}.
        If past trends continue, we forecast the ${variable.name} to be
        ${formatter(forecast[1])} by ${forecast[0]}.`.replace(/\n\s*/g, ' ');
}

function lastMeasured(frame) {
    return _.findLast(frame, _.negate(_.last));
}

function growthRate(frame) {
    const measured = _.filter(frame, _.negate(_.last));
    if (measured.length < 2) return NaN;
    const [first, last] = [_.first(measured), _.last(measured)]
        .map(tuple => tuple[1]);
    return 100 * ((last - first) / first / measured.length);
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

/**
 * Break one frame into a frame for each entity.
 */
function subframes(frame, forecast) {
    const data = transpose(frame.data).map(_.tail);
    const years = data[0];
    return _(data)
        .tail()
        .chunk(1 + forecast)
        .map(tuple => _.concat([years], tuple))
        .map(transpose)
        .value();
}

function transpose(matrix) {
    return _.unzip(matrix);
}

module.exports = Describe;

