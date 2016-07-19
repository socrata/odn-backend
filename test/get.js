
const chakram = require('chakram');
const Constants = require('../app/constants');

/**
 * Adds app token to any request.
 */
module.exports = url => {
    return chakram.get(url, {
        headers: {
            [Constants.APP_TOKEN_HEADER]: Constants.APP_TOKEN
        }
    });
};
