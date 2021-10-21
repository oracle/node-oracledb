# Installing node-oracledb Version 5.3

*Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

##  <a name="contents"></a> Contents

## ===> *** Note: Go to [https://oracle.github.io/node-oracledb/INSTALL.html](https://oracle.github.io/node-oracledb/INSTALL.html) for production documentation ***

1. [Node-oracledb Overview](#overview)
2. [Quick Start node-oracledb Installation](#quickstart)
3. [Node-oracledb Installation Instructions](#instructions)
    - 3.1 [Prerequisites](#prerequisites)
    - 3.2 [Node-oracledb Installation on Linux](#linuxinstall)
        - 3.2.1 [Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files](#instzip)
        - 3.2.2 [Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client](#instoh)
        - 3.2.3 [Node-oracledb Installation on Linux x86_64 with Instant Client RPMs](#instrpm)
        - 3.2.4 [Node-oracledb Installation on Linux ARM (aarch64)](#aarch64)
        - 3.2.5 [Installing Node.js and node-oracledb RPMs from yum.oracle.com](#instnoderpms)
    - 3.3 [Node-oracledb Installation on Apple macOS (Intel x86)](#instosx)
    - 3.4 [Node-oracledb Installation on Microsoft Windows](#windowsinstallation)
        - 3.4.1 [Node-oracledb Installation on Microsoft Windows with Instant Client ZIP files](#instwin)
        - 3.4.2 [Node-oracledb Installation on Microsoft Windows with a Local Database or Full Client](#instwinoh)
    - 3.5 [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
    - 3.6 [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
    - 3.7 [Node-oracledb Installation from Source Code](#github)
        - 3.7.1 [Installing GitHub clones and ZIP files](#githubclone)
        - 3.7.2 [Installing using GitHub branches and tags](#githubtags)
        - 3.7.3 [Installing from a source package](#sourcepackage)
        - 3.7.4 [Installing from Oracle's repository](#nogithubaccess)
        - 3.7.5 [Creating a node-oracledb package from source code](#compilepackage)
    - 3.8 [Node-oracledb Installation Without Internet Access](#offline)
        - 3.8.1 [Copying node-oracledb Binaries on Windows](#winbins)
    - 3.9 [Hosting your own node-oracledb Packages](#selfhost)
    - 3.10 [Using node-oracledb in Docker](#docker)
4. [Installing Older Versions of Node-oracledb](#installingoldvers)
5. [Troubleshooting Node-oracledb Installation Problems](#troubleshooting)

## <a name="overview"></a> 1. Node-oracledb Overview

The [*node-oracledb*][4] add-on for Node.js powers high performance Oracle
Database applications.  The architecture is shown in [Node-oracledb
Architecture][60].

The steps below create a Node.js installation with node-oracledb.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node.js 12, 14 and 16 on Oracle
Linux x86_64 (releases 7 and 8), Windows, and macOS (Intel x86).  The add-on
may also build on Linux ARM (aarch64), Windows 32-bit, Solaris and AIX
environments, but these architectures have not been tested.  This version of
node-oracledb may work with older Node.js versions if they are [Node-API][53]
version 4 compatible.  Older versions of node-oracledb may also work with older
versions of Node.js.

Node-oracledb requires Oracle Client libraries version 11.2 or later, and
can connect to Oracle Database 9.2 or later, depending on the Oracle Client library
version.

Node-oracledb is an [add-on](https://nodejs.org/api/addons.html)
available as C source code.  Pre-built binaries are available
as a convenience for common architectures.  Note the operating systems
and versions of Node.js that the pre-built binaries are compatible
with will change as the Node.js project evolves.  The binaries are not
guaranteed to be available or usable in your environment.

## <a name="quickstart"></a> 2. Quick Start node-oracledb Installation

Simple installation instructions for Windows, macOS (Intel x86) and Linux
(x86_64) are available:

- [Quick Start: Developing Node.js Applications for Oracle Database][68]

- [Quick Start: Developing Node.js Applications for Oracle Autonomous Database][69]

Alternatively, follow these instructions:

- Install Node.js from [nodejs.org][11].

- Add `oracledb` to your `package.json` dependencies or run `npm install
  oracledb`.  This installs from the [npm registry][4].  Pre-built
  node-oracledb binaries are available for Windows 64-bit, Linux x86_64, and
  macOS (Intel x86).

  If you are behind a firewall, you may need to set the proxy with `npm config
  set proxy http://myproxy.example.com:80/`.

  Windows users will require the [Visual Studio 2017 Redistributable][27].

- If a pre-built binary is not available, you will need to build from source
  code.  Reivew the [prerequisites](#github) and add
  `https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz`
  to your `package.json` dependencies or run `npm install
  https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz`.

- Add Oracle Client libraries version 21, 19, 18, 12, or 11.2 to your operating
  system library search path such as `PATH` on Windows or `LD_LIBRARY_PATH` on
  Linux.  On macOS link the libraries to `/usr/local/lib`.

    - If your database is remote, then get the libraries by
      downloading and unzipping the free [Oracle Instant Client][3]
      "Basic" or "Basic Light" package for your operating system
      architecture.

      Instant Client on Windows requires an appropriate [Visual Studio
      Redistributable](#winredists).  On Linux, the `libaio` (sometimes called
      `libaio1`) package is needed.  When using Instant Client 19 on recent
      Linux versions, such as Oracle Linux 8, you may also need to install the
      `libnsl` package.  This is not needed from Instant Client 21 onward.

    - Alternatively use the Oracle Client libraries already available
      in `$ORACLE_HOME/lib` from a locally installed database such as
      the free [Oracle XE][20] release.

  Oracle Client libraries 21 can connect to Oracle Database 12.1 or greater.
  Oracle Client libraries 19, 18 and 12.2 can connect to Oracle Database 11.2 or
  greater. Version 12.1 client libraries can connect to Oracle Database 10.2 or
  greater. Version 11.2 client libraries can connect to Oracle Database 9.2 or
  greater.

- Your Node.js applications can now connect to your database.  The
  database can be on the same machine as Node.js, or on a remote
  machine.  Node-oracledb does not install or create a database.

  You will need to know [database credentials][45] and the [connection
  string][7] for the database.

See [Troubleshooting Node-oracledb Installation
Problems](#troubleshooting) if you have installation issues.

After installation, learn how to use node-oracledb from the
[examples][19] and the [documentation][44].

## <a name="instructions"></a> 3. Node-oracledb Installation Instructions

Instructions may need to be adjusted for your platform, environment and versions being used.

I have ... | Follow this ...
----------|-----------------
Windows.  My database is on another machine | [Node-oracledb Installation on Microsoft Windows with Instant Client ZIP files](#instwin)
Windows.  My database is on the same machine as Node.js | [Node-oracledb Installation on Microsoft Windows with a Local Database or Full Client](#instwinoh)
Apple macOS (Intel x86) | [Node-oracledb Installation on Apple macOS (Intel x86)](#instosx)
Linux x86_64 that uses RPM packages.  My database is on another machine | [Node-oracledb Installation on Linux x86_64 with Instant Client RPMs](#instrpm)
Linux x86_64 that uses Debian packages.   My database is on another machine | [Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files](#instzip)
Linux x86_64.  My database is on the same machine as Node.js | [Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client](#instoh)
Linux x86_64. I have the full Oracle client (installed via `runInstaller`) on the same machine as Node.js | [Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client](#instoh)
Linux x86_64.  I want to install Node.js and node-oracledb RPM packages | [Installing Node.js and node-oracledb RPMs from yum.oracle.com](#instnoderpms)
Linux ARM (aarch64) | [Node-oracledb Installation on Linux ARM (aarch64)](#aarch64)
AIX on Power Systems | [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
Solaris x86-64 (64-Bit) | [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
Another OS with Oracle Database 21, 19, 18, 12, or  11.2 client libraries available | Update binding.gyp and make any code changes required, sign the [OCA][8], and submit a pull request with your patch.
Source code from GitHub | [Node-oracledb Installation from Source Code](#github)
I don't have internet access | [Node-oracledb Installation Without Internet Access](#offline)

### <a name="prerequisites"></a> 3.1 Prerequisites

All installations need:

- Oracle 21, 19, 18, 12 or 11.2 client libraries on the machine Node.js is installed on.

  Run `node -p "process.arch"` and make sure to use 64-bit or 32-bit
  Oracle client libraries to match the Node.js architecture.

  Oracle client libraries are included in [Oracle Instant Client][3]
  RPMs or ZIPs, a full Oracle Client, or a database on the same
  machine.  You only need one of these installations.

  Oracle's standard client-server network interoperability allows connections
  between different versions of Oracle Client and Oracle Database.  For
  supported configurations see Oracle Support's [Doc ID 207303.1][6].  In
  summary, Oracle Client 21 can connect to Oracle Database 12.1 or greater.
  Oracle Client 19, 18 and 12.2 can connect to Oracle Database 11.2 or
  greater. Oracle Client 12.1 can connect to Oracle Database 10.2 or
  greater. Oracle Client 11.2 can connect to Oracle Database 9.2 or greater.
  The technical restrictions on creating connections may be more flexible.  For
  example Oracle Client 21 can successfully connect to Oracle Database 11.2,
  while Oracle Client 12.2 can successfully connect to Oracle Database 10.2.

- An Oracle Database.  Installing Node-oracledb does not install or create a
  database.

  After installation of node-oracledb, your Node.js applications will be able
  to connect to your database.  The database can be on the same machine as
  Node.js, or on a remote machine.

  You will need to know [database credentials][45] and the [connection
  string][7] for the database.

Pre-built node-oracledb binaries are available for Windows 64-bit, Linux
x86_64, and macOS (Intel x86).  For other platforms you need to [build from
source code](#github).

#### <a name="linuxinstall"></a> 3.2 Node-oracledb Installation on Linux

For Linux x86_64:

- [Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files](#instzip)
- [Node-oracledb Installation on Linux x86_64 with a Local Database or Full Client](#instoh)
- [Node-oracledb Installation on Linux x86_64 with Instant Client RPMs](#instrpm)
- [Installing Node.js and node-oracledb RPMs from yum.oracle.com](#instnoderpms)

For Linux ARM:

- [Node-oracledb Installation on Linux ARM (aarch64)](#aarch64)

#### <a name="instzip"></a> 3.2.1 Node-oracledb Installation on Linux x86_64 with Instant Client ZIP files

Follow these steps if your database is on a remote machine and either:
- you prefer installing Instant Client ZIP files instead of RPM packages
- or your Linux distribution uses the Debian package format, for example if you are using Ubuntu.  Note: you should review Oracle's supported distributions before choosing an operating system.

Questions and issues can be posted as [GitHub Issues][10].

##### 3.2.1.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a compatible
glibc.  The pre-built binaries are known to be usable on Oracle Linux 6, 7, and
8.

##### 3.2.1.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For example,
if you downloaded version 14.17.0 for 64-bit you could install Node.js into
`/opt`:

```
cd /opt
tar -Jxf node-v14.17.0-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH
```

##### 3.2.1.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

If a pre-built node-oracledb binary is not installable or depends on an newer
glibc version, uninstall node-oracledb and build the binary from source code,
see [Node-oracledb Installation from Source Code](#github).

##### 3.2.1.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the free **Basic** ZIP file from [Oracle Technology Network][12]
and [unzip it][13] into a directory accessible to your application,
for example:

```
mkdir -p /opt/oracle
cd /opt/oracle
wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linuxx64.zip
unzip instantclient-basic-linuxx64.zip
```

You will need the operating system `libaio` package installed.  On some
platforms the package is called `libaio1`.  Run a command like `yum install -y
libaio` or `apt-get install -y libaio1`, depending on your Linux distribution
package manager.  When using Instant Client 19 on recent Linux versions, such
as Oracle Linux 8, you may also need to install the `libnsl` package.  This is
not needed from Instant Client 21 onward.  Note Oracle Instant Client 19 will
not run on Oracle Linux 6.

If there is no other Oracle software on the machine that will be impacted, then
permanently add Instant Client to the run-time link path.  For example, if the
Basic package unzipped to `/opt/oracle/instantclient_19_11`, then run the
following using sudo or as the root user:

```
sudo sh -c "echo /opt/oracle/instantclient_19_11 > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_11:$LD_LIBRARY_PATH
```

If disk space is important, most users will be able to use the smaller Basic
Light package instead of the Basic package.  Review its [globalization
limitations][62].  Disk space can be reduced by removing unnecessary libraries
and files from either the Basic or Basic Light packages.  The exact libraries
depend on the Instant Client version.  For example, with Oracle Instant Client
19, you can optionally remove files using:

```
rm -i *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci
```

Refer to the Oracle Instant Client documentation for details.

##### 3.2.1.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory, for example in `/opt/oracle/your_config_dir`.  Then use
[`oracledb.initOracleClient()`][64] in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});
```

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network/admin` subdirectory of
Instant Client, for example in `/opt/oracle/instantclient_19_11/network/admin`.
This is the default Oracle configuration directory for executables linked with
this Instant Client.

##### 3.2.1.6 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.

#### <a name="instoh"></a> 3.2.2 Node-oracledb installation on Linux x86_64 with a Local Database or Full Client

Questions and issues can be posted as [GitHub Issues][10].

##### 3.2.2.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The `ORACLE_HOME` can be either a database home or a full Oracle
client installation installed with Oracle's `runInstaller`.

For easy development, the free [Oracle XE][20] version of the database
is available on Linux.  Applications developed with XE may be
immediately used with other editions of the Oracle Database.

##### 3.2.2.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 14.17.0 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -zxf node-v14.17.0-linux-x64.tar.gz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH
```

##### 3.2.2.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

##### 3.2.2.4 The default Oracle Client configuration directory

Optional Oracle client configuration files such as [`tnsnames.ora`][15],
[`sqlnet.ora`][16], and [`oraaccess.xml`][18] can be placed in
`$ORACLE_HOME/network/admin`.

Alternatively, if you use Oracle client configuration files, they can be put in
another, accessible directory.  Then use `oracledb.initOracleClient({configDir:
'/your_path/your_config_dir'});` or set the environment variable `TNS_ADMIN` to
that directory name.

##### 3.2.2.5 Run an example program

Set required Oracle environment variables, such as `ORACLE_HOME` and
`LD_LIBRARY_PATH` by executing:

```
source /usr/local/bin/oraenv
```

Or, if you are using Oracle XE 11.2, by executing:

```
source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh
```

Make sure the Node.js process has directory and file access
permissions for the Oracle libraries and other files. Typically the
home directory of the Oracle software owner will need permissions
relaxed.

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

#### <a name="instrpm"></a> 3.2.3 Node-oracledb Installation on Linux x86_64 with Instant Client RPMs

Follow these steps if your database is on a remote machine and your
Linux distribution uses RPM packages.  Also see [Installing Node.js and
node-oracledb RPMs from yum.oracle.com](#instnoderpms).

Questions and issues can be posted as [GitHub Issues][10].

##### 3.2.3.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a compatible
glibc.  The pre-built binaries are known to be usable on Oracle Linux 6, 7, and
8.

##### 3.2.3.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 14.17.0 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v14.17.0-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v14.17.0-linux-x64/bin:$PATH
```

##### 3.2.3.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

The pre-built binaries were built on Oracle Linux 6.

If a pre-built node-oracledb binary is not installable or depends on an newer
glibc version, uninstall node-oracledb and build the binary from source code,
see [Node-oracledb Installation from Source Code](#github).

##### 3.2.3.4 Install the free Oracle Instant Client 'Basic' RPM

Download the latest version of the free **Basic** RPM from yum.oracle.com.

Instant Client is available for [Oracle Linux 7][71] and [Oracle Linux 8][72].
Older Oracle Instant Clients are also available in the [Oracle Linux 6][50],
[Oracle Linux 7][51] and [Oracle Linux 8][52] repositories.  The RPMs are also
available from [Oracle Technology Network][12].

[Install Instant Client Basic][13] with sudo or as the root user.  You can
install directly from yum.oracle.com, for example using:

```
sudo yum -y install oracle-release-el7
sudo yum-config-manager --enable ol7_oracle_instantclient
sudo yum -y install oracle-instantclient19.11-basic
```

Alternatively you can manually download the RPM and install from your local file
system:

```
sudo yum install oracle-instantclient19.11-basic-19.11.0.0.0-1.x86_64.rpm
```

The link [instantclient-basic-linuxx64.zip][61] will download the latest version
available from [OTN][12].

If you have a [ULN][14] subscription, another alternative is to use `yum` to
install the Basic package after enabling the ol7_x86_64_instantclient or
ol6_x86_64_instantclient repository, depending on your version of Linux.

Using any of these methods will install the required `libaio` package, if it is
not already present.  When using Instant Client 19 on recent Linux versions,
such as Oracle Linux 8, you may also need to manually install the `libnsl`
package.  This is not needed from Instant Client 21 onward.

For Instant Client 19 RPMs, the system library search path is automatically
configured during installation.  For older versions, if there is no other Oracle
software on the machine that will be impacted, then permanently add Instant
Client to the run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, for version 18 and earlier, every shell running Node.js
will need to have the link path set:

```
export LD_LIBRARY_PATH=/usr/lib/oracle/18.3/client64/lib
```

##### 3.2.3.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory, for example in `/opt/oracle/your_config_dir`.  Then use
[`oracledb.initOracleClient()`][64] in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});
```

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network/admin` subdirectory of
Instant Client, for example in
`/usr/lib/oracle/19.11/client64/lib/network/admin`.  This is the default Oracle
configuration directory for executables linked with this Instant Client.

##### 3.2.3.6 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.

#### <a name="aarch64"></a> 3.2.4 Node-oracledb Installation on Linux ARM (aarch64)

A pre-built node-oracledb binary is not available for Linux ARM (aarch64).  You
need to [compile node-oracledb from source code](#github).

Oracle Instant Client for Linux ARM (aarch64) can be downloaded from
[oracle.com][70].  A link to installation instructions is on that page.

The various node-oracledb installation sections for Linux x86_64 will give some
useful background.

#### <a name="instnoderpms"></a> 3.2.5 Installing Node.js and node-oracledb RPMs from yum.oracle.com

Node.js and node-oracledb Linux RPM packages are available on
[yum.oracle.com][46].  See [Node.js for Oracle Linux][46] for installation
details.

### <a name="instosx"></a> 3.3 Node-oracledb Installation on Apple macOS (Intel x86)

Questions and issues can be posted as [GitHub Issues][10].

#### 3.3.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built on macOS (Intel x86) Big Sur 11.6

Oracle Instant Client libraries are required on macOS.

There is no native Oracle Database for macOS but one can easily be run in a
Linux virtual machine using Vagrant.  See the [Oracle Database Vagrant
projects][21].

#### 3.3.2 Install Node.js

Download the [Node.js package][11] for macOS 64-bit and install it.

#### 3.3.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

#### 3.3.4 Install the free Oracle Instant Client 'Basic' package

Download the **Basic** 64-bit DMG from [Oracle Technology Network][22].

##### Manual Installation

In Finder, double click on the DMG to mount it.

Open a terminal window and run the install script in the mounted package, for example:

```
$ /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh
```

This copies the contents to `$HOME/Downloads/instantclient_19_8`.  Applications
may not have access to the `Downloads` directory, so you should move Instant
Client somewhere convenient.

In Finder, eject the mounted Instant Client package.

If you have multiple Instant Client DMG packages mounted, you only need to run
`install_ic.sh` once.  It will copy all mounted Instant Client DMG packages at
the same time.

##### Scripted Installation

Instant Client installation can alternatively be scripted, for example:

```
cd $HOME/Downloads
curl -O https://download.oracle.com/otn_software/mac/instantclient/198000/instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
hdiutil mount instantclient-basic-macos.x64-19.8.0.0.0dbru.dmg
/Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru/install_ic.sh
hdiutil unmount /Volumes/instantclient-basic-macos.x64-19.8.0.0.0dbru
```

The Instant Client directory will be `$HOME/Downloads/instantclient_19_8`.
Applications may not have access to the `Downloads` directory, so you should
move Instant Client somewhere convenient.

##### Configure Instant Client

There are several alternative ways to tell node-oracledb where your Oracle
Client libraries are, see [Initializing Node-oracledb][17]:

- Use [`oracledb.initOracleClient()`][64] in your application code:

    ```javascript
    const oracledb = require('oracledb');
    try {
      oracledb.initOracleClient({libDir: '/Users/your_username/Downloads/instantclient_19_8'});
    } catch (err) {
      console.error('Whoops!');
      console.error(err);
      process.exit(1);
    }
    ```

- Alternatively, create a symbolic link for the 'client shared library' in the
  `node_modules/oracledb/build/Release` directory where the `oracledb*.node`
  binary is.  For example:

    ```
    ln -s ~/Downloads/instantclient_19_8/libclntsh.dylib node_modules/oracledb/build/Release
    ```

    This can be added to your `package.json` files:

    ```
      "scripts": {
        "postinstall": "ln -s $HOME/Downloads/instantclient_19_8/libclntsh.dylib $(npm root)/oracledb/build/Release"
       },
    ```

    Instead of linking, you can also copy all the required OCI libraries, for example:

    ```
    cp ~/Downloads/instantclient_19_8/{libclntsh.dylib.19.1,libclntshcore.dylib.19.1,libnnz19.dylib,libociei.dylib} node_modules/oracledb/build/Release
    cd node_modules/oracledb/build/Release/ && ln -s libclntsh.dylib.19.1 libclntsh.dylib
    ```

- Alternatively, create a symbolic link for the 'client shared library' in
  `/usr/local/lib`.  Note this may not work on all versions of macOS.
  If the `lib` sub-directory does not exist, you can create it.  For example:

    ```
    mkdir /usr/local/lib
    ln -s ~/Downloads/instantclient_19_8/libclntsh.dylib /usr/local/lib
    ```

    Instead of linking, you can also copy all the required OCI libraries, for example:

    ```
    mkdir /usr/local/lib
    cp ~/Downloads/instantclient_19_8/{libclntsh.dylib.19.1,libclntshcore.dylib.19.1,libnnz19.dylib,libociei.dylib} /usr/local/lib/
    ```

#### 3.3.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory, for example in `/Users/your_username/your_config_dir`.
Then use [`oracledb.initOracleClient()`][64] in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: '/Users/your_username/your_config_dir'});
```

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network/admin` subdirectory of
Instant Client, for example in
`/Users/your_username/Downloads/instantclient_19_8/network/admin`.  This is the default
Oracle configuration directory for executables linked with this Instant Client.

#### 3.3.6 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Make sure Instant Client is configured as shown above.  For example you may want
to add calls to `oracledb.initOracleClient()` to the scripts.

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

### <a name="windowsinstallation"></a> 3.4 Node-oracledb Installation on Microsoft Windows

There are two ways to install node-oracledb on Microsoft Windows:

- [Using Instant Client ZIP files](#instwin)
- [Using a Local Database or Full Client](#instwinoh)

#### <a name="instwin"></a> 3.4.1 Node-oracledb Installation on Microsoft Windows with Instant Client ZIP files

Follow these steps if your database is on a remote machine, or if you
already have Oracle software installed but you want node-oracledb to
use a different version of the libraries.

Questions and issues can be posted as [GitHub Issues][10].

##### <a name="winprereqs"></a> 3.4.1.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built with Visual Studio 2017 and require
the matching [redistributable][27].

You may need Administrator privileges to set environment variables or
install software.

##### 3.4.1.2 Install Node.js

Install the 64-bit Node.js MSI (e.g. node-v14.17.0-x64.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm directories to
the path is selected.

##### 3.4.1.3 Install node-oracledb

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

##### 3.4.1.4 Install the free Oracle Instant Client ZIP

Download the free 64-bit Instant Client **Basic** ZIP file from [Oracle
Technology Network][25].  If your Node.js architecture is 32-bit, then use the
[32-bit Instant Client][26] instead.  Windows 7 users: Note that Oracle 19 is
not supported on Windows 7.

Unzip the ZIP file into a directory that is accessible to your application.  For
example unzip ` instantclient-basic-windows.x64-19.11.0.0.0dbru.zip` to
`C:\oracle\instantclient_19_11`.

There are several alternative ways to tell node-oracledb where your Oracle
Client libraries are, see [Initializing Node-oracledb][17]:

- Use [`oracledb.initOracleClient()`][64] in your application:

    ```javascript
    const oracledb = require('oracledb');
    try {
      oracledb.initOracleClient({libDir: 'C:\\oracle\\instantclient_19_11'});
    } catch (err) {
      console.error('Whoops!');
      console.error(err);
      process.exit(1);
    }
    ```

  If you use backslashes in the `libDir` string, you will need to double them.

- Alternatively, copy the Oracle Instant Client libraries to the
  `node_modules/oracledb/build/Release` directory where the `oracledb*.node`
  binary is.

- Alternatively, add the Oracle Instant Client directory to the `PATH`
  environment variable.  The directory must occur in `PATH` before any other
  Oracle directories.

  Restart any open command prompt windows.

  To avoid interfering with existing tools that require other Oracle
  Client versions then, instead of updating the system-wide `PATH`
  variable, you may prefer to write a batch file that sets `PATH`, for
  example:

  ```
  REM mynode.bat
  SET PATH=C:\oracle\instantclient_19_11;%PATH%
  node %*
  ```

  Invoke this batch file every time you want to run Node.js.

  Alternatively use `SET` to change your `PATH` in each command prompt
  window before you run node.

If disk space is important, most users will be able to use the smaller Basic
Light package instead of the Basic package.  Review its [globalization
limitations][62].  Disk space can be reduced by removing unnecessary libraries
and files from either the Basic or Basic Light packages.  The exact libraries
depend on the Instant Client version.  Refer to the Instant Client
documentation.

##### 3.4.1.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory.  For example if they are in `C:\oracle\your_config_dir`
then use [`oracledb.initOracleClient()`][64] in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: 'C:\\oracle\\your_config_dir'});
```

If you use backslashes in the `configDir` string, you will need to double them.

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network\admin` subdirectory of
Instant Client, for example in `C:\oracle\instantclient_19_11\network\admin`.
This is the default Oracle configuration directory for executables linked with
this Instant Client.

##### <a name="winredists"> </a> 3.4.1.6 Install the Visual Studio Redistributables

The `PATH` variable needs to include the appropriate VS Redistributable:
- Oracle client 19 requires the [Visual Studio 2017 Redistributable][27].
- Oracle client 18 and 12.2 require the [Visual Studio 2013 Redistributable][27].
- Oracle client 12.1 requires the [Visual Studio 2010 Redistributable][27].
- Oracle client 11.2 requires the [Visual Studio 2005 Redistributable][29].

You can also find out the version required by locating the library
`OCI.DLL` and running:

```
dumpbin /dependents oci.dll
```

If you see `MSVCR120.dll` then you need the VS 2013 Redistributable.
If you see `MSVCR100.dll` then you need the VS 2010 Redistributable.
If you see `MSVCR80.dll` then you need the VS 2005 Redistributable.

##### 3.4.1.7 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Make sure Instant Client is configured as shown above.  For example you may want
to add calls to `oracledb.initOracleClient()` to the scripts.

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

#### <a name="instwinoh"></a> 3.4.2 Node-oracledb Installation on Microsoft Windows with a Local Database or Full Client

Questions and issues can be posted as [GitHub Issues][10].

##### <a name="winprereqs"></a> 3.4.2.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built with Visual Studio 2017 and require
the matching [redistributable][27].

The Oracle software can be either a database home or a full Oracle
client installation.  Make sure that `PATH` contains the correct
binary directory, for example `C:\oracle\product\12.2.0\dbhome_1\bin`.

For easy development, the free [Oracle XE][20] version of the database
is available on Windows.  Applications developed with XE may be
immediately used with other editions of the Oracle Database.

You may need Administrator privileges to set environment variables or
install software.

##### 3.4.2.2 Install Node.js

Install the 64-bit Node.js MSI (e.g. node-v14.17.0-x64.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm
directories to the path is selected.

##### 3.4.2.3 Install node-oracledb

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

##### 3.4.2.4 The default Oracle Client configuration directory

Optional Oracle client configuration files such as [`tnsnames.ora`][15],
[`sqlnet.ora`][16], and [`oraaccess.xml`][18] can be placed in
`$ORACLE_HOME\network\admin`.

Alternatively, if you use Oracle client configuration files, they can be put in
another, accessible directory.  For example in `C:\oracle\your_config_dir`.
Then use `oracledb.initOracleClient({configDir:
'C:\\oracle\\your_config_dir'});` in your application or set the environment
variable `TNS_ADMIN` to that directory name.

##### 3.4.2.5 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

### <a name="instaix"></a> 3.5 Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="aixprereqs"></a> 3.5.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The GCC compiler is needed.

Use GNU Make 4.1-1 or above.

Python 2.7 is needed by node-gyp.

#### 3.5.2 Install Node.js

Download [Node.js][11] for AIX on Power Systems.  For
example, if you downloaded version 10.16.0 you could install Node.js
into `/opt`:

```
cd /opt
gunzip -c node-v10.16.0-aix-ppc64.tar.gz | tar -xvf -
```

Set `PATH` to include Node.js:

```

export PATH=/opt/node-v10.16.0-aix-ppc64/bin:$PATH
```

#### 3.5.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Set the compiler to GCC:

```
export CC=gcc
```

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v5.3.0`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v5.3.0
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz
```

#### 3.5.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][30]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
unzip instantclient-basic-aix.ppc64-19.11.0.0.0dbru.zip
mkdir -p /opt/oracle
mv instantclient_19_11 /opt/oracle
```

To run applications, you will need to set the link path:

```
export LIBPATH=/opt/oracle/instantclient_19_11:$LIBPATH
```

#### 3.5.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory, for example in `/opt/oracle/your_config_dir`. Then use the
following in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});
```

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network/admin` subdirectory of
Instant Client, for example in `/opt/oracle/instantclient_19_11/network/admin`.
This is the default Oracle configuration directory for executables linked with
this Instant Client.

#### 3.5.6 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

### <a name="instsolarisx8664"></a> 3.6 Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### 3.6.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

#### 3.6.2 Install Node.js

Download the [Node.js source code][11].

Compile and build the Node.js engine into a directory of your choice,
such as `/opt/node`:

```
./configure --dest-cpu=x64 --dest-os=solaris --prefix=/opt/node
make
make install
```

*Note:* if warnings are shown for `objdump` and `dtrace`, then set
`PATH` to include these binaries.  This is most likely `/usr/gnu/bin`
and `/usr/bin`, respectively.

Set `PATH` to include the Node.js and Node-gyp binaries

```
export PATH=/opt/node/bin:/opt/node/lib/node_modules/npm/bin/node-gyp-bin:$PATH
```

#### 3.6.3 Install node-oracledb

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

Use the GNU `gmake` utility:

```
export MAKE=gmake
```

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v5.3.0`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v5.3.0
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz
```

If this fails due to an invalid `cp -a` option, you can download the
node-oracledb source from GitHub.  Then use `node-gyp configure`.  Edit
`build/Makefile` and change the `cmd_copy` definition `cp` options from `cp -af`
to `cp -pPR`.  Finally, run `node-gyp build`.

#### 3.6.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][31]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
cd /opt/oracle
unzip instantclient-basic-solaris.x64-19.11.0.0.0dbru.zip
```

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_19_11:$LD_LIBRARY_PATH_64
```

#### 3.6.5 Optionally create the Oracle Client configuration file directory

If you use optional Oracle configuration files such as `tnsnames.ora`,
`sqlnet.ora` or `oraaccess.xml` with Instant Client, then put the files in an
accessible directory, for example in `/opt/oracle/your_config_dir`. Then use the
following in your application:

```javascript
const oracledb = require('oracledb');
oracledb.initOracleClient({configDir: '/opt/oracle/your_config_dir'});
```

Or you can set the environment variable `TNS_ADMIN` to that directory name.

Another alternative is to put the files in the `network/admin` subdirectory of
Instant Client, for example in `/opt/oracle/instantclient_19_11/network/admin`.
This is the default Oracle configuration directory for executables linked with
this Instant Client.

#### 3.6.6 Run an example program

Download the [examples][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples, such as [`example.js`][63]:

```
node example.js
```

### <a name="github"></a> <a name="compileenv"></a> 3.7 Node-oracledb Installation from Source Code

Some build tools are required to compile node-oracledb.

Recent Node.js tools should work with Python 3 but you may need to install
[Python 2.7][2] for the node-gyp utility.

- If another version of Python occurs first in your binary path then
  run `npm config set python /wherever/python-2.7/bin/python` or use
  the `--python` option to indicate the correct version.  For example:
  `npm install --python=/whereever/python-2.7/bin/python oracledb`.

- On Windows, install the Python 2.7 MSI and select the customization
  option to "Add python.exe to Path".

Install a C compiler:

- On Linux, GCC 4.8.5 (the default on Oracle Linux 7) is known to work.

- On macOS (Intel x86) install Xcode from the Mac App store.

- On Windows, install a C build environment such as Microsoft
  Visual Studio 2017.  Compilers supported by Oracle libraries are
  found in [Oracle documentation][23] for each version, for example
  [Oracle Database Client Installation Guide for
  Microsoft Windows][24].  Some users report that the npm
  `windows-build-tools` package has the necessary tools to build
  node-oracledb from source code.

The directories with the `python` and `npm` executables should be in your
PATH environment variable.  On Windows you can use vcvars64.bat (or
vcvars.bat if you building with 32-bit binaries) to set the
environment.  Alternatively you can open the 'Developer Command Prompt
for Visual Studio' which has environment variables already configured.

#### <a name="githubclone"></a> 3.7.1 Installing GitHub clones and ZIP files

If you clone the node-oracledb repository, or download a zip from [GitHub][1] to
build node-oracledb from source code, then you need to make sure the [ODPI-C
submodule][9] is also included.  Otherwise the build will fail with an error
like **'dpi.h' file not found**.

- If you download a node-oracledb ZIP file from GitHub, then separately
  download the ODPI-C submodule code and extract it into a `odpi` subdirectory.

- When cloning the node-oracledb repository, include ODPI-C by doing:

  ```
  git clone --recursive https://github.com/oracle/node-oracledb.git
  ```

With the node-oracledb source code in `your_dir_path/node-oracledb` use a
`package.json` dependency like:

```
"dependencies": {
   "oracledb": "file:/your_dir_path/node-oracledb"
},
```

Alternatively change to your application directory and run:

```
npm install your_dir_path/node-oracledb
```

#### <a name="githubtags"></a> 3.7.2 Installing using GitHub branches and tags

Node-oracledb can be installed directly from GitHub tags and branches.  The
`git` source code utility is required for this method.

To install the current development code from the GitHub main branch, use a
`package.json` dependency like:

```
"dependencies": {
   "oracledb": "oracle/node-oracledb#main"
},
```

Alternatively, use the command:

```
npm install oracle/node-oracledb#main
```

To install from a tag, replace `main` with the tag name like:
`oracle/node-oracledb#v5.3.0`.

#### <a name="sourcepackage"></a> 3.7.3 Installing from a source package

Users without `git` can compile pre-bundled source code using a `package.json`
dependency like:

```
"dependencies": {
   "oracledb": "https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz"
},
```

Or install with:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz
```

#### <a name="nogithubaccess"></a> 3.7.4 Installing from Oracle's repository

Oracle has a mirror of the GitHub repository source code that can be cloned
with:

```
git clone --recursive git://opensource.oracle.com/git/oracle/node-oracledb.git/
```

With the node-oracledb source code in `your_dir_path/node-oracledb` use a
`package.json` dependency like:

```
"dependencies": {
   "oracledb": "file:/your_dir_path/node-oracledb"
},
```

Alternatively change to your application directory and run:

```
npm install your_dir_path/node-oracledb
```

#### <a name="compilepackage"></a> 3.7.5 Creating a node-oracledb package from source code

You can create a package containing the binary module and required JavaScript
files.  This is equivalent to the package that is normally installed from the
[npm registry][4].  Your new package can be [self-hosted](#selfhost) for use
within your company, or it can be used directly from the file system to install
node-oracledb.

- Download
[`oracledb-src-5.3.0.tgz`](https://github.com/oracle/node-oracledb/releases/download/v5.3.0/oracledb-src-5.3.0.tgz)
from GitHub.

- Extract the file: `tar -xzf oracledb-src-5.3.0.tgz`

- Change directory: `cd package`

- Run: `npm run buildbinary`

  Ignore errors about `git`, which is used to record some basic metadata when
  this command is run in a git clone.

- Optionally run the above commands on other architectures and copy the
  resulting `package/Staging/*` files to your local `package/Staging` directory.
  This will allow the final node-oracledb package to be installed on multiple
  architectures.

- Run: `npm run buildpackage`
  The package `oracledb-5.3.0.tgz` is created.

This package can be shared or self-hosted, see [Hosting your own node-oracledb
Packages](#selfhost).

### <a name="offline"></a> <a name="intermediateinstall"></a> 3.8 Node-oracledb Installation Without Internet Access

On a machine with access, download the node-oracledb package from [npm][4], for
example from
[`https://registry.npmjs.com/oracledb/-/oracledb-5.3.0.tgz`](https://registry.npmjs.com/oracledb/-/oracledb-5.3.0.tgz)

This can be transferred to the desired machine and installed, for example with:

```
npm install your_dir_path/oracledb-5.3.0.tgz
```

If you are using an architecture that does not have pre-supplied binaries then
you can build your own package, see [Creating a node-oracledb package from
source code](#compilepackage).

Consider self-hosting the node-oracledb package inside your network, see
[Hosting your own node-oracledb Packages](#selfhost).

Alternatively, on an identical machine that has access to the internet, install
node-oracle following the [Node-oracledb Installation
Instructions](#instructions) for that operating system.  Then copy
`node_modules/oracledb` and Oracle Client libraries to the offline computer.
Windows users should see the next section and make sure the correct Visual
Studio Redistributable is also installed.

#### <a name="winbins"></a> 3.8.1 Copying node-oracledb Binaries on Windows

Node-oracledb binaries can be copied between compatible Windows systems.

After node-oracledb has been built or installed on the source
computer, copy the `node_modules\oracledb` directory to the
destination computer's `node_module` directory.

Both computers must have the same version and architecture (32-bit or
64-bit) of Node.js.

Oracle client libraries of the same architecture as Node.js should be
in the destination computer's `PATH`.  They may alternatively be in
the directory `node_modules\oracledb\build\Release` where the
`oracledb.node` binary is located.  Note the Oracle client library
versions do not have to be the same on different computers, but
node-oracledb behavior and features may then differ.

The destination computer's `PATH` needs to include Visual Studio
Redistributables.  If you have Oracle client 19 install the Visual
Studio 2017 Redistributable.  If you have Oracle client 18 or 12.2,
install the Visual Studio 2013 Redistributable.  For Oracle client
12.1 install the Visual Studio 2010 Redistributable.  For Oracle
client 11.2 install the Visual Studio 2005 Redistributable.

You can also find out the Redistributable required by locating the
library `OCI.DLL` on the source computer and running:

```
dumpbin /dependents oci.dll
```

If you see `MSVCR120.dll` then you need the VS 2013 Redistributable.
If you see `MSVCR100.dll` then you need the VS 2010 Redistributable.
If you see `MSVCR80.dll` then you need the VS 2005 Redistributable.

### <a name="selfhost"></a> 3.9 Hosting your own node-oracledb Packages

You can host node-oracledb packages locally.

Download the node-oracledb package from npm, for example from
[`https://registry.npmjs.com/oracledb/-/oracledb-5.3.0.tgz`](https://registry.npmjs.com/oracledb/-/oracledb-5.3.0.tgz)
Alternatively, if you want to build your own binaries and node-oracledb package,
see [Creating a node-oracledb package from source code](#compilepackage).

If you make the package accessible on your local web server, for example at
www.example.com/oracledb-5.3.0.tgz, then your `package.json` would contain:

```
. . .
   "dependencies": {
      "oracledb": "https://www.example.com/oracledb-5.3.0.tgz"
   },
. . .
```

Or you would install with:

```
npm install https://www.example.com/oracledb-5.3.0.tgz
```

### <a name="docker"></a> 3.10 Using node-oracledb in Docker

[Docker][59] allows applications to be containerized.  Each application will
have a `Dockerfile` with steps to create a Docker image.  Once created, the
image can be shared and run.

Sample Dockerfiles for Oracle Linux are available on [GitHub][65].  Some
container images are in [Oracle's GitHub Container Registry][67].

#### Installing Node.js in Docker

If your `Dockerfile` uses Oracle Linux:

```
FROM oraclelinux:7-slim
```

Then you can install Node.js from [yum.oracle.com][46] using:

```
RUN  yum -y install oracle-nodejs-release-el7 && \
     yum -y install nodejs && \
     rm -rf /var/cache/yum
```

One alternative to Oracle Linux is to use a [Node.js image from Docker Hub][56],
for example using:

```
FROM node:12-buster-slim
```

Note: you should review Oracle's supported distributions before choosing an
operating system.

#### Installing Instant Client in Docker

Review the available Instant Client packages for [Oracle Linux 7][71] and
[Oracle Linux 8][72].  Older Oracle Instant Clients are also available in the
[Oracle Linux 7][51] and [Oracle Linux 8][52] repositories.  The RPMs and ZIP
files are also available from [Oracle Technology Network][12].

There are various ways to install Instant Client.  Three methods are shown
below.

1. Using Oracle Linux Instant Client RPMs

   If you have an Oracle Linux image:

   ```
   FROM oraclelinux:7-slim
   ```

   Then you can install Instant Client RPMs:

   ```
   RUN yum -y install oracle-instantclient-release-el7 && \
       yum -y install oracle-instantclient-basic && \
       rm -rf /var/cache/yum
   ```

2. Automatically downloading an Instant Client ZIP file

   You can automatically download an Instant Client ZIP file during image
   creation.  This is most useful on Debian-based operating systems.  (Note: you
   should review Oracle's supported distributions before choosing an operating
   system).

   The `libaio` (or `libaio1`), `wget` and `unzip` packages will need to be
   added manually.

   On Oracle Linux:

   ```
   RUN yum install -y libaio wget unzip
   ```

   On a Debian-based Linux:
   ```
   RUN apt-get update && apt-get install -y libaio1 wget unzip
   ```

   Then, to use the latest available Instant Client:

   ```
   RUN wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
       unzip instantclient-basiclite-linuxx64.zip && rm -f instantclient-basiclite-linuxx64.zip && \
       cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci && \
       echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig
   ```

   When using Instant Client 19 on recent Linux versions, such as Oracle Linux
   8, you may also need to install the `libnsl` package.  This is not needed
   from Instant Client 21 onward.

3. Copying Instant Client zip files from the host

   To avoid the cost of repeated network traffic, you may prefer to download
   the Instant Client Basic Light zip file to your Docker host, extract it, and
   remove unnecessary files.  The resulting directory can be added during
   subsequent image creation.  For example, with Instant Client Basic Light
   21.1, the host computer (where you run Docker) could have a directory
   `instantclient_21_1` with these files:

   ```
   libclntshcore.so.21.1
   libclntsh.so.21.1
   libnnz21.so
   libociicus.so
   ```

   With this, your Dockerfile could contain:

   ```
   ADD instantclient_21_1/* /opt/oracle/instantclient_21_1
   RUN echo /opt/oracle/instantclient_21_1 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
       ldconfig
   ```

   The `libaio` or `libaio1` package will be needed.

   On Oracle Linux:

   ```
   RUN yum install -y libaio
   ```

   On a Debian-based Linux:
   ```
   RUN apt-get update && apt-get install -y libaio1
   ```

   When using Instant Client 19 on recent Linux versions, such as Oracle Linux
   8, you may also need to install the `libnsl` package.  This is not needed
   from Instant Client 21 onward.

#### Installing node-oracledb and your application

Include node-oracledb as a normal dependency in your application `package.json` file:

```
  . . .
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "oracledb" : "^5"
  },
  . . .
```

The `packge.json` and application file can be added to the image, and
dependencies installed when the image is built:

```
WORKDIR /myapp
ADD package.json server.js /myapp/
RUN npm install

CMD exec node server.js
```

#### Using Oracle Net configuration files and Oracle Wallets

[Optional Oracle Net Configuration][58] files (like `tnsnames.ora` and
`sqlnet.net`) and files that need to be secured such as [Oracle wallets][57] can
be mounted at runtime using a Docker volume.  Map the volume to the
`network/admin` subdirectory of Instant Client so the `TNS_ADMIN` environment
variable does not need to be set.  For example, when the Wallet or configuration
files are in `/OracleCloud/wallet/` on the host computer, and the image uses
Instant Client 19.11 RPMs, then you can mount the files using:

```
docker run -v /OracleCloud/wallet:/usr/lib/oracle/19.11/client64/lib/network/admin:Z,ro . . .
```

The `Z` option is needed when SELinux is enabled.

#### <a name="dockerexample"></a> Example Application in Docker

This example consists of a `Dockerfile`, a `package.json` file with the
application dependencies, a `server.js` file that is the application, and an
`envfile.list` containing the database credentials as environment variables.

If you use Oracle Linux, your `Dockerfile` will be like:

```
FROM oraclelinux:7-slim

RUN yum -y install oracle-instantclient-release-el7 && \
    yum -y install oracle-instantclient-basiclite && \
    rm -rf /var/cache/yum

WORKDIR /myapp
ADD package.json server.js /myapp/
RUN npm install

CMD exec node server.js
```

An equivalent Dockerfile that uses a Node.js image is:

```
FROM node:12-buster-slim

RUN apt-get update && apt-get install -y libaio1 wget unzip

WORKDIR /opt/oracle

RUN wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
    unzip instantclient-basiclite-linuxx64.zip && rm -f instantclient-basiclite-linuxx64.zip && \
    cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *mql1* *ipc1* *jar uidrvci genezi adrci && \
    echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

WORKDIR /myapp
ADD package.json server.js /myapp/
RUN npm install

CMD exec node server.js
```

Note: you should review Oracle's supported distributions before choosing an
operating system.

For either Dockerfile, the `package.json` is:

```
{
  "name": "test",
  "version": "1.0.0",
  "private": true,
  "description": "Docker Node.js application",
  "scripts": {
    "start": "node server.js"
  },
  "keywords": [
    "myapp"
  ],
  "dependencies": {
    "oracledb" : "^5"
  },
  "author": "Me",
  "license": "UPL"
}
```

The application `server.js` contains code like:

```javascript
. . .
connection = await oracledb.getConnection({
  user: process.env.NODE_ORACLEDB_USER,
  password: process.env.NODE_ORACLEDB_PASSWORD,
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING
});
const result = await connection.execute(
  `SELECT TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') AS D FROM DUAL`,
  [],
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);
console.log(result);
. . .
```

The environment variables in `envfile.list` are used at runtime.  The file
contains:

```
NODE_ORACLEDB_USER=hr
NODE_ORACLEDB_PASSWORD=<hr password>
NODE_ORACLEDB_CONNECTIONSTRING=server.example.com/orclpdb1
```

The image can be built:

```
docker build -t nodedoc .

```

Alternatively, if you are behind a firewall, you can pass proxies when building:

```
docker build --build-arg https_proxy=http://myproxy.example.com:80 --build-arg http_proxy=http://www-myproxy.example.com:80 -t nodedoc .
```

Finaly, a container can be run from the image:

```
docker run -ti --name nodedoc --env-file envfile.list nodedoc
```

The output is like:

```
{ metaData: [ { name: 'D' } ],
  rows: [ { D: '24-Nov-2019 23:39' } ] }
```

## <a name="installingoldvers"></a> <a name="installingv2"></a> <a name="installingv1"></a> 4. Installing Older Versions of Node-oracledb

Pre-built node-oracledb 3 and 4 binaries are available for some platforms and
Node.js versions.  Review the [release tags][41] for availability. You can
compile the add-on for other platforms or versions.

The node-oracledb 4.2 installation steps are in the [version 4.2 INSTALL
guide][66].

The node-oracledb 3.1 installation steps are in the [version 3.1 INSTALL
guide][55].

To get an old add-on you must explicitly use its version when installing, for
example:

```
npm install oracledb@4.2.0
```

or your `package.json` could contain:

```
. . .
   "dependencies": {
      "oracledb": "4.2.0"
   },
. . .
```

## <a name="troubleshooting"></a> 5. Troubleshooting Node-oracledb Installation Problems

*Read the [Node-oracledb Installation Instructions](#instructions)*.

**Google anything that looks like an error.**

If `npm install oracledb` fails:

- Review the error messages closely. If a pre-built node-oracledb
  binary package is not available for your Node.js version or
  operating system, then change your Node.js version or [compile
  node-oracledb from source code](#github).

- Was there a network connection error?  Do you need to use `npm config set
  proxy`, or set `http_proxy` and/or `https_proxy`?

- Use `npm install --verbose oracledb`.  Review your output and logs.
  Try to install in a different way.  Try some potential solutions.

- When compiling node-oracledb from source, do you have Python 2.7?
  Run `python --version`.

- When compiling node-oracledb from source, do you have an old version
  of `node-gyp` installed?  Try updating it.  Also try deleting
  `$HOME/.node-gyp` or equivalent.

- Try running `npm cache clean -f` and deleting the
  `node_modules/oracledb` directory.

If creating a connection fails:

- If you got *DPI-1047: Cannot locate an Oracle Client library*, then review any
  messages, the installation instructions, and see [Initializing
  Node-oracledb][17].

- If you got *DPI-1072: the Oracle Client library version is unsupported*, then
  review the installation requirements.  Node-oracledb needs Oracle client
  libraries 11.2 or later.  Note that version 19 is not supported on Windows 7.

- Does your Node.js architecture (32-bit or 64-bit) match the Oracle
  client library architecture?  Run `node -p 'process.arch'` and
  compare with, for example, `dumpbin /headers oci.dll` (on Windows),
  `file libclntsh.dylib` (macOS) or `file libclntsh.so.*` (Linux).

- On Windows, do you have the correct VS Redistributable?  Review
  the [Windows install instructions](#winredists).

- On Windows, check the `PATH` environment variable includes the
  Oracle client libraries.  Ensure that you have restarted your
  command prompt after you modified any environment variables.

- Do you need system privileges to set, or preserve, variables like
  `PATH`, e.g. an elevated command prompt on Windows, or `sudo -E` on
  Linux?

- Do you have multiple copies of Oracle libraries installed?  Is the
  expected version first in `PATH` (on Windows) or `LD_LIBRARY_PATH`
  (on Linux)?

Issues and questions about node-oracledb can be posted on [GitHub][10] or
[Slack][48] ([link to join Slack][49]).


[1]: https://github.com/oracle/node-oracledb/
[2]: https://www.python.org/downloads/
[3]: https://www.oracle.com/database/technologies/instant-client.html
[4]: https://www.npmjs.com/package/oracledb
[6]: https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1
[7]: https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings
[8]: https://oca.opensource.oracle.com
[9]: https://www.github.com/oracle/odpi
[10]: https://github.com/oracle/node-oracledb/issues
[11]: https://nodejs.org
[12]: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
[13]: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html#ic_x64_inst
[14]: https://linux.oracle.com
[15]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA
[16]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642
[17]: https://oracle.github.io/node-oracledb/doc/api.html#initnodeoracledb
[18]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2
[19]: https://github.com/oracle/node-oracledb/tree/main/examples
[20]: https://www.oracle.com/database/technologies/appdev/xe.html
[21]: https://github.com/oracle/vagrant-projects/tree/main/OracleDatabase
[22]: https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html
[23]: https://docs.oracle.com/database/
[24]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NTCLI
[25]: https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
[26]: https://www.oracle.com/database/technologies/instant-client/microsoft-windows-32-downloads.html
[27]: https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads
[29]: https://www.microsoft.com/en-us/download/details.aspx?id=3387
[30]: https://www.oracle.com/database/technologies/instant-client/aix-ppc64-downloads.html
[31]: https://www.oracle.com/database/technologies/instant-client/solx8664-downloads.html
[40]: https://github.com/oracle/node-oracledb/tags
[41]: https://github.com/oracle/node-oracledb/releases
[44]: https://oracle.github.io/node-oracledb/doc/api.html
[45]: https://www.youtube.com/watch?v=WDJacg0NuLo
[46]: https://yum.oracle.com/oracle-linux-nodejs.html
[48]: https://node-oracledb.slack.com/
[49]: https://join.slack.com/t/node-oracledb/shared_invite/enQtNDU4Mjc2NzM5OTA2LWMzY2ZlZDY5MDdlMGZiMGRkY2IzYjI5OGU4YTEzZWM5YjQ3ODUzMjcxNWQyNzE4MzM5YjNkYjVmNDk5OWU5NDM
[50]: https://yum.oracle.com/repo/OracleLinux/OL6/oracle/instantclient/x86_64/index.html
[51]: https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html
[52]: https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient/x86_64/index.html
[53]: https://nodejs.org/api/n-api.html
[55]: https://github.com/oracle/node-oracledb/blob/v3.1.2/INSTALL.md
[56]: https://hub.docker.com/_/node/
[57]: https://oracle.github.io/node-oracledb/doc/api.html#connectionadb
[58]: https://oracle.github.io/node-oracledb/doc/api.html#tnsadmin
[59]: https://www.docker.com/
[60]: https://oracle.github.io/node-oracledb/doc/api.html#architecture
[61]: https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linuxx64.zip
[62]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E6566C23-54C9-490C-ADD1-EEB6240512EB
[63]: https://github.com/oracle/node-oracledb/tree/main/examples/example.js
[64]: https://oracle.github.io/node-oracledb/doc/api.html#odbinitoracleclient
[65]: https://github.com/oracle/docker-images/tree/main/OracleLinuxDevelopers
[66]: https://github.com/oracle/node-oracledb/blob/v4.2.0/INSTALL.md
[67]: https://github.com/orgs/oracle/packages
[68]: https://www.oracle.com/database/technologies/appdev/quickstartnodeonprem.html
[69]: https://www.oracle.com/database/technologies/appdev/quickstartnodejs.html
[70]: https://www.oracle.com/database/technologies/instant-client/linux-arm-aarch64-downloads.html
[71]: https://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient21/x86_64/index.html
[72]: https://yum.oracle.com/repo/OracleLinux/OL8/oracle/instantclient21/x86_64/index.html
