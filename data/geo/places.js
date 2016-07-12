
const request = require('request');
const ogr2ogr = require('ogr2ogr');
const fs = require('fs');
const _ = require('lodash');

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
    const stateFIPS = ['01', '02', '04', '05', '06', '08', '09', '10', '11', '12', '13', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '53', '54', '55', '56'];

    stateFIPS.forEach(fips => {
        getFeatures(`http://www2.census.gov/geo/tiger/GENZ2015/shp/cb_2015_${fips}_place_500k.zip`, 'region.place').then(features => {
            features.forEach(feature => {
                feature.properties = {
                    type: 'region.place',
                    id: feature.properties.AFFGEOID,
                    name: feature.properties.NAME
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
                name: `${feature.properties.GEOID10} ZIP Code`
            };
        });

        write('zcta.geojson', features);
    }).catch(console.error);
}

zips();

