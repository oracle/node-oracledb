# Testing node-oracledb

*Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

The node-oracledb test suite uses 'mocha', 'should' and 'async'. 
See LICENSE.md for relevant licenses.

## Running the complete test suite

### 1. Create a working directory

```
mkdir <some-directory>
cd <some-directory>
```

### 2. Install node-oracledb

See [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md)
for installation requirements and more details.

Install with:

```
npm install oracledb
```

Alternatively use a GitHub clone:

```
git clone https://github.com/oracle/node-oracledb.git
npm install node-oracledb
```

### 3. Install dependent modules

The test suite uses [mocha](https://www.npmjs.com/package/mocha), [async](https://www.npmjs.com/package/async) and [should](https://www.npmjs.com/package/should).  These need to be installed separately.

```
cd <some-directory>/node_modules/oracledb
npm install mocha should async
```

Note: these are listed in `devDependencies` in `package.json` so `npm
install` will install them when executed inside a node-oracledb
package directory.

### 4. Database credentials

The database credentials for node-oracledb test suite are defined in dbConfig.js file. You can set the credentials via environment variables or dbConfig.js file.
Change the credentials to a user who has privileges to connect and create tables. 

```
vi <some-directory>/node_modules/oracledb/test/dbConfig.js
```

```javascript
module.exports = {
  user          : process.env.NODE_ORACLEDB_USER || "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD || "welcome",
  connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "localhost/orcl",
  externalAuth  : process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false
};
```

To use external authentication, set the `externalAuth` property to
`true`.  Also make sure Oracle Database and the authentication service
have been appropriately configured.  See
[Documentation for External Authentication](https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth)
for more details.

### 5. Run test suite

All tests can be run with:

```
cd <some-directory>/node_modules/oracledb
npm test
```

This calls the `test` script defined in `<some-directory>/node_modules/oracledb/package.json`.
If `mocha` is not in the directory specified in `package.json`, for example if you have installed it globally, then edit `package.json` and change the path.

## Running a single test

Individual tests can be run using:

```
cd <some-directory>/node_modules/oracledb
../mocha/bin/mocha test/<test-name>
```

See [mochajs.org](http://mochajs.org/) for more information on running tests with mocha.

## Adding Tests
See [CONTRIBUTING](https://github.com/oracle/node-oracledb/blob/master/CONTRIBUTING.md) for general information on contribution requirements.

For easy correlation between results and test code, each test is
assigned a number.  The following number ranges have been chosen:

- 1  - 20  are reserved for basic functional tests
- 21 - 50  are reserved for data type supporting tests
- 51 onwards are for other tests

## Test List

See test/list.txt file for the list of existing tests.
