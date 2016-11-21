'use strict';

const _ = require('lodash');
const Config = require('./config');
const Exception = require('./error');
const missingAppToken = Exception.missingAppToken;
const invalidAppToken = Exception.invalidAppToken;
const Request = require('./request');

/**
 * Middleware to require app tokens.
 */
module.exports = (request, response, next) => {
    const token = request.get(Config.app_token_header) ||
        request.query[Config.app_token_param];

    const errorHandler = Exception.getHandler(request, response);
    if (_.isNil(token)) return errorHandler(missingAppToken());

    validate(token).then(() => {
        request.token = token;
        next();
    }).catch(errorHandler);
};

function validate(token) {
    const url = `https://${Config.odn_data_domain}/api/app_tokens/${token}`;
    return Request.get(url).then(response => {
        if (_.isEmpty(response)) return Promise.reject(invalidAppToken(token));
        return Promise.resolve();
    });
}

