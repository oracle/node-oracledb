# Overview

This directory is used for building the [node-oracledb npm
package](https://www.npmjs.com/package/oracledb).  The scripts can also be used
to create a custom package for hosting on a local server.

Most users do not need to use anything in this directory.

# Maintainers

In a clone or copy of the repository:

- Run `npm run buildbinary`.  This calls `buildbinary.js` to create a
  node-oracledb binary for the current operating system.  Depending how Node.js
  was installed, you may need to run `npm install node-gyp -g` first.

  You can run `npm run buildbinary` on each operating system architecture that
  you want to include in your package.  Copy the node-oracledb binaries and
  related build metadata information files to the `package/Staging` directory on
  one machine.

- Run `npm run buildpackage`.  This calls `buildpackage.js` to make the
  node-oracledb package containing the node-oracledb JavaScript files, the
  available binaries, and a `package.json` that has `install` and `prune` script
  targets.  The package will be created in the top level directory.  It can be
  uploaded to npmjs.com, or to your own local server, and then used as a
  dependency in your projects.

# Package Installation

- As part of an `npm install` that uses the created package, the `package.json`
  install script runs `install.js` to check the availability of a binary module
  for the current Node.js version and operating system architecture.

  If a suitable binary is not available, installation will fail.  Users must
  then compile node-oracledb using source code from GitHub.  Alternatively a
  different version of node-oracledb, Node.js, or different operating system may
  have a suitable pre-built binary available.  See
  https://github.com/oracle/node-oracledb/releases for information about Node.js
  versions and pre-built node-oracledb binaries.

- After install, space conscious users can run `npm run prune` which removes
  pre-built binaries for all other architectures.

The
[`package.json`](https://github.com/oracle/node-oracledb/blob/master/package.json)
in GitHub doesn't have an `install` script target by default.  This means that
node-gyp will be invoked to compile node-oracledb.  This allows installation
from GitHub [source
code](https://oracle.github.io/node-oracledb/INSTALL.html#github) when no
suitable pre-built binary is available.
