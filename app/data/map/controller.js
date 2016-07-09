
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
        getGeodata(entityType, scale, bounds).then(geojson => {
            const ids = getIDs(geojson);

            getDataChunked(dataset, constraints, ids).then(data => {
                geojson = joinGeoWithData(geojson, data);

                response.json({geojson});
            }).catch(errorHandler);
        }).catch(errorHandler);
    }).catch(errorHandler);
};

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

function getDataChunked(dataset, constraints, ids) {
    const idGroups = chunkIDs(ids, Constants.MAX_URL_LENGTH / 2);
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

function getIDs(geojson) {
    return geojson.features.map(feature => feature.properties.id);
}

function getGeodata(entityType, scale, bounds) {
    const url = Request.buildURL(Constants.GEO_URL, _.assign({
        scale,
        type: entityType
    }, _.isNil(bounds) ? {} : {
        $where: intersects('the_geom', bounds)
    }));

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

function getBounds(request) {
    return Promise.resolve(request.query.bounds);
}

function getConstraints(request) {
    return _.omit(request.query, ['bounds', 'entity_type', 'scale']);
}

