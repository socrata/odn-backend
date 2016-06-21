'use strict';

const compression = require('compression');
const express = require('express');

const app = express();

app.use(compression());

app.set('json spaces', 4);

app.get('/', require('./controllers/home'));
app.get('/related/:relation', require('./controllers/related'));

app.use(require('./controllers/error'));

const port = Number(process.env.PORT || 3001);

app.listen(port);

