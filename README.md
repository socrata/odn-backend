# ODN Backend

Backend for the Open Data Network.

## Documentation

API documentation is available on [Apiary](http://docs.odn.apiary.io/).

## Development

The ODN backend is built using [Node.js](https://nodejs.org/).

After downloading node,

### Server

Run `npm install` and then `npm run server` to start the development
server at [localhost:3001](http://localhost:3001/).

### Tests

Unit tests are available in the `test` directory.
Run tests using `npm run test`.

### Logging

[Winston](https://github.com/winstonjs/winston) is used for logging.

Information about 500 errors is logged to the console and available
through the Heroku logs.
Logging info for client errors is dumped to debug.log.

