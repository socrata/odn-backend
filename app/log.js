'use strict';

const winston = require('winston');

module.exports = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'error',
            timestamp: true,
            json: true,
            handleExceptions: true,
            prettyPrint: false,
            stringify: JSON.stringify
        })
    ],
    exitOnError: false
});

