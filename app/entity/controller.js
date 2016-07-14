'use strict';

const _ = require('lodash');
const Exception = require('../error');
const invalid = Exception.invalidParam;
const notFound = Exception.notFound;
const EntityLookup = require('../entity-lookup');
const Constants = require('../constants');
const Request = require('../request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([
        getID(request),
        getName(request),
        getType(request)
    ]).then(([id, name, type]) => {
        getEntities(id, name, type).then(entities => {
            response.json({entities});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getEntities(id, name, type) {
    const url = Request.buildURL(Constants.ENTITY_URL, _.assign({
        id,
        type
    }, _.isEmpty(name) ? {name} : {
        $q: name
    }));

    return Request.getJSON(url);
}

function getID(request) {
    return Promise.resolve(request.query.entity_id);
}

function getName(request) {
    return Promise.resolve(request.query.entity_name);
}

function getType(request) {
    return Promise.resolve(request.query.entity_type);
}

