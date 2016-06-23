'use strict';

const _ = require('lodash');

/**
 * Middleware to handle errors that were not handled anywhere else.
 */

class ClientError {
    constructor(message, statusCode, payload) {
        this.message = message;
        this.statusCode = statusCode || 400;
        this.payload = payload || {};
    }
}

class ErrorController {
    constructor(request, response) {
        this.request = request;
        this.response = response;
    }

    /**
     * Handles promise rejection.
     */
    reject(statusCode) {
        return error => {
            ErrorController.respond(error, this.request, this.response, null, statusCode);
        };
    }

    static respond(error, request, response, next, statusCode) {
        statusCode = error.statusCode || statusCode || 500;

        console.error(`error rendering request at: ${request.path}`);
        console.log(error.message);
        console.error(error);

        response.status(statusCode).json({
            error: {
                message: error.message
            },
            statusCode,
            url: request.url
        });
    }

    static client(message, statusCode) {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    }
}

module.exports = ErrorController;

