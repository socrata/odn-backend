'use strict';

const fs = require('fs');
const _ = require('lodash');

const features = _(fs.readdirSync('.'))
    .filter(file => _.last(file.split('.')) === 'geojson' && file.startsWith('place'))
    .map(file => JSON.parse(fs.readFileSync(file)))
    .map(geojson => geojson.features)
    .flatten()
    .map(multipolygonToPolygon);

function multipolygonToPolygon(feature) {
    if (feature.geometry.type !== 'MultiPolygon') return feature;
    feature.geometry.type = 'Polygon';
    feature.geometry.coordinates = _.concat.apply(this, feature.geometry.coordinates);
    return feature;
}

function write(path, features) {
    fs.writeFileSync(path, JSON.stringify({
        features,
        type: 'FeatureCollection'
    }));
}

write('us-geodata.geojson', features);

