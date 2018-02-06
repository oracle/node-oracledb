# Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved.
#
# You may not use the identified files except in compliance with the Apache
# License, Version 2.0 (the "License.")
#
# You may obtain a copy of the License at
# http://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#
# See the License for the specific language governing permissions and
# limitations under the License.

CP=cp
MV=mv
CD=cd
ECHO=echo
DATE=date -u
SED=sed
RMDIR=rm -rf
RMALL=rm -f
GIT=git
NODE=node
NPM=npm

GITSHA=$(shell $(GIT) --git-dir=../.git rev-parse --verify HEAD)
SUBMOD=$(shell $(GIT) --git-dir=../odpi/.git rev-parse --verify HEAD)
NODEVER=$(shell $(NODE) --version)
BUILDDATE=$(shell $(DATE))

# createpackage.js assumes these paths
BINARY_PATH_LOCAL=../build/Release/oracledb.node
LICENSE_PATH_LOCAL=../LICENSE.md

# Find the node-oracledb version number
VER=$(shell $(NODE) getversion.js)

# The staging-oracledb-X.Y.Z.tgz package will try to download binaries from
# https://$NODE_ORACLEDB_PACKAGE_HOSTNAME/$NODE_ORACLEDB_PACKAGE_URL_PATH/vX.Y.Z/
ifndef NODE_ORACLEDB_PACKAGE_HOSTNAME
	NODE_ORACLEDB_PACKAGE_HOSTNAME=your-staging-server.example.com
endif
ifndef NODE_ORACLEDB_PACKAGE_URL_PATH
	NODE_ORACLEDB_PACKAGE_URL_PATH=/your-url-path-to-directory/
endif

# Create the generic 'npm install' package with a package.json that
# invokes oracledbinstall.js at install time
npmpackage:
	$(ECHO) "$(GITSHA) $(BUILDDATE)" > ../lib/rel.txt
	$(NPM) pack .. && $(MV) oracledb-$(VER).tgz oracledb-src-$(VER).tgz
	@$(ECHO) "==> Created generic GitHub source package for node-oracledb $(VER)"

	$(SED) -e "s#'github.com'#'$(NODE_ORACLEDB_PACKAGE_HOSTNAME)'#" oracledbinstall.js > oracledbinstall.js.tmp && $(MV) oracledbinstall.js.tmp oracledbinstall.js
	$(SED) -e "s#'/oracle/node-oracledb/releases/download/'#'$(NODE_ORACLEDB_PACKAGE_URL_PATH)'#" oracledbinstall.js > oracledbinstall.js.tmp && $(MV) oracledbinstall.js.tmp oracledbinstall.js
	$(CP) package.json ../package.json
	$(NPM) pack .. && $(MV) oracledb-$(VER).tgz staging-oracledb-$(VER).tgz
	@$(ECHO) "==> Created generic npm staging package for node-oracledb $(VER)"

	$(GIT) checkout oracledbinstall.js && $(NPM) pack ..
	$(GIT) checkout ../package.json
	@$(RMALL) ../lib/rel.txt
	@$(ECHO) "==> Created generic npm production package for node-oracledb $(VER)"

# Create a package containing (i) the license file and (ii) the
# node-oracledb binary for the current environment
binarypackage: $(BINARY_PATH_LOCAL) $(LICENSE_PATH_LOCAL)
	$(GIT) checkout $(LICENSE_PATH_LOCAL)
	$(CP) $(LICENSE_PATH_LOCAL) $(LICENSE_PATH_LOCAL).bk && $(ECHO) "$(GITSHA) $(SUBMOD) $(NODEVER) $(BUILDDATE)" >> $(LICENSE_PATH_LOCAL)
	$(NODE) createpackage.js
	$(MV) $(LICENSE_PATH_LOCAL).bk $(LICENSE_PATH_LOCAL)
	@$(ECHO) "==> Created binary package for Node.js `$(NODE) --version`"

# Build the node-oracledb binary
$(BINARY_PATH_LOCAL): cleanbinary
	($(CD) .. && $(NPM) install)

clean: cleanbinary
	$(RMALL) ../package-lock.json
	$(RMALL) oracledb-$(VER).tgz staging-oracledb-$(VER).tgz SHASUMS256.txt oracledb-v*-node-*.gz

cleanbinary:
	$(RMALL) $(BINARY_PATH_LOCAL)
