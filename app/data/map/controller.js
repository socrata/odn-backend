'use strict';

const _ = require('lodash');

const Exception = require('../../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Sources = require('../../sources');
const Constants = require('../../constants');
const Request = require('../../request');
const SessionManager = require('./session-manager');

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    Promise.all([
        getSession(request),
        getZoomLevel(request),
        getBounds(request)
    ]).then(([session, zoomLevel, bounds]) => {
        // TODO object destructuring?
        const entityType = session.entityType;
        const dataset = session.dataset;
        const constraints = session.constraints;

        getEntitiesInBounds(entityType, bounds).then(ids => {
            ids = session.notSent(ids, zoomLevel);
            const idGroups = chunkIDs(ids, Constants.MAX_URL_LENGTH / 2);

            const valuesPromise = getDataChunked(dataset, constraints, idGroups);
            const geodataPromise = getGeodataChunked(zoomLevel, idGroups);

            Promise.all([valuesPromise, geodataPromise]).then(([values, geojson]) => {
                geojson = joinGeoWithData(geojson, values);

                response.json({geojson});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

function getEntitiesInBounds(entityType, bounds) {
    const url = Request.buildURL(`${Constants.GEO_URL}.json`, _.assign({
        $select: 'id',
        type: entityType,
        $limit: 50000,
        scale: 500000
    }, _.isNil(bounds) ? {} : {
        $where: intersects('the_geom', bounds)
    }));

    return Request.getJSON(url).then(response => {
        return Promise.resolve(response.map(_.property('id')));
    });
}

function joinGeoWithData(geojson, data) {
    const idToValue = _(data)
        .keyBy('id')
        .mapValues(_.property('value'))
        .value();

    geojson.features = geojson.features
        .filter(feature => feature.properties.id in idToValue);

    geojson.features
        .forEach(feature => feature.properties.value = idToValue[feature.properties.id]);

    return geojson;
}

function getDataChunked(dataset, constraints, idGroups) {
    const promises = idGroups.map(_.curry(getData)(dataset)(constraints));

    return Promise.all(promises).then(responses => {
        return Promise.resolve(_.flatten(responses));
    });
}

function getData(dataset, constraints, ids) {
    const variable = _.first(_.values(dataset.variables));

    const url = Request.buildURL(dataset.url, _.assign({
        variable: _.last(variable.id.split('.')),
        $where: whereIn('id', ids),
        $select: 'id,value'
    }, constraints));

    return Request.getJSON(url);
}

function chunkIDs(ids, maximumLength) {
    ids.sort();

    let length = 0;
    let group = 0;

    return _(ids).groupBy(id => {
        if (length + id.length > maximumLength) {
            length = id.length;
            group++;
            return group;
        } else {
            length += id.length;
            return group;
        }
    }).values().value();
}

function whereIn(name, options) {
    return `${name} in (${options.map(quote).join(',')})`;
}

function quote(string) {
    return `'${string}'`;
}

function getGeodataChunked(zoomLevel, idGroups) {
    if (idGroups.length === 0) {
        return Promise.resolve({
            type: 'FeatureCollection',
            features: []
        });
    }

    const promises = idGroups.map(_.curry(getGeodata)(zoomLevel));

    return Promise.all(promises).then(responses => {
        return Promise.resolve(mergeDeep(responses));
    });
}

function mergeDeep(objects) {
    return _.mergeWith.apply({}, objects.concat({}).concat(mergeArrays));
}

function mergeArrays(a, b) {
    if (_.isArray(a) && _.isArray(b)) return a.concat(b);
    return a;
}

function getGeodata(zoomLevel, ids) {
    const simplificationAmount = Math.pow(1/2, zoomLevel);

    const url = Request.buildURL(`${Constants.GEO_URL}.geojson`, {
        scale: 500000,
        $where: whereIn('id', ids),
        $select: `id,name,${simplify('the_geom', simplificationAmount)}`
    });

    return Request.getJSON(url);
}

function simplify(column, amount) {
    return `simplify_preserve_topology(${column}, ${amount}) as ${column}`;
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

function getZoomLevel(request) {
    const zoomLevel = request.query.zoom_level;

    if (_.isNil(zoomLevel) || zoomLevel === '')
        return Promise.reject(invalid('parameter zoom_level required'));

    return Promise.resolve(zoomLevel);
}

function getSession(request) {
    const sessionID = request.query.session_id;

    if (_.isNil(sessionID) || sessionID === '')
        return Promise.reject(invalid('parameter session_id required'));

    return SessionManager.get(sessionID);
}

function getBounds(request) {
    const bounds = request.query.bounds;

    if (_.isNil(bounds) || bounds === '')
        return Promise.reject(invalid('parameter bounds required'));

    return Promise.resolve(bounds);
}

function getConstraints(request) {
    return _.omit(request.query, ['bounds', 'entity_type', 'scale', 'session']);
}

