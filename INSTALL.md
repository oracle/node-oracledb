# Installing node-oracledb Version 2

*Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved.*

You may not use the identified files except in compliance with the Apache
License, Version 2.0 (the "License.")

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

## Contents

1. [Node-oracledb Overview](#overview)
2. [Quick Start Node-oracledb Installation](#quickstart)
3. [Node-oracledb Installation Instructions](#instructions)
  - 3.1 [Prerequisites](#prerequisites)
  - 3.2 [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
  - 3.3 [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
  - 3.4 [Node-oracledb Installation on Linux with a Local Database or Full Client](#instoh)
  - 3.5 [Node-oracledb Installation on macOS](#instosx)
  - 3.6 [Node-oracledb Installation on Windows with Instant Client ZIP files](#instwin)
  - 3.7 [Node-oracledb Installation on Windows with a Local Database or Full Client](#instwinoh)
  - 3.8 [Copying node-oracledb Binaries on Windows](#winbins)
  - 3.9 [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
  - 3.10 [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
  - 3.11 [Node-oracledb Installation from GitHub](#github)
  - 3.12 [Node-oracledb Installation Without Internet Access](#offline)

4. [Installing Node-oracledb 1.x](#installingv1)
5. [Useful Resources for Node-oracledb](#otherresources)
6. [Troubleshooting Node-oracledb Installation Problems](#troubleshooting)

## <a name="overview"></a> 1. Node-oracledb Overview

The [*node-oracledb*][1] add-on for Node.js powers high performance Oracle Database applications.

The steps below create a Node.js installation for testing.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node 4,
6 and 8 on 64-bit Oracle Linux and Windows.  The add-on can also build
on macOS, and some 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.

*Note*: Installation has improved significantly in node-oracledb 2.x.
Pre-built binaries are now available for some combinations of
platforms and Node.js versions.  And if you need to build your own
binary, the Oracle header files and node-oracledb environment variables
`OCI_INC_DIR` and `OCI_LIB_DIR` are no longer required.  At run time,
Oracle client libraries must now always be in the default library
search path, such as `PATH` (on Windows) or `LD_LIBRARY_PATH` (on
Linux) or in `~/lib` (on macOS) because they are dynamically loaded at
run time. 'Rpath' linking is no longer performed on Linux or macOS.

## <a name="quickstart"></a> 2. Quick Start Node-oracledb Installation

Many users will be able to use pre-built node-oracledb binaries:

- Run `npm install oracledb` to install from the [npm registry][4].

- Install [Oracle Instant Client][3] 12.2, 12.1 or 11.2. Put the
  libraries in your OS library search path, such as `PATH` on Windows,
  or `LD_LIBRARY_PATH` on Linux, or in `~/lib` on macOS.

  Instant Client on Windows requires a [ Visual Studio
  Redistributable](#winredists).  On Linux, the `libaio` (sometimes
  called `libaio1`) package is needed.

If a binary is not available, you will need to compile node-oracledb
from source code:

- Install [Python 2.7][2]

- Install a C Compiler with support for C++ 11 (Xcode, gcc 4.7, Visual Studio 2013, or similar)

- Run `npm install oracle/node-oracledb.git#v2.0.15` (substitute your [desired tag][40]).

- Install [Oracle Instant Client][3] 12.2, 12.1 or 11.2. Put the
  libraries in your OS library search path, such as `PATH` on Windows,
  or `LD_LIBRARY_PATH` on Linux, or in `~/lib` on macOS.

  Instant Client on Windows requires a [ Visual Studio
  Redistributable](#winredists).  On Linux, the `libaio` (sometimes
  called `libaio1`) package is needed.

See [Troubleshooting Node-oracledb Installation Problems](#troubleshooting) if you have issues.

## 3. <a name="instructions"></a> Node-oracledb Installation Instructions

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
AIX on Power Systems | [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
Solaris x86-64 (64-Bit) | [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
Another OS with Oracle Database 11.2 or 12c, or client libraries available | Update binding.gyp and make any code changes required, sign the [OCA][8], and submit a pull request with your patch.
Source code from GitHub | Start with [Node-oracledb Installation from GitHub](#github) and then follow relevant platform instructions.
I don't have internet access | [Node-oracledb Installation Without Internet Access](#offline)

### 3.1 <a name="prerequisites"></a> Prerequisites

All installations need:

- Oracle 12.2, 12.1 or 11.2 client libraries on the machine Node.js is installed on.

  Oracle client libraries are included in [Oracle Instant Client][3]
  RPMs or ZIPs, a full Oracle Client, or a database on the same
  machine.  You only need one of these installations.

  Run `node -p "process.arch"` and make sure to use matching 64-bit or
  32-bit Oracle client libraries.

  Oracle's standard client-server network interoperability applies,
  see Oracle Support's [Doc ID 207303.1][6].  In summary, Oracle
  Client 12.2 can connect to Oracle Database 11.2 or greater. Oracle
  Client 12.1 can connect to Oracle Database 10.2 or greater. Oracle
  Client 11.2 can connect to Oracle Database 9.2 or greater.

- An Oracle Database to test node-oracledb.

  After installation of node-oracledb, your Node.js applications will
  be able to connect to your database.  The database can be on the
  same machine as Node.js, or on a remote machine.

  You will need to know user credentials and the [connection
  string][7] for the database.

If pre-built binaries are not available or desired, you need these
additional tools to build from source code:

- A compiler.

  Use Visual Studio on Windows, GCC on Linux or Xcode on macOS.
  **When building with Node 4 onward, the compiler must support
  C++11.** Note the default compiler on Oracle Linux 6 and RHEL 6 does
  not have the required support.  Install [GCC 4.7 or later][5] or
  upgrade to Oracle Linux 7.

- Python 2.7.

  [Python 2.7][2] is needed by node-gyp, which is invoked by npm.  Run
  `python --version` to find the version you have.

  If another version of Python occurs first in your binary path then,
  when you install node-oracledb, use the `--python` option to
  indicate the correct version.  For example: `npm install
  --python=/wherever/python-2.7/bin/python oracledb`.

### <a name="instrpm"></a> 3.2 Node-oracledb Installation on Linux with Instant Client RPMs

Follow these steps if your database is on a remote machine.

Questions and issues can be posted as [GitHub Issues][10].

#### 3.2.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

If source code is being compiled you need:

- GCC 4.7 (or later) because compiling for Node 4 (or later) requires
  a C++11 compatible compiler.  The default compiler on Oracle Linux 6
  and RHEL 6 does not have the required C++11 support. Install [GCC
  4.7 or later][5] or upgrade to Oracle Linux 7.

- Python 2.7 for node-gyp.  If another version of Python occurs first
  in your binary path then, when you install node-oracledb, use the
  `--python` option to indicate the correct version.  For example:
  `npm install --python=/whereever/python-2.7/bin/python oracledb`.

#### 3.2.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 6.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v6.9.4-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

#### 3.2.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

*Note:* GCC 4.7 (or later) is required when building with Node.js 4 or
later, otherwise the NAN component will fail to build.

#### 3.2.4 Install the free Oracle Instant Client 'Basic' RPM

Download the free **Basic** RPM from [Oracle Technology Network][12] and
[install it][13] with sudo or as the root user:

```
sudo yum install oracle-instantclient12.2-basic-12.2.0.1.0-1.x86_64.rpm
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
sudo sh -c "echo /usr/lib/oracle/12.2/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

```
export LD_LIBRARY_PATH=/usr/lib/oracle/12.2/client64/lib
```

#### 3.2.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory under `lib/`.  Create this if needed.
For example:

```
sudo mkdir -p /usr/lib/oracle/12.2/client64/lib/network/admin
```

This is the default Oracle configuration directory for applications
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.2.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.


### <a name="instzip"></a> 3.3 Node-oracledb Installation on Linux with Instant Client ZIP files

Follow these steps if your database is on a remote machine.

Questions and issues can be posted as [GitHub Issues][10].

#### 3.3.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

If source code is being compiled you need:

- GCC 4.7 (or later) because compiling for Node 4 (or later) requires
  a C++11 compatible compiler.  The default compiler on Oracle Linux 6
  and RHEL 6 does not have the required C++11 support. Install [GCC
  4.7 or later][5] or upgrade to Oracle Linux 7.

- Python 2.7 for node-gyp.  If another version of Python occurs first
  in your binary path then, when you install node-oracledb, use the
  `--python` option to indicate the correct version.  For example:
  `npm install --python=/whereever/python-2.7/bin/python oracledb`.

#### 3.3.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 6.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v6.9.4-linux-x64.tar.xz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

#### 3.3.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

*Note:* GCC 4.7 (or later) is required when building with Node.js 4 or
later, otherwise the NAN component will fail to build.

#### 3.3.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the free **Basic** ZIP file from [Oracle Technology Network][12]
and [unzip it][13] into a directory accessible to your application,
for example:

```
unzip instantclient-basic-linux.x64-12.2.0.1.0.zip
mkdir -p /opt/oracle
mv instantclient_12_2 /opt/oracle
```

You will need the operating system `libaio` package installed.  On
some platforms the package is called `libaio1`.

if there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /opt/oracle/instantclient_12_2 > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link
path set:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_12_2:$LD_LIBRARY_PATH
```

#### 3.2.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
sudo mkdir -p /opt/oracle/instantclient_12_2/network/admin
```

This is the default Oracle configuration directory for applications
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.3.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
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

If source code is being compiled you need:

- GCC 4.7 (or later) because compiling for Node 4 (or later) requires
  a C++11 compatible compiler.  The default compiler on Oracle Linux 6
  and RHEL 6 does not have the required C++11 support. Install [GCC
  4.7 or later][5] or upgrade to Oracle Linux 7.

- Python 2.7 for node-gyp.  If another version of Python occurs first
  in your binary path then, when you install node-oracledb, use the
  `--python` option to indicate the correct version.  For example:
  `npm install --python=/whereever/python-2.7/bin/python oracledb`.

#### 3.4.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"][11] package.  For
example, if you downloaded version 6.9.4 for 64-bit you could install
Node.js into `/opt`:

```
cd /opt
tar -zxf node-v6.9.4-linux-x64.tar.gz
```

Set `PATH` to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

#### 3.4.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

##### To install a pre-built binary:

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

If a pre-built binary is successfully installed but isn't usable
because it depends on a different glibc version, uninstall
node-oracledb and install again from source code.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

*Note:* GCC 4.7 (or later) is required when building with Node.js 4 or
later, otherwise the NAN component will fail to build.

#### 3.2.4 The default Oracle Client configuration directory

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

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="instosx"></a> 3.5 Node-oracledb Installation on macOS

Questions and issues can be posted as [GitHub Issues][10].

#### 3.5.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

Oracle Instant Client libraries are required on macOS.  There is no
native Oracle Database for macOS but one can easily be run in a Linux
virtual machine, see [The Easiest Way to Install Oracle Database on
Apple Mac OS X][21].

If source code is being compiled, install Xcode from the Mac App
store.

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

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

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
ln -s instantclient_12_2/libclntsh.dylib.12.1 ~/lib/
```

Alternatively, copy the required OCI libraries, for example:

```
mkdir ~/lib
cp instantclient_12_2/{libclntsh.dylib.12.1,libclntshcore.dylib.12.1,libons.dylib,libnnz12.dylib,libociei.dylib} ~/lib/
```

For Instant Client 11.2, the OCI libraries must be copied. For example::

```
mkdir ~/lib
cp /opt/oracle/instantclient_11_2/{libclntsh.dylib.11.1,libnnz11.dylib,libociei.dylib} ~/lib/
```

#### 3.2.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
sudo mkdir -p /opt/oracle/instantclient_12_2/network/admin
```

This is the default Oracle configuration directory for applications
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.5.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="instwin"></a> 3.6 Node-oracledb Installation on Windows with Instant Client ZIP files

Follow these steps if your database is on a remote machine.

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="winprereqs"></a> 3.6.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

You may need Administrator privileges to set environment variables or
install software.

If source code is being compiled you need:

- A C/C++ build environment such as Microsoft Visual Studio 2015.
  Compilers supported by Oracle libraries are found in [Oracle
  documentation][23] for each version, for example [Oracle Database
  Client Installation Guide 12c Release 2 (12.2) for Microsoft
  Windows][24].

- The Python 2.7 MSI from [www.python.org][2].  Select the
  customization option to "Add python.exe to Path".

Some users report that the npm `windows-build-tools` package has the
necessary tools to build node-oracledb from source code.

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

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

Start Visual Studio and open a Developer Command Prompt within it.

Use `set PATH` in the shell to confirm the Python and Node.js
directories are correctly set.  If they are not, then set `PATH`
manually in the shell, or set it in the System Properties panel and
restart the command shell.

Make sure the Microsoft Visual Studio environment variables are set
appropriately.  Use `set PATH` and verify it contains your Visual
Studio paths.  If they are not set, use vcvars64.bat (or vcvars.bat if
you building with 32-bit binaries) to set the environment.
Alternatively you can open the 'Developer Command Prompt for Visual
Studio' which has environment variables already configured.

Locate the [GitHub tag][40] of the desired node-oracledb version, for
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

#### 3.6.4 Install the free Oracle Instant Client ZIP

Download the free 64-bit Instant Client **Basic** ZIP file from
[Oracle Technology Network][25].  (The 32-bit Instant Client is
[here][26]).

- Extract `instantclient-basic-windows.x64-12.2.0.1.0.zip`

- Add its directory to `PATH`.  For example on Windows 7, update `PATH`
in Control Panel -> System -> Advanced System Settings -> Advanced ->
Environment Variables -> System variables -> `PATH` and add your path,
such as `C:\oracle\instantclient_12_2`.

If you have multiple versions of Oracle libraries installed, make sure
the desired version occurs first in the path before Node.js is run.

#### 3.6.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`C:\oracle\instantclient_12_2\network\admin` subdirectory.  Create
this if needed.

This is the default Oracle configuration directory for applications
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### <a name="winredists"> </a> 3.6.6 Install the Visual Studio Redistributables

The `PATH` variable needs to include the appropriate VS Redistributable:
- Oracle client 12.2 requires the [Visual Studio 2013 Redistributable][27].
- Oracle client 12.1 requires the [Visual Studio 2010 Redistributable][28].
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

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="instwinoh"></a> 3.7 Node-oracledb Installation on Windows with a Local Database or Full Client

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="winprereqs"></a> 3.7.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The Oracle software can be either a database home or a full Oracle
client installation.  Make sure that `PATH` contains the correct
binary directory, for example `C:\oracle\product\12.2.0\dbhome_1\bin`.

For easy development, the free [Oracle XE][20] version of the database
is available on Linux.  Applications developed with XE may be
immediately used with other editions of the Oracle Database.

You may need Administrator privileges to set environment variables or
install software.

If source code is being compiled you need:

- A C/C++ build environment such as Microsoft Visual Studio 2015.
  Compilers supported by Oracle libraries are found in [Oracle
  documentation][23] for each version, for example [Oracle Database
  Client Installation Guide 12c Release 2 (12.2) for Microsoft
  Windows][24].

- The Python 2.7 MSI from [www.python.org][2].  Select the
  customization option to "Add python.exe to Path".

Some users report that the npm `windows-build-tools` package has the
necessary tools to build node-oracledb from source code.

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

Install node-oracledb using:

```
npm install oracledb
```

Available pre-built node-oracledb binaries can been seen on the
[releases][41] page.

##### To install from source code:

If a pre-built node-oracledb binary is not installable, the binary can
be built from source code.

- Start Visual Studio and open a Developer Command Prompt within it.

- Use `set PATH` in the shell to confirm the Python and Node.js
  directories are correctly set.  If they are not, then set `PATH`
  manually in the shell, or set it in the System Properties panel and
  restart the command shell.

- Make sure the Microsoft Visual Studio environment variables are set
  appropriately.  Use `set PATH` and verify it contains your Visual
  Studio paths.  If they are not set, use vcvars64.bat (or vcvars.bat if
  you building with 32-bit binaries) to set the environment.
  Alternatively you can open the 'Developer Command Prompt for Visual
  Studio' which has environment variables already configured.

- Locate the [GitHub tag][40] of the desired node-oracledb version, for
  example `v2.0.15`, and use it in the install command like:

  ```
  npm install oracle/node-oracledb.git#v2.0.15
  ```

#### 3.7.4 The default Oracle Client configuration directory

Optional Oracle client configuration files such as [`tnsnames.ora`][15],
[`sqlnet.ora`][16], [`ldap.ora`][17], or [`oraaccess.xml`][18] can be
placed in `$ORACLE_HOME\network\admin`.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.7.5 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="winbins"></a> 3.8 Copying node-oracledb Binaries on Windows

Node-oracledb binaries can be copied between compatible Windows systems.

After node-oracledb has been built on the source computer, copy the
`node_modules\oracledb` directory to the destination computer's
`node_module` directory.

Both computers must have the same version and architecture (32-bit or
64-bit) of Node.js.

Oracle client libraries of the same architecture as Node.js should be
in the destination computer's `PATH`.  Note the Oracle client library
versions do not have to be the same on different computers, but
node-oracledb behavior and features may then differ.

The destination computer's `PATH` needs to include Visual Studio
Redistributables.  If you have Oracle client 12.2, install the Visual
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

### <a name="instaix"></a> 3.9 Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### <a name="aixprereqs"></a> 3.9.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

The GCC compiler is needed.  GCC 4.7 (or later) is needed to install
because compiling for Node 4 (or later) requires a C++11 compatible
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
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
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
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.9.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="instsolarisx8664"></a> 3.10 Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues][10].

#### 3.10.1 Install Prerequisites

Review the generic [prerequisites](#prerequisites).

#### 3.10.2 Install Node.js

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

#### 3.10.3 Install the add-on

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
example `v2.0.15`, and use it in the install command like:

```
npm install oracle/node-oracledb.git#v2.0.15
```

#### 3.10.4 Install the free Oracle Instant Client 'Basic' ZIP file

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

#### 3.10.5 Optionally create the default Oracle Client configuration directory

If you intend to co-locate optional Oracle configuration files such as
[`tnsnames.ora`][15], [`sqlnet.ora`][16], [`ldap.ora`][17], or
[`oraaccess.xml`][18] with Instant Client, they can be put in a
`network/admin` subdirectory.  Create this if needed.  For example:

```
mkdir -p /opt/oracle/instantclient_12_2/network/admin
```

This is the default Oracle configuration directory for applications
linked with this Instant Client.

Alternatively, if you use Oracle client configuration files, they can
be put in another, accessible directory.  Then set the environment
variable `TNS_ADMIN` to that directory name.

#### 3.10.6 Run an example program

Download the [example programs][19] from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment, for example:

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node select1.js
```

### <a name="github"></a> 3.11 Node-oracledb Installation from GitHub

#### 3.11.1 Installing using GitHub branches and tags

Node-oracledb can be installed from GitHub tags and branches.

Build node-oracledb from source code using the [Node-oracledb
Installation Instructions](#instructions) for your operating system
but change the install command to download from [GitHub][1] instead of
from [npmjs.com][4].  For example, to install the code corresponding
to the tag 'v1.13.1', use the command:

```
npm install oracle/node-oracledb#v1.13.1
```

#### 3.11.2 Installing GitHub clones and zip files

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

### <a name="offline"></a> 3.12 Node-oracledb Installation Without Internet Access

There are two ways to install node-oracledb on computers that do not
have internet access or do not have access to the [npm registry][4].
You can either do a normal install on another machine, or manually
extract the node-oracledb packages.

#### 3.12.1 Normal Install on an Intermediary Machine

On an identical machine that does have access, install node-oracle
following the [Node-oracledb Installation Instructions](#instructions)
for that operating system.

Then copy `node_modules/oracledb` and Oracle client libraries to the
offline computer.  Windows users should see [Copying node-oracledb
Binaries on Windows](#winbins) and make sure the correct Visual Studio
Redistributable is also installed.

#### 3.12.2 Manual Install Using Pre-built Binaries

If pre-built node-oracledb binaries are available for your version
of Node.js and operating system, you can install manually:

- On a computer that has internet access, navigate to a release on the
  [GitHub Release][41] page.

  Download the release's main node-oracledb package, for example
  `oracledb-2.0.15.tgz`.

  Also download the appropriate binary package, for example
  `oracledb-v2.0.15-node-v57-darwin-x64.gz`. To determine the correct
  binary package, find your Node.js module version, platform and
  architecture using:

  - `node -p 'process.versions.modules'`
  - `node -p 'process.platform'`
  - `node -p 'process.arch'`

  For example, when installing node-oracledb 2.0.15 on macOS with
  Node.js 8, these commands will show the module version is '57', the
  platform is 'darwin' and the architecture is 'x64'.  The package to
  download is `oracledb-v2.0.15-node-v57-darwin-x64.gz`

  If an appropriate package is not available, follow the
  [Node-oracledb Installation Instructions](#instructions) for your
  operating system and build node-oracledb from source code.

- Use an operating system utility to extract the main package to
  `node_modules/oracledb`. For example:

  ```
  mkdir node_modules/oracledb
  cd node_modules/oracledb
  tar -xzf oracledb-2.0.15.tgz
  ```

  The node_modules directory will contain:

  ```
  node_modules/
  |-- oracledb
       |-- CHANGELOG.md
       |-- LICENSE.md
       |-- README.md
       |-- index.js
       |-- lib
       |-- |-- connection.js
       |-- |-- lob.js
       |-- |-- oracledb.js
       |-- |-- pool.js
       |-- |-- querystream.js
       |-- |-- resultset.js
       |-- |-- util.js
       |-- oracledb-2.0.15.tgz
       |-- package
       |-- |-- extractpackage.js
       |-- |-- oracledbinstall.js
       |-- |-- util.js
       |-- package.json
  ```

- Locate `node_modules/oracledb/package/extractpackage.js` and use it
  to unarchive the binary package, for example:

  ```
  node extractpackage.js path=oracledb-v2.0.15-node-v57-darwin-x64.gz
  ```

- Create the subdirectory `node_modules/oracledb/build/Release` and
  move the extracted `oracledb.node` binary to
  `node_modules/oracledb/build/Release/oracledb.node`

- Then copy `node_modules/oracledb` and Oracle client libraries to the
  offline computer.  Windows users should see [Copying node-oracledb
  Binaries on Windows](#winbins) and make sure the correct Visual
  Studio Redistributable is also installed.


## <a name="installingv1"></a> 4. Installing Node-oracledb 1.x

If you need to install the previous node-oracledb 1.x add-on, refer to
the steps in the [version 1.x INSTALL guide][32].  To get an old
add-on you must explictly use its version when installing:

```
npm install oracledb@1.13.1
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

**Review the [Node-oracledb Installation Instructions](#instructions)**.

If `npm install oracledb` fails:

- Use `npm install --verbose oracledb`.  Review your output and logs.
  Try to install in a different way.  **Google anything that looks like
  an error.** Try some potential solutions.

- Was there a network connection error?  Do you need to set
  `http_proxy` and/or `https_proxy`?

- Was a pre-built node-oracledb binary available?  If not, you will need
  to compile one from source code.

- Does your compiler have C++11 support, e.g. use VS 2013 or GCC 4.7.

- Do you have Python 2.7?  Run `python --version`.

- Do you have an old version of `node-gyp` installed?  Try updating
  it.  Also try deleting `$HOME/.node-gyp` or equivalent.

- Try running `npm cache clean -f` and deleting the
  `node_modules/oracledb` directory.

If `require('oracledb')` fails:

- If you got **NJS-045: cannot load the oracledb add-on binary for
  Node.js** or **DPI-1047: Oracle Client library cannot be loaded**,
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

- On Windows try a dependency walker.  Check your
  `node_modules/oraclebd/build/Release/oracledb.node` binary can
  locate the Oracle client libraries and VS Redistributable.

- Do you have multiple copies of Oracle libraries installed?  Is the
  expected version first in `PATH` (on Windows) or `LD_LIBRARY_PATH`
  (on Linux)?

- On macOS, did you install Oracle Instant Client in `~/lib` or
  `/usr/local/lib`?

- Do you have multiple copies of Node.js installed?  Did the correct
  `npm` and `node-gyp` get invoked?

- Did you get **Error: Module version mismatch** or **Error: Module
  did not self-register**?  You must rebuild node-oracledb when you
  upgrade Node.js.

[1]: https://github.com/oracle/node-oracledb
[2]: https://www.python.org/downloads/
[3]: http://www.oracle.com/technetwork/database/features/instant-client/index-097480.html
[4]: https://www.npmjs.com/package/oracledb
[5]: https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6
[6]: https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1
[7]: https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connectionstrings
[8]: https://www.oracle.com/technetwork/community/oca-486395.html
[9]: https://www.github.com/oracle/odpi
[10]: https://github.com/oracle/node-oracledb/issues
[11]: http://nodejs.org
[12]: http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html
[13]: http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst
[14]: https://linux.oracle.com
[15]: https://docs.oracle.com/database/122/NETRF/local-naming-parameters-in-tnsnames-ora-file.htm#NETRF007
[16]: https://docs.oracle.com/database/122/NETRF/parameters-for-the-sqlnet-ora-file.htm#NETRF006
[17]: https://docs.oracle.com/database/122/NETRF/directory-usage-parameters-in-ldap-ora-file.htm#NETRF011
[18]: https://docs.oracle.com/database/122/LNOCI/more-oci-advanced-topics.htm#LNOCI-GUID-CD599644-135A-4116-8B3B-40A9BA172E5C
[19]: https://github.com/oracle/node-oracledb/tree/master/examples
[20]: http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html
[21]: https://blogs.oracle.com/opal/the-easiest-way-to-install-oracle-database-on-apple-mac-os-x
[22]: http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html
[23]: https://docs.oracle.com/database/
[24]: https://docs.oracle.com/database/122/NTCLI/toc.htm
[25]: http://www.oracle.com/technetwork/topics/winx64soft-089540.html
[26]: http://www.oracle.com/technetwork/topics/winsoft-085727.html
[27]: https://support.microsoft.com/en-us/kb/2977003#bookmark-vs2013
[28]: https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads#bookmark-vs2010
[29]: https://www.microsoft.com/en-us/download/details.aspx?id=18471
[30]: http://www.oracle.com/technetwork/topics/aix5lsoft-098883.html
[31]: http://www.oracle.com/technetwork/topics/solx8664soft-097204.html
[32]: https://github.com/oracle/node-oracledb/blob/node-oracledb-v1/INSTALL.md
[33]: http://www.oracle.com/technetwork/community/developer-vm/index.html#dbapp
[34]: https://www.virtualbox.org
[35]: http://www.oracle.com/technetwork/database/enterprise-edition/downloads/
[36]: https://store.docker.com/
[37]: http://yum.oracle.com/
[38]: https://livesql.oracle.com/
[39]: https://asktom.oracle.com/
[40]: https://github.com/oracle/node-oracledb/tags
[41]: https://github.com/oracle/node-oracledb/releases
