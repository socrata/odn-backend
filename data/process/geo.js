
const request = require('request-promise');
const _ = require('lodash');
const fs = require('fs');

const datasets = [
    {
        type: 'region.nation',
        fxf: 'ab4i-wwsg'
    },
    {
        type: 'region.region',
        fxf: 'f4xa-tzst'
    },
    {
        type: 'region.division',
        fxf: 'p9dy-zxg9'
    },
    {
        type: 'region.state',
        fxf: '5v4d-yhq3'
    },
    {
        type: 'region.county',
        fxf: '4kuh-5sfh'
    },
    {
        type: 'region.msa',
        fxf: 'uvy9-3xfi'
    }
];

function getGeodata(dataset) {
    const {type, fxf} = dataset;
    const url = `https://odn.data.socrata.com/resource/${fxf}.geojson?$limit=50000`;

    return getJSON(url).then(geojson => {
        geojson.features.forEach(feature => {
            feature.properties = {
                type,
                id: feature.properties.affgeoid,
                name: feature.properties.name,
            };
        });

        return Promise.resolve(geojson);
    });
}

function getJSON(url) {
    return request(url)
        .then(response => Promise.resolve(JSON.parse(response.toString())));
}

function mergeDeep(objects) {
    return _.mergeWith.apply(this, objects.concat(mergeArrays));
}

function mergeArrays(a, b) {
    if (_.isArray(a) && _.isArray(b)) return a.concat(b);
    return a;
}

Promise.all(datasets.map(getGeodata)).then(geodata => {
    const allGeodata = mergeDeep(geodata);

    fs.writeFileSync('geodata.geojson', JSON.stringify(allGeodata));
}).catch(console.error);

