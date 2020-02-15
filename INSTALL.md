# Installing node-oracledb Version 5.0-dev

*Copyright (c) 2015, 2020, Oracle and/or its affiliates. All rights reserved.*

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
    =- 3.2 [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
    - 3.3 [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
    - 3.4 [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
    - 3.5 [Node-oracledb Installation on macOS](#instosx)
    - 3.6 [Node-oracledb Installation on Windows with Instant Client ZIP files](#instwin)
    - 3.7 [Node-oracledb Installation on Windows with a Local Database or Full Client](#instwinoh)
    - 3.8 [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
    - 3.9 [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
    - 3.10 [Node-oracledb Installation from Source Code](#github)
        - 3.10.1 [Installing using GitHub branches and tags](#githubtags)
        - 3.10.2 [Installing GitHub clones and zip files](#githubclone)
        - 3.10.3 [Compiling node-oracledb without GitHub Access](#nogithubaccess)
    - 3.11 [Node-oracledb Installation Without Internet Access](#offline)
        - 3.11.1 [Copying node-oracledb Binaries on Windows](#winbins)
    - 3.12 [Installing Node.js and Node-oracledb RPMs from yum.oracle.com](#instnoderpms)
    - 3.13 [Building and Hosting your own node-oracledb Packages](#selfhost)
    - 3.14 [Using node-oracledb in Docker](#docker)
4. [Installing Older Versions of Node-oracledb](#installingoldvers)
    - 4.1 [Installing node-oracledb 2.x and 3.x](#installingv2)
    - 4.2 [Installing node-oracledb 1.x](#installingv1)
5. [Troubleshooting Node-oracledb Installation Problems](#troubleshooting)

## <a name="overview"></a> 1. Node-oracledb Overview

The [*node-oracledb*][1] add-on for Node.js powers high performance Oracle Database applications.

The steps below create a Node.js installation for testing.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node.js 10 and 12 on 64-bit
Oracle Linux, Windows and macOS.  Note Node.js 10.16, or later is required.  The
add-on can also build on some 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.  Older
versions of node-oracledb may work with older versions of Node.js.

Node-oracledb is an [add-on](https://nodejs.org/api/addons.html)
available as C source code.  Pre-built binaries are available
as a convenience for common architectures.  Note the operating systems
and versions of Node.js that the pre-built binaries are compatible
with will change as the Node.js project evolves.  The binaries are not
guaranteed to be available or usable in your environment.

## <a name="quickstart"></a> 2. Quick Start node-oracledb Installation

- Install Node.js from [nodejs.org][11].

- Install node-oracledb using the `npm` package manager, which is included in
  Node.js.  If you are behind a firewall, you may need to set the proxy with
  `npm config set proxy http://myproxy.example.com:80/`.

    - Many users will be able to use a pre-built node-oracledb binary:

        - Add `oracledb` to your `package.json` dependencies or run `npm install
          oracledb`.  This installs from the [npm registry][4].

          Windows users will require the [Visual Studio 2017
          Redistributable][27].

    - If a binary is not available, you will need to compile node-oracledb
      from source code:

        - Install [Python 2.7][2]

        - Install a C Compiler such as Xcode, GCC, Visual Studio
          2017, or similar.

        - Run `npm install oracle/node-oracledb.git#v5.0.0-dev`, or add
          `oracle/node-oracledb.git#v5.0.0-dev` to your `package.json`
          dependencies.  Substitute your desired [GitHub tag][40].

- Add Oracle 19, 18, 12, or 11.2 client libraries to your operating
  system library search path such as `PATH` on Windows or
  `LD_LIBRARY_PATH` on Linux.  On macOS move the libraries to `~/lib`
  or `/usr/local/lib`.

    - If your database is remote, then get the libraries by
      downloading and unzipping the free [Oracle Instant Client][3]
      "Basic" or "Basic Light" package for your operating system
      architecture.

      Instant Client on Windows requires an appropriate [Visual Studio
      Redistributable](#winredists).  On Linux, the `libaio`
      (sometimes called `libaio1`) package is needed.

    - Alternatively use the Oracle Client libraries already available
      in `$ORACLE_HOME/lib` from a locally installed database such as
      the free [Oracle XE][20] release.

  Oracle Client libraries 19, 18 and 12.2 can connect to Oracle
  Database 11.2 or greater. Version 12.1 client libraries can connect
  to Oracle Database 10.2 or greater. Version 11.2 client libraries
  can connect to Oracle Database 9.2 or greater.

- Your Node.js applications can now connect to your database.  The
  database can be on the same machine as Node.js, or on a remote
  machine.  Node-oracledb does not install or create a database.

  You will need to know [database credentials][45] and the [connection
  string][7] for the database.

After installation, learn how to use node-oracledb from the
[examples][19] and the [documentation][44].

See [Troubleshooting Node-oracledb Installation
Problems](#troubleshooting) if you have installation issues.

## <a name="instructions"></a> 3. Node-oracledb Installation Instructions

Instructions may need to be adjusted for your platform, environment and versions being used.

I have ... | Follow this ...
----------|-----------------
Windows.  My database is on another machine | [Node-oracledb Installation on Windows with Instant Client ZIP files](#instwin)
Windows.  My database is on the same machine as Node.js | [Node-oracledb Installation on Windows with a Local Database or Full Client](#instwinoh)
Apple macOS | [Node-oracledb Installation on macOS](#instosx)
Linux that uses RPM packages.  My database is on another machine | [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
Linux that uses Debian packages.   My database is on another machine | [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
Linux.  My database is on the same machine as Node.js | [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
Linux. I have the full Oracle client (installed via `runInstaller`) on the same machine as Node.js | [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
Linux.  I want to install Node.js and node-oracledb RPM packages | [Installing Node.js and Node-oracledb RPMs from yum.oracle.com](#instnoderpms)
AIX on Power Systems | [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
Solaris x86-64 (64-Bit) | [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
Another OS with Oracle Database 19, 18, 12, or  11.2 client libraries available | Update binding.gyp and make any code changes required, sign the [OCA][8], and submit a pull request with your patch.
Source code from GitHub | [Node-oracledb Installation from Source Code](#github)
I don't have internet access | [Node-oracledb Installation Without Internet Access](#offline)

### <a name="prerequisites"></a> 3.1 Prerequisites

All installations need:

- Oracle 19, 18, 12 or 11.2 client libraries on the machine Node.js is installed on.

  Run `node -p "process.arch"` and make sure to use 64-bit or 32-bit
  Oracle client libraries to match the Node.js architecture.

  Oracle client libraries are included in [Oracle Instant Client][3]
  RPMs or ZIPs, a full Oracle Client, or a database on the same
  machine.  You only need one of these installations.

  Oracle's standard client-server network interoperability allows
  connections between different versions of Oracle Client and Oracle
  Database.  For certified configurations see Oracle Support's [Doc ID
  207303.1][6].  In summary, Oracle Client 19, 18 and 12.2 can connect
  to Oracle Database 11.2 or greater. Oracle Client 12.1 can connect
  to Oracle Database 10.2 or greater. Oracle Client 11.2 can connect
  to Oracle Database 9.2 or greater.  The technical restrictions on
  creating connections may be more flexible.  For example Oracle
  Client 12.2 can successfully connect to Oracle Database 10.2.

- An Oracle Database to test node-oracledb.

  After installation of node-oracledb, your Node.js applications will
  be able to connect to your database.  The database can be on the
  same machine as Node.js, or on a remote machine.  Node-oracledb does
  not install or create a database.

  You will need to know [database credentials][45] and the [connection
  string][7] for the database.

If pre-built binaries are not available or desired, you need these
additional tools to build from source code:

- A compiler.

  Use Visual Studio on Windows, GCC on Linux or Xcode on macOS.

- Python 2.7.

  [Python 2.7][2] is needed by node-gyp, which is invoked by npm.  Run
  `python --version` to find the version you have.

  If another version of Python occurs first in your binary path then,
  when you install node-oracledb, then run `npm config set python
  /wherever/python-2.7/bin/python` or use the `--python` option to
  indicate the correct version.  For example: `npm install
  --python=/wherever/python-2.7/bin/python oracledb`.

### <a name="instrpm"></a> 3.2 Node-oracledb Installation on Linux with Instant Client RPMs

Follow these steps if your database is on a remote machine and your
Linux distribution uses RPM packages.  Also see [Installing Node.js and
Node-oracledb RPMs from yum.oracle.com](#instnoderpms).

Questions and issues can be posted as [GitHub Issues][10].

#### 3.2.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc.

#### 3.2.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 12.14.1 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v12.14.1-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v12.14.1-linux-x64/bin:$PATH
```

#### 3.2.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

The pre-built binaries were built on Oracle Linux 6.

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.2.4 Install the free Oracle Instant Client 'Basic' RPM

Download the free **Basic** RPM from yum.oracle.com.  There are
channels for [Oracle Linux 6][50] and [Oracle Linux 7][51].  The
package contents are identical in both channels.  Alternatively,
multiple versions of Instant Client RPMs are available from [Oracle
Technology Network][12].

[Install Instant Client Basic][13] with sudo or as the root user,
either directly from yum.oracle.com:

```
sudo yum -y install oracle-release-el7
sudo yum -y install oracle-instantclient19.5-basic
```

Or from a downloaded file:

```
sudo yum install oracle-instantclient19.5-basic-19.5.0.0.0-1.x86_64.rpm
```

This will install the required `libaio` package, if it is not already
present.

If you have a [ULN][14] subscription, you can alternatively use `yum`
to install the Basic package after enabling the
ol7_x86_64_instantclient or ol6_x86_64_instantclient channel,
depending on your version of Linux.

For Instant Client 19, the system library search path is automatically
configured during installation.

For older versions, if there is no other Oracle software on the
machine that will be impacted, then permanently add Instant Client to
the run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, for version 18 and earlier, every shell running Node.js
will need to have the link path set:

```
export LD_LIBRARY_PATH=/usr/lib/oracle/18.3/client64/lib
```

#### 3.2.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory under `lib/`.  With Instant Client 12.2
or earlier, create this:

```
sudo mkdir -p /usr/lib/oracle/12.2/client64/lib/network/admin
```

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.2.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.


### <a name="instzip"></a> 3.3 Node-oracledb Installation on Linux with Instant Client ZIP files

Follow these steps if your database is on a remote machine and your
Linux distribution uses the Debian package format, for example if you
are using Ubuntu.  These steps can also be used if you prefer not to
install RPMs.

Questions and issues can be posted as [GitHub Issues][10].

#### 3.3.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc.

#### 3.3.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 12.14.1 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v12.14.1-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v12.14.1-linux-x64/bin:$PATH
```

#### 3.3.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

The pre-built binaries were built on Oracle Linux 6.

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.3.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the free **Basic** ZIP file from [Oracle Technology Network][12]
and [unzip it][13] into a directory accessible to your application,
for example:

```
unzip instantclient-basic-linux.x64-19.5.0.0.0dbru.zip
mkdir -p /opt/oracle
mv instantclient_19_5 /opt/oracle
```

You will need the operating system `libaio` package installed.  On
some platforms the package is called `libaio1`.

If there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /opt/oracle/instantclient_19_5 > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_5:$LD_LIBRARY_PATH
```

#### 3.3.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  With Instant Client 12.2 or earlier,
create this:

```
sudo mkdir -p /opt/oracle/instantclient_12_2/network/admin
```

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.3.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.

### <a name="instoh"></a> 3.4 Node-oracledb installation on Linux with a Local Database or Full Client

Questions and issues can be posted as [GitHub Issues][10].

#### 3.4.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The `ORACLE_HOME` can be either a database home or a full Oracle
client installation installed with Oracle's `runInstaller`.

For easy development, the free [Oracle XE][20] version of the database
is available on Linux.  Applications developed with XE may be
immediately used with other editions of the Oracle Database.

#### 3.4.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 12.14.1 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -zxf node-v12.14.1-linux-x64.tar.gz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v12.14.1-linux-x64/bin:$PATH
```

#### 3.4.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.4.4 The default Oracle Client configuration directory

Optional Oracle client configuration files such as [`tnsnames.ora`][15],
[`sqlnet.ora`][16], [`ldap.ora`][17], or [`oraaccess.xml`][18] can be
placed in `$ORACLE_HOME/network/admin`.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.4.5 Run an example program

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

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instosx"></a> 3.5 Node-oracledb Installation on macOS

Questions and issues can be posted as [GitHub Issues][10].

#### 3.5.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built on macOS Mojave, 10.14.5.

Oracle Instant Client libraries are required on macOS.  There is no
native Oracle Database for macOS but one can easily be run in a Linux
virtual machine, see [The Easiest Way to Install Oracle Database on
Apple Mac OS X][21].

#### 3.5.2 Install Node.js

Download the [Node.js package][11] for macOS 64-bit and install it.

#### 3.5.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.5.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the free **Basic** 64-bit ZIP from [Oracle Technology Network][22]
and unzip it, for example:

```
mkdir -p /opt/oracle
unzip instantclient-basic-macos.x64-19.5.0.0.0dbru.zip
```

Create a symbolic link for the 'client shared library' in the user
default library path such as in `~/lib` or `/usr/local/lib`.  For example:

```
mkdir ~/lib
ln -s instantclient_19_5/libclntsh.dylib ~/lib/
```

Alternatively, copy the required OCI libraries, for example:

```
mkdir ~/lib
cp instantclient_19_5/{libclntsh.dylib.19.1,libclntshcore.dylib.19.1,libnnz19.dylib,libociei.dylib} ~/lib/
```

For Instant Client 11.2, the OCI libraries must be copied. For example:

```
mkdir ~/lib
cp /opt/oracle/instantclient_11_2/{libclntsh.dylib.11.1,libnnz11.dylib,libociei.dylib} ~/lib/
```

#### 3.5.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  With Instant Client 12.2 or earlier,
create this:

```
sudo mkdir -p /opt/oracle/instantclient_12_2/network/admin
```

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.5.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instwin"></a> 3.6 Node-oracledb Installation on Windows with Instant Client ZIP files

Follow these steps if your database is on a remote machine, or if you
already have Oracle software installed but you want node-oracledb to
use a different version of the libraries.

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="winprereqs"></a> 3.6.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built with Visual Studio 2017 and require
the matching [redistributable][27].

You may need Administrator privileges to set environment variables or
install software.

#### 3.6.2 Install Node.js

Install the 64-bit Node.js MSI (e.g. node-v10.16.0-x86.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm
directories to the path is selected.

#### 3.6.3 Install the add-on

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.6.4 Install the free Oracle Instant Client ZIP

Download the free 64-bit Instant Client **Basic** ZIP file from
[Oracle Technology Network][25].  If your Node.js architecture is
32-bit, then use the [32-bit Instant Client][26] instead.

Windows 7 users: Note that Oracle 19 is not supported on Windows 7.

- Unzip the ZIP file into a directory that is accessible to your
  application.  For example unzip
  ` instantclient-basic-windows.x64-19.5.0.0.0dbru.zip` to
  `C:\oracle\instantclient_19_5`.

- Add this directory to the `PATH` environment variable.  For example
  on Windows 7, update `PATH` in Control Panel -> System -> Advanced
  System Settings -> Advanced -> Environment Variables -> System
  variables -> `PATH`.  The Instant Client directory must occur in
  `PATH` before any other Oracle directories.

  Restart any open command prompt windows.

  To avoid interfering with existing tools that require other Oracle
  Client versions then, instead of updating the system-wide `PATH`
  variable, you may prefer to write a batch file that sets `PATH`, for
  example:

  ```
  REM mynode.bat
  SET PATH=C:\oracle\instantclient_19_5;%PATH%
  node %*
  ```

  Invoke this batch file every time you want to run Node.js.

  Alternatively use `SET` to change your `PATH` in each command prompt
  window before you run node.

  Another option is to move the unzipped Instant Client files to
  `node_modules\oracledb\build\Release` so the DLLs and other files
  are in the same directory as the `oracledb*.node` binaries.  If you
  do this, then `PATH` does not need to be set.

#### 3.6.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`C:\oracle\instantclient_19_5\network\admin` subdirectory.  Create
this if needed.

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, configuration files can be put in another directory.
Then set the environment variable `TNS_ADMIN` to that directory name.

#### <a name="winredists"> </a> 3.6.6 Install the Visual Studio Redistributables

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

#### 3.6.7 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instwinoh"></a> 3.7 Node-oracledb Installation on Windows with a Local Database or Full Client

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="winprereqs"></a> 3.7.1 Install Prerequisites

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

#### 3.7.2 Install Node.js

Install the 64-bit Node.js MSI (e.g. node-v10.16.0-x64.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm
directories to the path is selected.

#### 3.7.3 Install the add-on

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
npm config set proxy http://myproxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using the `npm` package manager, which is
included in Node.js:

```
npm install oracledb
```

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code, see [Node-oracledb Installation from
Source Code](#github).

#### 3.7.4 The default Oracle Client configuration directory

Optional Oracle client configuration files such as [`tnsnames.ora`][15],
[`sqlnet.ora`][16], [`ldap.ora`][17], or [`oraaccess.xml`][18] can be
placed in `$ORACLE_HOME\network\admin`.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.7.5 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instaix"></a> 3.8 Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="aixprereqs"></a> 3.9.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The GCC compiler is needed.

Use GNU Make 4.1-1 or above.

Python 2.7 is needed by node-gyp.

#### 3.9.2 Install Node.js

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

#### 3.9.3 Install the add-on

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
example `v5.0.0-dev`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v5.0.0-dev
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.0.0-dev/oracledb-src-5.0.0-dev.tgz
```

#### 3.9.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][30]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
unzip instantclient-basic-aix.ppc64-19.5.0.0.0dbru.zip
mkdir -p /opt/oracle
mv instantclient_19_5 /opt/oracle
```

To run applications, you will need to set the link path:

```
export LIBPATH=/opt/oracle/instantclient_19_5:$LIBPATH
```

#### 3.9.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
sudo mkdir -p /opt/oracle/instantclient_19_5/network/admin
```

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.9.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instsolarisx8664"></a> 3.9 Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### 3.9.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

#### 3.9.2 Install Node.js

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

#### 3.9.3 Install the add-on

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
example `v5.0.0-dev`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v5.0.0-dev
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.0.0-dev/oracledb-src-5.0.0-dev.tgz
```

#### 3.9.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][31]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
cd /opt/oracle
unzip instantclient-basic-solaris.x64-19.5.0.0.0dbru.zip
```

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_19_5:$LD_LIBRARY_PATH_64
```

#### 3.9.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
mkdir -p /opt/oracle/instantclient_19_5/network/admin
```

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.9.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the [database credentials][45] to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : process.env.NODE_ORACLEDB_PASSWORD,
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="github"></a> 3.10 Node-oracledb Installation from Source Code

Node-oracledb can be compiled from the source code on [GitHub][1].
Some build tools are required.

Install [Python 2.7][2], which is required for the node-gyp utility:

- If another version of Python occurs first in your binary path then
  run `npm config set python /wherever/python-2.7/bin/python` or use
  the `--python` option to indicate the correct version.  For example:
  `npm install --python=/whereever/python-2.7/bin/python oracledb`.

- On Windows, install the Python 2.7 MSI and select the customization
  option to "Add python.exe to Path".

Install a C compiler:

- On Linux, GCC 4.4.7 (the default on Oracle Linux 6) is known to work.

- On macOS install Xcode from the Mac App store.

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

#### <a name="githubtags"></a> 3.10.1 Installing using GitHub branches and tags

Node-oracledb can be installed from GitHub tags and branches.  In
general, use the most recent [release tag][41].

The `git` utility is required for this method.

Build node-oracledb from source code by changing the package specifier
so that `npm` downloads from GitHub instead of from npmjs.com.  For
example, to install the code from the GitHub tag 'v5.0.0-dev', add
`oracle/node-oracledb#v5.0.0-dev` to your `package.json` dependencies, or
use the command:

```
npm install oracle/node-oracledb#v5.0.0-dev
```

This will download, compile and install node-oracledb.

Use the general [Node-oracledb Installation
Instructions](#instructions) for your operating system to see how to
set up Oracle client libraries, create client configuration
directories, and run the samples.

Users without `git`, or with older versions of `npm` such as included in
Node.js 6, may alternatively need to use pre-bundled source code:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v5.0.0-dev/oracledb-src-5.0.0-dev.tgz
```

Note it may take some time before compilation begins due to the slow
download of source code from GitHub.

#### <a name="githubclone"></a> 3.10.2 Installing GitHub clones and zip files

If you clone node-oracledb or download a zip from [GitHub][1] to build
node-oracledb from source code, you need to make sure the [ODPI-C
submodule][9] is also included.  Otherwise the build will fail with an
error like **'dpi.h' file not found**.

- If you download a node-oracledb ZIP file from GitHub, you must
separately download the ODPI-C submodule code and extract it into the
`odpi` directory.

- To clone the GitHub repository run:

  ```
  git clone https://github.com/oracle/node-oracledb.git
  cd node-oracledb
  git submodule init
  git submodule update
  ```

Then build node-oracledb from source code using the [Node-oracledb
Installation Instructions](#instructions) for your operating system.
Substitute the command `npm install your-dir-path/node-oracledb` when
installing.

#### <a name="nogithubaccess"></a> 3.10.3 Compiling node-oracledb without GitHub Access

Some companies block access to github.com so compiling source code
from GitHub with `npm install oracle/node-oracledb.git#v5.0.0-dev` will
fail.

Oracle has a mirror of the GitHub repository source code that can be
cloned with:

```
git clone git://oss.oracle.com/git/oracle/node-oracledb.git/
cd node-oracledb
git submodule init
git submodule update
```

Follow the general instructions in [Node-oracledb Installation from
Source Code](#github) but install by running `npm install
path-to-your-clone-directory` from outside the clone directory.

### <a name="offline"></a> <a name="intermediateinstall"></a> 3.11 Node-oracledb Installation Without Internet Access

On an identical machine that has access to the internet, install
node-oracle following the [Node-oracledb Installation
Instructions](#instructions) for that operating system.

Then copy `node_modules/oracledb` and Oracle Client libraries to the
offline computer.  Windows users should see [Copying node-oracledb
Binaries on Windows](#winbins) and make sure the correct Visual Studio
Redistributable is also installed.

#### <a name="winbins"></a> 3.11.1 Copying node-oracledb Binaries on Windows

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

### <a name="instnoderpms"></a> 3.12 Installing Node.js and Node-oracledb RPMs from yum.oracle.com

Node.js and node-oracledb Linux RPM packages are available on
[yum.oracle.com][46].  Oracle Instant Client is also available in
[Oracle Linux 6][50] and [Oracle Linux 7][51] channels.  This means
installation is simple, and can be automated.

As an example, to install Node 10 on Oracle Linux 7, run these commands:

```
sudo yum install -y oracle-nodejs-release-el7 oracle-release-el7
sudo yum install nodejs node-oracledb-node10
```

For Instant Client 19, the system library search path is automatically
configured during installation.

For older versions, if there is no other Oracle software on the
machine that will be impacted, then permanently add Instant Client to
the run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Since node-oracledb is installed globally, set `NODE_PATH` before
running applications:

```
export NODE_PATH=$(npm root -g)
node myapp.js
```

See [Node.js for Oracle Linux][46] for details.

### <a name="selfhost"></a> 3.13 Building and Hosting your own node-oracledb Packages

You can host node-oracledb packages locally.

Download the node-oracledb package from npm, for example from
[`https://registry.npmjs.com/oracledb/-/oracledb-5.0.0-dev.tgz`](https://registry.npmjs.com/oracledb/-/oracledb-5.0.0-dev.tgz)
Alternatively, if you want to build your own binaries and
node-oracledb package, the maintainer scripts in
[/package](https://github.com/oracle/node-oracledb/tree/master/package)
can be used.  See
[package/README](https://github.com/oracle/node-oracledb/blob/master/package/README.md)
for details.

If you make the package accessible on your local web server, for
example at www.example.com/oracledb-5.0.0-dev.tgz, then your
install command would be:

```
npm install https://www.example.com/oracledb-5.0.0-dev.tgz
```

or your `package.json` would contain:

```
. . .
   "dependencies": {
      "oracledb": "https://www.example.com/oracledb-5.0.0-dev.tgz"
   },
. . .
```

### <a name="docker"></a> 3.14 Using node-oracledb in Docker

[Docker][59] allows applications to be containerized.  Each application will
have a `Dockerfile` with steps to create a Docker image.  Once created, the
image can be shared and run.

#### Installing Node.js in Docker

If your `Dockerfile` uses Oracle Linux:

```
FROM oraclelinux:7-slim
```

Then you can install Node.js from [yum.oracle.com][46] using:

```
RUN  yum -y install oracle-release-el7 oracle-nodejs-release-el7 && \
     yum-config-manager --disable ol7_developer_EPEL && \
     yum -y install nodejs && \
     rm -rf /var/cache/yum
```

Alternatively you may prefer to use a [Node.js image from
Docker Hub][56], for
example using:

```
FROM node:12-buster-slim
```

#### Installing Instant Client in Docker

Review the [Oracle Technology Network][12] or the [Oracle Linux 7][51] channel
for the latest Instant Client package available.  There are various ways to
install Instant Client.  Three methods are shown below.

1. Using Oracle Linux Instant Client RPMs

   If you have an Oracle Linux image:

   ```
   FROM oraclelinux:7-slim
   ```

   Then you can install Instant Client RPMs:

   ```
   RUN  yum -y install oracle-release-el7 && \
        yum-config-manager --enable ol7_oracle_instantclient && \
        yum -y install oracle-instantclient19.5-basiclite && \
        rm -rf /var/cache/yum
   ```

2. Automatically downloading an Instant Client zip file

   You can automatically download an Instant Client zip file during image
   creation.  This is most useful on Debian-based operating systems.

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
       cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *jar uidrvci genezi adrci && \
       echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig
   ```

3. Copying Instant Client zip files from the host

   To avoid the cost of repeated network traffic, you may prefer to download the
   Instant Client Basic Light zip file to your Docker host, extract it, and
   remove unnecessary files.  The resulting directory can be added during
   subsequent image creation.  For example, with Instant Client Basic Light
   19.5, the host computer (where you run Docker) could have a directory
   `instantclient_19_5` with these files:

   ```
   libclntshcore.so.19.1
   libclntsh.so.19.1
   libnnz19.so
   libociicus.so
   ```

   With this, your Dockerfile could contain:

   ```
   ADD instantclient_19_5/* /opt/oracle/instantclient_19_5
   RUN echo /opt/oracle/instantclient_19_5 > /etc/ld.so.conf.d/oracle-instantclient.conf && \
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

#### Installing node-oracledb and your application

Include node-oracledb as a normal dependency in your application `package.json` file:

```
  . . .
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "oracledb" : "^4"
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
Instant Client 19.5 RPMs, then you can mount the files using:

```
docker run -v /OracleCloud/wallet:/usr/lib/oracle/19.5/client64/lib/network/admin:Z,ro . . .
```

The `Z` option is needed when SELinux is enabled.

#### <a name="dockerexample"></a> Example Application in Docker

This example consists of a `Dockerfile`, a `package.json` file with the
application dependencies, a `server.js` file that is the application, and an
`envfile.list` containing the database credentials as environment variables.

If you use Oracle Linux, your `Dockerfile` will be like:

```
FROM oraclelinux:7-slim

RUN  yum -y install oracle-release-el7 oracle-nodejs-release-el7 && \
     yum-config-manager --disable ol7_developer_EPEL --enable ol7_oracle_instantclient && \
     yum -y install nodejs oracle-instantclient19.5-basiclite && \
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
    cd /opt/oracle/instantclient* && rm -f *jdbc* *occi* *mysql* *jar uidrvci genezi adrci && \
    echo /opt/oracle/instantclient* > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

WORKDIR /myapp
ADD package.json server.js /myapp/
RUN npm install

CMD exec node server.js
```

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
    "oracledb" : "^4"
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

## <a name="installingoldvers"></a>  4. Installing Older Versions of Node-oracledb

### <a name="installingv2"></a> 4.1 Installing node-oracledb 2.x and 3.x

Pre-built node-oracledb 2 and 3 binaries are available for some platforms and
Node.js versions.  Review the [release tags][41] for availability. You can
compile the add-on for other platforms or Node.js versions.

The node-oracledb 3.1 installation steps are in the [version 3.1 INSTALL
guide][55].

The node-oracledb 3.0 installation steps are in the [version 3.0 INSTALL
guide][54].

The node-oracledb 2.x installation steps are in the [version 2.x INSTALL
guide][52]

To get an old add-on you must explicitly use its version when installing:

```
npm install oracledb@2.3.0
```

or your `package.json` could contain:

```
. . .
   "dependencies": {
      "oracledb": "2.3.0"
   },
. . .
```

### <a name="installingv1"></a> 4.2 Installing node-oracledb 1.x

The node-oracledb 1.x installation steps are in the [version 1.x
INSTALL guide][32].  This version always requires compilation.  To get
an old add-on you must explicitly use its version when installing:

```
npm install oracledb@1.13.1
```

or your `package.json` could contain:

```
. . .
   "dependencies": {
      "oracledb": "1.13.1"
   },
. . .
```

## <a name="troubleshooting"></a> 5. Troubleshooting Node-oracledb Installation Problems

*Read the [Node-oracledb Installation Instructions](#instructions)*.

**Google anything that looks like an error.**

If `npm install oracledb` fails:

- Review the error messages closely. If a pre-built node-oracledb
  binary package is not available for your Node.js version or
  operating system, then change your Node.js version or compile
  node-oracledb from source code.

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

- If you got *DPI-1047: Cannot locate an Oracle Client library*,
  then review any messages and the installation instructions.

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

- On macOS, did you install Oracle Instant Client libraries in `~/lib`
  or `/usr/local/lib`?

Issues and questions about node-oracledb can be posted on [GitHub][10] or
[Slack][48] ([link to join Slack][49]).


[1]: http://oracle.github.io/node-oracledb/
[2]: https://www.python.org/downloads/
[3]: https://www.oracle.com/database/technologies/instant-client.html
[4]: https://www.npmjs.com/package/oracledb
[5]: https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6
[6]: https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1
[7]: https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings
[8]: https://www.oracle.com/technetwork/community/oca-486395.html
[9]: https://www.github.com/oracle/odpi
[10]: https://github.com/oracle/node-oracledb/issues
[11]: http://nodejs.org
[12]: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html
[13]: https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html#ic_x64_inst
[14]: https://linux.oracle.com
[15]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-7F967CE5-5498-427C-9390-4A5C6767ADAA
[16]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-2041545B-58D4-48DC-986F-DCC9D0DEC642
[17]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-04F09076-1D04-46DC-BA8C-1B67C1A464FD
[18]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2
[19]: https://github.com/oracle/node-oracledb/tree/master/examples
[20]: https://www.oracle.com/database/technologies/appdev/xe.html
[21]: https://blogs.oracle.com/opal/the-easiest-way-to-install-oracle-database-on-apple-mac-os-x
[22]: https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html
[23]: https://docs.oracle.com/database/
[24]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NTCLI
[25]: https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
[26]: https://www.oracle.com/database/technologies/instant-client/microsoft-windows-32-downloads.html
[27]: https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads
[29]: https://www.microsoft.com/en-us/download/details.aspx?id=3387
[30]: https://www.oracle.com/database/technologies/instant-client/aix-ppc64-downloads.html
[31]: https://www.oracle.com/database/technologies/instant-client/solx8664-downloads.html
[32]: https://github.com/oracle/node-oracledb/blob/v1.13.1/INSTALL.md
[40]: https://github.com/oracle/node-oracledb/tags
[41]: https://github.com/oracle/node-oracledb/releases
[42]: https://oracle.github.io/node-oracledb/doc/api.html#migratev1v2
[43]: https://github.com/oracle/node-oracledb/blob/master/CHANGELOG.md
[44]: https://oracle.github.io/node-oracledb/doc/api.html
[45]: https://www.youtube.com/watch?v=WDJacg0NuLo
[46]: http://yum.oracle.com/oracle-linux-nodejs.html
[47]: https://oracle.github.io/node-oracledb/doc/api.html#migrate
[48]: https://node-oracledb.slack.com/
[49]: https://join.slack.com/t/node-oracledb/shared_invite/enQtNDU4Mjc2NzM5OTA2LWMzY2ZlZDY5MDdlMGZiMGRkY2IzYjI5OGU4YTEzZWM5YjQ3ODUzMjcxNWQyNzE4MzM5YjNkYjVmNDk5OWU5NDM
[50]: http://yum.oracle.com/repo/OracleLinux/OL6/oracle/instantclient/x86_64/index.html
[51]: http://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html
[52]: https://github.com/oracle/node-oracledb/blob/v2.3.0/INSTALL.md
[53]: https://nodejs.org/api/n-api.html
[54]: https://github.com/oracle/node-oracledb/blob/v3.0.1/INSTALL.md
[55]: https://github.com/oracle/node-oracledb/blob/v3.1.2/INSTALL.md
[56]: https://hub.docker.com/_/node/
[57]: https://oracle.github.io/node-oracledb/doc/api.html#connectionadb
[58]: https://oracle.github.io/node-oracledb/doc/api.html##tnsadmin
[59]: https://www.docker.com/
