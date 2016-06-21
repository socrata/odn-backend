'use strict';

/**
 * Middleware to handle errors that were not handled anywhere else.
 */

module.exports = (error, request, response, next) => {
    console.error(error);

    response.status(500).send({error});
};

