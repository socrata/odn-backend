'use strict';

const compression = require('compression');
const express = require('express');

const app = express();

app.use(compression());

app.get('/', require('./controllers/home'));

app.use((error, req, res, next) => {
    // RenderController.error(req, res)(error);
});

const port = Number(process.env.PORT || 3001);

app.listen(port);

