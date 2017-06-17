# Installing node-oracledb

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

1. [Overview](#overview)
2. [Installing or Working with node-oracledb from GitHub](#github)
3. [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
4. [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
5. [Node-oracledb Installation on Linux with a Local Database](#instoh)
6. [Node-oracledb Installation on macOS with Instant Client](#instosx)
7. [Node-oracledb Installation on Windows](#instwin)
8. [Copying node-oracledb Binaries on Windows](#winbins)
9. [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
10. [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)

## <a name="overview"></a> 1. Overview

The [*node-oracledb*](https://github.com/oracle/node-oracledb) add-on for Node.js powers high performance Oracle Database applications.

The steps below create a Node.js installation for testing.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node 4,
6 and 8 on 64-bit Oracle Linux and Windows.  The add-on can also build
on macOS, and some 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.

**Note**: Installation steps have changed significantly between
node-oracledb 1.x and node-oracledb 2.x.  Installation no longer
requires Oracle header files.  Node-oracledb environment variables
`OCI_INC_DIR` and `OCI_LIB_DIR` are no longer required.  At runtime,
the Oracle libraries must be in the default library search path, such
as `PATH` or `LD_LIBRARY_PATH` because the Oracle client libraries are
dynamically loaded at run time. 'Rpath' linking is no longer performed
on Linux or macOS.

### <a name="prerequisites"></a> Prerequisites

To use node-oracledb the Oracle 11.2, 12.1 or 12.2 client libraries
must be available.  These are included
in
[Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-097480.html) RPMs
or ZIPs, a full Oracle Client, or a database on the same machine.
Oracle's standard client-server network interoperability applies, see
Oracle
Support's
[Doc ID 207303.1](https://support.oracle.com/epmos/faces/DocumentDisplay?id=207303.1).
In summary, Oracle Client 12.2 can connect to Oracle Database 11.2 or
greater. Oracle Client 12.1 can connect to Oracle Database 10.2 or
greater. Oracle Client 11.2 can connect to Oracle Database 9.2 or
greater.

A compiler is required.  Use Visual Studio on Windows, GCC on Linux or
Xcode on macOS.  **When building with Node 4 onward, the compiler must
support C++11.**  Note the default compiler on Oracle Linux 6 and RHEL 6
does not have the required support.  Install [GCC 4.7 or later](https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6)
or upgrade to Oracle Linux 7.

Python 2.7 is needed by node-gyp.  If another version of Python occurs
first in your binary path then, when you install node-oracledb, use
the `--python` option to indicate the correct version.  For example:
`npm install --python=/whereever/python-2.7/bin/python oracledb`.

### Which Instructions to Follow

Instructions may need to be adjusted for your platform, environment and versions being used.

I have ... | Follow this ...
----------|-----------------
Windows | [Node-oracledb Installation on Windows](#instwin)
Apple macOS | [Node-oracledb Installation on macOS with Instant Client](#instosx)
Linux.  My database is on another machine  | [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm) or [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
Linux.  My database is on the same machine | [Node-oracledb Installation on Linux with a Local Database](#instoh)
Linux. I have the full Oracle client (installed via `runInstaller`) on the same machine | [Node-oracledb Installation on Linux with a Local Database](#instoh)
AIX on Power Systems | [Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files](#instaix)
Solaris x86-64 (64-Bit) | [Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files](#instsolarisx8664)
Another OS with Oracle Database 11.2 or 12c, or client libraries available | Update binding.gyp and make any code changes required, sign the [OCA](https://www.oracle.com/technetwork/community/oca-486395.html), and submit a pull request with your patch.
Source code from GitHub | Start with [Installing or Working with node-oracledb from GitHub](#github) and then follow relevant platform instructions.

### Other Resources Useful for node-oracledb

Node-oracledb can be installed on the pre-built
[*Database App Development VM*](http://www.oracle.com/technetwork/community/developer-vm/index.html#dbapp) for [VirtualBox](https://www.virtualbox.org),
which has Oracle Database 12c pre-installed on Oracle Linux.   If you want to use your
own database, installing the free
[Oracle Database 11.2 'XE' Express Edition](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
is quick and easy.  Other database editions may be downloaded
[here](http://www.oracle.com/technetwork/database/enterprise-edition/downloads/) or [used with Docker](https://store.docker.com/).  If you want to
install Oracle Linux yourself, it is free from
[here](http://public-yum.oracle.com/).

## <a name="github"></a> 2. Installing or Working with node-oracledb from GitHub

If you download or clone node-oracledb code
from [GitHub](https://github.com/oracle/node-oracledb), instead of
installing from [npm](https://www.npmjs.com/package/oracledb), you
need to make sure
the [ODPI-C submodule](https://www.npmjs.com/package/oracledb/odpi) is
also included.  Otherwise the build will fail with an error like
**'dpi.h' file not found**.

If you download a node-oracledb ZIP file from GitHub, you must
separately download the ODPI-C submodule code and extract it into the
`odpi` directory.

If you clone the GitHub repository, you need to additionally run:

```
git submodule init
git submodule update
```

Follow the platform specific instructions to build node-oracledb.

## <a name="instrpm"></a> 3. Node-oracledb Installation on Linux with Instant Client RPMs

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 3.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.
The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6) or
upgrade to Oracle Linux 7.

Python 2.7 is needed by node-gyp.  If another version of Python occurs
first in your binary path then, when you install node-oracledb, use
the `--python` option to indicate the correct version.  For example:
`npm install --python=/whereever/python-2.7/bin/python oracledb`.

### 3.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"](http://nodejs.org)
package.  For example, if you downloaded version 6.9.4 for 64-bit you
could install Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v6.9.4-linux-x64.tar.xz
```

Set PATH to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

### 3.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

Note: A compiler supporting C++11 is required when building with
Node.js 4 or later, otherwise the NAN component will fail to build.

### 3.4 Install the free Oracle Instant Client 'Basic' RPM

Download the **Basic** RPM from [Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html) and
[install it](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst) with sudo or as the root user:

```
sudo yum install oracle-instantclient12.2-basic-12.2.0.1.0-1.x86_64.rpm
```

This will install `libaio`, if not already present.

If you have a [ULN](https://linux.oracle.com) subscription, you can
alternatively use `yum` to install the Basic package after enabling
the correct channel for your version of Linux.

If there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /usr/lib/oracle/12.2/client64/lib > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

Alternatively, every shell running Node.js will need to have the link path set:

```
export LD_LIBRARY_PATH=/usr/lib/oracle/12.2/client64/lib
```

### 3.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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


## <a name="instzip"></a> 4. Node-oracledb Installation on Linux with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 4.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.
The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6) or
upgrade to Oracle Linux 7.

Python 2.7 is needed by node-gyp.  If another version of Python occurs
first in your binary path then, when you install node-oracledb, use
the `--python` option to indicate the correct version.  For example:
`npm install --python=/whereever/python-2.7/bin/python oracledb`.

### 4.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"](http://nodejs.org)
package.  For example, if you downloaded version 6.9.4 for 64-bit you
could install Node.js into `/opt`:

```
cd /opt
tar -Jxf node-v6.9.4-linux-x64.tar.xz
```

Set PATH to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

### 4.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

Note: A compiler supporting C++11 is required when building with
Node.js 4 or later, otherwise the NAN component will fail to build.

### 4.4 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html) and
[unzip it](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst) into a directory accessible to your application,
for example:

```
unzip instantclient-basic-linux.x64-12.2.0.1.0.zip
mkdir -p /opt/oracle
mv instantclient_12_2 /opt/oracle
```

You will need `libaio` installed.  On some platforms the package is
called `libaio1`.

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_12_2:$LD_LIBRARY_PATH
```

Alternatively, if there is no other Oracle software on the machine
that will be impacted, then permanently add Instant Client to the
run-time link path.  For example, with sudo or as the root user:

```
sudo sh -c "echo /opt/oracle/instantclient_12_2 > /etc/ld.so.conf.d/oracle-instantclient.conf"
sudo ldconfig
```

### 4.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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

## <a name="instoh"></a> 5. Node-oracledb installation on Linux with a Local Database

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 5.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.
The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/getting-a-c11-compiler-for-node-4,-5-and-6-on-oracle-linux-6) or
upgrade to Oracle Linux 7.

Python 2.7 is needed by node-gyp.  If another version of Python occurs
first in your binary path then, when you install node-oracledb, use
the `--python` option to indicate the correct version.  For example:
`npm install --python=/whereever/python-2.7/bin/python oracledb`.

The `ORACLE_HOME` can be either a database home or a full Oracle
client installation installed with Oracle's `runInstaller`.

For easy development, the free
[Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
version of the database is available on Linux.  Applications
developed with XE may be immediately used with other editions of the
Oracle Database.

### 5.2 Install Node.js

Download and extract the [Node.js "Linux Binaries"](http://nodejs.org)
package.  For example, if you downloaded version 6.9.4 for 64-bit you
could install Node.js into `/opt`:

```
cd /opt
tar -zxf node-v6.9.4-linux-x64.tar.gz
```

Set your PATH variable to include Node.js:

```
export PATH=/opt/node-v6.9.4-linux-x64/bin:$PATH
```

### 5.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

### 5.4 Run an example program

Set required Oracle environment variables, such as `ORACLE_HOME` by
executing:

```
source /usr/local/bin/oraenv
```

Or, if you are using Oracle XE, by executing:

```
source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh
```

Set `LD_LIBRARY_PATH` to the Oracle library directory, if it was not
set by `oraenv` or `oracle_env.sh`:

```
export LD_LIBRARY_PATH=$ORACLE_HOME/lib
```

Make sure the Node.js process has directory and file access
permissions for the Oracle libraries and other files.

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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

## <a name="instosx"></a> 6. Node-oracledb Installation on macOS with Instant Client

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 6.1 Install Prerequisites

Install Xcode from the Mac App store.

### 6.2 Install Node.js

Download the [Node.js package](http://nodejs.org) for macOS 64-bit and install it.

### 6.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

### 6.4 Install the free Oracle Instant Client 12.1 'Basic' ZIP file

Download the  **Basic** 64-bit ZIP from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html) and
unzip it, for example:

```
unzip instantclient-basic-macos.x64-12.1.0.2.0.zip
```

Create a symbolic link for the 'client shared library' in the user
default library path such as in `~/lib` or `/usr/local/lib`.  For example:

```
mkdir ~/lib
ln -s instantclient_12_1/libclntsh.dylib.12.1 ~/lib/
```

Alternatively, copy the required OCI libraries, for example:

```
mkdir ~/lib
cp instantclient_12_1/{libclntsh.dylib.12.1,libclntshcore.dylib.12.1,libons.dylib,libnnz12.dylib,libociei.dylib} ~/lib/
```

For Instant Client 11.2, the OCI libraries must be copied. For example::

```
mkdir ~/lib
cp /opt/oracle/instantclient_11_2/{libclntsh.dylib.11.1,libnnz11.dylib,libociei.dylib} ~/lib/
```

### 6.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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

To run a database on macOS, one option is to use VirtualBox,
see
[The Easiest Way to Install Oracle Database on Mac OS X](https://blogs.oracle.com/opal/the-easiest-way-to-install-oracle-database-on-apple-mac-os-x).

## <a name="instwin"></a> 7. Node-oracledb Installation on Windows

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

**Note**: An Oracle Technology Network article
[Installing node-oracledb on Microsoft Windows](https://community.oracle.com/docs/DOC-931127)
has step-by-step Windows installation instructions that you can
alternatively refer to.

### <a name="winprereqs"></a> 7.1 Install Prerequisites

Install a C/C++ build environment such as Microsoft Visual
Studio 2015.  Compilers supported by Oracle libraries are found in
[Oracle documentation](https://docs.oracle.com/en/database/) for each version, for example
[Oracle Database Client Installation Guide 12c Release 2 (12.2) for Microsoft Windows](https://docs.oracle.com/database/122/NTCLI/toc.htm).

The `PATH` variable needs to include the appropriate Visual Studio
redistributables for the Oracle client.  This should be part of your VS
install.  Specifically:
- The Oracle client 11.2 requires the [Visual Studio 2005 redistributable](https://www.microsoft.com/en-us/download/details.aspx?id=18471).
- The Oracle client 12.1 requires the [Visual Studio 2010 redistributable](https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads#bookmark-vs2010).
- The Oracle client 12.2, requires ththe [Visual Studio 2013 redistributable](https://support.microsoft.com/en-us/kb/2977003#bookmark-vs2013).

Install the Python 2.7 MSI from
[www.python.org](https://www.python.org/downloads).  Select the
customization option to "Add python.exe to Path".

If you use a 32-bit Node.js, make sure to use a 32-bit Oracle client.
Otherwise use a 64-bit Node.js with a 64-bit Oracle client.  The
instructions below use a 64-bit stack.

### 7.2 Install Node.js

Install the 64-bit Node.js  MSI (e.g. node-v6.11.0-x64.msi) from
[nodejs.org](http://nodejs.org/).  Make sure the option to
add the Node and npm directories to the path is selected.

### 7.3 Install the add-on

Start Visual Studio and open a Developer Command Prompt within it.

Use `set PATH` in the shell to confirm the Python, Node.js and Oracle
directories are correctly set.  If they are not, then set `PATH`
manually in the shell, or set it in the System Properties panel and
restart the command shell.

Make sure the Microsoft Visual Studio environment variables are set
appropriately.  Use `set PATH` and verify it contains your Visual
Studio paths.  If they are not set, use vcvars64.bat (or vcvars.bat if
you building with 32-bit binaries) to set the environment.
Alternatively you can open the 'Developer Command Prompt for Visual
Studio' which has environment variables already configured.

If you are installing with a local database or the full Oracle client,
make sure that `PATH` contains the correct binary directory, for
example `C:\oracle\product\12.1.0\dbhome_1\bin`.

If you are behind a firewall you may need to set your proxy, for
example:

```
set http_proxy=http://my-proxy.example.com:80/
set https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

### 7.4 Install the free Oracle Instant Client ZIP

Building and running node-oracledb needs appropriate Oracle client
libraries installed first.  These libraries:

- are included in (i) Oracle database, or (ii) in the full Oracle client, or (iii) in Oracle Instant Client.  You need one of these.
- must be version 11.2 or greater
- must match the Node.js 32-bit or 64-bit architecture

If you need appropriate Oracle client libraries, then download the
free Instant Client **Basic** ZIP file from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/winx64soft-089540.html).

Extract `instantclient-basic-windows.x64-12.2.0.1.0.zip`

Add the directory to `PATH`.  For example on Windows 7, update `PATH`
in Control Panel -> System -> Advanced System Settings -> Advanced ->
Environment Variables -> System variables -> `PATH` and add your path,
such as `C:\oracle\instantclient_12_2`.

If you have multiple versions of Oracle libraries installed, make sure
the desired version occurs first in the path.

### 7.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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

## <a name="winbins"></a> 8. Copying node-oracledb Binaries on Windows

Node-oracledb binaries can be copied between compatible Windows systems.

Both computers must also have the same version and architecture of Node.js.

Oracle client libraries of the same architecture and the same version
used for building node-oracledb should be in the destination
computer's `PATH`.

After node-oracle has been built on the source computer, copy the
`node_modules\oracledb` directory to the destination computer's
`node_module` directory.

The destination computer's `PATH` needs to include Visual Studio
redistributables.  If you used Oracle client 11.2 then the Visual
Studio 2005 redistributable is required.  For Oracle client 12.1, use
the Visual Studio 2010 redistributable.  For Oracle client 12.2, use
the Visual Studio 2013 redistributable.

You can also find out the version required by locating the library
`OCI.DLL` on the source computer and running:

```
dumpbin /dependents oci.dll
```

The version of `MSVC*.DLL` in the output indicates which
redistributable is required on the destination computer.  For example,
if you see `MSVCR100.dll` then you need the VC++ 10 redistributable.

## <a name="instaix"></a> 9. Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files

**THIS SECTION HAS NOT BEEN VERIFIED FOR NODE-ORACLEDB 2.x**

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 9.1 Install Node.js

Download [Node.js](https://nodejs.org/) for AIX on Power Systems.

Execute the downloaded shell script.  For example, if you
downloaded Node 4.2 then run:

```
sh node-v4.2.1-aix-ppc64.bin
```

It will prompt for the Install Folder and Link Folder.  Give the
desired location, for example `/opt`, where the Node binary will be
built.

On completion, a success message will be displayed

Set `PATH` to include the Node.js and Node-gyp binaries:

```
export PATH=/opt/node-v4.2.1/bin:/opt/node-v4.2.1/lib/node_modules/npm/bin/node-gyp-bin:$PATH
```

### 9.2 Install the add-on

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

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

Note: The version of `make` should be GNU Make 4.1-1 or above.

### 9.3 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Download the **Basic** ZIP file from
[Oracle Technology Network]( http://www.oracle.com/technetwork/topics/aix5lsoft-098883.html)
and extract it into a directory that is accessible to your application, for example `/opt/oracle`:

```
cd /opt/oracle
unzip instantclient-basic-aix.ppc64-12.1.0.2.0.zip
```

To run applications, you will need to set the link path:

```
export LIBPATH=/opt/oracle/instantclient_12_1:$LIBPATH
```

### 9.4 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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

## <a name="instsolarisx8664"></a> 10. Node-oracledb Installation on Oracle Solaris x86-64 (64-Bit) with Instant Client ZIP files

**THIS SECTION HAS NOT BEEN VERIFIED FOR NODE-ORACLEDB 2.x**

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 10.1 Install Node.js

Download the [Node.js source code](https://nodejs.org/).

Compile and build the Node.js engine into a directory of your choice,
such as `/opt/node`:

```
./configure --dest-cpu=x64 --dest-os=solaris --prefix=/opt/node
make
make install
```

Note: if warnings are shown for `objdump` and `dtrace`, then set
`PATH` to include these binaries.  This is most likely `/usr/gnu/bin`
and `/usr/bin`, respectively.

Set `PATH` to include the Node.js and Node-gyp binaries

```
export PATH=/opt/node/bin:/opt/node/lib/node_modules/npm/bin/node-gyp-bin:$PATH
```

### 10.2 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
export https_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[npm registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

### 10.3 Install the free Oracle Instant Client 'Basic' ZIP file

Download the **Basic** ZIP file from
[Oracle Technology Network]( http://www.oracle.com/technetwork/topics/solx8664soft-097204.html )
and extract it into a directory that is accessible to your application, for example `/opt/oracle`:

```
cd /opt/oracle
unzip instantclient-basic-solaris.x64-12.2.0.1.0.zip
```

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_12_2:$LD_LIBRARY_PATH_64
```

### 10.4 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

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
