'use strict';

const _ = require('lodash');
const querystring = require('querystring');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const Constraint = require('./constraint');
const SOQL = require('../../soql');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);
    const token = request.token;

    const variableID = request.params.variable;
    if (_.isNil(variableID) || variableID === '')
        return errorHandler(Exception.invalidParam('variable required'));

    EntityLookup.byIDs(request.query.entity_id, token).then(entities => {
        if (entities.length === 0)
            return errorHandler(Exception.invalidParam('at least one id required'));

        const [dataset, variable] = Constraint.parseID(entities, variableID);
        if (_.some([dataset, variable], _.isNil))
            return errorHandler(Exception.notFound(`invalid variable id: ${variableID}`));

        const constraint = request.query.constraint;
        if (_.isNil(constraint) || constraint === '')
            return errorHandler(Exception.invalidParam(`constraint required.
                        Must be one of ${dataset.constraints.join(', ')}`));

        if (!_.includes(dataset.constraints, constraint))
            return errorHandler(Exception.notFound(`invalid constraint: ${constraint}.
                        Must be one of: ${dataset.constraints.join(', ')}`));

        const constraints = _.omit(request.query, ['entity_id', 'constraint', 'app_token']);

        Constraint.validateConstraints(dataset, constraint, constraints).then(() => {
            new SOQL(dataset.url)
                .token(token)
                .whereEntities(entities)
                .group(constraint)
                .select(constraint)
                .order(constraint)
                .equals(constraints)
                .equal('variable', _.last(variable.id.split('.')))
                .send()
                .then(json => {
                    const ordering = (dataset.constraintOrdering || {})[constraint];
                    let options = json.map(_.property(constraint));
                    options = toNumbers(options);
                    options = sortOptions(options, ordering);
                    options = options.map(option => {
                        return {
                            constraint_value: String(option)
                        };
                    });

                    response.json({permutations: options});
                })
                .catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function toNumbers(strings) {
    const numbers = strings.map(_.toNumber);
    return _.some(numbers, isNaN) ? strings : numbers;
}

function sortOptions(options, ordering) {
    if (_.isString(ordering))
        return _.orderBy(options, _.identity, ordering);
    if (_.isArray(ordering))
        return sortWithHint(options, ordering);
    return options;
}

function sortWithHint(options, ordering) {
    return ordering.filter(value => _.includes(options, value))
        .concat(options.filter(value => !_.includes(ordering, value)));
}

