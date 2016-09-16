'use strict';

const _ = require('lodash');
const Exception = require('../../error');
const invalid = Exception.invalidParam;
const lowercase = require('../../lowercase');
const format = require('./format');

class Describe {
    static describe(dataset, entities, constraints, unspecified, rows) {
        if (entities.length === 0)
            return Promise.reject(invalid('must specify entities to get a description'));

        const descriptions = rows
            .map(getData(dataset, entities, constraints, unspecified))
            .map(describe);

        return Promise.resolve({
            description: descriptions.join(' ')
        });
    }

    static describeForecast(wholeFrame, unsortedEntities, variable) {
        const entities = _.tail(wholeFrame.data[0])
            .filter(column => column !== 'forecast')
            .map(id => _.find(unsortedEntities, {id}));

        const description = subframes(wholeFrame, true)
            .map((frame, index) => describeFrame(frame, entities[index], variable));

        return Promise.resolve(description);
    }
}

function describeFrame(frame, entity, variable) {
    frame = frame.filter(hasData);
    const growth = growthRate(frame);
    const first = frame[0];
    const last = lastMeasured(frame);
    const forecast = _.last(frame);
    const formatter = format(variable.type);

    const lastMeasuredSummary =
        `The last measured ${lowercase(variable.name)}
        for ${entity.name} was ${formatter(last[1])} in ${last[0]}. `;

    const forecastSummary = _.isNaN(growth) || _.isNil(growth) ? '' :
        `${entity.name} experienced an average growth rate of ${format('percent')(growth)}
        from our first statistic recorded in ${first[0]}.
        If past trends continue, we forecast the ${lowercase(variable.name)} to be
        ${formatter(forecast[1])} by ${forecast[0]}.`;

    return (lastMeasuredSummary + forecastSummary).replace(/\n\s*/g, ' ');
}

function hasData(row) {
    return !_.isEmpty(row) && row.length >= 2 && !_.isNil(row[1]);
}

function lastMeasured(frame) {
    return _.findLast(frame, _.negate(_.last));
}

function growthRate(frame) {
    const measured = _.filter(frame, _.negate(_.last));
    if (measured.length < 2) return NaN;
    const [first, last] = [_.first(measured), _.last(measured)]
        .map(tuple => tuple[1]);
    if (first === 0.0) return NaN;
    return 100 * ((last - first) / first / (measured.length - 1));
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

    return `The ${lowercase(variable.name)} of ${entity.name} was ${formattedValue}${describeConstraints(constraints)}.`;
}

function describeConstraints(constraints) {
    if (_.size(constraints) === 0) return '';

    const constraintDescriptions = describeNonYearConstraints(_.omit(constraints, 'year'));
    const yearDescription = describeYear(constraints);

    return constraintDescriptions + yearDescription;
}

function describeYear(constraints) {
    if ('year' in constraints) return ` in ${constraints.year}`;
    return '';
}

function describeNonYearConstraints(constraints) {
    if (_.size(constraints) === 0) return '';
    return ` for ${englishJoin(_.values(constraints).map(lowercase))}`;
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

