'use strict';

const compression = require('compression');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(compression());
app.use(cors());

app.set('json spaces', 4);

app.get('/', require('./app/home'));
app.get('/related/v1/:relation', require('./app/related/controller'));
app.get('/data/v1/availability', require('./app/data/availability/controller'));
app.get('/data/v1/constraint/:variable', require('./app/data/constraint/controller'));
app.get('/data/v1/values', require('./app/data/values/controller'));
app.get('/data/v1/map/:variable', require('./app/data/map/controller'));
app.get('/suggest/v1/:type', require('./app/suggest/controller'));

app.use(require('./app/error').respond);

const port = Number(process.env.PORT || 3001);

app.listen(port);

