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
2. [Installation with Instant Client RPMs](#instrpm)
3. [Installation with Instant Client ZIP files](#instzip)
4. [Installation with a local database](#instoh)

## <a name="overview"></a> 1. Overview

The steps below create a standalone Node.js installation for testing.
Adjust the steps for your environment.

The node-oracledb 0.2 release has been tested with Node.js 0.10.35 on
64-bit Oracle Linux.  The driver can also build in some 32-bit Linux,
Solaris and Mac OS X environments, but these architectures have not
been fully tested.  Installation on those platforms is similar to the
steps described in this document.

Node-oracledb is currently only available on GitHub.

### Prerequisites

This installation requires Oracle 11.2 or 12.1 client libraries.
These are included in Oracle Instant Client RPMs or ZIPs, a full
Oracle Client, or a database on the same machine.  Oracle's standard
client-server network compatibility applies, which enables connection
to databases with different versions.

Python 2.7 is needed for node-gyp.  Gcc is needed on Linux.  On OS X,
install Xcode.

### Which Instructions to Follow

Instructions may need to be adjusted for your platform and environment.


I have ... | Follow this ...
----------|-----------------
Linux.  My database is on another machine.  | [Installation with Instant Client RPMs](#instrpm)
Solaris.  My database is on another machine. | [Installation with Instant Client ZIP files](#instzip)
Linux or Solaris, with a database on the same machine. |  [Installation with a local database](#instoh)
Linux or Solaris, with the full Oracle client (installed via runInstaller) on the same machine. |  [Installation with a local database](#instoh)
Mac OS X. | [Installation with Instant Client ZIP files](#instzip)
Another OS with Oracle 11.2 or 12.1 libraries available | Update binding.gyp and make any code changes required, sign the [OCA](https://www.oracle.com/technetwork/community/oca-486395.html), and submit a pull request with your patch (Windows support is already being worked on).  

### Other Resources Useful for node-oracledb

Node-oracledb can be installed on the pre-built
[*Database App Development VM*](http://www.oracle.com/technetwork/community/developer-vm/index.html#dbapp) for [VirtualBox](https://www.virtualbox.org),
which has Oracle Database 12c pre-installed on Oracle Linux.   If you want to install your
own database, installing the free
[Oracle Database 11.2 'XE' Express Edition](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
is quick and easy.  Other database editions may be downloaded
[here](http://www.oracle.com/technetwork/database/enterprise-edition/downloads/index-092322.html).  If you want to
install Oracle Linux yourself, it is free from
[here](http://public-yum.oracle.com/). 

### <a name="linuxinstsearchpath"></a> Oracle Client Location Heuristic on Linux

On Linux, the node-oracledb installer looks for Oracle client libraries and headers in the following search order:

1. Using install-time environment variables `$OCI_LIB_DIR` and `$OCI_INC_DIR`
2. In the highest version Instant Client RPMs installed
3. In `$ORACLE_HOME`
4. In `/opt/oracle/instantclient`

## <a name="instrpm"></a> 2. Installation with Instant Client RPMs

### 2.1 Clone [this repository](https://github.com/oracle/node-oracledb)

```
git clone https://github.com/oracle/node-oracledb.git
```

### 2.2 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org/download/) and
extract the file, for example into `$HOME/Desktop`:

```
cd $HOME/Desktop
tar -zxf node-v0.10.35-linux-x64.tar.gz
```

Set the PATH variable to include Node.js:

```
export PATH=$HOME/Desktop/node-v0.10.35-linux-x64/bin:$PATH
```

### 2.3 Install the free Oracle Instant Client RPMs

Download the free 'Basic' and 'SDK' RPMs from [Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html) and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst) as the root user:

```
rpm -ivh oracle-instantclient12.1-basic-12.1.0.2.0-1.x86_64.rpm
rpm -ivh oracle-instantclient12.1-devel-12.1.0.2.0-1.x86_64.rpm
```

If you have a [ULN](https://linux.oracle.com) subscription, you can
alternatively use `yum` to install these packages from the appropriate
*Oracle Software for Oracle Linux* channel.

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH=/usr/lib/oracle/12.1/client64/lib
```

Alternatively, if there is no other Oracle software on the machine
that will be impacted, permanently add Instant Client to the run-time
link path.  Do this by creating a file
`/etc/ld.so.conf.d/oracle-instantclient.conf` that contains the library
location `/usr/lib/oracle/12.1/client64/lib`, and then run `ldconfig`
as the root user.

### 2.4 Install the driver

The installer uses the highest version Instant Client RPMs installed.
To use a different version, for example version 11.2, execute `export
OCI_LIB_DIR=/usr/lib/oracle/11.2/client64/lib` and `export
OCI_INC_DIR=/usr/include/oracle/11.2/client64/`.

Run the installer:

```
cd node-oracledb
npm install -g
```

### 2.5 Run an example program

Set `NODE_PATH` to include the newly installed node-oracledb driver:

```
export NODE_PATH=$HOME/Desktop/node-v0.10.35-linux-x64/lib/node_modules
```

Edit `dbconfig.js` in the `examples` directory and set the database
credentials to your environment.

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node examples/select1.js
```

Remember to set `LD_LIBRARY_PATH` or equivalent first.

## <a name="instzip"></a> 3. Installation with Instant Client ZIP files

### 3.1 Clone [this repository](https://github.com/oracle/node-oracledb)

```
git clone https://github.com/oracle/node-oracledb.git
```

### 3.2 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org/download/) and
extract the file, for example into `$HOME/Desktop`:

```
cd $HOME/Desktop
tar -zxf node-v0.10.35-linux-x64.tar.gz
```

Set your PATH to include Node.js:

```
export PATH=$HOME/Desktop/node-v0.10.35-linux-x64/bin:$PATH
```

### 3.3 Install the free Oracle Instant Client ZIPs

Download the free 'Basic' and 'SDK' ZIPs from
[Oracle Technology Network](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html)
and
[install them](http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html#ic_x64_inst):

```
cd /opt/oracle
unzip instantclient-basic-linux.x64-12.1.0.2.0.zip
unzip instantclient-sdk-linux.x64-12.1.0.2.0.zip
cd instantclient_12_1
ln -s libclntsh.so.12.1 libclntsh.so
ln -s libocci.so.12.1 libocci.so
```

Make sure that `libaio` is installed.

To run applications, you will need to set the link path:

```
export LD_LIBRARY_PATH=/opt/oracle/instantclient_12_1
```

Alternatively, if there is no other Oracle software on the machine
that will be impacted, permanently add Instant Client to the run-time
link path.  Do this on Linux by creating a file
`/etc/ld.so.conf.d/oracle-instantclient.conf` that contains the library
location `/opt/oracle/instantclient_12_1`, and then run `ldconfig` as
the root user.

### 3.4 Install the driver

Tell the installer where you installed Instant Client:

```
export OCI_LIB_DIR=/opt/oracle/instantclient_12_1
export OCI_INC_DIR=/opt/oracle/instantclient_12_1/sdk/include
```

Run the installer:

```
cd node-oracledb
npm install -g
```

### 3.5 Run an example program

Set `NODE_PATH` to include the newly installed node-oracledb driver:

```
export NODE_PATH=$HOME/Desktop/node-v0.10.35-linux-x64/lib/node_modules
```

Edit `dbconfig.js` in the `examples` directory and set the database
credentials to your environment.

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node examples/select1.js
```

*Note:* Remember to set `LD_LIBRARY_PATH` or equivalent first.

## <a name="instoh"></a> 4. Installation with a local database

The ORACLE_HOME can be either a database home or a full Oracle client installation.

For easy development, the free
[Oracle XE](http://www.oracle.com/technetwork/database/database-technologies/express-edition/overview/index.html)
version of the database is available on Linux.  Node.js applications
developed with XE may be immediately used with other editions of the
Oracle Database.

### 4.1 Clone [this repository](https://github.com/oracle/node-oracledb)

```
git clone https://github.com/oracle/node-oracledb.git
```

### 4.2 Install Node.js

Download the
[Node.js Linux 64-bit binaries](http://nodejs.org/download/) and
extract the file, for example into `$HOME/Desktop`:

```
cd $HOME/Desktop
tar -zxf node-v0.10.35-linux-x64.tar.gz
```

Set your PATH variable to include Node.js:

```
export PATH=$HOME/Desktop/node-v0.10.35-linux-x64/bin:$PATH
```

### 4.3 Install the driver

Tell the installer where to find the Oracle client:

```
export ORACLE_HOME=/wherever/it/is/see/etc/oratab
```

*Warning*: By default, the installer will look first for Oracle
libraries in the highest version Instant Client RPMs installed.  If
you have Instant Client, override it by setting `export
OCI_LIB_DIR=$ORACLE_HOME/lib` and `export
OCI_INC_DIR=$ORACLE_HOME/rdbms/public`.

Run the installer:

```
cd node-oracledb
npm install -g
```

### 4.4 Run an example program

Set `NODE_PATH` to include the newly installed node-oracledb driver:

```
export NODE_PATH=$HOME/Desktop/node-v0.10.35-linux-x64/lib/node_modules
```

Set `LD_LIBRARY_PATH` to the Oracle library directory.  This variable,
and other variables used by Oracle clients, are typically set in a
shell by executing:
```
source /usr/local/bin/oraenv
```

If you are using Oracle XE, execute `source
/u01/app/oracle/product/11.2.0/xe/bin/oracle_env.sh`.

Ensure the Node.js process can access the Oracle libraries and
other files.

Edit `dbconfig.js` in the `examples` directory and set the database
credentials to your environment.

```
module.exports = {
  user          : "hr",
  password      : "welcome",
  connectString : "localhost/XE"
};
```

Run one of the examples:

```
node examples/select1.js
```

