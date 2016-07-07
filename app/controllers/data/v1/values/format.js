'use strict';

const numeral = require('numeral');

const numeralFormatters = {
    number: '',
    rank: '',
    dollar: '$0,0',
    percent: '0,0.0%'
};

function format(type) {
    if (type === 'percent') return n => numeral(n / 100).format(numeralFormatters.percent);
    return number => numeral(number).format(numeralFormatters[type] || '');
}

module.exports = format;

