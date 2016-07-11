
const _ = require('lodash');

const Exception = require('../../error');
const notFound = Exception.notFound;
const invalid = Exception.invalidParam;
const Sources = require('../../sources');
const Constants = require('../../constants');
const Request = require('../../request');

// Mapping from session to IDs of entities that have already been delivered.
const sessions = {};

module.exports = (request, response) => {
    const errorHandler = Exception.getHandler(request, response);

    const promises = [getDataset, getEntityType, getScale, getBounds, getConstraints, getSession]
        .map(func => func.call(this, request));

    Promise.all(promises).then(([dataset, entityType, scale, bounds, constraints, session]) => {
        getEntitiesInBounds(entityType, scale, bounds).then(ids => {
            console.log(ids);
            ids = filterIDs(ids, session);
            markSent(ids, session);

            console.log(ids);
            const idGroups = chunkIDs(ids, Constants.MAX_URL_LENGTH / 2);

            const valuesPromise = getDataChunked(dataset, constraints, idGroups);
            const geodataPromise = getGeodataChunked(scale, idGroups);

            Promise.all([valuesPromise, geodataPromise]).then(([values, geojson]) => {
                geojson = joinGeoWithData(geojson, values);

                response.json({geojson});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

// Filters out IDs that have already been sent in the session.
function filterIDs(ids, session) {
    if (!_.isNil(session) && session in sessions) {
        const alreadySent = sessions[session];
        return ids.filter(id => !alreadySent.has(id));
    } else {
        return ids;
    }
}

// Mark the given entites as sent during the session.
function markSent(ids, session) {
    if (_.isNil(session)) return;

    if (!(session in sessions)) {
        sessions[session] = new Set();
    }

    ids.forEach(id => {
        sessions[session].add(id);
    });
}

function getEntitiesInBounds(entityType, scale, bounds) {
    const params = _.assign({
        $select: 'id',
        type: entityType,
        $limit: 50000,
        scale: 500000
    }, _.isNil(bounds) ? {} : {
        $where: intersects('the_geom', bounds)
    });
    const url = Request.buildURL(`${Constants.GEO_URL}.json`, params);

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

function getGeodataChunked(scale, idGroups) {
    if (idGroups.length === 0) {
        return Promise.resolve({
            type: 'FeatureCollection',
            features: []
        });
    }

    const promises = idGroups.map(_.curry(getGeodata)(scale));

    return Promise.all(promises).then(responses => {
        return Promise.resolve(mergeDeep(responses));
    });
}

function mergeDeep(objects) {
    return _.mergeWith.apply(this, objects.concat({}).concat(mergeArrays));
}

function mergeArrays(a, b) {
    if (_.isArray(a) && _.isArray(b)) return a.concat(b);
    return a;
}

function getGeodata(scale, ids) {
    const simplificationAmount = Math.pow((-1/2), scale);

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
    const entityType = request.query.entity_type;

    if (_.isNil(entityType) || entityType === '')
        return Promise.reject(invalid('parameter entity_type required'));

    return Promise.resolve(entityType);
}

function getScale(request) {
    const scale = request.query.scale;

    if (_.isNil(scale) || scale === '')
        return Promise.reject(invalid('parameter scale required'));

    return Promise.resolve(scale);
}

function getSession(request) {
    return Promise.resolve(request.query.session);
}

function getBounds(request) {
    return Promise.resolve(request.query.bounds);
}

function getConstraints(request) {
    return _.omit(request.query, ['bounds', 'entity_type', 'scale', 'session']);
}

