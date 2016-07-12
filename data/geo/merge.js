'use strict';

const fs = require('fs');
const _ = require('lodash');

const features = _(fs.readdirSync('.'))
    .filter(file => _.last(file.split('.')) === 'geojson' && file.startsWith('place'))
    .map(file => JSON.parse(fs.readFileSync(file)))
    .map(geojson => geojson.features)
    .flatten();

function write(path, features) {
    fs.writeFileSync(path, JSON.stringify({
        features,
        type: 'FeatureCollection'
    }));
}

write('us-geodata.geojson', features);

