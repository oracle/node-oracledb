# Installing node-oracledb Version 3.1

*Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved.*

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
    - 1.1 [Changes in node-oracledb version 3.1](#mig31)
    - 1.2 [Changes in node-oracledb version 3.0](#mig30)
    - 1.3 [Changes in node-oracledb version 2.0](#mig20)
2. [Quick Start Node-oracledb Installation](#quickstart)
3. [Node-oracledb Installation Instructions](#instructions)
    - 3.1 [Prerequisites](#prerequisites)
    - 3.2 [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
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
4. [Installing Node-oracledb 1.x or 2.x](#installingoldvers)
5. [Useful Resources for Node-oracledb](#otherresources)
6. [Troubleshooting Node-oracledb Installation Problems](#troubleshooting)

## <a name="overview"></a> 1. Node-oracledb Overview

The [*node-oracledb*][1] add-on for Node.js powers high performance Oracle Database applications.

The steps below create a Node.js installation for testing.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node.js 6, 8, 10 and
11 on 64-bit Oracle Linux, Windows and macOS.  The add-on can also
build on some 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.
Older versions of node-oracledb may work with older versions of Node.js.

Node-oracledb is an [add-on](https://nodejs.org/api/addons.html)
available as C++ and C source code.  Pre-built binaries are available
as a convenience for common architectures.  Note the operating systems
and versions of Node.js that the pre-built binaries are compatible
with will change as the Node.js project evolves.  The binaries are not
guaranteed to be available or usable in your environment.

#### <a name="mig31"></a> 1.1 Changes in node-oracledb version 3.1

Pre-built binaries are now contained in the package downloaded from
npm.  This removes the previous internally executed step of
downloading a suitable binary package from GitHub.  If install size is
an issue, all binaries except those for the current Node.js version
can be deleted with `npm run prune`.

Source code is no longer included in the package available from npm.
To compile from source code, you need access to GitHub or its [Oracle
mirror](#nogithubaccess).

Node-oracledb now loads the Oracle Client libraries the first time a
connection is needed, not during `require('oracledb')`.  This means
that `require('oracledb')` can succeed on machines that do not have
Oracle Client libraries installed.  See the [CHANGELOG][43] for more
information.

#### <a name="mig30"></a> 1.2 Changes in node-oracledb version 3.0

Installation of node-oracledb binaries will now use the `npm config`
proxy if it is set.  However, due to known npm performance issues, it
is recommended to use environment variables like `https_proxy`
instead, since these will be used in preference to the npm
configuration.

The node-oracledb installer now supports basic proxy authentication.

On Windows, node-oracledb will now attempt to load the Oracle Client
libraries from the `node_modules\oracledb\build\Release` directory
before doing the standard Windows library directory search i.e. of the
`PATH` directories.

See the [CHANGELOG][43] and [Migrating from Previous node-oracledb
Releases][47] for more information about node-oracledb 3.0.

#### <a name="mig20"></a> 1.3 Changes in node-oracledb version 2.0

In node-oracledb version 2.0, pre-built binaries are now available for
some environments.

Building from source code has improved significantly in node-oracledb
version 2.0 The Oracle header files, and the node-oracledb environment
variables `OCI_INC_DIR` and `OCI_LIB_DIR` are no longer required.

The Oracle client libraries must now always be in the default library
search path, such as `PATH` (on Windows), or `LD_LIBRARY_PATH` (on
Linux), or in `~/lib` (on macOS).  This is because they are
dynamically loaded during execution. 'Rpath' linking is no longer
performed on Linux or macOS.

Any node-oracledb version 2.0 binary will run with any of the Oracle
client version 11.2, 12, or 18 libraries without needing recompilation.
Note the available Oracle functionality will vary with different
Oracle Client and Database versions.

See the [CHANGELOG][43] and [Migrating from node-oracledb 1.13 to
node-oracledb 2.0][42] for more information about node-oracledb
version 2.0.

## <a name="quickstart"></a> 2. Quick Start Node-oracledb Installation

- Install Node.js from [nodejs.org][11].

- Install node-oracledb using the `npm` package manager, which is
  included in Node.js.  If you are behind a firewall, you may need to
  set the environment variable `https_proxy` first.

    - Many users will be able to use a pre-built node-oracledb binary:

        - Run `npm install oracledb`, or add `oracledb` to your `package.json`
          dependencies.  This installs from the [npm registry][4].

          Windows users will require the [Visual Studio 2015
          Redistributable][27].

    - If a binary is not available, you will need to compile node-oracledb
    from source code:

        - Install [Python 2.7][2]

        - Install a C Compiler with support for C++ 11 (such as Xcode,
          GCC 4.8, Visual Studio 2015, or similar)

        - Run `npm install oracle/node-oracledb.git#v3.1.0`, or add
          `oracle/node-oracledb.git#v3.1.0` to your `package.json`
          dependencies.  Substitute your desired [GitHub tag][40].

- Add Oracle 18, 12, or 11.2 client libraries to your operating
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

  Oracle Client libraries 18 and 12.2 can connect to Oracle Database 11.2 or
  greater. Version 12.1 client libraries can connect to Oracle
  Database 10.2 or greater. Version 11.2 client libraries can connect
  to Oracle Database 9.2 or greater.

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

#### Which Instructions to Follow

Instructions may need to be adjusted for your platform, environment and versions being used.

I have ... | Follow this ...
----------|-----------------
Windows.  My database is on another machine | [Node-oracledb Installation on Windows with Instant Client ZIP files](#instwin)
Windows.  My database is on the same machine as Node.js | [Node-oracledb Installation on Windows with a Local Database or Full Client](#instwinoh)
Apple macOS | [Node-oracledb Installation on macOS](#instosx)
Linux.  My database is on another machine | [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm) or [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
Linux.  My database is on the same machine as Node.js | [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
Linux. I have the full Oracle client (installed via `runInstaller`) on the same machine as Node.js | [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
Linux.  I want to install Node.js and node-oracledb RPM packages | [Installing Node.js and Node-oracledb RPMs from yum.oracle.com](#instnoderpms)
AIX on Power Systems | [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
Solaris x86-64 (64-Bit) | [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
Another OS with Oracle Database 11.2, 12, or 18 client libraries available | Update binding.gyp and make any code changes required, sign the [OCA][8], and submit a pull request with your patch.
Source code from GitHub | [Node-oracledb Installation from Source Code](#github)
I don't have internet access | [Node-oracledb Installation Without Internet Access](#offline)

### <a name="prerequisites"></a> 3.1 Prerequisites

All installations need:

- Oracle 18, 12.2, 12.1 or 11.2 client libraries on the machine Node.js is installed on.

  Run `node -p "process.arch"` and make sure to use 64-bit or 32-bit
  Oracle client libraries to match the Node.js architecture.

  Oracle client libraries are included in [Oracle Instant Client][3]
  RPMs or ZIPs, a full Oracle Client, or a database on the same
  machine.  You only need one of these installations.

  Oracle's standard client-server network interoperability allows
  connections between different versions of Oracle Client and Oracle
  Database.  For certified configurations see Oracle Support's [Doc ID
  207303.1][6].  In summary, Oracle Client 18 and 12.2 can connect to Oracle
  Database 11.2 or greater. Oracle Client 12.1 can connect to Oracle
  Database 10.2 or greater. Oracle Client 11.2 can connect to Oracle
  Database 9.2 or greater.  The technical restrictions on creating
  connections may be more flexible.  For example Oracle Client 12.2
  can successfully connect to Oracle Database 10.2.

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
  **When building with Node.js 6 onward, the compiler must support
  C++11.** Note the default compiler on Oracle Linux 6 and RHEL 6 does
  not have the required support.  Install [GCC 4.8 or later][5] or
  upgrade to Oracle Linux 7.

- Python 2.7.

  [Python 2.7][2] is needed by node-gyp, which is invoked by npm.  Run
  `python --version` to find the version you have.

  If another version of Python occurs first in your binary path then,
  when you install node-oracledb, then run `npm config set python
  /wherever/python-2.7/bin/python` or use the `--python` option to
  indicate the correct version.  For example: `npm install
  --python=/wherever/python-2.7/bin/python oracledb`.

### <a name="instrpm"></a> 3.2 Node-oracledb Installation on Linux with Instant Client RPMs

Follow these steps if your database is on a remote machine.  Also see
[Installing Node.js and Node-oracledb RPMs from
yum.oracle.com](#instnoderpms).

Questions and issues can be posted as [GitHub Issues][10].

#### 3.2.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc.

#### 3.2.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 8.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v8.9.4-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v8.9.4-linux-x64/bin:$PATH
```

#### 3.2.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
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

[Install Instant Client Basic][13] with sudo or as the root user:

```
sudo yum install oracle-instantclient18.3-basic-18.3.0.0.0-2.x86_64.rpm
```

This will install the required `libaio` package, if it is not already
present.

If you have a [ULN][14] subscription, you can alternatively use `yum`
to install the Basic package after enabling the
ol7_x86_64_instantclient or ol6_x86_64_instantclient channel,
depending on your version of Linux.

If there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /usr/lib/oracle/18.3/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

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
  password      : "welcome",
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.


### <a name="instzip"></a> 3.3 Node-oracledb Installation on Linux with Instant Client ZIP files

Follow these steps if your database is on a remote machine.

Questions and issues can be posted as [GitHub Issues][10].

#### 3.3.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Pre-built binaries were built on Oracle Linux 6 and will require a
compatible glibc.

#### 3.3.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 8.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v8.9.4-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v8.9.4-linux-x64/bin:$PATH
```

#### 3.3.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
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
unzip instantclient-basic-linux.x64-18.3.0.0.0dbru.zip
mkdir -p /opt/oracle
mv instantclient_18_3 /opt/oracle
```

You will need the operating system `libaio` package installed.  On
some platforms the package is called `libaio1`.

if there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /opt/oracle/instantclient_18_3 > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_18_3:$LD_LIBRARY_PATH
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
  password      : "welcome",
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
example, if you downloaded version 8.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -zxf node-v8.9.4-linux-x64.tar.gz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v8.9.4-linux-x64/bin:$PATH
```

#### 3.4.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
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

Or, if you are using Oracle XE, by executing:

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
  password      : "welcome",
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

The pre-built binaries were built on macOS High Sierra, 10.13.6

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
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
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
unzip instantclient-basic-macos.x64-12.2.0.1.0.zip
```

Create a symbolic link for the 'client shared library' in the user
default library path such as in `~/lib` or `/usr/local/lib`.  For example:

```
mkdir ~/lib
ln -s instantclient_12_2/libclntsh.dylib ~/lib/
```

Alternatively, copy the required OCI libraries, for example:

```
mkdir ~/lib
cp instantclient_12_2/{libclntsh.dylib.12.1,libclntshcore.dylib.12.1,libons.dylib,libnnz12.dylib,libociei.dylib} ~/lib/
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
  password      : "welcome",
  connectString : "localhost/XEPDB1"
};
```

Run one of the examples:

```
node example.js
```

### <a name="instwin"></a> 3.6 Node-oracledb Installation on Windows with Instant Client ZIP files

Follow these steps if your database is on a remote machine.

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="winprereqs"></a> 3.6.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The pre-built binaries were built with Visual Studio 2015 and require
the matching [redistributable][27].

You may need Administrator privileges to set environment variables or
install software.

#### 3.6.2 Install Node.js

Install the 64-bit Node.js MSI (e.g. node-v6.11.0-x64.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm
directories to the path is selected.

#### 3.6.3 Install the add-on

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
set http_proxy=http://my-proxy.example.com:80/
set https_proxy=http://my-proxy.example.com:80/
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
[Oracle Technology Network][25].  (The 32-bit Instant Client is
[here][26]).

- Extract `instantclient-basic-windows.x64-18.3.0.0.0dbru.zip`

- Add its directory to `PATH`.  For example on Windows 7, update
  `PATH` in Control Panel -> System -> Advanced System Settings ->
  Advanced -> Environment Variables -> System variables -> `PATH` and
  add your path, such as `C:\oracle\instantclient_18_3`.

  If you have multiple versions of Oracle libraries installed, make
  sure the desired version occurs first in `PATH` before you run
  Node.js.

  Alternatively move the unzipped Instant Client files to
  `node_modules\oracledb\build\Release` so the DLLs and other files
  are in the same directory as the `oracledb.node` binary.  If you do
  this, then `PATH` does not need to be set.

#### 3.6.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`C:\oracle\instantclient_18_3\network\admin` subdirectory.  Create
this if needed.

This is the default Oracle configuration directory for applications
using this Instant Client.

Alternatively, configuration files can be put in another directory.
Then set the environment variable `TNS_ADMIN` to that directory name.

#### <a name="winredists"> </a> 3.6.6 Install the Visual Studio Redistributables

The `PATH` variable needs to include the appropriate VS Redistributable:
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
  password      : "welcome",
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

The pre-built binaries were built with Visual Studio 2015 and require
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

Install the 64-bit Node.js MSI (e.g. node-v6.11.0-x64.msi) from
[nodejs.org][11].  Make sure the option to add the Node and npm
directories to the path is selected.

#### 3.7.3 Install the add-on

Open a terminal window.

If you are behind a firewall you may need to set your proxy, for
example:

```
set http_proxy=http://my-proxy.example.com:80/
set https_proxy=http://my-proxy.example.com:80/
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
  password      : "welcome",
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

The GCC compiler is needed.  GCC 4.8 (or later) is needed to install
because compiling for Node.js 6 (or later) requires a C++11 compatible
compiler.

Use GNU Make 4.1-1 or above.

Python 2.7 is needed by node-gyp.

#### 3.9.2 Install Node.js

Download [Node.js][11] for AIX on Power Systems.  For
example, if you downloaded version 6.11.0 you could install Node.js
into `/opt`:

```
cd /opt
gunzip -c node-v6.11.0-aix-ppc64.tar.gz | tar -xvf -
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v6.11.0-aix-ppc64/bin:$PATH
```

#### 3.9.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Set the compiler to GCC:

```
export CC=gcc
```

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v3.1.0`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v3.1.0
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v3.1.0/oracledb-src-3.1.0.tgz
```

#### 3.9.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][30]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
unzip instantclient-basic-aix.ppc64-12.2.0.1.0.zip
mkdir -p /opt/oracle
mv instantclient_12_2 /opt/oracle
```

To run applications, you will need to set the link path:

```
export LIBPATH=/opt/oracle/instantclient_12_2:$LIBPATH
```

#### 3.9.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
sudo mkdir -p /opt/oracle/instantclient_12_2/network/admin
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
  password      : "welcome",
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
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Use the GNU `gmake` utility:

```
export MAKE=gmake
```

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v3.1.0`, and use the `npm` package manager (which is
included in Node.js) to install it.

If you have the `git` utility, you can install with:

```
npm install oracle/node-oracledb.git#v3.1.0
```

Otherwise install using:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v3.1.0/oracledb-src-3.1.0.tgz
```

#### 3.9.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from [Oracle Technology Network][31]
and extract it into a directory that is accessible to your
application, for example `/opt/oracle`:

```
cd /opt/oracle
unzip instantclient-basic-solaris.x64-12.2.0.1.0.zip
```

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_12_2:$LD_LIBRARY_PATH_64
```

#### 3.9.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
mkdir -p /opt/oracle/instantclient_12_2/network/admin
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
  password      : "welcome",
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

Install a C++11 compatible compiler:

- On Linux you need GCC 4.8 (or later) because compiling for Node.js 6
  (or later) requires a C++11 compatible compiler.  The default
  compiler on Oracle Linux 6 and RHEL 6 does not have the required
  C++11 support. Install [GCC 4.8 or later][5] or upgrade to Oracle
  Linux 7.

- On macOS install Xcode from the Mac App store.

- On Windows, install a C/C++ build environment such as Microsoft
  Visual Studio 2015.  Compilers supported by Oracle libraries are
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
example, to install the code from the GitHub tag 'v3.1.0', add
`oracle/node-oracledb#v3.1.0` to your `package.json` dependencies, or
use the command:

```
npm install oracle/node-oracledb#v3.1.0
```

This will download, compile and install node-oracledb.

Use the general [Node-oracledb Installation
Instructions](#instructions) for your operating system to see how to
set up Oracle client libraries, create client configuration
directories, and run the samples.

Users without `git`, or with older versions of `npm` such as included in
Node.js 6, may alternatively need to use pre-bundled source code:

```
npm install https://github.com/oracle/node-oracledb/releases/download/v3.1.0/oracledb-src-3.1.0.tgz
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

- If you clone the GitHub repository, you need to additionally run:

  ```
  git submodule init
  git submodule update
  ```

Then build node-oracledb from source code using the [Node-oracledb
Installation Instructions](#instructions) for your operating system.
Substitute the command `npm install your-dir-path/node-oracledb` when
installing.

#### <a name="nogithubaccess"></a> 3.10.3 Compiling node-oracledb without GitHub Access

Some companies block access to github.com so compiling source code
from GitHub with `npm install oracle/node-oracledb.git#v3.1.0` will
fail.

Oracle has a mirror of the GitHub repository source code that can be
cloned with:

```
git clone git://oss.oracle.com/git/oracle/node-oracledb.git/
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
Redistributables.  If you have Oracle client 18 or 12.2, install the Visual
Studio 2013 Redistributable.  For Oracle client 12.1 install the Visual
Studio 2010 Redistributable.  For Oracle client 11.2 install the Visual
Studio 2005 Redistributable.

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

This will also install Oracle Instant Client, which needs to be
configures.  As the root user, add Instant Client to the library
search path:

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
`https://registry.npmjs.com/oracledb/-/oracledb-3.1.0.tgz`
Alternatively, if you want to build your own binaries and
node-oracledb package, the maintainer scripts in
[/package](https://github.com/oracle/node-oracledb/tree/master/package)
can be used.  See
[package/README](https://github.com/oracle/node-oracledb/blob/master/package/README.md)
for details.

If you make the package accessible on your local web server, for
example at https://www.example.com/oracledb-3.1.0.tgz, then your
install command would be:

```
npm install https://www.example.com/oracledb-3.1.0.tgz
```

or your `package.json` would contain:

```
. . .
   "dependencies": {
      "oracledb": "https://www.example.com/oracledb-3.1.0.tgz"
   },
. . .
```


## <a name="installingoldvers"></a> <a name="installingv1"></a> 4. Installing Node-oracledb 1.x or 2.x

### Installing Node-oracledb 1.x

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

### Installing Node-oracledb 2.x

The node-oracledb 2.x installation steps are in the [version 2.x
INSTALL guide][52].  Pre-built binaries are available for some
platforms and Node.js versions. You can compile the add-on for other
versions.  To get an old add-on you must explicitly use its version
when installing:

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

## <a name="otherresources"></a> 5. Useful Resources for Node-oracledb

Node-oracledb can be installed on the pre-built [*Database App
Development VM*][33] for [VirtualBox][34], which has Oracle Database
12c pre-installed on Oracle Linux.

If you want to use your own database, installing the free [Oracle
Database 11.2 'XE' Express Edition][20] is quick and easy.  Other
database editions may be downloaded [here][35] or [used with
Docker][36].

If you want to install Oracle Linux yourself, it is free from
[here][37].

Oracle's free [LiveSQL][38] site is a great place to learn SQL and
test statements without needing your own database.  Any questions
about SQL or PL/SQL can be asked at
[AskTom][39].

## <a name="troubleshooting"></a> 6. Troubleshooting Node-oracledb Installation Problems

*Read the [Node-oracledb Installation Instructions](#instructions)*.

**Google anything that looks like an error.**

If `npm install oracledb` fails:

- Review the error messages closely. If a pre-built node-oracledb
  binary package is not available for your Node.js version or
  operating system, then change your Node.js version or compile
  node-oracledb from source code.

- Was there a network connection error?  Do you need to set
  `http_proxy` and/or `https_proxy`?

- Use `npm install --verbose oracledb`.  Review your output and logs.
  Try to install in a different way.  Try some potential solutions.

- When compiling node-oracledb from source, does your compiler have
  C++11 support, e.g. use VS 2015 or GCC 4.8.

- When compiling node-oracledb from source, do you have Python 2.7?
  Run `python --version`.

- When compiling node-oracledb from source, do you have an old version
  of `node-gyp` installed?  Try updating it.  Also try deleting
  `$HOME/.node-gyp` or equivalent.

- Try running `npm cache clean -f` and deleting the
  `node_modules/oracledb` directory.

If `require('oracledb')` fails:

- Do you have multiple copies of Node.js installed?  Did the correct
  `npm` and `node-gyp` get invoked?

- Did you get *Error: Module version mismatch* or *Error: Module
  did not self-register*?  You must rebuild node-oracledb when you
  upgrade Node.js.

If creating a connection fails:

- If you got *DPI-1047: Oracle Client library cannot be loaded*,
  then review any messages and the installation instructions.

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

- On macOS, did you install Oracle Instant Client in `~/lib` or
  `/usr/local/lib`?

Issues and questions about node-oracledb can be posted on [GitHub][10] or
[Slack][48] ([link to join Slack][49]).


[1]: http://oracle.github.io/node-oracledb/
[2]: https://www.python.org/downloads/
[3]: http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html
[4]: https://www.npmjs.com/package/oracledb
[5]: https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6
[6]: https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1
[7]: https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings
[8]: https://www.oracle.com/technetwork/community/oca-486395.html
[9]: https://www.github.com/oracle/odpi
[10]: https://github.com/oracle/node-oracledb/issues
[11]: http://nodejs.org
[12]: http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html
[13]: http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst
[14]: https://linux.oracle.com
[15]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-A3F9D023-9CC4-445D-8921-6E40BD900EAD
[16]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-28040885-6832-4FFC-9258-0EF19FE9A3AC
[17]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-E72B32D3-4343-475F-9CB4-CE28FF8EFD29
[18]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-9D12F489-EC02-46BE-8CD4-5AECED0E2BA2
[19]: https://github.com/oracle/node-oracledb/tree/master/examples
[20]: https://www.oracle.com/database/technologies/appdev/xe.html
[21]: https://blogs.oracle.com/opal/the-easiest-way-to-install-oracle-database-on-apple-mac-os-x
[22]: http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html
[23]: https://docs.oracle.com/database/
[24]: https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NTCLI
[25]: http://www.oracle.com/technetwork/topics/winx64soft-089540.html
[26]: http://www.oracle.com/technetwork/topics/winsoft-085727.html
[27]: https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads
[29]: https://www.microsoft.com/en-us/download/details.aspx?id=3387
[30]: http://www.oracle.com/technetwork/topics/aix5lsoft-098883.html
[31]: http://www.oracle.com/technetwork/topics/solx8664soft-097204.html
[32]: https://github.com/oracle/node-oracledb/blob/v1.13.1/INSTALL.md
[33]: http://www.oracle.com/technetwork/community/developer-vm/index.html#dbapp
[34]: https://www.virtualbox.org
[35]: http://www.oracle.com/technetwork/database/enterprise-edition/downloads/
[36]: https://store.docker.com/
[37]: http://yum.oracle.com/
[38]: https://livesql.oracle.com/
[39]: https://asktom.oracle.com/
[40]: https://github.com/oracle/node-oracledb/tags
[41]: https://github.com/oracle/node-oracledb/releases
[42]: https://oracle.github.io/node-oracledb/doc/api.html#migratev1v2
[43]: https://github.com/oracle/node-oracledb/blob/master/CHANGELOG.md
[44]: https://oracle.github.io/node-oracledb/doc/api.html
[45]: https://www.youtube.com/watch?v=WDJacg0NuLo
[46]: http://yum.oracle.com/oracle-linux-nodejs.html
[47]: https://oracle.github.io/node-oracledb/doc/api.html#migrate
[48]: https://node-oracledb.slack.com/
[49]: https://node-oracledb.slack.com/join/shared_invite/enQtNDU4Mjc2NzM5OTA2LTdkMzczODY3OGY3MGI0Yjk3NmQ4NDU4MTI2OGVjNTYzMjE5OGY5YzVkNDY4MWNkNjFiMDM2ZDMwOWRjNWVhNTg
[50]: http://yum.oracle.com/repo/OracleLinux/OL6/oracle/instantclient/x86_64/index.html
[51]: http://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/index.html
[52]: https://github.com/oracle/node-oracledb/blob/v2.3.0/INSTALL.md
