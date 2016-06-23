'use strict';

const winston = require('winston');

module.exports = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'error',
            timestamp: true,
            json: true
        })
    ],
    exceptionHandlers: [
        new winston.transports.Console({
            timestamp: true,
            json: true
        })
    ],
    exitOnError: false
});

