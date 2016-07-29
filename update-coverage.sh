#!/bin/sh

# Update test coverage reports on Code Climate.
# Start the server, run the unit tests, and then run this script.

mkdir -p .coverage
cd .coverage

wget -O coverage.zip localhost:3001/coverage/download
unzip -o -q coverage.zip

head -n 20 lcov.info
../node_modules/.bin/codeclimate-test-reporter < lcov.info

