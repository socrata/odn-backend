'use strict';

const compression = require('compression');
const express = require('express');

const app = express();

app.use(compression());

app.set('json spaces', 4);

app.get('/', require('./app/controllers/home'));
app.get('/related/v1/:relation', require('./app/controllers/related/v1/controller'));
app.get('/data/v1/availability', require('./app/controllers/data/v1/availability/controller'));
app.get('/data/v1/constraint/:variable', require('./app/controllers/data/v1/constraint/controller'));
app.get('/suggest/v1/:type', require('./app/controllers/suggest/v1/controller'));

app.use(require('./app/controllers/error').respond);

const port = Number(process.env.PORT || 3001);

app.listen(port);

