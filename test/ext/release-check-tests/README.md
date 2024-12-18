# Overview

The tests in test/ext/release-check-tests/ serve as a supplement for our public tests in test/.

This directory and its sub-directories may:

- require specific database configurations (utf-8 support, extended character set, multiple schemas, etc.)
- print logs no matter what (pool.logStatistics())
- consume fairly long time

## Run edge-case tests

mocha --opts test/ext/release-check-tests/edge-max-cases/opts/mocha.opts

## Tests in test/ext/release-check-tests/

These tests will be included in code coverage calculations.

## MAX_STRING_SIZE=EXTENDED tests

Tests in test/ext/release-check-tests/extended-character-set
Run tests suite with:
node_modules/.bin/mocha --opts test/ext/release-check-tests/extended-character-set/opts/mocha.opts
Before running the tests, make sure the database has configured MAX_STRING_SIZE=EXTENDED.
