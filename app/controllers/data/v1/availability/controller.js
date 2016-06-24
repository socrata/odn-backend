'use strict';

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Availability = require('./availability');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    EntityLookup.byIDs(request.query.id).then(entities => {
        if (entities.length === 0)
            return errorHandler(Exception.invalidParam('at least one id required'));

        Availability.get(entities).then(variables => {
            console.log(variables);
            response.json(variables);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

