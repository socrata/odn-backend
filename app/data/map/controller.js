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
        const {entityType, dataset, constraints} = session;

        getEntitiesInBounds(entityType, bounds)
            .then(ids => {
                return Promise.resolve(_.uniq(ids.concat(session.entities.map(_.property('id')))));
            })
            .then(ids => session.notSent(ids, zoomLevel))
            .then(ids => {
                const idGroups = chunkIDs(ids, Constants.MAX_URL_LENGTH / 2);
                const valuesPromise = getDataChunked(dataset, constraints, idGroups);
                const geodataPromise = getGeodataChunked(entityType, zoomLevel, idGroups);

                Promise.all([valuesPromise, geodataPromise]).then(([values, geojson]) => {
                    geojson = joinGeoWithData(geojson, values);

                    response.json({geojson});
                }).catch(errorHandler);
            }).catch(errorHandler);
    }).catch(errorHandler);
};

function getGeoURL(entityType) {
    return Constants.GEO_URLS[entityType];
}

function getLimit(entityType) {
    return Constants.GEO_LIMIT[entityType] || Constants.GEO_LIMIT_DEFAULT;
}

function getEntitiesInBounds(entityType, bounds) {
    const url = Request.buildURL(`${getGeoURL(entityType)}.json`, _.assign({
        $select: 'id',
        type: entityType,
        $limit: getLimit(entityType)
    }, _.isNil(bounds) ? {} : {
        $where: intersects('the_geom', bounds)
    }, _.includes(Constants.GEO_RANKED, entityType) ? {
        $order: 'rank desc'
    } : {}));

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

function getGeodataChunked(entityType, zoomLevel, idGroups) {
    if (idGroups.length === 0) {
        return Promise.resolve({
            type: 'FeatureCollection',
            features: []
        });
    }

    const promises = idGroups.map(_.curry(getGeodata)(entityType)(zoomLevel));

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

function getGeodata(entityType, zoomLevel, ids) {
    const simplificationAmount = Math.pow(1/2, zoomLevel);

    const url = Request.buildURL(`${getGeoURL(entityType)}.geojson`, {
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
    const [nwlat, nwlong, selat, selong] = bounds;
    const coords =  [nwlat, nwlong, nwlat, selong, selat, selong, selat, nwlong, nwlat, nwlong];
    const coordinates = _.chunk(coords, 2)
        .map(_.reverse)
        .map(coordinates => coordinates.join(' '))
        .join(',');

    return `'POLYGON((${coordinates}))'`;
}

function getZoomLevel(request) {
    let zoomLevel = request.query.zoom_level;

    if (_.isNil(zoomLevel) || zoomLevel === '')
        return Promise.reject(invalid('parameter zoom_level required'));
    if (zoomLevel < Constants.MAP_ZOOM_MIN)
        return Promise.reject(invalid(`zoom_level cannot be less than ${Constants.MAP_ZOOM_MIN}`));
    if (zoomLevel > Constants.MAP_ZOOM_MAX)
        return Promise.reject(invalid(`zoom_level cannot be greater than ${Constants.MAP_ZOOM_MAX}`));

    zoomLevel = parseInt(zoomLevel, 10);

    if (isNaN(zoomLevel))
        return Promise.reject(invalid(`zoom_level must be an integer`));

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

    const [nwlat, nwlong, selat, selong] = bounds.split(',').map(parseFloat);
    if (_.isNil(nwlat) || _.isNil(nwlong) || _.isNil(selat) || _.isNil(selong) ||
        Math.abs(nwlat) > 90 || Math.abs(nwlong) > 180 ||
        Math.abs(selat) > 90 || Math.abs(selong) > 180 ||
        nwlat < selat || nwlong > selong)
        return Promise.reject(invalid('bounds must be in the form: {NW lat},{NW long},{SE lat},{SE long}'));

    return Promise.resolve([nwlat, nwlong, selat, selong]);
}

