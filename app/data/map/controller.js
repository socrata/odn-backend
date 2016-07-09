
const _ = require('lodash');

const Exception = require('../../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Sources = require('../../sources');
const Constants = require('../../constants');
const Request = require('../../request');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    const promises = [getDataset, getEntityType, getScale, getBounds, getConstraints]
        .map(func => func.call(this, request));

    Promise.all(promises).then(([dataset, entityType, scale, bounds, constraints]) => {
        getGeodata(entityType, scale, bounds).then(data => {
            response.json({geojson: data});
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getGeodata(entityType, scale, bounds) {
    const params = {
        scale,
        type: entityType,
        $where: intersects('the_geom', bounds)
    };
    const url = Request.buildURL(Constants.GEO_URL, params);
    return Request.getJSON(url);
}

function intersects(column, bounds) {
    return `intersects(${column}, ${boundsToPolygon(bounds)})`;
}

function boundsToPolygon(bounds) {
    const [nwlat, nwlong, swlat, swlong] = bounds.split(',');
    const coords =  [nwlat, nwlong, nwlat, swlong, swlat, swlong, swlat, nwlong, nwlat, nwlong];
    const coordinates = _.chunk(coords, 2)
        .map(_.reverse)
        .map(coordinates => coordinates.join(' '))
        .join(',');

    return `'POLYGON((${coordinates}))'`;
}

function getDataset(request) {
    return new Promise((resolve, reject) => {
        const path = request.params.variable;
        const tree = Sources.search(path);

        if (_.isNil(tree))
            return reject(notFound(`variable not found: ${path}`));

        const topic = _.first(_.values(tree));

        if (_.size(topic.datasets) !== 1)
            return reject(invalid(`path to variable required: ${path}`));

        const dataset = _.first(_.values(topic.datasets));

        resolve(dataset);
    });
}

function getEntityType(request) {
    return Promise.resolve(request.query.entity_type);
}

function getScale(request) {
    return Promise.resolve(request.query.scale);
}

function getBounds(request) {
    return Promise.resolve(request.query.bounds);
}

function getConstraints(request) {
    return _.omit(request.query, ['bounds', 'entity_type', 'scale']);
}

