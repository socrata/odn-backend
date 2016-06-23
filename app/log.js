'use strict';

const winston = require('winston');

module.exports = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'error',
            timestamp: true,
            json: true
        }),
        new winston.transports.File({
            level: 'info',
            filename: `${__dirname}/../debug.log`,
            json: true
        })
    ],
    exceptionHandlers: [
        new winston.transports.Console({
            timestamp: true,
            json: true
        }),
        new winston.transports.File({
            filename: `${__dirname}/../exceptions.log`,
            json: true
        })
    ],
    exitOnError: false
});

