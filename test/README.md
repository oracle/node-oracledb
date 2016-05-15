# Test node-oracledb

*Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

The node-oracledb test suite uses 'mocha', 'should' and 'async'.  See
[LICENSE](https://github.com/oracle/node-oracledb/blob/master/LICENSE.md)
for relevant licenses.

## 1. Preparations for running tests

See [INSTALL](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md)
for installation requirements and more details.

Note: the
[test suite](https://github.com/oracle/node-oracledb/tree/master/test)
is in GitHub.  From node-oracledb 1.9.1 it is not included when
installing from npmjs.com with `npm install oracledb`.

### 1.1 Create a working directory

```
mkdir <some-directory>
cd <some-directory>
```

### 1.2 Get node-oracledb from GitHub

Clone the project repository:

```
cd <some-directory>
git clone https://github.com/oracle/node-oracledb.git
```

### 1.3 Build

```
cd <some-directory>/node-oracledb
npm install
```

Running `npm install` within the node-oracledb/ directory will recompile
oracledb and install all its dependent modules.  These are listed
in the `devDependencies` field of `package.json` file.  Thus, 'mocha', 'async'
and 'should' modules are installed by this command.

The test suite uses [mocha](https://www.npmjs.com/package/mocha),
[async](https://www.npmjs.com/package/async) and
[should](https://www.npmjs.com/package/should).

### 1.4 Configure Database credentials

The database credentials for node-oracledb test suite are defined in `dbconfig.js`.
They can also be set via environment variables shown in that file.


```
vi <some-directory>/node-oracledb/test/dbconfig.js
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

Note: the test suite requires a schema with these privileges:

- CREATE TABLE
- CREATE SESSION
- CREATE PROCEDURE
- CREATE SEQUENCE
- CREATE TRIGGER

### 1.5 Set NODE_PATH

```bash
export NODE_PATH=<some-directory>/node-oracledb/lib
```

## 2. Run tests

### 2.1 Run the complete test suite

#### 2.1.1 On Unix-like systems

```
cd <some-directory>/node-oracledb
npm test
```

This calls the `test` script defined in `oracledb/package.json`.

#### 2.1.2 On Windows

```
cd <some-directory>/node_oracledb
npm run-script testWindows
```

This calls the `testWindows` script defined in `oracledb/package.json`.

See [npm scripts](https://docs.npmjs.com/misc/scripts) for more information
about how npm handles the "scripts" field of `package.json`.

### 2.2 Run specified test(s)

```
cd <some-directory>/node_oracledb
<mocha-executable-file-directory>/mocha test/<test-names>
```

See [mochajs.org](http://mochajs.org/) for more information on running tests with mocha.

## 3. Add Tests
See [CONTRIBUTING](https://github.com/oracle/node-oracledb/blob/master/CONTRIBUTING.md)
for general information on contribution requirements.

For easy correlation between results and test code, each test is
assigned a number. The following number ranges have been chosen:

- 1  - 20  are reserved for basic functional tests
- 21 - 50  are reserved for data type supporting tests
- 51 onwards are for other tests

## 4. Test Index

See [`test/list.txt`](https://github.com/oracle/node-oracledb/blob/master/test/list.txt) for the list of existing tests.
