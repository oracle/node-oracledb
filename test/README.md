# Test node-oracledb

This software is dual-licensed to you under the Universal Permissive License
(UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
either license.

If you elect to accept the software under the Apache License, Version 2.0,
the following applies:

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

##  <a name="contents"></a> Contents

1. [Preparations](#preparations)
    - 1.1 [Create a work directory](#workdir)
    - 1.2 [Clone node-oracledb from GitHub](#clonerep)
    - 1.3 [Build](#build)
    - 1.4 [Configure Database credentials](#credentials)
    - 1.5 [Set NODE_PATH](#nodepath)
2. [Run tests](#runtests)
    - 2.1 [Run the complete test suite](#runall)
    - 2.2 [Run specified tests](#runspecified)
3. [Enable tests that require extra configuration](#enablespecified)
    - 3.1 [externalProxyAuth.js](#externalproxyauth)
4. [Contribute New Tests](#addtests)
5. [Troubleshoot](#troubleshoot)
    - 5.1 [ORA-00054: resource busy](#ORA-00054)
    - 5.2 [ORA-00018: maximum number of sessions exceeded](#ORA-00018)
    - 5.3 [ORA-28865: SSL connection closed](#ORA-28865)
    - 5.4 [ORA-03114: not connected to ORACLE](#ORA-03114)


## <a name="preparations"></a> 1. Preparations

See [INSTALL](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html)
for installation details.

On macOS, run a command like:

```
ln -s $HOME/Downloads/instantclient_19_8/libclntsh.dylib $(npm root)/oracledb/build/Release
```

Note: the
[test suite](https://github.com/oracle/node-oracledb/tree/main/test)
is on GitHub.

### <a name="workdir"></a> 1.1 Create a working directory

```
mkdir <some-directory>
cd <some-directory>
```

### <a name="clonerep"></a> 1.2 Clone node-oracledb from GitHub

Clone the project repository:

```
cd <some-directory>
git clone https://github.com/oracle/node-oracledb.git
```

### <a name="build"></a> 1.3 Build

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

### <a name="credentials"></a> 1.4 Configure Database credentials

Set the following environment variables to provide credentials for the test suite.

* `NODE_ORACLEDB_USER` provides the username of the schema user which you used for testing.
   Use the parameter *createUser* specified in `test/dbconfig.js` to create a new user within the test suite. Test suite does create such users.

* `NODE_ORACLEDB_PASSWORD` provides the password of the schema user which you used for testing.
   if you're generating a password for the user, use the predefined function testsUtil.generateRandomPassword.

* `NODE_ORACLEDB_CONNECTIONSTRING` provides the connection string that points to your database's location.

* `NODE_ORACLEDB_EXTERNALAUTH` provides the options for external authentication tests. Setting this environment variable to "true" will enable the tests that require external authentication. To ensure external authentication tests works, firstly make sure the Oracle external authentication service is correctly configured. See [Documentation for External Authentication](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth) for details.

* `NODE_ORACLEDB_DBA_PRIVILEGE` provides the options for DBA privilege. Setting this environment variable to "true" will enable the tests and utilities that require DBA privilege.

* `NODE_ORACLEDB_DBA_USER` provides the username of the DBA user which you used for testing, disabled if `NODE_ORACLEDB_DBA_PRIVILEGE` is not `true`.

* `NODE_ORACLEDB_DBA_PASSWORD` provides the password of the DBA user which you used for testing, disabled if `NODE_ORACLEDB_DBA_PRIVILEGE` is not `true`.

* `NODE_ORACLEDB_PROXY_SESSION_USER` provides the username of a schema user that can connect through the schema user which you used for testing using proxy authentication. Setting this environment variable will enable the tests that require proxy authentication.

* `NODE_ORACLEDB_QA`. This boolean environment variable serves as the toggle switch of certain tests. Some tests, such as `callTimeout.js`, use hard-coded variables as assertion condition. The test results may be inconsistent in different network situations.

* `NODE_ORACLEDB_DRCP` provides an option for skipping test run when DRCP is enabled. Setting this environment variable to `true` will skip certain test case run due to DRCP restrictions.

Note: the test suite requires the schema to have these privileges: CREATE TABLE, CREATE SESSION,
CREATE PROCEDURE, CREATE SEQUENCE, CREATE TRIGGER, and CREATE TYPE.

### <a name="nodepath"></a> 1.5 Set NODE_PATH

```bash
export NODE_PATH=<some-directory>/node-oracledb/lib
```

## <a name="runtests"></a> 2. Run tests

See [mochajs.org](http://mochajs.org/) for more information on running tests with mocha.

### <a name="runall"></a> 2.1 Run the complete test suite

```
cd node-oracledb
npm test
```

### <a name="runspecified"></a> 2.2 Run specified tests

```
cd node_oracledb
./node_modules/.bin/mocha test/<test-names>
```

## <a name="enablespecified"></a> 3. Enable tests that requires extra configuration

The following test(s) are automatically skipped if their required environment variable(s) are not properly set.

### <a name="externalproxyauth"></a> 3.1 externalProxyAuth.js
This test aims to test the combined usage of external authentication and proxy authentication. To run this test, you need to complete the following prerequisite setups.

* Enable external authentication on the schema user which you used for testing. See [Documentation for External Authentication](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#extauth) for more information on external authentication. Then use the following command to enable external authentication in the test suite.

    ```
    export NODE_ORACLEDB_EXTERNALAUTH true

    ```

* Enable proxy authentication on another schema user specified by environment variable `NODE_ORACLEDB_PROXY_SESSION_USER` that connects through the schema user which you used for testing. See [Documentation for Pool Proxy Authentication](https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#pool-proxy-authentication) for more information on proxy authentication. Then use the following command to enable proxy authentication in the test suite.

    ```
    export NODE_ORACLEDB_PROXY_SESSION_USER "Your_Proxy_Authenticating_User"

    ```
### <a name="externalproxyauth"></a> 3.2 SODA tests
To execute SODA tests, Oracle Database users require the SODA_APP role granted to them by a DBA. If SODA_APP is not granted, SODA tests will be skipped.

To grant the SODA_APP role to a Oracle Database user, typically a DBA would execute:

    ```
    grant SODA_APP to <Oracle Database user>

    ```

## <a name="addtests"></a> 4. Contribute New Tests

See [CONTRIBUTING](https://github.com/oracle/node-oracledb/blob/main/CONTRIBUTING.md)
for general information on contribution requirements.

For easy correlation between results and test code, each test is
assigned a number. The [Test List](https://github.com/oracle/node-oracledb/blob/main/test/list.txt)
shows the numbering of tests.

In order to include your tests in the suite, add each new test file
name to [`test/opts/mocha.opts`](https://github.com/oracle/node-oracledb/blob/main/test/opts/mocha.opts).

## <a name="troubleshoot"></a> 5. Troubleshoot

You may encounter some troubles when running the test suite. These troubles
might be caused by the concurrency issue of Mocha framework, network latencies,
or database server issues. This section gives some issues that we ever saw
and our solutions.

### <a name="ORA-00054"></a> 5.1 ORA-00054: resource busy and acquire with NOWAIT specified or timeout expired

This error occurs when Node.js programs try to change database objects which
hold locks. The workaround would be:

(1) Use unique DB object names for each test to avoid interference between
test files.
(2) Try not to use 'beforeEach' blocks for object operations to avoid
the interference between cases.

### <a name="ORA-00018"></a> 5.2 ORA-00018: maximum number of sessions exceeded

This error occurs when the test suite takes up more sessions than the
configured limit. You can alter the session limit on the database server side.
If you do not have access to change the database session setting, you could
use the below script to deliberately add an interval between tests.

```Bash
arr=$(ls test/*js)
for case in ${arr[@]}
do
  var="$NODE_PATH/../node_modules/.bin/mocha --timeout 10000 $case"
  eval $var
  sleep 1
done
```

### <a name="ORA-28865"></a> 5.3 ORA-28865: SSL connection closed

You may encounter this error when the test suite sends more connection
requests per second than the database is configured to handle.

There are two solutions:

- Solution 1: Change database `RATE_LIMIT` configuration. This parameter
defines the connection count allowed per second. See [RATE_LIMIT](https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F302BF91-64F2-4CE8-A3C7-9FDB5BA6DCF8)
for more information.

- Solution 2: Set the `RETRY_COUNT` and `RETRY_DELAY` parameters in
connectString.

For example, below is the connectString which could be defined in
`tnsnames.ora` file.

```
dbaccess = (description=(RETRY_COUNT=20)(RETRY_DELAY=3)
          (address=(protocol=tcps)(port=1521)(host=<db-host>))
          (connect_data=(service_name=<service-name>))
          (security=(my_wallet_directory=<wallet-location>)(ssl_server_cert_dn=<ssl-server-cert-dn>))
       )
```

### <a name="ORA-03114"></a> 5.4 ORA-03114: not connected to ORACLE

We first encoutered this error with `test/callTimeout.js`. It uses some hard-coded variables as assertion condition, which may lead to assertion fail in slow network situation.

The solution is commenting out this line `sqlnet.recv_timeout=<minutes>` from `sqlnet.ora` file.
