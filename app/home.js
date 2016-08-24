'use strict';

/**
 * Controller for the root of the site.
 */

module.exports = (request, response) => {
    response.send(`
        Welcome to the ODN API. \
        Documentation is available
        <a href="http://docs.odn.apiary.io/">HERE</a>.
    `);
};

