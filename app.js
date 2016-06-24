'use strict';

const compression = require('compression');
const express = require('express');

const app = express();

app.use(compression());

app.set('json spaces', 4);

app.get('/', require('./app/controllers/home'));
app.get('/related/v1/:relation', require('./app/controllers/related/v1/related'));

app.use(require('./app/controllers/error').respond);

const port = Number(process.env.PORT || 3001);

app.listen(port);

