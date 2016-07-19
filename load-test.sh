#!/bin/sh

./flush-memcache.sh
node test/load/generate-urls.js 1000 > .load-test-urls
siege -f .load-test-urls -d0 -r10 -c25

