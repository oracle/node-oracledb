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
2. [Node-oracledb Installation on Linux with Instant Client RPMs](#instrpm)
3. [Node-oracledb Installation on Linux with Instant Client ZIP files](#instzip)
4. [Node-oracledb Installation on Linux with a Local Database](#instoh)
5. [Advanced Installation on Linux](#linuxadv)
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
6 and 7 on 64-bit Oracle Linux and Windows.  The add-on can also build
in some macOS, 32-bit Linux, 32-bit Windows, Solaris and AIX
environments, but these architectures have not been fully tested.
Node 0.10 and 0.12 have been supported in the past and may
still be usable.

### <a name="prerequisites"></a> Prerequisites

Installation requires Oracle 11.2, 12.1 or 12.2 client libraries.
These are included
in
[Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-097480.html) RPMs
or ZIPs, a full Oracle Client, or a database on the same machine.
Oracle's standard client-server network interoperability applies, see
Oracle Support's Doc ID 207303.1.  In summary, Oracle Client 12.2 can
connect to Oracle Database 11.2 or greater. Oracle Client 12.1 can
connect to Oracle Database 10.2 or greater. Oracle Client 11.2 can
connect to Oracle Database 9.2 or greater.

A compiler is required.  Use Visual Studio on Windows, GCC on Linux or
Xcode on macOS.  **When building with Node 4 onward, the compiler must
support C++11.**  Note the default compiler on Oracle Linux 6 and RHEL 6
does not have the required support.  Install [GCC 4.7 or later](https://blogs.oracle.com/opal/entry/getting_a_c_11_compatible)
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

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 2.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.

The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/entry/getting_a_c_11_compatible) or
upgrade to Oracle Linux 7.


### 2.2 Install Node.js

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

### 2.3 Install the free Oracle Instant Client 'Basic' and 'SDK' RPMs

Download the free **Basic** and **SDK** RPMs from [Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html) and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst) as the root user:

```
yum install oracle-instantclient12.2-basic-12.2.0.1.0-1.x86_64.rpm
yum install oracle-instantclient12.2-devel-12.2.0.1.0-1.x86_64.rpm
```

If you have a [ULN](https://linux.oracle.com) subscription, you can
alternatively use `yum` to install these packages from the
*Oracle Software for Oracle Linux* channel for your version of Linux.

### 2.4 Install the add-on

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
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
`/usr/lib/oracle/12.2/client64/lib`.

Note: A compiler supporting C++11 is required when building with
Node.js 4 or later, otherwise the NAN component will fail to build.

### 2.5 Run an example program

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

## <a name="instzip"></a> 3. Node-oracledb Installation on Linux with Instant Client ZIP files

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 3.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.

The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/entry/getting_a_c_11_compatible) or
upgrade to Oracle Linux 7.

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

### 3.3 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Download the free **Basic** and **SDK** ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html)
and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst)
into the same directory:

```
cd /opt/oracle
unzip instantclient-basic-linux.x64-12.2.0.1.0.zip
unzip instantclient-sdk-linux.x64-12.2.0.1.0.zip
mv instantclient_12_2 instantclient
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

### 3.4 Install the add-on

Tell the installer where to find Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient
export OCI_INC_DIR=/opt/oracle/instantclient/sdk/include
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

If Instant Client is in the default location
`/opt/oracle/instantclient` and you have no other Oracle software
installed, then these variables are not actually required.  See
[Oracle Client Location Heuristic on Linux](#linuxinstsearchpath).

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

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

## <a name="instoh"></a> 4. Node-oracledb installation on Linux with a Local Database

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 4.1 Install Prerequisites

GCC 4.7 (or later) is needed to install because compiling for Node 4
(or later) requires a C++11 compatible compiler.

The default compiler on Oracle Linux 6 and RHEL 6 does not have the
required C++11
support. Install
[GCC 4.7 or later](https://blogs.oracle.com/opal/entry/getting_a_c_11_compatible) or
upgrade to Oracle Linux 7.

The `ORACLE_HOME` can be either a database home or a full Oracle
client installation installed with Oracle's `runInstaller`.

For easy development, the free
[Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
version of the database is available on Linux.  Applications
developed with XE may be immediately used with other editions of the
Oracle Database.

### 4.2 Install Node.js

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

### 4.3 Install the add-on

Set required Oracle environment variables, such as `ORACLE_HOME` by
executing:

```
source /usr/local/bin/oraenv
```

Or, if you are using Oracle XE, by executing:

````
source /u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh
```

The node-oracledb installer will automatically look for Oracle
libraries and headers under `$ORACLE_HOME`, see
[Oracle Client Location Heuristic on Linux](#linuxinstsearchpath).
However, if you also have Instant Client RPMs installed and don't wish the
RPMs to be used, you must explicitly set two environment variables:

```
export OCI_LIB_DIR=$ORACLE_HOME/lib
export OCI_INC_DIR=$ORACLE_HOME/rdbms/public
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

### 4.4 Run an example program

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

## <a name="linuxadv"></a> 5. Advanced Installation on Linux

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
yum install oracle-instantclient12.2-basic-12.2.0.1.0-1.x86_64.rpm
yum install oracle-instantclient12.2-devel-12.2.0.1.0-1.x86_64.rpm
npm install oracledb
node example.js
```

### <a name="forcerpath"></a> Forcing RPATH

If rpath is not automatically enabled when installing node-oracledb on
Linux, you can force it to be used.  Do this by setting the
node-oracledb installation variable `FORCE_RPATH` to any value.  For
example when installing with a local database:

```
source /usr/local/bin/oraenv    # this sets ORACLE_HOME and LD_LIBRARY_PATH
FORCE_RPATH=1 npm install oracledb
node example.js
```

### Using Instant Client RPMs without RPATH

If you want to use Instant Client RPMs without using rpath, then set
`OCI_LIB_DIR` and `OCI_INC_DIR` prior to installation, for example:

```
export OCI_LIB_DIR=/usr/lib/oracle/12.2/client64/lib
export OCI_INC_DIR=/usr/include/oracle/12.2/client64
npm install oracledb
unset OCI_LIB_DIR OCI_INC_DIR
export LD_LIBRARY_PATH=/usr/lib/oracle/12.2/client64/lib:$LD_LIBRARY_PATH
node example.js
```

This is useful if you will need to upgrade Oracle Instant Client RPMs
to a new major or minor version (for example from 11.2 to 12.1)
without re-installing node-oracledb.

## <a name="instosx"></a> 6. Node-oracledb Installation on macOS with Instant Client

Note: If you use Instant Client 11.2 because you need to connect to
Oracle Database 9.2, refer to
[these older instructions](https://github.com/oracle/node-oracledb/blob/v1.9.3/INSTALL.md#instosx).
Otherwise follow the instructions below for Instant Client 12.1.

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

### 6.1 Install Prerequisites

Install Xcode from the Mac App store.

### 6.2 Install Node.js

Download the [Node.js package](http://nodejs.org) for macOS 64-bit and install it.

### 6.3 Install the free Oracle Instant Client 12.1 'Basic' and 'SDK' ZIPs

Download the free **Basic** and **SDK** 64-bit ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html)
and install them into the same directory, for example:

```
cd /opt/oracle
unzip instantclient-basic-macos.x64-12.1.0.2.0.zip
unzip instantclient-sdk-macos.x64-12.1.0.2.0.zip
mv instantclient_12_1 instantclient
cd instantclient
ln -s libclntsh.dylib.12.1 libclntsh.dylib
```

### 6.4 Install the add-on

Tell the installer where to find Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient
export OCI_INC_DIR=/opt/oracle/instantclient/sdk/include
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

If Instant Client is the default location `/opt/oracle/instantclient`
then these variables are not actually required.

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

If you are installing with `sudo`, you may need to use `sudo -E` to
preserve the environment variable values.

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
[The Easiest Way to Install Oracle Database on Mac OS X](https://blogs.oracle.com/opal/entry/the_easiest_way_to_enable).

## <a name="instwin"></a> 7. Node-oracledb Installation on Windows

Questions and issues can be posted as [GitHub Issues](https://github.com/oracle/node-oracledb/issues).

**Note**: An Oracle Technology Network article
[Installing node-oracledb on Microsoft Windows](https://community.oracle.com/docs/DOC-931127)
has step-by-step Windows installation instructions that you can
alternatively refer to.

### 7.1 Install Prerequisites

Install a C/C++ build environment such as Microsoft Visual
Studio 2013.  To build with Node 6 or later, use VS 2015.  Compilers supported by Oracle libraries are found in
[Oracle documentation](https://docs.oracle.com/en/database/) for each version, for example
[Oracle Database Client Quick Installation Guide 12c Release 1 (12.1) for Microsoft Windows x64 (64-Bit)](https://docs.oracle.com/database/121/NXCQI/toc.htm#NXCQI108).

The `PATH` variable needs to include the appropriate Visual Studio
redistributables for the Oracle client.  This should be part of your VS
install.  Specifically, if you use Oracle client 11.2 then
the [Visual Studio 2005 redistributable](https://www.microsoft.com/en-us/download/details.aspx?id=18471) is required.  The Oracle client 12.1 requires the
[Visual Studio 2010 redistributable](https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads#bookmark-vs2010).

Install the Python 2.7 MSI from
[www.python.org](https://www.python.org/downloads).  Select the
customization option to "Add python.exe to Path".

If you use a 32-bit Node.js, make sure to use a 32-bit Oracle client
during build and run time.  Otherwise use a 64-bit Node.js with a
64-bit Oracle client.  The instructions below use a 64-bit stack.

### 7.2 Install Node.js

Install the 64-bit Node.js  MSI (e.g. node-v6.9.4-x64.msi) from
[nodejs.org](http://nodejs.org/).  Make sure the option to
add the Node and npm directories to the path is selected.

### 7.3 Install the free Oracle Instant Client ZIPs

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

### 7.4 Install the add-on

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
Do *not* add them to `PATH`.

For Instant Client use:

```
set OCI_LIB_DIR=C:\oracle\instantclient\sdk\lib\msvc
set OCI_INC_DIR=C:\oracle\instantclient\sdk\include
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

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
the Visual Studio 2010 redistributable.

You can also find out the version required by locating the library
`OCI.DLL` on the source computer and running:

```
dumpbin /dependents oci.dll
```

The version of `MSVC*.DLL` in the output indicates which
redistributable is required on the destination computer.  For example,
if you see `MSVCR100.dll` then you need the VC++ 10 redistributable.

## <a name="instaix"></a> 9. Node-oracledb Installation on AIX on Power Systems with Instant Client ZIP files

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

For Node.js 0.10 and 0.12, set `LIBPATH` to include `libstdc++.a` and `libgcc_s.a`:

```
export LIBPATH=/opt/freeware/lib64
```

This setting is not required for Node.js 4 or later.

### 9.2 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Download the free **Basic** and **SDK** ZIPs from
[Oracle Technology Network]( http://www.oracle.com/technetwork/topics/aix5lsoft-098883.html)
and
Install them into the /opt/oracle.

```
cd /opt/oracle
unzip instantclient-basic-aix.ppc64-12.1.0.2.0.zip
unzip instantclient-sdk-aix.ppc64-12.1.0.2.0.zip
```

To run applications, you will need to set the link path:

```
export LIBPATH=/opt/oracle/instantclient_12_1:$LIBPATH
```

### 9.3 Install the add-on

Tell the installer where to find Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient_12_1
export OCI_INC_DIR=/opt/oracle/instantclient_12_1/sdk/include
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
```

Note: The version of `make` should be GNU Make 4.1-1 or above.

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

### 10.2 Install the free Oracle Instant Client 'Basic' and 'SDK' ZIPs

Download the free **Basic** and **SDK** ZIPs from
[Oracle Technology Network]( http://www.oracle.com/technetwork/topics/solx8664soft-097204.html )
and install them into `/opt/oracle`.

```
cd /opt/oracle
unzip instantclient-basic-solaris.x64-12.2.0.1.0.zip
unzip instantclient-sdk-solaris.x64-12.2.0.1.0.zip
```

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH_64=/opt/oracle/instantclient_12_2:$LD_LIBRARY_PATH_64
```

### 10.3 Install the add-on

Tell the installer where to find Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient_12_2
export OCI_INC_DIR=/opt/oracle/instantclient_12_2/sdk/include
```

Use absolute paths for the variable values.  These variables are only
needed during installation.

If you are behind a firewall you may need to set your proxy, for
example:

```
export http_proxy=http://my-proxy.example.com:80/
```

Install node-oracledb from the
[NPM registry](https://www.npmjs.com/package/oracledb):

```
npm install oracledb
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
