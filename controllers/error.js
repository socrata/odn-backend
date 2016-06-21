'use strict';

/**
 * Middleware to handle errors that were not handled anywhere else.
 */

module.exports = (error, request, response, next, statusCode) => {
    statusCode = statusCode || 500;

    console.error(error);

    response.status(statusCode).json({error});
};

