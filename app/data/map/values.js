'use strict';

const _ = require('lodash');

const Exception = require('../../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Sources = require('../../sources');
const Config = require('../../config');
const SOQL = require('../../soql');
const SessionManager = require('./session-manager');
const format = require('../values/format');

module.exports = socket => {
    socket.on('message', messageString => {
        const errorHandler = Exception.getSocketHandler(socket, messageString);

        parseJSON(messageString)
            .then(parseQuery)
            .then(([session, bounds, zoomLevel]) => {
                idsToSend(session, bounds, zoomLevel).then(groups => {
                    groups.forEach(group => {
                        Promise.all([
                            getGeodata(session, zoomLevel, group),
                            getData(session, group)
                        ]).then(([geojson, values]) => {
                            geojson = joinGeoWithData(geojson, values);
                            socket.send(JSON.stringify({
                                geojson,
                                message: JSON.parse(messageString),
                                type: 'geojson'
                            }));
                        }).catch(errorHandler);
                    });
                }).catch(errorHandler);
        }).catch(errorHandler);
    });

    socket.on('error', error => {
        console.error(error);
    });
};

/**
 * Finds the IDs of the entities in the given bounds that have not
 * been sent at the given zoom level. Chunks the IDs into groups.
 */
function idsToSend(session, bounds, zoomLevel) {
    return getEntitiesInBounds(session.entityType, bounds, session.token)
        .then(ids => includeSelected(ids, session))
        .then(ids => session.notSent(ids, zoomLevel))
        .then(ids => Promise.resolve(chunkIDs(ids, Config.max_url_length / 2)));
}

function parseJSON(string) {
    try {
        return Promise.resolve(JSON.parse(string));
    } catch (error) {
        return Promise.reject(invalid('invalid JSON'));
    }
}

function includeSelected(ids, session) {
    return Promise.resolve(_.uniq(ids.concat(session.entities.map(_.property('id')))));
}

function getGeoURL(entityType) {
    return Config.geo_urls[entityType];
}

function getLimit(entityType) {
    return Config.geo_limit[entityType] || Config.geo_limit_default;
}

function getEntitiesInBounds(entityType, bounds, token) {
    return new SOQL(`${getGeoURL(entityType)}.json`)
        .token(token)
        .select('id')
        .equal('type', entityType)
        .limit(getLimit(entityType))
        .where(_.isNil(bounds) ? null : intersects('the_geom', bounds))
        .order(_.includes(Config.geo_ranked, entityType) ? 'rank desc' : null)
        .send()
        .then(response => {
            return Promise.resolve(response.map(_.property('id')));
        });
}

function joinGeoWithData(geojson, data) {
    const idToValue = _.keyBy(data, 'id');

    geojson.features = geojson.features.filter(feature => {
        return feature.properties.id in idToValue;
    });

    geojson.features.forEach(feature => {
        feature.properties = _.assign(feature.properties, idToValue[feature.properties.id]);
    });

    return geojson;
}

function getDataChunked(session, idGroups) {
    const promises = idGroups.map(ids => {
        return getData(session, ids);
    });

    return Promise.all(promises).then(responses => {
        return Promise.resolve(_.flatten(responses));
    });
}

function getData(session, ids) {
    return new SOQL(session.dataset.url)
        .token(session.token)
        .equal('variable', _.last(session.variable.id.split('.')))
        .equals(session.constraints)
        .whereIn('id', ids)
        .select('id')
        .select('value')
        .where('value IS NOT NULL')
        .send()
        .then(data => formatData(session, data));
}

function formatData(session, data) {
    const formatter = format(session.variable.type);

    data.forEach(row => {
        row.value_formatted = formatter(row.value);
    });

    return Promise.resolve(data);
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

function getGeodataChunked(session, zoomLevel, idGroups) {
    if (idGroups.length === 0) {
        return Promise.resolve({
            type: 'FeatureCollection',
            features: [],
            crs: {
                type: 'name',
                properties: {
                    name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
                }
            }
        });
    }

    const promises = idGroups.map(ids => {
        return getGeodata(session, zoomLevel, ids);
    });

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

function getGeodata(session, zoomLevel, ids) {
    return new SOQL(`${getGeoURL(session.entityType)}.geojson`)
        .token(session.token)
        .whereIn('id', ids)
        .select('id')
        .select('name')
        .select(`${simplify('the_geom', tolerance(zoomLevel))}`)
        .send();
}

/**
 * Simplification tolerance in meters from zoom level.
 *
 * Zoom level is an integer ranging from 3 to 18.
 */
function tolerance(zoomLevel) {
    return 2 * Math.pow(2, -zoomLevel);
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

function parseQuery(query) {
    return Promise.all([
        getSession(query),
        getBounds(query),
        getZoomLevel(query)
    ]);
}

function getSession(query) {
    let sessionID = query.session_id;

    if (_.isNil(sessionID) || sessionID === '')
        return Promise.reject(invalid('parameter session_id required'));

    return SessionManager.get(sessionID);
}

function getBounds(query) {
    return parseBounds(query)
        .then(validateBounds);
}

function getZoomLevel(query) {
    let zoomLevel = query.zoom_level;

    if (_.isNil(zoomLevel) || zoomLevel === '')
        return Promise.reject(invalid('parameter zoom_level required'));
    if (zoomLevel < Config.map_zoom_min)
        return Promise.reject(invalid(`zoom_level cannot be less than ${Config.map_zoom_min}`));
    if (zoomLevel > Config.map_zoom_max)
        return Promise.reject(invalid(`zoom_level cannot be greater than ${Config.map_zoom_max}`));

    zoomLevel = parseInt(zoomLevel, 10);

    if (isNaN(zoomLevel))
        return Promise.reject(invalid(`zoom_level must be an integer`));

    zoomLevel = zoomLevel - zoomLevel % 2;

    return Promise.resolve(zoomLevel);
}

function parseBounds(query) {
    let bounds = query.bounds;

    if (_.isEmpty(bounds))
        return Promise.reject(invalid('parameter bounds required'));

    if (_.isString(bounds)) bounds = bounds.split(',');
    bounds = bounds.map(parseFloat);

    if (bounds.length !== 4)
        return Promise.reject(invalid('bounds must be in the form: {NW lat},{NW long},{SE lat},{SE long}'));

    if (_.some(bounds, isNaN))
        return Promise.reject(invalid('bounds must be numbers'));

    return Promise.resolve(bounds);
}

const latRange = _.curry(inRange)('latitude', 90);
const longRange = _.curry(inRange)('longitude', 180);

function validateBounds(bounds) {
    const [nwlat, nwlong, selat, selong] = bounds;

    return Promise.all([
        latRange(nwlat), latRange(selat),
        longRange(nwlong), longRange(selong)
    ]).then(() => {
        if (nwlat < selat || nwlong > selong)
            return Promise.reject(invalid('bounds out of order'));
        return Promise.resolve(bounds);
    });
}

function inRange(name, max, value) {
    if (Math.abs(value) > max)
        return Promise.reject(invalid(`${name} must be in the range (-${max}, ${max})`));
    return Promise.resolve(value);
}

