# Overview

This directory is used for building the [node-oracledb npm
package](https://www.npmjs.com/package/oracledb).  The scripts can
also be used to create custom packages for hosting on a local server.

Most users do not need to use anything in this directory.

# Maintainers

In a clone or copy of the repository:

- `npm run buildbinary` calls `buildbinary.js` to create a
  node-oracledb binary for the current operating system.

- `npm run buildpackage` calls `buildpackage.js` to make the
  node-oracledb package containing the node-oracledb JavaScript files,
  the available binaries, and a package.json that has an `install`
  script and a `prune` script.  The package will be created in the top
  level directory.

  Before executing `npm run buildpackage`, all node-oracledb binaries
  and related build metadata information files from all operating
  systems should be placed in the `package/Staging` directory.

# Package Installation

- As part of an `npm install` that uses the created package, the
  `package.json` install script runs `install.js` to check a binary
  module for the current Node.js and operating system is available.

  If a suitable binary is not available, installation will fail.
  Users must then compile node-oracledb using source code from GitHub.
  Alternatively a different version of node-oracledb, Node.js, or
  different operating system may have a suitable pre-built binary
  available.

- After install, space conscious users can run `npm run prune` which
  removes pre-built binaries for all other operating systems.

By default the top level `package.json` doesn't have an `install`
script target.  This means that node-gyp will be invoked to compile
node-oracledb.  This allows installation from [source
code](https://oracle.github.io/node-oracledb/INSTALL.html#github) (via
GitHub) when no suitable pre-built binary is available.
