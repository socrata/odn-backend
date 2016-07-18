'use strict';

const _ = require('lodash');
const querystring = require('querystring');

const EntityLookup = require('../../entity-lookup');
const Exception = require('../../error');
const Request = require('../../request');
const Constraint = require('./constraint');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    const variableID = request.params.variable;
    if (_.isNil(variableID) || variableID === '')
        return errorHandler(Exception.invalidParam('variable required'));

    EntityLookup.byIDs(request.query.entity_id).then(entities => {
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

        const constraints = _.omit(request.query, ['entity_id', 'constraint']);

        Constraint.validateConstraints(dataset, constraint, constraints).then(() => {
            const url = Request.buildURL(dataset.url, _.assign({
                $where: getIDs(entities),
                $group: constraint,
                $select: constraint,
                $order: `${constraint} ASC`
            }, constraints));

            Request.getJSON(url).then(json => {
                const options = json.map(option => {
                    return {
                        constraint_value: option[constraint]
                    };
                });

                response.json({permutations: options});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getIDs(entities) {
    const entityIDs = entities.map(entity => entity.id);
    return `id in(${entityIDs.map(id => `'${id}'`).join(',')})`;
}

