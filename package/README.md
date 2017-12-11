# Overview

This directory contains scripts for building, extracting and
installing binary packages of node-oracledb.  Most users do not need
to use anything in this directory (the exception is when doing a
[manual
install](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#offline)
instead of using `npm`).

The binary install process requires two kinds of package:

- a gzipped tar file like `oracledb-X.Y.Z.tgz` containing JavaScript
  and ancillary files suitable for npm to install.  This is a generic
  file used on all platforms.

- a gzipped package like `oracledb-vZ.Y.Z-node-v57-darwin-x64.gz`
  containing the binary add-on.  The package uses a custom format with
  three components: length bytes (giving the length of the license
  file), the license file, and then the node-oracledb binary.  Each
  Node.js version/architecture needs a unique binary package.

  A custom package format is used due to business and technical requirements:

  - the license text needs to be included with any binary download.

  - Node.js doesn't have a native archive module, and the installer
    should be lightweight and not have 3rd party dependencies.

When `npm install oracledb` is executed, the JavaScript package is
first installed by npm.  An 'install' script in its `package.json`
invokes `oracledbinstall.js`.  This downloads the appropriate
node-oracledb binary package, and then extracts and installs the
binary.

If a suitable binary package is not available, users must compile
source code by installing from GitHub.

Installation is described in [INSTALL](../INSTALL.md).

# Maintainers

- The Makefile is used by node-oracledb maintainers to create the
  packages to be uploaded to
  [GitHub](https://github.com/oracle/node-oracledb) and
  [npm](https://www.npmjs.com/package/oracledb).

    - `make npmpackage` makes the main node-oracledb package
      containing the general node-oracledb JavaScript files and the
      package.json in this directory.  This is the package that an
      `npm install oracledb` will initially install.

    - `make binarypackage` makes a binary package for the current
      Node.js / node-oracledb / platform combination and generates a
      SHA256 for the binary.

- As part of `npm install`, the `package.json` in this directory
  invokes `oracledbinstall.js` that downloads the appropriate binary
  package from GitHub.  This variant of `package.json` is the copy
  bundled for the npm release.

  The parent file `../package.json` doesn't have the install target
  meaning that node-gyp will be invoked to compile node-oracledb.  This
  allows installation from source code (via GitHub) when no suitable
  pre-built binary is available.

- The `make npmpackage` command creates two variants of the JavaScript bundle:

  - `oracledb-X.Y.Z.tgz` which downloads binaries from the
    node-oracledb GitHub release page.

  - `staging-oracledb-X.Y.Z.tgz` which downloads binaries from a
    server of your choice, specified by the environment variables
    `NODE_ORACLEDB_PACKAGE_HOSTNAME` (e.g. "your.example.com") and
    `NODE_ORACLEDB_PACKAGE_URL_PATH` (e.g. "/yourpath/") which must be set
    before running `make`.

- The`staging-oracledb-X.Y.Z.tgz` package can be used to host binaries
  on internal networks.  Copy `staging-oracledb-X.Y.Z.tgz`, the binary
  packages for each desired architectures, and a single SHASUMS256.txt
  file (with one line per available binary package) to an
  HTTPS-enabled web server to the directory that
  https://your.example.com/yourpath/vX.Y.Z/ resolves to.  Note if the
  web server has a self-signed certificate, then you may need to
  bypass some npm checks:

  ```
  export NODE_TLS_REJECT_UNAUTHORIZED=0
  npm config set strict-ssl false

  npm install https://your.example.com/yourpath/vX.Y.Z/staging-oracledb-X.Y.X.tgz
  ```

  Remember to do `npm config delete strict-ssl` and unset the
  environment variable when not testing.

- At install time, setting the environment variable
  `NODE_ORACLEDB_TRACE_INSTALL` to `TRUE` will cause `npm install` to
  display more tracing information.

-  The installer scripts assume GitHub tags have the format "vX.Y.Z".
   Other assumptions about GitHub paths are also made in the scripts.

- TODO

  - oracledbinstall.js should cache SHASUMS256.txt so it doesn't have to be fetched twice.
  - Improve oracledbinstall.js `no_proxy` support for domain names and wildcards.
