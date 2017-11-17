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

MAJ=$(shell grep '\#define \+NJS_NODE_ORACLEDB_MAJOR' ../src/njsOracle.h | sed -e 's/[^0-9]*//')
MIN=$(shell grep '\#define \+NJS_NODE_ORACLEDB_MINOR' ../src/njsOracle.h | sed -e 's/[^0-9]*//')
PAT=$(shell grep '\#define \+NJS_NODE_ORACLEDB_PATCH' ../src/njsOracle.h | sed -e 's/[^0-9]*//')
VER=$(MAJ).$(MIN).$(PAT)

# The staging-oracledb-X.Y.Z.tgz package will try to download binaries from
# https://$NODE_ORACLEDB_PACKAGE_HOSTNAME/$NODE_ORACLEDB_PACKAGE_URL_PATH/
ifndef NODE_ORACLEDB_PACKAGE_HOSTNAME
	NODE_ORACLEDB_PACKAGE_HOSTNAME='your-staging-server.example.com'
endif

ifndef NODE_ORACLEDB_PACKAGE_URL_PATH
	NODE_ORACLEDB_PACKAGE_URL_PATH='/your-url-path-to-directory/'
endif

# Create a package containing the binary and license files.
binarypackage:
	(cd .. && rm -f package-lock.json && npm install)
	node createpackage.js
	@echo "==> Created package for Node.js `node --version`"

npmpackage: oracledb-$(VER).tgz

# Create the npm package with a package.json that invokes oracledbinstall.js at install time
oracledb-$(VER).tgz:
	rm -rf ./bundle/
	mkdir -m 755 bundle
	cp ./package.json ../index.js ../README.md ../LICENSE.md ../CHANGELOG.md bundle/
	mkdir -m 755 bundle/lib
	cp ../lib/*.js bundle/lib/
	mkdir -m 755 bundle/package
	cp ./oracledbinstall.js ./extractpackage.js ./util.js bundle/package/
	(cd bundle && tar -czvf ../oracledb-$(VER).tgz ./*)
	perl -p -i -e "s#'github.com'#'$(NODE_ORACLEDB_PACKAGE_HOSTNAME)'#" bundle/package/oracledbinstall.js
	perl -p -i -e "s#'/oracle/node-oracledb/releases/download/'#'$(NODE_ORACLEDB_PACKAGE_URL_PATH)'#" bundle/package/oracledbinstall.js
	(cd bundle && tar -czvf ../staging-oracledb-$(VER).tgz ./*)
	rm -rf ./bundle/

clean:
	rm -rf oracledb-$(VER).tgz staging-oracledb-$(VER).tgz SHASUMS256.txt oracledb-v*-node-*.gz ../package-lock.json ./bundle/
