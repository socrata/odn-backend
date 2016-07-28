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
                .send()
                .then(json => {
                    const options = json.map(option => {
                        return {
                            constraint_value: option[constraint]
                        };
                    });

                    response.json({permutations: options});
                })
                .catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

