'use strict';

const numeral = require('numeral');

const numeralFormatters = {
    number: '',
    rank: '',
    dollar: '$0,0',
    percent: '0,0.0%',
    ratio: '0,0.0%',
    per1000: '0,0.0%'
};

function format(type) {
    if (type === 'percent') return n => numeral(n / 100).format(numeralFormatters.percent);
    if (type === 'per1000') return n => numeral(n / 100000).format(numeralFormatters.percent);
    return number => numeral(number).format(numeralFormatters[type] || '');
}

module.exports = format;

