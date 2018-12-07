# Overview

This directory is used for building the node-oracledb npm package.
Most users do not need to use anything in this directory.

# Maintainers

- The file `build.js` is used by node-oracledb maintainers to create
  node-oracledb binaries and the package to be uploaded to
  [npm](https://www.npmjs.com/package/oracledb).

- `node build.js binary` creates a binary for the current Node.js /
  node-oracledb / platform combination.  The command `node
  buildv6binary.js` can be used with Node 6.

- `node build.js package` makes the node-oracledb package containing
  the node-oracledb JavaScript files, the binaries, and a package.json
  that has an "install" script.

  Before running this, all binaries and related build metadata
  information files from all Node.js / node-oracledb / platform
  combinations should be placed in the `package/Staging` directory.

- As part of `npm install oracledb`, the `package.json` install script
  invokes `package/install.js` to move the appropriate binary module
  to the correct directory.

  If a suitable binary is not available, installation will fail.
  Users must then compile node-oracledb using source code from GitHub.

- By default `../package.json` doesn't have an install script target.
  This means that node-gyp will be invoked to compile node-oracledb.
  This allows installation from source code (via GitHub) when no
  suitable pre-built binary is available.
