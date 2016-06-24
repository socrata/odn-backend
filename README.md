# ODN Backend

[![Build Status](https://travis-ci.org/socrata/odn-backend.svg?branch=master)](https://travis-ci.org/socrata/odn-backend)

A REST API for the Open Data Network.

## Documentation

API documentation is available on [Apiary](http://docs.odn.apiary.io/).

## Development

The ODN backend is built using [Node.js](https://nodejs.org/).
After cloning the repository and downloading node,
simply run `npm install` from within the project directory
to install all dependencies.

### Server

Use `npm run server` to start the development
server at [localhost:3001](http://localhost:3001/).
It will automatically restart when the source is changed.

### Tests

REST API tests are written using [Chakram](https://github.com/dareid/chakram).
They are available in the `test` directory.
Run tests using `npm run test`.

### Deployment

The ODN backend is hosted on Heroku.
There are two environments:
[production](http://odn-backend.herokuapp.com/) and
[staging](http://odn-backend-staging.herokuapp.com/).

To deploy to an environment, push to the corresponding branch on github.
For production, push to `master` and for staging, push to `staging`.
There should be no need to manually deploy to Heroku,
but if you do, make sure that `master` stays in sync with what is
on Heroku.

Email `lane.aasen@socrata.com` for Heroku access.

#### Integration Tests

Integration tests are run to check each deployment using
[Travis CI](https://travis-ci.org/socrata/odn-backend).
These tests must pass for the deployment to succeed.

### Logging

All Heroku logs are forwarded to [Sumo Logic](https://www.sumologic.com/).
This includes basic information for each request,
as well as detailed stack traces for all exceptions and 500s.
Search with `_source=odn_api_heroku` to see all of the logs.

### Monitoring

There is a [Pingdom alert](https://my.pingdom.com/reports/uptime#check=2202319)
that checks to make sure production is up.

It will email Chris, Deep, Lane, and Tosh if the API is down.
Once apps are built around the ODN API, alerts will be sent to on call.

## Datasets

The ODN REST API is backed by a series of Socrata datasets.

### [Entities](https://dev.socrata.com/foundry/odn.data.socrata.com/kksg-4m3m)

The entities dataset contains a list of all entities in the ODN.
Each entity has the following properties:
 - id: unique alphanumeric id
 - name: canonical name of the entity
 - type: hierarchical type of the entity (e.g. region.nation)

### [Relations](https://dev.socrata.com/foundry/odn.data.socrata.com/dc4t-zwj5)

The relations dataset contains parent-child relations between entities.
Each row containsa parent entity and a child entity with an additional
rank field for each entity that is used for sorting results.
The higher the rank, the more important the entity.
While the rank field is not required, it is very useful and should
be included.

