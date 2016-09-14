# ODN Backend

[![Build Status](https://travis-ci.org/socrata/odn-backend.svg?branch=master)](https://travis-ci.org/socrata/odn-backend)
[![Code Climate](https://codeclimate.com/github/socrata/odn-backend/badges/gpa.svg)](https://codeclimate.com/github/socrata/odn-backend)
[![Test Coverage](https://codeclimate.com/github/socrata/odn-backend/badges/coverage.svg)](https://codeclimate.com/github/socrata/odn-backend/coverage)

A REST API for the Open Data Network.
Available at [api.opendatanetwork.com](http://api.opendatanetwork.com).

## Documentation

API documentation is available on [Apiary](http://docs.odn.apiary.io/).

## Development

The ODN backend is built using [Node.js](https://nodejs.org/).
After cloning the repository and downloading node,
simply run `npm install` from within the project directory
to install all dependencies.

The ODN backend uses syntactic features of ES6 that are only available in
recent versions of Node, so it may fail to run with older versions.
Make sure that you use the Node version specified in `package.json` (currently `6.2.2`).
You can check your node version using `node --version`.

### Memcached

The ODN backend uses [memcached](https://memcached.org/)
to cache responses from the Socrata backend and store map sessions.

#### Installation with Homebrew

Memcached is available over [homebrew](http://brew.sh/).
To install it, use `brew install memcached`.
There are many options for running `memcached`.
To see them all, use `brew info memcached`.

#### Flushing the Cache

Run `./flush-memcache.sh` to flush the development cache.

### Server

Use `npm run server` to start the development
server at [localhost:3001](http://localhost:3001/).
It will automatically restart when the source is changed.
Start a local memcached server to get maps to work.

### Tests

REST API tests are written using [Chakram](https://github.com/dareid/chakram)
and run with [Mocha](https://mochajs.org/).
They are available in the `test` directory.
Run tests using `npm test`.

Sometimes, running tests will trigger a webserver restart which
will then cause many tests to fail.
If this happens, start the server using `node app.js`.

#### Test Coverage

Test coverage reports for `master` are available on
[Code Climate](https://codeclimate.com/github/socrata/odn-backend/coverage).

To view test coverage while in development:
start the server, run the tests, and then go to
[localhost:3001/coverage](http://localhost:3001/coverage)
to see the reports.

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

Check LastPass for Heroku access.

#### MemJS

The ODN uses the Heroku [MemJS](https://github.com/alevy/memjs) add-on
for memcached.
The cache is flushed on each deploy to avoid synchronization conflicts.
Make sure to the `NODE_ENV` environmental variable to `production`
on every Heroku dyno so that the cache knows to flush itself.

#### Integration Tests

Integration tests are run to check each deployment using
[Travis CI](https://travis-ci.org/socrata/odn-backend).
These tests must pass for the deployment to succeed.

#### Running Tests before Committing

Since all tests must pass for a deployment to succeed,
it is a good idea to run unit tests locally before pushing to GitHub.
The `pre-commit.sh` script will make sure that all unit tests succeed before
every commit. To install it, run:

```sh
ln -s -f ../../pre-commit.sh .git/hooks/pre-commit
```

#### Load Tests

The `load-test.sh` script can be used to put load on the service.
It randomly generates thousands of valid URLs and then uses
[Siege](https://www.joedog.org/siege-home/) to test them.

First, install Siege. On a mac, just use `brew install siege`.

Then, run the `load-test.sh` script with a domain.
For example, test against localhost, use

```
./load-test.sh localhost:3001
```

This will start a small load test. To change the parameters of the test,
edit `load-test.sh`. Please do not use this script on production.
Also, remember that the main bottleneck of the ODN API is the Socrata platform,
and that a load test of the ODN is a load test of the platform.
Don't take it down.

### Logging

All Heroku logs are forwarded to [Sumo Logic](https://www.sumologic.com/).
This includes basic information for each request,
as well as detailed stack traces for all exceptions and 500s.
Search with `_source=odn_api_heroku` to see all of the logs.

Use the [Sumo dashboard](https://service.sumologic.com/ui/dashboard.html?f=76263689&t=r)
for an overview of how the service is performing.
For access to this dashboard, use the Socrata Sumo account.

### Monitoring

There are several Pingdom alerts that monitor the service:
 - [/data/v1/availability](https://my.pingdom.com/reports/uptime#check=2210560)
 - [/data/v1/constraint](https://my.pingdom.com/reports/uptime#check=2210566)
 - [/entity/v1](https://my.pingdom.com/reports/uptime#check=2202319)

Pingdom will alert Chris, Deep, Lane, and Tosh if the API is down.
Once apps are built around the ODN API, alerts will be sent to on call.

## Adding Data to the ODN

See [`/data`](/data) for information on adding data to the ODN.

