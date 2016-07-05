'use strict';

const _ = require('lodash');

const EntityLookup = require('../../../../../entity-lookup');
const Exception = require('../../../../error');
const Request = require('../../../../../request');
const Constraint = require('../../constraint/constraint');
const Forecast = require('./forecast');

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

        const constraints = _.omit(request.query, ['entity_id', 'constraint', 'forecast']);

        Constraint.validateConstraints(dataset, constraint, constraints).then(() => {
            const url = Request.buildURL(dataset.url, {
                variable: _.last(variable.id.split('.')),
                $where: getIDs(entities),
                $order: 'id ASC'
            });

            Request.getJSON(url).then(data => {
                const entityIDs = entities.map(_.property('id'));

                const header = [constraint].concat(entities.map(_.property('name'))).concat('forecast');
                const r = _(data)
                    .groupBy(_.property(constraint))
                    .toPairs()
                    .map(([constraintValue, points]) => {
                        const values = entityIDs
                            .map(id => _.find(points, {id}) || {})
                            .map(point => point.value || null);
                        return [constraintValue].concat(values).map(parseFloat);
                    })
                    .value();

                const forecastSteps = parseInt(request.query.forecast, 10) || 0;

                const forecast = _(r)
                    .unzip()
                    .map(series => series.concat(Forecast.linear(forecastSteps, series)))
                    .concat([_.times(r.length + forecastSteps, index => index >= r.length)])
                    .unzip()
                    .value();

                response.json({data: [header].concat(forecast)});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getIDs(entities) {
    const entityIDs = entities.map(entity => entity.id);
    return `id in(${entityIDs.map(id => `'${id}'`).join(',')})`;
}

