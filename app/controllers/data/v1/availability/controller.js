'use strict';

const _ = require('lodash');

const EntityLookup = require('../../../../entity-lookup');
const Exception = require('../../../error');
const Availability = require('./availability');
const Sources = require('../../../../sources');

function datasetID(variableID) {
    return variableID.substring(0, variableID.lastIndexOf('.'));
}

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    EntityLookup.byIDs(request.query.id).then(entities => {
        if (entities.length === 0)
            return errorHandler(Exception.invalidParam('at least one id required'));

        Availability.get(entities).then(variables => {
            const datasetIDs = _.uniq(variables.map(datasetID));
            const topics = Sources.searchMany(datasetIDs);

            const util = require('util');
            console.log(util.inspect({topics}, false, null));
            response.json({topics});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

