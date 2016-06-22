'use strict';

const compression = require('compression');
const express = require('express');

const app = express();

app.use(compression());

app.set('json spaces', 4);

app.get('/', require('./app/controllers/home'));
app.get('/related/:relation', require('./app/controllers/related'));

app.use(require('./app/controllers/error'));


process.on('uncaughtException', function(err) {
    console.log( " UNCAUGHT EXCEPTION " );
    console.log( "[Inside 'uncaughtException' event] " + err.stack || err.message );
    console.log(err);
});

const port = Number(process.env.PORT || 3001);

app.listen(port);

