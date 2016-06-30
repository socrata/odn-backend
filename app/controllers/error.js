'use strict';

const _ = require('lodash');

const log = require('../log');


class Exception {
    constructor(message, statusCode) {
        this.message = message;
        this.statusCode = statusCode;
    }

    static notFound(message) {
        return new Exception(message, 404);
    }

    static invalidParam(message) {
        return new Exception(message, 422);
    }

    static server(message) {
        return new Exception(message, 500);
    }

    static timeout(message) {
        return new Exception(message, 504);
    }

    static getHandler(request, response) {
        return error => {
            Exception.respond(error, request, response);
        };
    }

    static respond(error, request, response, next, statusCode) {
        statusCode = error.statusCode || statusCode || 500;

        if (statusCode >= 500) {
            log.error(error);
        } else {
            log.info(error);
        }

        const errorJSON = {
            error: {
                message: error.message.replace(/\n\s*/, ' ')
            },
            statusCode,
            url: request.url
        };

        response.status(statusCode).json(errorJSON);
    }
}

module.exports = Exception;

