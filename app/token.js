'use strict';

const _ = require('lodash');
const Constants = require('./constants');
const Exception = require('./error');
const missingAppToken = Exception.missingAppToken;
const invalidAppToken = Exception.invalidAppToken;
const Request = require('./request');

/**
 * Middleware to require app tokens.
 */
module.exports = (request, response, next) => {
    const token = request.get(Constants.APP_TOKEN_HEADER) ||
        request.query[Constants.APP_TOKEN_PARAM];

    const errorHandler = Exception.getHandler(request, response);
    if (_.isNil(token)) return errorHandler(missingAppToken());

    validate(token).then(() => {
        request.token = token;
        next();
    }).catch(errorHandler);
};

function validate(token) {
    const url = `http://${Constants.ODN_DATA_DOMAIN}/api/app_tokens/${token}`;
    return Request.get(url).then(response => {
        if (_.isEmpty(response)) return Promise.reject(invalidAppToken(token));
        return Promise.resolve();
    });
}

