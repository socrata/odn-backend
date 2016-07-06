'use strict';

const _ = require('lodash');

class Forecast {
    static linear(steps, series) {
        series = series.map(parseFloat).filter(_.negate(isNaN));
        if (steps < 1) return [];
        if (series.length === 0) return [];
        if (series.length === 1) return  _.times(steps, _.constant(series[0]));

        const first = series[0];
        const last = series[series.length - 1];
        const slope = (last - first) / (series.length - 1);
        return _.range(steps).map(index => last + slope * (index + 1));
    }
}

module.exports = Forecast;

