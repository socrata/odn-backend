
const request = require('request');
const ogr2ogr = require('ogr2ogr');
const fs = require('fs');
const _ = require('lodash');

const stateFIPS = require('./state-fips');

function getFeatures(url) {
    return new Promise((resolve, reject) => {
        ogr2ogr(request(url), 'ESRI Shapefile').exec((error, geojson) => {
            if (error) return reject(error);
            resolve(geojson.features);
        });
    });
}

function write(path, features) {
    fs.writeFileSync(path, JSON.stringify({
        features,
        type: 'FeatureCollection'
    }));
}

function places() {
    _.keys(stateFIPS).forEach(fips => {
        getFeatures(`http://www2.census.gov/geo/tiger/GENZ2015/shp/cb_2015_${fips}_place_500k.zip`, 'region.place').then(features => {
            features.forEach(feature => {
                feature.properties = {
                    type: 'region.place',
                    id: feature.properties.AFFGEOID,
                    name: `${feature.properties.NAME}, ${stateFIPS[fips]}`,
                    rank: feature.properties.ALAND
                };
            });

            write(`places-${fips}.geojson`, features);
        }).catch(console.error);
    });
}

function zips() {
    getFeatures('http://www2.census.gov/geo/tiger/GENZ2015/shp/cb_2015_us_zcta510_500k.zip', 'region.zip_code').then(features => {
        features.forEach(feature => {
            feature.properties = {
                type: 'region.zip_code',
                id: feature.properties.AFFGEOID10,
                name: `${feature.properties.GEOID10} ZIP Code`,
                rank: feature.properties.ALAND10
            };
        });

        write('zcta.geojson', features);
    }).catch(console.error);
}

zips();
