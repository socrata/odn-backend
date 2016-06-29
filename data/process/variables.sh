#!/bin/sh

node --max-old-space-size=8192 variables.js ../sources-map.json "$@"

