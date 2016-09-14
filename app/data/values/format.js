'use strict';

const _ = require('lodash');
const numeral = require('numeral');

const numeralFormatters = {
    number: '',
    rank: '',
    dollar: '$0,0',
    percent: '0,0.00%',
    ratio: '0,0.00%',
    per1000: '0,0.00%'
};

const precisionPrefix = 'precision';

function format(type) {
    if (type === 'percent') return n => numeral(n / 100).format(numeralFormatters.percent);
    if (type === 'per1000') return n => numeral(n / 100000).format(numeralFormatters.percent);
    if (type === 'ratio100k') return n => numeral(n * 100000).format(numeralFormatters.number);
    const formatter = numeralFormatters[type] || precisionFormatter(type) || '';
    return number => numeral(number).format(formatter);
}


function precisionFormatter(type) {
    if (isPrecision(type))
        return `0,0.${_.repeat('0', getPrecision(type))}`;
    return null;
}

// 'precision3' => true
// 'percent' => false
function isPrecision(type) {
    return _.startsWith(type, precisionPrefix);
}

// 'precision3' => 3
function getPrecision(type) {
    return parseInt(type.substring(precisionPrefix.length));
}

module.exports = format;

