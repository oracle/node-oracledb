#------------------------------------------------------------------------------
# Copyright (c) 2023, Oracle and/or its affiliates.
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
#------------------------------------------------------------------------------

#------------------------------------------------------------------------------
# oracle_desupported.py
#
# Defines a directive (desupported) which describes when the feature was
# removed. Similar to the deprecated directive.
#------------------------------------------------------------------------------


from docutils import nodes
from docutils.parsers.rst import Directive
from sphinx import addnodes

class DriverDesupported(Directive):
    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = True

    def run(self):
        node = addnodes.versionmodified()
        node.document = self.state.document
        node['type'] = self.name
        node['version'] = self.arguments[0]
        text = 'Desupported in version {}.'.format(self.arguments[0])
        classes = ['versionmodified', 'deprecated']
        para = nodes.paragraph('', '',
                               nodes.inline('', text, classes=classes),
                               translatable=False)
        node.append(para)
        ret: List[Node] = [node]
        return ret

def setup(app):
    app.add_directive("desupported", DriverDesupported, override=True)

    return {
        'version': '0.1',
        'parallel_read_safe': True,
        'parallel_write_safe': True,
    }
