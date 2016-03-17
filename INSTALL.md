# Installing node-oracledb

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

## Contents

1. [Overview](#installation)
2. [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
3. [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
4. [Node-oracledb Installation on Linux with a Local Database](#instoh)
5. [Node-oracledb Installation on OS X with Instant Client](#instosx)
6. [Node-oracledb Installation on Windows](#instwin)
7. [Copying node-oracledb Binaries on Windows](#winbins)
8. [Advanced Installation on Linux](#linuxadv)

## <a name="overview"></a> 1. Overview

The [*node-oracledb*](https://github.com/oracle/node-oracledb) add-on for Node.js powers high performance Oracle Database applications.

The steps below create a Node.js installation for testing.  Adjust the
steps for your environment.

This node-oracledb release has been tested with Node 0.10, 0.12, 4.2 LTS
and 5 on 64-bit Oracle Linux and Windows.  The add-on can also build
in some Mac OS X, 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.

### Prerequisites

Installation requires Oracle 11.2 or 12.1 client libraries.
These are included in Oracle Instant Client RPMs or ZIPs, a full
Oracle Client, or a database on the same machine.  Oracle's standard
client-server network compatibility applies.  For example, with Oracle
Client 12.1 you can connect to Oracle Database 10.2 or greater.  Use
Oracle Client 11.2 if you need to connect to Oracle Database 9.2.

A compiler is required.  Use Visual Studio on Windows, gcc on Linux or
Xcode on OS X.  When building with Node 4 onwards, the compiler must support
C++11.  Note the default compiler on Oracle Linux 6 and RHEL 6 does
not have the required support.  Install a newer compiler or upgrade to
Oracle Linux 7.

Python 2.7 is needed by node-gyp.  If another version of Python occurs
first in your binary path then, when you install node-oracledb, use
the `--python` option to indicate the correct version.  For example:
`npm install --python=/whereever/python-2.7/bin/python oracledb`.

### Which Instructions to Follow

Instructions may need to be adjusted for your platform and environment.

I have ... | Follow this ...
----------|-----------------
Linux.  My database is on another machine.  | [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
Solaris or AIX.  My database is on another machine. | [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
Linux, Solaris or AIX.  My database is on the same machine. |  [Node-oracledb Installation on Linux with a Local Database](#instoh)
Linux, Solaris or AIX. I have the full Oracle client (installed via runInstaller) on the same machine. |  [Node-oracledb Installation on Linux with a Local Database](#instoh)
Apple OS X | [Node-oracledb Installation on OS X with Instant Client](#instosx)
Windows | [Node-oracledb Installation on Windows](#instwin)
Another OS with Oracle 11.2 or 12.1 libraries available | Update binding.gyp and make any code changes required, sign the [OCA](https://www.oracle.com/technetwork/community/oca-486395.html), and submit a pull request with your patch.

### Other Resources Useful for node-oracledb

Node-oracledb can be installed on the pre-built
[*Database App Development VM*](http://www.oracle.com/technetwork/community/developer-vm/index.html#dbapp) for [VirtualBox](https://www.virtualbox.org),
which has Oracle Database 12c pre-installed on Oracle Linux.   If you want to install your
own database, installing the free
[Oracle Database 11.2 'XE' Express Edition](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
is quick and easy.  Other database editions may be downloaded
[here](http://www.oracle.com/technetwork/database/enterprise-edition/downloads/).  If you want to
install Oracle Linux yourself, it is free from
[here](http://public-yum.oracle.com/).

## <a name="instrpm"></a> 2. Node-oracledb Installation on Linux with Instant Client RPMs

### 2.1 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org) and
extract the file, for example into `/opt`:

```
cd /opt
tar -Jxf node-v4.2.3-linux-x64.tar.xz
```

Set PATH to include Node.js:

```
export PATH=/opt/node-v4.2.3-linux-x64/bin:$PATH
```

### 2.2 Install the free Oracle Instant Client 'Basic' and 'SDK' RPMs

Download the free **Basic** and **SDK** RPMs from [Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html) and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst) as the root user:

```
rpm -ivh oracle-instantclient12.1-basic-12.1.0.2.0-1.x86_64.rpm
rpm -ivh oracle-instantclient12.1-devel-12.1.0.2.0-1.x86_64.rpm
```

If you have a [ULN](https://linux.oracle.com) subscription, you can
alternatively use `yum` to install these packages from the
*Oracle Software for Oracle Linux* channel for your version of Linux.

### 2.3 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

or, in `csh`:

```
setenv http_proxy http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

Node-oracledb will automatically be configured to use the highest version
Instant Client RPMs installed.  To use a different version, follow the
instructions to
[install on Linux with Instant Client ZIP files](#instzip) instead,
setting the install-time variables `OCI_LIB_DIR` and `OCI_INC_DIR` to
the appropriate directories.

If you have other Oracle software installed on the same machine, and
the run time linker is configured to find this other software via
`LD_LIBRARY_PATH` or `ldconfig`, then update the environment to use
the Instant Client RPM libraries, for example
`/usr/lib/oracle/12.1/client64/lib`.

Note: A compiler supporting C++11 is required when building with
Node.js 4 or later, otherwise the NAN component will fail to build.

### 2.4 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment.

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

## <a name="instzip"></a> 3. Node-oracledb Installation on Linux with Instant Client ZIP files

### 3.1 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org/) and
extract the file, for example into `/opt`:

```
cd /opt
tar -Jxf node-v4.2.3-linux-x64.tar.xz
```

Set PATH to include Node.js:

```
export PATH=/opt/node-v4.2.3-linux-x64/bin:$PATH
```

### 3.2 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Download the free **Basic** and **SDK** ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html)
and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst)
into the same directory:

```
cd /opt/oracle
unzip instantclient-basic-linux.x64-12.1.0.2.0.zip
unzip instantclient-sdk-linux.x64-12.1.0.2.0.zip
mv instantclient_12_1 instantclient
cd instantclient
ln -s libclntsh.so.12.1 libclntsh.so
```

You will need `libaio` installed.  On some platforms the package is
called `libaio1`.

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH
```

Alternatively, if there is no other Oracle software on the machine
that will be impacted, permanently add Instant Client to the run-time
link path.  Do this on Linux by creating a file
`/etc/ld.so.conf.d/oracle-instantclient.conf` that contains the library
location `/opt/oracle/instantclient`, and then run `ldconfig` as
the root user.

### 3.3 Install the add-on


Tell the installer where to find Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient_12_1
export OCI_INC_DIR=/opt/oracle/instantclient_12_1/sdk/include
```

These variables are only needed during installation.

If Instant Client is in `/opt/oracle/instantclient` and you have no
other Oracle software installed, then these variables are not
required.  See
[Oracle Client Location Heuristic on Linux](#linuxinstsearchpath).

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

or, in `csh`:

```
setenv http_proxy http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

Note: A compiler supporting C++11 is required when building with
Node.js 4 or later, otherwise the NAN component will fail to build.

### 3.4 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment:

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

## <a name="instoh"></a> 4. Node-oracledb installation on Linux with a Local Database

The ORACLE_HOME can be either a database home or a full Oracle client installation installed with Oracle's `runInstaller`.

For easy development, the free
[Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
version of the database is available on Linux.  Applications
developed with XE may be immediately used with other editions of the
Oracle Database.

### 4.1 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org/) and
extract the file, for example into `/opt`:

```
cd /opt
tar -zxf node-v4.2.3-linux-x64.tar.gz
```

Set your PATH variable to include Node.js:

```
export PATH=/opt/node-v4.2.3-linux-x64/bin:$PATH
```

### 4.2 Install the add-on

The installer will automatically look for Oracle libraries and headers under
`$ORACLE_HOME`, see
[Oracle Client Location Heuristic on Linux](#linuxinstsearchpath).
However, if you have Instant Client RPMs installed and don't wish the RPMs
to be used, you must explicitly set two environment variables:

```
export OCI_LIB_DIR=$ORACLE_HOME/lib
export OCI_INC_DIR=$ORACLE_HOME/rdbms/public
```

These variables are only needed during installation.

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

or, in `csh`:

```
setenv http_proxy http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

### 4.3 Run an example program

Set `LD_LIBRARY_PATH` to the Oracle library directory.  This variable,
and other variables used by Oracle clients, are typically set in a
shell by executing `source /usr/local/bin/oraenv`.  Or, if you are
using Oracle XE, execute `source
/u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh`.  The Node.js
process will need access permissions for the Oracle libraries and
other files.

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment:

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

## <a name="instosx"></a> 5. Node-oracledb Installation on OS X with Instant Client

### 5.1 Install Xcode

Building node-oracledb requires Xcode from the Mac App store.

### 5.2 Install Node.js

Download the [Node.js package](http://nodejs.org) for OS X 64-bit and install it.

### 5.3 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Do either of the options given in [5.3.1](#instosxICroot) or [5.3.2](#instosxICuser).

### <a name="instosxICroot"></a> 5.3.1 Install Instant Client in /opt

This first installation option puts Instant Client in the default
location used by the node-oracledb installer.  It requires root
access.  If you don't want to update system directories then follow
the alternative steps in [5.3.2](#instosxICuser).

Download the free **Basic** and **SDK** ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html)
and
[install them](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html#ic_osx_inst)
into the same directory:

```
sudo su -
unzip instantclient-basic-macos.x64-11.2.0.4.0.zip
unzip instantclient-sdk-macos.x64-11.2.0.4.0.zip
mkdir /opt/oracle
mv instantclient_11_2 /opt/oracle/instantclient
ln -s /opt/oracle/instantclient/libclntsh.dylib.11.1 /opt/oracle/instantclient/libclntsh.dylib
```

Link the OCI libraries into the default library path:

```
ln -s /opt/oracle/instantclient/{libclntsh.dylib.11.1,libnnz11.dylib,libociei.dylib} /usr/local/lib/
```

Continue with [5.4](#instosxICaddon).

### <a name="instosxICuser"></a> 5.3.2 Install Instant Client in a user directory

This is an alternative to [5.3.1](#instosxICroot)  that does not require root access.

Download the free **Basic** and **SDK** 64-bit ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html)
and
[install them](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html#ic_osx_inst)
into the same directory:

```
unzip instantclient-basic-macos.x64-11.2.0.4.0.zip
unzip instantclient-sdk-macos.x64-11.2.0.4.0.zip
cd instantclient_11_2
ln -s libclntsh.dylib.11.1 libclntsh.dylib
```

Link the OCI libraries into the user default library path:

```
mkdir ~/lib
ln -s $(pwd)/{libclntsh.dylib,libclntsh.dylib.11.1,libnnz11.dylib,libociei.dylib} ~/lib/
```

To allow the node-oracledb installer to find the Instant Client
libraries and headers, set the install-time variables `OCI_LIB_DIR`
and `OCI_INC_DIR` to the appropriate directories:

```
export OCI_LIB_DIR=~/lib
export OCI_INC_DIR=~/instantclient_11_2/sdk/include
```

These variables are only needed during installation.

### <a name="instosxICaddon"></a> 5.4 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

or, in `csh`:

```
setenv http_proxy http://my-proxy.example.com:80/
```

As a normal user, install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

### 5.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment:

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

To run a database on OS X, one option is to use VirtualBox,
see
[The Easiest Way to Install Oracle Database on Mac OS X](https://blogs.oracle.com/opal/entry/the_easiest_way_to_enable).

## <a name="instwin"></a> 6. Node-oracledb Installation on Windows

**Note**: An Oracle Technology Network article
[Installing node-oracledb on Microsoft Windows](https://community.oracle.com/docs/DOC-931127)
has step-by-step Windows installation instructions that you can
alternatively refer to.

### 6.1 Install required tools

Install a C/C++ build environment such as Microsoft Visual
Studio 2012.  Compilers supported by Oracle libraries are found in
[Oracle documentation](https://docs.oracle.com/en/database/) for each version, for example
[Oracle Database Client Quick Installation Guide 12c Release 1 (12.1) for Microsoft Windows x64 (64-Bit)](https://docs.oracle.com/database/121/NXCQI/toc.htm#NXCQI108).

Install the Python 2.7 MSI from
[www.python.org](https://www.python.org/downloads).  Select the
customization option to "Add python.exe to Path".

If you use a 32-bit Node.js, make sure to use a 32-bit Oracle client
during build and run time.  Otherwise use a 64-bit Node.js with a
64-bit Oracle client.  The instructions below use a 64-bit stack.

### 6.2 Install Node.js

Install the 64-bit Node.js  MSI (e.g. node-v4.2.3-x64.msi) from
[nodejs.org](http://nodejs.org/).  Make sure the option to
add the Node and npm directories to the path is selected.

### 6.3 Install the free Oracle Instant Client ZIPs

Building and running node-oracledb needs appropriate Oracle client
libraries installed first.  These libraries:

- are included in (i) Oracle database, or (ii) in the full Oracle client, or (iii) in Oracle Instant Client.  You need one of these.
- must be version 11.2 or greater
- must match the Node.js 32 or 64-bit architecture

If you need appropriate Oracle client libraries, then download the
free Instant Client **Basic** and **SDK** ZIP files from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/winx64soft-089540.html).

Extract `instantclient_basic-windows.x64-12.1.0.2.0.zip` and
`instantclient_sdk-windows.x64-12.1.0.2.0.zip` to the same directory.

Optionally rename the resulting Instant Client directory to the
default location used by the node-oracledb installer:

```
ren C:\instantclient_12_1 C:\oracle\instantclient
```

Add the directory to `PATH`.  For example on Windows 7, update `PATH`
in Control Panel -> System -> Advanced System Settings -> Advanced ->
Environment Variables -> System variables -> `PATH` and add your path,
such as `C:\oracle\instantclient`.

If you have multiple versions of Oracle libraries installed, make sure
the desired version occurs first in the path.

### 6.4 Install the add-on

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

Tell the installer where to locate the Oracle client libraries and
header files by setting the `OCI_LIB_DIR` and `OCI_INC_DIR` variables.
These variables are only needed during installation, not at run time.
Do *not* add them to `PATH`.

For Instant Client use:

```
set OCI_LIB_DIR=C:\oracle\instantclient\sdk\lib\msvc
set OCI_INC_DIR=C:\oracle\instantclient\sdk\include
```

If you are installing with a local database or the full Oracle client,
then locate the Oracle directory and set the node-oracle installer
variables similar to:

```
set OCI_LIB_DIR=C:\oracle\product\12.1.0\dbhome_1\oci\lib\msvc
set OCI_INC_DIR=C:\oracle\product\12.1.0\dbhome_1\oci\include
```

In this case, also make sure that `PATH` contains `C:\oracle\product\12.1.0\dbhome_1\bin`.

If you are behind a firewall you may need to set your proxy, for
example:

```
set http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

### 6.5 Run an example program

Download the
[example programs](https://github.com/oracle/node-oracledb/tree/master/examples) from GitHub.

Edit `dbconfig.js` and set the database credentials to your
environment:

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

## <a name="winbins"></a> 7. Copying node-oracledb Binaries on Windows

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
Studio 2005 restributable is required.  For Oracle client 12.1, use
the Visual Studio 2010 redistributable.

You can also find out the version required by locating the library
`OCI.DLL` on the source computer and running:

```
dumpbin /dependents oci.dll
```

The version of `MSVC*.DLL` in the output indicates which
redistributable is required on the destination computer.  For example,
if you see `MSVCR100.dll` then you need the VC++ 10 redistributable.

## <a name="linuxadv"></a> 8. Advanced Installation on Linux

### <a name="linuxinstsearchpath"></a> Oracle Client Location Heuristic on Linux

On Linux, the node-oracledb installer looks for Oracle client libraries and headers in the following search order:

1. Using install-time environment variables `$OCI_LIB_DIR` and `$OCI_INC_DIR`
2. In the highest version Instant Client RPMs installed
3. In `$ORACLE_HOME`
4. In `/opt/oracle/instantclient`

### Instant Client RPMs and RPATH

On Linux, if Instant Client RPMs are auto-detected and used during
installation, then the Instant Client library directory is added to
the run time library search path via the rpath linker option.

This means that using node-oracledb with Instant Client RPMs does not
require the node-oracledb installation variables `OCI_LIB_DIR` or
`OCI_INC_DIR` to be set, and does not require `LD_LIBRARY_PATH` or
`ldconfig` configuration for run time.  Installation is simply:

```
rpm -ivh oracle-instantclient12.1-basic-12.1.0.2.0-1.x86_64.rpm
rpm -ivh oracle-instantclient12.1-devel-12.1.0.2.0-1.x86_64.rpm
npm install oracledb
node example.js
```

### Using Instant Client RPMs without RPATH

If you want to use Instant Client RPMs without using rpath, then set
`OCI_LIB_DIR` and `OCI_INC_DIR` prior to installation, for example:

```
export OCI_LIB_DIR=/usr/lib/oracle/12.1/client64/lib
export OCI_INC_DIR=/usr/include/oracle/12.1/client64
npm install oracledb
unset OCI_LIB_DIR OCI_INC_DIR
export LD_LIBRARY_PATH=/usr/lib/oracle/12.1/client64/lib:$LD_LIBRARY_PATH
node example.js
```

This is useful if you will need to upgrade Oracle Instant Client RPMs
to a new major or minor version (for example from 11.2 to 12.1)
without re-installing node-oracledb.

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

### Forcing RPATH

If you want to force using rpath when installing node-oracledb on
Linux, then set the node-oracledb installation variable `FORCE_RPATH`
to any value.  For example:

```
export OCI_LIB_DIR=/opt/oracle/instantclient
export OCI_INC_DIR=/opt/oracle/instantclient/sdk/include
FORCE_RPATH=1 npm install oracledb
unset OCI_LIB_DIR OCI_INC_DIR
node example.js
```
