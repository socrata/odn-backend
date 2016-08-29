'use strict';

process.isDevelopment = process.env.NODE_ENV === 'development';
process.isProduction = !process.isDevelopment;

const istanbul = require('istanbul-middleware');
if (process.isDevelopment) istanbul.hookLoader(__dirname);

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(require('compression')());
app.use(require('cors')());

if (process.isDevelopment) app.use('/coverage', istanbul.createHandler());

app.get('/', require('./app/home'));

// Map values can be retrieved over HTTP or using Websockets.
// Since map sessions store app tokens, they do not need app tokens.
io.on('connection', require('./app/data/map/values'));

// Every endpoint after this requires an app token parameter or header.
app.use(require('./app/token'));
app.get('/data/v1/availability', require('./app/data/availability/controller'));
app.get('/data/v1/constraint/:variable', require('./app/data/constraint/controller'));
app.get('/data/v1/values', require('./app/data/values/controller'));
app.get('/data/v1/map/new', require('./app/data/map/new'));
app.get('/suggest/v1/:type', require('./app/suggest/controller'));
app.get('/search/v1/dataset', require('./app/search/dataset'));
app.get('/search/v1/question', require('./app/search/question'));
app.get('/entity/v1', require('./app/entity/controller'));
app.get('/entity/v1/:relation', require('./app/related/controller'));

app.use(require('./app/error').respond);

const port = Number(process.env.PORT || 3001);

http.listen(port);

