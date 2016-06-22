'use strict';

/**
 * Middleware to handle errors that were not handled anywhere else.
 */

module.exports = (error, request, response, next, statusCode) => {
    statusCode = statusCode || 500;

    console.error(`error rendering request at: ${request.path}`);
    console.error(error);
    console.error(error.stack);

    response.status(statusCode).json({error});
};

