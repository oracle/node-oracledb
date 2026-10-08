# -----------------------------------------------------------------------------
# Copyright (c) 2022, 2026, Oracle and/or its affiliates.
#
# This software is dual-licensed to you under the Universal Permissive License
# (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
# 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
# either license.
#
# If you elect to accept the software under the Apache License, Version 2.0,
# the following applies:
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# oracle_version_directives.py
#
# Overrides version change directives so that the rendered text includes the
# node-oracledb name where appropriate.
# -----------------------------------------------------------------------------

from docutils import nodes
from docutils.parsers.rst import Directive
from sphinx import addnodes
from sphinx.domains.changeset import versionlabels, VersionChange


class DriverVersionChange(VersionChange):
    version_label = None

    def run(self):
        versionlabels[self.name] = self.version_label
        return super().run()


class DriverVersionAdded(DriverVersionChange):
    version_label = "Added in node-oracledb version %s"


class DriverVersionChanged(DriverVersionChange):
    version_label = "Changed in node-oracledb version %s"


class DriverDeprecated(Directive):
    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = True

    def run(self):
        version = self.arguments[0]
        node = addnodes.versionmodified()
        node.document = self.state.document
        node["type"] = self.name
        node["version"] = version
        text = f"Deprecated since node-oracledb version {version}."
        classes = ["versionmodified", "deprecated"]
        para = nodes.paragraph(
            "", "", nodes.inline("", text, classes=classes), translatable=False
        )
        node.append(para)
        return [node]


def setup(app):
    app.add_directive("versionadded", DriverVersionAdded, override=True)
    app.add_directive("versionchanged", DriverVersionChanged, override=True)
    app.add_directive("deprecated", DriverDeprecated, override=True)
