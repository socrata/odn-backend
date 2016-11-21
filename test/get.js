
const chakram = require('chakram');
const Config = require('../app/config');

/**
 * Adds app token to any request.
 */
module.exports = url => {
    return chakram.get(url, {
        headers: {
            [Config.app_token_header]: Config.app_token
        }
    });
};
