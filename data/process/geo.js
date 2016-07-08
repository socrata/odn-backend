
const request = require('request-promise');
const _ = require('lodash');
const fs = require('fs');

const datasets = [
    {
        type: 'region.nation',
        fxf: 'bewf-qis3',
        scale: 20000000
    },
    {
        type: 'region.region',
        fxf: 'f4kj-dmer',
        scale: 20000000
    },
    {
        type: 'region.division',
        fxf: 'az5s-azsw',
        scale: 20000000
    },
    {
        type: 'region.state',
        fxf: 'q2rn-fknh',
        scale: 20000000
    },
    {
        type: 'region.county',
        fxf: 'anby-7igw',
        scale: 20000000
    },
    {
        type: 'region.msa',
        fxf: 'sp25-9inc',
        scale: 20000000
    },
    {
        type: 'region.nation',
        fxf: 'ab4i-wwsg',
        scale: 500000
    },
    {
        type: 'region.region',
        fxf: 'f4xa-tzst',
        scale: 500000
    },
    {
        type: 'region.division',
        fxf: 'p9dy-zxg9',
        scale: 500000
    },
    {
        type: 'region.state',
        fxf: '5v4d-yhq3',
        scale: 500000
    },
    {
        type: 'region.county',
        fxf: '4kuh-5sfh',
        scale: 500000
    },
    {
        type: 'region.msa',
        fxf: 'uvy9-3xfi',
        scale: 500000
    }
];

function getGeodata(dataset) {
    const {type, fxf, scale} = dataset;
    const url = `https://odn.data.socrata.com/resource/${fxf}.geojson?$limit=50000`;

    return getJSON(url).then(geojson => {
        geojson.features.forEach(feature => {
            feature.properties = {
                scale,
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

